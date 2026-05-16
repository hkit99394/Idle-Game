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
      stageId: "greenline_approach_1"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.rewards).toEqual({
      silver: 10,
      cultivation: 5,
      herbs: 0,
      combatExperience: 5
    });
    expect(result.progress.resources.credits).toBe(10);
    expect(result.progress.resources.resonance).toBe(5);
    expect(result.progress.districts.greenline_approach.combatData).toBe(5);
    expect(result.progress.styleMastery?.impact.experience).toBe(5);
    expect(result.progress.styleMastery?.pulse.experience).toBe(5);
    expect(result.progress.styleMastery?.edge.experience).toBe(5);
    expect(result.progress.styleMastery?.brace.experience).toBe(5);
    expect(result.progress.districts.greenline_approach.highestClearedRouteIndex).toBe(1);
    expect(result.progress.currentRouteId).toBe("greenline_approach_1");
  });

  it("reports newly reached mastery ranks", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.districts.greenline_approach.combatData = 95;

    const result = applyStageClearRewards(staticData, {
      progress,
      stageId: "greenline_approach_1"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.masteryRanksBefore).toEqual([]);
    expect(result.masteryRanksAfter).toEqual(["familiar"]);
    expect(result.newlyReachedMasteryRanks).toEqual(["familiar"]);
    expect(result.progress.heroes.iron_fist_initiate.level).toBe(2);
  });

  it("applies map reward mastery bonus to silver and cultivation", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.districts.greenline_approach.combatData = 500;

    const result = applyStageClearRewards(staticData, {
      progress,
      stageId: "greenline_approach_1"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.rewards.silver).toBeCloseTo(10.2);
    expect(result.rewards.cultivation).toBeCloseTo(5.1);
    expect(result.rewards.combatExperience).toBe(5);
  });

  it("grants Lotus herbs through stage rewards", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.districts.greenline_approach.highestClearedRouteIndex = 10;
    progress.districts.veil_district.highestClearedRouteIndex = 10;
    progress.districts.black_iron_foundry.highestClearedRouteIndex = 10;
    progress.currentRouteId = "lotus_clinic_1";

    const result = applyStageClearRewards(staticData, {
      progress,
      stageId: "lotus_clinic_1"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.rewards.herbs).toBe(6);
    expect(result.progress.resources.reagents).toBe(6);
    expect(result.equipmentRewards).toEqual([
      {
        equipmentId: "lotus_dew_countermeasure",
        quantity: 1
      }
    ]);
  });

  it("returns an error for missing stages", () => {
    const progress = createInitialPlayerProgress(staticData);
    const result = applyStageClearRewards(staticData, {
      progress,
      stageId: "missing"
    });

    expect(result.ok).toBe(false);
  });

  it("rejects locked stages without changing progress", () => {
    const progress = createInitialPlayerProgress(staticData);
    const result = applyStageClearRewards(staticData, {
      progress,
      stageId: "greenline_approach_3"
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.reason).toBe("locked_stage");
    expect(result.progress).toBe(progress);
    expect(progress.resources.credits).toBe(0);
    expect(progress.districts.greenline_approach.combatData).toBe(0);
    expect(progress.districts.greenline_approach.highestClearedRouteIndex).toBe(0);
  });
});
