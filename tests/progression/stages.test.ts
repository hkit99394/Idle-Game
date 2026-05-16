import { describe, expect, it } from "vitest";
import {
  isRegionUnlocked,
  isStageCleared,
  isStageFarmable,
  isStageUnlocked
} from "../../core";
import type { RegionProgress } from "../../core";
import { staticData } from "../helpers/staticData";

describe("stage progression", () => {
  it("unlocks Redline Outpost only after the Lotus boss is cleared", () => {
    const beforeBoss: RegionProgress = {
      lotus_clinic: { highestClearedStageIndex: 6 }
    };
    const afterBoss: RegionProgress = {
      lotus_clinic: { highestClearedStageIndex: 7 }
    };

    expect(
      isRegionUnlocked(staticData, beforeBoss, "redline_outpost")
    ).toBe(false);
    expect(
      isStageUnlocked(staticData, beforeBoss, "redline_outpost_1")
    ).toBe(false);
    expect(isRegionUnlocked(staticData, afterBoss, "redline_outpost")).toBe(
      true
    );
    expect(isStageUnlocked(staticData, afterBoss, "redline_outpost_1")).toBe(
      true
    );
  });

  it("gates later Redline stages by highest cleared stage index", () => {
    const entryProgress: RegionProgress = {
      lotus_clinic: { highestClearedStageIndex: 7 },
      redline_outpost: { highestClearedStageIndex: 0 }
    };
    const stageOneClearedProgress: RegionProgress = {
      lotus_clinic: { highestClearedStageIndex: 7 },
      redline_outpost: { highestClearedStageIndex: 1 }
    };

    expect(
      isStageUnlocked(staticData, entryProgress, "redline_outpost_2")
    ).toBe(false);
    expect(
      isStageUnlocked(staticData, stageOneClearedProgress, "redline_outpost_2")
    ).toBe(true);
  });

  it("allows offline farming only for cleared non-boss farm stages", () => {
    const progress: RegionProgress = {
      lotus_clinic: { highestClearedStageIndex: 7 },
      redline_outpost: { highestClearedStageIndex: 6 }
    };

    expect(isStageCleared(staticData, progress, "redline_outpost_6")).toBe(
      true
    );
    expect(isStageFarmable(staticData, progress, "redline_outpost_6")).toBe(
      true
    );
    expect(isStageFarmable(staticData, progress, "redline_outpost_7")).toBe(
      false
    );
  });
});
