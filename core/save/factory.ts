import { cloneProgress, normalizeOfflineFarmPreset } from "../progression";
import { normalizeAutoMedicinePreferences } from "./autoMedicinePreferences";
import { attachSaveDataSerialization } from "./saveFieldAliases";
import { SAVE_DATA_VERSION, type CreateSaveDataInput, type SaveData } from "./saveTypes";

export function cloneSaveData(save: SaveData): SaveData {
  return attachSaveDataSerialization({
    version: SAVE_DATA_VERSION,
    progress: cloneProgress(save.progress),
    autoMedicinePreferences: normalizeAutoMedicinePreferences(
      save.autoMedicinePreferences
    ),
    selectedOfflineFarmStageId: save.selectedOfflineFarmStageId,
    offlineFarmPreset: normalizeOfflineFarmPreset(save.offlineFarmPreset),
    createdAtMs: save.createdAtMs,
    updatedAtMs: save.updatedAtMs,
    lastOfflineRewardAtMs: save.lastOfflineRewardAtMs
  });
}

export function createSaveData(input: CreateSaveDataInput): SaveData {
  return attachSaveDataSerialization({
    version: SAVE_DATA_VERSION,
    progress: cloneProgress(input.progress),
    autoMedicinePreferences: normalizeAutoMedicinePreferences(
      input.autoMedicinePreferences ??
        input.previousSave?.autoMedicinePreferences
    ),
    selectedOfflineFarmStageId: input.selectedOfflineFarmStageId,
    offlineFarmPreset:
      input.offlineFarmPreset ??
      input.previousSave?.offlineFarmPreset ??
      normalizeOfflineFarmPreset(undefined),
    createdAtMs: input.previousSave?.createdAtMs ?? input.nowMs,
    updatedAtMs: input.nowMs,
    lastOfflineRewardAtMs:
      input.lastOfflineRewardAtMs ??
      input.previousSave?.lastOfflineRewardAtMs ??
      input.nowMs
  });
}
