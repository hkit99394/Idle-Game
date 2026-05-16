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
    const result = buildEnemyTeamForStage(staticData, "greenline_approach_1");

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.team.id).toBe("enemy");
    expect(result.team.combatants).toEqual([
      expect.objectContaining({
        kind: "enemy",
        definitionId: "greenline_cutter",
        formationSlot: "front",
        level: 1
      }),
      expect.objectContaining({
        kind: "enemy",
        definitionId: "greenline_cutter",
        formationSlot: "middle",
        level: 1
      })
    ]);
    expect(result.team.combatants[0].statsOverride).toBeDefined();
  });

  it("maps stage formation indexes to enemy combatant slots", () => {
    const result = buildEnemyTeamForStage(staticData, "greenline_approach_5");

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.team.combatants).toEqual([
      expect.objectContaining({
        definitionId: "veil_pulse_bruiser",
        formationSlot: "middle"
      }),
      expect.objectContaining({
        definitionId: "greenline_cutter",
        formationSlot: "front"
      })
    ]);
  });

  it("supports multiple enemy ids in stage order", () => {
    const multiEnemyData: StaticGameData = {
      ...staticData,
      stages: staticData.stages.map((stage) =>
        stage.id === "greenline_approach_1"
          ? {
              ...stage,
              enemyTeam: {
                combatantIds: ["greenline_cutter", "veil_pulse_bruiser"]
              }
            }
          : stage
      )
    };

    const result = buildEnemyTeamForStage(multiEnemyData, "greenline_approach_1");

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.team.combatants).toEqual([
      expect.objectContaining({
        kind: "enemy",
        definitionId: "greenline_cutter",
        formationSlot: "front",
        level: 1
      }),
      expect.objectContaining({
        kind: "enemy",
        definitionId: "veil_pulse_bruiser",
        formationSlot: "middle",
        level: 1
      })
    ]);
  });

  it("returns a clear error for missing enemy definitions", () => {
    const missingEnemyData: StaticGameData = {
      ...staticData,
      stages: staticData.stages.map((stage) =>
        stage.id === "greenline_approach_1"
          ? {
              ...stage,
              enemyTeam: {
                combatantIds: ["greenline_cutter", "missing_enemy"]
              }
            }
          : stage
      )
    };

    const result = buildEnemyTeamForStage(missingEnemyData, "greenline_approach_1");

    expect(result).toEqual({
      ok: false,
      reason: "missing_enemy",
      missingId: "missing_enemy"
    });
  });
});
