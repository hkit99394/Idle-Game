import type { StageDefinition, StaticGameData } from "../data";
import {
  areStageIdsEquivalent,
  getLegacyStageId,
  getRegionIdAliases,
  getStageIdAliases,
  normalizeStageId
} from "../compatibility";
import type { DistrictProgress, PlayerProgress } from "./types";

export type RegionProgress = Record<
  string,
  {
    highestClearedRouteIndex: number;
    combatData?: number;
  }
>;

export const OFFLINE_FARM_PRESETS = [
  "balanced",
  "silver",
  "cultivation",
  "combatExperience",
  "mastery"
] as const;

export type OfflineFarmPreset = (typeof OFFLINE_FARM_PRESETS)[number];

export const DEFAULT_OFFLINE_FARM_PRESET: OfflineFarmPreset = "balanced";

export type OfflineFarmRewardPriority =
  | keyof StageDefinition["rewards"]
  | "mastery";

export type OfflineFarmPresetPolicy = {
  id: OfflineFarmPreset;
  label: string;
  description: string;
  rewardPriority: readonly OfflineFarmRewardPriority[];
};

export const OFFLINE_FARM_PRESET_POLICIES = [
  {
    id: "balanced",
    label: "Balanced",
    description: "Prioritizes Combat XP, then silver, then cultivation.",
    rewardPriority: ["combatExperience", "silver", "cultivation"]
  },
  {
    id: "silver",
    label: "Silver",
    description: "Prioritizes silver income for Outer and Inner Art training.",
    rewardPriority: ["silver", "combatExperience", "cultivation"]
  },
  {
    id: "cultivation",
    label: "Cultivation",
    description: "Prioritizes cultivation for skill refinement.",
    rewardPriority: ["cultivation", "combatExperience", "silver"]
  },
  {
    id: "combatExperience",
    label: "Combat XP",
    description: "Prioritizes Combat XP for levels and map mastery.",
    rewardPriority: ["combatExperience", "silver", "cultivation"]
  },
  {
    id: "mastery",
    label: "Mastery",
    description: "Prioritizes mastery gain, then cultivation, then silver.",
    rewardPriority: ["mastery", "cultivation", "silver"]
  }
] as const satisfies readonly OfflineFarmPresetPolicy[];

export function isOfflineFarmPreset(value: unknown): value is OfflineFarmPreset {
  return (
    typeof value === "string" &&
    OFFLINE_FARM_PRESETS.includes(value as OfflineFarmPreset)
  );
}

export function normalizeOfflineFarmPreset(
  value: unknown
): OfflineFarmPreset {
  return isOfflineFarmPreset(value) ? value : DEFAULT_OFFLINE_FARM_PRESET;
}

export function getOfflineFarmPresetPolicy(
  preset: OfflineFarmPreset
): OfflineFarmPresetPolicy {
  return (
    OFFLINE_FARM_PRESET_POLICIES.find((policy) => policy.id === preset) ??
    OFFLINE_FARM_PRESET_POLICIES[0]
  );
}

export function getStageById(
  data: Pick<StaticGameData, "stages">,
  stageId: string
): StageDefinition | null {
  const directStage = data.stages.find((stage) => stage.id === stageId);

  if (directStage) {
    return directStage;
  }

  const legacyStageId = getLegacyStageId(stageId);
  const targetStageId = normalizeStageId(stageId);

  return (
    data.stages.find(
      (stage) =>
        stage.id === legacyStageId ||
        stage.id === targetStageId ||
        getStageIdAliases(stage.id).includes(stageId)
    ) ?? null
  );
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
    (getRegionMapProgress(progress.districts, stage.regionId)?.highestClearedRouteIndex ??
      0) >= stage.index
  );
}

function getPreferredRegionMapKey(
  districts: RegionProgress,
  regionId: string
): string {
  const aliases = getRegionIdAliases(regionId);

  return aliases.find((alias) => Object.hasOwn(districts, alias)) ?? regionId;
}

export function getRegionMapProgress(
  districts: RegionProgress,
  regionId: string
): RegionProgress[string] | undefined {
  const aliases = getRegionIdAliases(regionId);
  const targetAlias = aliases[0];

  if (targetAlias && Object.hasOwn(districts, targetAlias)) {
    return districts[targetAlias];
  }

  return aliases
    .slice(1)
    .map((alias) => districts[alias])
    .find(
      (districtProgress): districtProgress is RegionProgress[string] =>
        districtProgress !== undefined
    );
}

export function setRegionMapProgress(
  progress: PlayerProgress,
  regionId: string,
  districtProgress: DistrictProgress
): void {
  progress.districts[
    getPreferredRegionMapKey(progress.districts, regionId)
  ] = districtProgress;
}

function isPlayerProgress(
  progress: PlayerProgress | RegionProgress
): progress is PlayerProgress {
  return (
    typeof (progress as PlayerProgress).currentStageId === "string" &&
    typeof (progress as PlayerProgress).districts === "object"
  );
}

function getProgressMaps(progress: PlayerProgress | RegionProgress): RegionProgress {
  return isPlayerProgress(progress) ? progress.districts : progress;
}

export function isStageCleared(
  data: Pick<StaticGameData, "stages">,
  progress: PlayerProgress | RegionProgress,
  stageId: string
): boolean {
  const stage = getStageById(data, stageId);

  if (!stage) {
    return false;
  }

  return (
    (getRegionMapProgress(getProgressMaps(progress), stage.regionId)
      ?.highestClearedRouteIndex ?? 0) >=
    stage.index
  );
}

function getRegionById(
  data: Pick<StaticGameData, "regions">,
  regionId: string
): StaticGameData["regions"][number] | null {
  const aliases = getRegionIdAliases(regionId);

  return data.regions.find((candidate) => aliases.includes(candidate.id)) ?? null;
}

export function isRegionUnlocked(
  data: Pick<StaticGameData, "regions" | "stages">,
  progress: PlayerProgress | RegionProgress,
  regionId: string
): boolean {
  const region = getRegionById(data, regionId);

  if (!region) {
    return false;
  }

  if (region.unlockCondition.type === "always") {
    return true;
  }

  if (region.unlockCondition.type === "stage_cleared") {
    const requiredStage = getStageById(data, region.unlockCondition.stageId);

    return requiredStage
      ? isStageCleared(data, progress, requiredStage.id)
      : false;
  }

  return false;
}

export function isStageUnlocked(
  data: Pick<StaticGameData, "regions" | "stages">,
  progress: PlayerProgress | RegionProgress,
  stageOrId: StageDefinition | string
): boolean {
  const stage =
    typeof stageOrId === "string" ? getStageById(data, stageOrId) : stageOrId;

  if (!stage) {
    return false;
  }

  if (!isRegionUnlocked(data, progress, stage.regionId)) {
    return false;
  }

  const districtProgress = getRegionMapProgress(
    getProgressMaps(progress),
    stage.regionId
  );

  if (!districtProgress) {
    return stage.index === 1;
  }

  return stage.index <= districtProgress.highestClearedRouteIndex + 1;
}

export function getNextCurrentStageId(
  data: Pick<StaticGameData, "regions" | "stages">,
  stage: StageDefinition,
  currentStageId: string,
  progressAfterClear: PlayerProgress
): string {
  if (!areStageIdsEquivalent(stage.id, currentStageId)) {
    return currentStageId;
  }

  const formatStageIdForCurrentProgress = (stageId: string): string =>
    getLegacyStageId(currentStageId) !== currentStageId
      ? normalizeStageId(stageId)
      : stageId;

  if (stage.nextStageId) {
    return formatStageIdForCurrentProgress(stage.nextStageId);
  }

  const nextRegion = data.regions.find(
    (region) =>
      region.unlockCondition.type === "stage_cleared" &&
      areStageIdsEquivalent(region.unlockCondition.stageId, stage.id) &&
      isRegionUnlocked(data, progressAfterClear, region.id)
  );

  return nextRegion?.stageIds[0]
    ? formatStageIdForCurrentProgress(nextRegion.stageIds[0])
    : currentStageId;
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

export function isStageFarmable(
  data: Pick<StaticGameData, "stages">,
  progress: PlayerProgress | RegionProgress,
  stageId: string
): boolean {
  const stage = getStageById(data, stageId);

  return Boolean(
    stage &&
      !stage.isBoss &&
      stage.canFarmOffline &&
      isStageCleared(data, progress, stage.id)
  );
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

function getOfflineFarmStageRewardPriorityValue(
  stage: StageDefinition,
  priority: OfflineFarmRewardPriority
): number {
  return priority === "mastery"
    ? stage.rewards.combatExperience
    : stage.rewards[priority] ?? 0;
}

export function isBetterOfflineFarmStage(
  candidate: StageDefinition,
  currentBest: StageDefinition,
  preset: OfflineFarmPreset = DEFAULT_OFFLINE_FARM_PRESET
): boolean {
  for (const rewardType of getOfflineFarmPresetPolicy(preset).rewardPriority) {
    const difference =
      getOfflineFarmStageRewardPriorityValue(candidate, rewardType) -
      getOfflineFarmStageRewardPriorityValue(currentBest, rewardType);

    if (difference !== 0) {
      return difference > 0;
    }
  }

  return true;
}

export function getRecommendedOfflineFarmStage(
  data: Pick<StaticGameData, "regions" | "stages">,
  progress: PlayerProgress,
  preset: OfflineFarmPreset = DEFAULT_OFFLINE_FARM_PRESET
): StageDefinition | null {
  return getUnlockedOfflineFarmStages(data, progress).reduce<StageDefinition | null>(
    (bestStage, stage) =>
      !bestStage || isBetterOfflineFarmStage(stage, bestStage, preset)
        ? stage
        : bestStage,
    null
  );
}

export function setOfflineFarmStageTarget(
  data: Pick<StaticGameData, "regions" | "stages">,
  progress: PlayerProgress,
  requestedStageId: string | null,
  preset: OfflineFarmPreset = DEFAULT_OFFLINE_FARM_PRESET
): string | null {
  if (
    requestedStageId &&
    validateOfflineFarmStageTarget(data, progress, requestedStageId).ok
  ) {
    return requestedStageId;
  }

  const recommendedStageId = getRecommendedOfflineFarmStage(
    data,
    progress,
    preset
  )?.id;

  return recommendedStageId
    ? getLegacyStageId(progress.currentStageId) !== progress.currentStageId
      ? normalizeStageId(recommendedStageId)
      : recommendedStageId
    : null;
}
