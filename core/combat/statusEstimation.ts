import type {
  BaseStats,
  StatusEffectDefinition
} from "./types";
import {
  calculateStatusApplicationChance,
  calculateStatusDuration,
  calculateStatusTickOuterDamage
} from "./statusEffects";
import type { ApplyStatusSkillEffect } from "../data/types";

export type StatusApplicationEstimate = {
  chance: number;
  expectedApplications: number;
  durationSeconds: number;
  resistedDurationSeconds: number;
  stacks: number;
};

export function estimateStatusApplication(input: {
  effect: ApplyStatusSkillEffect;
  definition: StatusEffectDefinition;
  attackerStats: Pick<BaseStats, "statusAccuracy">;
  targetStats: Pick<BaseStats, "statusResistance">;
  casts: number;
}): StatusApplicationEstimate {
  const chance = calculateStatusApplicationChance({
    baseChance: input.effect.chance,
    attackerStatusAccuracy: input.attackerStats.statusAccuracy,
    targetStatusResistance: input.targetStats.statusResistance
  });
  const durationSeconds = input.effect.durationSeconds;
  const resistedDurationSeconds = calculateStatusDuration(
    durationSeconds,
    input.targetStats.statusResistance
  );

  return {
    chance,
    expectedApplications: input.casts * chance,
    durationSeconds,
    resistedDurationSeconds,
    stacks: input.effect.stacks ?? 1
  };
}

export function estimateStatusTickDamage(input: {
  definition: StatusEffectDefinition;
  resistedDurationSeconds: number;
  targetMaxBodyIntegrity: number;
  targetStatusResistance: number;
  stacks: number;
  expectedApplications: number;
}): number {
  if (input.definition.tickIntervalSeconds === undefined) {
    return 0;
  }

  const damagePerTick = calculateStatusTickOuterDamage({
    definition: input.definition,
    targetMaxBodyIntegrity: input.targetMaxBodyIntegrity,
    stacks: input.stacks,
    targetStatusResistance: input.targetStatusResistance
  });
  const expectedTicks =
    input.resistedDurationSeconds / input.definition.tickIntervalSeconds;

  return damagePerTick * expectedTicks * input.expectedApplications;
}

export function estimateStatusHealingDenied(input: {
  definition: StatusEffectDefinition;
  stacks: number;
  expectedApplications: number;
  durationSeconds: number;
  resistedDurationSeconds: number;
}): number {
  const multiplier = input.definition.effects.healingReceivedMultiplier;

  if (multiplier === undefined || input.durationSeconds <= 0) {
    return 0;
  }

  const durationRatio = input.resistedDurationSeconds / input.durationSeconds;

  return (
    (1 - multiplier ** input.stacks) *
    20 *
    input.expectedApplications *
    durationRatio
  );
}

export function estimateStatusModifierDamage(input: {
  definition: StatusEffectDefinition;
  stacks: number;
  expectedApplications: number;
  resistedDurationSeconds: number;
  targetMaxBodyIntegrity: number;
  enemyDps: number;
  playerAttackEventsPerSecond: number;
}): number {
  const vulnerabilityMultiplier =
    input.definition.effects.kineticDamageTakenMultiplier === undefined
      ? 1
      : input.definition.effects.kineticDamageTakenMultiplier ** input.stacks;
  const vulnerabilityDamage =
    vulnerabilityMultiplier > 1
      ? input.enemyDps *
        (vulnerabilityMultiplier - 1) *
        input.resistedDurationSeconds *
        input.expectedApplications
      : 0;
  const backlashDamage =
    input.definition.effects.feedbackBodyIntegrityPercent === undefined
      ? 0
      : input.targetMaxBodyIntegrity *
        input.definition.effects.feedbackBodyIntegrityPercent *
        input.stacks *
        input.playerAttackEventsPerSecond *
        input.resistedDurationSeconds *
        input.expectedApplications;

  return vulnerabilityDamage + backlashDamage;
}
