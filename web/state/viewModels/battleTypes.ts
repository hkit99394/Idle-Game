import type { BattleEventRecord, CombatRole, FormationSlot, TeamId } from "../../../core";

export type BattleCombatantView = {
  instanceId: string;
  definitionId: string;
  team: TeamId;
  kind: "hero" | "enemy";
  name: string;
  style: string;
  role: string;
  combatRole: CombatRole;
  formationSlot: FormationSlot;
  level: number;
  bodyIntegrity: number;
  contextStability: number;
  maxBodyIntegrity: number;
  maxContextStability: number;
  kineticAttack: number;
  cognitiveAttack: number;
  speed: number;
  combatPower: number;
  contributionDamage: number;
  contributionRecovery: number;
  contributionProtection: number;
  contributionRecoveryPrevented: number;
  isOverloaded: boolean;
  isDefeated: boolean;
};

export type BattleEventCategory = BattleEventRecord["category"];

export type BattleEventBadgeTone =
  | "skill"
  | "outer"
  | "inner"
  | "qi"
  | "danger"
  | "neutral";

export type BattleEventBadgeView = {
  label: string;
  tone: BattleEventBadgeTone;
};

type BattleEventRecordView = Pick<
  BattleEventRecord,
  "id" | "category" | "statusId" | "timeSeconds"
>;

export type BattleEventView = BattleEventRecordView & {
  timeLabel: string;
  headline: string;
  detail: string;
  badges: BattleEventBadgeView[];
};

export type BattleSummaryView = {
  title: string;
  details: string[];
};
