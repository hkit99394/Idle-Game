import { describe, expect, it } from "vitest";
import {
  applyOfflineRewards,
  calculateOfflineRewards,
  createInitialPlayerProgress
} from "../../core";
import { staticData } from "../helpers/staticData";

describe("offline rewards", () => {
  it("calculates capped offline rewards with efficiency", () => {
    const result = calculateOfflineRewards({
      lastSavedAtMs: 0,
      currentTimeMs: 10 * 60 * 60 * 1000,
      offlineCapSeconds: 8 * 60 * 60,
      estimatedClearTimeSeconds: 10,
      minimumClearTimeSeconds: 5,
      offlineEfficiency: 0.6,
      silverPerClear: 10,
      cultivationPerClear: 5,
      combatExperiencePerClear: 5
    });

    expect(result.offlineSeconds).toBe(8 * 60 * 60);
    expect(result.clears).toBe(2880);
    expect(result.silver).toBeCloseTo(17280);
    expect(result.cultivation).toBeCloseTo(8640);
    expect(result.combatExperience).toBeCloseTo(8640);
  });

  it("uses the minimum clear time", () => {
    const result = calculateOfflineRewards({
      lastSavedAtMs: 0,
      currentTimeMs: 10_000,
      offlineCapSeconds: 100,
      estimatedClearTimeSeconds: 1,
      minimumClearTimeSeconds: 5,
      offlineEfficiency: 1,
      silverPerClear: 10,
      cultivationPerClear: 5,
      combatExperiencePerClear: 5
    });

    expect(result.clears).toBe(2);
  });

  it("applies rewards from a selected cleared non-boss farm stage", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.maps.bamboo_road.highestClearedStageIndex = 2;
    progress.currentStageId = "bamboo_road_3";

    const result = applyOfflineRewards({
      data: staticData,
      progress,
      selectedOfflineFarmStageId: "bamboo_road_1",
      lastSavedAtMs: 1000,
      currentTimeMs: 31_000,
      config: {
        offlineCapSeconds: 100,
        estimatedClearTimeSeconds: 10,
        minimumClearTimeSeconds: 5,
        offlineEfficiency: 0.5
      }
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.rewards.clears).toBe(3);
    expect(result.progress.resources.silver).toBeCloseTo(15);
    expect(result.progress.resources.cultivation).toBeCloseTo(7.5);
    expect(result.progress.maps.bamboo_road.combatExperience).toBeCloseTo(7.5);
    expect(result.progress.maps.bamboo_road.highestClearedStageIndex).toBe(2);
    expect(result.progress.currentStageId).toBe("bamboo_road_3");
  });

  it("refuses missing, locked, boss, and non-farmable targets", () => {
    const lockedProgress = createInitialPlayerProgress(staticData);
    const missingResult = applyOfflineRewards({
      data: staticData,
      progress: lockedProgress,
      selectedOfflineFarmStageId: "missing_stage",
      lastSavedAtMs: 0,
      currentTimeMs: 30_000
    });
    const lockedResult = applyOfflineRewards({
      data: staticData,
      progress: lockedProgress,
      selectedOfflineFarmStageId: "bamboo_road_2",
      lastSavedAtMs: 0,
      currentTimeMs: 30_000
    });
    const bossProgress = createInitialPlayerProgress(staticData);
    bossProgress.maps.bamboo_road.highestClearedStageIndex = 10;
    bossProgress.currentStageId = "bamboo_road_10";
    const bossResult = applyOfflineRewards({
      data: staticData,
      progress: bossProgress,
      selectedOfflineFarmStageId: "bamboo_road_10",
      lastSavedAtMs: 0,
      currentTimeMs: 30_000
    });
    const notFarmableData = {
      ...staticData,
      stages: staticData.stages.map((stage) =>
        stage.id === "bamboo_road_1"
          ? {
              ...stage,
              canFarmOffline: false
            }
          : stage
      )
    };
    const notFarmableProgress = createInitialPlayerProgress(staticData);
    notFarmableProgress.maps.bamboo_road.highestClearedStageIndex = 1;
    const notFarmableResult = applyOfflineRewards({
      data: notFarmableData,
      progress: notFarmableProgress,
      selectedOfflineFarmStageId: "bamboo_road_1",
      lastSavedAtMs: 0,
      currentTimeMs: 30_000
    });

    expect(missingResult.ok).toBe(false);
    if (missingResult.ok) {
      throw new Error("Missing farm target should be refused");
    }
    expect(missingResult.reason).toBe("invalid_farm_stage");
    expect(missingResult.progress.resources.silver).toBe(0);
    expect(lockedResult.ok).toBe(false);
    if (lockedResult.ok) {
      throw new Error("Locked farm target should be refused");
    }
    expect(lockedResult.reason).toBe("invalid_farm_stage");
    expect(lockedResult.progress.resources.silver).toBe(0);
    expect(bossResult.ok).toBe(false);
    if (bossResult.ok) {
      throw new Error("Boss farm target should be refused");
    }
    expect(bossResult.reason).toBe("invalid_farm_stage");
    expect(bossResult.progress.resources.silver).toBe(0);
    expect(notFarmableResult.ok).toBe(false);
    if (notFarmableResult.ok) {
      throw new Error("Non-farmable target should be refused");
    }
    expect(notFarmableResult.reason).toBe("invalid_farm_stage");
    expect(notFarmableResult.progress.resources.silver).toBe(0);
  });
});
