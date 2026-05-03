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

export type CombatantKind = "hero" | "enemy";

export type CombatantInstanceDefinition = {
  definitionId: string;
  kind: CombatantKind;
  instanceId?: string;
  level?: number;
  statsOverride?: DerivedStats;
};

export type TeamInstance = {
  id: TeamId;
  combatants: CombatantInstanceDefinition[];
};

export type CombatantState = {
  instanceId: string;
  definitionId: string;
  kind: CombatantKind;
  name: string;
  team: TeamId;
  outerHp: number;
  innerQi: number;
  maxOuterHp: number;
  maxInnerQi: number;
  stats: DerivedStats;
  skillIds: string[];
  nextActionAt: number;
  skillCooldowns: Record<string, number>;
  isQiBroken: boolean;
  qiBreakEndsAt: number | null;
  lastInnerDamageAt: number | null;
  defeatedAt: number | null;
};

export type BattleEvent =
  | {
      type: "attack";
      time: number;
      sourceId: string;
      targetId: string;
      skillId: string;
      outerDamage: number;
      innerDamage: number;
    }
  | {
      type: "qi_break";
      time: number;
      sourceId: string;
      targetId: string;
      burstDamage: number;
      burstPercent: number;
      endsAt: number;
    }
  | {
      type: "qi_recover";
      time: number;
      targetId: string;
      innerQi: number;
    }
  | {
      type: "backlash";
      time: number;
      sourceId: string;
      damage: number;
    }
  | {
      type: "defeat";
      time: number;
      targetId: string;
      team: TeamId;
    };

export type BattleMetrics = {
  playerOuterDamage: number;
  playerInnerDamage: number;
  enemyOuterDamage: number;
  enemyInnerDamage: number;
  playerQiBreakBurstDamage: number;
  enemyQiBreakBurstDamage: number;
  qiBreaksTriggeredByPlayer: number;
  qiBreaksTriggeredByEnemy: number;
  backlashDamageToEnemies: number;
  backlashDamageToPlayers: number;
  playerEffectiveDps: number;
  enemyEffectiveDps: number;
};

export type SimulateBattleInput = {
  playerTeam: TeamInstance;
  enemyTeam: TeamInstance;
  maxDurationSeconds?: number;
  stepSeconds?: number;
  constants?: CombatFormulaConstants;
};

export type BattleResult = {
  winner: TeamId | "timeout";
  durationSeconds: number;
  events: BattleEvent[];
  finalPlayerTeam: CombatantState[];
  finalEnemyTeam: CombatantState[];
  metrics: BattleMetrics;
};
