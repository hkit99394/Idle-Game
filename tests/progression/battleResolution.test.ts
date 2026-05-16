import { describe, expect, it } from "vitest";
import {
  createBattleEventRecords,
  createInitialPlayerProgress,
  defaultAutoMedicinePreferences,
  getEquipmentInventoryCount,
  resolveStageBattle
} from "../../core";
import type { StaticGameData } from "../../core";
import {
  autoMedicineCorruptionScenarioIds,
  createAutoMedicineCorruptionProgress,
  createAutoMedicineCorruptionScenarioData,
  createStatusPressureProgress,
  createStatusPressureScenarioData
} from "../helpers/statusScenarios";
import { staticData } from "../helpers/staticData";

describe("stage battle resolution", () => {
  it("resolves an unlocked stage victory, grants rewards, and advances current stage", () => {
    const progress = createInitialPlayerProgress(staticData);

    const result = resolveStageBattle(staticData, {
      progress,
      stageId: "greenline_approach_1",
      maxDurationSeconds: 60
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.battle.winner).toBe("player");
    expect(result.stageCleared).toBe(true);
    expect(result.suggestedFarmStageId).toBeNull();
    expect(result.rewards).toEqual({
      silver: 10,
      cultivation: 5,
      herbs: 0,
      combatExperience: 5
    });
    expect(result.progress.resources.silver).toBe(10);
    expect(result.progress.resources.cultivation).toBe(5);
    expect(result.progress.maps.greenline_approach.highestClearedStageIndex).toBe(1);
    expect(result.progress.currentStageId).toBe("greenline_approach_2");
  });

  it("preserves battle, reward, mastery, and equipment adapter fields on stage clear", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.maps.greenline_approach.highestClearedStageIndex = 1;
    progress.currentStageId = "greenline_approach_2";

    const result = resolveStageBattle(staticData, {
      progress,
      stageId: "greenline_approach_2",
      maxDurationSeconds: 60
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.stageCleared).toBe(true);
    expect(result.rewards).toEqual({
      silver: 14,
      cultivation: 7,
      herbs: 0,
      combatExperience: 5
    });
    expect(result.equipmentRewards).toEqual([
      {
        equipmentId: "impact_training_wraps",
        quantity: 1
      }
    ]);
    expect(getEquipmentInventoryCount(result.progress, "impact_training_wraps")).toBe(1);
    expect(result.masteryRanksBefore).toEqual([]);
    expect(result.masteryRanksAfter).toEqual([]);
    expect(result.newlyReachedMasteryRanks).toEqual([]);
    expect(result.battle.metrics.playerOuterDamage).toBeGreaterThan(0);
    expect(result.battle.contributions[0]).toMatchObject({
      instanceId: expect.stringMatching(/^player_/),
      outerDamageDealt: expect.any(Number),
      innerDamageDealt: expect.any(Number),
      qiBreakBurstDamageDealt: expect.any(Number),
      survived: expect.any(Boolean)
    });
    expect(createBattleEventRecords(result.battle.events)[0]).toMatchObject({
      index: 0,
      category: "attack",
      statusId: null
    });
  });

  it("rejects locked stage attempts without changing progress", () => {
    const progress = createInitialPlayerProgress(staticData);

    const result = resolveStageBattle(staticData, {
      progress,
      stageId: "greenline_approach_3",
      maxDurationSeconds: 60
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.reason).toBe("locked_stage");
    expect(result.progress).toBe(progress);
    expect(progress.resources.silver).toBe(0);
    expect(progress.maps.greenline_approach.highestClearedStageIndex).toBe(0);
  });

  it("does not move current stage backward when replaying an older cleared stage", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.maps.greenline_approach.highestClearedStageIndex = 3;
    progress.currentStageId = "greenline_approach_4";

    const result = resolveStageBattle(staticData, {
      progress,
      stageId: "greenline_approach_1",
      maxDurationSeconds: 60
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.battle.winner).toBe("player");
    expect(result.stageCleared).toBe(true);
    expect(result.progress.maps.greenline_approach.highestClearedStageIndex).toBe(3);
    expect(result.progress.currentStageId).toBe("greenline_approach_4");
  });

  it("does not grant rewards or unlock next stage on defeat", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.maps.greenline_approach.highestClearedStageIndex = 9;
    progress.currentStageId = "greenline_approach_10";

    const result = resolveStageBattle(staticData, {
      progress,
      stageId: "greenline_approach_10",
      maxDurationSeconds: 180
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.battle.winner).toBe("enemy");
    expect(result.stageCleared).toBe(false);
    expect(result.rewards).toBeNull();
    expect(result.suggestedFarmStageId).toBe("greenline_approach_8");
    expect(result.progress).toBe(progress);
    expect(result.progress.resources.silver).toBe(0);
    expect(result.progress.maps.greenline_approach.highestClearedStageIndex).toBe(9);
    expect(result.progress.currentStageId).toBe("greenline_approach_10");
  });

  it("returns no farm suggestion when the player has not cleared a farmable stage", () => {
    const data: StaticGameData = {
      ...staticData,
      stages: staticData.stages.map((stage) =>
        stage.id === "greenline_approach_1"
          ? {
              ...stage,
              enemyTeam: {
                combatantIds: ["ironwall_guard"]
              }
            }
          : stage
      )
    };
    const progress = createInitialPlayerProgress(data);

    const result = resolveStageBattle(data, {
      progress,
      stageId: "greenline_approach_1",
      maxDurationSeconds: 180
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.battle.winner).toBe("enemy");
    expect(result.stageCleared).toBe(false);
    expect(result.rewards).toBeNull();
    expect(result.suggestedFarmStageId).toBeNull();
    expect(result.progress).toBe(progress);
    expect(result.progress.resources.silver).toBe(0);
    expect(result.progress.maps.greenline_approach.highestClearedStageIndex).toBe(0);
    expect(result.progress.currentStageId).toBe("greenline_approach_1");
  });

  it("returns a missing enemy error before simulating bad stage data", () => {
    const badData: StaticGameData = {
      ...staticData,
      stages: staticData.stages.map((stage) =>
        stage.id === "greenline_approach_1"
          ? {
              ...stage,
              enemyTeam: {
                combatantIds: ["missing_enemy"]
              }
            }
          : stage
      )
    };
    const progress = createInitialPlayerProgress(badData);

    const result = resolveStageBattle(badData, {
      progress,
      stageId: "greenline_approach_1"
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.reason).toBe("missing_enemy");
    expect(result.missingId).toBe("missing_enemy");
  });

  it("uses configured auto-medicine inventory in actual battles and consumes medicine", () => {
    const data = createAutoMedicineCorruptionScenarioData();
    const progress = createAutoMedicineCorruptionProgress(data);
    const ids = autoMedicineCorruptionScenarioIds;

    const disabledResult = resolveStageBattle(data, {
      progress,
      stageId: ids.stageId,
      maxDurationSeconds: 4.5,
      autoMedicinePreferences: {
        ...defaultAutoMedicinePreferences,
        battleCleanseEnabled: false
      }
    });
    const enabledResult = resolveStageBattle(data, {
      progress,
      stageId: ids.stageId,
      maxDurationSeconds: 4.5,
      autoMedicinePreferences: defaultAutoMedicinePreferences
    });

    expect(disabledResult.ok).toBe(true);
    expect(enabledResult.ok).toBe(true);
    if (!disabledResult.ok || !enabledResult.ok) {
      return;
    }

    expect(
      disabledResult.battle.events.some((event) => event.type === "status_tick")
    ).toBe(true);
    expect(
      enabledResult.battle.events.some((event) => event.type === "status_tick")
    ).toBe(false);
    expect(enabledResult.battle.autoMedicine.uses).toEqual([
      expect.objectContaining({
        trigger: "battle_cleanse",
        medicineId: "clear_heart_countermeasure",
        timeSeconds: 1,
        targetId: ids.targetId,
        cleansedStatusIds: ["corruption"]
      })
    ]);
    expect(enabledResult.battle.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "auto_medicine",
          time: 1,
          targetId: ids.targetId,
          trigger: "battle_cleanse",
          medicineId: "clear_heart_countermeasure",
          cleansedStatusIds: ["corruption"]
        })
      ])
    );
    expect(
      enabledResult.battle.events
        .filter(
          (event) =>
            event.time === 1 &&
            ["attack", "status_apply", "auto_medicine"].includes(event.type)
        )
        .map((event) => ({
          type: event.type,
          targetId: "targetId" in event ? event.targetId : null,
          statusId: "statusId" in event ? event.statusId : null,
          medicineId: "medicineId" in event ? event.medicineId : null,
          trigger: event.type === "auto_medicine" ? event.trigger : null
        }))
    ).toEqual([
      {
        type: "attack",
        targetId: ids.targetId,
        statusId: null,
        medicineId: null,
        trigger: null
      },
      {
        type: "status_apply",
        targetId: ids.targetId,
        statusId: "corruption",
        medicineId: null,
        trigger: null
      },
      {
        type: "auto_medicine",
        targetId: ids.targetId,
        statusId: null,
        medicineId: "clear_heart_countermeasure",
        trigger: "battle_cleanse"
      }
    ]);
    expect(enabledResult.progress.medicineInventory?.clear_heart_countermeasure).toBeUndefined();
    expect(disabledResult.progress.medicineInventory?.clear_heart_countermeasure).toBe(1);
    expect(enabledResult.battle.finalPlayerTeam[0]?.outerHp).toBeGreaterThan(
      disabledResult.battle.finalPlayerTeam[0]?.outerHp ?? 0
    );
  });

  it("expires pre-battle medicine resistance instead of baking it into base stats", () => {
    const stageId = "scenario_pre_battle_resistance_stage";
    const heroId = "res_patient_0";
    const enemyId = "res_poisoner_0";
    const skillId = "res_poison_0";
    const medicineId = "scenario_short_resistance_powder";
    const data = createStatusPressureScenarioData({
      stageId,
      heroId,
      enemyId,
      skillId,
      enemyStats: {
        statusAccuracy: 0
      },
      skillCooldownSeconds: 0.1,
      statusEffects: [
        {
          statusId: "corruption",
          chance: 1,
          durationSeconds: 4,
          stacks: 1
        }
      ],
      medicine: {
        id: medicineId,
        name: "Scenario Short Resistance Powder",
        unlock: { type: "always" },
        maxCarry: 5,
        effects: [
          {
            type: "status_resistance_bonus",
            value: 0.8,
            durationSeconds: 1.5
          }
        ]
      }
    });
    const progress = createStatusPressureProgress(data, {
      stageId,
      heroId,
      medicineInventory: { [medicineId]: 1 }
    });

    const result = resolveStageBattle(data, {
      progress,
      stageId,
      maxDurationSeconds: 2.5,
      autoMedicinePreferences: {
        ...defaultAutoMedicinePreferences,
        battleCleanseEnabled: false,
        preBattleResistanceMode: "always_when_recommended"
      }
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(
      result.battle.events
        .filter((event) => event.type === "status_apply")
        .map((event) => event.time)
    ).toEqual([2]);
    expect(result.battle.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "auto_medicine",
          time: 0,
          trigger: "pre_battle_resistance",
          medicineId,
          statusResistanceBonus: 0.8,
          statusResistanceDurationSeconds: 1.5
        })
      ])
    );
    expect(result.battle.autoMedicine.uses).toEqual([
      expect.objectContaining({
        trigger: "pre_battle_resistance",
        timeSeconds: 0,
        medicineId
      })
    ]);
    expect(result.battle.finalPlayerTeam[0]?.stats.statusResistance).toBe(0);
    expect(result.battle.finalPlayerTeam[0]?.statusResistanceBonuses).toEqual([]);
    expect(result.progress.medicineInventory?.[medicineId]).toBeUndefined();
  });

  it("applies battle-cleanse medicine resistance only for its timed window", () => {
    const stageId = "scenario_cleanse_resistance_stage";
    const heroId = "scenario_cleanse_patient";
    const enemyId = "scenario_cleanse_poisoner";
    const skillId = "scenario_cleanse_poison";
    const medicineId = "scenario_cleanse_resistance_draught";
    const data = createStatusPressureScenarioData({
      stageId,
      heroId,
      enemyId,
      skillId,
      enemyStats: {
        statusAccuracy: 0
      },
      skillCooldownSeconds: 0.1,
      statusEffects: [
        {
          statusId: "corruption",
          chance: 0.85,
          durationSeconds: 4,
          stacks: 1
        }
      ],
      medicine: {
        id: medicineId,
        name: "Scenario Cleanse Resistance Draught",
        unlock: { type: "always" },
        maxCarry: 5,
        effects: [
          {
            type: "cleanse_status",
            dispelTags: ["poison"],
            maxCount: 1
          },
          {
            type: "status_resistance_bonus",
            value: 0.8,
            durationSeconds: 1.5
          }
        ]
      }
    });
    const progress = createStatusPressureProgress(data, {
      stageId,
      heroId,
      medicineInventory: { [medicineId]: 1 }
    });

    const result = resolveStageBattle(data, {
      progress,
      stageId,
      maxDurationSeconds: 3.5,
      autoMedicinePreferences: {
        ...defaultAutoMedicinePreferences,
        preBattleResistanceMode: "off"
      }
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(
      result.battle.events
        .filter((event) => event.type === "status_apply")
        .map((event) => event.time)
    ).toEqual([1, 3]);
    expect(result.battle.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "auto_medicine",
          time: 1,
          targetId: "player_scenario_cleanse_patient_1",
          trigger: "battle_cleanse",
          medicineId,
          cleansedStatusIds: ["corruption"],
          statusResistanceBonus: 0.8,
          statusResistanceDurationSeconds: 1.5
        })
      ])
    );
    expect(result.battle.autoMedicine.uses).toEqual([
      expect.objectContaining({
        trigger: "battle_cleanse",
        timeSeconds: 1,
        targetId: "player_scenario_cleanse_patient_1",
        medicineId
      })
    ]);
    expect(result.battle.finalPlayerTeam[0]?.activeStatuses).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          statusId: "corruption"
        })
      ])
    );
    expect(result.progress.medicineInventory?.[medicineId]).toBeUndefined();
  });

  it("auto-cleanses timed combat debuffs and records the medicine event", () => {
    const stageId = "scenario_timed_cleanse_stage";
    const heroId = "scenario_timed_cleanse_patient";
    const enemyId = "scenario_timed_cleanse_debuffer";
    const skillId = "scenario_timed_inner_break";
    const medicineId = "scenario_timed_cleanse_draught";
    const data = createStatusPressureScenarioData({
      stageId,
      heroId,
      enemyId,
      skillId,
      enemyName: "Scenario Debuffer",
      skillName: "Scenario Timed Inner Break",
      skillCooldownSeconds: 20,
      skillEffects: [
        {
          type: "inner_defense_down",
          value: 0.4,
          durationSeconds: 6
        }
      ],
      medicine: {
        id: medicineId,
        name: "Scenario Timed Cleanse Draught",
        unlock: { type: "always" },
        maxCarry: 5,
        effects: [
          {
            type: "cleanse_status",
            dispelTags: ["debuff"],
            maxCount: 1
          },
          {
            type: "status_resistance_bonus",
            value: 0.8,
            durationSeconds: 1.5
          }
        ]
      },
      stageName: "Scenario Timed Cleanse Stage"
    });
    const progress = createStatusPressureProgress(data, {
      stageId,
      heroId,
      medicineInventory: { [medicineId]: 1 }
    });

    const result = resolveStageBattle(data, {
      progress,
      stageId,
      maxDurationSeconds: 1.5,
      autoMedicinePreferences: {
        ...defaultAutoMedicinePreferences,
        preBattleResistanceMode: "off"
      }
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.battle.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "inner_defense_down",
          time: 1,
          targetId: "player_scenario_timed_cleanse_patient_1"
        }),
        expect.objectContaining({
          type: "auto_medicine",
          time: 1,
          targetId: "player_scenario_timed_cleanse_patient_1",
          trigger: "battle_cleanse",
          medicineId,
          cleansedStatusIds: ["inner_defense_down"],
          statusResistanceBonus: 0.8
        })
      ])
    );
    expect(result.battle.autoMedicine.uses).toEqual([
      expect.objectContaining({
        trigger: "battle_cleanse",
        targetId: "player_scenario_timed_cleanse_patient_1",
        cleansedStatusIds: ["inner_defense_down"],
        medicineId
      })
    ]);
    expect(result.battle.finalPlayerTeam[0]?.innerDefenseDown).toBeNull();
    expect(result.progress.medicineInventory?.[medicineId]).toBeUndefined();
  });
});
