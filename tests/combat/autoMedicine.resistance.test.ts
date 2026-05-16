import { describe, expect, it } from "vitest";
import {
  applyAutoCleanseMedicine,
  applyAutoPreBattleResistanceMedicine,
  applyStatusEffect,
  createStatusDictionary,
  defaultAutoMedicinePreferences,
  getPreBattleResistancePolicyDecision,
  getStageStatusPressureIds,
  getStageStatusPressureProfile,
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
const enemyDefinitions = enemies as unknown as EnemyDefinition[];
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
  regionId: "greenline_approach",
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

const bossStatusPressureStage: StageDefinition = {
  ...statusPressureStage,
  id: "test_boss_status_pressure",
  name: "Boss Status Pressure Test",
  isBoss: true
};

const eliteStatusPressureStage: StageDefinition = {
  ...statusPressureStage,
  id: "test_elite_status_pressure",
  name: "Elite Status Pressure Test",
  enemyTeam: {
    combatantIds: ["test_elite_status_pressure_enemy"]
  }
};

const statusLightStage: StageDefinition = {
  ...statusPressureStage,
  id: "test_status_light",
  name: "Status Light Test",
  enemyTeam: {
    combatantIds: ["test_status_light_enemy"]
  }
};

const statusPressureEnemies: EnemyDefinition[] = [
  ...enemyDefinitions,
  {
    ...enemyDefinitions[0],
    id: "test_status_pressure_enemy",
    skillIds: ["test_poison_hex", "test_vulnerability_hex"]
  },
  {
    ...enemyDefinitions[0],
    id: "test_elite_status_pressure_enemy",
    type: "elite",
    skillIds: ["test_poison_hex", "test_vulnerability_hex"]
  },
  {
    ...enemyDefinitions[0],
    id: "test_status_light_enemy",
    skillIds: ["test_poison_hex"]
  }
];

const statusPressureSkills: SkillDefinition[] = [
  ...skillDefinitions,
  {
    id: "test_poison_hex",
    name: "Test Corruption Hex",
    cooldownSeconds: 1,
    kineticMultiplier: 0,
    cognitiveMultiplier: 0,
    targetRule: "first_living",
    effects: [
      {
        type: "apply_status",
        statusId: "corruption",
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
    kineticMultiplier: 0,
    cognitiveMultiplier: 0,
    targetRule: "first_living",
    effects: [
      {
        type: "apply_status",
        statusId: "exposed",
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

describe("auto medicine resistance", () => {
  it("selects pre-battle resistance medicine for status-heavy stages", () => {
    expect(
      getStageStatusPressureIds({
        stage: statusPressureStage,
        enemies: statusPressureEnemies,
        skills: statusPressureSkills
      })
    ).toEqual(["corruption", "exposed"]);
    expect(
      getStageStatusPressureProfile({
        stage: statusPressureStage,
        enemies: statusPressureEnemies,
        skills: statusPressureSkills,
        statusDefinitions
      })
    ).toMatchObject({
      statusSkillCount: 2,
      statusCategoryCount: 2,
      isBossOrEliteStage: false,
      isStatusHeavy: true
    });
    expect(
      selectAutoPreBattleResistanceMedicine({
        medicines: medicineDefinitions,
        inventory: {
          quiet_context_powder: 1,
          purity_countermeasure: 1
        },
        stage: statusPressureStage,
        enemies: statusPressureEnemies,
        skills: statusPressureSkills,
        statusDefinitions,
        preferences: {
          ...defaultAutoMedicinePreferences,
          preBattleResistanceMode: "status_heavy"
        }
      })?.id
    ).toBe("quiet_context_powder");

    const result = applyAutoPreBattleResistanceMedicine({
      medicines: medicineDefinitions,
      inventory: {
        quiet_context_powder: 1,
        purity_countermeasure: 1
      },
      stage: statusPressureStage,
      enemies: statusPressureEnemies,
      skills: statusPressureSkills,
      statusDefinitions,
      preferences: {
        ...defaultAutoMedicinePreferences,
        preBattleResistanceMode: "status_heavy"
      }
    });

    expect(result.usedMedicine).toMatchObject({
      trigger: "pre_battle_resistance",
      medicineId: "quiet_context_powder",
      statusResistanceBonus: 0.12,
      statusResistanceDurationSeconds: 12
    });
    expect(result.inventory.quiet_context_powder).toBeUndefined();
    expect(result.inventory.purity_countermeasure).toBe(1);
  });

  it("applies pre-battle resistance policy modes deterministically", () => {
    const baseInput = {
      medicines: medicineDefinitions,
      inventory: {
        quiet_context_powder: 1
      },
      stage: statusPressureStage,
      enemies: statusPressureEnemies,
      skills: statusPressureSkills,
      statusDefinitions
    };

    expect(
      getPreBattleResistancePolicyDecision({
        ...baseInput,
        preferences: {
          ...defaultAutoMedicinePreferences,
          preBattleResistanceMode: "off"
        }
      })
    ).toMatchObject({
      allowed: false,
      skippedReason: "policy_disabled"
    });
    expect(
      selectAutoPreBattleResistanceMedicine({
        ...baseInput,
        preferences: {
          ...defaultAutoMedicinePreferences,
          preBattleResistanceMode: "boss_and_elite"
        }
      })
    ).toBeNull();
    expect(
      getPreBattleResistancePolicyDecision({
        ...baseInput,
        preferences: {
          ...defaultAutoMedicinePreferences,
          preBattleResistanceMode: "boss_and_elite"
        }
      })
    ).toMatchObject({
      allowed: false,
      skippedReason: "stage_below_policy_threshold"
    });
    expect(
      selectAutoPreBattleResistanceMedicine({
        ...baseInput,
        preferences: {
          ...defaultAutoMedicinePreferences,
          preBattleResistanceMode: "status_heavy"
        }
      })?.id
    ).toBe("quiet_context_powder");
    expect(
      selectAutoPreBattleResistanceMedicine({
        ...baseInput,
        preferences: {
          ...defaultAutoMedicinePreferences,
          preBattleResistanceMode: "always_when_recommended"
        }
      })?.id
    ).toBe("quiet_context_powder");
  });

  it("uses boss and elite policy for boss or elite status-pressure stages", () => {
    const preferences = {
      ...defaultAutoMedicinePreferences,
      preBattleResistanceMode: "boss_and_elite" as const
    };

    expect(
      selectAutoPreBattleResistanceMedicine({
        medicines: medicineDefinitions,
        inventory: {
          quiet_context_powder: 1
        },
        stage: bossStatusPressureStage,
        enemies: statusPressureEnemies,
        skills: statusPressureSkills,
        statusDefinitions,
        preferences
      })?.id
    ).toBe("quiet_context_powder");
    expect(
      selectAutoPreBattleResistanceMedicine({
        medicines: medicineDefinitions,
        inventory: {
          quiet_context_powder: 1
        },
        stage: eliteStatusPressureStage,
        enemies: statusPressureEnemies,
        skills: statusPressureSkills,
        statusDefinitions,
        preferences
      })?.id
    ).toBe("quiet_context_powder");
  });

  it("does not consume resistance medicine for light stages below policy threshold", () => {
    for (const preBattleResistanceMode of [
      "boss_and_elite",
      "status_heavy"
    ] as const) {
      const result = applyAutoPreBattleResistanceMedicine({
        medicines: medicineDefinitions,
        inventory: {
          quiet_context_powder: 1
        },
        stage: statusLightStage,
        enemies: statusPressureEnemies,
        skills: statusPressureSkills,
        statusDefinitions,
        preferences: {
          ...defaultAutoMedicinePreferences,
          preBattleResistanceMode
        }
      });

      expect(result).toMatchObject({
        inventory: {
          quiet_context_powder: 1
        },
        usedMedicine: null,
        skippedReason: "stage_below_policy_threshold"
      });
    }
  });

  it("keeps always-when-recommended aggressive for light status stages", () => {
    expect(
      applyAutoPreBattleResistanceMedicine({
        medicines: medicineDefinitions,
        inventory: {
          quiet_context_powder: 1
        },
        stage: statusLightStage,
        enemies: statusPressureEnemies,
        skills: statusPressureSkills,
        statusDefinitions,
        preferences: {
          ...defaultAutoMedicinePreferences,
          preBattleResistanceMode: "always_when_recommended"
        }
      })
    ).toMatchObject({
      usedMedicine: {
        medicineId: "quiet_context_powder"
      },
      skippedReason: null
    });
  });

  it("skips disabled pre-battle resistance medicine", () => {
    const preferences = setMedicineAutoUsePreference(
      {
        ...defaultAutoMedicinePreferences,
        preBattleResistanceMode: "status_heavy"
      },
      "quiet_context_powder",
      false
    );

    expect(
      selectAutoPreBattleResistanceMedicine({
        medicines: medicineDefinitions,
        inventory: {
          quiet_context_powder: 1,
          purity_countermeasure: 1
        },
        stage: statusPressureStage,
        enemies: statusPressureEnemies,
        skills: statusPressureSkills,
        statusDefinitions,
        preferences
      })?.id
    ).toBe("purity_countermeasure");

    const result = applyAutoPreBattleResistanceMedicine({
      medicines: medicineDefinitions,
      inventory: {
        quiet_context_powder: 1,
        purity_countermeasure: 1
      },
      stage: statusPressureStage,
      enemies: statusPressureEnemies,
      skills: statusPressureSkills,
      statusDefinitions,
      preferences
    });

    expect(result.usedMedicine?.medicineId).toBe("purity_countermeasure");
    expect(result.inventory.quiet_context_powder).toBe(1);
    expect(result.inventory.purity_countermeasure).toBeUndefined();
  });
});
