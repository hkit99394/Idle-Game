import type {
  CombatFormulaConstants,
  DamageInput,
  DerivedStats,
  InnerRecoveryInput,
  QiBreakBurstInput
} from "./types";

export const defaultCombatFormulaConstants: CombatFormulaConstants = {
  baseAttackInterval: 2.0,
  minAttackInterval: 0.45,
  maxAttackInterval: 4.0,
  baseQiBreakBurstPercent: 0.1,
  minQiBreakBurstPercent: 0.05,
  maxQiBreakBurstPercent: 0.25,
  qiBrokenOuterDamageTakenMultiplier: 1.25,
  qiBrokenInnerDamageTakenMultiplier: 0.5,
  qiBreakBacklashPercent: 0.03,
  qiBreakRecoveryPercent: 0.35,
  qiBreakDurationSeconds: 6,
  innerRecoveryDelaySeconds: 3
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

export function calculateOuterDamage(
  input: DamageInput,
  constants: CombatFormulaConstants = defaultCombatFormulaConstants
): number {
  const styleMultiplier = input.styleMultiplier ?? 1;
  const critMultiplier =
    input.critMultiplier ??
    calculateExpectedCritMultiplier(input.attacker.critChance, input.attacker.critDamage);
  const rawDamage =
    input.attacker.outerAttack *
    input.skillMultiplier *
    styleMultiplier *
    critMultiplier;
  const mitigation = 100 / (100 + input.target.outerDefense);
  const brokenMultiplier = input.targetIsQiBroken
    ? constants.qiBrokenOuterDamageTakenMultiplier
    : 1;

  return rawDamage * mitigation * brokenMultiplier;
}

export function calculateInnerDamage(
  input: DamageInput,
  constants: CombatFormulaConstants = defaultCombatFormulaConstants
): number {
  const styleMultiplier = input.styleMultiplier ?? 1;
  const rawDamage = input.attacker.innerAttack * input.skillMultiplier * styleMultiplier;
  const mitigation = 100 / (100 + input.target.innerDefense);
  const brokenMultiplier = input.targetIsQiBroken
    ? constants.qiBrokenInnerDamageTakenMultiplier
    : 1;

  return rawDamage * mitigation * brokenMultiplier;
}

export function calculateQiBreakBurst(
  input: QiBreakBurstInput,
  constants: CombatFormulaConstants = defaultCombatFormulaConstants
): { percent: number; damage: number } {
  const percent = clamp(
    constants.baseQiBreakBurstPercent +
      (input.attackerBreakPower ?? 0) -
      (input.targetBreakResist ?? 0),
    constants.minQiBreakBurstPercent,
    constants.maxQiBreakBurstPercent
  );

  return {
    percent,
    damage: input.targetMaxOuterHp * percent
  };
}

export function calculateQiBreakBacklashDamage(
  attackerMaxOuterHp: number,
  constants: CombatFormulaConstants = defaultCombatFormulaConstants
): number {
  return attackerMaxOuterHp * constants.qiBreakBacklashPercent;
}

export function calculateQiBreakRecovery(
  maxInnerQi: number,
  constants: CombatFormulaConstants = defaultCombatFormulaConstants
): number {
  return maxInnerQi * constants.qiBreakRecoveryPercent;
}

export function calculateInnerRecovery(
  input: InnerRecoveryInput
): number {
  const recovered =
    input.currentInnerQi +
    input.maxInnerQi * input.innerRecoveryRate * input.deltaSeconds;

  return Math.min(input.maxInnerQi, recovered);
}

export function deriveStats(baseStats: DerivedStats): DerivedStats {
  return { ...baseStats };
}
