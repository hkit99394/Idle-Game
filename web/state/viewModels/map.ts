import {
  areStageIdsEquivalent,
  getStageById,
  hasClearedStage,
  isOfflineFarmStageUnlocked,
  isStageUnlocked
} from "../../../core";
import type { PlayerProgress, StaticGameData } from "../../../core";
import type { RouteAttentionWarningView, StageOptionView } from "./mapTypes";

const ROUTE_CARD_ATTENTION_WARNING: RouteAttentionWarningView = {
  label: "Attention rising",
  body: "Repeated runs are drawing district attention. Rewards, enemy pressure, and offline gains are unchanged.",
  supportText: "Informational only."
};

export function buildStageOptions(
  data: StaticGameData,
  progress: PlayerProgress,
  selectedStageId: string,
  selectedOfflineFarmRouteId: string | null
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
    const isSelectedOfflineFarmStage = selectedOfflineFarmRouteId
      ? areStageIdsEquivalent(stage.id, selectedOfflineFarmRouteId)
      : false;

    return {
      id: stage.id,
      regionId: stage.regionId,
      regionName,
      name: stage.name,
      index: stage.index,
      isBoss: stage.isBoss,
      isUnlocked,
      isCleared,
      isSelectedStage: areStageIdsEquivalent(stage.id, selectedStageId),
      isSelectedOfflineFarmStage,
      canSelectStage: isUnlocked,
      canSelectOfflineFarm,
      attentionWarning:
        isSelectedOfflineFarmStage && canSelectOfflineFarm
          ? ROUTE_CARD_ATTENTION_WARNING
          : null,
      rewards: stage.rewards
    };
  });
}
