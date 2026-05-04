import "./styles/app.css";
import type { MasteryBonus } from "../core";
import { staticData } from "./gameData";
import { useWebGameState } from "./state/gameState";

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

export function App() {
  const {
    battleSelectedStage,
    purchaseUpgrade,
    viewModel
  } = useWebGameState(staticData);
  const {
    enemy,
    lastBattle,
    lastPurchase,
    masterySummary: summary,
    progress,
    selectedOfflineFarmStage,
    selectedStage
  } = viewModel;
  const activeBonuses = summary?.activeBonuses ?? [];
  const battleStatus =
    lastBattle?.ok
      ? `${lastBattle.battle.winner} ${lastBattle.stageCleared ? "cleared" : "held"}`
      : "Ready";
  const purchaseStatus =
    lastPurchase?.ok
      ? `Training level ${lastPurchase.newLevel}`
      : lastPurchase
        ? "Need silver"
        : "";

  return (
    <main className="app-shell">
      <section className="battle-surface">
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
            Battle
          </button>
          <button
            type="button"
            onClick={() =>
              purchaseUpgrade({
                upgradeId: "hero_outer_training",
                heroId: "iron_fist_disciple"
              })
            }
          >
            Train Fist
          </button>
          <span>{battleStatus}</span>
          {purchaseStatus ? <span>{purchaseStatus}</span> : null}
        </div>
        <div className="battle-grid">
          <div className="team-panel">
            <h2>Disciples</h2>
            <div className="combatant-card">
              <strong>Iron Fist Disciple</strong>
              <div className="bar outer"><span /></div>
              <div className="bar inner"><span /></div>
            </div>
          </div>
          <div className="enemy-panel">
            <h2>{enemy?.name ?? "Unknown Enemy"}</h2>
            <div className="combatant-card enemy">
              <strong>Outer HP / Inner Qi</strong>
              <div className="bar outer"><span /></div>
              <div className="bar inner"><span /></div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
