import { describe, expect, it } from "vitest";
import {
  applyOfflineRewards,
  calculateOfflineRewards,
  createInitialPlayerProgress,
  previewOfflineRewards
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
      herbsPerClear: 2,
      combatExperiencePerClear: 5
    });

    expect(result.offlineSeconds).toBe(8 * 60 * 60);
    expect(result.clears).toBe(2880);
    expect(result.silver).toBeCloseTo(17280);
    expect(result.cultivation).toBeCloseTo(8640);
    expect(result.herbs).toBeCloseTo(3456);
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
      herbsPerClear: 0,
      combatExperiencePerClear: 5
    });

    expect(result.clears).toBe(2);
  });

  it("applies rewards from a selected cleared non-boss farm stage", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.maps.greenline_approach.highestClearedStageIndex = 2;
    progress.currentStageId = "greenline_approach_3";

    const result = applyOfflineRewards({
      data: staticData,
      progress,
      selectedOfflineFarmStageId: "greenline_approach_1",
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
    expect(result.progress.maps.greenline_approach.combatExperience).toBeCloseTo(7.5);
    expect(result.progress.maps.greenline_approach.highestClearedStageIndex).toBe(2);
    expect(result.progress.currentStageId).toBe("greenline_approach_3");
  });

  it("updates hero levels after offline combat experience is granted", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.maps.greenline_approach.highestClearedStageIndex = 1;

    const result = applyOfflineRewards({
      data: staticData,
      progress,
      selectedOfflineFarmStageId: "greenline_approach_1",
      lastSavedAtMs: 0,
      currentTimeMs: 200_000,
      config: {
        offlineCapSeconds: 1_000,
        estimatedClearTimeSeconds: 10,
        minimumClearTimeSeconds: 5,
        offlineEfficiency: 1
      }
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.rewards.combatExperience).toBe(100);
    expect(result.progress.heroes.iron_fist_disciple.level).toBe(2);
  });

  it("previews rewards with the same formula without mutating progress", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.maps.greenline_approach.highestClearedStageIndex = 1;

    const preview = previewOfflineRewards({
      data: staticData,
      progress,
      selectedOfflineFarmStageId: "greenline_approach_1",
      previewSeconds: 30,
      config: {
        offlineCapSeconds: 100,
        estimatedClearTimeSeconds: 10,
        minimumClearTimeSeconds: 5,
        offlineEfficiency: 0.5
      }
    });

    expect(preview.ok).toBe(true);
    if (!preview.ok) {
      return;
    }

    expect(preview.rewards).toMatchObject({
      offlineSeconds: 30,
      clears: 3,
      silver: 15,
      cultivation: 7.5,
      herbs: 0,
      combatExperience: 7.5
    });
    expect(preview.masteryExperienceGain).toBe(7.5);
    expect(progress.resources.silver).toBe(0);
    expect(progress.maps.greenline_approach.combatExperience).toBe(0);
  });

  it("applies and previews herbs from Lotus offline farming", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.maps.greenline_approach.highestClearedStageIndex = 10;
    progress.maps.veil_district.highestClearedStageIndex = 10;
    progress.maps.black_iron_foundry.highestClearedStageIndex = 10;
    progress.maps.lotus_clinic.highestClearedStageIndex = 1;
    progress.currentStageId = "lotus_clinic_2";

    const preview = previewOfflineRewards({
      data: staticData,
      progress,
      selectedOfflineFarmStageId: "lotus_clinic_1",
      previewSeconds: 30,
      config: {
        offlineCapSeconds: 100,
        estimatedClearTimeSeconds: 10,
        minimumClearTimeSeconds: 5,
        offlineEfficiency: 0.5
      }
    });
    const applied = applyOfflineRewards({
      data: staticData,
      progress,
      selectedOfflineFarmStageId: "lotus_clinic_1",
      lastSavedAtMs: 0,
      currentTimeMs: 30_000,
      config: {
        offlineCapSeconds: 100,
        estimatedClearTimeSeconds: 10,
        minimumClearTimeSeconds: 5,
        offlineEfficiency: 0.5
      }
    });

    expect(preview.ok).toBe(true);
    if (!preview.ok) {
      return;
    }
    expect(preview.rewards.herbs).toBe(9);
    expect(applied.ok).toBe(true);
    if (!applied.ok) {
      return;
    }
    expect(applied.progress.resources.herbs).toBe(9);
  });

  it("previews invalid farm targets safely", () => {
    const progress = createInitialPlayerProgress(staticData);
    const preview = previewOfflineRewards({
      data: staticData,
      progress,
      selectedOfflineFarmStageId: "greenline_approach_10",
      previewSeconds: 60
    });

    expect(preview).toMatchObject({
      ok: false,
      reason: "invalid_farm_stage",
      rewards: {
        clears: 0,
        silver: 0,
        cultivation: 0,
        herbs: 0,
        combatExperience: 0
      }
    });
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
      selectedOfflineFarmStageId: "greenline_approach_2",
      lastSavedAtMs: 0,
      currentTimeMs: 30_000
    });
    const bossProgress = createInitialPlayerProgress(staticData);
    bossProgress.maps.greenline_approach.highestClearedStageIndex = 10;
    bossProgress.currentStageId = "greenline_approach_10";
    const bossResult = applyOfflineRewards({
      data: staticData,
      progress: bossProgress,
      selectedOfflineFarmStageId: "greenline_approach_10",
      lastSavedAtMs: 0,
      currentTimeMs: 30_000
    });
    const notFarmableData = {
      ...staticData,
      stages: staticData.stages.map((stage) =>
        stage.id === "greenline_approach_1"
          ? {
              ...stage,
              canFarmOffline: false
            }
          : stage
      )
    };
    const notFarmableProgress = createInitialPlayerProgress(staticData);
    notFarmableProgress.maps.greenline_approach.highestClearedStageIndex = 1;
    const notFarmableResult = applyOfflineRewards({
      data: notFarmableData,
      progress: notFarmableProgress,
      selectedOfflineFarmStageId: "greenline_approach_1",
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
