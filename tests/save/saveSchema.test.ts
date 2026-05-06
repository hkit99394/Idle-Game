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
    expect(result.save.offlineFarmPreset).toBe("balanced");
    expect(result.save.progress.heroes.iron_fist_disciple.level).toBe(1);
    expect(result.save.progress.maps.mist_valley).toMatchObject({
      combatExperience: 0,
      highestClearedStageIndex: 0
    });
    expect(result.save.progress.formation).toMatchObject({
      iron_fist_disciple: "front"
    });
    expect(result.save.progress.activeHeroIds).toEqual([...MVP_PLAYER_HERO_IDS]);
    expect(result.save.progress.styleMastery).toEqual({});
    expect(result.save.progress.styleBranches).toEqual({});
    expect(result.save.progress.skillUpgrades).toEqual({});
    expect(result.save.progress.equipment).toEqual({
      inventory: {},
      equipped: {}
    });
    expect(result.save.progress.assignments).toEqual({});
  });

  it("migrates Stage 1.1 saves into Stage 1.2 defaults", () => {
    const progress = createInitialPlayerProgress(staticData);
    const stageOneOneSave = {
      ...createSaveData({
        progress,
        selectedOfflineFarmStageId: null,
        nowMs: 1000
      }),
      version: 3,
      progress: {
        ...progress,
        styleBranches: undefined,
        equipment: undefined,
        assignments: undefined
      }
    };

    const migration = migrateSaveData(staticData, stageOneOneSave);
    const result = parseSaveData(staticData, stageOneOneSave);

    expect(migration).toMatchObject({
      ok: true,
      fromVersion: 3,
      toVersion: SAVE_DATA_VERSION,
      migrated: true
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.save.version).toBe(SAVE_DATA_VERSION);
    expect(result.save.progress.activeHeroIds).toEqual([...MVP_PLAYER_HERO_IDS]);
    expect(result.save.progress.styleBranches).toEqual({});
    expect(result.save.progress.equipment).toEqual({
      inventory: {},
      equipped: {}
    });
    expect(result.save.progress.assignments).toEqual({});
  });

  it("accepts old saves without an offline farm preset and rejects invalid presets", () => {
    const progress = createInitialPlayerProgress(staticData);
    const save = createSaveData({
      progress,
      selectedOfflineFarmStageId: null,
      nowMs: 1000
    });
    const oldSave = {
      ...save,
      offlineFarmPreset: undefined
    };
    const badSave = {
      ...save,
      offlineFarmPreset: "best"
    };
    const result = parseSaveData(staticData, oldSave);

    expect(validateSaveData(staticData, oldSave)).toEqual([]);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.save.offlineFarmPreset).toBe("balanced");
    expect(validateSaveData(staticData, badSave)).toContain(
      "offlineFarmPreset must be a supported offline farm preset"
    );
  });

  it("fails safely for malformed saves", () => {
    const result = parseSaveData(staticData, {
      version: SAVE_DATA_VERSION,
      progress: null,
      selectedOfflineFarmStageId: 5,
      offlineFarmPreset: 5,
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
      "offlineFarmPreset must be a supported offline farm preset"
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

    expect(errors).toContain(
      `version must be a supported save version (1-${SAVE_DATA_VERSION})`
    );
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

  it("accepts old saves without active team and validates active hero ids", () => {
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
        activeHeroIds: undefined
      }
    };
    const missingHeroSave = {
      ...save,
      progress: {
        ...save.progress,
        activeHeroIds: ["missing_hero"]
      }
    };
    const lockedHeroSave = {
      ...save,
      progress: {
        ...save.progress,
        activeHeroIds: ["iron_fist_disciple", "lotus_mending_disciple"]
      }
    };
    const duplicateHeroSave = {
      ...save,
      progress: {
        ...save.progress,
        activeHeroIds: ["iron_fist_disciple", "iron_fist_disciple"]
      }
    };
    const tooLargeProgress = {
      ...save.progress,
      maps: {
        ...save.progress.maps,
        bamboo_road: {
          combatExperience: 0,
          highestClearedStageIndex: 10
        },
        mist_valley: {
          combatExperience: 0,
          highestClearedStageIndex: 10
        },
        black_iron_fort: {
          combatExperience: 0,
          highestClearedStageIndex: 10
        },
        lotus_monastery: {
          combatExperience: 0,
          highestClearedStageIndex: 3
        }
      },
      activeHeroIds: staticData.heroes.map((hero) => hero.id)
    };

    expect(validateSaveData(staticData, oldSave)).toEqual([]);
    expect(parseSaveData(staticData, oldSave)).toMatchObject({
      ok: true,
      save: {
        progress: {
          activeHeroIds: [...MVP_PLAYER_HERO_IDS]
        }
      }
    });
    expect(validateSaveData(staticData, missingHeroSave)).toContain(
      "progress.activeHeroIds.missing_hero must reference an existing hero"
    );
    expect(validateSaveData(staticData, lockedHeroSave)).toContain(
      "progress.activeHeroIds.lotus_mending_disciple must be unlocked by saved progress"
    );
    expect(validateSaveData(staticData, duplicateHeroSave)).toContain(
      "progress.activeHeroIds.iron_fist_disciple is duplicated"
    );
    expect(
      validateSaveData(staticData, {
        ...save,
        progress: tooLargeProgress
      })
    ).toContain("progress.activeHeroIds must contain 1-4 heroes");
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
        styleBranches: undefined,
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
        styleBranches: {
          missing_style: "iron_body_fist",
          fist: "iron_body_fist",
          palm: "iron_body_fist"
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
        "progress.styleBranches.missing_style must reference an existing style",
        "progress.styleBranches.fist must be unlocked by saved progress",
        "progress.styleBranches.palm must select a branch from style palm",
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

  it("accepts old saves without equipment and validates equipment progress", () => {
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
        equipment: undefined
      }
    };
    const badSave = {
      ...save,
      progress: {
        ...save.progress,
        equipment: {
          inventory: {
            missing_equipment: 1,
            training_wraps: 1.5
          },
          equipped: {
            missing_hero: {
              weapon: "training_wraps"
            },
            iron_fist_disciple: {
              trinket: "training_wraps",
              armor: "missing_equipment"
            }
          }
        }
      }
    };

    expect(validateSaveData(staticData, oldSave)).toEqual([]);
    expect(validateSaveData(staticData, badSave)).toEqual(
      expect.arrayContaining([
        "progress.equipment.inventory.missing_equipment must reference an existing equipment item",
        "progress.equipment.inventory.training_wraps must be an integer >= 0",
        "progress.equipment.equipped.missing_hero must reference an existing hero",
        "progress.equipment.equipped.iron_fist_disciple.trinket must be weapon, armor, manual, or medicine",
        "progress.equipment.equipped.iron_fist_disciple.armor must reference an existing equipment item"
      ])
    );
  });

  it("accepts old saves without assignments and validates assignment progress", () => {
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
        assignments: undefined
      }
    };
    const badSave = {
      ...save,
      progress: {
        ...save.progress,
        assignments: {
          missing_assignment: {
            heroIds: ["iron_fist_disciple"]
          },
          bamboo_road_patrol: {
            heroIds: ["missing_hero", "iron_fist_disciple"]
          },
          mist_valley_meditation: {
            heroIds: ["iron_fist_disciple"]
          }
        }
      }
    };

    expect(validateSaveData(staticData, oldSave)).toEqual([]);
    expect(validateSaveData(staticData, badSave)).toEqual(
      expect.arrayContaining([
        "progress.assignments.missing_assignment must reference an existing assignment",
        "progress.assignments.bamboo_road_patrol.heroIds.missing_hero must reference an existing hero",
        "progress.assignments.mist_valley_meditation.heroIds.iron_fist_disciple is already assigned",
        "progress.assignments.mist_valley_meditation.heroIds.iron_fist_disciple is not eligible",
        "progress.assignments.mist_valley_meditation must be unlocked by saved progress"
      ])
    );
  });
});
