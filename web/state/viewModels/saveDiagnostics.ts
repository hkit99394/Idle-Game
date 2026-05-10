import { getStageById } from "../../../core";
import type { PlayerProgress, StaticGameData } from "../../../core";
import {
  getBrowserSaveStorage,
  loadSaveDataFromStorage,
  WEB_SAVE_AUTOSAVE_INTERVAL_MS,
  WEB_SAVE_STORAGE_KEY
} from "../saveStorage";
import type { SaveDiagnosticsView, WebGameState } from "../types";
import type { LoadSaveDataFromStorageResult } from "../saveStorage";

export function getSaveToolErrorMessage(reason: string): string {
  switch (reason) {
    case "empty_import":
      return "Import text is empty";
    case "invalid_json":
      return "Save JSON is invalid";
    case "invalid_save":
      return "Save data is invalid";
    case "invalid_duration":
      return "Offline time travel duration is invalid";
    case "missing_save":
      return "No save found";
    case "storage_error":
      return "Save storage failed";
    default:
      return "Save tool failed";
  }
}

function getCurrentRegionHighestClearedStageIndex(
  data: StaticGameData,
  progress: PlayerProgress
): number {
  const currentStage = getStageById(data, progress.currentStageId);

  return currentStage
    ? progress.maps[currentStage.regionId]?.highestClearedStageIndex ?? 0
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
      status: "storage_unavailable",
      saveVersion: null,
      saveSizeCharacters: 0,
      createdAtMs: null,
      updatedAtMs: null,
      lastOfflineRewardAtMs: null,
      currentStageId: state.progress.currentStageId,
      selectedOfflineFarmStageId: state.selectedOfflineFarmStageId,
      offlineFarmPreset: state.offlineFarmPreset,
      highestClearedStageIndex: getCurrentRegionHighestClearedStageIndex(
        data,
        state.progress
      ),
      autosaveIntervalMs: WEB_SAVE_AUTOSAVE_INTERVAL_MS,
      errors: ["Browser save storage is unavailable"]
    };
  }

  let rawSave: string | null = null;

  try {
    rawSave = storage.getItem(WEB_SAVE_STORAGE_KEY);
  } catch (error) {
    return {
      storageAvailable: true,
      storageKey: WEB_SAVE_STORAGE_KEY,
      status: "storage_error",
      saveVersion: null,
      saveSizeCharacters: 0,
      createdAtMs: null,
      updatedAtMs: null,
      lastOfflineRewardAtMs: null,
      currentStageId: state.progress.currentStageId,
      selectedOfflineFarmStageId: state.selectedOfflineFarmStageId,
      offlineFarmPreset: state.offlineFarmPreset,
      highestClearedStageIndex: getCurrentRegionHighestClearedStageIndex(
        data,
        state.progress
      ),
      autosaveIntervalMs: WEB_SAVE_AUTOSAVE_INTERVAL_MS,
      errors: [error instanceof Error ? error.message : "Unable to read save"]
    };
  }

  const loadResult = loadSaveDataFromStorage(data, storage);

  if (!loadResult.ok) {
    return {
      storageAvailable: true,
      storageKey: WEB_SAVE_STORAGE_KEY,
      status: loadResult.reason,
      saveVersion: null,
      saveSizeCharacters: rawSave?.length ?? 0,
      createdAtMs: null,
      updatedAtMs: null,
      lastOfflineRewardAtMs: null,
      currentStageId: state.progress.currentStageId,
      selectedOfflineFarmStageId: state.selectedOfflineFarmStageId,
      offlineFarmPreset: state.offlineFarmPreset,
      highestClearedStageIndex: getCurrentRegionHighestClearedStageIndex(
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
    status: errors.length > 0 ? "storage_error" : "ready",
    saveVersion: save.version,
    saveSizeCharacters: rawSave?.length ?? 0,
    createdAtMs: save.createdAtMs,
    updatedAtMs: save.updatedAtMs,
    lastOfflineRewardAtMs: save.lastOfflineRewardAtMs,
    currentStageId: save.progress.currentStageId,
    selectedOfflineFarmStageId: save.selectedOfflineFarmStageId,
    offlineFarmPreset: save.offlineFarmPreset,
    highestClearedStageIndex: getCurrentRegionHighestClearedStageIndex(
      data,
      save.progress
    ),
    autosaveIntervalMs: WEB_SAVE_AUTOSAVE_INTERVAL_MS,
    errors
  };
}
