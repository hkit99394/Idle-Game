import type { StaticGameData } from "../data";
import {
  cloneProgress,
  addStyleMasteryExperience,
  getMapRewardMultiplier,
  getStageById,
  syncHeroLevelsWithCombatExperience,
  validateOfflineFarmStageTarget
} from "../progression";
import type { PlayerProgress } from "../progression";

export type OfflineRewardConfig = {
  offlineCapSeconds: number;
  estimatedClearTimeSeconds: number;
  minimumClearTimeSeconds: number;
  offlineEfficiency: number;
};

export const DEFAULT_OFFLINE_REWARD_CONFIG: OfflineRewardConfig = {
  offlineCapSeconds: 8 * 60 * 60,
  estimatedClearTimeSeconds: 10,
  minimumClearTimeSeconds: 5,
  offlineEfficiency: 0.6
};

export type OfflineRewardInput = {
  lastSavedAtMs: number;
  currentTimeMs: number;
  offlineCapSeconds: number;
  estimatedClearTimeSeconds: number;
  minimumClearTimeSeconds: number;
  offlineEfficiency: number;
  silverPerClear: number;
  cultivationPerClear: number;
  herbsPerClear: number;
  combatExperiencePerClear: number;
};

export type OfflineRewardResult = {
  offlineSeconds: number;
  clears: number;
  silver: number;
  cultivation: number;
  herbs: number;
  combatExperience: number;
};

export type ApplyOfflineRewardsInput = {
  data: Pick<StaticGameData, "heroes" | "stages" | "mastery">;
  progress: PlayerProgress;
  selectedOfflineFarmStageId: string | null;
  lastSavedAtMs: number;
  currentTimeMs: number;
  config?: OfflineRewardConfig;
};

export type PreviewOfflineRewardsInput = {
  data: Pick<StaticGameData, "stages" | "mastery">;
  progress: PlayerProgress;
  selectedOfflineFarmStageId: string | null;
  previewSeconds: number;
  config?: OfflineRewardConfig;
};

export type ApplyOfflineRewardsResult =
  | {
      ok: true;
      progress: PlayerProgress;
      stageId: string;
      rewards: OfflineRewardResult;
    }
  | {
      ok: false;
      reason: "missing_farm_stage" | "invalid_farm_stage";
      progress: PlayerProgress;
      rewards: OfflineRewardResult;
    };

export type PreviewOfflineRewardsResult =
  | {
      ok: true;
      stageId: string;
      rewards: OfflineRewardResult;
      masteryExperienceGain: number;
      rewardMultiplier: number;
    }
  | {
      ok: false;
      reason: "missing_farm_stage" | "invalid_farm_stage";
      rewards: OfflineRewardResult;
    };

function createEmptyOfflineRewards(): OfflineRewardResult {
  return {
    offlineSeconds: 0,
    clears: 0,
    silver: 0,
    cultivation: 0,
    herbs: 0,
    combatExperience: 0
  };
}

export function calculateOfflineRewards(input: OfflineRewardInput): OfflineRewardResult {
  const rawOfflineSeconds = Math.max(0, (input.currentTimeMs - input.lastSavedAtMs) / 1000);
  const offlineSeconds = Math.min(rawOfflineSeconds, input.offlineCapSeconds);
  const clearTime = Math.max(input.estimatedClearTimeSeconds, input.minimumClearTimeSeconds);
  const clears = Math.floor(offlineSeconds / clearTime);
  const efficiency = Math.max(0, input.offlineEfficiency);

  return {
    offlineSeconds,
    clears,
    silver: input.silverPerClear * clears * efficiency,
    cultivation: input.cultivationPerClear * clears * efficiency,
    herbs: input.herbsPerClear * clears * efficiency,
    combatExperience: input.combatExperiencePerClear * clears * efficiency
  };
}

function getOfflineRewardStageMultiplier(
  data: Pick<StaticGameData, "mastery">,
  progress: PlayerProgress,
  stageRegionId: string
): number {
  const currentMapProgress = progress.maps[stageRegionId] ?? {
    combatExperience: 0,
    highestClearedStageIndex: 0
  };

  return 1 + getMapRewardMultiplier(
    currentMapProgress.combatExperience,
    data.mastery.thresholds
  );
}

export function previewOfflineRewards(
  input: PreviewOfflineRewardsInput
): PreviewOfflineRewardsResult {
  const selectedStageId = input.selectedOfflineFarmStageId;

  if (!selectedStageId) {
    return {
      ok: false,
      reason: "missing_farm_stage",
      rewards: createEmptyOfflineRewards()
    };
  }

  const validation = validateOfflineFarmStageTarget(
    input.data,
    input.progress,
    selectedStageId
  );

  if (!validation.ok) {
    return {
      ok: false,
      reason: "invalid_farm_stage",
      rewards: createEmptyOfflineRewards()
    };
  }

  const stage = getStageById(input.data, selectedStageId);

  if (!stage) {
    return {
      ok: false,
      reason: "invalid_farm_stage",
      rewards: createEmptyOfflineRewards()
    };
  }

  const config = input.config ?? DEFAULT_OFFLINE_REWARD_CONFIG;
  const rewardMultiplier = getOfflineRewardStageMultiplier(
    input.data,
    input.progress,
    stage.regionId
  );
  const rewards = calculateOfflineRewards({
    lastSavedAtMs: 0,
    currentTimeMs: Math.max(0, input.previewSeconds) * 1000,
    offlineCapSeconds: config.offlineCapSeconds,
    estimatedClearTimeSeconds: config.estimatedClearTimeSeconds,
    minimumClearTimeSeconds: config.minimumClearTimeSeconds,
    offlineEfficiency: config.offlineEfficiency,
    silverPerClear: stage.rewards.silver * rewardMultiplier,
    cultivationPerClear: stage.rewards.cultivation * rewardMultiplier,
    herbsPerClear: (stage.rewards.herbs ?? 0) * rewardMultiplier,
    combatExperiencePerClear: stage.rewards.combatExperience
  });

  return {
    ok: true,
    stageId: stage.id,
    rewards,
    masteryExperienceGain: rewards.combatExperience,
    rewardMultiplier
  };
}

export function applyOfflineRewards(
  input: ApplyOfflineRewardsInput
): ApplyOfflineRewardsResult {
  const selectedStageId = input.selectedOfflineFarmStageId;

  if (!selectedStageId) {
    return {
      ok: false,
      reason: "missing_farm_stage",
      progress: cloneProgress(input.progress),
      rewards: createEmptyOfflineRewards()
    };
  }

  const validation = validateOfflineFarmStageTarget(
    input.data,
    input.progress,
    selectedStageId
  );

  if (!validation.ok) {
    return {
      ok: false,
      reason: "invalid_farm_stage",
      progress: cloneProgress(input.progress),
      rewards: createEmptyOfflineRewards()
    };
  }

  const stage = getStageById(input.data, selectedStageId);

  if (!stage) {
    return {
      ok: false,
      reason: "invalid_farm_stage",
      progress: cloneProgress(input.progress),
      rewards: createEmptyOfflineRewards()
    };
  }

  const config = input.config ?? DEFAULT_OFFLINE_REWARD_CONFIG;
  const rewardMultiplier = getOfflineRewardStageMultiplier(
    input.data,
    input.progress,
    stage.regionId
  );
  const rewards = calculateOfflineRewards({
    lastSavedAtMs: input.lastSavedAtMs,
    currentTimeMs: input.currentTimeMs,
    offlineCapSeconds: config.offlineCapSeconds,
    estimatedClearTimeSeconds: config.estimatedClearTimeSeconds,
    minimumClearTimeSeconds: config.minimumClearTimeSeconds,
    offlineEfficiency: config.offlineEfficiency,
    silverPerClear: stage.rewards.silver * rewardMultiplier,
    cultivationPerClear: stage.rewards.cultivation * rewardMultiplier,
    herbsPerClear: (stage.rewards.herbs ?? 0) * rewardMultiplier,
    combatExperiencePerClear: stage.rewards.combatExperience
  });
  const nextProgress = cloneProgress(input.progress);
  const nextMapProgress = nextProgress.maps[stage.regionId] ?? {
    combatExperience: 0,
    highestClearedStageIndex: 0
  };

  nextProgress.resources.silver += rewards.silver;
  nextProgress.resources.cultivation += rewards.cultivation;
  nextProgress.resources.herbs += rewards.herbs;
  nextProgress.maps[stage.regionId] = {
    ...nextMapProgress,
    combatExperience: nextMapProgress.combatExperience + rewards.combatExperience
  };
  addStyleMasteryExperience(
    nextProgress,
    input.data.heroes.map((hero) => hero.style),
    rewards.combatExperience
  );
  syncHeroLevelsWithCombatExperience(nextProgress);

  return {
    ok: true,
    progress: nextProgress,
    stageId: stage.id,
    rewards
  };
}
