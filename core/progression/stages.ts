import type { StageDefinition, StaticGameData } from "../data";
import type { PlayerProgress } from "./types";

export function getStageById(
  data: Pick<StaticGameData, "stages">,
  stageId: string
): StageDefinition | null {
  return data.stages.find((stage) => stage.id === stageId) ?? null;
}

export function isStageUnlocked(
  progress: PlayerProgress,
  stage: StageDefinition
): boolean {
  const mapProgress = progress.maps[stage.regionId];

  if (!mapProgress) {
    return stage.index === 1;
  }

  return stage.index <= mapProgress.highestClearedStageIndex + 1;
}

export function getNextCurrentStageId(
  stage: StageDefinition,
  currentStageId: string
): string {
  return stage.nextStageId ?? currentStageId;
}
