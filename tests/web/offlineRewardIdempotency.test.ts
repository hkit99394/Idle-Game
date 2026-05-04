import { describe, expect, it } from "vitest";
import {
  createInitialPlayerProgress,
  createSaveData
} from "../../core";
import {
  loadSaveDataFromStorage,
  loadSaveDataWithOfflineRewardsFromStorage,
  WEB_SAVE_STORAGE_KEY
} from "../../web/state/saveStorage";
import type { WebSaveStorage } from "../../web/state/saveStorage";
import { staticData } from "../helpers/staticData";

class MemoryStorage implements WebSaveStorage {
  private readonly items = new Map<string, string>();

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }

  removeItem(key: string): void {
    this.items.delete(key);
  }
}

describe("offline reward idempotency", () => {
  it("grants capped rewards once and updates timestamps before a second load", () => {
    const storage = new MemoryStorage();
    const progress = createInitialPlayerProgress(staticData);
    const savedAtMs = 1000;
    const firstLoadAtMs = savedAtMs + 10 * 60 * 60 * 1000;

    progress.maps.bamboo_road.highestClearedStageIndex = 1;
    progress.currentStageId = "bamboo_road_2";

    const save = createSaveData({
      progress,
      selectedOfflineFarmStageId: "bamboo_road_1",
      nowMs: savedAtMs
    });

    storage.setItem(WEB_SAVE_STORAGE_KEY, JSON.stringify(save));

    const firstLoad = loadSaveDataWithOfflineRewardsFromStorage(
      staticData,
      storage,
      firstLoadAtMs
    );
    const savedAfterFirstLoad = loadSaveDataFromStorage(staticData, storage);
    const secondLoad = loadSaveDataWithOfflineRewardsFromStorage(
      staticData,
      storage,
      firstLoadAtMs
    );

    expect(firstLoad.ok).toBe(true);
    expect(savedAfterFirstLoad.ok).toBe(true);
    expect(secondLoad.ok).toBe(true);
    if (!firstLoad.ok || !savedAfterFirstLoad.ok || !secondLoad.ok) {
      return;
    }

    expect(firstLoad.offlineRewards?.ok).toBe(true);
    expect(firstLoad.offlineRewards?.rewards.offlineSeconds).toBe(8 * 60 * 60);
    expect(firstLoad.offlineRewards?.rewards.clears).toBe(2880);
    expect(firstLoad.save.progress.resources.silver).toBeCloseTo(17280);
    expect(firstLoad.save.progress.resources.cultivation).toBeCloseTo(8640);
    expect(
      firstLoad.save.progress.maps.bamboo_road.combatExperience
    ).toBeCloseTo(8640);
    expect(savedAfterFirstLoad.save.updatedAtMs).toBe(firstLoadAtMs);
    expect(savedAfterFirstLoad.save.lastOfflineRewardAtMs).toBe(firstLoadAtMs);

    expect(secondLoad.offlineRewards?.ok).toBe(true);
    expect(secondLoad.offlineRewards?.rewards.offlineSeconds).toBe(0);
    expect(secondLoad.offlineRewards?.rewards.clears).toBe(0);
    expect(secondLoad.save.progress.resources.silver).toBeCloseTo(17280);
    expect(secondLoad.save.progress.resources.cultivation).toBeCloseTo(8640);
    expect(
      secondLoad.save.progress.maps.bamboo_road.combatExperience
    ).toBeCloseTo(8640);
  });
});
