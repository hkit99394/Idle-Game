import { describe, expect, it } from "vitest";
import {
  buildMedicineCounterplayViewModels,
  buildStageCounterplayPreview,
  createInitialPlayerProgress,
  defaultAutoMedicinePreferences
} from "../../core";
import type {
  EnemyDefinition,
  SkillDefinition,
  StageDefinition,
  StaticGameData
} from "../../core";
import { staticData } from "../helpers/staticData";

function getStage(stageId: string) {
  const stage = staticData.stages.find((entry) => entry.id === stageId);

  if (stage === undefined) {
    throw new Error(`Missing stage ${stageId}`);
  }

  return stage;
}

const statusPreviewStage: StageDefinition = {
  id: "test_status_counterplay",
  regionId: "greenline_approach",
  index: 11,
  name: "Status Counterplay Test",
  enemyTeam: {
    combatantIds: ["test_status_counterplay_enemy"]
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

const statusPreviewData: StaticGameData = {
  ...staticData,
  enemies: [
    ...staticData.enemies,
    {
      ...staticData.enemies[0],
      id: "test_status_counterplay_enemy",
      skillIds: [
        "test_poison_hex",
        "test_meridian_lock",
        "test_vulnerability_hex",
        "test_wound_hex"
      ]
    } as EnemyDefinition
  ],
  skills: [
    ...staticData.skills,
    {
      id: "test_poison_hex",
      name: "Test Corruption Hex",
      cooldownSeconds: 1,
      outerMultiplier: 0,
      innerMultiplier: 0,
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
      id: "test_meridian_lock",
      name: "Test Meridian Lock",
      cooldownSeconds: 1,
      outerMultiplier: 0,
      innerMultiplier: 0,
      targetRule: "first_living",
      effects: [
        {
          type: "apply_status",
          statusId: "context_suppression",
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
          statusId: "exposed",
          chance: 1,
          durationSeconds: 8,
          stacks: 1
        }
      ]
    },
    {
      id: "test_wound_hex",
      name: "Test Trauma Hex",
      cooldownSeconds: 1,
      outerMultiplier: 0,
      innerMultiplier: 0,
      targetRule: "first_living",
      effects: [
        {
          type: "apply_status",
          statusId: "trauma",
          chance: 1,
          durationSeconds: 8,
          stacks: 1
        }
      ]
    }
  ] as SkillDefinition[],
  stages: [...staticData.stages, statusPreviewStage]
};

describe("counterplay preview", () => {
  it("groups medicine by unlock, ownership, and auto eligibility", () => {
    const rows = buildMedicineCounterplayViewModels({
      data: staticData,
      progress: {
        greenline_approach: {
          highestClearedStageIndex: 10
        }
      },
      inventory: {
        clear_heart_countermeasure: 3,
        quiet_context_powder: 1
      },
      preferences: {
        ...defaultAutoMedicinePreferences,
        disabledMedicineIds: ["clear_heart_countermeasure"]
      }
    });

    expect(rows).toEqual([
      expect.objectContaining({
        id: "clear_heart_countermeasure",
        count: 3,
        unlocked: true,
        owned: true,
        disabled: true,
        autoUseEnabled: false,
        autoUseLabel: "Auto Off",
        autoEligible: false,
        availability: "disabled"
      }),
      expect.objectContaining({
        id: "quiet_context_powder",
        count: 1,
        unlocked: false,
        owned: true,
        disabled: false,
        autoUseEnabled: true,
        autoUseLabel: "Auto On",
        autoEligible: false,
        availability: "locked"
      }),
      expect.objectContaining({
        id: "purity_countermeasure",
        count: 0,
        unlocked: false,
        owned: false,
        disabled: false,
        autoUseEnabled: true,
        autoUseLabel: "Auto On",
        autoEligible: false,
        availability: "locked"
      })
    ]);
  });

  it("previews stage status pressure and recommended counterplay", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.sect.upgrades.lotus_purity_training = 2;
    const preview = buildStageCounterplayPreview({
      data: statusPreviewData,
      stage: statusPreviewStage,
      inventory: {
        clear_heart_countermeasure: 2,
        quiet_context_powder: 1,
        purity_countermeasure: 1
      },
      progress,
      preferences: {
        ...defaultAutoMedicinePreferences,
        preBattleResistanceMode: "always_when_recommended"
      }
    });

    expect(preview.statusPressureIds).toEqual([
      "context_suppression",
      "corruption",
      "exposed",
      "trauma"
    ]);
    expect(preview.statusCategories).toEqual([
      "control",
      "damage",
      "vulnerability",
      "recovery"
    ]);
    expect(preview.recommendedMedicineIds).toEqual([
      "quiet_context_powder",
      "clear_heart_countermeasure",
      "purity_countermeasure"
    ]);
    expect(preview).toMatchObject({
      preBattleResistanceMode: "always_when_recommended",
      preBattleResistanceModeLabel: "Always When Recommended",
      preBattleResistancePolicyReason: null
    });
    expect(preview.recommendationText).toBe(
      "Expected Context Suppression, Corruption, Exposed, Trauma. Recommended auto medicine: Quiet Context Powder, Clear Heart Countermeasure, Purity Countermeasure."
    );
    expect(preview.supportResistanceBonus).toBeCloseTo(0.08);
    expect(preview.supportContributionText).toBe(
      "Lotus Purge Training Lv 2 adds 8% team status resistance before the cap."
    );
  });

  it("shows no recommendation for stages without status pressure", () => {
    expect(
      buildStageCounterplayPreview({
        data: staticData,
        stage: getStage("greenline_approach_1"),
        inventory: {
          clear_heart_countermeasure: 2
        }
      })
    ).toMatchObject({
      statusPressureIds: [],
      statusCategories: [],
      recommendedMedicineIds: [],
      recommendationText: "No major status pressure expected.",
      preBattleResistanceMode: "boss_and_elite",
      preBattleResistanceModeLabel: "Boss And Elite",
      preBattleResistancePolicyReason: "no_status_pressure"
    });
  });

  it("respects disabled medicine preferences in stage recommendations", () => {
    const preview = buildStageCounterplayPreview({
      data: statusPreviewData,
      stage: statusPreviewStage,
      inventory: {
        clear_heart_countermeasure: 2,
        quiet_context_powder: 1
      },
      preferences: {
        ...defaultAutoMedicinePreferences,
        disabledMedicineIds: ["quiet_context_powder"]
      }
    });

    expect(preview.recommendedMedicineIds).toEqual(["clear_heart_countermeasure"]);
  });
});
