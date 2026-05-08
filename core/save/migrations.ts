import type { StaticGameData } from "../data";
import { createInitialPlayerProgress, DEFAULT_OFFLINE_FARM_PRESET } from "../progression";
import type { EquipmentProgress, HeroProgress, MapProgress, ResourceState } from "../progression";
import {
  MIN_SUPPORTED_SAVE_DATA_VERSION,
  SAVE_DATA_VERSION,
  type SaveMigrationData,
  type SaveMigrationResult
} from "./saveTypes";
import { normalizeAutoMedicinePreferences } from "./autoMedicinePreferences";
import { isRecord, isSupportedSaveDataVersion } from "./validationShared";

export function normalizeHeroProgressForMigration(value: unknown): HeroProgress | unknown {
  if (!isRecord(value)) {
    return value;
  }

  return {
    ...value,
    level: value.level === undefined ? 1 : value.level,
    upgrades: value.upgrades === undefined ? {} : value.upgrades
  };
}

export function normalizeMapProgressForMigration(value: unknown): MapProgress | unknown {
  if (!isRecord(value)) {
    return value;
  }

  return {
    ...value,
    combatExperience:
      value.combatExperience === undefined ? 0 : value.combatExperience,
    highestClearedStageIndex:
      value.highestClearedStageIndex === undefined
        ? 0
        : value.highestClearedStageIndex
  };
}

export function normalizeResourcesForMigration(value: unknown): ResourceState | unknown {
  if (!isRecord(value)) {
    return value;
  }

  return {
    ...value,
    herbs: value.herbs === undefined ? 0 : value.herbs
  };
}

export function normalizeEquipmentProgressForMigration(
  value: unknown
): EquipmentProgress | unknown {
  if (value === undefined) {
    return {
      inventory: {},
      equipped: {}
    };
  }

  if (!isRecord(value)) {
    return value;
  }

  return {
    ...value,
    inventory: value.inventory === undefined ? {} : value.inventory,
    equipped: value.equipped === undefined ? {} : value.equipped
  };
}

export function normalizeProgressForMigration(
  data: Pick<StaticGameData, "heroes" | "regions" | "stages">,
  value: unknown
): unknown {
  if (!isRecord(value)) {
    return value;
  }

  const defaultProgress = createInitialPlayerProgress(data);
  const existingHeroes = isRecord(value.heroes) ? value.heroes : {};
  const existingMaps = isRecord(value.maps) ? value.maps : {};

  return {
    ...value,
    resources: normalizeResourcesForMigration(value.resources),
    heroes: {
      ...defaultProgress.heroes,
      ...Object.fromEntries(
        Object.entries(existingHeroes).map(([heroId, progress]) => [
          heroId,
          normalizeHeroProgressForMigration(progress)
        ])
      )
    },
    sect: value.sect,
    maps: {
      ...defaultProgress.maps,
      ...Object.fromEntries(
        Object.entries(existingMaps).map(([regionId, progress]) => [
          regionId,
          normalizeMapProgressForMigration(progress)
        ])
      )
    },
    activeHeroIds: value.activeHeroIds ?? defaultProgress.activeHeroIds,
    formation: value.formation ?? defaultProgress.formation,
    styleMastery: value.styleMastery ?? {},
    styleBranches: value.styleBranches ?? {},
    skillUpgrades: value.skillUpgrades ?? {},
    equipment: normalizeEquipmentProgressForMigration(value.equipment),
    assignments: value.assignments ?? {},
    currentStageId: value.currentStageId
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

  const normalizedSave = {
    ...raw,
    version: SAVE_DATA_VERSION,
    progress: normalizeProgressForMigration(data, raw.progress),
    autoMedicinePreferences: normalizeAutoMedicinePreferences(
      raw.autoMedicinePreferences
    ),
    selectedOfflineFarmStageId:
      raw.selectedOfflineFarmStageId === undefined
        ? null
        : raw.selectedOfflineFarmStageId,
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
    migrated: raw.version !== SAVE_DATA_VERSION
  };
}
