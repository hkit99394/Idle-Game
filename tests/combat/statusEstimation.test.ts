import { describe, expect, it } from "vitest";
import {
  calculateStatusApplicationChance,
  calculateStatusDuration,
  calculateStatusTickOuterDamage,
  createStatusDictionary,
  estimateStatusApplication,
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

const targetStats: Pick<BaseStats, "maxOuterHp" | "statusResistance"> = {
  maxOuterHp: 1200,
  statusResistance: 0.2
};

describe("status estimation helpers", () => {
  it("matches core status chance, duration, and tick formulas", () => {
    const effect: ApplyStatusSkillEffect = {
      type: "apply_status",
      statusId: "poison",
      chance: 0.7,
      durationSeconds: 8,
      stacks: 2
    };
    const definition = statusDefinitions.poison;
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
        targetMaxOuterHp: targetStats.maxOuterHp,
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
        targetMaxOuterHp: targetStats.maxOuterHp,
        targetStatusResistance: targetStats.statusResistance,
        stacks: application.stacks,
        expectedApplications: application.expectedApplications
      })
    ).toBeCloseTo(expectedDamage);
  });
});
