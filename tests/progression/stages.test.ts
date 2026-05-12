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
      lotus_monastery: { highestClearedStageIndex: 6 }
    };
    const afterBoss: RegionProgress = {
      lotus_monastery: { highestClearedStageIndex: 7 }
    };

    expect(
      isRegionUnlocked(staticData, beforeBoss, "demon_cult_outpost")
    ).toBe(false);
    expect(
      isStageUnlocked(staticData, beforeBoss, "demon_cult_outpost_1")
    ).toBe(false);
    expect(isRegionUnlocked(staticData, afterBoss, "demon_cult_outpost")).toBe(
      true
    );
    expect(isStageUnlocked(staticData, afterBoss, "demon_cult_outpost_1")).toBe(
      true
    );
  });

  it("gates later Redline stages by highest cleared stage index", () => {
    const entryProgress: RegionProgress = {
      lotus_monastery: { highestClearedStageIndex: 7 },
      demon_cult_outpost: { highestClearedStageIndex: 0 }
    };
    const stageOneClearedProgress: RegionProgress = {
      lotus_monastery: { highestClearedStageIndex: 7 },
      demon_cult_outpost: { highestClearedStageIndex: 1 }
    };

    expect(
      isStageUnlocked(staticData, entryProgress, "demon_cult_outpost_2")
    ).toBe(false);
    expect(
      isStageUnlocked(staticData, stageOneClearedProgress, "demon_cult_outpost_2")
    ).toBe(true);
  });

  it("allows offline farming only for cleared non-boss farm stages", () => {
    const progress: RegionProgress = {
      lotus_monastery: { highestClearedStageIndex: 7 },
      demon_cult_outpost: { highestClearedStageIndex: 6 }
    };

    expect(isStageCleared(staticData, progress, "demon_cult_outpost_6")).toBe(
      true
    );
    expect(isStageFarmable(staticData, progress, "demon_cult_outpost_6")).toBe(
      true
    );
    expect(isStageFarmable(staticData, progress, "demon_cult_outpost_7")).toBe(
      false
    );
  });
});
