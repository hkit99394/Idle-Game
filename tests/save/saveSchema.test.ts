import { describe, expect, it } from "vitest";
import {
  createInitialPlayerProgress,
  createSaveData,
  parseSaveData,
  SAVE_DATA_VERSION,
  validateSaveData
} from "../../core";
import { staticData } from "../helpers/staticData";

describe("save schema", () => {
  it("creates a versioned save with progress, farm target, and timestamps", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.resources.silver = 42;
    progress.maps.bamboo_road.highestClearedStageIndex = 1;

    const save = createSaveData({
      progress,
      selectedOfflineFarmStageId: "bamboo_road_1",
      nowMs: 1000
    });

    expect(save.version).toBe(SAVE_DATA_VERSION);
    expect(save.progress.resources.silver).toBe(42);
    expect(save.progress.currentStageId).toBe("bamboo_road_1");
    expect(save.selectedOfflineFarmStageId).toBe("bamboo_road_1");
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
        lastOfflineRewardAtMs: 3000
      }
    });

    expect(save.createdAtMs).toBe(1000);
    expect(save.updatedAtMs).toBe(5000);
    expect(save.lastOfflineRewardAtMs).toBe(3000);
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

  it("fails safely for malformed saves", () => {
    const result = parseSaveData(staticData, {
      version: SAVE_DATA_VERSION,
      progress: null,
      selectedOfflineFarmStageId: 5,
      createdAtMs: 2000,
      updatedAtMs: 1000,
      lastOfflineRewardAtMs: -1
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.reason).toBe("invalid_save");
    expect(result.errors).toContain("progress must be an object");
    expect(result.errors).toContain(
      "selectedOfflineFarmStageId must be a string or null"
    );
    expect(result.errors).toContain(
      "updatedAtMs must be greater than or equal to createdAtMs"
    );
    expect(result.errors).toContain(
      "lastOfflineRewardAtMs must be a non-negative finite number"
    );
  });

  it("rejects unsupported versions and locked current stages", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.currentStageId = "bamboo_road_5";
    const save = {
      ...createSaveData({
        progress,
        selectedOfflineFarmStageId: null,
        nowMs: 1000
      }),
      version: 999
    };
    const errors = validateSaveData(staticData, save);

    expect(errors).toContain(`version must be ${SAVE_DATA_VERSION}`);
    expect(errors).toContain(
      "progress.currentStageId must be unlocked by saved progress"
    );
  });

  it("rejects saved hero levels below one", () => {
    const progress = createInitialPlayerProgress(staticData);
    const save = createSaveData({
      progress,
      selectedOfflineFarmStageId: null,
      nowMs: 1000
    });

    save.progress.heroes.iron_fist_disciple.level = 0;

    expect(validateSaveData(staticData, save)).toContain(
      "progress.heroes.iron_fist_disciple.level must be an integer >= 1"
    );
  });

  it("accepts old saves without formation and rejects invalid formation slots", () => {
    const progress = createInitialPlayerProgress(staticData);
    const save = createSaveData({
      progress,
      selectedOfflineFarmStageId: null,
      nowMs: 1000
    });
    const oldSave = {
      ...save,
      progress: {
        ...save.progress,
        formation: undefined
      }
    };
    const badSave = {
      ...save,
      progress: {
        ...save.progress,
        formation: {
          ...save.progress.formation,
          iron_fist_disciple: "left"
        }
      }
    };

    expect(validateSaveData(staticData, oldSave)).toEqual([]);
    expect(validateSaveData(staticData, badSave)).toContain(
      "progress.formation.iron_fist_disciple must be front, middle, or back"
    );
  });

  it("accepts old saves without martial growth fields and validates new fields", () => {
    const progress = createInitialPlayerProgress(staticData);
    const save = createSaveData({
      progress,
      selectedOfflineFarmStageId: null,
      nowMs: 1000
    });
    const oldSave = {
      ...save,
      progress: {
        ...save.progress,
        styleMastery: undefined,
        skillUpgrades: undefined
      }
    };
    const badSave = {
      ...save,
      progress: {
        ...save.progress,
        styleMastery: {
          missing_style: {
            experience: 1
          }
        },
        skillUpgrades: {
          missing_skill_upgrade: 1
        }
      }
    };

    expect(validateSaveData(staticData, oldSave)).toEqual([]);
    expect(validateSaveData(staticData, badSave)).toEqual(
      expect.arrayContaining([
        "progress.styleMastery.missing_style must reference an existing style",
        "progress.skillUpgrades.missing_skill_upgrade must reference an existing skill upgrade"
      ])
    );
  });

  it("accepts old saves created before newer regions existed", () => {
    const progress = createInitialPlayerProgress(staticData);
    const save = createSaveData({
      progress,
      selectedOfflineFarmStageId: null,
      nowMs: 1000
    });
    const oldSave = {
      ...save,
      progress: {
        ...save.progress,
        maps: {
          bamboo_road: save.progress.maps.bamboo_road
        }
      }
    };

    expect(validateSaveData(staticData, oldSave)).toEqual([]);
    expect(parseSaveData(staticData, oldSave).ok).toBe(true);
  });
});
