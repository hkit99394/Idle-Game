import type { StageDefinition, StaticGameData } from "../data";
import type { PlayerProgress } from "./types";

export function getStageById(
  data: Pick<StaticGameData, "stages">,
  stageId: string
): StageDefinition | null {
  return data.stages.find((stage) => stage.id === stageId) ?? null;
}

export function getCurrentStage(
  data: Pick<StaticGameData, "stages">,
  progress: PlayerProgress
): StageDefinition | null {
  return getStageById(data, progress.currentStageId);
}

export function hasClearedStage(
  progress: PlayerProgress,
  stage: StageDefinition
): boolean {
  return (
    (progress.maps[stage.regionId]?.highestClearedStageIndex ?? 0) >= stage.index
  );
}

export function isRegionUnlocked(
  data: Pick<StaticGameData, "regions" | "stages">,
  progress: PlayerProgress,
  regionId: string
): boolean {
  const region = data.regions.find((candidate) => candidate.id === regionId);

  if (!region) {
    return false;
  }

  if (region.unlockCondition.type === "always") {
    return true;
  }

  const requiredStage = getStageById(data, region.unlockCondition.stageId);

  return requiredStage ? hasClearedStage(progress, requiredStage) : false;
}

export function isStageUnlocked(
  data: Pick<StaticGameData, "regions" | "stages">,
  progress: PlayerProgress,
  stage: StageDefinition
): boolean {
  if (!isRegionUnlocked(data, progress, stage.regionId)) {
    return false;
  }

  const mapProgress = progress.maps[stage.regionId];

  if (!mapProgress) {
    return stage.index === 1;
  }

  return stage.index <= mapProgress.highestClearedStageIndex + 1;
}

export function getNextCurrentStageId(
  data: Pick<StaticGameData, "regions" | "stages">,
  stage: StageDefinition,
  currentStageId: string,
  progressAfterClear: PlayerProgress
): string {
  if (stage.id !== currentStageId) {
    return currentStageId;
  }

  if (stage.nextStageId) {
    return stage.nextStageId;
  }

  const nextRegion = data.regions.find(
    (region) =>
      region.unlockCondition.type === "stage_cleared" &&
      region.unlockCondition.stageId === stage.id &&
      isRegionUnlocked(data, progressAfterClear, region.id)
  );

  return nextRegion?.stageIds[0] ?? currentStageId;
}

export type OfflineFarmStageTargetValidationResult =
  | {
      ok: true;
      stage: StageDefinition;
    }
  | {
      ok: false;
      reason:
        | "missing_stage"
        | "boss_stage"
        | "not_farmable"
        | "uncleared_stage";
    };

export function validateOfflineFarmStageTarget(
  data: Pick<StaticGameData, "stages">,
  progress: PlayerProgress,
  stageId: string
): OfflineFarmStageTargetValidationResult {
  const stage = getStageById(data, stageId);

  if (!stage) {
    return {
      ok: false,
      reason: "missing_stage"
    };
  }

  if (stage.isBoss) {
    return {
      ok: false,
      reason: "boss_stage"
    };
  }

  if (!stage.canFarmOffline) {
    return {
      ok: false,
      reason: "not_farmable"
    };
  }

  if (!hasClearedStage(progress, stage)) {
    return {
      ok: false,
      reason: "uncleared_stage"
    };
  }

  return {
    ok: true,
    stage
  };
}

export function isOfflineFarmStageUnlocked(
  data: Pick<StaticGameData, "stages">,
  progress: PlayerProgress,
  stageId: string
): boolean {
  return validateOfflineFarmStageTarget(data, progress, stageId).ok;
}

export function getUnlockedOfflineFarmStages(
  data: Pick<StaticGameData, "regions" | "stages">,
  progress: PlayerProgress
): StageDefinition[] {
  const seenStageIds = new Set<string>();
  const stagesInProgressionOrder = data.regions.flatMap((region) =>
    region.stageIds.flatMap((stageId) => {
      const stage = getStageById(data, stageId);

      if (!stage) {
        return [];
      }

      seenStageIds.add(stage.id);

      return [stage];
    })
  );
  const unlistedStages = data.stages.filter((stage) => !seenStageIds.has(stage.id));

  return [...stagesInProgressionOrder, ...unlistedStages].filter((stage) =>
    isOfflineFarmStageUnlocked(data, progress, stage.id)
  );
}

export const OFFLINE_FARM_RECOMMENDATION_REWARD_PRIORITY = [
  "combatExperience",
  "silver",
  "cultivation"
] as const satisfies ReadonlyArray<keyof StageDefinition["rewards"]>;

export function isBetterOfflineFarmStage(
  candidate: StageDefinition,
  currentBest: StageDefinition
): boolean {
  for (const rewardType of OFFLINE_FARM_RECOMMENDATION_REWARD_PRIORITY) {
    const difference =
      candidate.rewards[rewardType] - currentBest.rewards[rewardType];

    if (difference !== 0) {
      return difference > 0;
    }
  }

  return true;
}

export function getRecommendedOfflineFarmStage(
  data: Pick<StaticGameData, "regions" | "stages">,
  progress: PlayerProgress
): StageDefinition | null {
  return getUnlockedOfflineFarmStages(data, progress).reduce<StageDefinition | null>(
    (bestStage, stage) =>
      !bestStage || isBetterOfflineFarmStage(stage, bestStage)
        ? stage
        : bestStage,
    null
  );
}

export function setOfflineFarmStageTarget(
  data: Pick<StaticGameData, "regions" | "stages">,
  progress: PlayerProgress,
  requestedStageId: string | null
): string | null {
  if (
    requestedStageId &&
    validateOfflineFarmStageTarget(data, progress, requestedStageId).ok
  ) {
    return requestedStageId;
  }

  return getRecommendedOfflineFarmStage(data, progress)?.id ?? null;
}
