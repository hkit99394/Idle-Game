import type { ChangeEvent, KeyboardEvent, ReactNode } from "react";
import { FORMATION_SLOTS } from "../../core";
import type {
  FormationSlot,
  PreBattleResistanceMode,
  ResolveStageBattleResult
} from "../../core";
import type {
  AssignmentView,
  BattleEventBadgeView,
  BattleCombatantView,
  BattleEventView,
  BattleSummaryView,
  CounterplaySettingsView,
  EquipGameEquipmentInput,
  EquipmentInventoryItemView,
  HeroEquipmentView,
  MasteryPanelView,
  OfflineFarmPresetView,
  OfflineFarmRecommendationView,
  OfflineRewardPreviewView,
  OfflineRewardSummaryView,
  PlayerFormationHeroView,
  PurchaseGameSkillUpgradeInput,
  PurchaseGameUpgradeInput,
  RosterHeroView,
  SaveDiagnosticsView,
  SelectGameStyleBranchInput,
  SetGameActiveHeroTeamInput,
  SetGameAssignmentHeroesInput,
  SkillUpgradeView,
  StageOptionView,
  StyleMasteryView,
  UpgradeView
} from "../state/gameState";
import { OFFLINE_TIME_TRAVEL_SECONDS } from "../state/constants";

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
  }).format(Math.max(0, value));
}

function formatDuration(seconds: number): string {
  const safeSeconds = Math.floor(Math.max(0, seconds));
  const totalMinutes = Math.floor(safeSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  if (minutes > 0) {
    return `${minutes}m`;
  }

  return `${Math.max(1, safeSeconds)}s`;
}

function formatTimestamp(value: number | null): string {
  if (value === null) {
    return "Not saved";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatSaveStatus(status: SaveDiagnosticsView["status"]): string {
  switch (status) {
    case "ready":
      return "Ready";
    case "missing_save":
      return "Missing save";
    case "invalid_json":
      return "Invalid JSON";
    case "invalid_save":
      return "Invalid save";
    case "storage_error":
      return "Storage error";
    case "storage_unavailable":
      return "Storage unavailable";
  }
}

function getBarPercent(current: number, max: number): number {
  if (max <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (current / max) * 100));
}

export function getBattleResultText(
  lastBattle: ResolveStageBattleResult | null,
  stageName: string
): string {
  if (!lastBattle) {
    return "Ready";
  }

  if (!lastBattle.ok) {
    switch (lastBattle.reason) {
      case "locked_stage":
        return `${stageName} is locked`;
      case "missing_enemy":
        return "Enemy data missing";
      case "missing_stage":
        return "Stage data missing";
    }
  }

  if (lastBattle.stageCleared) {
    return `Victory - ${stageName} cleared`;
  }

  return lastBattle.battle.winner === "timeout"
    ? `Stalemate - ${stageName} held`
    : `Defeat - ${stageName} held`;
}

export function getBattleResultClass(lastBattle: ResolveStageBattleResult | null): string {
  if (!lastBattle) {
    return "";
  }

  if (!lastBattle.ok) {
    return "blocked";
  }

  if (lastBattle.stageCleared) {
    return "victory";
  }

  return lastBattle.battle.winner === "timeout" ? "stalemate" : "defeat";
}

type BarProps = {
  className: "outer" | "inner";
  label: string;
  current: number;
  max: number;
};

function StatBar({ className, current, label, max }: BarProps) {
  const width = `${getBarPercent(current, max)}%`;
  const meterValue = Math.round(Math.max(0, Math.min(current, max)));

  return (
    <div className={`stat-bar ${className}-stat`}>
      <div className="bar-label">
        <span>{label}</span>
        <strong>
          {formatNumber(current)} / {formatNumber(max)}
        </strong>
      </div>
      <div
        className={`bar ${className}`}
        role="meter"
        aria-label={`${label} ${formatNumber(current)} of ${formatNumber(max)}`}
        aria-valuemin={0}
        aria-valuemax={Math.round(max)}
        aria-valuenow={meterValue}
      >
        <span style={{ width }} />
      </div>
    </div>
  );
}

function formatSignedPercent(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    signDisplay: "always",
    style: "percent"
  }).format(value);
}

function formatFormationSlot(slot: string): string {
  return `${slot.charAt(0).toUpperCase()}${slot.slice(1)}`;
}

function formatCombatRole(role: string): string {
  return role
    .replace(/[-_]+/g, " ")
    .replace(/^./, (match) => match.toUpperCase());
}

type CombatantCardProps = {
  combatant: BattleCombatantView;
};

function CombatantCard({ combatant }: CombatantCardProps) {
  const contributionStats = [
    combatant.contributionDamage > 0
      ? `Damage ${formatNumber(combatant.contributionDamage)}`
      : null,
    combatant.contributionRecovery > 0
      ? `Recovery ${formatNumber(combatant.contributionRecovery)}`
      : null,
    combatant.contributionProtection > 0
      ? `Protection ${formatNumber(combatant.contributionProtection)}`
      : null,
    combatant.contributionRecoveryPrevented > 0
      ? `Denied ${formatNumber(combatant.contributionRecoveryPrevented)}`
      : null
  ].filter((stat): stat is string => stat !== null);

  return (
    <article
      className={`combatant-card ${combatant.kind} ${
        combatant.isDefeated ? "defeated" : ""
      } ${
        combatant.isQiBroken ? "qi-broken" : ""
      }`}
    >
      <div className="combatant-heading">
        <div>
          <strong>{combatant.name}</strong>
          <span>{combatant.role}</span>
        </div>
        <div className="combatant-tags">
          <span className="slot-tag">{formatFormationSlot(combatant.formationSlot)}</span>
          <span className="role-tag">{formatCombatRole(combatant.combatRole)}</span>
          <span className="level-tag">Lv {formatNumber(combatant.level)}</span>
          <span className="cp-tag">CP {formatNumber(combatant.combatPower)}</span>
          <span className="style-tag">{combatant.style}</span>
        </div>
      </div>
      <StatBar
        className="outer"
        label="Outer HP"
        current={combatant.outerHp}
        max={combatant.maxOuterHp}
      />
      <StatBar
        className="inner"
        label="Inner Qi"
        current={combatant.innerQi}
        max={combatant.maxInnerQi}
      />
      <div className="combatant-stats">
        <span>Outer Attack {formatNumber(combatant.outerAttack)}</span>
        <span>Inner Attack {formatNumber(combatant.innerAttack)}</span>
        <span>Speed {formatNumber(combatant.speed)}</span>
      </div>
      {contributionStats.length > 0 ? (
        <div className="combatant-contributions">
          {contributionStats.map((stat) => (
            <span key={stat}>{stat}</span>
          ))}
        </div>
      ) : null}
      {combatant.isQiBroken || combatant.isDefeated ? (
        <div
          className={`combatant-status ${
            combatant.isDefeated ? "defeated-status" : "qi-broken-status"
          }`}
        >
          {combatant.isDefeated ? "Defeated" : "Qi Broken"}
        </div>
      ) : null}
    </article>
  );
}

type RosterPanelProps = {
  activeTeamSize: number;
  heroes: RosterHeroView[];
  onSetActiveTeam: (input: SetGameActiveHeroTeamInput) => void;
  status: string;
};

export function RosterPanel({
  activeTeamSize,
  heroes,
  onSetActiveTeam,
  status
}: RosterPanelProps) {
  const activeHeroIds = heroes
    .filter((hero) => hero.active)
    .map((hero) => hero.heroId);

  return (
    <section className="roster-panel" aria-label="Hero roster">
      <div className="roster-panel-heading">
        <div>
          <span className="label">Roster</span>
          <h2>Active Disciples</h2>
        </div>
        <span>
          {activeHeroIds.length}/{activeTeamSize} active
        </span>
      </div>
      <div className="roster-grid">
        {heroes.map((hero) => {
          const nextHeroIds = hero.active
            ? activeHeroIds.filter((heroId) => heroId !== hero.heroId)
            : [...activeHeroIds, hero.heroId];
          const canChange = hero.active ? hero.canDeactivate : hero.canActivate;
          const buttonLabel = !hero.unlocked
            ? hero.lockReason ?? "Locked"
            : hero.active
              ? hero.canDeactivate
                ? "Remove"
                : "Keep"
              : hero.canActivate
                ? "Join"
                : "Full";

          return (
            <article
              key={hero.heroId}
              className={`roster-card ${
                hero.active ? "active" : ""
              } ${hero.unlocked ? "" : "locked"}`}
            >
              <div className="roster-card-heading">
                <div>
                  <strong>{hero.name}</strong>
                  <span>{hero.role}</span>
                </div>
                <span>CP {formatNumber(hero.combatPower)}</span>
              </div>
              <div className="roster-tags">
                <span>{hero.style}</span>
                <span>{formatCombatRole(hero.combatRole)}</span>
                <span>Lv {formatNumber(hero.level)}</span>
                {hero.assignedAssignmentName ? (
                  <span>{hero.assignedAssignmentName}</span>
                ) : null}
              </div>
              <button
                type="button"
                disabled={!canChange}
                onClick={() => onSetActiveTeam({ heroIds: nextHeroIds })}
              >
                {buttonLabel}
              </button>
            </article>
          );
        })}
      </div>
      {status ? <div className="upgrade-status">{status}</div> : null}
    </section>
  );
}

type FormationPanelProps = {
  heroes: PlayerFormationHeroView[];
  onSetFormation: (heroId: string, slot: FormationSlot) => void;
};

export function FormationPanel({ heroes, onSetFormation }: FormationPanelProps) {
  return (
    <section className="formation-panel" aria-label="Player formation">
      <div className="formation-panel-heading">
        <div>
          <span className="label">Formation</span>
          <h2>Disciples</h2>
        </div>
        <span>{heroes.length} heroes</span>
      </div>
      <div className="formation-slots">
        {FORMATION_SLOTS.map((slot) => {
          const heroesInSlot = heroes.filter(
            (hero) => hero.formationSlot === slot
          );

          return (
            <div key={slot} className="formation-slot">
              <strong>{formatFormationSlot(slot)}</strong>
              {heroesInSlot.length > 0 ? (
                heroesInSlot.map((hero) => (
                  <span key={hero.heroId}>{hero.name}</span>
                ))
              ) : (
                <span>Empty</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="formation-controls">
        {heroes.map((hero) => (
          <article key={hero.heroId} className="formation-hero">
            <div>
              <strong>{hero.name}</strong>
              <span>
                {hero.role} · {formatCombatRole(hero.combatRole)}
              </span>
            </div>
            <div className="formation-buttons" role="group" aria-label={`${hero.name} position`}>
              {FORMATION_SLOTS.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  className={hero.formationSlot === slot ? "selected" : ""}
                  aria-pressed={hero.formationSlot === slot}
                  onClick={() => onSetFormation(hero.heroId, slot)}
                >
                  {formatFormationSlot(slot)}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

type TeamPanelProps = {
  title: string;
  combatants: BattleCombatantView[];
};

export function TeamPanel({ combatants, title }: TeamPanelProps) {
  const totalCombatPower = combatants.reduce(
    (total, combatant) => total + combatant.combatPower,
    0
  );

  return (
    <section className="team-panel" aria-label={title}>
      <div className="team-heading">
        <h2>{title}</h2>
        <span>CP {formatNumber(totalCombatPower)}</span>
      </div>
      {combatants.length > 0 ? (
        <div className="combatant-list">
          {combatants.map((combatant) => (
            <CombatantCard key={combatant.instanceId} combatant={combatant} />
          ))}
        </div>
      ) : (
        <p className="empty-panel">No combatants available</p>
      )}
    </section>
  );
}

type MasteryPanelProps = {
  mastery: MasteryPanelView | null;
};

export function MasteryPanel({ mastery }: MasteryPanelProps) {
  if (!mastery) {
    return null;
  }

  const progressWidth = `${Math.round(mastery.progressPercent * 100)}%`;
  const nextThresholdLabel = mastery.nextThreshold
    ? `${formatNumber(mastery.nextThreshold.experience)} XP for ${mastery.nextThreshold.rank}`
    : "All thresholds reached";

  return (
    <section className="mastery-panel" aria-label="Map mastery">
      <div className="mastery-panel-heading">
        <div>
          <span className="label">Mastery</span>
          <h2>{mastery.regionName}</h2>
        </div>
        <div className="mastery-xp">
          {formatNumber(mastery.combatExperience)} Combat XP
        </div>
      </div>
      <div className="mastery-progress">
        <div className="bar-label">
          <span>Next Threshold</span>
          <strong>{nextThresholdLabel}</strong>
        </div>
        <div
          className="mastery-meter"
          role="meter"
          aria-label={`${mastery.regionName} mastery progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(mastery.progressPercent * 100)}
        >
          <span style={{ width: progressWidth }} />
        </div>
        {mastery.nextThreshold ? (
          <span className="mastery-next">
            {formatNumber(mastery.nextThreshold.remainingExperience)} XP remaining
          </span>
        ) : null}
      </div>
      <div className="mastery-columns">
        <div>
          <span className="label">Reached Ranks</span>
          <div className="mastery-chips">
            {mastery.reachedRanks.length > 0
              ? mastery.reachedRanks.map((rank) => (
                  <span key={rank.rank} className={`rank-chip ${rank.tone}`}>
                    {rank.label}
                  </span>
                ))
              : <span className="rank-chip unfamiliar">Unfamiliar</span>}
          </div>
        </div>
        <div>
          <span className="label">Active Bonuses</span>
          <div className="mastery-chips">
            {mastery.activeBonuses.length > 0
              ? mastery.activeBonuses.map((bonus) => (
                  <span key={bonus.key}>{bonus.label}</span>
                ))
              : <span>{formatSignedPercent(0)} active bonuses</span>}
          </div>
        </div>
      </div>
    </section>
  );
}

type BattleLogProps = {
  events: BattleEventView[];
  summary: BattleSummaryView | null;
};

export function BattleLog({ events, summary }: BattleLogProps) {
  return (
    <section className="battle-log" aria-label="Battle event playback">
      <div className="battle-log-heading">
        <h2>Battle Record</h2>
        {events.length > 0 ? <span>{events.length} events</span> : null}
      </div>
      {summary ? (
        <div className="battle-summary">
          <strong>{summary.title}</strong>
          {summary.details.map((detail) => (
            <span key={detail}>{detail}</span>
          ))}
        </div>
      ) : (
        <p className="empty-log">No battle yet</p>
      )}
      {events.length > 0 ? (
        <ol className="event-list">
          {events.map((event) => (
            <li key={event.id} className={`event-row ${event.category}`}>
              <span className="event-time">{event.timeLabel}</span>
              <div>
                <strong>{event.headline}</strong>
                <span>{event.detail}</span>
                <EventBadges badges={event.badges} />
              </div>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

type EventBadgesProps = {
  badges: BattleEventBadgeView[];
};

function EventBadges({ badges }: EventBadgesProps) {
  if (badges.length === 0) {
    return null;
  }

  return (
    <div className="event-badges">
      {badges.map((badge, index) => (
        <span key={`${badge.label}-${index}`} className={badge.tone}>
          {badge.label}
        </span>
      ))}
    </div>
  );
}

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

type UpgradePanelProps = {
  onPurchase: (input: PurchaseGameUpgradeInput) => void;
  silver: number;
  status: string;
  upgrades: UpgradeView[];
};

export function UpgradePanel({ onPurchase, silver, status, upgrades }: UpgradePanelProps) {
  return (
    <section className="upgrade-panel" aria-label="Outer and Inner Art">
      <div className="upgrade-panel-heading">
        <div>
          <span className="label">Arts</span>
          <h2>Outer And Inner Art</h2>
        </div>
        <div className="upgrade-silver">Silver {formatNumber(silver)}</div>
      </div>
      <div className="upgrade-grid">
        {upgrades.length > 0 ? (
          upgrades.map((upgrade) => (
            <article
              key={upgrade.key}
              className={`upgrade-card ${upgrade.affordable ? "" : "unaffordable"}`}
            >
              <div className="upgrade-heading">
                <div>
                  <strong>{upgrade.name}</strong>
                  <span>{upgrade.targetName}</span>
                </div>
                <span>{upgrade.art} art</span>
              </div>
              <div className="upgrade-stats">
                <span>Level {upgrade.level}</span>
                <span>Cost {formatNumber(upgrade.cost)}</span>
                {upgrade.effects.map((effect) => (
                  <span key={effect}>{effect}</span>
                ))}
                {!upgrade.affordable ? (
                  <span className="upgrade-shortfall">
                    Need {formatNumber(upgrade.missingSilver)} more silver
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                disabled={!upgrade.affordable}
                onClick={() =>
                  onPurchase({
                    upgradeId: upgrade.upgradeId,
                    heroId: upgrade.heroId
                  })
                }
              >
                {upgrade.affordable
                  ? "Train Art"
                  : `Need ${formatNumber(upgrade.missingSilver)} silver`}
              </button>
            </article>
          ))
        ) : (
          <p className="empty-panel">No upgrades available</p>
        )}
      </div>
      {status ? <div className="upgrade-status">{status}</div> : null}
    </section>
  );
}

type StyleMasteryPanelProps = {
  onSelectBranch: (input: SelectGameStyleBranchInput) => void;
  styles: StyleMasteryView[];
  status: string;
};

export function StyleMasteryPanel({
  onSelectBranch,
  status,
  styles
}: StyleMasteryPanelProps) {
  return (
    <section className="style-mastery-panel" aria-label="Style mastery">
      <div className="style-mastery-heading">
        <div>
          <span className="label">Mastery</span>
          <h2>Martial Styles</h2>
        </div>
        <span>{styles.length} styles</span>
      </div>
      <div className="style-mastery-grid">
        {styles.map((style) => {
          const width = `${Math.round(style.progressPercent * 100)}%`;

          return (
            <article key={style.styleId} className="style-mastery-card">
              <div className="style-mastery-card-heading">
                <div>
                  <strong>{style.name}</strong>
                  <span>Level {formatNumber(style.level)}</span>
                </div>
                <span>{formatNumber(style.experience)} XP</span>
              </div>
              <div className="mastery-meter">
                <span style={{ width }} />
              </div>
              <div className="style-bonus-list">
                {style.bonuses.map((bonus) => (
                  <span key={bonus}>{bonus}</span>
                ))}
              </div>
              <div className="style-branch-list">
                {style.branches.map((branch) => (
                  <button
                    type="button"
                    key={branch.id}
                    className={
                      branch.isSelected
                        ? "selected"
                        : branch.isUnlocked
                          ? "unlocked"
                          : "locked"
                    }
                    disabled={!branch.canSelect}
                    onClick={() =>
                      onSelectBranch({
                        styleId: style.styleId,
                        branchId: branch.id
                      })
                    }
                    title={branch.effects.join(", ")}
                  >
                    <strong>{branch.name}</strong>
                    <span>
                      {branch.isSelected
                        ? "Selected"
                        : branch.isUnlocked
                          ? "Unlocked"
                          : branch.requirement}
                    </span>
                  </button>
                ))}
              </div>
            </article>
          );
        })}
      </div>
      {status ? <div className="upgrade-status">{status}</div> : null}
    </section>
  );
}

type SkillUpgradePanelProps = {
  cultivation: number;
  onPurchase: (input: PurchaseGameSkillUpgradeInput) => void;
  skillUpgrades: SkillUpgradeView[];
  status: string;
};

export function SkillUpgradePanel({
  cultivation,
  onPurchase,
  skillUpgrades,
  status
}: SkillUpgradePanelProps) {
  return (
    <section className="skill-upgrade-panel" aria-label="Skill upgrades">
      <div className="skill-upgrade-heading">
        <div>
          <span className="label">Techniques</span>
          <h2>Skill Refinement</h2>
        </div>
        <div className="upgrade-silver">
          Cultivation {formatNumber(cultivation)}
        </div>
      </div>
      <div className="upgrade-grid">
        {skillUpgrades.map((upgrade) => (
          <article
            key={upgrade.key}
            className={`upgrade-card ${upgrade.affordable ? "" : "unaffordable"}`}
          >
            <div className="upgrade-heading">
              <div>
                <strong>{upgrade.name}</strong>
                <span>{upgrade.skillName}</span>
              </div>
              <span>
                {upgrade.level}/{upgrade.maxLevel}
              </span>
            </div>
            <div className="upgrade-stats">
              <span>Cost {formatNumber(upgrade.cost)}</span>
              {upgrade.effects.map((effect) => (
                <span key={effect}>{effect}</span>
              ))}
              {!upgrade.affordable ? (
                <span className="upgrade-shortfall">
                  {upgrade.level >= upgrade.maxLevel
                    ? "Maximum refinement"
                    : `Need ${formatNumber(upgrade.missingCultivation)} more cultivation`}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              disabled={!upgrade.affordable}
              onClick={() =>
                onPurchase({
                  skillUpgradeId: upgrade.skillUpgradeId
                })
              }
            >
              {upgrade.affordable
                ? "Refine"
                : upgrade.level >= upgrade.maxLevel
                  ? "Maxed"
                  : `Need ${formatNumber(upgrade.missingCultivation)} cultivation`}
            </button>
          </article>
        ))}
      </div>
      {status ? <div className="upgrade-status">{status}</div> : null}
    </section>
  );
}

type EquipmentPanelProps = {
  heroes: HeroEquipmentView[];
  inventory: EquipmentInventoryItemView[];
  onEquip: (input: EquipGameEquipmentInput) => void;
  status: string;
};

export function EquipmentPanel({
  heroes,
  inventory,
  onEquip,
  status
}: EquipmentPanelProps) {
  const heroNames = new Map(heroes.map((hero) => [hero.heroId, hero.name]));

  return (
    <section className="equipment-panel" aria-label="Equipment">
      <div className="equipment-heading">
        <div>
          <span className="label">Gear</span>
          <h2>Equipment</h2>
        </div>
        <span>{inventory.reduce((total, item) => total + item.count, 0)} owned</span>
      </div>
      <div className="equipment-layout">
        <div className="hero-equipment-list">
          {heroes.map((hero) => (
            <article key={hero.heroId} className="hero-equipment-card">
              <div className="hero-equipment-heading">
                <strong>{hero.name}</strong>
                <span>{hero.style}</span>
              </div>
              <div className="equipment-slot-list">
                {hero.slots.map((slot) => (
                  <div key={slot.slot} className="equipment-slot-row">
                    <span>{slot.label}</span>
                    <strong
                      className={slot.rarity ? `rarity-${slot.rarity}` : ""}
                    >
                      {slot.name ?? "Empty"}
                    </strong>
                    {slot.setName ? (
                      <span className="equipment-slot-set">{slot.setName}</span>
                    ) : null}
                  </div>
                ))}
              </div>
              {hero.activeSetBonuses.length > 0 ? (
                <div className="equipment-set-bonuses">
                  {hero.activeSetBonuses.map((bonus) => (
                    <span key={bonus}>{bonus}</span>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
        <div className="equipment-inventory-list">
          {inventory.length > 0 ? (
            inventory.map((item) => (
              <article
                key={item.equipmentId}
                className={`equipment-item-card rarity-${item.rarity}`}
              >
                <div className="equipment-item-heading">
                  <div>
                    <strong>{item.name}</strong>
                    <span>
                      {item.slot} · {item.rarity}
                    </span>
                  </div>
                  <span>
                    {item.availableCount}/{item.count}
                  </span>
                </div>
                <div className="equipment-effects">
                  {item.effects.map((effect) => (
                    <span key={effect}>{effect}</span>
                  ))}
                </div>
                {item.affixes.length > 0 || item.setName ? (
                  <div className="equipment-affixes">
                    {item.affixes.map((affix) => (
                      <span key={affix}>{affix}</span>
                    ))}
                    {item.setName ? <span>Set: {item.setName}</span> : null}
                  </div>
                ) : null}
                {item.setBonuses.length > 0 ? (
                  <div className="equipment-set-bonuses">
                    {item.setBonuses.map((bonus) => (
                      <span key={bonus}>{bonus}</span>
                    ))}
                  </div>
                ) : null}
                <div className="equipment-styles">
                  {item.allowedStyles.map((style) => (
                    <span key={style}>{style}</span>
                  ))}
                </div>
                <div className="equipment-actions">
                  {item.compatibleHeroIds.length > 0 ? (
                    item.compatibleHeroIds.map((heroId) => (
                      <button
                        key={heroId}
                        type="button"
                        onClick={() =>
                          onEquip({
                            heroId,
                            equipmentId: item.equipmentId
                          })
                        }
                      >
                        Equip {heroNames.get(heroId) ?? heroId}
                      </button>
                    ))
                  ) : (
                    <span>No compatible free copy</span>
                  )}
                </div>
              </article>
            ))
          ) : (
            <p className="empty-panel">No equipment found</p>
          )}
        </div>
      </div>
      {status ? <div className="upgrade-status">{status}</div> : null}
    </section>
  );
}

type AssignmentPanelProps = {
  assignments: AssignmentView[];
  onSetAssignment: (input: SetGameAssignmentHeroesInput) => void;
  status: string;
};

export function AssignmentPanel({
  assignments,
  onSetAssignment,
  status
}: AssignmentPanelProps) {
  return (
    <section className="assignment-panel" aria-label="Patrols and training">
      <div className="assignment-heading">
        <div>
          <span className="label">Idle</span>
          <h2>Patrols And Training</h2>
        </div>
        <span>{assignments.filter((assignment) => assignment.assignedHeroIds.length > 0).length} active</span>
      </div>
      <div className="assignment-grid">
        {assignments.map((assignment) => (
          <article
            key={assignment.assignmentId}
            className={`assignment-card ${assignment.unlocked ? "" : "locked"}`}
          >
            <div className="assignment-card-heading">
              <div>
                <strong>{assignment.name}</strong>
                <span>
                  {assignment.type.replace("_", " ")} · {assignment.durationBucket}
                </span>
              </div>
              <span>{assignment.unlocked ? "Open" : assignment.lockReason}</span>
            </div>
            <div className="assignment-rewards">
              {assignment.rewardSummary.map((reward) => (
                <span key={reward}>{reward}</span>
              ))}
            </div>
            <div className="assignment-heroes">
              {assignment.heroOptions.map((hero) => {
                const disabled =
                  !assignment.unlocked ||
                  !hero.eligible ||
                  (!hero.assignedHere && hero.assignedAssignmentName !== null);
                const nextHeroIds = hero.assignedHere
                  ? assignment.assignedHeroIds.filter(
                      (heroId) => heroId !== hero.heroId
                    )
                  : [...assignment.assignedHeroIds, hero.heroId];

                return (
                  <button
                    key={hero.heroId}
                    className={hero.assignedHere ? "assigned" : ""}
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      onSetAssignment({
                        assignmentId: assignment.assignmentId,
                        heroIds: nextHeroIds
                      })
                    }
                  >
                    <strong>{hero.name}</strong>
                    <span>
                      {hero.assignedHere
                        ? "Assigned"
                        : hero.assignedAssignmentName ?? hero.role}
                    </span>
                  </button>
                );
              })}
            </div>
          </article>
        ))}
      </div>
      {status ? <div className="upgrade-status">{status}</div> : null}
    </section>
  );
}

type CounterplaySettingsPanelProps = {
  onSetAutoMedicineEnabled: (enabled: boolean) => void;
  onSetMedicineAutoUse: (medicineId: string, enabled: boolean) => void;
  onSetPreBattleResistanceMode: (mode: PreBattleResistanceMode) => void;
  settings: CounterplaySettingsView;
};

export function CounterplaySettingsPanel({
  onSetAutoMedicineEnabled,
  onSetMedicineAutoUse,
  onSetPreBattleResistanceMode,
  settings
}: CounterplaySettingsPanelProps) {
  function handleGlobalChange(event: ChangeEvent<HTMLInputElement>) {
    onSetAutoMedicineEnabled(event.target.checked);
  }

  function handleResistanceModeChange(event: ChangeEvent<HTMLSelectElement>) {
    onSetPreBattleResistanceMode(event.target.value as PreBattleResistanceMode);
  }

  const pressureItems = settings.stagePreview?.statusPressureItems ?? [];
  const recommendationText =
    settings.stagePreview?.recommendationText ??
    "No selected stage counterplay data.";

  return (
    <section
      className="counterplay-settings-panel"
      aria-label="Counterplay settings"
    >
      <div className="counterplay-settings-heading">
        <div>
          <span className="label">Counterplay</span>
          <h2>Medicine Automation</h2>
        </div>
        <span>{settings.unlocked ? settings.globalLabel : "Locked"}</span>
      </div>
      {settings.lockedReason ? (
        <p className="counterplay-lock-message">{settings.lockedReason}</p>
      ) : null}
      <div className="counterplay-settings-grid">
        <label className="counterplay-toggle-row">
          <input
            type="checkbox"
            checked={settings.globalEnabled}
            disabled={!settings.unlocked}
            onChange={handleGlobalChange}
          />
          <span>
            <strong>Auto Medicine</strong>
            <small>{settings.globalLabel}</small>
          </span>
        </label>
        <label className="counterplay-mode-field">
          <span>Resistance Mode</span>
          <select
            value={settings.resistanceMode}
            disabled={!settings.unlocked}
            onChange={handleResistanceModeChange}
          >
            {settings.resistanceModeOptions.map((mode) => (
              <option key={mode.id} value={mode.id}>
                {mode.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="medicine-toggle-list">
        {settings.medicineRows.map((medicine) => (
          <label
            key={medicine.id}
            className={`medicine-toggle-row ${medicine.disabled ? "disabled" : ""}`}
          >
            <input
              type="checkbox"
              checked={medicine.autoUseEnabled}
              disabled={!medicine.canToggle}
              onChange={(event) =>
                onSetMedicineAutoUse(medicine.id, event.target.checked)
              }
            />
            <span>
              <strong>{medicine.name}</strong>
              <small>
                {medicine.availability} · {formatNumber(medicine.count)}/
                {formatNumber(medicine.maxCarry)}
              </small>
            </span>
            <em>{medicine.autoUseLabel}</em>
          </label>
        ))}
      </div>
      <div className="counterplay-preview">
        <div className="status-pressure-list">
          {pressureItems.length > 0 ? (
            pressureItems.map((item) => (
              <span key={item.statusId} className={`status-${item.category}`}>
                {item.label}
              </span>
            ))
          ) : (
            <span>No status pressure</span>
          )}
        </div>
        <p>{recommendationText}</p>
        {settings.stagePreview?.supportContributionText ? (
          <p className="counterplay-support-note">
            {settings.stagePreview.supportContributionText}
          </p>
        ) : null}
      </div>
    </section>
  );
}

type SaveToolsPanelProps = {
  diagnostics: SaveDiagnosticsView;
  exportText: string;
  importText: string;
  onExport: () => void;
  onImport: () => void;
  onImportTextChange: (value: string) => void;
  onReset: () => void;
  onTimeTravelOfflineFarm: () => void;
  status: string;
};

export function SaveToolsPanel({
  diagnostics,
  exportText,
  importText,
  onExport,
  onImport,
  onImportTextChange,
  onReset,
  onTimeTravelOfflineFarm,
  status
}: SaveToolsPanelProps) {
  function handleImportTextChange(event: ChangeEvent<HTMLTextAreaElement>) {
    onImportTextChange(event.target.value);
  }

  return (
    <section className="save-tools" aria-label="Save tools">
      <div className="save-tools-heading">
        <div>
          <span className="label">Save</span>
          <h2>Diagnostics</h2>
        </div>
        <span>{formatSaveStatus(diagnostics.status)}</span>
      </div>
      <div className="save-diagnostics-grid">
        <span>Key</span>
        <strong>{diagnostics.storageKey}</strong>
        <span>Version</span>
        <strong>{diagnostics.saveVersion ?? "-"}</strong>
        <span>Updated</span>
        <strong>{formatTimestamp(diagnostics.updatedAtMs)}</strong>
        <span>Offline checkpoint</span>
        <strong>{formatTimestamp(diagnostics.lastOfflineRewardAtMs)}</strong>
        <span>Current stage</span>
        <strong>{diagnostics.currentStageId}</strong>
        <span>Farm stage</span>
        <strong>{diagnostics.selectedOfflineFarmStageId ?? "-"}</strong>
        <span>Farm preset</span>
        <strong>{diagnostics.offlineFarmPreset}</strong>
        <span>Highest clear</span>
        <strong>{formatNumber(diagnostics.highestClearedStageIndex)}</strong>
        <span>Save size</span>
        <strong>{formatNumber(diagnostics.saveSizeCharacters)} chars</strong>
        <span>Autosave</span>
        <strong>{formatDuration(diagnostics.autosaveIntervalMs / 1000)}</strong>
      </div>
      {diagnostics.errors.length > 0 ? (
        <div className="save-errors">
          {diagnostics.errors.map((error) => (
            <span key={error}>{error}</span>
          ))}
        </div>
      ) : null}
      <div className="save-actions">
        <button
          type="button"
          disabled={!diagnostics.storageAvailable}
          onClick={onExport}
        >
          Export Save
        </button>
        <button
          type="button"
          disabled={!diagnostics.storageAvailable || !importText.trim()}
          onClick={onImport}
        >
          Import Save
        </button>
        <button
          type="button"
          disabled={
            !diagnostics.storageAvailable ||
            !diagnostics.selectedOfflineFarmStageId
          }
          onClick={onTimeTravelOfflineFarm}
        >
          Simulate {formatDuration(OFFLINE_TIME_TRAVEL_SECONDS)} Away
        </button>
        <button
          type="button"
          className="danger"
          onClick={onReset}
        >
          Reset New Game
        </button>
      </div>
      <div className="save-text-grid">
        <label>
          <span>Export JSON</span>
          <textarea readOnly value={exportText} />
        </label>
        <label>
          <span>Import JSON</span>
          <textarea value={importText} onChange={handleImportTextChange} />
        </label>
      </div>
      {status ? <div className="save-status">{status}</div> : null}
    </section>
  );
}
