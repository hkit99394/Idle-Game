import type { StaticGameData } from "../data";
import {
  getLegacyRegionId,
  normalizeRegionId,
  normalizeRegionMapKeys,
  normalizeStageId
} from "../compatibility";
import {
  createInitialPlayerProgress,
  DEFAULT_OFFLINE_FARM_PRESET,
  normalizeSelectedTacticId
} from "../progression";
import type { EquipmentProgress, HeroProgress, MapProgress, ResourceState } from "../progression";
import {
  MIN_SUPPORTED_SAVE_DATA_VERSION,
  SAVE_DATA_VERSION,
  type SaveMigrationData,
  type SaveMigrationResult,
  type SaveNormalization
} from "./saveTypes";
import { normalizeAutoMedicinePreferencesWithChanges } from "./autoMedicinePreferences";
import { isRecord, isSupportedSaveDataVersion } from "./validationShared";

type NormalizationResult<T> = {
  value: T;
  normalizations: SaveNormalization[];
};

function missingField(field: string): SaveNormalization {
  return {
    field,
    reason: "defaulted missing field"
  };
}

function invalidField(field: string): SaveNormalization {
  return {
    field,
    reason: "defaulted invalid field"
  };
}

function migratedRegionId(field: string): SaveNormalization {
  return {
    field,
    reason: "migrated legacy region id"
  };
}

function migratedStageId(field: string): SaveNormalization {
  return {
    field,
    reason: "migrated legacy stage id"
  };
}

export function normalizeHeroProgressForMigration(
  value: unknown,
  path = "progress.heroes.*"
): NormalizationResult<HeroProgress | unknown> {
  if (!isRecord(value)) {
    return {
      value,
      normalizations: []
    };
  }

  const normalizations: SaveNormalization[] = [];

  if (value.level === undefined) {
    normalizations.push(missingField(`${path}.level`));
  }

  if (value.upgrades === undefined) {
    normalizations.push(missingField(`${path}.upgrades`));
  }

  return {
    value: {
      ...value,
      level: value.level === undefined ? 1 : value.level,
      upgrades: value.upgrades === undefined ? {} : value.upgrades
    },
    normalizations
  };
}

export function normalizeMapProgressForMigration(
  value: unknown,
  path = "progress.maps.*"
): NormalizationResult<MapProgress | unknown> {
  if (!isRecord(value)) {
    return {
      value,
      normalizations: []
    };
  }

  const normalizations: SaveNormalization[] = [];

  if (value.combatExperience === undefined) {
    normalizations.push(missingField(`${path}.combatExperience`));
  }

  if (value.highestClearedStageIndex === undefined) {
    normalizations.push(missingField(`${path}.highestClearedStageIndex`));
  }

  return {
    value: {
      ...value,
      combatExperience:
        value.combatExperience === undefined ? 0 : value.combatExperience,
      highestClearedStageIndex:
        value.highestClearedStageIndex === undefined
          ? 0
          : value.highestClearedStageIndex
    },
    normalizations
  };
}

export function normalizeResourcesForMigration(
  value: unknown,
  path = "progress.resources"
): NormalizationResult<ResourceState | unknown> {
  if (!isRecord(value)) {
    return {
      value,
      normalizations: []
    };
  }

  const normalizations =
    value.herbs === undefined ? [missingField(`${path}.herbs`)] : [];

  return {
    value: {
      ...value,
      herbs: value.herbs === undefined ? 0 : value.herbs
    },
    normalizations
  };
}

export function normalizeEquipmentProgressForMigration(
  value: unknown,
  path = "progress.equipment"
): NormalizationResult<EquipmentProgress | unknown> {
  if (value === undefined) {
    return {
      value: {
        inventory: {},
        equipped: {}
      },
      normalizations: [missingField(path)]
    };
  }

  if (!isRecord(value)) {
    return {
      value,
      normalizations: []
    };
  }

  const normalizations: SaveNormalization[] = [];

  if (value.inventory === undefined) {
    normalizations.push(missingField(`${path}.inventory`));
  }

  if (value.equipped === undefined) {
    normalizations.push(missingField(`${path}.equipped`));
  }

  return {
    value: {
      ...value,
      inventory: value.inventory === undefined ? {} : value.inventory,
      equipped: value.equipped === undefined ? {} : value.equipped
    },
    normalizations
  };
}

export function normalizeProgressForMigration(
  data: Pick<StaticGameData, "heroes" | "regions" | "stages" | "tactics">,
  value: unknown,
  options: { migrateRegionStageIds?: boolean } = {}
): NormalizationResult<unknown> {
  if (!isRecord(value)) {
    return {
      value,
      normalizations: []
    };
  }

  const defaultProgress = createInitialPlayerProgress(data);
  const existingMaps = isRecord(value.maps) ? value.maps : {};
  const shouldMigrateRegionStageIds = options.migrateRegionStageIds === true;
  const usesCanonicalRegionIds =
    shouldMigrateRegionStageIds ||
    Object.keys(existingMaps).some(
      (regionId) => getLegacyRegionId(regionId) !== regionId
    );
  const defaultMaps = usesCanonicalRegionIds
    ? normalizeRegionMapKeys(defaultProgress.maps).map
    : defaultProgress.maps;
  const existingHeroes = isRecord(value.heroes) ? value.heroes : {};
  const normalizations: SaveNormalization[] = [];
  const resources = normalizeResourcesForMigration(value.resources);
  const equipment = normalizeEquipmentProgressForMigration(value.equipment);
  const heroes = Object.fromEntries(
    Object.entries(existingHeroes).map(([heroId, progress]) => {
      const normalized = normalizeHeroProgressForMigration(
        progress,
        `progress.heroes.${heroId}`
      );
      normalizations.push(...normalized.normalizations);

      return [heroId, normalized.value];
    })
  );
  const maps: Record<string, unknown> = {};
  const deferredLegacyMaps: Array<readonly [string, unknown]> = [];

  for (const [regionId, progress] of Object.entries(existingMaps)) {
    const normalized = normalizeMapProgressForMigration(
      progress,
      `progress.maps.${regionId}`
    );
    normalizations.push(...normalized.normalizations);

    if (
      shouldMigrateRegionStageIds &&
      normalizeRegionId(regionId) !== regionId
    ) {
      deferredLegacyMaps.push([regionId, normalized.value]);
      continue;
    }

    maps[regionId] = normalized.value;
  }

  for (const [legacyRegionId, progress] of deferredLegacyMaps) {
    const targetRegionId = normalizeRegionId(legacyRegionId);
    normalizations.push(migratedRegionId(`progress.maps.${legacyRegionId}`));

    if (!Object.hasOwn(maps, targetRegionId)) {
      maps[targetRegionId] = progress;
    }
  }

  normalizations.push(...resources.normalizations, ...equipment.normalizations);

  const selectedTacticId = normalizeSelectedTacticId(
    data,
    value.selectedTacticId
  );

  if (value.selectedTacticId === undefined) {
    normalizations.push(missingField("progress.selectedTacticId"));
  } else if (value.selectedTacticId !== selectedTacticId) {
    normalizations.push(invalidField("progress.selectedTacticId"));
  }

  for (const heroId of Object.keys(defaultProgress.heroes)) {
    if (!(heroId in existingHeroes)) {
      normalizations.push(missingField(`progress.heroes.${heroId}`));
    }
  }

  for (const regionId of Object.keys(defaultMaps)) {
    if (!(regionId in maps)) {
      normalizations.push(missingField(`progress.maps.${regionId}`));
    }
  }

  const defaultedTopLevelFields = [
    "activeHeroIds",
    "formation",
    "styleMastery",
    "styleBranches",
    "skillUpgrades",
    "medicineInventory",
    "assignments"
  ] as const;

  for (const field of defaultedTopLevelFields) {
    if (value[field] === undefined) {
      normalizations.push(missingField(`progress.${field}`));
    }
  }

  const currentStageId =
    shouldMigrateRegionStageIds && typeof value.currentStageId === "string"
      ? normalizeStageId(value.currentStageId)
      : value.currentStageId;

  if (
    shouldMigrateRegionStageIds &&
    typeof value.currentStageId === "string" &&
    currentStageId !== value.currentStageId
  ) {
    normalizations.push(migratedStageId("progress.currentStageId"));
  }

  return {
    value: {
      ...value,
      resources: resources.value,
      heroes: {
        ...defaultProgress.heroes,
        ...heroes
      },
      sect: value.sect,
      maps: {
        ...defaultMaps,
        ...maps
      },
      selectedTacticId,
      activeHeroIds: value.activeHeroIds ?? defaultProgress.activeHeroIds,
      formation: value.formation ?? defaultProgress.formation,
      styleMastery: value.styleMastery ?? {},
      styleBranches: value.styleBranches ?? {},
      skillUpgrades: value.skillUpgrades ?? {},
      equipment: equipment.value,
      medicineInventory: value.medicineInventory ?? {},
      assignments: value.assignments ?? {},
      currentStageId
    },
    normalizations
  };
}

export function migrateSaveData(
  data: SaveMigrationData,
  raw: unknown
): SaveMigrationResult {
  if (!isRecord(raw)) {
    return {
      ok: false,
      errors: ["save must be an object"]
    };
  }

  if (!isSupportedSaveDataVersion(raw.version)) {
    return {
      ok: false,
      errors: [
        `version must be a supported save version (${MIN_SUPPORTED_SAVE_DATA_VERSION}-${SAVE_DATA_VERSION})`
      ]
    };
  }

  const shouldNormalizeRegionStageIds = true;
  const progress = normalizeProgressForMigration(data, raw.progress, {
    migrateRegionStageIds: shouldNormalizeRegionStageIds
  });
  const autoMedicinePreferences = normalizeAutoMedicinePreferencesWithChanges(
    raw.autoMedicinePreferences
  );
  const normalizations: SaveNormalization[] = [...progress.normalizations];

  normalizations.push(...autoMedicinePreferences.normalizations);

  if (raw.selectedOfflineFarmStageId === undefined) {
    normalizations.push(missingField("selectedOfflineFarmStageId"));
  }

  if (raw.offlineFarmPreset === undefined) {
    normalizations.push(missingField("offlineFarmPreset"));
  }

  const selectedOfflineFarmStageId =
    raw.selectedOfflineFarmStageId === undefined
      ? null
      : raw.selectedOfflineFarmStageId;
  const normalizedSelectedOfflineFarmStageId =
    shouldNormalizeRegionStageIds && typeof selectedOfflineFarmStageId === "string"
      ? normalizeStageId(selectedOfflineFarmStageId)
      : selectedOfflineFarmStageId;

  if (
    shouldNormalizeRegionStageIds &&
    typeof selectedOfflineFarmStageId === "string" &&
    normalizedSelectedOfflineFarmStageId !== selectedOfflineFarmStageId
  ) {
    normalizations.push(migratedStageId("selectedOfflineFarmStageId"));
  }

  const normalizedSave = {
    ...raw,
    version: SAVE_DATA_VERSION,
    progress: progress.value,
    autoMedicinePreferences: autoMedicinePreferences.value,
    selectedOfflineFarmStageId: normalizedSelectedOfflineFarmStageId,
    offlineFarmPreset:
      raw.offlineFarmPreset === undefined
        ? DEFAULT_OFFLINE_FARM_PRESET
        : raw.offlineFarmPreset
  };

  return {
    ok: true,
    save: normalizedSave,
    fromVersion: raw.version,
    toVersion: SAVE_DATA_VERSION,
    migrated: raw.version !== SAVE_DATA_VERSION,
    normalized: normalizations.length > 0,
    normalizations
  };
}
