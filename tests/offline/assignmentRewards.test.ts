import { describe, expect, it } from "vitest";
import {
  applyOfflineAssignmentRewards,
  createInitialPlayerProgress,
  setAssignmentHeroes
} from "../../core";
import { staticData } from "../helpers/staticData";

const uncappedConfig = {
  offlineCapSeconds: 48 * 60 * 60,
  estimatedClearTimeSeconds: 10,
  minimumClearTimeSeconds: 5,
  offlineEfficiency: 1
};

describe("offline assignment rewards", () => {
  it("applies patrol rewards, map mastery, equipment, and hero level sync", () => {
    const progress = createInitialPlayerProgress(staticData);
    const assigned = setAssignmentHeroes(staticData, {
      progress,
      assignmentId: "bamboo_road_patrol",
      heroIds: ["iron_fist_disciple"]
    });

    expect(assigned.ok).toBe(true);
    if (!assigned.ok) {
      return;
    }

    const result = applyOfflineAssignmentRewards({
      data: staticData,
      progress: assigned.progress,
      lastSavedAtMs: 0,
      currentTimeMs: 25 * 60 * 60 * 1000,
      config: uncappedConfig
    });

    expect(result.rewards).toMatchObject({
      offlineSeconds: 25 * 60 * 60,
      silver: 600,
      combatExperience: 100,
      cultivation: 0,
      styleMasteryExperience: 0
    });
    expect(result.rewards.equipmentRewards).toEqual([
      {
        equipmentId: "training_wraps",
        quantity: 6
      }
    ]);
    expect(result.progress.resources.silver).toBe(600);
    expect(result.progress.maps.bamboo_road.combatExperience).toBe(100);
    expect(result.progress.equipment?.inventory.training_wraps).toBe(6);
    expect(result.progress.heroes.iron_fist_disciple.level).toBeGreaterThan(1);
  });

  it("applies training ground style mastery to assigned hero styles", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.maps.bamboo_road.highestClearedStageIndex = 10;
    const assigned = setAssignmentHeroes(staticData, {
      progress,
      assignmentId: "mist_valley_meditation",
      heroIds: ["azure_palm_monk"]
    });

    expect(assigned.ok).toBe(true);
    if (!assigned.ok) {
      return;
    }

    const result = applyOfflineAssignmentRewards({
      data: staticData,
      progress: assigned.progress,
      lastSavedAtMs: 0,
      currentTimeMs: 2 * 60 * 60 * 1000,
      config: uncappedConfig
    });

    expect(result.rewards).toMatchObject({
      cultivation: 36,
      styleMasteryExperience: 24
    });
    expect(result.progress.resources.cultivation).toBe(36);
    expect(result.progress.styleMastery?.palm?.experience).toBe(24);
    expect(result.progress.styleMastery?.fist?.experience ?? 0).toBe(0);
  });
});
