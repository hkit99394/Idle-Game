import { describe, expect, it } from "vitest";
import {
  buildPlayerTeamForStage,
  createInitialPlayerProgress,
  simulateBattle
} from "../../core";
import type { StaticGameData } from "../../core";
import { staticData } from "../helpers/staticData";

const mvpPlayerTeam = {
  id: "player" as const,
  combatants: [
    { kind: "hero" as const, definitionId: "iron_fist_initiate" },
    { kind: "hero" as const, definitionId: "azure_pulse_monk" },
    { kind: "hero" as const, definitionId: "white_crane_edge_runner" },
    { kind: "hero" as const, definitionId: "mountain_brace_guardian" }
  ]
};

describe("combat simulator", () => {
  it("runs the MVP team against a normal enemy", () => {
    const result = simulateBattle(staticData, {
      playerTeam: mvpPlayerTeam,
      enemyTeam: {
        id: "enemy",
        combatants: [{ kind: "enemy", definitionId: "greenline_cutter" }]
      },
      maxDurationSeconds: 60
    });

    expect(result.winner).toBe("player");
    expect(result.durationSeconds).toBeGreaterThan(0);
    expect(result.durationSeconds).toBeLessThan(60);
    expect(result.metrics.playerOuterDamage).toBeGreaterThan(0);
    expect(result.metrics.playerInnerDamage).toBeGreaterThan(0);
    expect(result.events.some((event) => event.type === "attack")).toBe(true);
    expect(result.finalEnemyTeam.every((enemy) => enemy.bodyIntegrity === 0)).toBe(true);
  });

  it("supports team-vs-team inputs even when the MVP enemy team has one unit", () => {
    const result = simulateBattle(staticData, {
      playerTeam: {
        id: "player",
        combatants: [{ kind: "hero", definitionId: "iron_fist_initiate" }]
      },
      enemyTeam: {
        id: "enemy",
        combatants: [
          { kind: "enemy", definitionId: "greenline_cutter" },
          {
            kind: "enemy",
            definitionId: "greenline_cutter",
            formationSlot: "back",
            instanceId: "enemy_second_cutter"
          }
        ]
      },
      maxDurationSeconds: 60
    });

    expect(result.finalEnemyTeam).toHaveLength(2);
    expect(result.finalEnemyTeam.map((enemy) => enemy.formationSlot)).toEqual([
      "front",
      "back"
    ]);
    expect(result.finalEnemyTeam.map((enemy) => enemy.combatRole)).toEqual([
      "striker",
      "striker"
    ]);
    expect(
      result.events.some(
        (event) => "targetId" in event && event.targetId === "enemy_second_cutter"
      )
    ).toBe(true);
  });

  it("triggers Qi Break with burst, vulnerability, and recovery events", () => {
    const qiBreakData: StaticGameData = {
      ...staticData,
      enemies: staticData.enemies.map((enemy) =>
        enemy.id === "greenline_cutter"
          ? {
              ...enemy,
              baseStats: {
                ...enemy.baseStats,
                maxBodyIntegrity: 1200,
                maxContextStability: 45,
                kineticAttack: 0,
                cognitiveAttack: 0,
                contextRebuildRate: 0
              }
            }
          : enemy
      )
    };

    const result = simulateBattle(qiBreakData, {
      playerTeam: {
        id: "player",
        combatants: [{ kind: "hero", definitionId: "azure_pulse_monk" }]
      },
      enemyTeam: {
        id: "enemy",
        combatants: [{ kind: "enemy", definitionId: "greenline_cutter" }]
      },
      maxDurationSeconds: 30
    });

    const qiBreakEvents = result.events.filter((event) => event.type === "qi_break");
    const recoverEvents = result.events.filter((event) => event.type === "qi_recover");

    expect(qiBreakEvents.length).toBeGreaterThan(0);
    expect(recoverEvents.length).toBeGreaterThan(0);
    expect(result.metrics.qiBreaksTriggeredByPlayer).toBeGreaterThan(0);
    expect(result.metrics.playerQiBreakBurstDamage).toBeGreaterThan(0);
    expect(
      result.contributions.some(
        (contribution) =>
          contribution.name === "Azure Pulse Monk" &&
          contribution.qiBreaksTriggered > 0
      )
    ).toBe(true);
  });

  it("applies purchased skill upgrades to combat output", () => {
    const baseProgress = createInitialPlayerProgress(staticData);
    const upgradedProgress = createInitialPlayerProgress(staticData);
    upgradedProgress.skillUpgrades = {
      impact_combo_refinement: 3
    };
    const durableEnemyData: StaticGameData = {
      ...staticData,
      enemies: staticData.enemies.map((enemy) =>
        enemy.id === "greenline_cutter"
          ? {
              ...enemy,
              baseStats: {
                ...enemy.baseStats,
                maxBodyIntegrity: 3000,
                kineticAttack: 0,
                cognitiveAttack: 0
              }
            }
          : enemy
      )
    };
    const baseTeam = buildPlayerTeamForStage(
      durableEnemyData,
      baseProgress,
      "greenline_approach_1"
    );
    const upgradedTeam = buildPlayerTeamForStage(
      durableEnemyData,
      upgradedProgress,
      "greenline_approach_1"
    );

    expect(baseTeam.ok).toBe(true);
    expect(upgradedTeam.ok).toBe(true);
    if (!baseTeam.ok || !upgradedTeam.ok) {
      return;
    }

    const enemyTeam = {
      id: "enemy" as const,
      combatants: [{ kind: "enemy" as const, definitionId: "greenline_cutter" }]
    };
    const baseBattle = simulateBattle(durableEnemyData, {
      playerTeam: baseTeam.team,
      enemyTeam,
      maxDurationSeconds: 8
    });
    const upgradedBattle = simulateBattle(durableEnemyData, {
      playerTeam: upgradedTeam.team,
      enemyTeam,
      maxDurationSeconds: 8
    });

    expect(upgradedBattle.metrics.playerOuterDamage).toBeGreaterThan(
      baseBattle.metrics.playerOuterDamage
    );
  });

  it("returns timeout when neither side wins before max duration", () => {
    const timeoutData: StaticGameData = {
      ...staticData,
      heroes: staticData.heroes.map((hero) =>
        hero.id === "iron_fist_initiate"
          ? {
              ...hero,
              baseStats: {
                ...hero.baseStats,
                kineticAttack: 0,
                cognitiveAttack: 0
              }
            }
          : hero
      ),
      enemies: staticData.enemies.map((enemy) =>
        enemy.id === "greenline_cutter"
          ? {
              ...enemy,
              baseStats: {
                ...enemy.baseStats,
                kineticAttack: 0,
                cognitiveAttack: 0
              }
            }
          : enemy
      )
    };

    const result = simulateBattle(timeoutData, {
      playerTeam: {
        id: "player",
        combatants: [{ kind: "hero", definitionId: "iron_fist_initiate" }]
      },
      enemyTeam: {
        id: "enemy",
        combatants: [{ kind: "enemy", definitionId: "greenline_cutter" }]
      },
      maxDurationSeconds: 5
    });

    expect(result.winner).toBe("timeout");
    expect(result.durationSeconds).toBe(5);
  });
});
