import { describe, expect, it } from "vitest";
import { getNextMasteryThreshold, getReachedMasteryThresholds } from "../../core";
import type { MasteryDefinition } from "../../core";
import mastery from "../../data/mastery.json" with { type: "json" };

const masteryData = mastery as MasteryDefinition;

describe("map mastery", () => {
  it("returns reached thresholds", () => {
    const reached = getReachedMasteryThresholds(500, masteryData.thresholds);

    expect(reached.map((threshold) => threshold.rank)).toEqual([
      "familiar",
      "trained"
    ]);
  });

  it("returns the next threshold", () => {
    expect(getNextMasteryThreshold(0, masteryData.thresholds)?.rank).toBe("familiar");
    expect(getNextMasteryThreshold(3000, masteryData.thresholds)).toBeNull();
  });
});
