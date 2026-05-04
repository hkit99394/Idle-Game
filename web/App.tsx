import { useEffect, useState } from "react";
import "./styles/app.css";
import type { MasteryBonus, ResolveStageBattleResult } from "../core";
import { staticData } from "./gameData";
import type {
  BattleCombatantView,
  BattleEventView,
  BattleSummaryView,
  PurchaseGameUpgradeInput,
  StageOptionView,
  UpgradeView
} from "./state/gameState";
import { useWebGameState } from "./state/gameState";

const AUTO_RUN_INTERVAL_MS = 1200;

function formatPercent(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    style: "percent",
    signDisplay: "always"
  }).format(value);
}

function formatBonus(bonus: MasteryBonus): string {
  switch (bonus.type) {
    case "map_outer_and_inner_attack_multiplier":
      return `${formatPercent(bonus.value)} outer and inner attack`;
    case "map_reward_multiplier":
      return `${formatPercent(bonus.value)} stage rewards`;
    case "enemy_family_damage_multiplier":
      return `${formatPercent(bonus.value)} damage to enemy family`;
  }
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
  }).format(Math.max(0, value));
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
    <div className="stat-bar">
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

type CombatantCardProps = {
  combatant: BattleCombatantView;
};

function CombatantCard({ combatant }: CombatantCardProps) {
  return (
    <article
      className={`combatant-card ${combatant.kind} ${
        combatant.isDefeated ? "defeated" : ""
      }`}
    >
      <div className="combatant-heading">
        <div>
          <strong>{combatant.name}</strong>
          <span>{combatant.role}</span>
        </div>
        <span className="style-tag">{combatant.style}</span>
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
        <span>Outer {formatNumber(combatant.outerAttack)}</span>
        <span>Inner {formatNumber(combatant.innerAttack)}</span>
        <span>Speed {formatNumber(combatant.speed)}</span>
      </div>
      {combatant.isQiBroken || combatant.isDefeated ? (
        <div className="combatant-status">
          {combatant.isDefeated ? "Defeated" : "Qi Broken"}
        </div>
      ) : null}
    </article>
  );
}

type TeamPanelProps = {
  title: string;
  combatants: BattleCombatantView[];
};

function TeamPanel({ combatants, title }: TeamPanelProps) {
  return (
    <section className="team-panel" aria-label={title}>
      <h2>{title}</h2>
      <div className="combatant-list">
        {combatants.map((combatant) => (
          <CombatantCard key={combatant.instanceId} combatant={combatant} />
        ))}
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
              </div>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

type StageSelectorPanelProps = {
  onSelectFarmStage: (stageId: string | null) => void;
  onSelectStage: (stageId: string) => void;
  stages: StageOptionView[];
};

function StageSelectorPanel({
  onSelectFarmStage,
  onSelectStage,
  stages
}: StageSelectorPanelProps) {
  return (
    <section className="stage-selector" aria-label="Bamboo Road stages">
      <div className="stage-selector-heading">
        <div>
          <span className="label">Route</span>
          <h2>Bamboo Road</h2>
        </div>
        <span>{stages.filter((stage) => stage.isCleared).length} cleared</span>
      </div>
      <div className="stage-list">
        {stages.map((stage) => (
          <article
            key={stage.id}
            className={[
              "stage-card",
              stage.isUnlocked ? "" : "locked",
              stage.isCleared ? "cleared" : "",
              stage.isBoss ? "boss" : "",
              stage.isSelectedStage ? "selected-stage" : "",
              stage.isSelectedOfflineFarmStage ? "selected-farm" : ""
            ].join(" ")}
          >
            <div className="stage-card-heading">
              <div>
                <strong>{stage.name}</strong>
                <span>Stage {stage.index}</span>
              </div>
              <span>{stage.isBoss ? "Boss" : stage.isCleared ? "Cleared" : stage.isUnlocked ? "Open" : "Locked"}</span>
            </div>
            <div className="stage-rewards">
              <span>{formatNumber(stage.rewards.silver)} silver</span>
              <span>{formatNumber(stage.rewards.cultivation)} cultivation</span>
              <span>{formatNumber(stage.rewards.combatExperience)} xp</span>
            </div>
            <div className="stage-actions">
              <button
                type="button"
                disabled={!stage.canSelectStage}
                onClick={() => onSelectStage(stage.id)}
              >
                {stage.isSelectedStage ? "Current" : "Battle"}
              </button>
              <button
                type="button"
                disabled={!stage.canSelectOfflineFarm}
                onClick={() => onSelectFarmStage(stage.id)}
              >
                {stage.isSelectedOfflineFarmStage ? "Farming" : "Farm"}
              </button>
            </div>
          </article>
        ))}
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
    <section className="upgrade-panel" aria-label="Training upgrades">
      <div className="upgrade-panel-heading">
        <div>
          <span className="label">Training</span>
          <h2>Upgrades</h2>
        </div>
        <div className="upgrade-silver">Silver {formatNumber(silver)}</div>
      </div>
      <div className="upgrade-grid">
        {upgrades.map((upgrade) => (
          <article
            key={upgrade.key}
            className={`upgrade-card ${upgrade.affordable ? "" : "unaffordable"}`}
          >
            <div className="upgrade-heading">
              <div>
                <strong>{upgrade.name}</strong>
                <span>{upgrade.targetName}</span>
              </div>
              <span>{upgrade.scope}</span>
            </div>
            <div className="upgrade-stats">
              <span>Level {upgrade.level}</span>
              <span>Cost {formatNumber(upgrade.cost)}</span>
              <span>{upgrade.stat}</span>
              <span>{formatPercent(upgrade.effectPercent)} per level</span>
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
              {upgrade.affordable ? "Train" : "Need Silver"}
            </button>
          </article>
        ))}
      </div>
      {status ? <div className="upgrade-status">{status}</div> : null}
    </section>
  );
}

export function App() {
  const [autoRunEnabled, setAutoRunEnabled] = useState(false);
  const {
    battleSelectedStage,
    purchaseUpgrade,
    selectOfflineFarmStage,
    selectStage,
    viewModel
  } = useWebGameState(staticData);
  const {
    battleEvents,
    battleSummary,
    enemy,
    enemyCombatants,
    lastBattle,
    lastBattleStage,
    lastPurchase,
    masterySummary: summary,
    playerCombatants,
    progress,
    selectedOfflineFarmStage,
    selectedStage,
    stageOptions,
    upgrades
  } = viewModel;
  const activeBonuses = summary?.activeBonuses ?? [];
  const resultStageName =
    lastBattleStage?.name ?? selectedStage?.name ?? "Unknown Stage";
  const battleStatus = getBattleResultText(lastBattle, resultStageName);
  const purchaseStatus =
    lastPurchase?.ok
      ? `Training level ${lastPurchase.newLevel}`
      : lastPurchase
        ? "Need silver"
        : "";
  const stageType = selectedStage?.isBoss ? "Boss" : "Road";

  useEffect(() => {
    if (!autoRunEnabled) {
      return;
    }

    const timer = window.setInterval(() => {
      battleSelectedStage();
    }, AUTO_RUN_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [autoRunEnabled, battleSelectedStage]);

  function toggleAutoRun() {
    const nextAutoRunEnabled = !autoRunEnabled;

    setAutoRunEnabled(nextAutoRunEnabled);

    if (nextAutoRunEnabled) {
      battleSelectedStage();
    }
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
            <span>{stageType}</span>
            <span>Stage {selectedStage?.index ?? "-"}</span>
            <span>{enemy?.name ?? "Unknown Enemy"}</span>
          </div>
          <div
            className={`battle-result ${
              lastBattle?.ok && lastBattle.stageCleared
                ? "victory"
                : lastBattle
                  ? "defeat"
                  : ""
            }`}
            aria-live="polite"
          >
            {battleStatus}
          </div>
        </header>
        <div className="resource-row">
          <span>Silver {progress.resources.silver}</span>
          <span>Cultivation {progress.resources.cultivation}</span>
          <span>Combat Exp {summary?.combatExperience ?? 0}</span>
        </div>
        <section className="mastery-row" aria-label="Map mastery">
          <div>
            <span className="label">Map</span>
            <strong>{selectedStage?.name ?? "Unknown Stage"}</strong>
          </div>
          <div>
            <span className="label">Rank</span>
            <strong>{summary?.reachedRanks.at(-1) ?? "unfamiliar"}</strong>
          </div>
          <div>
            <span className="label">Farm</span>
            <strong>{selectedOfflineFarmStage?.name ?? "None"}</strong>
          </div>
          <div className="mastery-bonuses">
            <span className="label">Active Bonuses</span>
            <div>
              {activeBonuses.length > 0
                ? activeBonuses.map((bonus) => (
                    <span key={`${bonus.type}-${bonus.value}`}>
                      {formatBonus(bonus)}
                    </span>
                  ))
                : <span>None</span>}
            </div>
          </div>
        </section>
        <div className="action-row">
          <button type="button" onClick={battleSelectedStage}>
            Start Battle
          </button>
          <button
            type="button"
            className={autoRunEnabled ? "active" : ""}
            aria-pressed={autoRunEnabled}
            onClick={toggleAutoRun}
          >
            {autoRunEnabled ? "Auto On" : "Auto Off"}
          </button>
        </div>
        <StageSelectorPanel
          onSelectFarmStage={selectOfflineFarmStage}
          onSelectStage={selectStage}
          stages={stageOptions}
        />
        <UpgradePanel
          onPurchase={purchaseUpgrade}
          silver={progress.resources.silver}
          status={purchaseStatus}
          upgrades={upgrades}
        />
        <div className="battle-grid">
          <TeamPanel title="Disciples" combatants={playerCombatants} />
          <TeamPanel title="Enemy" combatants={enemyCombatants} />
        </div>
        <BattleLog events={battleEvents} summary={battleSummary} />
      </section>
    </main>
  );
}
