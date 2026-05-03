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

export function isOfflineFarmStageUnlocked(
  data: Pick<StaticGameData, "stages">,
  progress: PlayerProgress,
  stageId: string
): boolean {
  const stage = getStageById(data, stageId);

  return Boolean(
    stage &&
      hasClearedStage(progress, stage) &&
      !stage.isBoss &&
      stage.canFarmOffline
  );
}

export function getUnlockedOfflineFarmStages(
  data: Pick<StaticGameData, "stages">,
  progress: PlayerProgress
): StageDefinition[] {
  return data.stages.filter((stage) =>
    isOfflineFarmStageUnlocked(data, progress, stage.id)
  );
}

export function getRecommendedOfflineFarmStage(
  data: Pick<StaticGameData, "stages">,
  progress: PlayerProgress
): StageDefinition | null {
  return getUnlockedOfflineFarmStages(data, progress).at(-1) ?? null;
}
