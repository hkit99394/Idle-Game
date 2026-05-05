import { Component, useEffect, useState } from "react";
import type { ChangeEvent, KeyboardEvent, ReactNode } from "react";
import "./styles/app.css";
import { FORMATION_SLOTS } from "../core";
import type { FormationSlot, ResolveStageBattleResult } from "../core";
import { staticData } from "./gameData";
import type {
  BattleEventBadgeView,
  BattleCombatantView,
  BattleEventView,
  BattleSummaryView,
  EquipGameEquipmentInput,
  EquipmentInventoryItemView,
  HeroEquipmentView,
  MasteryPanelView,
  OfflineRewardSummaryView,
  PlayerFormationHeroView,
  PurchaseGameSkillUpgradeInput,
  PurchaseGameUpgradeInput,
  SaveDiagnosticsView,
  SkillUpgradeView,
  StageOptionView,
  StyleMasteryView,
  UpgradeView
} from "./state/gameState";
import {
  OFFLINE_TIME_TRAVEL_SECONDS,
  useWebGameState
} from "./state/gameState";

const AUTO_RUN_INTERVAL_MS = 1200;

function formatNumber(value: number): string {
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

function getBattleResultText(
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

function getBattleResultClass(lastBattle: ResolveStageBattleResult | null): string {
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

type FormationPanelProps = {
  heroes: PlayerFormationHeroView[];
  onSetFormation: (heroId: string, slot: FormationSlot) => void;
};

function FormationPanel({ heroes, onSetFormation }: FormationPanelProps) {
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

function TeamPanel({ combatants, title }: TeamPanelProps) {
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

function MasteryPanel({ mastery }: MasteryPanelProps) {
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

function BattleLog({ events, summary }: BattleLogProps) {
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

function OfflineSummaryPanel({
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
        <strong>{formatNumber(summary.combatExperience)} Combat XP</strong>
      </div>
    </section>
  );
}

type StageSelectorPanelProps = {
  onSelectStage: (stageId: string) => void;
  stages: StageOptionView[];
};

function StageSelectorPanel({
  onSelectStage,
  stages
}: StageSelectorPanelProps) {
  function handleStageKeyDown(
    event: KeyboardEvent<HTMLElement>,
    stage: StageOptionView
  ) {
    if (
      !stage.canSelectStage ||
      (event.key !== "Enter" && event.key !== " ")
    ) {
      return;
    }

    event.preventDefault();
    onSelectStage(stage.id);
  }

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
                <span>{formatNumber(stage.rewards.combatExperience)} xp</span>
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

function UpgradePanel({ onPurchase, silver, status, upgrades }: UpgradePanelProps) {
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
  styles: StyleMasteryView[];
};

function StyleMasteryPanel({ styles }: StyleMasteryPanelProps) {
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
                  <span
                    key={branch.id}
                    className={branch.isUnlocked ? "unlocked" : "locked"}
                  >
                    {branch.name} · {branch.isUnlocked ? "Unlocked" : branch.requirement}
                  </span>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

type SkillUpgradePanelProps = {
  cultivation: number;
  onPurchase: (input: PurchaseGameSkillUpgradeInput) => void;
  skillUpgrades: SkillUpgradeView[];
  status: string;
};

function SkillUpgradePanel({
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

function EquipmentPanel({
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
                  </div>
                ))}
              </div>
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

function SaveToolsPanel({
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

type AppErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

class AppErrorBoundary extends Component<
  { children: ReactNode },
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
    message: ""
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      message: error.message
    };
  }

  componentDidCatch(error: Error) {
    console.error("Path of Jianghu app error", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="app-shell">
          <section className="app-error-state" role="alert">
            <span className="label">Data Error</span>
            <h1>Game data could not load</h1>
            <p>
              {this.state.message ||
                "The app hit an unexpected data or rendering error."}
            </p>
            <button type="button" onClick={() => window.location.reload()}>
              Reload
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

function GameApp() {
  const [exportText, setExportText] = useState("");
  const [importText, setImportText] = useState("");
  const [saveToolStatus, setSaveToolStatus] = useState("");
  const {
    battleSelectedStage,
    dismissOfflineSummary,
    equipEquipment,
    exportSave,
    importSave,
    purchaseSkillUpgrade,
    purchaseUpgrade,
    resetNewGame,
    saveDiagnostics,
    selectStage,
    setHeroFormation,
    timeTravelOfflineFarm,
    viewModel
  } = useWebGameState(staticData);
  const {
    battleEvents,
    battleSummary,
    enemyTeamLabel,
    enemyCombatants,
    equipmentInventory,
    heroEquipment,
    lastBattle,
    lastEquipmentAction,
    lastBattleStage,
    lastPurchase,
    lastSkillPurchase,
    masteryPanel,
    offlineSummary,
    playerCombatants,
    playerFormation,
    progress,
    selectedStage,
    selectedStageRegionName,
    skillUpgrades,
    stageOptions,
    styleMastery,
    upgrades
  } = viewModel;
  const resultStageName =
    lastBattleStage?.name ?? selectedStage?.name ?? "Unknown Stage";
  const battleStatus = getBattleResultText(lastBattle, resultStageName);
  const battleResultClass = getBattleResultClass(lastBattle);
  const purchaseStatus =
    lastPurchase?.ok
      ? `Art level ${lastPurchase.newLevel}`
      : lastPurchase
        ? "Need silver"
        : "";
  const skillPurchaseStatus =
    lastSkillPurchase?.ok
      ? `Skill refinement ${lastSkillPurchase.newLevel}`
      : lastSkillPurchase
        ? "Need cultivation"
        : "";
  const equipmentStatus =
    lastEquipmentAction?.ok
      ? "Equipment changed"
      : lastEquipmentAction
        ? lastEquipmentAction.reason.replaceAll("_", " ")
        : "";
  const stageType = selectedStage?.isBoss ? "Boss" : "Road";

  useEffect(() => {
    const timer = window.setInterval(() => {
      battleSelectedStage();
    }, AUTO_RUN_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [battleSelectedStage]);

  function handleExportSave() {
    const result = exportSave();

    setSaveToolStatus(result.message);

    if (result.ok && result.json) {
      setExportText(result.json);
    }
  }

  function handleImportSave() {
    const result = importSave(importText);

    setSaveToolStatus(
      result.ok || result.errors.length === 0
        ? result.message
        : `${result.message}: ${result.errors.join("; ")}`
    );

    if (result.ok) {
      setImportText("");
      setExportText("");
    }
  }

  function handleResetNewGame() {
    const resetConfirmed = window.confirm(
      "Reset local save and start a new game?"
    );

    if (!resetConfirmed) {
      return;
    }

    const result = resetNewGame();

    setSaveToolStatus(
      result.ok || result.errors.length === 0
        ? result.message
        : `${result.message}: ${result.errors.join("; ")}`
    );
    setExportText("");
    setImportText("");
  }

  function handleTimeTravelOfflineFarm() {
    const result = timeTravelOfflineFarm();

    setSaveToolStatus(
      result.ok || result.errors.length === 0
        ? result.message
        : `${result.message}: ${result.errors.join("; ")}`
    );
    setExportText("");
  }

  return (
    <main className="app-shell">
      <section className="battle-surface">
        <header className="stage-header">
          <div>
            <span className="label">Current Stage</span>
            <h1>{selectedStage?.name ?? "Unknown Stage"}</h1>
          </div>
          <div className="stage-meta">
            <span>{selectedStageRegionName}</span>
            <span>{stageType}</span>
            <span>Stage {selectedStage?.index ?? "-"}</span>
            <span>{enemyTeamLabel}</span>
          </div>
          <div
            className={`battle-result ${battleResultClass}`}
            aria-live="polite"
          >
            {battleStatus}
          </div>
        </header>
        <div className="resource-row">
          <span>Silver {formatNumber(progress.resources.silver)}</span>
          <span>Cultivation {formatNumber(progress.resources.cultivation)}</span>
          <span>Combat Exp {formatNumber(masteryPanel?.combatExperience ?? 0)}</span>
        </div>
        <OfflineSummaryPanel
          onDismiss={dismissOfflineSummary}
          summary={offlineSummary}
        />
        <MasteryPanel mastery={masteryPanel} />
        <StageSelectorPanel
          onSelectStage={selectStage}
          stages={stageOptions}
        />
        <FormationPanel
          heroes={playerFormation}
          onSetFormation={setHeroFormation}
        />
        <StyleMasteryPanel styles={styleMastery} />
        <UpgradePanel
          onPurchase={purchaseUpgrade}
          silver={progress.resources.silver}
          status={purchaseStatus}
          upgrades={upgrades}
        />
        <SkillUpgradePanel
          cultivation={progress.resources.cultivation}
          onPurchase={purchaseSkillUpgrade}
          skillUpgrades={skillUpgrades}
          status={skillPurchaseStatus}
        />
        <EquipmentPanel
          heroes={heroEquipment}
          inventory={equipmentInventory}
          onEquip={equipEquipment}
          status={equipmentStatus}
        />
        <div className="battle-grid">
          <TeamPanel title="Disciples" combatants={playerCombatants} />
          <TeamPanel title="Enemy Team" combatants={enemyCombatants} />
        </div>
        <BattleLog events={battleEvents} summary={battleSummary} />
        <SaveToolsPanel
          diagnostics={saveDiagnostics}
          exportText={exportText}
          importText={importText}
          onExport={handleExportSave}
          onImport={handleImportSave}
          onImportTextChange={setImportText}
          onReset={handleResetNewGame}
          onTimeTravelOfflineFarm={handleTimeTravelOfflineFarm}
          status={saveToolStatus}
        />
      </section>
    </main>
  );
}

export function App() {
  return (
    <AppErrorBoundary>
      <GameApp />
    </AppErrorBoundary>
  );
}
