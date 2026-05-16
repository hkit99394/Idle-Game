import { normalizeRegionId } from "../compatibility";
import type { SaveData, SaveNormalization, UnknownRecord } from "./saveTypes";
import { isRecord } from "./validationShared";

export type NormalizeSaveFieldAliasesResult =
  | {
      ok: true;
      save: UnknownRecord;
      normalizations: SaveNormalization[];
    }
  | {
      ok: false;
      errors: string[];
    };

const OFFLINE_FARM_PRESET_LEGACY_TO_TARGET = {
  silver: "credits",
  cultivation: "resonance",
  combatExperience: "combatData"
} as const;

const OFFLINE_FARM_PRESET_TARGET_TO_LEGACY = {
  credits: "silver",
  resonance: "cultivation",
  combatData: "combatExperience"
} as const;

function migratedLegacySaveField(
  field: string,
  targetField: string
): SaveNormalization {
  return {
    field,
    reason: `migrated legacy save field to ${targetField}`
  };
}

function normalizedLegacyOfflineFarmPresetValue(): SaveNormalization {
  return {
    field: "offlineFarmPreset",
    reason: "normalized legacy offline farm preset value"
  };
}

function hasOwn(record: UnknownRecord, key: string): boolean {
  return Object.hasOwn(record, key);
}

function valuesAreEquivalent(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function addConflict(
  errors: string[],
  targetField: string,
  legacyField: string
): void {
  errors.push(`conflicting save field aliases: ${targetField} and ${legacyField}`);
}

function copyAliasedField(
  source: UnknownRecord,
  target: UnknownRecord,
  normalizations: SaveNormalization[],
  errors: string[],
  legacyField: string,
  targetField: string,
  options: {
    normalizeTargetValue?: (value: unknown) => unknown;
    legacyPath?: string;
    targetPath?: string;
  } = {}
): void {
  const hasLegacy = hasOwn(source, legacyField);
  const hasTarget = hasOwn(source, targetField);
  const targetValue = hasTarget
    ? options.normalizeTargetValue?.(source[targetField]) ?? source[targetField]
    : undefined;

  if (hasTarget && !hasLegacy) {
    target[legacyField] = targetValue;
    return;
  }

  if (!hasTarget && hasLegacy) {
    target[legacyField] = source[legacyField];
    normalizations.push(
      migratedLegacySaveField(
        options.legacyPath ?? legacyField,
        options.targetPath ?? targetField
      )
    );
    return;
  }

  if (!hasTarget && !hasLegacy) {
    return;
  }

  if (valuesAreEquivalent(source[legacyField], targetValue)) {
    target[legacyField] = targetValue;
    normalizations.push(
      migratedLegacySaveField(
        options.legacyPath ?? legacyField,
        options.targetPath ?? targetField
      )
    );
    return;
  }

  addConflict(
    errors,
    options.targetPath ?? targetField,
    options.legacyPath ?? legacyField
  );
}

function normalizeOfflineFarmPresetForRuntime(
  value: unknown,
  normalizations: SaveNormalization[]
): unknown {
  if (
    value === "credits" ||
    value === "resonance" ||
    value === "combatData"
  ) {
    return OFFLINE_FARM_PRESET_TARGET_TO_LEGACY[value];
  }

  if (
    value === "silver" ||
    value === "cultivation" ||
    value === "combatExperience"
  ) {
    normalizations.push(normalizedLegacyOfflineFarmPresetValue());
  }

  return value;
}

function serializeOfflineFarmPreset(value: unknown): unknown {
  if (
    value === "silver" ||
    value === "cultivation" ||
    value === "combatExperience"
  ) {
    return OFFLINE_FARM_PRESET_LEGACY_TO_TARGET[value];
  }

  return value;
}

function normalizeResourcesForRuntime(
  value: unknown,
  normalizations: SaveNormalization[],
  errors: string[]
): unknown {
  if (!isRecord(value)) {
    return value;
  }

  const resources = { ...value };

  copyAliasedField(
    value,
    resources,
    normalizations,
    errors,
    "silver",
    "credits",
    {
      legacyPath: "progress.resources.silver",
      targetPath: "progress.resources.credits"
    }
  );
  copyAliasedField(
    value,
    resources,
    normalizations,
    errors,
    "cultivation",
    "resonance",
    {
      legacyPath: "progress.resources.cultivation",
      targetPath: "progress.resources.resonance"
    }
  );
  copyAliasedField(
    value,
    resources,
    normalizations,
    errors,
    "herbs",
    "reagents",
    {
      legacyPath: "progress.resources.herbs",
      targetPath: "progress.resources.reagents"
    }
  );

  delete resources.credits;
  delete resources.resonance;
  delete resources.reagents;

  return resources;
}

function normalizeDistrictProgressForRuntime(
  value: unknown,
  legacyPath: string,
  targetPath: string,
  normalizations: SaveNormalization[],
  errors: string[]
): unknown {
  if (!isRecord(value)) {
    return value;
  }

  const progress = { ...value };

  copyAliasedField(
    value,
    progress,
    normalizations,
    errors,
    "combatExperience",
    "combatData",
    {
      legacyPath: `${legacyPath}.combatExperience`,
      targetPath: `${targetPath}.combatData`
    }
  );
  copyAliasedField(
    value,
    progress,
    normalizations,
    errors,
    "highestClearedStageIndex",
    "highestClearedRouteIndex",
    {
      legacyPath: `${legacyPath}.highestClearedStageIndex`,
      targetPath: `${targetPath}.highestClearedRouteIndex`
    }
  );

  delete progress.combatData;
  delete progress.highestClearedRouteIndex;

  return progress;
}

function normalizeDistrictMapForRuntime(
  value: unknown,
  legacyPath: string,
  targetPath: string,
  normalizations: SaveNormalization[],
  errors: string[]
): Record<string, unknown> | unknown {
  if (!isRecord(value)) {
    return value;
  }

  const map: Record<string, unknown> = {};

  for (const [districtId, progress] of Object.entries(value)) {
    map[districtId] = normalizeDistrictProgressForRuntime(
      progress,
      `${legacyPath}.${districtId}`,
      `${targetPath}.${districtId}`,
      normalizations,
      errors
    );
  }

  return map;
}

function mergeMapAliasValues(
  legacyMaps: unknown,
  targetDistricts: unknown,
  normalizations: SaveNormalization[],
  errors: string[]
): unknown {
  const normalizedLegacyMaps = normalizeDistrictMapForRuntime(
    legacyMaps,
    "progress.maps",
    "progress.districts",
    normalizations,
    errors
  );
  const normalizedTargetDistricts = normalizeDistrictMapForRuntime(
    targetDistricts,
    "progress.districts",
    "progress.districts",
    normalizations,
    errors
  );

  if (!isRecord(normalizedLegacyMaps)) {
    return normalizedTargetDistricts;
  }

  if (!isRecord(normalizedTargetDistricts)) {
    return normalizedLegacyMaps;
  }

  const merged: Record<string, unknown> = { ...normalizedLegacyMaps };
  const keyByNormalizedDistrictId = new Map<string, string>();

  for (const key of Object.keys(merged)) {
    keyByNormalizedDistrictId.set(normalizeRegionId(key), key);
  }

  for (const [districtId, progress] of Object.entries(normalizedTargetDistricts)) {
    const normalizedDistrictId = normalizeRegionId(districtId);
    const existingKey = keyByNormalizedDistrictId.get(normalizedDistrictId);

    if (!existingKey) {
      merged[districtId] = progress;
      keyByNormalizedDistrictId.set(normalizedDistrictId, districtId);
      continue;
    }

    if (!valuesAreEquivalent(merged[existingKey], progress)) {
      addConflict(
        errors,
        `progress.districts.${districtId}`,
        `progress.maps.${existingKey}`
      );
      continue;
    }

    merged[districtId] = progress;
    if (districtId !== existingKey) {
      delete merged[existingKey];
      keyByNormalizedDistrictId.set(normalizedDistrictId, districtId);
    }
  }

  return merged;
}

function normalizeProgressForRuntime(
  value: unknown,
  normalizations: SaveNormalization[],
  errors: string[]
): unknown {
  if (!isRecord(value)) {
    return value;
  }

  const progress = { ...value };

  progress.resources = normalizeResourcesForRuntime(
    value.resources,
    normalizations,
    errors
  );

  if (hasOwn(value, "maps") && hasOwn(value, "districts")) {
    progress.maps = mergeMapAliasValues(
      value.maps,
      value.districts,
      normalizations,
      errors
    );
    normalizations.push(migratedLegacySaveField("progress.maps", "progress.districts"));
  } else if (hasOwn(value, "districts")) {
    progress.maps = normalizeDistrictMapForRuntime(
      value.districts,
      "progress.districts",
      "progress.districts",
      normalizations,
      errors
    );
  } else if (hasOwn(value, "maps")) {
    progress.maps = normalizeDistrictMapForRuntime(
      value.maps,
      "progress.maps",
      "progress.districts",
      normalizations,
      errors
    );
    normalizations.push(migratedLegacySaveField("progress.maps", "progress.districts"));
  }

  copyAliasedField(
    value,
    progress,
    normalizations,
    errors,
    "currentStageId",
    "currentRouteId",
    {
      legacyPath: "progress.currentStageId",
      targetPath: "progress.currentRouteId"
    }
  );
  copyAliasedField(
    value,
    progress,
    normalizations,
    errors,
    "selectedTacticId",
    "selectedRoutineId",
    {
      legacyPath: "progress.selectedTacticId",
      targetPath: "progress.selectedRoutineId"
    }
  );
  copyAliasedField(
    value,
    progress,
    normalizations,
    errors,
    "sect",
    "technoSect",
    {
      legacyPath: "progress.sect",
      targetPath: "progress.technoSect"
    }
  );

  delete progress.districts;
  delete progress.currentRouteId;
  delete progress.selectedRoutineId;
  delete progress.technoSect;

  return progress;
}

export function normalizeSaveFieldAliasesForRuntime(
  raw: UnknownRecord
): NormalizeSaveFieldAliasesResult {
  const normalizations: SaveNormalization[] = [];
  const errors: string[] = [];
  const save = { ...raw };

  save.progress = normalizeProgressForRuntime(
    raw.progress,
    normalizations,
    errors
  );

  copyAliasedField(
    raw,
    save,
    normalizations,
    errors,
    "selectedOfflineFarmStageId",
    "selectedOfflineFarmRouteId"
  );
  delete save.selectedOfflineFarmRouteId;

  if (raw.offlineFarmPreset !== undefined) {
    save.offlineFarmPreset = normalizeOfflineFarmPresetForRuntime(
      raw.offlineFarmPreset,
      normalizations
    );
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors
    };
  }

  return {
    ok: true,
    save,
    normalizations
  };
}

export function serializeSaveData(save: SaveData): UnknownRecord {
  return {
    version: save.version,
    progress: {
      resources: {
        credits: save.progress.resources.silver,
        resonance: save.progress.resources.cultivation,
        reagents: save.progress.resources.herbs
      },
      heroes: save.progress.heroes,
      technoSect: save.progress.sect,
      districts: Object.fromEntries(
        Object.entries(save.progress.maps).map(([districtId, progress]) => [
          districtId,
          {
            combatData: progress.combatExperience,
            highestClearedRouteIndex: progress.highestClearedStageIndex
          }
        ])
      ),
      selectedRoutineId: save.progress.selectedTacticId,
      activeHeroIds: save.progress.activeHeroIds,
      formation: save.progress.formation,
      styleMastery: save.progress.styleMastery,
      styleBranches: save.progress.styleBranches,
      skillUpgrades: save.progress.skillUpgrades,
      equipment: save.progress.equipment,
      medicineInventory: save.progress.medicineInventory,
      assignments: save.progress.assignments,
      currentRouteId: save.progress.currentStageId
    },
    autoMedicinePreferences: save.autoMedicinePreferences,
    selectedOfflineFarmRouteId: save.selectedOfflineFarmStageId,
    offlineFarmPreset: serializeOfflineFarmPreset(save.offlineFarmPreset),
    createdAtMs: save.createdAtMs,
    updatedAtMs: save.updatedAtMs,
    lastOfflineRewardAtMs: save.lastOfflineRewardAtMs
  };
}

export function attachSaveDataSerialization<T extends SaveData>(save: T): T {
  Object.defineProperty(save, "toJSON", {
    value: () => serializeSaveData(save),
    enumerable: false,
    configurable: true
  });

  return save;
}
