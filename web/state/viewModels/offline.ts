import {
  areStageIdsEquivalent,
  getOfflineFarmPresetPolicy,
  getRecommendedOfflineFarmStage,
  getStageById,
  OFFLINE_FARM_PRESET_POLICIES,
  previewOfflineRewards
} from "../../../core";
import type { OfflineFarmPreset, PlayerProgress, StaticGameData } from "../../../core";
import { OFFLINE_TIME_TRAVEL_SECONDS } from "../constants";
import { displayTerms, formatResourceLabel } from "../../displayTerms";
import type {
  OfflineFarmPresetView,
  OfflineFarmRecommendationView,
  OfflineRewardPreviewView,
  OfflineRewardSummaryView
} from "./offlineTypes";
import type { OfflineRewardSummary } from "../offlineRewardSummary";

export function buildOfflineRewardSummaryView(
  data: StaticGameData,
  summary: OfflineRewardSummary | null
): OfflineRewardSummaryView | null {
  if (!summary) {
    return null;
  }

  const stage = summary.stageId ? getStageById(data, summary.stageId) : null;
  const region = data.regions.find((candidate) => candidate.id === stage?.regionId);

  return {
    ...summary,
    stageName: stage?.name ?? displayTerms.progression.operations,
    regionName: region?.name ?? stage?.regionId ?? "Idle routes"
  };
}

function getRegionNameForStage(
  data: StaticGameData,
  stage: ReturnType<typeof getStageById> | null
): string {
  return (
    data.regions.find((candidate) => candidate.id === stage?.regionId)?.name ??
    stage?.regionId ??
    "Unknown district"
  );
}

function formatOfflineFarmPriority(priority: string): string {
  switch (priority) {
    case "combatExperience":
      return formatResourceLabel("combatExperience");
    case "mastery":
      return formatResourceLabel("mastery");
    case "herbs":
      return formatResourceLabel("herbs");
    default:
      return formatResourceLabel(priority);
  }
}

export function buildOfflineFarmPresetViews(
  selectedPreset: OfflineFarmPreset
): OfflineFarmPresetView[] {
  return OFFLINE_FARM_PRESET_POLICIES.map((policy) => ({
    id: policy.id,
    label: policy.label,
    description: policy.description,
    rewardPriority: policy.rewardPriority.map(formatOfflineFarmPriority),
    isSelected: policy.id === selectedPreset
  }));
}

export function buildOfflineFarmRecommendationView(
  data: StaticGameData,
  progress: PlayerProgress,
  selectedOfflineFarmStageId: string | null,
  preset: OfflineFarmPreset
): OfflineFarmRecommendationView {
  const policy = getOfflineFarmPresetPolicy(preset);
  const recommendedStage = getRecommendedOfflineFarmStage(data, progress, preset);

  if (!recommendedStage) {
    return {
      stageId: null,
      stageName: "No cleared farm route",
      regionName: "No district",
      presetLabel: policy.label,
      description: policy.description,
      rewardPriority: policy.rewardPriority.map(formatOfflineFarmPriority),
      herbsPerClear: 0,
      isSelected: false
    };
  }

  return {
    stageId: recommendedStage.id,
    stageName: recommendedStage.name,
    regionName: getRegionNameForStage(data, recommendedStage),
    presetLabel: policy.label,
    description: policy.description,
    rewardPriority: policy.rewardPriority.map(formatOfflineFarmPriority),
    herbsPerClear: recommendedStage.rewards.herbs ?? 0,
    isSelected: selectedOfflineFarmStageId
      ? areStageIdsEquivalent(recommendedStage.id, selectedOfflineFarmStageId)
      : false
  };
}

function formatOfflinePreviewReason(reason: string): string {
  switch (reason) {
    case "missing_farm_stage":
      return "Select a cleared farm route";
    case "invalid_farm_stage":
      return "Selected farm route is unavailable";
    default:
      return "Offline preview unavailable";
  }
}

export function buildOfflineRewardPreviewView(
  data: StaticGameData,
  progress: PlayerProgress,
  selectedOfflineFarmStageId: string | null
): OfflineRewardPreviewView {
  const stage = selectedOfflineFarmStageId
    ? getStageById(data, selectedOfflineFarmStageId)
    : null;
  const preview = previewOfflineRewards({
    data,
    progress,
    selectedOfflineFarmStageId,
    previewSeconds: OFFLINE_TIME_TRAVEL_SECONDS
  });

  if (!preview.ok) {
    return {
      ok: false,
      reason: formatOfflinePreviewReason(preview.reason),
      stageName: stage?.name ?? "No farm route target",
      regionName: getRegionNameForStage(data, stage),
      previewSeconds: OFFLINE_TIME_TRAVEL_SECONDS,
      clears: 0,
      silver: 0,
      cultivation: 0,
      herbs: 0,
      combatExperience: 0,
      masteryExperienceGain: 0
    };
  }

  const previewStage = getStageById(data, preview.stageId);

  return {
    ok: true,
    reason: null,
    stageName: previewStage?.name ?? preview.stageId,
    regionName: getRegionNameForStage(data, previewStage),
    previewSeconds: OFFLINE_TIME_TRAVEL_SECONDS,
    clears: preview.rewards.clears,
    silver: preview.rewards.silver,
    cultivation: preview.rewards.cultivation,
    herbs: preview.rewards.herbs,
    combatExperience: preview.rewards.combatExperience,
    masteryExperienceGain: preview.masteryExperienceGain
  };
}
