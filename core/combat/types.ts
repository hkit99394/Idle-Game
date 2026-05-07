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
  statusAccuracy: number;
  statusResistance: number;
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

export type StatusCategory =
  | "damage"
  | "control"
  | "vulnerability"
  | "recovery"
  | "backlash";

export type StatusStackPolicy = "refresh" | "stack_intensity";

export type StatusDispelTag =
  | "poison"
  | "wound"
  | "inner"
  | "vulnerability"
  | "backlash"
  | "debuff";

export type StatusEffectModifiers = {
  outerDamagePerSecond?: number;
  healingReceivedMultiplier?: number;
  innerRecoveryMultiplier?: number;
  outerDamageTakenMultiplier?: number;
  attackBacklashOuterHpPercent?: number;
};

export type StatusEffectDefinition = {
  id: string;
  name: string;
  category: StatusCategory;
  durationSeconds: number;
  maxStacks: number;
  stackPolicy: StatusStackPolicy;
  dispelTags: StatusDispelTag[];
  tickIntervalSeconds?: number;
  effects: StatusEffectModifiers;
};

export type ActiveStatusEffect = {
  statusId: string;
  remainingSeconds: number;
  stacks: number;
  nextTickInSeconds?: number;
  sourceTeamId?: TeamId;
  sourceCombatantId?: string;
};

export type StatusApplicationInput = {
  activeStatuses: ActiveStatusEffect[];
  definition: StatusEffectDefinition;
  durationSeconds?: number;
  stacks?: number;
  sourceTeamId?: TeamId;
  sourceCombatantId?: string;
};

export type StatusApplicationResult = {
  statuses: ActiveStatusEffect[];
  applied: ActiveStatusEffect;
  refreshed: boolean;
};

export type StatusAdvanceInput = {
  activeStatuses: ActiveStatusEffect[];
  definitions: Record<string, StatusEffectDefinition>;
  deltaSeconds: number;
  targetMaxOuterHp: number;
};

export type StatusTickEvent = {
  type: "status_tick";
  statusId: string;
  stacks: number;
  outerDamage: number;
};

export type StatusExpireEvent = {
  type: "status_expire";
  statusId: string;
};

export type StatusAdvanceEvent = StatusTickEvent | StatusExpireEvent;

export type StatusAdvanceResult = {
  statuses: ActiveStatusEffect[];
  events: StatusAdvanceEvent[];
};

export type StatusCleanseInput = {
  activeStatuses: ActiveStatusEffect[];
  definitions: Record<string, StatusEffectDefinition>;
  dispelTags: StatusDispelTag[];
  maxCount?: number;
};

export type StatusCleanseResult = {
  statuses: ActiveStatusEffect[];
  cleansed: ActiveStatusEffect[];
};

export type StatusApplicationChanceInput = {
  baseChance: number;
  attackerStatusAccuracy?: number;
  targetStatusResistance?: number;
  minimumChance?: number;
  maximumChance?: number;
};

export type StatusCombatModifiers = {
  healingReceivedMultiplier: number;
  innerRecoveryMultiplier: number;
  outerDamageTakenMultiplier: number;
  attackBacklashOuterHpPercent: number;
};
