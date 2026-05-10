export type UpgradeView = {
  key: string;
  upgradeId: string;
  name: string;
  scope: "hero" | "sect";
  art: "outer" | "inner";
  heroId?: string;
  targetName: string;
  effects: string[];
  level: number;
  cost: number;
  affordable: boolean;
  missingSilver: number;
};

export type SkillUpgradeView = {
  key: string;
  skillUpgradeId: string;
  skillId: string;
  name: string;
  skillName: string;
  level: number;
  maxLevel: number;
  cost: number;
  affordable: boolean;
  missingCultivation: number;
  effects: string[];
};

export type MasteryBonusView = {
  key: string;
  label: string;
};

export type MasteryRankTone =
  | "unfamiliar"
  | "familiar"
  | "trained"
  | "mastered";

export type MasteryRankView = {
  rank: string;
  label: string;
  tone: MasteryRankTone;
};

export type MasteryPanelView = {
  regionId: string;
  regionName: string;
  combatExperience: number;
  reachedRanks: MasteryRankView[];
  nextThreshold: {
    experience: number;
    rank: string;
    remainingExperience: number;
  } | null;
  activeBonuses: MasteryBonusView[];
  progressPercent: number;
};

export type StyleBranchView = {
  id: string;
  name: string;
  isUnlocked: boolean;
  isSelected: boolean;
  canSelect: boolean;
  hiddenInMvp: boolean;
  requirement: string;
  effects: string[];
};

export type StyleMasteryView = {
  styleId: string;
  name: string;
  level: number;
  experience: number;
  nextLevelExperience: number;
  progressPercent: number;
  bonuses: string[];
  branches: StyleBranchView[];
};
