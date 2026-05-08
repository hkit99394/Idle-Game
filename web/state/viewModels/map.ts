import {
  getStageById,
  hasClearedStage,
  isOfflineFarmStageUnlocked,
  isStageUnlocked
} from "../../../core";
import type { PlayerProgress, StaticGameData } from "../../../core";
import type { StageOptionView } from "../types";

export function buildStageOptions(
  data: StaticGameData,
  progress: PlayerProgress,
  selectedStageId: string,
  selectedOfflineFarmStageId: string | null
): StageOptionView[] {
  const seenStageIds = new Set<string>();
  const orderedStages = data.regions.flatMap((region) =>
    region.stageIds.flatMap((stageId) => {
      const stage = getStageById(data, stageId);

      if (!stage) {
        return [];
      }

      seenStageIds.add(stage.id);

      return [
        {
          stage,
          regionName: region.name
        }
      ];
    })
  );
  const unlistedStages = data.stages
    .filter((stage) => !seenStageIds.has(stage.id))
    .map((stage) => ({
      stage,
      regionName:
        data.regions.find((region) => region.id === stage.regionId)?.name ??
        stage.regionId
    }));

  return [...orderedStages, ...unlistedStages].map(({ stage, regionName }) => {
    const isUnlocked = isStageUnlocked(data, progress, stage);
    const isCleared = hasClearedStage(progress, stage);
    const canSelectOfflineFarm = isOfflineFarmStageUnlocked(
      data,
      progress,
      stage.id
    );

    return {
      id: stage.id,
      regionId: stage.regionId,
      regionName,
      name: stage.name,
      index: stage.index,
      isBoss: stage.isBoss,
      isUnlocked,
      isCleared,
      isSelectedStage: stage.id === selectedStageId,
      isSelectedOfflineFarmStage: stage.id === selectedOfflineFarmStageId,
      canSelectStage: isUnlocked,
      canSelectOfflineFarm,
      rewards: stage.rewards
    };
  });
}
