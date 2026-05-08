import {
  createInitialPlayerProgress,
  createSaveData,
  SAVE_DATA_VERSION,
  SUPPORTED_SAVE_DATA_VERSIONS
} from "../../core";
import type {
  SaveData,
  StaticGameData,
  SupportedSaveDataVersion
} from "../../core";
import { stage12SaveFixture } from "./stage12Save";

export type SaveVersionFixture = {
  version: Exclude<SupportedSaveDataVersion, typeof SAVE_DATA_VERSION>;
  description: string;
  rawSave: unknown;
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
