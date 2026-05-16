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
    expect(result.progress.resources.silver).toBe(10);
    expect(result.progress.resources.cultivation).toBe(5);
    expect(result.progress.maps.greenline_approach.combatExperience).toBe(5);
    expect(result.progress.styleMastery?.fist.experience).toBe(5);
    expect(result.progress.styleMastery?.palm.experience).toBe(5);
    expect(result.progress.styleMastery?.sword.experience).toBe(5);
    expect(result.progress.styleMastery?.staff.experience).toBe(5);
    expect(result.progress.maps.greenline_approach.highestClearedStageIndex).toBe(1);
    expect(result.progress.currentStageId).toBe("greenline_approach_1");
  });

  it("reports newly reached mastery ranks", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.maps.greenline_approach.combatExperience = 95;

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
    expect(result.progress.heroes.iron_fist_disciple.level).toBe(2);
  });

  it("applies map reward mastery bonus to silver and cultivation", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.maps.greenline_approach.combatExperience = 500;

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
    progress.maps.greenline_approach.highestClearedStageIndex = 10;
    progress.maps.veil_district.highestClearedStageIndex = 10;
    progress.maps.black_iron_foundry.highestClearedStageIndex = 10;
    progress.currentStageId = "lotus_clinic_1";

    const result = applyStageClearRewards(staticData, {
      progress,
      stageId: "lotus_clinic_1"
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.rewards.herbs).toBe(6);
    expect(result.progress.resources.herbs).toBe(6);
    expect(result.equipmentRewards).toEqual([
      {
        equipmentId: "lotus_dew_pill",
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
    expect(progress.resources.silver).toBe(0);
    expect(progress.maps.greenline_approach.combatExperience).toBe(0);
    expect(progress.maps.greenline_approach.highestClearedStageIndex).toBe(0);
  });
});
