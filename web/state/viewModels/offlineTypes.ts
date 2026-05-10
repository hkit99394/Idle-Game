import type { OfflineFarmPreset } from "../../../core";
import type { OfflineRewardSummary } from "../offlineRewardSummary";

export type OfflineRewardSummaryView = OfflineRewardSummary & {
  stageName: string;
  regionName: string;
};

export type OfflineFarmPresetView = {
  id: OfflineFarmPreset;
  label: string;
  description: string;
  rewardPriority: string[];
  isSelected: boolean;
};

export type OfflineFarmRecommendationView = {
  stageId: string | null;
  stageName: string;
  regionName: string;
  presetLabel: string;
  description: string;
  rewardPriority: string[];
  herbsPerClear: number;
  isSelected: boolean;
};

export type OfflineRewardPreviewView = {
  ok: boolean;
  reason: string | null;
  stageName: string;
  regionName: string;
  previewSeconds: number;
  clears: number;
  silver: number;
  cultivation: number;
  herbs: number;
  combatExperience: number;
  masteryExperienceGain: number;
};
