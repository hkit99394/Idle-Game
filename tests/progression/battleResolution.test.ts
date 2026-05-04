import { describe, expect, it } from "vitest";
import {
  createInitialPlayerProgress,
  resolveStageBattle
} from "../../core";
import type { StaticGameData } from "../../core";
import { staticData } from "../helpers/staticData";

describe("stage battle resolution", () => {
  it("resolves an unlocked stage victory, grants rewards, and advances current stage", () => {
    const progress = createInitialPlayerProgress(staticData);

    const result = resolveStageBattle(staticData, {
      progress,
      stageId: "bamboo_road_1",
      maxDurationSeconds: 60
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.battle.winner).toBe("player");
    expect(result.stageCleared).toBe(true);
    expect(result.suggestedFarmStageId).toBeNull();
    expect(result.rewards).toEqual({
      silver: 10,
      cultivation: 5,
      combatExperience: 5
    });
    expect(result.progress.resources.silver).toBe(10);
    expect(result.progress.resources.cultivation).toBe(5);
    expect(result.progress.maps.bamboo_road.highestClearedStageIndex).toBe(1);
    expect(result.progress.currentStageId).toBe("bamboo_road_2");
  });

  it("rejects locked stage attempts without changing progress", () => {
    const progress = createInitialPlayerProgress(staticData);

    const result = resolveStageBattle(staticData, {
      progress,
      stageId: "bamboo_road_3",
      maxDurationSeconds: 60
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.reason).toBe("locked_stage");
    expect(result.progress).toBe(progress);
    expect(progress.resources.silver).toBe(0);
    expect(progress.maps.bamboo_road.highestClearedStageIndex).toBe(0);
  });

  it("does not move current stage backward when replaying an older cleared stage", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.maps.bamboo_road.highestClearedStageIndex = 3;
    progress.currentStageId = "bamboo_road_4";

    const result = resolveStageBattle(staticData, {
      progress,
      stageId: "bamboo_road_1",
      maxDurationSeconds: 60
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.battle.winner).toBe("player");
    expect(result.stageCleared).toBe(true);
    expect(result.progress.maps.bamboo_road.highestClearedStageIndex).toBe(3);
    expect(result.progress.currentStageId).toBe("bamboo_road_4");
  });

  it("does not grant rewards or unlock next stage on defeat", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.maps.bamboo_road.highestClearedStageIndex = 9;
    progress.currentStageId = "bamboo_road_10";

    const result = resolveStageBattle(staticData, {
      progress,
      stageId: "bamboo_road_10",
      maxDurationSeconds: 180
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.battle.winner).toBe("enemy");
    expect(result.stageCleared).toBe(false);
    expect(result.rewards).toBeNull();
    expect(result.suggestedFarmStageId).toBe("bamboo_road_8");
    expect(result.progress).toBe(progress);
    expect(result.progress.resources.silver).toBe(0);
    expect(result.progress.maps.bamboo_road.highestClearedStageIndex).toBe(9);
    expect(result.progress.currentStageId).toBe("bamboo_road_10");
  });

  it("returns no farm suggestion when the player has not cleared a farmable stage", () => {
    const data: StaticGameData = {
      ...staticData,
      stages: staticData.stages.map((stage) =>
        stage.id === "bamboo_road_1"
          ? {
              ...stage,
              enemyTeam: {
                combatantIds: ["black_iron_guard"]
              }
            }
          : stage
      )
    };
    const progress = createInitialPlayerProgress(data);

    const result = resolveStageBattle(data, {
      progress,
      stageId: "bamboo_road_1",
      maxDurationSeconds: 180
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.battle.winner).toBe("enemy");
    expect(result.stageCleared).toBe(false);
    expect(result.rewards).toBeNull();
    expect(result.suggestedFarmStageId).toBeNull();
    expect(result.progress).toBe(progress);
    expect(result.progress.resources.silver).toBe(0);
    expect(result.progress.maps.bamboo_road.highestClearedStageIndex).toBe(0);
    expect(result.progress.currentStageId).toBe("bamboo_road_1");
  });

  it("returns a missing enemy error before simulating bad stage data", () => {
    const badData: StaticGameData = {
      ...staticData,
      stages: staticData.stages.map((stage) =>
        stage.id === "bamboo_road_1"
          ? {
              ...stage,
              enemyTeam: {
                combatantIds: ["missing_enemy"]
              }
            }
          : stage
      )
    };
    const progress = createInitialPlayerProgress(badData);

    const result = resolveStageBattle(badData, {
      progress,
      stageId: "bamboo_road_1"
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.reason).toBe("missing_enemy");
    expect(result.missingId).toBe("missing_enemy");
  });
});
