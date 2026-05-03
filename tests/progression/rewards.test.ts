import { describe, expect, it } from "vitest";
import {
  applyStageClearRewards,
  createInitialPlayerProgress
} from "../../core";
import { staticData } from "../helpers/staticData";

describe("stage clear rewards", () => {
  it("adds silver, cultivation, combat experience, and stage progress", () => {
    const progress = createInitialPlayerProgress(staticData);
    const result = applyStageClearRewards(staticData, {
      progress,
      stageId: "bamboo_road_1"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.rewards).toEqual({
      silver: 10,
      cultivation: 5,
      combatExperience: 5
    });
    expect(result.progress.resources.silver).toBe(10);
    expect(result.progress.resources.cultivation).toBe(5);
    expect(result.progress.maps.bamboo_road.combatExperience).toBe(5);
    expect(result.progress.maps.bamboo_road.highestClearedStageIndex).toBe(1);
    expect(result.progress.currentStageId).toBe("bamboo_road_1");
  });

  it("reports newly reached mastery ranks", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.maps.bamboo_road.combatExperience = 95;

    const result = applyStageClearRewards(staticData, {
      progress,
      stageId: "bamboo_road_1"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.masteryRanksBefore).toEqual([]);
    expect(result.masteryRanksAfter).toEqual(["familiar"]);
    expect(result.newlyReachedMasteryRanks).toEqual(["familiar"]);
  });

  it("applies map reward mastery bonus to silver and cultivation", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.maps.bamboo_road.combatExperience = 500;

    const result = applyStageClearRewards(staticData, {
      progress,
      stageId: "bamboo_road_1"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.rewards.silver).toBeCloseTo(10.2);
    expect(result.rewards.cultivation).toBeCloseTo(5.1);
    expect(result.rewards.combatExperience).toBe(5);
  });

  it("returns an error for missing stages", () => {
    const progress = createInitialPlayerProgress(staticData);
    const result = applyStageClearRewards(staticData, {
      progress,
      stageId: "missing"
    });

    expect(result.ok).toBe(false);
  });
});
