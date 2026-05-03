import {
  simulateBattle
} from "../core";
import type { StaticGameData } from "../core";
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

const playerTeam = {
  id: "player" as const,
  combatants: [
    { kind: "hero" as const, definitionId: "iron_fist_disciple" },
    { kind: "hero" as const, definitionId: "azure_palm_monk" },
    { kind: "hero" as const, definitionId: "white_crane_swordsman" },
    { kind: "hero" as const, definitionId: "mountain_staff_guardian" }
  ]
};

function runScenario(label: string, enemyDefinitionId: string) {
  const result = simulateBattle(staticData, {
    playerTeam,
    enemyTeam: {
      id: "enemy",
      combatants: [{ kind: "enemy", definitionId: enemyDefinitionId }]
    },
    maxDurationSeconds: 180
  });

  return {
    label,
    winner: result.winner,
    durationSeconds: result.durationSeconds,
    metrics: result.metrics,
    eventCount: result.events.length,
    qiBreakEvents: result.events.filter((event) => event.type === "qi_break").length,
    finalEnemyTeam: result.finalEnemyTeam.map((enemy) => ({
      name: enemy.name,
      outerHp: enemy.outerHp,
      innerQi: enemy.innerQi,
      isQiBroken: enemy.isQiBroken
    }))
  };
}

const scenarios = [
  runScenario("Normal enemy: Bamboo Road Bandit", "bamboo_bandit"),
  runScenario("Boss: Black Iron Guard", "black_iron_guard")
];

console.log(JSON.stringify(scenarios, null, 2));
