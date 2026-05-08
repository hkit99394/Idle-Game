import type { RegionDefinition, StageDefinition, StaticGameData } from "../data";

export type MapProgress = {
  highestClearedStageIndex: number;
};

export type RegionProgress = Record<string, MapProgress | undefined>;

export function getStageById(
  data: Pick<StaticGameData, "stages">,
  stageId: string
): StageDefinition | undefined {
  return data.stages.find((stage) => stage.id === stageId);
}

export function getRegionById(
  data: Pick<StaticGameData, "regions">,
  regionId: string
): RegionDefinition | undefined {
  return data.regions.find((region) => region.id === regionId);
}

export function isStageCleared(
  data: Pick<StaticGameData, "stages">,
  progress: RegionProgress,
  stageId: string
): boolean {
  const stage = getStageById(data, stageId);

  if (stage === undefined) {
    return false;
  }

  return (
    (progress[stage.regionId]?.highestClearedStageIndex ?? 0) >= stage.index
  );
}

export function isRegionUnlocked(
  data: Pick<StaticGameData, "regions" | "stages">,
  progress: RegionProgress,
  regionId: string
): boolean {
  const region = getRegionById(data, regionId);

  if (region === undefined) {
    return false;
  }

  if (region.unlockCondition.type === "always") {
    return true;
  }

  return isStageCleared(data, progress, region.unlockCondition.stageId);
}

export function isStageUnlocked(
  data: Pick<StaticGameData, "regions" | "stages">,
  progress: RegionProgress,
  stageId: string
): boolean {
  const stage = getStageById(data, stageId);

  if (stage === undefined || !isRegionUnlocked(data, progress, stage.regionId)) {
    return false;
  }

  const highestClearedStageIndex =
    progress[stage.regionId]?.highestClearedStageIndex ?? 0;

  return stage.index <= highestClearedStageIndex + 1;
}

export function isStageFarmable(
  data: Pick<StaticGameData, "stages">,
  progress: RegionProgress,
  stageId: string
): boolean {
  const stage = getStageById(data, stageId);

  return (
    stage !== undefined &&
    stage.canFarmOffline &&
    !stage.isBoss &&
    isStageCleared(data, progress, stageId)
  );
}
