export type TeamId = "player" | "enemy";

export type MvpStyle = "fist" | "palm" | "sword" | "staff";

export type TargetRule = "first_living";

export type BaseStats = {
  maxOuterHp: number;
  maxInnerQi: number;
  outerAttack: number;
  innerAttack: number;
  outerDefense: number;
  innerDefense: number;
  speed: number;
  critChance: number;
  critDamage: number;
  breakPower: number;
  breakResist: number;
  innerRecoveryRate: number;
};

export type DerivedStats = BaseStats;

export type CombatFormulaConstants = {
  baseAttackInterval: number;
  minAttackInterval: number;
  maxAttackInterval: number;
  baseQiBreakBurstPercent: number;
  minQiBreakBurstPercent: number;
  maxQiBreakBurstPercent: number;
  qiBrokenOuterDamageTakenMultiplier: number;
  qiBrokenInnerDamageTakenMultiplier: number;
  qiBreakBacklashPercent: number;
  qiBreakRecoveryPercent: number;
  qiBreakDurationSeconds: number;
  innerRecoveryDelaySeconds: number;
};

export type DamageInput = {
  attacker: Pick<DerivedStats, "outerAttack" | "innerAttack" | "critChance" | "critDamage">;
  target: Pick<DerivedStats, "outerDefense" | "innerDefense">;
  skillMultiplier: number;
  styleMultiplier?: number;
  targetIsQiBroken?: boolean;
  critMultiplier?: number;
};

export type QiBreakBurstInput = {
  targetMaxOuterHp: number;
  attackerBreakPower?: number;
  targetBreakResist?: number;
};

export type InnerRecoveryInput = {
  maxInnerQi: number;
  currentInnerQi: number;
  innerRecoveryRate: number;
  deltaSeconds: number;
};
