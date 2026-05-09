import { describe, expect, it } from "vitest";
import {
  applySaveLoadTransaction,
  createInitialPlayerProgress,
  createSaveData,
  loadSaveTransaction,
  SAVE_DATA_VERSION
} from "../../core";
import { buildSaveVersionFixtures } from "../fixtures/saveVersionFixtures";
import { staticData } from "../helpers/staticData";

describe("save load transaction", () => {
  it("parses, migrates, validates, and normalizes imported saves through one core load path", () => {
    const [fixture] = buildSaveVersionFixtures(staticData);
    const result = loadSaveTransaction({
      data: staticData,
      rawSave: fixture.rawSave,
      nowMs: 2_000
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.save.version).toBe(SAVE_DATA_VERSION);
    expect(result.save.selectedOfflineFarmStageId).toBe("bamboo_road_1");
    expect(result.save.offlineFarmPreset).toBe("balanced");
    expect(result.changed).toBe(false);
  });

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

  it("prevents repeated offline rewards when the persisted save is loaded again", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.maps.bamboo_road.highestClearedStageIndex = 1;

    const save = createSaveData({
      progress,
      selectedOfflineFarmStageId: "bamboo_road_1",
      nowMs: 1_000
    });
    const firstLoad = loadSaveTransaction({
      data: staticData,
      rawSave: save,
      nowMs: 61_000
    });

    expect(firstLoad.ok).toBe(true);
    if (!firstLoad.ok) {
      return;
    }

    const secondLoad = loadSaveTransaction({
      data: staticData,
      rawSave: firstLoad.save,
      nowMs: 61_000
    });

    expect(secondLoad.ok).toBe(true);
    if (!secondLoad.ok) {
      return;
    }

    expect(firstLoad.offlineRewards?.ok).toBe(true);
    expect(firstLoad.offlineRewards?.rewards.clears).toBeGreaterThan(0);
    expect(firstLoad.save.lastOfflineRewardAtMs).toBe(61_000);
    expect(secondLoad.changed).toBe(false);
    expect(secondLoad.offlineRewards?.ok).toBe(true);
    expect(secondLoad.offlineRewards?.rewards.clears).toBe(0);
    expect(secondLoad.save.progress.resources).toEqual(
      firstLoad.save.progress.resources
    );
  });

  it("normalizes invalid farm target metadata without changing reward timestamps", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.maps.bamboo_road.highestClearedStageIndex = 1;

    const save = createSaveData({
      progress,
      selectedOfflineFarmStageId: "bamboo_road_10",
      offlineFarmPreset: "balanced",
      nowMs: 1_000
    });
    const result = applySaveLoadTransaction({
      data: staticData,
      save,
      nowMs: 1_000
    });

    expect(result.ok).toBe(true);
    expect(result.changed).toBe(true);
    expect(result.save.selectedOfflineFarmStageId).toBe("bamboo_road_1");
    expect(result.save.updatedAtMs).toBe(1_000);
    expect(result.save.lastOfflineRewardAtMs).toBe(1_000);
    expect(result.offlineRewards?.ok).toBe(true);
    expect(result.offlineRewards?.rewards.clears).toBe(0);
  });

  it("rejects future save versions before offline rewards are applied", () => {
    const progress = createInitialPlayerProgress(staticData);
    const save = createSaveData({
      progress,
      selectedOfflineFarmStageId: null,
      nowMs: 1_000
    });
    const result = loadSaveTransaction({
      data: staticData,
      rawSave: {
        ...save,
        version: SAVE_DATA_VERSION + 1
      },
      nowMs: 31_000
    });

    expect(result).toMatchObject({
      ok: false,
      reason: "invalid_save",
      errors: [
        `version must be a supported save version (1-${SAVE_DATA_VERSION})`
      ]
    });
  });
});
