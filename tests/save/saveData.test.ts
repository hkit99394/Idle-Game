import { describe, expect, it } from "vitest";
import {
  applyOfflineRewardsToSave,
  createInitialSaveData,
  diagnoseSaveData,
  parseSaveData,
  SAVE_DATA_VERSION,
  validateOfflineFarmTarget,
  validateSaveData
} from "../../core/save/saveData";
import type { SaveData } from "../../core/save/saveData";
import type { StaticGameData } from "../../core";
import assignments from "../../data/assignments.json" with { type: "json" };
import enemies from "../../data/enemies.json" with { type: "json" };
import equipment from "../../data/equipment.json" with { type: "json" };
import equipmentSets from "../../data/equipmentSets.json" with { type: "json" };
import formations from "../../data/formations.json" with { type: "json" };
import heroes from "../../data/heroes.json" with { type: "json" };
import medicines from "../../data/medicines.json" with { type: "json" };
import mastery from "../../data/mastery.json" with { type: "json" };
import regions from "../../data/regions.json" with { type: "json" };
import skillUpgrades from "../../data/skillUpgrades.json" with { type: "json" };
import skills from "../../data/skills.json" with { type: "json" };
import stages from "../../data/stages.json" with { type: "json" };
import statusEffects from "../../data/statusEffects.json" with { type: "json" };
import styles from "../../data/styles.json" with { type: "json" };
import upgrades from "../../data/upgrades.json" with { type: "json" };

const staticData: StaticGameData = {
  assignments: assignments as StaticGameData["assignments"],
  heroes: heroes as StaticGameData["heroes"],
  skills: skills as StaticGameData["skills"],
  enemies: enemies as StaticGameData["enemies"],
  equipment: equipment as StaticGameData["equipment"],
  equipmentSets: equipmentSets as StaticGameData["equipmentSets"],
  regions: regions as StaticGameData["regions"],
  stages: stages as StaticGameData["stages"],
  upgrades: upgrades as StaticGameData["upgrades"],
  skillUpgrades: skillUpgrades as StaticGameData["skillUpgrades"],
  mastery: mastery as StaticGameData["mastery"],
  formations: formations as StaticGameData["formations"],
  styles: styles as StaticGameData["styles"],
  statusEffects: statusEffects as StaticGameData["statusEffects"],
  medicines: medicines as StaticGameData["medicines"]
};

const offlineOptions = {
  estimatedClearTimeSeconds: 10,
  minimumClearTimeSeconds: 5,
  offlineCapSeconds: 8 * 60 * 60,
  offlineEfficiency: 1
};

describe("save data", () => {
  it("creates a current save with every configured map initialized", () => {
    const save = createInitialSaveData(staticData, 1000);

    expect(save.version).toBe(SAVE_DATA_VERSION);
    expect(Object.keys(save.progress.maps).sort()).toEqual([
      "bamboo_road",
      "demon_cult_outpost"
    ]);
    expect(save.progress.medicineInventory).toEqual({});
    expect(save.autoMedicinePreferences).toEqual({
      enabled: true,
      battleCleanseEnabled: true,
      postBattleCleanseEnabled: true,
      preBattleResistanceEnabled: true,
      disabledMedicineIds: []
    });
    expect(validateSaveData(staticData, save)).toEqual([]);
  });

  it("migrates Stage 1.3 saves into Stage 1.4 defaults", () => {
    const stage13Save = {
      version: 1,
      progress: {
        resources: {
          silver: 120,
          cultivation: 60
        },
        maps: {
          bamboo_road: {
            highestClearedStageIndex: 10,
            combatExperience: 188
          }
        }
      },
      selectedOfflineFarmStageId: "bamboo_road_8",
      createdAtMs: 1000,
      updatedAtMs: 2000,
      lastOfflineRewardAtMs: 2000
    };

    const result = parseSaveData(staticData, stage13Save);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.migrated).toBe(true);
    expect(result.save.version).toBe(SAVE_DATA_VERSION);
    expect(result.save.progress.resources).toEqual({
      silver: 120,
      cultivation: 60
    });
    expect(result.save.progress.maps.demon_cult_outpost).toEqual({
      highestClearedStageIndex: 0,
      combatExperience: 0
    });
    expect(result.save.progress.medicineInventory).toEqual({});
    expect(result.save.autoMedicinePreferences).toEqual({
      enabled: true,
      battleCleanseEnabled: true,
      postBattleCleanseEnabled: true,
      preBattleResistanceEnabled: true,
      disabledMedicineIds: []
    });
  });

  it("persists and validates auto medicine preferences", () => {
    const save: SaveData = {
      ...createInitialSaveData(staticData, 1000),
      autoMedicinePreferences: {
        enabled: true,
        battleCleanseEnabled: true,
        postBattleCleanseEnabled: false,
        preBattleResistanceEnabled: true,
        disabledMedicineIds: ["clear_heart_pill", "missing_medicine"]
      }
    };

    expect(diagnoseSaveData(staticData, save)).toContain(
      "autoMedicinePreferences.disabledMedicineIds.1 must reference an existing medicine"
    );

    const validSave: SaveData = {
      ...save,
      autoMedicinePreferences: {
        ...save.autoMedicinePreferences,
        disabledMedicineIds: ["clear_heart_pill"]
      }
    };
    const result = parseSaveData(staticData, validSave);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.save.autoMedicinePreferences).toEqual({
      enabled: true,
      battleCleanseEnabled: true,
      postBattleCleanseEnabled: false,
      preBattleResistanceEnabled: true,
      disabledMedicineIds: ["clear_heart_pill"]
    });
  });

  it("rejects unknown maps and impossible cleared stage counts", () => {
    const save = createInitialSaveData(staticData, 1000);
    const badSave: SaveData = {
      ...save,
      progress: {
        ...save.progress,
        maps: {
          ...save.progress.maps,
          missing_region: {
            highestClearedStageIndex: 1,
            combatExperience: 0
          },
          bamboo_road: {
            highestClearedStageIndex: 1.5,
            combatExperience: 0
          },
          demon_cult_outpost: {
            highestClearedStageIndex: 8,
            combatExperience: 0
          }
        }
      }
    };

    expect(diagnoseSaveData(staticData, badSave)).toEqual(
      expect.arrayContaining([
        "progress.maps.missing_region must reference an existing region",
        "progress.maps.bamboo_road.highestClearedStageIndex must be an integer between 0 and 10",
        "progress.maps.demon_cult_outpost.highestClearedStageIndex must be an integer between 0 and 7"
      ])
    );
  });

  it("validates selected offline farm targets as cleared non-boss farm stages", () => {
    const save = createInitialSaveData(staticData, 1000);
    const maps = {
      ...save.progress.maps,
      bamboo_road: {
        highestClearedStageIndex: 10,
        combatExperience: 0
      },
      demon_cult_outpost: {
        highestClearedStageIndex: 6,
        combatExperience: 0
      }
    };

    expect(
      validateOfflineFarmTarget(staticData, maps, "demon_cult_outpost_6")
    ).toEqual([]);
    expect(
      validateOfflineFarmTarget(staticData, maps, "demon_cult_outpost_7")
    ).toContain(
      "selectedOfflineFarmStageId demon_cult_outpost_7 must be cleared, non-boss, and farmable"
    );
  });

  it("applies Demon Cult offline rewards once and advances the timestamp guard", () => {
    const save: SaveData = {
      ...createInitialSaveData(staticData, 0),
      progress: {
        resources: {
          silver: 0,
          cultivation: 0
        },
        medicineInventory: {},
        maps: {
          bamboo_road: {
            highestClearedStageIndex: 10,
            combatExperience: 0
          },
          demon_cult_outpost: {
            highestClearedStageIndex: 6,
            combatExperience: 0
          }
        }
      },
      selectedOfflineFarmStageId: "demon_cult_outpost_6"
    };

    const firstApply = applyOfflineRewardsToSave(
      staticData,
      save,
      60_000,
      offlineOptions
    );

    expect(firstApply.ok).toBe(true);
    if (!firstApply.ok) {
      return;
    }
    expect(firstApply.summary).toMatchObject({
      stageId: "demon_cult_outpost_6",
      clears: 6,
      silver: 1872,
      cultivation: 936,
      combatExperience: 1320
    });
    expect(firstApply.save.lastOfflineRewardAtMs).toBe(60_000);
    expect(firstApply.save.updatedAtMs).toBe(60_000);
    expect(
      firstApply.save.progress.maps.demon_cult_outpost.highestClearedStageIndex
    ).toBe(6);

    const secondApply = applyOfflineRewardsToSave(
      staticData,
      firstApply.save,
      60_000,
      offlineOptions
    );

    expect(secondApply.ok).toBe(true);
    if (!secondApply.ok) {
      return;
    }
    expect(secondApply.summary.clears).toBe(0);
    expect(secondApply.save.progress.resources).toEqual(
      firstApply.save.progress.resources
    );
    expect(secondApply.save.progress.maps.demon_cult_outpost).toEqual(
      firstApply.save.progress.maps.demon_cult_outpost
    );
  });
});
