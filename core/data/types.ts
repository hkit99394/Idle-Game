import type { BaseStats, MvpStyle, TargetRule } from "../combat";

export type UnlockCondition =
  | { type: "always" }
  | { type: "stage_cleared"; stageId: string };

export type SkillEffect = {
  type: string;
  value: number;
  durationSeconds?: number;
};

export type HeroDefinition = {
  id: string;
  name: string;
  style: MvpStyle;
  role: string;
  baseStats: BaseStats;
  skillIds: string[];
  passiveIds: string[];
  unlock: UnlockCondition;
};

export type SkillDefinition = {
  id: string;
  name: string;
  cooldownSeconds: number;
  outerMultiplier: number;
  innerMultiplier: number;
  targetRule: TargetRule;
  effects: SkillEffect[];
};

export type EnemyDefinition = {
  id: string;
  name: string;
  family: string;
  type: "normal" | "elite" | "boss";
  style: string;
  baseStats: BaseStats;
  skillIds: string[];
  traitIds: string[];
};

export type TeamDefinition = {
  combatantIds: string[];
};

export type StageRewards = {
  silver: number;
  cultivation: number;
  combatExperience: number;
};

export type StageDefinition = {
  id: string;
  regionId: string;
  index: number;
  name: string;
  enemyTeam: TeamDefinition;
  isBoss: boolean;
  canFarmOffline: boolean;
  rewards: StageRewards;
  nextStageId: string | null;
};

export type RegionDefinition = {
  id: string;
  name: string;
  stageIds: string[];
  unlockCondition: UnlockCondition;
};

export type MasteryBonus = {
  type:
    | "map_outer_and_inner_attack_multiplier"
    | "map_reward_multiplier"
    | "enemy_family_damage_multiplier";
  value: number;
};

export type MasteryThreshold = {
  experience: number;
  rank: "familiar" | "trained" | "mastered";
  bonuses: MasteryBonus[];
};

export type MasteryDefinition = {
  thresholds: MasteryThreshold[];
};

export type FormationDefinition = {
  id: string;
  name: string;
  slots: string[];
};

export type UpgradeDefinition = {
  id: string;
  name: string;
  scope: "hero" | "sect";
  stat: keyof Pick<
    BaseStats,
    "maxOuterHp" | "maxInnerQi" | "outerAttack" | "innerAttack" | "outerDefense" | "innerDefense"
  >;
  baseCost: number;
  costGrowth: number;
  effectPerLevel: number;
};

export type StaticGameData = {
  heroes: HeroDefinition[];
  skills: SkillDefinition[];
  enemies: EnemyDefinition[];
  regions: RegionDefinition[];
  stages: StageDefinition[];
  upgrades: UpgradeDefinition[];
  mastery: MasteryDefinition;
  formations: FormationDefinition[];
};
