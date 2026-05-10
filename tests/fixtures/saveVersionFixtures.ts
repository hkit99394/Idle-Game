import {
  createInitialPlayerProgress,
  createSaveData,
  SAVE_DATA_VERSION,
  SUPPORTED_SAVE_DATA_VERSIONS
} from "../../core";
import type {
  SaveData,
  SaveNormalization,
  StaticGameData,
  SupportedSaveDataVersion
} from "../../core";
import { stage12SaveFixture } from "./stage12Save";

export type SaveVersionFixture = {
  version: Exclude<SupportedSaveDataVersion, typeof SAVE_DATA_VERSION>;
  description: string;
  rawSave: unknown;
  expectedNormalizations: SaveNormalization[];
};

export function buildSaveVersionFixtures(
  data: StaticGameData
): SaveVersionFixture[] {
  const currentSave = createCurrentSaveFixture(data);

  return SUPPORTED_SAVE_DATA_VERSIONS.filter(
    (version): version is Exclude<SupportedSaveDataVersion, typeof SAVE_DATA_VERSION> =>
      version !== SAVE_DATA_VERSION
  ).map((version) => ({
    version,
    description: `version ${version}`,
    rawSave: createRawSaveForVersion(currentSave, version)
  })).map((fixture) => ({
    ...fixture,
    expectedNormalizations: getExpectedNormalizationsForRawSave(
      data,
      fixture.rawSave
    )
  }));
}

function createCurrentSaveFixture(data: StaticGameData): SaveData {
  const progress = createInitialPlayerProgress(data);
  progress.resources.silver = 100;
  progress.resources.cultivation = 25;
  progress.maps.bamboo_road.combatExperience = 12;
  progress.maps.bamboo_road.highestClearedStageIndex = 1;
  progress.currentStageId = "bamboo_road_2";

  return createSaveData({
    progress,
    selectedOfflineFarmStageId: "bamboo_road_1",
    nowMs: 2000
  });
}

function createRawSaveForVersion(
  currentSave: SaveData,
  version: SaveVersionFixture["version"]
): unknown {
  if (version === 1) {
    return createMvpSaveFixture(version);
  }

  if (version === 4) {
    return stage12SaveFixture;
  }

  const save = cloneAsMutable(currentSave) as Record<string, any>;
  save.version = version;

  if (version <= 2) {
    delete save.autoMedicinePreferences;
    delete save.offlineFarmPreset;
    delete save.progress.resources.herbs;
    delete save.progress.activeHeroIds;
    delete save.progress.formation;
    delete save.progress.styleMastery;
    delete save.progress.styleBranches;
    delete save.progress.skillUpgrades;
    delete save.progress.equipment;
    delete save.progress.assignments;
    const heroes = save.progress.heroes as Record<string, { upgrades: unknown }>;
    save.progress.heroes = Object.fromEntries(
      Object.entries(heroes).map(([heroId, progress]) => [
        heroId,
        {
          upgrades: progress.upgrades
        }
      ])
    );
    save.progress.maps = {
      bamboo_road: save.progress.maps.bamboo_road
    };
  } else if (version <= 3) {
    delete save.progress.styleBranches;
    delete save.progress.equipment;
    delete save.progress.assignments;
  } else if (version <= 5) {
    delete save.progress.resources.herbs;
  } else if (version <= 6) {
    delete save.progress.equipment;
  } else if (version <= 7) {
    delete save.progress.assignments;
  } else if (version <= 8) {
    delete save.autoMedicinePreferences;
  }

  return save;
}

function getExpectedNormalizationsForRawSave(
  data: StaticGameData,
  rawSave: unknown
): SaveNormalization[] {
  const normalizations: SaveNormalization[] = [];
  const defaultProgress = createInitialPlayerProgress(data);
  const raw = isFixtureRecord(rawSave) ? rawSave : {};
  const progress = isFixtureRecord(raw.progress) ? raw.progress : {};
  const resources = isFixtureRecord(progress.resources)
    ? progress.resources
    : {};
  const equipment = progress.equipment;
  const existingHeroes = isFixtureRecord(progress.heroes) ? progress.heroes : {};
  const existingMaps = isFixtureRecord(progress.maps) ? progress.maps : {};

  for (const [heroId, heroProgress] of Object.entries(existingHeroes)) {
    if (!isFixtureRecord(heroProgress)) {
      continue;
    }

    if (heroProgress.level === undefined) {
      normalizations.push(missingField(`progress.heroes.${heroId}.level`));
    }

    if (heroProgress.upgrades === undefined) {
      normalizations.push(missingField(`progress.heroes.${heroId}.upgrades`));
    }
  }

  for (const [regionId, mapProgress] of Object.entries(existingMaps)) {
    if (!isFixtureRecord(mapProgress)) {
      continue;
    }

    if (mapProgress.combatExperience === undefined) {
      normalizations.push(
        missingField(`progress.maps.${regionId}.combatExperience`)
      );
    }

    if (mapProgress.highestClearedStageIndex === undefined) {
      normalizations.push(
        missingField(`progress.maps.${regionId}.highestClearedStageIndex`)
      );
    }
  }

  if (resources.herbs === undefined) {
    normalizations.push(missingField("progress.resources.herbs"));
  }

  if (equipment === undefined) {
    normalizations.push(missingField("progress.equipment"));
  } else if (isFixtureRecord(equipment)) {
    if (equipment.inventory === undefined) {
      normalizations.push(missingField("progress.equipment.inventory"));
    }

    if (equipment.equipped === undefined) {
      normalizations.push(missingField("progress.equipment.equipped"));
    }
  }

  for (const heroId of Object.keys(defaultProgress.heroes)) {
    if (!(heroId in existingHeroes)) {
      normalizations.push(missingField(`progress.heroes.${heroId}`));
    }
  }

  for (const regionId of Object.keys(defaultProgress.maps)) {
    if (!(regionId in existingMaps)) {
      normalizations.push(missingField(`progress.maps.${regionId}`));
    }
  }

  for (const field of [
    "activeHeroIds",
    "formation",
    "styleMastery",
    "styleBranches",
    "skillUpgrades",
    "medicineInventory",
    "assignments"
  ] as const) {
    if (progress[field] === undefined) {
      normalizations.push(missingField(`progress.${field}`));
    }
  }

  normalizations.push(
    ...getExpectedAutoMedicinePreferenceNormalizations(raw.autoMedicinePreferences)
  );

  if (raw.selectedOfflineFarmStageId === undefined) {
    normalizations.push(missingField("selectedOfflineFarmStageId"));
  }

  if (raw.offlineFarmPreset === undefined) {
    normalizations.push(missingField("offlineFarmPreset"));
  }

  return normalizations;
}

function getExpectedAutoMedicinePreferenceNormalizations(
  value: unknown
): SaveNormalization[] {
  if (!isFixtureRecord(value)) {
    return [missingField("autoMedicinePreferences")];
  }

  const normalizations: SaveNormalization[] = [];

  if (value.preBattleResistanceMode === undefined) {
    normalizations.push(
      missingField("autoMedicinePreferences.preBattleResistanceMode")
    );
  } else if (typeof value.preBattleResistanceMode !== "string") {
    normalizations.push(
      invalidField("autoMedicinePreferences.preBattleResistanceMode")
    );
  }

  if (value.disabledMedicineIds === undefined) {
    normalizations.push(
      missingField("autoMedicinePreferences.disabledMedicineIds")
    );
  } else if (!Array.isArray(value.disabledMedicineIds)) {
    normalizations.push(
      invalidField("autoMedicinePreferences.disabledMedicineIds")
    );
  } else {
    const stringMedicineIds = value.disabledMedicineIds.filter(
      (medicineId): medicineId is string => typeof medicineId === "string"
    );

    if (stringMedicineIds.length !== value.disabledMedicineIds.length) {
      normalizations.push({
        field: "autoMedicinePreferences.disabledMedicineIds",
        reason: "removed non-string entries"
      });
    }

    if (new Set(stringMedicineIds).size !== stringMedicineIds.length) {
      normalizations.push({
        field: "autoMedicinePreferences.disabledMedicineIds",
        reason: "deduplicated entries"
      });
    }
  }

  for (const field of [
    "enabled",
    "battleCleanseEnabled",
    "postBattleCleanseEnabled",
    "preBattleResistanceEnabled"
  ] as const) {
    if (value[field] === undefined) {
      normalizations.push(missingField(`autoMedicinePreferences.${field}`));
    } else if (typeof value[field] !== "boolean") {
      normalizations.push(invalidField(`autoMedicinePreferences.${field}`));
    }
  }

  return normalizations;
}

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

function isFixtureRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createMvpSaveFixture(version: 1 | 2): unknown {
  return {
    version,
    progress: {
      resources: {
        silver: 100,
        cultivation: 25
      },
      heroes: {
        iron_fist_disciple: {
          upgrades: {}
        }
      },
      sect: {
        upgrades: {}
      },
      maps: {
        bamboo_road: {
          combatExperience: 12,
          highestClearedStageIndex: 1
        }
      },
      currentStageId: "bamboo_road_2"
    },
    selectedOfflineFarmStageId: "bamboo_road_1",
    createdAtMs: 1000,
    updatedAtMs: 2000,
    lastOfflineRewardAtMs: 2000
  };
}

function cloneAsMutable<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
