import type { BaseStats, FormationSlot } from "../combat";
import type { BattleResult, TeamInstance } from "../combat";
import type {
  EquipmentDefinition,
  EquipmentSlot,
  MartialStyleDefinition,
  UpgradeDefinition
} from "../data";

export type ResourceState = {
  silver: number;
  cultivation: number;
};

export type HeroProgress = {
  level: number;
  upgrades: Record<string, number>;
};

export type SectProgress = {
  upgrades: Record<string, number>;
};

export type MapProgress = {
  combatExperience: number;
  highestClearedStageIndex: number;
};

export type StyleMasteryProgress = {
  experience: number;
};

export type EquipmentProgress = {
  inventory: Record<string, number>;
  equipped: Record<string, Partial<Record<EquipmentSlot, string>>>;
};

export type PlayerProgress = {
  resources: ResourceState;
  heroes: Record<string, HeroProgress>;
  sect: SectProgress;
  maps: Record<string, MapProgress>;
  formation?: Record<string, FormationSlot>;
  styleMastery?: Record<string, StyleMasteryProgress>;
  skillUpgrades?: Record<string, number>;
  equipment?: EquipmentProgress;
  currentStageId: string;
};

export type PurchaseUpgradeInput = {
  progress: PlayerProgress;
  upgradeId: string;
  heroId?: string;
};

export type PurchaseUpgradeResult =
  | {
      ok: true;
      progress: PlayerProgress;
      cost: number;
      newLevel: number;
    }
  | {
      ok: false;
      reason: "missing_upgrade" | "wrong_scope" | "missing_hero" | "not_enough_silver";
      progress: PlayerProgress;
      cost?: number;
    };

export type PurchaseSkillUpgradeInput = {
  progress: PlayerProgress;
  skillUpgradeId: string;
};

export type PurchaseSkillUpgradeResult =
  | {
      ok: true;
      progress: PlayerProgress;
      cost: number;
      newLevel: number;
    }
  | {
      ok: false;
      reason: "missing_skill_upgrade" | "not_enough_cultivation" | "max_level";
      progress: PlayerProgress;
      cost?: number;
    };

export type EquipHeroEquipmentInput = {
  progress: PlayerProgress;
  heroId: string;
  equipmentId: string;
};

export type EquipHeroEquipmentResult =
  | {
      ok: true;
      progress: PlayerProgress;
      heroId: string;
      equipmentId: string;
      slot: EquipmentSlot;
    }
  | {
      ok: false;
      reason:
        | "missing_hero"
        | "missing_equipment"
        | "not_owned"
        | "not_enough_copies"
        | "incompatible_style";
      progress: PlayerProgress;
    };

export type DerivedHeroStatsInput = {
  baseStats: BaseStats;
  heroId?: string;
  style?: string;
  heroProgress?: HeroProgress;
  sectProgress?: SectProgress;
  heroUpgradeDefinitions: Pick<UpgradeDefinition, "id" | "effects">[];
  sectUpgradeDefinitions: Pick<UpgradeDefinition, "id" | "effects">[];
  styleDefinitions?: MartialStyleDefinition[];
  styleMastery?: PlayerProgress["styleMastery"];
  equipmentDefinitions?: EquipmentDefinition[];
  equipment?: PlayerProgress["equipment"];
  mapAttackMultiplier?: number;
};

export type ApplyStageClearInput = {
  progress: PlayerProgress;
  stageId: string;
};

export type ApplyStageClearResult =
  | {
      ok: true;
      progress: PlayerProgress;
      rewards: ResourceState & { combatExperience: number };
      masteryRanksBefore: string[];
      masteryRanksAfter: string[];
      newlyReachedMasteryRanks: string[];
      equipmentRewards: Array<{ equipmentId: string; quantity: number }>;
    }
  | {
      ok: false;
      reason: "missing_stage" | "locked_stage";
      progress: PlayerProgress;
    };

export type BuildPlayerTeamResult =
  | {
      ok: true;
      team: TeamInstance;
    }
  | {
      ok: false;
      reason: "missing_stage";
    };

export type BuildEnemyTeamResult =
  | {
      ok: true;
      team: TeamInstance;
    }
  | {
      ok: false;
      reason: "missing_stage" | "missing_enemy";
      missingId?: string;
    };

export type ResolveStageBattleInput = {
  progress: PlayerProgress;
  stageId: string;
  maxDurationSeconds?: number;
};

export type ResolveStageBattleResult =
  | {
      ok: true;
      stageCleared: boolean;
      progress: PlayerProgress;
      battle: BattleResult;
      rewards: (ResourceState & { combatExperience: number }) | null;
      masteryRanksBefore: string[];
      masteryRanksAfter: string[];
      newlyReachedMasteryRanks: string[];
      suggestedFarmStageId: string | null;
      equipmentRewards: Array<{ equipmentId: string; quantity: number }>;
    }
  | {
      ok: false;
      reason: "missing_stage" | "locked_stage" | "missing_enemy";
      progress: PlayerProgress;
      missingId?: string;
    };
