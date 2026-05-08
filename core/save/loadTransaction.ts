import {
  applyOfflineAssignmentRewards,
  applyOfflineRewards
} from "../offline";
import {
  normalizeOfflineFarmPreset,
  setOfflineFarmStageTarget
} from "../progression";
import { createSaveData } from "./factory";
import { parseSaveData } from "./validation";
import type {
  LoadSaveTransactionResult,
  SaveData,
  SaveLoadTransactionData,
  SaveLoadTransactionSuccess
} from "./saveTypes";

export function loadSaveTransaction(input: {
  data: SaveLoadTransactionData;
  rawSave: unknown;
  nowMs: number;
}): LoadSaveTransactionResult {
  const parseResult = parseSaveData(input.data, input.rawSave);

  if (!parseResult.ok) {
    return parseResult;
  }

  return applySaveLoadTransaction({
    data: input.data,
    save: parseResult.save,
    nowMs: input.nowMs
  });
}

export function applySaveLoadTransaction(input: {
  data: SaveLoadTransactionData;
  save: SaveData;
  nowMs: number;
}): SaveLoadTransactionSuccess {
  const rewardTimeMs = Math.max(input.nowMs, input.save.updatedAtMs);
  const offlineFarmPreset = normalizeOfflineFarmPreset(
    input.save.offlineFarmPreset
  );
  const selectedOfflineFarmStageId = setOfflineFarmStageTarget(
    input.data,
    input.save.progress,
    input.save.selectedOfflineFarmStageId,
    offlineFarmPreset
  );
  const farmTargetChanged =
    selectedOfflineFarmStageId !== input.save.selectedOfflineFarmStageId;
  const presetChanged = offlineFarmPreset !== input.save.offlineFarmPreset;
  const offlineRewards = applyOfflineRewards({
    data: input.data,
    progress: input.save.progress,
    selectedOfflineFarmStageId,
    lastSavedAtMs: input.save.updatedAtMs,
    currentTimeMs: rewardTimeMs
  });
  const hasFarmRewards = offlineRewards.ok && offlineRewards.rewards.clears > 0;
  const farmProgress = hasFarmRewards
    ? offlineRewards.progress
    : input.save.progress;
  const offlineAssignmentRewards = applyOfflineAssignmentRewards({
    data: input.data,
    progress: farmProgress,
    lastSavedAtMs: input.save.updatedAtMs,
    currentTimeMs: rewardTimeMs
  });
  const hasAssignmentRewards =
    offlineAssignmentRewards.rewards.assignments.length > 0;
  const hasRewards = hasFarmRewards || hasAssignmentRewards;

  if (!hasRewards && !farmTargetChanged && !presetChanged) {
    return {
      ok: true,
      save: input.save,
      previousSave: input.save,
      changed: false,
      offlineRewards,
      offlineAssignmentRewards
    };
  }

  return {
    ok: true,
    save: createSaveData({
      progress: hasAssignmentRewards
        ? offlineAssignmentRewards.progress
        : farmProgress,
      selectedOfflineFarmStageId,
      offlineFarmPreset,
      nowMs: hasRewards ? rewardTimeMs : input.save.updatedAtMs,
      lastOfflineRewardAtMs: hasRewards
        ? rewardTimeMs
        : input.save.lastOfflineRewardAtMs,
      previousSave: input.save
    }),
    previousSave: input.save,
    changed: true,
    offlineRewards,
    offlineAssignmentRewards
  };
}
