import type { BaseStats } from "../combat";
import type { BattleResult, TeamInstance } from "../combat";

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

export type PlayerProgress = {
  resources: ResourceState;
  heroes: Record<string, HeroProgress>;
  sect: SectProgress;
  maps: Record<string, MapProgress>;
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

export type DerivedHeroStatsInput = {
  baseStats: BaseStats;
  heroProgress?: HeroProgress;
  sectProgress?: SectProgress;
  heroUpgradeDefinitions: Array<{
    id: string;
    stat: keyof BaseStats;
    effectPerLevel: number;
  }>;
  sectUpgradeDefinitions: Array<{
    id: string;
    stat: keyof BaseStats;
    effectPerLevel: number;
  }>;
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
    }
  | {
      ok: false;
      reason: "missing_stage";
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
    }
  | {
      ok: false;
      reason: "missing_stage" | "locked_stage" | "missing_enemy";
      progress: PlayerProgress;
      missingId?: string;
    };
