import { describe, expect, it } from "vitest";
import {
  createInitialPlayerProgress,
  defaultAutoMedicinePreferences,
  resolveStageBattle
} from "../../core";
import type { BaseStats, StaticGameData } from "../../core";
import { staticData } from "../helpers/staticData";

const scenarioStats: BaseStats = {
  maxOuterHp: 1000,
  maxInnerQi: 500,
  outerAttack: 0,
  innerAttack: 0,
  outerDefense: 0,
  innerDefense: 0,
  speed: 0,
  critChance: 0,
  critDamage: 1,
  breakPower: 0,
  breakResist: 0,
  innerRecoveryRate: 0,
  statusAccuracy: 0,
  statusResistance: 0
};

function createStatusPressureScenarioData(input: {
  stageId: string;
  heroId: string;
  enemyId: string;
  skillId: string;
  medicine: StaticGameData["medicines"][number];
  statusChance?: number;
}): StaticGameData {
  return {
    ...staticData,
    heroes: [
      ...staticData.heroes,
      {
        ...staticData.heroes[0],
        id: input.heroId,
        name: "Scenario Patient",
        skillIds: [],
        baseStats: scenarioStats
      }
    ],
    enemies: [
      ...staticData.enemies,
      {
        ...staticData.enemies[0],
        id: input.enemyId,
        name: "Scenario Poisoner",
        level: 1,
        skillIds: [input.skillId],
        baseStats: {
          ...scenarioStats,
          speed: 100
        }
      }
    ],
    skills: [
      ...staticData.skills,
      {
        id: input.skillId,
        name: "Scenario Poison",
        cooldownSeconds: 0.1,
        outerMultiplier: 0,
        innerMultiplier: 0,
        targetRule: "first_living",
        effects: [
          {
            type: "apply_status",
            statusId: "poison",
            chance: input.statusChance ?? 0.85,
            durationSeconds: 4,
            stacks: 1
          }
        ]
      }
    ],
    medicines: [
      ...staticData.medicines.filter(
        (medicine) => medicine.id !== input.medicine.id
      ),
      input.medicine
    ],
    stages: [
      ...staticData.stages,
      {
        id: input.stageId,
        regionId: "bamboo_road",
        index: 1,
        name: "Scenario Status Pressure Stage",
        enemyTeam: {
          combatantIds: [input.enemyId]
        },
        isBoss: false,
        canFarmOffline: false,
        rewards: {
          silver: 0,
          cultivation: 0,
          combatExperience: 0
        },
        nextStageId: null
      }
    ]
  };
}

function createStatusPressureProgress(
  data: StaticGameData,
  heroId: string,
  medicineId: string
) {
  const progress = createInitialPlayerProgress(data);
  progress.activeHeroIds = [heroId];
  progress.formation = { [heroId]: "front" };
  progress.medicineInventory = { [medicineId]: 1 };

  return progress;
}

describe("stage battle resolution", () => {
  it("resolves an unlocked stage victory, grants rewards, and advances current stage", () => {
    const progress = createInitialPlayerProgress(staticData);

    const result = resolveStageBattle(staticData, {
      progress,
      stageId: "bamboo_road_1",
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
    expect(result.progress.maps.bamboo_road.highestClearedStageIndex).toBe(1);
    expect(result.progress.currentStageId).toBe("bamboo_road_2");
  });

  it("rejects locked stage attempts without changing progress", () => {
    const progress = createInitialPlayerProgress(staticData);

    const result = resolveStageBattle(staticData, {
      progress,
      stageId: "bamboo_road_3",
      maxDurationSeconds: 60
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.reason).toBe("locked_stage");
    expect(result.progress).toBe(progress);
    expect(progress.resources.silver).toBe(0);
    expect(progress.maps.bamboo_road.highestClearedStageIndex).toBe(0);
  });

  it("does not move current stage backward when replaying an older cleared stage", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.maps.bamboo_road.highestClearedStageIndex = 3;
    progress.currentStageId = "bamboo_road_4";

    const result = resolveStageBattle(staticData, {
      progress,
      stageId: "bamboo_road_1",
      maxDurationSeconds: 60
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.battle.winner).toBe("player");
    expect(result.stageCleared).toBe(true);
    expect(result.progress.maps.bamboo_road.highestClearedStageIndex).toBe(3);
    expect(result.progress.currentStageId).toBe("bamboo_road_4");
  });

  it("does not grant rewards or unlock next stage on defeat", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.maps.bamboo_road.highestClearedStageIndex = 9;
    progress.currentStageId = "bamboo_road_10";

    const result = resolveStageBattle(staticData, {
      progress,
      stageId: "bamboo_road_10",
      maxDurationSeconds: 180
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.battle.winner).toBe("enemy");
    expect(result.stageCleared).toBe(false);
    expect(result.rewards).toBeNull();
    expect(result.suggestedFarmStageId).toBe("bamboo_road_8");
    expect(result.progress).toBe(progress);
    expect(result.progress.resources.silver).toBe(0);
    expect(result.progress.maps.bamboo_road.highestClearedStageIndex).toBe(9);
    expect(result.progress.currentStageId).toBe("bamboo_road_10");
  });

  it("returns no farm suggestion when the player has not cleared a farmable stage", () => {
    const data: StaticGameData = {
      ...staticData,
      stages: staticData.stages.map((stage) =>
        stage.id === "bamboo_road_1"
          ? {
              ...stage,
              enemyTeam: {
                combatantIds: ["black_iron_guard"]
              }
            }
          : stage
      )
    };
    const progress = createInitialPlayerProgress(data);

    const result = resolveStageBattle(data, {
      progress,
      stageId: "bamboo_road_1",
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
    expect(result.progress.maps.bamboo_road.highestClearedStageIndex).toBe(0);
    expect(result.progress.currentStageId).toBe("bamboo_road_1");
  });

  it("returns a missing enemy error before simulating bad stage data", () => {
    const badData: StaticGameData = {
      ...staticData,
      stages: staticData.stages.map((stage) =>
        stage.id === "bamboo_road_1"
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
      stageId: "bamboo_road_1"
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.reason).toBe("missing_enemy");
    expect(result.missingId).toBe("missing_enemy");
  });

  it("uses configured auto-medicine inventory in actual battles and consumes medicine", () => {
    const stageId = "scenario_auto_medicine_stage";
    const heroId = "scenario_auto_medicine_patient";
    const enemyId = "scenario_auto_medicine_poisoner";
    const poisonSkillId = "scenario_actual_battle_poison";
    const data: StaticGameData = {
      ...staticData,
      heroes: [
        ...staticData.heroes,
        {
          ...staticData.heroes[0],
          id: heroId,
          name: "Scenario Patient",
          skillIds: [],
          baseStats: scenarioStats
        }
      ],
      enemies: [
        ...staticData.enemies,
        {
          ...staticData.enemies[0],
          id: enemyId,
          name: "Scenario Poisoner",
          level: 1,
          skillIds: [poisonSkillId],
          baseStats: {
            ...scenarioStats,
            speed: 100,
            statusAccuracy: 0.5
          }
        }
      ],
      skills: [
        ...staticData.skills,
        {
          id: poisonSkillId,
          name: "Scenario Actual Battle Poison",
          cooldownSeconds: 20,
          outerMultiplier: 0,
          innerMultiplier: 0,
          targetRule: "first_living",
          effects: [
            {
              type: "apply_status",
              statusId: "poison",
              chance: 1,
              durationSeconds: 6,
              stacks: 1
            }
          ]
        }
      ],
      stages: [
        ...staticData.stages,
        {
          id: stageId,
          regionId: "bamboo_road",
          index: 1,
          name: "Scenario Auto Medicine Stage",
          enemyTeam: {
            combatantIds: [enemyId]
          },
          isBoss: false,
          canFarmOffline: false,
          rewards: {
            silver: 0,
            cultivation: 0,
            combatExperience: 0
          },
          nextStageId: null
        }
      ]
    };
    const progress = createInitialPlayerProgress(data);
    progress.activeHeroIds = [heroId];
    progress.formation = { [heroId]: "front" };
    progress.medicineInventory = {
      clear_heart_pill: 1
    };

    const disabledResult = resolveStageBattle(data, {
      progress,
      stageId,
      maxDurationSeconds: 4.5,
      autoMedicinePreferences: {
        ...defaultAutoMedicinePreferences,
        battleCleanseEnabled: false
      }
    });
    const enabledResult = resolveStageBattle(data, {
      progress,
      stageId,
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
        medicineId: "clear_heart_pill",
        timeSeconds: 1,
        targetId: "player_scenario_auto_medicine_patient_1",
        cleansedStatusIds: ["poison"]
      })
    ]);
    expect(enabledResult.battle.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "auto_medicine",
          time: 1,
          targetId: "player_scenario_auto_medicine_patient_1",
          trigger: "battle_cleanse",
          medicineId: "clear_heart_pill",
          cleansedStatusIds: ["poison"]
        })
      ])
    );
    expect(enabledResult.progress.medicineInventory?.clear_heart_pill).toBeUndefined();
    expect(disabledResult.progress.medicineInventory?.clear_heart_pill).toBe(1);
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
    const progress = createStatusPressureProgress(data, heroId, medicineId);

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
    const progress = createStatusPressureProgress(data, heroId, medicineId);

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
          cleansedStatusIds: ["poison"],
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
          statusId: "poison"
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
    const data: StaticGameData = {
      ...staticData,
      heroes: [
        ...staticData.heroes,
        {
          ...staticData.heroes[0],
          id: heroId,
          name: "Scenario Patient",
          skillIds: [],
          baseStats: scenarioStats
        }
      ],
      enemies: [
        ...staticData.enemies,
        {
          ...staticData.enemies[0],
          id: enemyId,
          name: "Scenario Debuffer",
          level: 1,
          skillIds: [skillId],
          baseStats: {
            ...scenarioStats,
            speed: 100
          }
        }
      ],
      skills: [
        ...staticData.skills,
        {
          id: skillId,
          name: "Scenario Timed Inner Break",
          cooldownSeconds: 20,
          outerMultiplier: 0,
          innerMultiplier: 0,
          targetRule: "first_living",
          effects: [
            {
              type: "inner_defense_down",
              value: 0.4,
              durationSeconds: 6
            }
          ]
        }
      ],
      medicines: [
        ...staticData.medicines,
        {
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
        }
      ],
      stages: [
        ...staticData.stages,
        {
          id: stageId,
          regionId: "bamboo_road",
          index: 1,
          name: "Scenario Timed Cleanse Stage",
          enemyTeam: {
            combatantIds: [enemyId]
          },
          isBoss: false,
          canFarmOffline: false,
          rewards: {
            silver: 0,
            cultivation: 0,
            combatExperience: 0
          },
          nextStageId: null
        }
      ]
    };
    const progress = createStatusPressureProgress(data, heroId, medicineId);

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
