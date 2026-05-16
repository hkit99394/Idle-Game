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

  validateMigratedSaveData(data, migratedRaw, errors);

  return errors;
}

function validateMigratedSaveData(
  data: SaveValidationData,
  migratedRaw: unknown,
  errors: string[]
): void {
  if (!validateRecord(migratedRaw, "save", errors)) {
    return;
  }

  validateProgress(data, migratedRaw.progress, errors);
  validateAutoMedicinePreferences(
    data,
    migratedRaw.autoMedicinePreferences,
    errors
  );

  if (
    migratedRaw.selectedOfflineFarmRouteId !== null &&
    typeof migratedRaw.selectedOfflineFarmRouteId !== "string"
  ) {
    errors.push("selectedOfflineFarmRouteId must be a string or null");
  }

  if (
    migratedRaw.offlineFarmPreset !== undefined &&
    !isOfflineFarmPreset(migratedRaw.offlineFarmPreset)
  ) {
    errors.push("offlineFarmPreset must be a supported offline farm preset");
  }

  validateTimestamps(migratedRaw, errors);
}

export function parseSaveData(
  data: SaveValidationData,
  raw: unknown
): ParseSaveDataResult {
  const migration = migrateSaveData(data, raw);
  const errors: string[] = [];

  if (!migration.ok) {
    return {
      ok: false,
      reason: "invalid_save",
      errors: migration.errors
    };
  }

  validateMigratedSaveData(data, migration.save, errors);

  if (errors.length > 0) {
    return {
      ok: false,
      reason: "invalid_save",
      errors
    };
  }

  return {
    ok: true,
    save: cloneSaveData(migration.save as SaveData),
    migration: {
      fromVersion: migration.fromVersion,
      toVersion: migration.toVersion,
      migrated: migration.migrated,
      normalized: migration.normalized,
      normalizations: migration.normalizations
    }
  };
}
