import { describe, expect, it } from "vitest";
import {
  createInitialPlayerProgress,
  createSaveData,
  migrateSaveData,
  MVP_PLAYER_HERO_IDS,
  parseSaveData,
  SAVE_DATA_VERSION,
  validateSaveData
} from "../../core";
import { stage12SaveFixture } from "../fixtures/stage12Save";
import { staticData } from "../helpers/staticData";

describe("save schema factory", () => {
  it("creates a versioned save with progress, farm target, and timestamps", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.resources.silver = 42;
    progress.maps.greenline_approach.highestClearedStageIndex = 1;

    const save = createSaveData({
      progress,
      selectedOfflineFarmStageId: "greenline_approach_1",
      nowMs: 1000
    });

    expect(save.version).toBe(SAVE_DATA_VERSION);
    expect(save.progress.resources.silver).toBe(42);
    expect(save.progress.currentStageId).toBe("greenline_approach_1");
    expect(save.progress.selectedTacticId).toBe("balanced");
    expect(save.autoMedicinePreferences).toEqual({
      enabled: true,
      battleCleanseEnabled: true,
      postBattleCleanseEnabled: true,
      preBattleResistanceEnabled: true,
      preBattleResistanceMode: "boss_and_elite",
      disabledMedicineIds: []
    });
    expect(save.selectedOfflineFarmStageId).toBe("greenline_approach_1");
    expect(save.offlineFarmPreset).toBe("balanced");
    expect(save.createdAtMs).toBe(1000);
    expect(save.updatedAtMs).toBe(1000);
    expect(save.lastOfflineRewardAtMs).toBe(1000);

    progress.resources.silver = 999;

    expect(save.progress.resources.silver).toBe(42);
  });

  it("preserves creation and offline reward timestamps when updating a save", () => {
    const progress = createInitialPlayerProgress(staticData);
    const save = createSaveData({
      progress,
      selectedOfflineFarmStageId: null,
      nowMs: 5000,
      previousSave: {
        createdAtMs: 1000,
        lastOfflineRewardAtMs: 3000,
        offlineFarmPreset: "silver"
      }
    });

    expect(save.createdAtMs).toBe(1000);
    expect(save.updatedAtMs).toBe(5000);
    expect(save.lastOfflineRewardAtMs).toBe(3000);
    expect(save.offlineFarmPreset).toBe("silver");
  });

  it("parses valid save data into a cloned save", () => {
    const progress = createInitialPlayerProgress(staticData);
    const rawSave = createSaveData({
      progress,
      selectedOfflineFarmStageId: null,
      nowMs: 1000
    });
    const result = parseSaveData(staticData, rawSave);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    rawSave.progress.resources.silver = 77;

    expect(result.save.progress.resources.silver).toBe(0);
    expect(result.save).not.toBe(rawSave);
  });

  it("migrates MVP save data into the current schema with new defaults", () => {
    const mvpSave = {
      version: 1,
      progress: {
        resources: {
          silver: 100,
          cultivation: 25
        },
        heroes: Object.fromEntries(
          staticData.heroes.map((hero) => [hero.id, { upgrades: {} }])
        ),
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

    const migration = migrateSaveData(staticData, mvpSave);
    const result = parseSaveData(staticData, mvpSave);

    expect(migration).toMatchObject({
      ok: true,
      fromVersion: 1,
      toVersion: SAVE_DATA_VERSION,
      migrated: true
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.save.version).toBe(SAVE_DATA_VERSION);
    expect(result.save.autoMedicinePreferences).toEqual({
      enabled: true,
      battleCleanseEnabled: true,
      postBattleCleanseEnabled: true,
      preBattleResistanceEnabled: true,
      preBattleResistanceMode: "boss_and_elite",
      disabledMedicineIds: []
    });
    expect(result.save.offlineFarmPreset).toBe("balanced");
    expect(result.save.progress.resources.herbs).toBe(0);
    expect(result.save.progress.heroes.iron_fist_initiate.level).toBe(1);
    expect(result.save.progress.maps.veil_district).toMatchObject({
      combatExperience: 0,
      highestClearedStageIndex: 0
    });
    expect(result.save.progress.currentStageId).toBe("greenline_approach_2");
    expect(result.save.selectedOfflineFarmStageId).toBe("greenline_approach_1");
    expect(result.save.progress.formation).toMatchObject({
      iron_fist_initiate: "front"
    });
    expect(result.save.progress.activeHeroIds).toEqual([...MVP_PLAYER_HERO_IDS]);
    expect(result.save.progress.selectedTacticId).toBe("balanced");
    expect(result.save.progress.styleMastery).toEqual({});
    expect(result.save.progress.styleBranches).toEqual({});
    expect(result.save.progress.skillUpgrades).toEqual({});
    expect(result.save.progress.equipment).toEqual({
      inventory: {},
      equipped: {}
    });
    expect(result.save.progress.assignments).toEqual({});
  });
});
