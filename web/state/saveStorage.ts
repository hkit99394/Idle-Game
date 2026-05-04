import {
  applyOfflineRewards,
  createSaveData,
  parseSaveData
} from "../../core";
import type {
  ApplyOfflineRewardsResult,
  SaveData,
  StaticGameData
} from "../../core";
import type { WebGameState } from "./gameState";

export const WEB_SAVE_STORAGE_KEY = "path-of-jianghu.save.v1";
export const WEB_SAVE_AUTOSAVE_INTERVAL_MS = 15_000;

export type WebSaveStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

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

export function getBrowserSaveStorage(): WebSaveStorage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

export function loadSaveDataFromStorage(
  data: Pick<StaticGameData, "heroes" | "regions" | "stages">,
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
  data: Pick<StaticGameData, "heroes" | "regions" | "stages" | "mastery">,
  storage: WebSaveStorage,
  nowMs = Date.now(),
  key = WEB_SAVE_STORAGE_KEY
): LoadSaveDataWithOfflineRewardsResult {
  const loadResult = loadSaveDataFromStorage(data, storage, key);

  if (!loadResult.ok) {
    return loadResult;
  }

  const rewardTimeMs = Math.max(nowMs, loadResult.save.updatedAtMs);
  const offlineRewards = applyOfflineRewards({
    data,
    progress: loadResult.save.progress,
    selectedOfflineFarmStageId: loadResult.save.selectedOfflineFarmStageId,
    lastSavedAtMs: loadResult.save.updatedAtMs,
    currentTimeMs: rewardTimeMs
  });

  if (!offlineRewards.ok || offlineRewards.rewards.clears === 0) {
    return {
      ok: true,
      save: loadResult.save,
      offlineRewards
    };
  }

  const save = createSaveData({
    progress: offlineRewards.progress,
    selectedOfflineFarmStageId: loadResult.save.selectedOfflineFarmStageId,
    nowMs: rewardTimeMs,
    lastOfflineRewardAtMs: rewardTimeMs,
    previousSave: loadResult.save
  });

  try {
    storage.setItem(key, JSON.stringify(save));
  } catch {
    return {
      ok: true,
      save: loadResult.save,
      offlineRewards: null
    };
  }

  return {
    ok: true,
    save,
    offlineRewards
  };
}

export function saveWebGameStateToStorage(
  data: Pick<StaticGameData, "heroes" | "regions" | "stages">,
  state: Pick<WebGameState, "progress" | "selectedOfflineFarmStageId">,
  storage: WebSaveStorage,
  nowMs = Date.now(),
  key = WEB_SAVE_STORAGE_KEY
): SaveStateToStorageResult {
  const previousSaveResult = loadSaveDataFromStorage(data, storage, key);
  const save = createSaveData({
    progress: state.progress,
    selectedOfflineFarmStageId: state.selectedOfflineFarmStageId,
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
