import type { FormationSlot } from "./formations";
import type { CombatRole } from "./roles";
import type { MartialStyleId } from "./styles";
import type {
  AutoMedicinePreferences,
  AutoMedicineUseSummary
} from "./autoMedicine/types";
import type {
  EnemyDefinition,
  MedicineDefinition,
  SkillDefinition,
  StageDefinition
} from "../data/types";

export type TeamId = "player" | "enemy";

export type MvpStyle = MartialStyleId;

export type TargetRule =
  | "first_living"
  | "weakest_hp"
  | "highest_cp"
  | "inner_broken";

export type BaseStats = {
  maxBodyIntegrity: number;
  maxContextStability: number;
  kineticAttack: number;
  cognitiveAttack: number;
  kineticDefense: number;
  cognitiveDefense: number;
  speed: number;
  critChance: number;
  critDamage: number;
  breachPower: number;
  overloadResist: number;
  contextRebuildRate: number;
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
  overloadedKineticDamageTakenMultiplier: number;
  overloadedCognitiveDamageTakenMultiplier: number;
  aiOverloadFeedbackPercent: number;
  aiOverloadContextRebuildPercent: number;
  aiOverloadDurationSeconds: number;
  contextRebuildDelaySeconds: number;
};

export type DamageInput = {
  attacker: Pick<DerivedStats, "kineticAttack" | "cognitiveAttack" | "critChance" | "critDamage">;
  target: Pick<DerivedStats, "kineticDefense" | "cognitiveDefense">;
  skillMultiplier: number;
  styleMultiplier?: number;
  targetIsOverloaded?: boolean;
  critMultiplier?: number;
};

export type QiBreakBurstInput = {
  targetMaxBodyIntegrity: number;
  attackerBreachPower?: number;
  targetOverloadResist?: number;
};

export type InnerRecoveryInput = {
  maxContextStability: number;
  currentContextStability: number;
  contextRebuildRate: number;
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
  bodyIntegrityDamagePerSecond?: number;
  healingReceivedMultiplier?: number;
  contextRebuildMultiplier?: number;
  kineticDamageTakenMultiplier?: number;
  feedbackBodyIntegrityPercent?: number;
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

export type StatusResistanceFormulaConstants = {
  maxEffectiveResistance: number;
  minimumApplicationChance: number;
  maximumApplicationChance: number;
  durationReductionScale: number;
  tickDamageReductionScale: number;
  minimumDurationSeconds: number;
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
  targetStatusResistance?: number;
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
  targetMaxBodyIntegrity: number;
  targetStatusResistance?: number;
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
  contextRebuildMultiplier: number;
  kineticDamageTakenMultiplier: number;
  feedbackBodyIntegrityPercent: number;
};

export type CombatantKind = "hero" | "enemy";

export type StatusEffectId =
  | "guard"
  | "protection"
  | "armor_break"
  | "wound"
  | "speed_down"
  | "inner_defense_down"
  | "regeneration";

export type CleanseableStatusEffectId =
  | "wound"
  | "armor_break"
  | "speed_down"
  | "inner_defense_down";
export type TimedCombatStatusEffectId = Exclude<StatusEffectId, "regeneration">;

export type StatusEffectStackBehavior = "refresh";

export type TimedCombatEffect = {
  id: TimedCombatStatusEffectId;
  value: number;
  sourceId: string;
  targetId: string;
  skillId: string;
  appliedAt: number;
  durationSeconds: number;
  expiresAt: number;
  stackBehavior: StatusEffectStackBehavior;
};

export type TimedRecoveryEffect = Omit<TimedCombatEffect, "id"> & {
  id: "regeneration";
  nextTickAt: number;
  tickIntervalSeconds: number;
  restores: "outer" | "inner";
};

export type TimedStatusResistanceBonus = {
  value: number;
  medicineId: string;
  appliedAt: number;
  durationSeconds: number;
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
  enemyType?: EnemyDefinition["type"];
  name: string;
  team: TeamId;
  bodyIntegrity: number;
  contextStability: number;
  maxBodyIntegrity: number;
  maxContextStability: number;
  stats: DerivedStats;
  damageMultipliersByFamily: Record<string, number>;
  skillUpgradeLevels: Record<string, number>;
  skillIds: string[];
  nextActionAt: number;
  skillCooldowns: Record<string, number>;
  isOverloaded: boolean;
  overloadEndsAt: number | null;
  lastCognitiveDamageAt: number | null;
  guard: TimedCombatEffect | null;
  protection: TimedCombatEffect | null;
  armorBreak: TimedCombatEffect | null;
  wound: TimedCombatEffect | null;
  speedDown: TimedCombatEffect | null;
  innerDefenseDown: TimedCombatEffect | null;
  statusResistanceBonuses: TimedStatusResistanceBonus[];
  activeStatuses: ActiveStatusEffect[];
  regeneration: TimedRecoveryEffect | null;
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
      statusId: "guard";
      reduction: number;
      endsAt: number;
    }
  | {
      type: "guard_absorb";
      time: number;
      targetId: string;
      skillId: string;
      statusId: "guard";
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
      statusId: "protection";
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
      statusId: "armor_break";
      reduction: number;
      endsAt: number;
    }
  | {
      type: "wound";
      time: number;
      sourceId: string;
      targetId: string;
      skillId: string;
      statusId: "wound";
      reduction: number;
      endsAt: number;
    }
  | {
      type: "speed_down";
      time: number;
      sourceId: string;
      targetId: string;
      skillId: string;
      statusId: "speed_down";
      reduction: number;
      endsAt: number;
    }
  | {
      type: "inner_defense_down";
      time: number;
      sourceId: string;
      targetId: string;
      skillId: string;
      statusId: "inner_defense_down";
      reduction: number;
      endsAt: number;
    }
  | {
      type: "status_apply";
      time: number;
      sourceId: string;
      targetId: string;
      skillId: string;
      statusId: string;
      stacks: number;
      durationSeconds: number;
      chance: number;
      refreshed: boolean;
    }
  | {
      type: "status_tick";
      time: number;
      sourceId?: string;
      targetId: string;
      statusId: string;
      stacks: number;
      outerDamage: number;
    }
  | {
      type: "status_expire";
      time: number;
      targetId: string;
      statusId: string;
    }
  | {
      type: "regeneration";
      time: number;
      sourceId: string;
      targetId: string;
      skillId: string;
      statusId: "regeneration";
      restores: "outer" | "inner";
      percentPerTick: number;
      endsAt: number;
    }
  | {
      type: "regeneration_tick";
      time: number;
      sourceId: string;
      targetId: string;
      skillId: string;
      statusId: "regeneration";
      outerHealing: number;
      innerQiRestored: number;
      overhealing: number;
      recoveryPrevented: number;
    }
  | {
      type: "cleanse";
      time: number;
      sourceId: string;
      targetId: string;
      skillId: string;
      statusesRemoved: string[];
    }
  | {
      type: "auto_medicine";
      time: number;
      medicineId: string;
      trigger: AutoMedicineUseSummary["trigger"];
      targetId?: string;
      cleansedStatusIds: string[];
      statusResistanceBonus: number;
      statusResistanceDurationSeconds: number;
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
      skillId: string;
      outerHealing: number;
      innerQiRestored: number;
      overhealing: number;
      recoveryPrevented: number;
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
  woundsTriggeredByPlayer: number;
  woundsTriggeredByEnemy: number;
  cleansesByPlayer: number;
  cleansesByEnemy: number;
  playerOuterHealing: number;
  enemyOuterHealing: number;
  playerInnerQiRestored: number;
  enemyInnerQiRestored: number;
  playerOverhealing: number;
  enemyOverhealing: number;
  recoveryPreventedByPlayer: number;
  recoveryPreventedByEnemy: number;
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
  woundsApplied: number;
  cleansesApplied: number;
  outerHealingDone: number;
  innerQiRestored: number;
  overhealingDone: number;
  recoveryPrevented: number;
  survived: boolean;
};

export type SimulateBattleInput = {
  playerTeam: TeamInstance;
  enemyTeam: TeamInstance;
  tacticId?: string;
  maxDurationSeconds?: number;
  stepSeconds?: number;
  constants?: CombatFormulaConstants;
  autoMedicine?: BattleAutoMedicineInput;
};

export type BattleAutoMedicineInput = {
  medicines: MedicineDefinition[];
  inventory: Record<string, number | undefined>;
  preferences?: AutoMedicinePreferences;
  progress?: unknown;
  stage?: StageDefinition;
  enemies?: EnemyDefinition[];
  skills?: SkillDefinition[];
};

export type BattleResult = {
  winner: TeamId | "timeout";
  durationSeconds: number;
  playerTactic: BattleTacticSummary;
  events: BattleEvent[];
  finalPlayerTeam: CombatantState[];
  finalEnemyTeam: CombatantState[];
  metrics: BattleMetrics;
  contributions: BattleContribution[];
  autoMedicine: {
    inventory: Record<string, number | undefined>;
    uses: AutoMedicineUseSummary[];
  };
};

export type BattleTacticSummary = {
  id: string;
  name: string;
  isDefault: boolean;
};
