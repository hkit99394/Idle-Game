import { describe, expect, it } from "vitest";
import {
  createInitialPlayerProgress,
  resolveStageBattle,
  simulateBattle
} from "../../core";
import type { StaticGameData } from "../../core";
import { staticData } from "../helpers/staticData";

describe("balance-critical combat scenarios", () => {
  it("keeps the Greenline Approach boss as a real gate before training", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.maps.greenline_approach.highestClearedStageIndex = 9;
    progress.currentStageId = "greenline_approach_10";

    const result = resolveStageBattle(staticData, {
      progress,
      stageId: "greenline_approach_10",
      maxDurationSeconds: 180
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.stageCleared).toBe(false);
    expect(result.battle.winner).toBe("enemy");
    expect(result.progress.maps.greenline_approach.highestClearedStageIndex).toBe(9);
  });

  it("proves frontline pressure by targeting front slot enemies first", () => {
    const result = simulateBattle(staticData, {
      playerTeam: {
        id: "player",
        combatants: [{ kind: "hero", definitionId: "iron_fist_initiate" }]
      },
      enemyTeam: {
        id: "enemy",
        combatants: [
          {
            kind: "enemy",
            definitionId: "greenline_cutter",
            instanceId: "back_cutter",
            formationSlot: "back"
          },
          {
            kind: "enemy",
            definitionId: "greenline_cutter",
            instanceId: "front_cutter",
            formationSlot: "front"
          }
        ]
      },
      maxDurationSeconds: 4
    });
    const firstAttack = result.events.find(
      (event) => event.type === "attack" && event.sourceId.startsWith("player_")
    );

    expect(firstAttack).toMatchObject({
      type: "attack",
      targetId: "front_cutter"
    });
  });

  it("captures Inner Qi pressure enemies that can break a player hero", () => {
    const innerPressureData: StaticGameData = {
      ...staticData,
      enemies: [
        ...staticData.enemies,
        {
          ...staticData.enemies[0],
          id: "scenario_inner_adept",
          name: "Scenario Inner Adept",
          combatRole: "breaker",
          skillIds: ["valley_context_seal"],
          baseStats: {
            ...staticData.enemies[0].baseStats,
            maxOuterHp: 2000,
            maxInnerQi: 500,
            outerAttack: 0,
            innerAttack: 120,
            speed: 120,
            breakPower: 0.2
          }
        }
      ]
    };

    const result = simulateBattle(innerPressureData, {
      playerTeam: {
        id: "player",
        combatants: [{ kind: "hero", definitionId: "iron_fist_initiate" }]
      },
      enemyTeam: {
        id: "enemy",
        combatants: [{ kind: "enemy", definitionId: "scenario_inner_adept" }]
      },
      maxDurationSeconds: 12
    });

    expect(result.metrics.qiBreaksTriggeredByEnemy).toBeGreaterThan(0);
    expect(
      result.events.some(
        (event) => event.type === "qi_break" && event.targetId.startsWith("player_")
      )
    ).toBe(true);
  });

  it("captures recovery enemies that heal during a fight", () => {
    const recoveryData: StaticGameData = {
      ...staticData,
      skills: [
        ...staticData.skills,
        {
          id: "lotus_stabilizer_pulse",
          name: "Lotus Stabilizer Pulse",
          cooldownSeconds: 2,
          outerMultiplier: 0.25,
          innerMultiplier: 0,
          targetRule: "first_living",
          effects: [
            {
              type: "outer_heal_percent",
              value: 0.2
            }
          ]
        }
      ],
      enemies: [
        ...staticData.enemies,
        {
          ...staticData.enemies[0],
          id: "scenario_lotus_healer",
          name: "Scenario Lotus Healer",
          combatRole: "support",
          skillIds: ["lotus_stabilizer_pulse"],
          baseStats: {
            ...staticData.enemies[0].baseStats,
            maxOuterHp: 900,
            maxInnerQi: 400,
            outerAttack: 8,
            innerAttack: 0,
            speed: 5,
            innerRecoveryRate: 0.02
          }
        }
      ]
    };

    const result = simulateBattle(recoveryData, {
      playerTeam: {
        id: "player",
        combatants: [{ kind: "hero", definitionId: "iron_fist_initiate" }]
      },
      enemyTeam: {
        id: "enemy",
        combatants: [{ kind: "enemy", definitionId: "scenario_lotus_healer" }]
      },
      maxDurationSeconds: 12
    });

    const healEvents = result.events.filter((event) => event.type === "heal");

    expect(healEvents.length).toBeGreaterThan(0);
    expect(healEvents[0]).toMatchObject({
      sourceId: "enemy_scenario_lotus_healer_1",
      targetId: "enemy_scenario_lotus_healer_1"
    });
  });
});
