import type { FormationSlot } from "./formations";
import type { CombatRole } from "./roles";
import type { MartialStyleId } from "./styles";

export type TeamId = "player" | "enemy";

export type MvpStyle = MartialStyleId;

export type TargetRule =
  | "first_living"
  | "weakest_hp"
  | "highest_cp"
  | "inner_broken";

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

export type TimedCombatEffect = {
  value: number;
  sourceId: string;
  skillId: string;
  expiresAt: number;
};

export type CombatantInstanceDefinition = {
  definitionId: string;
  kind: CombatantKind;
  instanceId?: string;
  formationSlot?: FormationSlot;
  level?: number;
  statsOverride?: DerivedStats;
  damageMultipliersByFamily?: Record<string, number>;
  skillUpgradeLevels?: Record<string, number>;
};

export type TeamInstance = {
  id: TeamId;
  combatants: CombatantInstanceDefinition[];
};

export type CombatantState = {
  instanceId: string;
  definitionId: string;
  kind: CombatantKind;
  level: number;
  formationSlot: FormationSlot;
  combatRole: CombatRole;
  family?: string;
  name: string;
  team: TeamId;
  outerHp: number;
  innerQi: number;
  maxOuterHp: number;
  maxInnerQi: number;
  stats: DerivedStats;
  damageMultipliersByFamily: Record<string, number>;
  skillUpgradeLevels: Record<string, number>;
  skillIds: string[];
  nextActionAt: number;
  skillCooldowns: Record<string, number>;
  isQiBroken: boolean;
  qiBreakEndsAt: number | null;
  lastInnerDamageAt: number | null;
  guard: TimedCombatEffect | null;
  protection: TimedCombatEffect | null;
  armorBreak: TimedCombatEffect | null;
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
      intendedTargetId?: string;
    }
  | {
      type: "guard";
      time: number;
      sourceId: string;
      targetId: string;
      skillId: string;
      reduction: number;
      endsAt: number;
    }
  | {
      type: "guard_absorb";
      time: number;
      targetId: string;
      skillId: string;
      outerDamagePrevented: number;
      reduction: number;
    }
  | {
      type: "protect";
      time: number;
      sourceId: string;
      protectedId: string;
      attackerId: string;
      skillId: string;
      outerDamagePrevented: number;
      innerDamagePrevented: number;
      reduction: number;
    }
  | {
      type: "armor_break";
      time: number;
      sourceId: string;
      targetId: string;
      skillId: string;
      reduction: number;
      endsAt: number;
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
      type: "heal";
      time: number;
      sourceId: string;
      targetId: string;
      outerHealing: number;
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
  guardDamagePreventedByPlayer: number;
  guardDamagePreventedByEnemy: number;
  protectionDamagePreventedByPlayer: number;
  protectionDamagePreventedByEnemy: number;
  armorBreaksTriggeredByPlayer: number;
  armorBreaksTriggeredByEnemy: number;
  playerEffectiveDps: number;
  enemyEffectiveDps: number;
};

export type BattleContribution = {
  instanceId: string;
  definitionId: string;
  kind: CombatantKind;
  team: TeamId;
  name: string;
  formationSlot: FormationSlot;
  combatRole: CombatRole;
  outerDamageDealt: number;
  innerDamageDealt: number;
  qiBreakBurstDamageDealt: number;
  qiBreaksTriggered: number;
  outerDamageTaken: number;
  innerDamageTaken: number;
  backlashDamageTaken: number;
  guardDamagePrevented: number;
  protectionDamagePrevented: number;
  protectionTriggers: number;
  armorBreaksApplied: number;
  survived: boolean;
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
  contributions: BattleContribution[];
};
