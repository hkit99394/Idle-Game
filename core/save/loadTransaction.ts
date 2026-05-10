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
  ApplySaveLoadTransactionSuccess,
  LoadSaveTransactionResult,
  SaveData,
  SaveLoadTransactionData,
  SaveLoadWriteReason
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

  const transaction = applySaveLoadTransaction({
    data: input.data,
    save: parseResult.save,
    nowMs: input.nowMs
  });

  return {
    ...transaction,
    changed:
      transaction.changed ||
      parseResult.migration.migrated ||
      parseResult.migration.normalized,
    writeReasons: [
      ...(parseResult.migration.migrated
        ? (["migrated"] as SaveLoadWriteReason[])
        : []),
      ...(!parseResult.migration.migrated && parseResult.migration.normalized
        ? (["normalizedSave"] as SaveLoadWriteReason[])
        : []),
      ...transaction.writeReasons
    ],
    migration: parseResult.migration
  };
}

export function applySaveLoadTransaction(input: {
  data: SaveLoadTransactionData;
  save: SaveData;
  nowMs: number;
}): ApplySaveLoadTransactionSuccess {
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
  const writeReasons: SaveLoadWriteReason[] = [
    ...(farmTargetChanged
      ? (["normalizedFarmTarget"] as SaveLoadWriteReason[])
      : []),
    ...(presetChanged ? (["normalizedPreset"] as SaveLoadWriteReason[]) : []),
    ...(hasFarmRewards
      ? (["offlineRewardsApplied"] as SaveLoadWriteReason[])
      : []),
    ...(hasAssignmentRewards
      ? (["offlineAssignmentsApplied"] as SaveLoadWriteReason[])
      : [])
  ];

  if (writeReasons.length === 0) {
    return {
      ok: true,
      save: input.save,
      previousSave: input.save,
      changed: false,
      writeReasons,
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
    writeReasons,
    offlineRewards,
    offlineAssignmentRewards
  };
}
