import { describe, expect, it } from "vitest";
import {
  calculateStatusApplicationChance,
  calculateStatusDuration,
  calculateStatusTickOuterDamage,
  createStatusDictionary,
  estimateStatusApplication,
  estimateStatusModifierDamage,
  estimateStatusTickDamage
} from "../../core";
import type {
  ApplyStatusSkillEffect,
  BaseStats,
  StatusEffectDefinition
} from "../../core";
import statusEffects from "../../data/statusEffects.json" with { type: "json" };

const statusDefinitions = createStatusDictionary(
  statusEffects as StatusEffectDefinition[]
);

const attackerStats: Pick<BaseStats, "statusAccuracy"> = {
  statusAccuracy: 0.12
};

const targetStats: Pick<BaseStats, "maxBodyIntegrity" | "statusResistance"> = {
  maxBodyIntegrity: 1200,
  statusResistance: 0.2
};

describe("status estimation helpers", () => {
  it("matches core status chance, duration, and tick formulas", () => {
    const effect: ApplyStatusSkillEffect = {
      type: "apply_status",
      statusId: "corruption",
      chance: 0.7,
      durationSeconds: 8,
      stacks: 2
    };
    const definition = statusDefinitions.corruption;
    const casts = 3.5;
    const application = estimateStatusApplication({
      effect,
      definition,
      attackerStats,
      targetStats,
      casts
    });
    const expectedChance = calculateStatusApplicationChance({
      baseChance: effect.chance,
      attackerStatusAccuracy: attackerStats.statusAccuracy,
      targetStatusResistance: targetStats.statusResistance
    });
    const expectedDuration = calculateStatusDuration(
      effect.durationSeconds,
      targetStats.statusResistance
    );
    const expectedDamage =
      calculateStatusTickOuterDamage({
        definition,
        targetMaxBodyIntegrity: targetStats.maxBodyIntegrity,
        stacks: effect.stacks ?? 1,
        targetStatusResistance: targetStats.statusResistance
      }) *
      (expectedDuration / (definition.tickIntervalSeconds ?? 1)) *
      casts *
      expectedChance;

    expect(application).toEqual({
      chance: expectedChance,
      expectedApplications: casts * expectedChance,
      durationSeconds: 8,
      resistedDurationSeconds: expectedDuration,
      stacks: 2
    });
    expect(
      estimateStatusTickDamage({
        definition,
        resistedDurationSeconds: application.resistedDurationSeconds,
        targetMaxBodyIntegrity: targetStats.maxBodyIntegrity,
        targetStatusResistance: targetStats.statusResistance,
        stacks: application.stacks,
        expectedApplications: application.expectedApplications
      })
    ).toBeCloseTo(expectedDamage);
  });

  it("estimates Cognitive vulnerability modifier damage", () => {
    const definition: StatusEffectDefinition = {
      id: "scenario_intrusion",
      name: "Scenario Intrusion",
      category: "control",
      durationSeconds: 6,
      maxStacks: 2,
      stackPolicy: "stack_intensity",
      dispelTags: ["debuff"],
      effects: {
        cognitiveDamageTakenMultiplier: 1.2
      }
    };

    expect(
      estimateStatusModifierDamage({
        definition,
        stacks: 2,
        expectedApplications: 1.5,
        resistedDurationSeconds: 4,
        targetMaxBodyIntegrity: 1200,
        enemyDps: 100,
        cognitiveDps: 80,
        playerAttackEventsPerSecond: 0.35
      })
    ).toBeCloseTo(80 * (1.2 ** 2 - 1) * 4 * 1.5);
  });
});
