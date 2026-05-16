import { getRegionMapProgress, getStageById } from "../../../core";
import type { PlayerProgress, StaticGameData } from "../../../core";
import {
  getBrowserSaveStorage,
  loadSaveDataFromStorage,
  LEGACY_WEB_SAVE_STORAGE_KEY,
  WEB_SAVE_AUTOSAVE_INTERVAL_MS,
  WEB_SAVE_STORAGE_KEY
} from "../saveStorage";
import type { WebGameState } from "../types";
import type { SaveDiagnosticsView } from "./saveDiagnosticsTypes";
import type { LoadSaveDataFromStorageResult } from "../saveStorage";
import type { SaveMigrationMetadata } from "../../../core";

function getEmptyMigrationDiagnostics(): Pick<
  SaveDiagnosticsView,
  | "migrationFromVersion"
  | "migrationToVersion"
  | "migrationMigrated"
  | "migrationNormalized"
  | "normalizations"
> {
  return {
    migrationFromVersion: null,
    migrationToVersion: null,
    migrationMigrated: false,
    migrationNormalized: false,
    normalizations: []
  };
}

function getMigrationDiagnostics(
  migration: SaveMigrationMetadata
): Pick<
  SaveDiagnosticsView,
  | "migrationFromVersion"
  | "migrationToVersion"
  | "migrationMigrated"
  | "migrationNormalized"
  | "normalizations"
> {
  return {
    migrationFromVersion: migration.fromVersion,
    migrationToVersion: migration.toVersion,
    migrationMigrated: migration.migrated,
    migrationNormalized: migration.normalized,
    normalizations: migration.normalizations
  };
}

function getStartupPersistenceDiagnostics(
  state: WebGameState
): Pick<SaveDiagnosticsView, "startupCommitStatus" | "startupWriteReasons"> {
  return {
    startupCommitStatus: state.startupSavePersistence?.commitStatus ?? null,
    startupWriteReasons:
      state.startupSavePersistence?.attemptedWriteReasons ?? []
  };
}

function getCurrentRegionHighestClearedRouteIndex(
  data: StaticGameData,
  progress: PlayerProgress
): number {
  const currentStage = getStageById(data, progress.currentRouteId);

  return currentStage
    ? getRegionMapProgress(progress.districts, currentStage.regionId)
        ?.highestClearedRouteIndex ?? 0
    : 0;
}

function getStartupSaveDiagnosticErrors(
  state: WebGameState,
  loadResult: Extract<LoadSaveDataFromStorageResult, { ok: true }>
): string[] {
  if (
    state.startupSaveDiagnostics.length === 0 ||
    state.startupSavePersistence?.commitStatus !== "failed"
  ) {
    return [];
  }

  const attemptedReasons = state.startupSavePersistence.attemptedWriteReasons;
  const persistedSave = state.startupSavePersistence.persistedSave;
  const offlineRewardBaselineSave =
    state.startupSavePersistence.offlineRewardBaselineSave ??
    persistedSave ??
    null;
  const failedOfflineRewardWrite = attemptedReasons.some(
    (reason) =>
      reason === "offlineRewardsApplied" ||
      reason === "offlineAssignmentsApplied"
  );
  const failedOfflineRewardWritePending =
    offlineRewardBaselineSave !== null &&
    failedOfflineRewardWrite &&
    loadResult.save.lastOfflineRewardAtMs <=
      offlineRewardBaselineSave.lastOfflineRewardAtMs;
  const startupRewriteStillPending =
    (attemptedReasons.includes("migrated") &&
      loadResult.migration.migrated) ||
    (attemptedReasons.includes("normalizedSave") &&
      !loadResult.migration.migrated &&
      loadResult.migration.normalized) ||
    (persistedSave !== null &&
      !failedOfflineRewardWrite &&
      loadResult.save.updatedAtMs <= persistedSave.updatedAtMs) ||
    failedOfflineRewardWritePending;

  return startupRewriteStillPending ? state.startupSaveDiagnostics : [];
}

export function buildSaveDiagnostics(
  data: StaticGameData,
  state: WebGameState
): SaveDiagnosticsView {
  const storage = getBrowserSaveStorage();

  if (!storage) {
    return {
      storageAvailable: false,
      storageKey: WEB_SAVE_STORAGE_KEY,
      activeStorageKey: null,
      legacyStorageKey: LEGACY_WEB_SAVE_STORAGE_KEY,
      legacySavePresent: false,
      status: "storage_unavailable",
      saveVersion: null,
      ...getEmptyMigrationDiagnostics(),
      ...getStartupPersistenceDiagnostics(state),
      saveSizeCharacters: 0,
      createdAtMs: null,
      updatedAtMs: null,
      lastOfflineRewardAtMs: null,
      currentRouteId: state.progress.currentRouteId,
      selectedOfflineFarmRouteId: state.selectedOfflineFarmRouteId,
      offlineFarmPreset: state.offlineFarmPreset,
      highestClearedRouteIndex: getCurrentRegionHighestClearedRouteIndex(
        data,
        state.progress
      ),
      autosaveIntervalMs: WEB_SAVE_AUTOSAVE_INTERVAL_MS,
      errors: ["Browser save storage is unavailable"]
    };
  }

  const legacySavePresent = hasStoredSave(storage, LEGACY_WEB_SAVE_STORAGE_KEY);
  const loadResult = loadSaveDataFromStorage(data, storage);
  const activeStorageKey = loadResult.storageKey;
  let rawSave: string | null = null;

  try {
    rawSave = storage.getItem(activeStorageKey);
  } catch (error) {
    return {
      storageAvailable: true,
      storageKey: WEB_SAVE_STORAGE_KEY,
      activeStorageKey,
      legacyStorageKey: LEGACY_WEB_SAVE_STORAGE_KEY,
      legacySavePresent,
      status: "storage_error",
      saveVersion: null,
      ...getEmptyMigrationDiagnostics(),
      ...getStartupPersistenceDiagnostics(state),
      saveSizeCharacters: 0,
      createdAtMs: null,
      updatedAtMs: null,
      lastOfflineRewardAtMs: null,
      currentRouteId: state.progress.currentRouteId,
      selectedOfflineFarmRouteId: state.selectedOfflineFarmRouteId,
      offlineFarmPreset: state.offlineFarmPreset,
      highestClearedRouteIndex: getCurrentRegionHighestClearedRouteIndex(
        data,
        state.progress
      ),
      autosaveIntervalMs: WEB_SAVE_AUTOSAVE_INTERVAL_MS,
      errors: [error instanceof Error ? error.message : "Unable to read save"]
    };
  }

  if (!loadResult.ok) {
    return {
      storageAvailable: true,
      storageKey: WEB_SAVE_STORAGE_KEY,
      activeStorageKey,
      legacyStorageKey: LEGACY_WEB_SAVE_STORAGE_KEY,
      legacySavePresent,
      status: loadResult.reason,
      saveVersion: null,
      ...getEmptyMigrationDiagnostics(),
      ...getStartupPersistenceDiagnostics(state),
      saveSizeCharacters: rawSave?.length ?? 0,
      createdAtMs: null,
      updatedAtMs: null,
      lastOfflineRewardAtMs: null,
      currentRouteId: state.progress.currentRouteId,
      selectedOfflineFarmRouteId: state.selectedOfflineFarmRouteId,
      offlineFarmPreset: state.offlineFarmPreset,
      highestClearedRouteIndex: getCurrentRegionHighestClearedRouteIndex(
        data,
        state.progress
      ),
      autosaveIntervalMs: WEB_SAVE_AUTOSAVE_INTERVAL_MS,
      errors: loadResult.errors
    };
  }

  const save = loadResult.save;
  const errors = getStartupSaveDiagnosticErrors(state, loadResult);

  return {
    storageAvailable: true,
    storageKey: WEB_SAVE_STORAGE_KEY,
    activeStorageKey: loadResult.storageKey,
    legacyStorageKey: LEGACY_WEB_SAVE_STORAGE_KEY,
    legacySavePresent,
    status: errors.length > 0 ? "storage_error" : "ready",
    saveVersion: save.version,
    ...getMigrationDiagnostics(loadResult.migration),
    ...getStartupPersistenceDiagnostics(state),
    saveSizeCharacters: rawSave?.length ?? 0,
    createdAtMs: save.createdAtMs,
    updatedAtMs: save.updatedAtMs,
    lastOfflineRewardAtMs: save.lastOfflineRewardAtMs,
    currentRouteId: save.progress.currentRouteId,
    selectedOfflineFarmRouteId: save.selectedOfflineFarmRouteId,
    offlineFarmPreset: save.offlineFarmPreset,
    highestClearedRouteIndex: getCurrentRegionHighestClearedRouteIndex(
      data,
      save.progress
    ),
    autosaveIntervalMs: WEB_SAVE_AUTOSAVE_INTERVAL_MS,
    errors
  };
}

function hasStoredSave(storage: Pick<Storage, "getItem">, key: string): boolean {
  try {
    return storage.getItem(key) !== null;
  } catch {
    return false;
  }
}
