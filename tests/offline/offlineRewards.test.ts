import { describe, expect, it } from "vitest";
import { calculateOfflineRewards } from "../../core";

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
});
