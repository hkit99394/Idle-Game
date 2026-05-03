import { describe, expect, it } from "vitest";
import { buildEnemyTeamForStage } from "../../core";
import type { StaticGameData } from "../../core";
import { staticData } from "../helpers/staticData";

describe("stage enemy team builder", () => {
  it("returns a clear error for a missing stage", () => {
    const result = buildEnemyTeamForStage(staticData, "missing_stage");

    expect(result).toEqual({
      ok: false,
      reason: "missing_stage"
    });
  });

  it("builds simulator enemy combatants from stage enemy ids", () => {
    const result = buildEnemyTeamForStage(staticData, "bamboo_road_1");

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.team).toEqual({
      id: "enemy",
      combatants: [
        {
          kind: "enemy",
          definitionId: "bamboo_bandit"
        }
      ]
    });
  });

  it("supports multiple enemy ids in stage order", () => {
    const multiEnemyData: StaticGameData = {
      ...staticData,
      stages: staticData.stages.map((stage) =>
        stage.id === "bamboo_road_1"
          ? {
              ...stage,
              enemyTeam: {
                combatantIds: ["bamboo_bandit", "mist_palm_thug"]
              }
            }
          : stage
      )
    };

    const result = buildEnemyTeamForStage(multiEnemyData, "bamboo_road_1");

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.team.combatants).toEqual([
      {
        kind: "enemy",
        definitionId: "bamboo_bandit"
      },
      {
        kind: "enemy",
        definitionId: "mist_palm_thug"
      }
    ]);
  });

  it("returns a clear error for missing enemy definitions", () => {
    const missingEnemyData: StaticGameData = {
      ...staticData,
      stages: staticData.stages.map((stage) =>
        stage.id === "bamboo_road_1"
          ? {
              ...stage,
              enemyTeam: {
                combatantIds: ["bamboo_bandit", "missing_enemy"]
              }
            }
          : stage
      )
    };

    const result = buildEnemyTeamForStage(missingEnemyData, "bamboo_road_1");

    expect(result).toEqual({
      ok: false,
      reason: "missing_enemy",
      missingId: "missing_enemy"
    });
  });
});
