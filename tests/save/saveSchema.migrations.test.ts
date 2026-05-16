import { describe, expect, it } from "vitest";
import {
  createInitialPlayerProgress,
  createSaveData,
  migrateSaveData,
  MVP_PLAYER_HERO_IDS,
  parseSaveData,
  SAVE_DATA_VERSION,
  SUPPORTED_SAVE_DATA_VERSIONS,
  validateSaveData
} from "../../core";
import { buildSaveVersionFixtures } from "../fixtures/saveVersionFixtures";
import { stage12SaveFixture } from "../fixtures/stage12Save";
import { staticData } from "../helpers/staticData";

describe("save schema migrations", () => {
  it("has one migration fixture for every supported legacy save version", () => {
    const fixtureVersions = buildSaveVersionFixtures(staticData).map(
      (fixture) => fixture.version
    );
    const legacyVersions = SUPPORTED_SAVE_DATA_VERSIONS.filter(
      (version) => version !== SAVE_DATA_VERSION
    );

    expect(fixtureVersions).toEqual(legacyVersions);
    expect(new Set(fixtureVersions).size).toBe(fixtureVersions.length);
  });

  it("migrates every supported legacy save fixture through the current schema", () => {
    for (const fixture of buildSaveVersionFixtures(staticData)) {
      const migration = migrateSaveData(staticData, fixture.rawSave);
      const result = parseSaveData(staticData, fixture.rawSave);

      expect(migration, fixture.description).toMatchObject({
        ok: true,
        fromVersion: fixture.version,
        toVersion: SAVE_DATA_VERSION,
        migrated: true,
        normalized: fixture.expectedNormalizations.length > 0
      });
      expect(migration.ok && migration.normalizations, fixture.description).toEqual(
        fixture.expectedNormalizations
      );
      expect(validateSaveData(staticData, fixture.rawSave), fixture.description).toEqual(
        []
      );
      expect(result.ok, fixture.description).toBe(true);
      if (!result.ok) {
        continue;
      }

      expect(result.save.version, fixture.description).toBe(SAVE_DATA_VERSION);
      expect(result.save.updatedAtMs, fixture.description).toBeGreaterThanOrEqual(
        result.save.createdAtMs
      );
      expect(
        result.save.lastOfflineRewardAtMs,
        fixture.description
      ).toBeGreaterThanOrEqual(result.save.createdAtMs);
      expect(result.save.offlineFarmPreset, fixture.description).toBe("balanced");
      expect(result.save.progress.selectedTacticId, fixture.description).toBe(
        "balanced_routine"
      );
      expect(result.save.autoMedicinePreferences.preBattleResistanceMode).toBe(
        "boss_and_elite"
      );
      expect(
        result.save.progress.resources.herbs,
        fixture.description
      ).toBeGreaterThanOrEqual(0);
      expect(result.save.progress.equipment, fixture.description).toMatchObject({
        inventory: expect.any(Object),
        equipped: expect.any(Object)
      });
      expect(result.save.progress.assignments, fixture.description).toEqual(
        expect.any(Object)
      );
      expect(result.migration.normalizations, fixture.description).toEqual(
        fixture.expectedNormalizations
      );
    }
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

  it("migrates a Stage 1.2 save fixture into Stage 1.3 defaults", () => {
    const migration = migrateSaveData(staticData, stage12SaveFixture);
    const result = parseSaveData(staticData, stage12SaveFixture);

    expect(migration).toMatchObject({
      ok: true,
      fromVersion: 4,
      toVersion: SAVE_DATA_VERSION,
      migrated: true
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.save.version).toBe(SAVE_DATA_VERSION);
    expect(result.save.progress.resources).toMatchObject({
      silver: 2400,
      cultivation: 950,
      herbs: 0
    });
    expect(result.save.progress.heroes.lotus_stabilizer).toEqual({
      level: 1,
      upgrades: {}
    });
    expect(result.save.progress.maps.lotus_clinic).toEqual({
      combatExperience: 0,
      highestClearedStageIndex: 0
    });
    expect(result.save.progress.activeHeroIds).toEqual([
      "iron_fist_initiate",
      "azure_pulse_monk",
      "white_crane_edge_runner",
      "mountain_brace_guardian"
    ]);
    expect(result.save.progress.activeHeroIds).not.toContain(
      "lotus_stabilizer"
    );
    expect(result.save.progress.equipment?.inventory).toMatchObject({
      tempered_context_stim: 1
    });
    expect(
      result.save.progress.equipment?.inventory.lotus_dew_countermeasure
    ).toBeUndefined();
    expect(
      result.save.progress.assignments?.lotus_countermeasure_pavilion
    ).toBeUndefined();
    expect(result.save.selectedOfflineFarmStageId).toBe("black_iron_foundry_6");
  });

  it("migrates legacy region map keys and stage ids to Path of Neon ids", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.maps.greenline_approach = {
      combatExperience: 40,
      highestClearedStageIndex: 2
    };
    const save = {
      ...createSaveData({
        progress: {
          ...progress,
          maps: {
            bamboo_road: progress.maps.greenline_approach
          },
          currentStageId: "bamboo_road_3"
        },
        selectedOfflineFarmStageId: "bamboo_road_1",
        nowMs: 1000
      }),
      version: 10
    };
    const result = parseSaveData(staticData, save);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.save.version).toBe(SAVE_DATA_VERSION);
    expect(result.save.progress.maps.greenline_approach).toEqual({
      combatExperience: 40,
      highestClearedStageIndex: 2
    });
    expect(result.save.progress.maps.bamboo_road).toBeUndefined();
    expect(result.save.progress.currentStageId).toBe("greenline_approach_3");
    expect(result.save.selectedOfflineFarmStageId).toBe("greenline_approach_1");
    expect(result.migration.normalizations).toEqual(
      expect.arrayContaining([
        {
          field: "progress.maps.bamboo_road",
          reason: "migrated legacy region id"
        },
        {
          field: "progress.currentStageId",
          reason: "migrated legacy stage id"
        },
        {
          field: "selectedOfflineFarmStageId",
          reason: "migrated legacy stage id"
        }
      ])
    );
  });

  it("normalizes legacy region and stage ids even when a save is already current version", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.maps.greenline_approach = {
      combatExperience: 44,
      highestClearedStageIndex: 2
    };
    const save = createSaveData({
      progress: {
        ...progress,
        maps: {
          bamboo_road: progress.maps.greenline_approach
        },
        currentStageId: "bamboo_road_3"
      },
      selectedOfflineFarmStageId: "bamboo_road_2",
      nowMs: 1000
    });
    const result = parseSaveData(staticData, save);

    expect(save.version).toBe(SAVE_DATA_VERSION);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.save.version).toBe(SAVE_DATA_VERSION);
    expect(result.save.progress.maps.greenline_approach).toEqual({
      combatExperience: 44,
      highestClearedStageIndex: 2
    });
    expect(result.save.progress.maps.bamboo_road).toBeUndefined();
    expect(result.save.progress.currentStageId).toBe("greenline_approach_3");
    expect(result.save.selectedOfflineFarmStageId).toBe("greenline_approach_2");
    expect(result.migration.migrated).toBe(false);
    expect(result.migration.normalized).toBe(true);
    expect(result.migration.normalizations).toEqual(
      expect.arrayContaining([
        {
          field: "progress.maps.bamboo_road",
          reason: "migrated legacy region id"
        },
        {
          field: "progress.currentStageId",
          reason: "migrated legacy stage id"
        },
        {
          field: "selectedOfflineFarmStageId",
          reason: "migrated legacy stage id"
        }
      ])
    );
  });

  it("normalizes content alias ids to the currently configured static id side", () => {
    const progress = createInitialPlayerProgress(staticData);
    const save = createSaveData({
      progress: {
        ...progress,
        heroes: {
          iron_fist_disciple: {
            level: 3,
            upgrades: {}
          },
          azure_palm_monk: {
            level: 1,
            upgrades: {}
          }
        },
        activeHeroIds: [
          "iron_fist_disciple",
          "iron_fist_initiate",
          "azure_palm_monk"
        ],
        formation: {
          iron_fist_disciple: "front",
          azure_palm_monk: "middle"
        },
        styleMastery: {
          fist: {
            experience: 300
          }
        },
        styleBranches: {
          fist: "iron_body_fist"
        },
        skillUpgrades: {
          iron_fist_combo_refinement: 2
        },
        equipment: {
          inventory: {
            impact_training_wraps: 1
          },
          equipped: {
            iron_fist_initiate: {
              weapon: "impact_training_wraps"
            }
          }
        },
        medicineInventory: {
          clear_heart_countermeasure: 2
        },
        assignments: {
          greenline_sweep: {
            heroIds: ["iron_fist_disciple", "iron_fist_initiate"]
          }
        },
        selectedTacticId: "kinetic_crush"
      },
      autoMedicinePreferences: {
        enabled: true,
        battleCleanseEnabled: true,
        postBattleCleanseEnabled: true,
        preBattleResistanceEnabled: true,
        preBattleResistanceMode: "boss_and_elite",
        disabledMedicineIds: ["clear_heart_pill", "clear_heart_countermeasure"]
      },
      selectedOfflineFarmStageId: null,
      nowMs: 1000
    });
    const result = parseSaveData(staticData, save);

    expect(save.version).toBe(SAVE_DATA_VERSION);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.save.progress.heroes.iron_fist_initiate).toEqual({
      level: 3,
      upgrades: {}
    });
    expect(result.save.progress.heroes.iron_fist_disciple).toBeUndefined();
    expect(result.save.progress.activeHeroIds).toEqual([
      "iron_fist_initiate",
      "azure_pulse_monk"
    ]);
    expect(result.save.progress.formation).toMatchObject({
      iron_fist_initiate: "front",
      azure_pulse_monk: "middle"
    });
    expect(result.save.progress.styleMastery).toEqual({
      impact: {
        experience: 300
      }
    });
    expect(result.save.progress.styleBranches).toEqual({
      impact: "iron_body_impact"
    });
    expect(result.save.progress.skillUpgrades).toEqual({
      impact_combo_refinement: 2
    });
    expect(result.save.progress.equipment).toEqual({
      inventory: {
        impact_training_wraps: 1
      },
      equipped: {
        iron_fist_initiate: {
          weapon: "impact_training_wraps"
        }
      }
    });
    expect(result.save.progress.medicineInventory).toEqual({
      clear_heart_countermeasure: 2
    });
    expect(result.save.progress.assignments).toEqual({
      greenline_sweep: {
        heroIds: ["iron_fist_initiate"]
      }
    });
    expect(result.save.progress.selectedTacticId).toBe("kinetic_crush");
    expect(result.save.autoMedicinePreferences.disabledMedicineIds).toEqual([
      "clear_heart_countermeasure"
    ]);
    expect(result.migration.migrated).toBe(false);
    expect(result.migration.normalized).toBe(true);
    expect(result.migration.normalizations).toEqual(
      expect.arrayContaining([
        {
          field: "progress.heroes.iron_fist_disciple",
          reason: "normalized content id alias"
        },
        {
          field: "progress.activeHeroIds.0",
          reason: "normalized content id alias"
        },
        {
          field: "progress.activeHeroIds.2",
          reason: "normalized content id alias"
        },
        {
          field: "autoMedicinePreferences.disabledMedicineIds.0",
          reason: "normalized content id alias"
        }
      ])
    );

    const secondParse = parseSaveData(staticData, result.save);

    expect(secondParse.ok).toBe(true);
    if (!secondParse.ok) {
      return;
    }
    expect(secondParse.migration.normalized).toBe(false);
    expect(secondParse.save).toEqual(result.save);
  });

  it("migrates legacy content ids to target ids", () => {
    const progress = createInitialPlayerProgress(staticData);
    const rawSave = {
      ...createSaveData({
        progress: {
          ...progress,
          heroes: {
            iron_fist_disciple: {
              level: 3,
              upgrades: {}
            }
          },
          activeHeroIds: ["iron_fist_disciple"],
          formation: {
            iron_fist_disciple: "front"
          },
          styleMastery: {
            fist: {
              experience: 300
            }
          },
          styleBranches: {
            fist: "iron_body_fist"
          },
          skillUpgrades: {
            iron_fist_combo_refinement: 2
          },
          equipment: {
            inventory: {
              training_wraps: 1
            },
            equipped: {
              iron_fist_disciple: {
                weapon: "training_wraps"
              }
            }
          },
          medicineInventory: {
            clear_heart_pill: 2
          },
          assignments: {
            bamboo_road_patrol: {
              heroIds: ["iron_fist_disciple"]
            }
          },
          selectedTacticId: "outer_pressure"
        },
        autoMedicinePreferences: {
          enabled: true,
          battleCleanseEnabled: true,
          postBattleCleanseEnabled: true,
          preBattleResistanceEnabled: true,
          preBattleResistanceMode: "boss_and_elite",
          disabledMedicineIds: ["clear_heart_pill"]
        },
        selectedOfflineFarmStageId: null,
        nowMs: 1000
      }),
      version: 11
    };
    const migration = migrateSaveData(staticData, rawSave);

    expect(migration.ok).toBe(true);
    if (!migration.ok) {
      return;
    }

    const migratedSave = migration.save as ReturnType<typeof createSaveData>;

    expect(migratedSave.progress.heroes.iron_fist_initiate).toEqual({
      level: 3,
      upgrades: {}
    });
    expect(migratedSave.progress.heroes.iron_fist_disciple).toBeUndefined();
    expect(migratedSave.progress.activeHeroIds).toEqual(["iron_fist_initiate"]);
    expect(migratedSave.progress.formation).toMatchObject({
      iron_fist_initiate: "front"
    });
    expect(migratedSave.progress.styleMastery).toEqual({
      impact: {
        experience: 300
      }
    });
    expect(migratedSave.progress.styleBranches).toEqual({
      impact: "iron_body_impact"
    });
    expect(migratedSave.progress.skillUpgrades).toEqual({
      impact_combo_refinement: 2
    });
    expect(migratedSave.progress.equipment).toEqual({
      inventory: {
        impact_training_wraps: 1
      },
      equipped: {
        iron_fist_initiate: {
          weapon: "impact_training_wraps"
        }
      }
    });
    expect(migratedSave.progress.medicineInventory).toEqual({
      clear_heart_countermeasure: 2
    });
    expect(migratedSave.progress.assignments).toEqual({
      greenline_sweep: {
        heroIds: ["iron_fist_initiate"]
      }
    });
    expect(migratedSave.progress.selectedTacticId).toBe("kinetic_crush");
    expect(migratedSave.autoMedicinePreferences.disabledMedicineIds).toEqual([
      "clear_heart_countermeasure"
    ]);
    expect(migration).toMatchObject({
      fromVersion: 11,
      toVersion: SAVE_DATA_VERSION,
      migrated: true,
      normalized: true
    });
  });

  it("preserves canonical map entries when legacy and canonical keys collide", () => {
    const progress = createInitialPlayerProgress(staticData);
    const save = {
      ...createSaveData({
        progress,
        selectedOfflineFarmStageId: null,
        nowMs: 1000
      }),
      version: 10,
      progress: {
        ...progress,
        maps: {
          greenline_approach: {
            combatExperience: 80,
            highestClearedStageIndex: 3
          },
          bamboo_road: {
            combatExperience: 12,
            highestClearedStageIndex: 1
          }
        },
        currentStageId: "greenline_approach_3"
      }
    };
    const result = parseSaveData(staticData, save);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.save.progress.maps.greenline_approach).toEqual({
      combatExperience: 80,
      highestClearedStageIndex: 3
    });
    expect(result.save.progress.maps.bamboo_road).toBeUndefined();
  });

  it("rejects unmapped old region and stage ids after migration", () => {
    const progress = createInitialPlayerProgress(staticData);
    const unknownRegionSave = {
      ...createSaveData({
        progress,
        selectedOfflineFarmStageId: null,
        nowMs: 1000
      }),
      version: 10,
      progress: {
        ...progress,
        maps: {
          ...progress.maps,
          old_missing_region: {
            combatExperience: 0,
            highestClearedStageIndex: 1
          }
        },
        currentStageId: "old_missing_region_1"
      }
    };
    const unknownStageSave = {
      ...createSaveData({
        progress,
        selectedOfflineFarmStageId: null,
        nowMs: 1000
      }),
      version: 10,
      progress: {
        ...progress,
        currentStageId: "old_missing_region_1"
      }
    };

    expect(validateSaveData(staticData, unknownRegionSave)).toContain(
      "progress.maps.old_missing_region must reference an existing region"
    );
    expect(validateSaveData(staticData, unknownStageSave)).toEqual(
      expect.arrayContaining([
        "progress.currentStageId must reference an existing stage"
      ])
    );
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

  it("preserves and validates disabled auto medicine ids", () => {
    const progress = createInitialPlayerProgress(staticData);
    const save = createSaveData({
      progress,
      selectedOfflineFarmStageId: null,
      nowMs: 1000
    });
    const validSave = {
      ...save,
      autoMedicinePreferences: {
        ...save.autoMedicinePreferences,
        disabledMedicineIds: ["clear_heart_countermeasure"]
      }
    };
    const invalidSave = {
      ...validSave,
      autoMedicinePreferences: {
        ...validSave.autoMedicinePreferences,
        disabledMedicineIds: ["clear_heart_countermeasure", "missing_medicine"]
      }
    };
    const result = parseSaveData(staticData, validSave);

    expect(validateSaveData(staticData, validSave)).toEqual([]);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.save.autoMedicinePreferences.disabledMedicineIds).toEqual([
      "clear_heart_countermeasure"
    ]);
    expect(validateSaveData(staticData, invalidSave)).toContain(
      "autoMedicinePreferences.disabledMedicineIds.1 must reference an existing medicine"
    );
    expect(parseSaveData(staticData, invalidSave)).toMatchObject({
      ok: false,
      reason: "invalid_save"
    });
  });

  it("migrates old saves without herbs and rejects invalid herb resources", () => {
    const progress = createInitialPlayerProgress(staticData);
    const save = createSaveData({
      progress,
      selectedOfflineFarmStageId: null,
      nowMs: 1000
    });
    const oldSave = {
      ...save,
      version: 5,
      progress: {
        ...save.progress,
        resources: {
          silver: 10,
          cultivation: 5
        }
      }
    };
    const badSave = {
      ...save,
      progress: {
        ...save.progress,
        resources: {
          ...save.progress.resources,
          herbs: -1
        }
      }
    };
    const result = parseSaveData(staticData, oldSave);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.save.progress.resources).toMatchObject({
      silver: 10,
      cultivation: 5,
      herbs: 0
    });
    expect(validateSaveData(staticData, badSave)).toContain(
      "progress.resources.herbs must be a non-negative finite number"
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
          iron_fist_initiate: "left"
        }
      }
    };

    expect(validateSaveData(staticData, oldSave)).toEqual([]);
    expect(validateSaveData(staticData, badSave)).toContain(
      "progress.formation.iron_fist_initiate must be front, middle, or back"
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
      "progress.activeHeroIds.lotus_stabilizer must be unlocked by saved progress"
    );
    expect(validateSaveData(staticData, duplicateHeroSave)).toContain(
      "progress.activeHeroIds.iron_fist_initiate is duplicated"
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
        "progress.styleBranches.impact must be unlocked by saved progress",
        "progress.styleBranches.pulse must select a branch from style pulse",
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
          bamboo_road: save.progress.maps.greenline_approach
        }
      }
    };

    expect(validateSaveData(staticData, oldSave)).toEqual([]);
    expect(parseSaveData(staticData, oldSave).ok).toBe(true);
  });

  it("rejects unknown maps and impossible cleared stage counts", () => {
    const progress = createInitialPlayerProgress(staticData);
    const save = createSaveData({
      progress,
      selectedOfflineFarmStageId: null,
      nowMs: 1000
    });
    const badSave = {
      ...save,
      progress: {
        ...save.progress,
        maps: {
          ...save.progress.maps,
          missing_region: {
            combatExperience: 0,
            highestClearedStageIndex: 1
          },
          greenline_approach: {
            combatExperience: 0,
            highestClearedStageIndex: 2.5
          },
          lotus_clinic: {
            combatExperience: 0,
            highestClearedStageIndex: 8
          }
        }
      }
    };

    expect(validateSaveData(staticData, badSave)).toEqual(
      expect.arrayContaining([
        "progress.maps.missing_region must reference an existing region",
        "progress.maps.greenline_approach.highestClearedStageIndex must be an integer between 0 and 10",
        "progress.maps.lotus_clinic.highestClearedStageIndex must be an integer between 0 and 7"
      ])
    );
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
            impact_training_wraps: 1.5
          },
          equipped: {
            missing_hero: {
              weapon: "impact_training_wraps"
            },
            iron_fist_disciple: {
              trinket: "impact_training_wraps",
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
        "progress.equipment.inventory.impact_training_wraps must be an integer >= 0",
        "progress.equipment.equipped.missing_hero must reference an existing hero",
        "progress.equipment.equipped.iron_fist_initiate.trinket must be weapon, armor, manual, or medicine",
        "progress.equipment.equipped.iron_fist_initiate.armor must reference an existing equipment item"
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
        "progress.assignments.greenline_sweep.heroIds.missing_hero must reference an existing hero",
        "progress.assignments.veil_district_calibration.heroIds.iron_fist_initiate is already assigned",
        "progress.assignments.veil_district_calibration.heroIds.iron_fist_initiate is not eligible",
        "progress.assignments.veil_district_calibration must be unlocked by saved progress"
      ])
    );
  });
});
