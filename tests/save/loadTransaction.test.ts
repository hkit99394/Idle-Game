import { describe, expect, it } from "vitest";
import {
  applySaveLoadTransaction,
  createInitialPlayerProgress,
  createSaveData
} from "../../core";
import { staticData } from "../helpers/staticData";

describe("save load transaction", () => {
  it("applies offline rewards in core and advances the saved reward timestamp once", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.maps.bamboo_road.highestClearedStageIndex = 1;

    const save = createSaveData({
      progress,
      selectedOfflineFarmStageId: "bamboo_road_1",
      nowMs: 1_000
    });
    const firstLoad = applySaveLoadTransaction({
      data: staticData,
      save,
      nowMs: 31_000
    });

    expect(firstLoad.changed).toBe(true);
    expect(firstLoad.offlineRewards?.ok).toBe(true);
    expect(firstLoad.offlineRewards?.rewards.clears).toBeGreaterThan(0);
    expect(firstLoad.save.updatedAtMs).toBe(31_000);
    expect(firstLoad.save.lastOfflineRewardAtMs).toBe(31_000);

    const secondLoad = applySaveLoadTransaction({
      data: staticData,
      save: firstLoad.save,
      nowMs: 31_000
    });

    expect(secondLoad.changed).toBe(false);
    expect(secondLoad.offlineRewards?.ok).toBe(true);
    expect(secondLoad.offlineRewards?.rewards.clears).toBe(0);
  });
});
