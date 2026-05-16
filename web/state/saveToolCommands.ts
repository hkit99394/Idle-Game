import type { SaveData, StaticGameData } from "../../core";
import { OFFLINE_TIME_TRAVEL_SECONDS } from "./constants";
import {
  exportSaveDataFromStorage,
  formatSaveStorageCommitFailure,
  getBrowserSaveStorage,
  importSaveDataToStorage,
  loadSaveDataWithOfflineRewardsFromSave,
  resetSaveDataInStorage,
  saveWebGameStateToStorage,
  timeTravelOfflineSave
} from "./saveStorage";
import type { WebSaveStorage } from "./saveStorage";
import { getSaveToolErrorMessage } from "./saveToolMessages";
import type {
  OfflineRewardSummary,
  SaveToolResult,
  WebGameState
} from "./types";
import {
  createInitialWebGameState,
  createOfflineRewardSummary,
  createWebGameStateFromSave
} from "./reducer";

type SaveToolStateCommandResult = {
  result: SaveToolResult;
  state: WebGameState | null;
};

type OfflineTimeTravelState = Pick<
  WebGameState,
  | "progress"
  | "autoMedicinePreferences"
  | "selectedOfflineFarmRouteId"
  | "offlineFarmPreset"
>;

export type ApplyOfflineTimeTravelResult =
  | {
      ok: true;
      message: string;
      save: SaveData;
      offlineSummary: OfflineRewardSummary | null;
    }
  | Extract<SaveToolResult, { ok: false }>;

export function exportBrowserSave(data: StaticGameData): SaveToolResult {
  const storage = getBrowserSaveStorage();

  if (!storage) {
    return {
      ok: false,
      message: "Browser save storage is unavailable",
      errors: ["Browser save storage is unavailable"]
    };
  }

  const result = exportSaveDataFromStorage(data, storage);

  if (!result.ok) {
    return {
      ok: false,
      message: getSaveToolErrorMessage(result.reason),
      errors: result.errors
    };
  }

  return {
    ok: true,
    message: "Save exported",
    json: result.json
  };
}

export function importBrowserSave(
  data: StaticGameData,
  rawSaveText: string
): SaveToolStateCommandResult {
  const storage = getBrowserSaveStorage();

  if (!storage) {
    return {
      result: {
        ok: false,
        message: "Browser save storage is unavailable",
        errors: ["Browser save storage is unavailable"]
      },
      state: null
    };
  }

  const result = importSaveDataToStorage(data, storage, rawSaveText);

  if (!result.ok) {
    return {
      result: {
        ok: false,
        message: getSaveToolErrorMessage(result.reason),
        errors: result.errors
      },
      state: null
    };
  }

  return {
    result: {
      ok: true,
      message: "Save imported"
    },
    state: createWebGameStateFromSave(data, result.save)
  };
}

export function resetBrowserSave(
  data: StaticGameData
): SaveToolStateCommandResult {
  const storage = getBrowserSaveStorage();

  if (!storage) {
    return {
      result: {
        ok: false,
        message: "Browser save storage is unavailable",
        errors: ["New game was reset for this session only"]
      },
      state: createInitialWebGameState(data)
    };
  }

  const result = resetSaveDataInStorage(data, storage);

  if (!result.ok) {
    return {
      result: {
        ok: false,
        message: getSaveToolErrorMessage(result.reason),
        errors: result.errors
      },
      state: null
    };
  }

  return {
    result: {
      ok: true,
      message: "New game save created"
    },
    state: createWebGameStateFromSave(data, result.save)
  };
}

export function applyOfflineTimeTravel(
  data: StaticGameData,
  state: OfflineTimeTravelState,
  storage: WebSaveStorage | null,
  offlineSeconds = OFFLINE_TIME_TRAVEL_SECONDS,
  nowMs = Date.now()
): ApplyOfflineTimeTravelResult {
  if (!state.selectedOfflineFarmRouteId) {
    return {
      ok: false,
      message: "Select an offline farm stage first",
      errors: []
    };
  }

  if (!storage) {
    return {
      ok: false,
      message: "Browser save storage is unavailable",
      errors: ["Browser save storage is unavailable"]
    };
  }

  const saveResult = saveWebGameStateToStorage(data, state, storage, nowMs);

  if (!saveResult.ok) {
    return {
      ok: false,
      message: getSaveToolErrorMessage(saveResult.reason),
      errors: saveResult.errors
    };
  }

  const travelResult = timeTravelOfflineSave(
    saveResult.save,
    offlineSeconds,
    nowMs
  );

  if (!travelResult.ok) {
    return {
      ok: false,
      message: getSaveToolErrorMessage(travelResult.reason),
      errors: travelResult.errors
    };
  }

  const loadResult = loadSaveDataWithOfflineRewardsFromSave(
    data,
    travelResult.save,
    storage,
    nowMs,
    {
      failedActiveSave: saveResult.save,
      failedPersistedSave: saveResult.save
    }
  );

  if (!loadResult.ok) {
    return {
      ok: false,
      message: getSaveToolErrorMessage(loadResult.reason),
      errors: loadResult.errors
    };
  }

  if (loadResult.commitResult.status === "failed") {
    const errors = [formatSaveStorageCommitFailure(loadResult.commitResult)];

    return {
      ok: false,
      message: getSaveToolErrorMessage("storage_error"),
      errors
    };
  }

  const offlineSummary = createOfflineRewardSummary(
    loadResult.offlineRewards,
    loadResult.offlineAssignmentRewards
  );
  const activeSave =
    loadResult.commitResult.status === "not_needed"
      ? saveResult.save
      : loadResult.activeSave;

  return {
    ok: true,
    message: offlineSummary
      ? "Offline time travel rewards applied"
      : "Offline time travel applied with no rewards",
    save: activeSave,
    offlineSummary
  };
}

export function timeTravelOfflineFarmSave(
  data: StaticGameData,
  state: OfflineTimeTravelState,
  offlineSeconds = OFFLINE_TIME_TRAVEL_SECONDS,
  nowMs = Date.now()
): SaveToolStateCommandResult {
  const result = applyOfflineTimeTravel(
    data,
    state,
    getBrowserSaveStorage(),
    offlineSeconds,
    nowMs
  );

  if (!result.ok) {
    return {
      result,
      state: null
    };
  }

  return {
    result: {
      ok: true,
      message: result.message
    },
    state: createWebGameStateFromSave(data, result.save, result.offlineSummary)
  };
}
