import {
  createInitialPlayerProgress,
  createSaveData,
  applySaveLoadTransaction,
  loadSaveTransaction,
  parseSaveData,
  setOfflineFarmStageTarget
} from "../../core";
import type {
  ApplySaveLoadTransactionSuccess,
  ApplyOfflineAssignmentRewardsResult,
  ApplyOfflineRewardsResult,
  RawSaveLoadTransactionSuccess,
  SaveData,
  SaveLoadWriteReason,
  SaveMigrationMetadata,
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
      migration: SaveMigrationMetadata;
    }
  | {
      ok: false;
      reason: "missing_save" | "invalid_json" | "invalid_save" | "storage_error";
      errors: string[];
    };

export type LoadSaveDataWithOfflineRewardsSuccess = {
  ok: true;
  migration?: SaveMigrationMetadata;
  loadedNormalizedSave: SaveData;
  candidateSave: SaveData;
  activeSave: SaveData;
  persistedSave: SaveData | null;
  offlineRewardBaselineSave: SaveData | null;
  commitResult: SaveStorageCommitResult;
  offlineRewards: ApplyOfflineRewardsResult | null;
  offlineAssignmentRewards: ApplyOfflineAssignmentRewardsResult | null;
};

export type LoadSaveDataWithOfflineRewardsResult =
  | LoadSaveDataWithOfflineRewardsSuccess
  | Extract<LoadSaveDataFromStorageResult, { ok: false }>;

type LoadSaveDataWithOfflineRewardsFromSaveOptions = {
  key?: string;
  failedActiveSave?: SaveData;
  failedPersistedSave?: SaveData | null;
};

export type SaveStorageCommitResult =
  | {
      status: "not_needed";
      attemptedWriteReasons: [];
      committedWriteReasons: [];
    }
  | {
      status: "written";
      attemptedWriteReasons: SaveLoadWriteReason[];
      committedWriteReasons: SaveLoadWriteReason[];
    }
  | {
      status: "failed";
      attemptedWriteReasons: SaveLoadWriteReason[];
      committedWriteReasons: [];
      errors: string[];
    };

export function formatSaveStorageCommitFailure(
  commitResult: Extract<SaveStorageCommitResult, { status: "failed" }>
): string {
  const attemptedReasons =
    commitResult.attemptedWriteReasons.join(", ") || "save update";
  const errors = commitResult.errors.join("; ") || "unknown storage error";

  return `Save load write failed after ${attemptedReasons}: ${errors}`;
}

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

export type TimeTravelOfflineSaveResult =
  | {
      ok: true;
      save: SaveData;
      traveledSeconds: number;
    }
  | {
      ok: false;
      reason: "invalid_duration";
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
    save: parseResult.save,
    migration: parseResult.migration
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

  return commitSaveLoadTransactionToStorage(transaction, storage, key);
}

export function loadSaveDataWithOfflineRewardsFromSave(
  data: OfflineSaveData,
  save: SaveData,
  storage: WebSaveStorage,
  nowMs = Date.now(),
  options: LoadSaveDataWithOfflineRewardsFromSaveOptions = {}
): LoadSaveDataWithOfflineRewardsResult {
  const transaction = applySaveLoadTransaction({
    data,
    save,
    nowMs
  });

  return commitSaveLoadTransactionToStorage(
    transaction,
    storage,
    options.key ?? WEB_SAVE_STORAGE_KEY,
    options.failedActiveSave ?? save,
    "failedPersistedSave" in options ? options.failedPersistedSave : save
  );
}

function commitSaveLoadTransactionToStorage(
  transaction:
    | ApplySaveLoadTransactionSuccess
    | RawSaveLoadTransactionSuccess,
  storage: WebSaveStorage,
  key: string,
  failedActiveSave = transaction.previousSave,
  failedPersistedSave: SaveData | null = isCurrentSchemaPersistedSave(
    transaction.writeReasons
  )
    ? transaction.previousSave
    : null
): Extract<LoadSaveDataWithOfflineRewardsResult, { ok: true }> {
  const migration = getTransactionMigration(transaction);

  if (transaction.writeReasons.length > 0) {
    const persistResult = persistSaveToStorage(storage, transaction.save, key);

    if (!persistResult.ok) {
      return {
        ok: true,
        ...(migration ? { migration } : {}),
        loadedNormalizedSave: transaction.previousSave,
        candidateSave: transaction.save,
        activeSave: failedActiveSave,
        persistedSave: failedPersistedSave,
        offlineRewardBaselineSave: hasOfflineRewardWriteReason(
          transaction.writeReasons
        )
          ? transaction.previousSave
          : null,
        commitResult: {
          status: "failed",
          attemptedWriteReasons: transaction.writeReasons,
          committedWriteReasons: [],
          errors: persistResult.errors
        },
        offlineRewards: null,
        offlineAssignmentRewards: null
      };
    }
  }

  return {
    ok: true,
    ...(migration ? { migration } : {}),
    loadedNormalizedSave: transaction.previousSave,
    candidateSave: transaction.save,
    activeSave: transaction.save,
    persistedSave: transaction.save,
    offlineRewardBaselineSave: null,
    commitResult:
      transaction.writeReasons.length > 0
        ? {
            status: "written",
            attemptedWriteReasons: transaction.writeReasons,
            committedWriteReasons: transaction.writeReasons
          }
        : {
            status: "not_needed",
            attemptedWriteReasons: [],
            committedWriteReasons: []
          },
    offlineRewards: transaction.offlineRewards,
    offlineAssignmentRewards: transaction.offlineAssignmentRewards
  };
}

function getTransactionMigration(
  transaction:
    | ApplySaveLoadTransactionSuccess
    | RawSaveLoadTransactionSuccess
): SaveMigrationMetadata | undefined {
  return (transaction as { migration?: SaveMigrationMetadata }).migration;
}

function isCurrentSchemaPersistedSave(
  writeReasons: SaveLoadWriteReason[]
): boolean {
  return !writeReasons.some(
    (reason) => reason === "migrated" || reason === "normalizedSave"
  );
}

function hasOfflineRewardWriteReason(
  writeReasons: SaveLoadWriteReason[]
): boolean {
  return writeReasons.some(
    (reason) =>
      reason === "offlineRewardsApplied" ||
      reason === "offlineAssignmentsApplied"
  );
}

type SaveableWebGameState = Pick<
  WebGameState,
  | "progress"
  | "autoMedicinePreferences"
  | "selectedOfflineFarmStageId"
  | "offlineFarmPreset"
> &
  Partial<Pick<WebGameState, "startupSavePersistence">>;

export function saveWebGameStateToStorage(
  data: SaveSchemaData,
  state: SaveableWebGameState,
  storage: WebSaveStorage,
  nowMs = Date.now(),
  key = WEB_SAVE_STORAGE_KEY
): SaveStateToStorageResult {
  const previousSaveResult = loadSaveDataFromStorage(data, storage, key);
  const preservedOfflineAnchor = previousSaveResult.ok
    ? getUnclaimedOfflineRewardAnchor(state, previousSaveResult.save)
    : null;
  const save = createSaveData({
    progress: state.progress,
    autoMedicinePreferences: state.autoMedicinePreferences,
    selectedOfflineFarmStageId: state.selectedOfflineFarmStageId,
    offlineFarmPreset: state.offlineFarmPreset,
    nowMs: preservedOfflineAnchor?.updatedAtMs ?? nowMs,
    lastOfflineRewardAtMs: preservedOfflineAnchor?.lastOfflineRewardAtMs,
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

function getUnclaimedOfflineRewardAnchor(
  state: SaveableWebGameState,
  storedSave: SaveData
): Pick<SaveData, "updatedAtMs" | "lastOfflineRewardAtMs"> | null {
  const startupPersistence = state.startupSavePersistence;
  const offlineRewardBaselineSave =
    startupPersistence?.offlineRewardBaselineSave ??
    startupPersistence?.persistedSave ??
    null;

  if (
    startupPersistence?.commitStatus !== "failed" ||
    offlineRewardBaselineSave === null ||
    !hasOfflineRewardWriteReason(startupPersistence.attemptedWriteReasons)
  ) {
    return null;
  }

  if (
    !saveHasSameOfflineRewardAnchor(
      storedSave,
      offlineRewardBaselineSave
    )
  ) {
    return null;
  }

  return {
    updatedAtMs: storedSave.updatedAtMs,
    lastOfflineRewardAtMs: storedSave.lastOfflineRewardAtMs
  };
}

function saveHasSameOfflineRewardAnchor(
  save: SaveData,
  baselineSave: SaveData
): boolean {
  return (
    save.version === baselineSave.version &&
    save.createdAtMs === baselineSave.createdAtMs &&
    save.updatedAtMs === baselineSave.updatedAtMs &&
    save.lastOfflineRewardAtMs === baselineSave.lastOfflineRewardAtMs
  );
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
):
  | {
      ok: true;
    }
  | {
      ok: false;
      errors: string[];
    } {
  try {
    storage.setItem(key, JSON.stringify(save));
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      errors: [error instanceof Error ? error.message : "Unable to write save"]
    };
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

export function timeTravelOfflineSave(
  save: SaveData,
  offlineSeconds: number,
  nowMs = Date.now()
): TimeTravelOfflineSaveResult {
  const traveledSeconds = Math.floor(offlineSeconds);

  if (!Number.isFinite(offlineSeconds) || traveledSeconds <= 0) {
    return {
      ok: false,
      reason: "invalid_duration",
      errors: ["Offline time travel duration must be greater than zero"]
    };
  }

  const traveledMs = traveledSeconds * 1000;
  const simulatedUpdatedAtMs = Math.max(0, nowMs - traveledMs);
  const timeTraveledSave: SaveData = {
    ...save,
    createdAtMs: Math.min(save.createdAtMs, simulatedUpdatedAtMs),
    updatedAtMs: simulatedUpdatedAtMs,
    lastOfflineRewardAtMs: Math.min(
      save.lastOfflineRewardAtMs,
      simulatedUpdatedAtMs
    )
  };

  return {
    ok: true,
    save: timeTraveledSave,
    traveledSeconds
  };
}
