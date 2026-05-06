import type {
  BaseStats,
  CombatRole,
  FormationSlot,
  MartialStyleId,
  TargetRule
} from "../combat";

export type UnlockCondition =
  | { type: "always" }
  | { type: "stage_cleared"; stageId: string }
  | { type: "hero_level"; heroId: string; level: number }
  | { type: "style_mastery_level"; styleId: MartialStyleId; level: number };

export type SkillEffectType =
  | "outer_heal_percent"
  | "speed_down"
  | "inner_defense_down"
  | "guard"
  | "protect"
  | "armor_break";

export type SkillEffect = {
  type: SkillEffectType;
  value: number;
  durationSeconds?: number;
};

export type EquipmentSlot = "weapon" | "armor" | "manual" | "medicine";

export type EquipmentRarity = "common" | "uncommon" | "rare";

export type EquipmentEffect = {
  stat: keyof BaseStats;
  mode: "flat" | "multiplier";
  value: number;
};

export type EquipmentAffixDefinition = {
  id: string;
  name: string;
  effects: EquipmentEffect[];
};

export type EquipmentSetBonus = {
  pieces: number;
  effects: EquipmentEffect[];
};

export type EquipmentSetDefinition = {
  id: string;
  name: string;
  bonuses: EquipmentSetBonus[];
};

export type EquipmentDefinition = {
  id: string;
  name: string;
  slot: EquipmentSlot;
  rarity: EquipmentRarity;
  allowedStyles: MartialStyleId[];
  effects: EquipmentEffect[];
  affixes?: EquipmentAffixDefinition[];
  setId?: string;
};

export type HeroDefinition = {
  id: string;
  name: string;
  style: MartialStyleId;
  role: string;
  combatRole: CombatRole;
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

export type SkillUpgradeEffect =
  | {
      type: "cooldown_seconds";
      valuePerLevel: number;
    }
  | {
      type: "outer_multiplier";
      valuePerLevel: number;
    }
  | {
      type: "inner_multiplier";
      valuePerLevel: number;
    }
  | {
      type: "add_skill_effect";
      unlockLevel: number;
      effect: SkillEffect;
    };

export type SkillUpgradeDefinition = {
  id: string;
  skillId: string;
  name: string;
  costResource: "cultivation";
  baseCost: number;
  costGrowth: number;
  maxLevel: number;
  effects: SkillUpgradeEffect[];
};

export type EnemyDefinition = {
  id: string;
  name: string;
  family: string;
  type: "normal" | "elite" | "boss";
  style: MartialStyleId;
  combatRole: CombatRole;
  level: number;
  baseStats: BaseStats;
  skillIds: string[];
  traitIds: string[];
};

export type TeamDefinition = {
  combatantIds: string[];
  formation?: Partial<Record<FormationSlot, number[]>>;
};

export type StageRewards = {
  silver: number;
  cultivation: number;
  combatExperience: number;
};

export type StageEquipmentDrop = {
  equipmentId: string;
  quantity: number;
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
  equipmentDrops?: StageEquipmentDrop[];
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
  slots: FormationSlot[];
};

export type StyleMasteryBonus = {
  stat: keyof BaseStats;
  effectPerLevel: number;
};

export type StyleBranchEffect = {
  type: "stat_multiplier";
  stat: keyof BaseStats;
  value: number;
};

export type StyleBranchDefinition = {
  id: string;
  name: string;
  unlock: UnlockCondition;
  hiddenInMvp: boolean;
  effects: StyleBranchEffect[];
};

export type MartialStyleDefinition = {
  id: MartialStyleId;
  name: string;
  bonuses: StyleMasteryBonus[];
  branches: StyleBranchDefinition[];
};

export type UpgradeEffect = {
  stat: keyof Pick<
    BaseStats,
    | "maxOuterHp"
    | "maxInnerQi"
    | "outerAttack"
    | "innerAttack"
    | "outerDefense"
    | "innerDefense"
    | "innerRecoveryRate"
  >;
  effectPerLevel: number;
};

export type UpgradeDefinition = {
  id: string;
  name: string;
  scope: "hero" | "sect";
  art: "outer" | "inner";
  effects: UpgradeEffect[];
  baseCost: number;
  costGrowth: number;
};

export type StaticGameData = {
  heroes: HeroDefinition[];
  skills: SkillDefinition[];
  enemies: EnemyDefinition[];
  equipment: EquipmentDefinition[];
  equipmentSets?: EquipmentSetDefinition[];
  regions: RegionDefinition[];
  stages: StageDefinition[];
  upgrades: UpgradeDefinition[];
  skillUpgrades: SkillUpgradeDefinition[];
  mastery: MasteryDefinition;
  formations: FormationDefinition[];
  styles: MartialStyleDefinition[];
};
