import type { KeyboardEvent } from "react";
import type { StageOptionView } from "../../state/viewModels/mapTypes";
import type {
  OfflineFarmPresetView,
  OfflineFarmRecommendationView,
  OfflineRewardPreviewView,
  OfflineRewardSummaryView
} from "../../state/viewModels/offlineTypes";
import { formatDuration, formatNumber } from "../shared/ui";

type OfflineSummaryPanelProps = {
  onDismiss: () => void;
  summary: OfflineRewardSummaryView | null;
};

export function OfflineSummaryPanel({
  onDismiss,
  summary
}: OfflineSummaryPanelProps) {
  if (!summary) {
    return null;
  }

  return (
    <section className="offline-summary" aria-label="Offline rewards">
      <div className="offline-summary-heading">
        <div>
          <span className="label">While Away</span>
          <h2>{formatDuration(summary.offlineSeconds)} of farm training</h2>
        </div>
        <button type="button" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
      <div className="offline-summary-meta">
        <span>{summary.regionName}</span>
        <span>{summary.stageName}</span>
        <span>{formatNumber(summary.clears)} clears</span>
      </div>
      <div className="offline-summary-rewards">
        <strong>{formatNumber(summary.silver)} silver</strong>
        <strong>{formatNumber(summary.cultivation)} cultivation</strong>
        {summary.herbs > 0 ? (
          <strong>{formatNumber(summary.herbs)} herbs</strong>
        ) : null}
        <strong>{formatNumber(summary.combatExperience)} Combat XP</strong>
        {summary.assignmentStyleMasteryExperience > 0 ? (
          <strong>
            {formatNumber(summary.assignmentStyleMasteryExperience)} style mastery
          </strong>
        ) : null}
        {summary.assignmentEquipmentRewards.map((reward) => (
          <strong key={reward.equipmentId}>
            {formatNumber(reward.quantity)} gear
          </strong>
        ))}
      </div>
    </section>
  );
}

type OfflineFarmPanelProps = {
  onSetPreset: (preset: OfflineFarmPresetView["id"]) => void;
  presets: OfflineFarmPresetView[];
  preview: OfflineRewardPreviewView;
  recommendation: OfflineFarmRecommendationView;
};

export function OfflineFarmPanel({
  onSetPreset,
  presets,
  preview,
  recommendation
}: OfflineFarmPanelProps) {
  return (
    <section className="offline-farm-panel" aria-label="Offline farming">
      <div className="offline-farm-heading">
        <div>
          <span className="label">Idle</span>
          <h2>Offline Farming</h2>
        </div>
        <span>
          {preview.ok
            ? `${formatNumber(preview.clears)} clears / ${formatDuration(preview.previewSeconds)}`
            : preview.reason}
        </span>
      </div>
      <div className="offline-preset-row">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={preset.isSelected ? "selected" : ""}
            onClick={() => onSetPreset(preset.id)}
            title={preset.description}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className="offline-farm-grid">
        <article className="offline-farm-card">
          <span className="label">Selected Farm</span>
          <h3>{preview.stageName}</h3>
          <p>{preview.regionName}</p>
          <div className="offline-preview-rewards">
            <span>{formatNumber(preview.silver)} silver</span>
            <span>{formatNumber(preview.cultivation)} cultivation</span>
            {preview.herbs > 0 ? (
              <span>{formatNumber(preview.herbs)} herbs</span>
            ) : null}
            <span>{formatNumber(preview.combatExperience)} Combat XP</span>
            <span>{formatNumber(preview.masteryExperienceGain)} mastery</span>
          </div>
        </article>
        <article className="offline-farm-card">
          <span className="label">Best {recommendation.presetLabel}</span>
          <h3>{recommendation.stageName}</h3>
          <p>{recommendation.regionName}</p>
          <div className="offline-priority-list">
            {recommendation.rewardPriority.map((priority) => (
              <span key={priority}>{priority}</span>
            ))}
            {recommendation.herbsPerClear > 0 ? (
              <span>{formatNumber(recommendation.herbsPerClear)} herbs/clear</span>
            ) : null}
          </div>
          <strong>
            {recommendation.isSelected ? "Selected" : "Different from selected"}
          </strong>
        </article>
      </div>
    </section>
  );
}

type StageSelectorPanelProps = {
  onSelectStage: (stageId: string) => void;
  stages: StageOptionView[];
};

export function StageSelectorPanel({
  onSelectStage,
  stages
}: StageSelectorPanelProps) {
  const handleStageKeyDown = (
    event: KeyboardEvent<HTMLElement>,
    stage: StageOptionView
  ) => {
    if (!stage.canSelectStage) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelectStage(stage.id);
    }
  };

  return (
    <section className="stage-selector" aria-label="Stage routes">
      <div className="stage-selector-heading">
        <div>
          <span className="label">Route</span>
          <h2>Map Routes</h2>
        </div>
        <span>{stages.filter((stage) => stage.isCleared).length} cleared</span>
      </div>
      <div className="stage-list">
        {stages.length > 0 ? (
          stages.map((stage) => (
            <article
              key={stage.id}
              aria-disabled={!stage.canSelectStage}
              aria-pressed={stage.isSelectedStage}
              className={[
                "stage-card",
                stage.isUnlocked ? "" : "locked",
                stage.isCleared ? "cleared" : "",
                stage.isBoss ? "boss" : "",
                stage.isSelectedStage ? "selected-stage" : ""
              ].join(" ")}
              onClick={() => {
                if (stage.canSelectStage) {
                  onSelectStage(stage.id);
                }
              }}
              onKeyDown={(event) => handleStageKeyDown(event, stage)}
              role="button"
              tabIndex={stage.canSelectStage ? 0 : -1}
            >
              <div className="stage-card-heading">
                <div>
                  <strong>{stage.name}</strong>
                  <span>{stage.regionName} · Stage {stage.index}</span>
                </div>
                <span>
                  {stage.isSelectedStage
                    ? "Current"
                    : stage.isBoss
                      ? "Boss"
                      : stage.isCleared
                        ? "Cleared"
                        : stage.isUnlocked
                          ? "Open"
                          : "Locked"}
                </span>
              </div>
              <div className="stage-rewards">
                <span>{formatNumber(stage.rewards.silver)} silver</span>
                <span>{formatNumber(stage.rewards.cultivation)} cultivation</span>
                {stage.rewards.herbs ? (
                  <span>{formatNumber(stage.rewards.herbs)} herbs</span>
                ) : null}
                <span>{formatNumber(stage.rewards.combatExperience)} xp</span>
              </div>
              <div className="stage-card-actions">
                <span>
                  {stage.isSelectedOfflineFarmStage
                    ? "Farm target"
                    : stage.canSelectOfflineFarm
                      ? "Farmable"
                      : "Not farmable"}
                </span>
              </div>
            </article>
          ))
        ) : (
          <p className="empty-panel">No stages available</p>
        )}
      </div>
    </section>
  );
}
