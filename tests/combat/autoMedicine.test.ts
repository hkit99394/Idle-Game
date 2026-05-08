import { describe, expect, it } from "vitest";
import {
  applyAutoCleanseMedicine,
  applyAutoPreBattleResistanceMedicine,
  applyStatusEffect,
  createStatusDictionary,
  getStageStatusPressureIds,
  isAutoMedicineUnlocked,
  selectAutoCleanseMedicine,
  selectAutoPreBattleResistanceMedicine,
  setMedicineAutoUsePreference
} from "../../core";
import type {
  ActiveStatusEffect,
  EnemyDefinition,
  MedicineDefinition,
  SkillDefinition,
  StageDefinition,
  StatusEffectDefinition
} from "../../core";
import enemies from "../../data/enemies.json" with { type: "json" };
import medicines from "../../data/medicines.json" with { type: "json" };
import skills from "../../data/skills.json" with { type: "json" };
import stages from "../../data/stages.json" with { type: "json" };
import statusEffects from "../../data/statusEffects.json" with { type: "json" };

const medicineDefinitions = medicines as MedicineDefinition[];
const enemyDefinitions = enemies as EnemyDefinition[];
const skillDefinitions = skills as SkillDefinition[];
const stageDefinitions = stages as StageDefinition[];
const statusDefinitions = createStatusDictionary(
  statusEffects as StatusEffectDefinition[]
);

function getStage(stageId: string): StageDefinition {
  const stage = stageDefinitions.find((entry) => entry.id === stageId);

  if (stage === undefined) {
    throw new Error(`Missing stage ${stageId}`);
  }

  return stage;
}

const statusPressureStage: StageDefinition = {
  id: "test_status_pressure",
  regionId: "bamboo_road",
  index: 1,
  name: "Status Pressure Test",
  enemyTeam: {
    combatantIds: ["test_status_pressure_enemy"]
  },
  isBoss: false,
  canFarmOffline: false,
  rewards: {
    silver: 0,
    cultivation: 0,
    combatExperience: 0
  },
  nextStageId: null
};

const statusPressureEnemies: EnemyDefinition[] = [
  ...enemyDefinitions,
  {
    ...enemyDefinitions[0],
    id: "test_status_pressure_enemy",
    skillIds: ["test_poison_hex", "test_vulnerability_hex"]
  }
];

const statusPressureSkills: SkillDefinition[] = [
  ...skillDefinitions,
  {
    id: "test_poison_hex",
    name: "Test Poison Hex",
    cooldownSeconds: 1,
    outerMultiplier: 0,
    innerMultiplier: 0,
    targetRule: "first_living",
    effects: [
      {
        type: "apply_status",
        statusId: "poison",
        chance: 1,
        durationSeconds: 8,
        stacks: 1
      }
    ]
  },
  {
    id: "test_vulnerability_hex",
    name: "Test Vulnerability Hex",
    cooldownSeconds: 1,
    outerMultiplier: 0,
    innerMultiplier: 0,
    targetRule: "first_living",
    effects: [
      {
        type: "apply_status",
        statusId: "vulnerable",
        chance: 1,
        durationSeconds: 5,
        stacks: 1
      }
    ]
  }
];

function status(statusId: string): ActiveStatusEffect {
  const definition = statusDefinitions[statusId];

  if (definition === undefined) {
    throw new Error(`Missing status ${statusId}`);
  }

  return applyStatusEffect({
    activeStatuses: [],
    definition
  }).applied;
}

describe("auto medicine", () => {
  it("keeps automation locked until medicine is owned or unlocked", () => {
    expect(
      isAutoMedicineUnlocked({
        medicines: medicineDefinitions,
        inventory: {},
        progress: {
          bamboo_road: {
            highestClearedStageIndex: 9
          }
        },
        stages: stageDefinitions
      })
    ).toBe(false);

    expect(
      isAutoMedicineUnlocked({
        medicines: medicineDefinitions,
        inventory: {},
        progress: {
          bamboo_road: {
            highestClearedStageIndex: 10
          }
        },
        stages: stageDefinitions
      })
    ).toBe(true);

    expect(
      isAutoMedicineUnlocked({
        medicines: medicineDefinitions,
        inventory: {
          clear_heart_pill: 1
        }
      })
    ).toBe(true);
  });

  it("skips automatic use while automation is locked", () => {
    const result = applyAutoCleanseMedicine({
      medicines: medicineDefinitions,
      inventory: {
        clear_heart_pill: 1
      },
      activeStatuses: [status("poison")],
      statusDefinitions,
      trigger: "battle_cleanse",
      automationUnlocked: false
    });

    expect(result).toMatchObject({
      inventory: {
        clear_heart_pill: 1
      },
      usedMedicine: null,
      skippedReason: "automation_locked"
    });
  });

  it("prefers narrow cleanse medicine before broad debuff cleanse", () => {
    const activeStatuses = [status("poison"), status("wound")];

    expect(
      selectAutoCleanseMedicine({
        medicines: medicineDefinitions,
        inventory: {
          clear_heart_pill: 1,
          purity_draught: 1
        },
        activeStatuses,
        statusDefinitions
      })?.id
    ).toBe("clear_heart_pill");

    const result = applyAutoCleanseMedicine({
      medicines: medicineDefinitions,
      inventory: {
        clear_heart_pill: 1,
        purity_draught: 1
      },
      activeStatuses,
      statusDefinitions,
      trigger: "battle_cleanse"
    });

    expect(result.usedMedicine).toMatchObject({
      trigger: "battle_cleanse",
      medicineId: "clear_heart_pill",
      cleansedStatusIds: ["poison", "wound"]
    });
    expect(result.inventory.clear_heart_pill).toBeUndefined();
    expect(result.inventory.purity_draught).toBe(1);
    expect(result.statuses).toEqual([]);
  });

  it("uses broad cleanse for debuffs not covered by narrow medicine", () => {
    const result = applyAutoCleanseMedicine({
      medicines: medicineDefinitions,
      inventory: {
        clear_heart_pill: 1,
        purity_draught: 1
      },
      activeStatuses: [status("qi_suppression")],
      statusDefinitions,
      trigger: "post_battle_cleanse"
    });

    expect(result.usedMedicine).toMatchObject({
      trigger: "post_battle_cleanse",
      medicineId: "purity_draught",
      cleansedStatusIds: ["qi_suppression"],
      statusResistanceBonus: 0.08,
      statusResistanceDurationSeconds: 10
    });
    expect(result.inventory.clear_heart_pill).toBe(1);
    expect(result.inventory.purity_draught).toBeUndefined();
    expect(result.statuses).toEqual([]);
  });

  it("skips disabled cleanse medicine and can re-enable it", () => {
    const activeStatuses = [
      status("poison"),
      status("wound"),
      status("qi_suppression")
    ];
    const disabledClearHeartPill = setMedicineAutoUsePreference(
      undefined,
      "clear_heart_pill",
      false
    );

    expect(
      selectAutoCleanseMedicine({
        medicines: medicineDefinitions,
        inventory: {
          clear_heart_pill: 1,
          purity_draught: 1
        },
        activeStatuses,
        statusDefinitions,
        preferences: disabledClearHeartPill
      })?.id
    ).toBe("purity_draught");

    const result = applyAutoCleanseMedicine({
      medicines: medicineDefinitions,
      inventory: {
        clear_heart_pill: 1,
        purity_draught: 1
      },
      activeStatuses,
      statusDefinitions,
      trigger: "battle_cleanse",
      preferences: disabledClearHeartPill
    });

    expect(result.usedMedicine?.medicineId).toBe("purity_draught");
    expect(result.inventory.clear_heart_pill).toBe(1);
    expect(result.inventory.purity_draught).toBeUndefined();

    const reenabledClearHeartPill = setMedicineAutoUsePreference(
      disabledClearHeartPill,
      "clear_heart_pill",
      true
    );

    expect(
      selectAutoCleanseMedicine({
        medicines: medicineDefinitions,
        inventory: {
          clear_heart_pill: 1,
          purity_draught: 1
        },
        activeStatuses,
        statusDefinitions,
        preferences: reenabledClearHeartPill
      })?.id
    ).toBe("clear_heart_pill");
  });

  it("selects pre-battle resistance medicine for status-heavy stages", () => {
    expect(
      getStageStatusPressureIds({
        stage: statusPressureStage,
        enemies: statusPressureEnemies,
        skills: statusPressureSkills
      })
    ).toEqual(["poison", "vulnerable"]);
    expect(
      selectAutoPreBattleResistanceMedicine({
        medicines: medicineDefinitions,
        inventory: {
          quiet_meridian_powder: 1,
          purity_draught: 1
        },
        stage: statusPressureStage,
        enemies: statusPressureEnemies,
        skills: statusPressureSkills,
        statusDefinitions
      })?.id
    ).toBe("quiet_meridian_powder");

    const result = applyAutoPreBattleResistanceMedicine({
      medicines: medicineDefinitions,
      inventory: {
        quiet_meridian_powder: 1,
        purity_draught: 1
      },
      stage: statusPressureStage,
      enemies: statusPressureEnemies,
      skills: statusPressureSkills,
      statusDefinitions
    });

    expect(result.usedMedicine).toMatchObject({
      trigger: "pre_battle_resistance",
      medicineId: "quiet_meridian_powder",
      statusResistanceBonus: 0.12,
      statusResistanceDurationSeconds: 12
    });
    expect(result.inventory.quiet_meridian_powder).toBeUndefined();
    expect(result.inventory.purity_draught).toBe(1);
  });

  it("skips disabled pre-battle resistance medicine", () => {
    const preferences = setMedicineAutoUsePreference(
      undefined,
      "quiet_meridian_powder",
      false
    );

    expect(
      selectAutoPreBattleResistanceMedicine({
        medicines: medicineDefinitions,
        inventory: {
          quiet_meridian_powder: 1,
          purity_draught: 1
        },
        stage: statusPressureStage,
        enemies: statusPressureEnemies,
        skills: statusPressureSkills,
        statusDefinitions,
        preferences
      })?.id
    ).toBe("purity_draught");

    const result = applyAutoPreBattleResistanceMedicine({
      medicines: medicineDefinitions,
      inventory: {
        quiet_meridian_powder: 1,
        purity_draught: 1
      },
      stage: statusPressureStage,
      enemies: statusPressureEnemies,
      skills: statusPressureSkills,
      statusDefinitions,
      preferences
    });

    expect(result.usedMedicine?.medicineId).toBe("purity_draught");
    expect(result.inventory.quiet_meridian_powder).toBe(1);
    expect(result.inventory.purity_draught).toBeUndefined();
  });

  it("does not consume medicine when there is no matching trigger", () => {
    expect(
      applyAutoCleanseMedicine({
        medicines: medicineDefinitions,
        inventory: {
          clear_heart_pill: 1
        },
        activeStatuses: [status("qi_suppression")],
        statusDefinitions,
        trigger: "battle_cleanse"
      })
    ).toMatchObject({
      inventory: {
        clear_heart_pill: 1
      },
      usedMedicine: null,
      skippedReason: "no_owned_match"
    });

    expect(
      applyAutoPreBattleResistanceMedicine({
        medicines: medicineDefinitions,
        inventory: {
          quiet_meridian_powder: 1
        },
        stage: getStage("bamboo_road_1"),
        enemies: enemyDefinitions,
        skills: skillDefinitions,
        statusDefinitions
      })
    ).toMatchObject({
      inventory: {
        quiet_meridian_powder: 1
      },
      usedMedicine: null,
      skippedReason: "no_status_pressure"
    });
  });

  it("does not consume the same medicine twice in one trigger window", () => {
    const poisoned = status("poison");
    const firstUse = applyAutoCleanseMedicine({
      medicines: medicineDefinitions,
      inventory: {
        clear_heart_pill: 2
      },
      activeStatuses: [poisoned],
      statusDefinitions,
      trigger: "battle_cleanse"
    });

    expect(firstUse.usedMedicine?.medicineId).toBe("clear_heart_pill");
    expect(firstUse.inventory.clear_heart_pill).toBe(1);

    const secondUse = applyAutoCleanseMedicine({
      medicines: medicineDefinitions,
      inventory: firstUse.inventory,
      activeStatuses: [poisoned],
      statusDefinitions,
      trigger: "battle_cleanse",
      alreadyUsedMedicineIds: [firstUse.usedMedicine?.medicineId ?? ""]
    });

    expect(secondUse).toMatchObject({
      inventory: {
        clear_heart_pill: 1
      },
      usedMedicine: null,
      skippedReason: "no_owned_match"
    });
  });
});
