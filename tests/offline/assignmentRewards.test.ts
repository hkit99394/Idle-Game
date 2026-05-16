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
      assignmentId: "greenline_sweep",
      heroIds: ["iron_fist_initiate"]
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
        equipmentId: "impact_training_wraps",
        quantity: 6
      }
    ]);
    expect(result.progress.resources.silver).toBe(600);
    expect(result.progress.maps.greenline_approach.combatExperience).toBe(100);
    expect(result.progress.equipment?.inventory.impact_training_wraps).toBe(6);
    expect(result.progress.heroes.iron_fist_initiate.level).toBeGreaterThan(1);
  });

  it("applies training ground style mastery to assigned hero styles", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.maps.greenline_approach.highestClearedStageIndex = 10;
    const assigned = setAssignmentHeroes(staticData, {
      progress,
      assignmentId: "veil_district_calibration",
      heroIds: ["azure_pulse_monk"]
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
    expect(result.progress.styleMastery?.pulse?.experience).toBe(24);
    expect(result.progress.styleMastery?.impact?.experience ?? 0).toBe(0);
  });

  it("applies Lotus medicine pavilion herbs and medicine rewards", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.maps.greenline_approach.highestClearedStageIndex = 10;
    progress.maps.veil_district.highestClearedStageIndex = 10;
    progress.maps.black_iron_foundry.highestClearedStageIndex = 10;
    progress.maps.lotus_clinic.highestClearedStageIndex = 3;
    const assigned = setAssignmentHeroes(staticData, {
      progress,
      assignmentId: "lotus_countermeasure_pavilion",
      heroIds: ["mountain_brace_guardian"]
    });

    expect(assigned.ok).toBe(true);
    if (!assigned.ok) {
      return;
    }

    const result = applyOfflineAssignmentRewards({
      data: staticData,
      progress: assigned.progress,
      lastSavedAtMs: 0,
      currentTimeMs: 13 * 60 * 60 * 1000,
      config: uncappedConfig
    });

    expect(result.rewards).toMatchObject({
      cultivation: 156,
      herbs: 234,
      styleMasteryExperience: 104
    });
    expect(result.rewards.equipmentRewards).toEqual([
      {
        equipmentId: "lotus_dew_countermeasure",
        quantity: 3
      },
      {
        equipmentId: "mending_patch",
        quantity: 1
      }
    ]);
    expect(result.progress.resources.herbs).toBe(234);
    expect(result.progress.resources.cultivation).toBe(156);
    expect(result.progress.equipment?.inventory.lotus_dew_countermeasure).toBe(3);
    expect(result.progress.equipment?.inventory.mending_patch).toBe(1);
  });
});
