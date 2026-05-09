import type {
  BaseStats,
  CombatRole,
  FormationSlot,
  MartialStyleId,
  StatusDispelTag,
  StatusEffectDefinition,
  TargetRule
} from "../combat";

export type { StatusEffectDefinition } from "../combat";

export type UnlockCondition =
  | { type: "always" }
  | { type: "stage_cleared"; stageId: string }
  | { type: "hero_level"; heroId: string; level: number }
  | { type: "style_mastery_level"; styleId: MartialStyleId; level: number };

export const SKILL_EFFECT_TYPES = [
  "outer_heal_percent",
  "inner_heal_percent",
  "outer_regeneration_percent",
  "inner_regeneration_percent",
  "wound",
  "cleanse",
  "speed_down",
  "inner_defense_down",
  "guard",
  "protect",
  "armor_break",
  "apply_status"
] as const;

export type SkillEffectType = (typeof SKILL_EFFECT_TYPES)[number];

export type SkillEffectTarget =
  | "self"
  | "target"
  | "lowest_outer_hp_ally"
  | "lowest_inner_qi_ally"
  | "wounded_or_armor_broken_ally";

export type DirectSkillEffect = {
  type: Exclude<SkillEffectType, "apply_status">;
  value: number;
  durationSeconds?: number;
  target?: SkillEffectTarget;
};

export type ApplyStatusSkillEffect = {
  type: "apply_status";
  statusId: string;
  chance: number;
  durationSeconds?: number;
  stacks?: number;
  target?: SkillEffectTarget;
};

export type SkillEffect = DirectSkillEffect | ApplyStatusSkillEffect;

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

export type AssignmentType = "patrol" | "training_ground";

export type AssignmentDurationBucket = "short" | "medium" | "long";

export type AssignmentEquipmentReward = {
  equipmentId: string;
  quantityPerHour: number;
};

export type AssignmentRewardProfile = {
  silverPerHour?: number;
  cultivationPerHour?: number;
  herbsPerHour?: number;
  combatExperiencePerHour?: number;
  styleMasteryExperiencePerHour?: number;
  mapRegionId?: string;
  equipmentRewardsPerHour?: AssignmentEquipmentReward[];
};

export type AssignmentDefinition = {
  id: string;
  name: string;
  type: AssignmentType;
  unlockCondition: UnlockCondition;
  durationBucket: AssignmentDurationBucket;
  allowedRoles: CombatRole[];
  allowedStyles: MartialStyleId[];
  rewardProfile: AssignmentRewardProfile;
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

export type MedicineEffect =
  | {
      type: "cleanse_status";
      dispelTags: StatusDispelTag[];
      maxCount?: number;
    }
  | {
      type: "status_resistance_bonus";
      value: number;
      durationSeconds: number;
    };

export type MedicineDefinition = {
  id: string;
  name: string;
  unlock: UnlockCondition;
  maxCarry: number;
  effects: MedicineEffect[];
};

export type TeamDefinition = {
  combatantIds: string[];
  formation?: Partial<Record<FormationSlot, number[]>>;
};

export type StageRewards = {
  silver: number;
  cultivation: number;
  herbs?: number;
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

export type ClearTimeTargetRange = {
  min: number;
  max: number;
};

export type BalanceResultExpectation = "player_clear" | "enemy_hold";

export type RegionBalanceTargets = {
  clearTimeSeconds: {
    normal: ClearTimeTargetRange;
    elite: ClearTimeTargetRange;
    boss?: ClearTimeTargetRange;
  };
  rewardCurve?: {
    requireBestFarmRecommendation?: boolean;
  };
  statusPressure?: {
    minApplications?: number;
    maxApplications?: number;
    maxExpectedDamage?: number;
    maxMedicineConsumed?: number;
    expectedStatusIds?: string[];
  };
  defensePressure?: {
    minGuardAbsorbs?: number;
    minArmorBreaks?: number;
    minDamagePrevented?: number;
  };
  healingPressure?: {
    minHeals?: number;
    minOuterHealing?: number;
    minCleanses?: number;
    maxRecoveryPrevented?: number;
  };
  bossGate?: {
    baselineResult?: BalanceResultExpectation;
    trainedResult?: BalanceResultExpectation;
    farmedResult?: BalanceResultExpectation;
    maxFarmClears?: number;
    maxTrainingCost?: number;
    clearTimeSeconds?: ClearTimeTargetRange;
    maxMedicineConsumed?: number;
    maxStatusDamage?: number;
  };
};

export type RegionDefinition = {
  id: string;
  name: string;
  stageIds: string[];
  unlockCondition: UnlockCondition;
  balanceTargets?: RegionBalanceTargets;
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
    | "statusResistance"
  >;
  mode?: "multiplier" | "flat";
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
  assignments?: AssignmentDefinition[];
  regions: RegionDefinition[];
  stages: StageDefinition[];
  upgrades: UpgradeDefinition[];
  skillUpgrades: SkillUpgradeDefinition[];
  mastery: MasteryDefinition;
  formations: FormationDefinition[];
  styles: MartialStyleDefinition[];
  statusEffects: StatusEffectDefinition[];
  medicines: MedicineDefinition[];
};
