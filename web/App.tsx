import "./styles/app.css";
import type { MasteryBonus, StaticGameData } from "../core";
import {
  createInitialPlayerProgress,
  getActiveMasterySummaryForStage
} from "../core";
import enemies from "../data/enemies.json" with { type: "json" };
import formations from "../data/formations.json" with { type: "json" };
import heroes from "../data/heroes.json" with { type: "json" };
import mastery from "../data/mastery.json" with { type: "json" };
import regions from "../data/regions.json" with { type: "json" };
import skills from "../data/skills.json" with { type: "json" };
import stages from "../data/stages.json" with { type: "json" };
import upgrades from "../data/upgrades.json" with { type: "json" };

const staticData: StaticGameData = {
  heroes: heroes as StaticGameData["heroes"],
  skills: skills as StaticGameData["skills"],
  enemies: enemies as StaticGameData["enemies"],
  regions: regions as StaticGameData["regions"],
  stages: stages as StaticGameData["stages"],
  upgrades: upgrades as StaticGameData["upgrades"],
  mastery: mastery as StaticGameData["mastery"],
  formations: formations as StaticGameData["formations"]
};

const progress = createInitialPlayerProgress(staticData);
const currentStageId = progress.currentStageId;
const currentStage = staticData.stages.find((stage) => stage.id === currentStageId);
const enemyId = currentStage?.enemyTeam.combatantIds[0];
const enemy = staticData.enemies.find((candidate) => candidate.id === enemyId);
const masterySummary = getActiveMasterySummaryForStage(
  staticData,
  progress,
  currentStageId
);

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
  const summary = masterySummary.ok ? masterySummary.summary : null;
  const activeBonuses = summary?.activeBonuses ?? [];

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
            <strong>{currentStage?.name ?? "Unknown Stage"}</strong>
          </div>
          <div>
            <span className="label">Rank</span>
            <strong>{summary?.reachedRanks.at(-1) ?? "unfamiliar"}</strong>
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
