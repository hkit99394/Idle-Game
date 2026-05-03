import { describe, expect, it } from "vitest";
import { simulateBattle } from "../../core";
import type { StaticGameData } from "../../core";
import { staticData } from "../helpers/staticData";

const mvpPlayerTeam = {
  id: "player" as const,
  combatants: [
    { kind: "hero" as const, definitionId: "iron_fist_disciple" },
    { kind: "hero" as const, definitionId: "azure_palm_monk" },
    { kind: "hero" as const, definitionId: "white_crane_swordsman" },
    { kind: "hero" as const, definitionId: "mountain_staff_guardian" }
  ]
};

describe("combat simulator", () => {
  it("runs the MVP team against a normal enemy", () => {
    const result = simulateBattle(staticData, {
      playerTeam: mvpPlayerTeam,
      enemyTeam: {
        id: "enemy",
        combatants: [{ kind: "enemy", definitionId: "bamboo_bandit" }]
      },
      maxDurationSeconds: 60
    });

    expect(result.winner).toBe("player");
    expect(result.durationSeconds).toBeGreaterThan(0);
    expect(result.durationSeconds).toBeLessThan(60);
    expect(result.metrics.playerOuterDamage).toBeGreaterThan(0);
    expect(result.metrics.playerInnerDamage).toBeGreaterThan(0);
    expect(result.events.some((event) => event.type === "attack")).toBe(true);
    expect(result.finalEnemyTeam.every((enemy) => enemy.outerHp === 0)).toBe(true);
  });

  it("supports team-vs-team inputs even when the MVP enemy team has one unit", () => {
    const result = simulateBattle(staticData, {
      playerTeam: {
        id: "player",
        combatants: [{ kind: "hero", definitionId: "iron_fist_disciple" }]
      },
      enemyTeam: {
        id: "enemy",
        combatants: [
          { kind: "enemy", definitionId: "bamboo_bandit" },
          { kind: "enemy", definitionId: "bamboo_bandit", instanceId: "enemy_second_bandit" }
        ]
      },
      maxDurationSeconds: 60
    });

    expect(result.finalEnemyTeam).toHaveLength(2);
    expect(
      result.events.some(
        (event) => "targetId" in event && event.targetId === "enemy_second_bandit"
      )
    ).toBe(true);
  });

  it("triggers Qi Break with burst, vulnerability, and recovery events", () => {
    const qiBreakData: StaticGameData = {
      ...staticData,
      enemies: staticData.enemies.map((enemy) =>
        enemy.id === "bamboo_bandit"
          ? {
              ...enemy,
              baseStats: {
                ...enemy.baseStats,
                maxOuterHp: 1200,
                maxInnerQi: 45,
                outerAttack: 0,
                innerAttack: 0,
                innerRecoveryRate: 0
              }
            }
          : enemy
      )
    };

    const result = simulateBattle(qiBreakData, {
      playerTeam: {
        id: "player",
        combatants: [{ kind: "hero", definitionId: "azure_palm_monk" }]
      },
      enemyTeam: {
        id: "enemy",
        combatants: [{ kind: "enemy", definitionId: "bamboo_bandit" }]
      },
      maxDurationSeconds: 30
    });

    const qiBreakEvents = result.events.filter((event) => event.type === "qi_break");
    const recoverEvents = result.events.filter((event) => event.type === "qi_recover");

    expect(qiBreakEvents.length).toBeGreaterThan(0);
    expect(recoverEvents.length).toBeGreaterThan(0);
    expect(result.metrics.qiBreaksTriggeredByPlayer).toBeGreaterThan(0);
    expect(result.metrics.playerQiBreakBurstDamage).toBeGreaterThan(0);
  });

  it("returns timeout when neither side wins before max duration", () => {
    const timeoutData: StaticGameData = {
      ...staticData,
      heroes: staticData.heroes.map((hero) =>
        hero.id === "iron_fist_disciple"
          ? {
              ...hero,
              baseStats: {
                ...hero.baseStats,
                outerAttack: 0,
                innerAttack: 0
              }
            }
          : hero
      ),
      enemies: staticData.enemies.map((enemy) =>
        enemy.id === "bamboo_bandit"
          ? {
              ...enemy,
              baseStats: {
                ...enemy.baseStats,
                outerAttack: 0,
                innerAttack: 0
              }
            }
          : enemy
      )
    };

    const result = simulateBattle(timeoutData, {
      playerTeam: {
        id: "player",
        combatants: [{ kind: "hero", definitionId: "iron_fist_disciple" }]
      },
      enemyTeam: {
        id: "enemy",
        combatants: [{ kind: "enemy", definitionId: "bamboo_bandit" }]
      },
      maxDurationSeconds: 5
    });

    expect(result.winner).toBe("timeout");
    expect(result.durationSeconds).toBe(5);
  });
});
