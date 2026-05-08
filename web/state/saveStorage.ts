import {
  applyOfflineAssignmentRewards,
  applyOfflineRewards,
  createInitialPlayerProgress,
  createSaveData,
  parseSaveData,
  normalizeOfflineFarmPreset,
  setOfflineFarmStageTarget
} from "../../core";
import type {
  ApplyOfflineAssignmentRewardsResult,
  ApplyOfflineRewardsResult,
  SaveData,
  StaticGameData
} from "../../core";
import type { WebGameState } from "./gameState";

export const WEB_SAVE_STORAGE_KEY = "path-of-jianghu.save.v1";
export const WEB_SAVE_AUTOSAVE_INTERVAL_MS = 15_000;

export type WebSaveStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

type SaveSchemaData = Pick<
  StaticGameData,
  | "heroes"
  | "regions"
  | "stages"
  | "styles"
  | "skillUpgrades"
  | "equipment"
  | "assignments"
  | "medicines"
>;

type OfflineSaveData = SaveSchemaData & Pick<StaticGameData, "mastery">;

export type LoadSaveDataFromStorageResult =
  | {
      ok: true;
      save: SaveData;
    }
  | {
      ok: false;
      reason: "missing_save" | "invalid_json" | "invalid_save" | "storage_error";
      errors: string[];
    };

export type LoadSaveDataWithOfflineRewardsResult =
  | {
      ok: true;
      save: SaveData;
      offlineRewards: ApplyOfflineRewardsResult | null;
      offlineAssignmentRewards: ApplyOfflineAssignmentRewardsResult | null;
    }
  | Extract<LoadSaveDataFromStorageResult, { ok: false }>;

export type SaveStateToStorageResult =
  | {
      ok: true;
      save: SaveData;
    }
  | {
      ok: false;
      reason: "storage_error";
      errors: string[];
    };

export type ExportSaveDataFromStorageResult =
  | {
      ok: true;
      save: SaveData;
      json: string;
    }
  | Extract<LoadSaveDataFromStorageResult, { ok: false }>;

export type ImportSaveDataToStorageResult =
  | {
      ok: true;
      save: SaveData;
    }
  | {
      ok: false;
      reason: "empty_import" | "invalid_json" | "invalid_save" | "storage_error";
      errors: string[];
    };

export type ResetSaveDataInStorageResult = SaveStateToStorageResult;

export type TimeTravelOfflineSaveInStorageResult =
  | {
      ok: true;
      save: SaveData;
      traveledSeconds: number;
    }
  | {
      ok: false;
      reason:
        | "invalid_duration"
        | "missing_save"
        | "invalid_json"
        | "invalid_save"
        | "storage_error";
      errors: string[];
    };

export function getBrowserSaveStorage(): WebSaveStorage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function loadSaveDataFromStorage(
  data: SaveSchemaData,
  storage: WebSaveStorage,
  key = WEB_SAVE_STORAGE_KEY
): LoadSaveDataFromStorageResult {
  let rawSave: string | null;

  try {
    rawSave = storage.getItem(key);
  } catch (error) {
    return {
      ok: false,
      reason: "storage_error",
      errors: [error instanceof Error ? error.message : "Unable to read save"]
    };
  }

  if (!rawSave) {
    return {
      ok: false,
      reason: "missing_save",
      errors: []
    };
  }

  let parsedSave: unknown;

  try {
    parsedSave = JSON.parse(rawSave);
  } catch {
    return {
      ok: false,
      reason: "invalid_json",
      errors: ["Stored save is not valid JSON"]
    };
  }

  const parseResult = parseSaveData(data, parsedSave);

  if (!parseResult.ok) {
    return {
      ok: false,
      reason: "invalid_save",
      errors: parseResult.errors
    };
  }

  return {
    ok: true,
    save: parseResult.save
  };
}

export function loadSaveDataWithOfflineRewardsFromStorage(
  data: OfflineSaveData,
  storage: WebSaveStorage,
  nowMs = Date.now(),
  key = WEB_SAVE_STORAGE_KEY
): LoadSaveDataWithOfflineRewardsResult {
  const loadResult = loadSaveDataFromStorage(data, storage, key);

  if (!loadResult.ok) {
    return loadResult;
  }

  const rewardTimeMs = Math.max(nowMs, loadResult.save.updatedAtMs);
  const offlineFarmPreset = normalizeOfflineFarmPreset(
    loadResult.save.offlineFarmPreset
  );
  const selectedOfflineFarmStageId = setOfflineFarmStageTarget(
    data,
    loadResult.save.progress,
    loadResult.save.selectedOfflineFarmStageId,
    offlineFarmPreset
  );
  const farmTargetChanged =
    selectedOfflineFarmStageId !== loadResult.save.selectedOfflineFarmStageId;
  const offlineRewards = applyOfflineRewards({
    data,
    progress: loadResult.save.progress,
    selectedOfflineFarmStageId,
    lastSavedAtMs: loadResult.save.updatedAtMs,
    currentTimeMs: rewardTimeMs
  });
  const hasFarmRewards = offlineRewards.ok && offlineRewards.rewards.clears > 0;
  const farmProgress = hasFarmRewards
    ? offlineRewards.progress
    : loadResult.save.progress;
  const offlineAssignmentRewards = applyOfflineAssignmentRewards({
    data,
    progress: farmProgress,
    lastSavedAtMs: loadResult.save.updatedAtMs,
    currentTimeMs: rewardTimeMs
  });
  const hasAssignmentRewards =
    offlineAssignmentRewards.rewards.assignments.length > 0;
  const hasRewards = hasFarmRewards || hasAssignmentRewards;

  if (!hasRewards && !farmTargetChanged) {
    return {
      ok: true,
      save: loadResult.save,
      offlineRewards,
      offlineAssignmentRewards
    };
  }

  const save = createSaveData({
    progress: hasAssignmentRewards
      ? offlineAssignmentRewards.progress
      : farmProgress,
    selectedOfflineFarmStageId,
    offlineFarmPreset,
    nowMs: hasRewards ? rewardTimeMs : loadResult.save.updatedAtMs,
    lastOfflineRewardAtMs: hasRewards
      ? rewardTimeMs
      : loadResult.save.lastOfflineRewardAtMs,
    previousSave: loadResult.save
  });

  try {
    storage.setItem(key, JSON.stringify(save));
  } catch {
    return {
      ok: true,
      save: loadResult.save,
      offlineRewards: null,
      offlineAssignmentRewards: null
    };
  }

  return {
    ok: true,
    save,
    offlineRewards,
    offlineAssignmentRewards
  };
}

export function saveWebGameStateToStorage(
  data: SaveSchemaData,
  state: Pick<
    WebGameState,
    | "progress"
    | "autoMedicinePreferences"
    | "selectedOfflineFarmStageId"
    | "offlineFarmPreset"
  >,
  storage: WebSaveStorage,
  nowMs = Date.now(),
  key = WEB_SAVE_STORAGE_KEY
): SaveStateToStorageResult {
  const previousSaveResult = loadSaveDataFromStorage(data, storage, key);
  const save = createSaveData({
    progress: state.progress,
    autoMedicinePreferences: state.autoMedicinePreferences,
    selectedOfflineFarmStageId: state.selectedOfflineFarmStageId,
    offlineFarmPreset: state.offlineFarmPreset,
    nowMs,
    previousSave: previousSaveResult.ok ? previousSaveResult.save : null
  });

  try {
    storage.setItem(key, JSON.stringify(save));
  } catch (error) {
    return {
      ok: false,
      reason: "storage_error",
      errors: [error instanceof Error ? error.message : "Unable to write save"]
    };
  }

  return {
    ok: true,
    save
  };
}

export function exportSaveDataFromStorage(
  data: SaveSchemaData,
  storage: WebSaveStorage,
  key = WEB_SAVE_STORAGE_KEY
): ExportSaveDataFromStorageResult {
  const loadResult = loadSaveDataFromStorage(data, storage, key);

  if (!loadResult.ok) {
    return loadResult;
  }

  return {
    ok: true,
    save: loadResult.save,
    json: JSON.stringify(loadResult.save, null, 2)
  };
}

export function importSaveDataToStorage(
  data: SaveSchemaData,
  storage: WebSaveStorage,
  rawSaveText: string,
  key = WEB_SAVE_STORAGE_KEY
): ImportSaveDataToStorageResult {
  const trimmedSaveText = rawSaveText.trim();

  if (!trimmedSaveText) {
    return {
      ok: false,
      reason: "empty_import",
      errors: ["Import text is empty"]
    };
  }

  let parsedSave: unknown;

  try {
    parsedSave = JSON.parse(trimmedSaveText);
  } catch {
    return {
      ok: false,
      reason: "invalid_json",
      errors: ["Imported save is not valid JSON"]
    };
  }

  const parseResult = parseSaveData(data, parsedSave);

  if (!parseResult.ok) {
    return {
      ok: false,
      reason: "invalid_save",
      errors: parseResult.errors
    };
  }

  const save: SaveData = {
    ...parseResult.save,
    selectedOfflineFarmStageId: setOfflineFarmStageTarget(
      data,
      parseResult.save.progress,
      parseResult.save.selectedOfflineFarmStageId,
      parseResult.save.offlineFarmPreset
    ),
    offlineFarmPreset: normalizeOfflineFarmPreset(parseResult.save.offlineFarmPreset)
  };

  try {
    storage.setItem(key, JSON.stringify(save));
  } catch (error) {
    return {
      ok: false,
      reason: "storage_error",
      errors: [error instanceof Error ? error.message : "Unable to import save"]
    };
  }

  return {
    ok: true,
    save
  };
}

export function resetSaveDataInStorage(
  data: SaveSchemaData,
  storage: WebSaveStorage,
  nowMs = Date.now(),
  key = WEB_SAVE_STORAGE_KEY
): ResetSaveDataInStorageResult {
  const progress = createInitialPlayerProgress(data);
  const save = createSaveData({
    progress,
    selectedOfflineFarmStageId: setOfflineFarmStageTarget(data, progress, null),
    nowMs
  });

  try {
    storage.setItem(key, JSON.stringify(save));
  } catch (error) {
    return {
      ok: false,
      reason: "storage_error",
      errors: [error instanceof Error ? error.message : "Unable to reset save"]
    };
  }

  return {
    ok: true,
    save
  };
}

export function timeTravelOfflineSaveInStorage(
  data: SaveSchemaData,
  storage: WebSaveStorage,
  offlineSeconds: number,
  nowMs = Date.now(),
  key = WEB_SAVE_STORAGE_KEY
): TimeTravelOfflineSaveInStorageResult {
  const traveledSeconds = Math.floor(offlineSeconds);

  if (!Number.isFinite(offlineSeconds) || traveledSeconds <= 0) {
    return {
      ok: false,
      reason: "invalid_duration",
      errors: ["Offline time travel duration must be greater than zero"]
    };
  }

  const loadResult = loadSaveDataFromStorage(data, storage, key);

  if (!loadResult.ok) {
    return loadResult;
  }

  const traveledMs = traveledSeconds * 1000;
  const simulatedUpdatedAtMs = Math.max(0, nowMs - traveledMs);
  const save: SaveData = {
    ...loadResult.save,
    createdAtMs: Math.min(loadResult.save.createdAtMs, simulatedUpdatedAtMs),
    updatedAtMs: simulatedUpdatedAtMs,
    lastOfflineRewardAtMs: Math.min(
      loadResult.save.lastOfflineRewardAtMs,
      simulatedUpdatedAtMs
    )
  };

  try {
    storage.setItem(key, JSON.stringify(save));
  } catch (error) {
    return {
      ok: false,
      reason: "storage_error",
      errors: [
        error instanceof Error
          ? error.message
          : "Unable to time travel offline save"
      ]
    };
  }

  return {
    ok: true,
    save,
    traveledSeconds
  };
}
