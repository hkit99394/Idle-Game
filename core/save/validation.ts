import { isOfflineFarmPreset } from "../progression";
import { validateAutoMedicinePreferences } from "./autoMedicinePreferences";
import { cloneSaveData } from "./factory";
import { migrateSaveData } from "./migrations";
import { validateProgress } from "./progressValidation";
import type {
  ParseSaveDataResult,
  SaveData,
  SaveValidationData,
  UnknownRecord
} from "./saveTypes";
import {
  isFiniteNonNegativeNumber,
  isRecord,
  validateNumber,
  validateRecord
} from "./validationShared";

export function validateTimestamps(raw: UnknownRecord, errors: string[]): void {
  validateNumber(raw.createdAtMs, "createdAtMs", errors);
  validateNumber(raw.updatedAtMs, "updatedAtMs", errors);
  validateNumber(raw.lastOfflineRewardAtMs, "lastOfflineRewardAtMs", errors);

  if (
    isFiniteNonNegativeNumber(raw.createdAtMs) &&
    isFiniteNonNegativeNumber(raw.updatedAtMs) &&
    raw.updatedAtMs < raw.createdAtMs
  ) {
    errors.push("updatedAtMs must be greater than or equal to createdAtMs");
  }

  if (
    isFiniteNonNegativeNumber(raw.createdAtMs) &&
    isFiniteNonNegativeNumber(raw.lastOfflineRewardAtMs) &&
    raw.lastOfflineRewardAtMs < raw.createdAtMs
  ) {
    errors.push("lastOfflineRewardAtMs must be greater than or equal to createdAtMs");
  }
}

export function validateSaveData(
  data: SaveValidationData,
  raw: unknown
): string[] {
  const errors: string[] = [];
  const migration = migrateSaveData(data, raw);

  if (!migration.ok) {
    errors.push(...migration.errors);

    if (!isRecord(raw)) {
      return errors;
    }
  }

  const migratedRaw = migration.ok ? migration.save : raw;

  if (!validateRecord(migratedRaw, "save", errors)) {
    return errors;
  }

  validateProgress(data, migratedRaw.progress, errors);
  validateAutoMedicinePreferences(
    data,
    migratedRaw.autoMedicinePreferences,
    errors
  );

  if (
    migratedRaw.selectedOfflineFarmStageId !== null &&
    typeof migratedRaw.selectedOfflineFarmStageId !== "string"
  ) {
    errors.push("selectedOfflineFarmStageId must be a string or null");
  }

  if (
    migratedRaw.offlineFarmPreset !== undefined &&
    !isOfflineFarmPreset(migratedRaw.offlineFarmPreset)
  ) {
    errors.push("offlineFarmPreset must be a supported offline farm preset");
  }

  validateTimestamps(migratedRaw, errors);

  return errors;
}

export function parseSaveData(
  data: SaveValidationData,
  raw: unknown
): ParseSaveDataResult {
  const migration = migrateSaveData(data, raw);
  const errors = validateSaveData(data, raw);

  if (errors.length > 0) {
    return {
      ok: false,
      reason: "invalid_save",
      errors
    };
  }

  if (!migration.ok) {
    return {
      ok: false,
      reason: "invalid_save",
      errors: migration.errors
    };
  }

  return {
    ok: true,
    save: cloneSaveData(migration.save as SaveData)
  };
}
