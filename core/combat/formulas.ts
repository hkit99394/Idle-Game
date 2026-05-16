import type {
  BaseStats,
  CombatFormulaConstants,
  DamageInput,
  DerivedStats,
  InnerRecoveryInput,
  AiOverloadBurstInput
} from "./types";

export const LEVEL_STAT_GROWTH = 1.06;

const LEVEL_SCALING_STATS = [
  "maxBodyIntegrity",
  "maxContextStability",
  "kineticAttack",
  "cognitiveAttack",
  "kineticDefense",
  "cognitiveDefense"
] as const satisfies Array<keyof BaseStats>;

export const defaultCombatFormulaConstants: CombatFormulaConstants = {
  baseAttackInterval: 2.0,
  minAttackInterval: 0.45,
  maxAttackInterval: 4.0,
  baseAiOverloadBurstPercent: 0.1,
  minAiOverloadBurstPercent: 0.05,
  maxAiOverloadBurstPercent: 0.25,
  overloadedKineticDamageTakenMultiplier: 1.25,
  overloadedCognitiveDamageTakenMultiplier: 0.5,
  aiOverloadFeedbackPercent: 0.03,
  aiOverloadContextRebuildPercent: 0.35,
  aiOverloadDurationSeconds: 6,
  contextRebuildDelaySeconds: 3
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function calculateAttackInterval(
  speed: number,
  constants: CombatFormulaConstants = defaultCombatFormulaConstants
): number {
  const interval = constants.baseAttackInterval / (1 + speed / 100);
  return clamp(interval, constants.minAttackInterval, constants.maxAttackInterval);
}

export function calculateExpectedCritMultiplier(
  critChance: number,
  critDamage: number
): number {
  return 1 + critChance * (critDamage - 1);
}

export function calculateCombatPower(stats: DerivedStats): number {
  const outerDurability = stats.maxBodyIntegrity * (1 + stats.kineticDefense / 100);
  const innerDurability = stats.maxContextStability * (1 + stats.cognitiveDefense / 100) * 0.5;
  const expectedDamage =
    (stats.kineticAttack + stats.cognitiveAttack * 0.8) *
    calculateExpectedCritMultiplier(stats.critChance, stats.critDamage);
  const speedMultiplier = 1 + Math.max(0, stats.speed) / 100;
  const offense = expectedDamage * speedMultiplier * 10;
  const aiOverloadControl =
    (Math.max(0, stats.breachPower) + Math.max(0, stats.overloadResist)) * 500;
  const innerRecovery = stats.maxContextStability * Math.max(0, stats.contextRebuildRate) * 20;
  const statusTenacity = clamp(stats.statusResistance, 0, 0.8) * 600;

  return Math.max(
    1,
    Math.round(
      outerDurability +
        innerDurability +
        offense +
        aiOverloadControl +
        innerRecovery +
        statusTenacity
    )
  );
}

export function scaleStatsForLevel(
  baseStats: BaseStats,
  level: number
): BaseStats {
  const scaledStats: BaseStats = { ...baseStats };
  const safeLevel = Number.isFinite(level)
    ? Math.max(1, Math.floor(level))
    : 1;
  const multiplier = LEVEL_STAT_GROWTH ** (safeLevel - 1);

  for (const stat of LEVEL_SCALING_STATS) {
    scaledStats[stat] *= multiplier;
  }

  return scaledStats;
}

export function calculateOuterDamage(
  input: DamageInput,
  constants: CombatFormulaConstants = defaultCombatFormulaConstants
): number {
  const styleMultiplier = input.styleMultiplier ?? 1;
  const critMultiplier =
    input.critMultiplier ??
    calculateExpectedCritMultiplier(input.attacker.critChance, input.attacker.critDamage);
  const rawDamage =
    input.attacker.kineticAttack *
    input.skillMultiplier *
    styleMultiplier *
    critMultiplier;
  const mitigation = 100 / (100 + input.target.kineticDefense);
  const brokenMultiplier = input.targetIsOverloaded
    ? constants.overloadedKineticDamageTakenMultiplier
    : 1;

  return rawDamage * mitigation * brokenMultiplier;
}

export function calculateInnerDamage(
  input: DamageInput,
  constants: CombatFormulaConstants = defaultCombatFormulaConstants
): number {
  const styleMultiplier = input.styleMultiplier ?? 1;
  const rawDamage = input.attacker.cognitiveAttack * input.skillMultiplier * styleMultiplier;
  const mitigation = 100 / (100 + input.target.cognitiveDefense);
  const brokenMultiplier = input.targetIsOverloaded
    ? constants.overloadedCognitiveDamageTakenMultiplier
    : 1;

  return rawDamage * mitigation * brokenMultiplier;
}

export function calculateAiOverloadBurst(
  input: AiOverloadBurstInput,
  constants: CombatFormulaConstants = defaultCombatFormulaConstants
): { percent: number; damage: number } {
  const percent = clamp(
    constants.baseAiOverloadBurstPercent +
      (input.attackerBreachPower ?? 0) -
      (input.targetOverloadResist ?? 0),
    constants.minAiOverloadBurstPercent,
    constants.maxAiOverloadBurstPercent
  );

  return {
    percent,
    damage: input.targetMaxBodyIntegrity * percent
  };
}

export function calculateAiOverloadFeedbackDamage(
  attackerMaxBodyIntegrity: number,
  constants: CombatFormulaConstants = defaultCombatFormulaConstants
): number {
  return attackerMaxBodyIntegrity * constants.aiOverloadFeedbackPercent;
}

export function calculateAiOverloadContextRebuild(
  maxContextStability: number,
  constants: CombatFormulaConstants = defaultCombatFormulaConstants
): number {
  return maxContextStability * constants.aiOverloadContextRebuildPercent;
}

export function calculateInnerRecovery(
  input: InnerRecoveryInput
): number {
  const recovered =
    input.currentContextStability +
    input.maxContextStability * input.contextRebuildRate * input.deltaSeconds;

  return Math.min(input.maxContextStability, recovered);
}

export function deriveStats(baseStats: DerivedStats): DerivedStats {
  return { ...baseStats };
}
