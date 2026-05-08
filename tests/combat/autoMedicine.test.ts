import { describe, expect, it } from "vitest";
import {
  applyAutoCleanseMedicine,
  applyAutoPreBattleResistanceMedicine,
  applyStatusEffect,
  createStatusDictionary,
  getStageStatusPressureIds,
  selectAutoCleanseMedicine,
  selectAutoPreBattleResistanceMedicine
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

  it("selects pre-battle resistance medicine for status-heavy stages", () => {
    const stage = getStage("demon_cult_outpost_1");

    expect(
      getStageStatusPressureIds({
        stage,
        enemies: enemyDefinitions,
        skills: skillDefinitions
      })
    ).toEqual(["poison", "vulnerable"]);
    expect(
      selectAutoPreBattleResistanceMedicine({
        medicines: medicineDefinitions,
        inventory: {
          quiet_meridian_powder: 1,
          purity_draught: 1
        },
        stage,
        enemies: enemyDefinitions,
        skills: skillDefinitions,
        statusDefinitions
      })?.id
    ).toBe("quiet_meridian_powder");

    const result = applyAutoPreBattleResistanceMedicine({
      medicines: medicineDefinitions,
      inventory: {
        quiet_meridian_powder: 1,
        purity_draught: 1
      },
      stage,
      enemies: enemyDefinitions,
      skills: skillDefinitions,
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
