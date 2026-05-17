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
import { findDistrictAttentionBoundaryTokens } from "../helpers/districtAttentionBoundary";
import { staticData } from "../helpers/staticData";

describe("save schema factory", () => {
  it("creates a versioned save with progress, farm target, and timestamps", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.resources.credits = 42;
    progress.districts.greenline_approach.highestClearedRouteIndex = 1;

    const save = createSaveData({
      progress,
      selectedOfflineFarmRouteId: "greenline_approach_1",
      nowMs: 1000
    });

    expect(save.version).toBe(SAVE_DATA_VERSION);
    expect(save.progress.resources.credits).toBe(42);
    expect(save.progress.currentRouteId).toBe("greenline_approach_1");
    expect(save.progress.selectedRoutineId).toBe("balanced_routine");
    expect(save.autoMedicinePreferences).toEqual({
      enabled: true,
      battleCleanseEnabled: true,
      postBattleCleanseEnabled: true,
      preBattleResistanceEnabled: true,
      preBattleResistanceMode: "boss_and_elite",
      disabledMedicineIds: []
    });
    expect(save.selectedOfflineFarmRouteId).toBe("greenline_approach_1");
    expect(save.offlineFarmPreset).toBe("balanced");
    expect(save.createdAtMs).toBe(1000);
    expect(save.updatedAtMs).toBe(1000);
    expect(save.lastOfflineRewardAtMs).toBe(1000);

    progress.resources.credits = 999;

    expect(save.progress.resources.credits).toBe(42);
  });

  it("serializes current saves with Stage 2.7 field names", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.resources.credits = 42;
    progress.resources.resonance = 7;
    progress.resources.reagents = 3;
    progress.districts.greenline_approach.combatData = 11;
    progress.districts.greenline_approach.highestClearedRouteIndex = 2;
    progress.currentRouteId = "greenline_approach_2";
    const save = createSaveData({
      progress,
      selectedOfflineFarmRouteId: "greenline_approach_1",
      nowMs: 1000,
      offlineFarmPreset: "credits"
    });
    const serialized = JSON.parse(JSON.stringify(save));

    expect(serialized.progress.resources).toEqual({
      credits: 42,
      resonance: 7,
      reagents: 3
    });
    expect(serialized.progress.districts.greenline_approach).toEqual({
      combatData: 11,
      highestClearedRouteIndex: 2
    });
    expect(serialized.progress.currentRouteId).toBe("greenline_approach_2");
    expect(serialized.progress.selectedRoutineId).toBe("balanced_routine");
    expect(serialized.progress.technoSect).toEqual({ upgrades: {} });
    expect(serialized.selectedOfflineFarmRouteId).toBe("greenline_approach_1");
    expect(serialized.offlineFarmPreset).toBe("credits");
    expect(serialized.progress.resources.silver).toBeUndefined();
    expect(serialized.progress.maps).toBeUndefined();
    expect(serialized.progress.currentStageId).toBeUndefined();
    expect(serialized.selectedOfflineFarmStageId).toBeUndefined();
  });

  it("keeps report-only District Heat out of current save serialization", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.districts.greenline_approach.highestClearedRouteIndex = 8;
    const save = createSaveData({
      progress,
      selectedOfflineFarmRouteId: "greenline_approach_8",
      nowMs: 1000
    });
    const serialized = JSON.parse(JSON.stringify(save));
    const serializedText = JSON.stringify(serialized);

    expect(save.version).toBe(SAVE_DATA_VERSION);
    expect(findDistrictAttentionBoundaryTokens(save)).toEqual([]);
    expect(findDistrictAttentionBoundaryTokens(serialized)).toEqual([]);
    expect(findDistrictAttentionBoundaryTokens(serializedText)).toEqual([]);
  });

  it("preserves creation and offline reward timestamps when updating a save", () => {
    const progress = createInitialPlayerProgress(staticData);
    const save = createSaveData({
      progress,
      selectedOfflineFarmRouteId: null,
      nowMs: 5000,
      previousSave: {
        createdAtMs: 1000,
        lastOfflineRewardAtMs: 3000,
        offlineFarmPreset: "credits"
      }
    });

    expect(save.createdAtMs).toBe(1000);
    expect(save.updatedAtMs).toBe(5000);
    expect(save.lastOfflineRewardAtMs).toBe(3000);
    expect(save.offlineFarmPreset).toBe("credits");
  });

  it("parses valid save data into a cloned save", () => {
    const progress = createInitialPlayerProgress(staticData);
    const rawSave = createSaveData({
      progress,
      selectedOfflineFarmRouteId: null,
      nowMs: 1000
    });
    const result = parseSaveData(staticData, rawSave);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    rawSave.progress.resources.credits = 77;

    expect(result.save.progress.resources.credits).toBe(0);
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
        technoSect: {
          upgrades: {}
        },
        maps: {
          bamboo_road: {
            combatExperience: 12,
            highestClearedStageIndex: 1
          }
        },
        currentRouteId: "bamboo_road_2"
      },
      selectedOfflineFarmRouteId: "bamboo_road_1",
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
    expect(result.save.progress.resources.reagents).toBe(0);
    expect(result.save.progress.heroes.iron_fist_initiate.level).toBe(1);
    expect(result.save.progress.districts.veil_district).toMatchObject({
      combatData: 0,
      highestClearedRouteIndex: 0
    });
    expect(result.save.progress.currentRouteId).toBe("greenline_approach_2");
    expect(result.save.selectedOfflineFarmRouteId).toBe("greenline_approach_1");
    expect(result.save.progress.formation).toMatchObject({
      iron_fist_initiate: "front"
    });
    expect(result.save.progress.activeHeroIds).toEqual([...MVP_PLAYER_HERO_IDS]);
    expect(result.save.progress.selectedRoutineId).toBe("balanced_routine");
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
