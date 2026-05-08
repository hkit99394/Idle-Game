import {
  createInitialPlayerProgress,
  createSaveData,
  applySaveLoadTransaction,
  loadSaveTransaction,
  parseSaveData,
  setOfflineFarmStageTarget
} from "../../core";
import type {
  ApplyOfflineAssignmentRewardsResult,
  ApplyOfflineRewardsResult,
  LoadSaveTransactionResult,
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
  | Omit<
      Extract<LoadSaveTransactionResult, { ok: true }>,
      "changed" | "previousSave"
    >
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
  const rawSaveResult = loadRawSaveFromStorage(storage, key);

  if (!rawSaveResult.ok) {
    return rawSaveResult;
  }

  const transaction = loadSaveTransaction({
    data,
    rawSave: rawSaveResult.rawSave,
    nowMs
  });

  if (!transaction.ok) {
    return {
      ok: false,
      reason: "invalid_save",
      errors: transaction.errors
    };
  }

  if (
    transaction.changed &&
    !persistSaveToStorage(storage, transaction.save, key)
  ) {
    return {
      ok: true,
      save: transaction.previousSave,
      offlineRewards: null,
      offlineAssignmentRewards: null
    };
  }

  return {
    ok: true,
    save: transaction.save,
    offlineRewards: transaction.offlineRewards,
    offlineAssignmentRewards: transaction.offlineAssignmentRewards
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
  data: OfflineSaveData,
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

  const transaction = applySaveLoadTransaction({
    data,
    save: parseResult.save,
    nowMs: parseResult.save.updatedAtMs
  });
  const save = transaction.save;

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

type LoadRawSaveFromStorageResult =
  | {
      ok: true;
      rawSave: unknown;
    }
  | Extract<LoadSaveDataFromStorageResult, { ok: false }>;

function loadRawSaveFromStorage(
  storage: WebSaveStorage,
  key: string
): LoadRawSaveFromStorageResult {
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

  try {
    return {
      ok: true,
      rawSave: JSON.parse(rawSave)
    };
  } catch {
    return {
      ok: false,
      reason: "invalid_json",
      errors: ["Stored save is not valid JSON"]
    };
  }
}

function persistSaveToStorage(
  storage: WebSaveStorage,
  save: SaveData,
  key: string
): boolean {
  try {
    storage.setItem(key, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
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
