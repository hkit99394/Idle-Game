import { describe, expect, it } from "vitest";
import {
  createInitialPlayerProgress,
  createSaveData
} from "../../core";
import {
  createInitialWebGameStateFromStorage,
  getWebGameViewModel,
  purchaseGameUpgrade,
  resolveSelectedStageBattle,
  webGameStateReducer
} from "../../web/state/gameState";
import {
  loadSaveDataFromStorage,
  saveWebGameStateToStorage,
  WEB_SAVE_AUTOSAVE_INTERVAL_MS,
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

describe("web save storage", () => {
  it("loads saved progress and farm target into initial web state", () => {
    const storage = new MemoryStorage();
    const progress = createInitialPlayerProgress(staticData);
    progress.resources.silver = 123;
    progress.maps.bamboo_road.highestClearedStageIndex = 2;
    progress.currentStageId = "bamboo_road_3";
    const save = createSaveData({
      progress,
      selectedOfflineFarmStageId: "bamboo_road_1",
      nowMs: 1000
    });

    storage.setItem(WEB_SAVE_STORAGE_KEY, JSON.stringify(save));

    const state = createInitialWebGameStateFromStorage(staticData, storage, 1000);

    expect(state.progress.resources.silver).toBe(123);
    expect(state.progress.currentStageId).toBe("bamboo_road_3");
    expect(state.selectedStageId).toBe("bamboo_road_3");
    expect(state.selectedOfflineFarmStageId).toBe("bamboo_road_1");
  });

  it("applies offline rewards once on load and advances reward timestamps", () => {
    const storage = new MemoryStorage();
    const progress = createInitialPlayerProgress(staticData);
    progress.maps.bamboo_road.highestClearedStageIndex = 1;
    progress.currentStageId = "bamboo_road_2";
    const save = createSaveData({
      progress,
      selectedOfflineFarmStageId: "bamboo_road_1",
      nowMs: 1000
    });
    storage.setItem(WEB_SAVE_STORAGE_KEY, JSON.stringify(save));

    const firstLoadState = createInitialWebGameStateFromStorage(
      staticData,
      storage,
      31_000
    );
    const savedAfterFirstLoad = loadSaveDataFromStorage(staticData, storage);
    const secondLoadState = createInitialWebGameStateFromStorage(
      staticData,
      storage,
      31_000
    );

    expect(firstLoadState.progress.resources.silver).toBeCloseTo(18);
    expect(firstLoadState.progress.resources.cultivation).toBeCloseTo(9);
    expect(
      firstLoadState.progress.maps.bamboo_road.combatExperience
    ).toBeCloseTo(9);
    expect(firstLoadState.progress.maps.bamboo_road.highestClearedStageIndex).toBe(1);
    expect(firstLoadState.progress.currentStageId).toBe("bamboo_road_2");
    expect(firstLoadState.offlineSummary).toMatchObject({
      stageId: "bamboo_road_1",
      offlineSeconds: 30,
      clears: 3,
      silver: 18,
      cultivation: 9,
      combatExperience: 9
    });
    expect(savedAfterFirstLoad.ok).toBe(true);
    if (!savedAfterFirstLoad.ok) {
      return;
    }
    expect(savedAfterFirstLoad.save.updatedAtMs).toBe(31_000);
    expect(savedAfterFirstLoad.save.lastOfflineRewardAtMs).toBe(31_000);
    expect(
      getWebGameViewModel(staticData, firstLoadState).offlineSummary
    ).toMatchObject({
      stageName: "Bamboo Road 1",
      regionName: "Bamboo Road",
      silver: 18,
      cultivation: 9,
      combatExperience: 9
    });
    expect(
      webGameStateReducer(staticData, firstLoadState, {
        type: "dismiss_offline_summary"
      }).offlineSummary
    ).toBeNull();
    expect(secondLoadState.progress.resources.silver).toBeCloseTo(18);
    expect(secondLoadState.progress.resources.cultivation).toBeCloseTo(9);
    expect(
      secondLoadState.progress.maps.bamboo_road.combatExperience
    ).toBeCloseTo(9);
    expect(secondLoadState.offlineSummary).toBeNull();
  });

  it("falls back safely from invalid saved offline farm targets", () => {
    const cases = [
      {
        name: "missing",
        selectedOfflineFarmStageId: "missing_stage",
        highestClearedStageIndex: 9,
        currentStageId: "bamboo_road_10",
        expectedFarmStageId: "bamboo_road_8"
      },
      {
        name: "locked",
        selectedOfflineFarmStageId: "bamboo_road_3",
        highestClearedStageIndex: 1,
        currentStageId: "bamboo_road_2",
        expectedFarmStageId: "bamboo_road_1"
      },
      {
        name: "boss",
        selectedOfflineFarmStageId: "bamboo_road_10",
        highestClearedStageIndex: 10,
        currentStageId: "bamboo_road_10",
        expectedFarmStageId: "bamboo_road_8"
      }
    ];

    for (const testCase of cases) {
      const storage = new MemoryStorage();
      const progress = createInitialPlayerProgress(staticData);
      progress.maps.bamboo_road.highestClearedStageIndex =
        testCase.highestClearedStageIndex;
      progress.currentStageId = testCase.currentStageId;
      const save = createSaveData({
        progress,
        selectedOfflineFarmStageId: testCase.selectedOfflineFarmStageId,
        nowMs: 1000
      });

      storage.setItem(WEB_SAVE_STORAGE_KEY, JSON.stringify(save));

      const state = createInitialWebGameStateFromStorage(
        staticData,
        storage,
        1000
      );
      const normalizedSave = loadSaveDataFromStorage(staticData, storage);

      expect(state.selectedOfflineFarmStageId, testCase.name).toBe(
        testCase.expectedFarmStageId
      );
      expect(normalizedSave.ok, testCase.name).toBe(true);
      if (!normalizedSave.ok) {
        return;
      }
      expect(
        normalizedSave.save.selectedOfflineFarmStageId,
        testCase.name
      ).toBe(testCase.expectedFarmStageId);
    }
  });

  it("falls back safely when stored save data is invalid", () => {
    const storage = new MemoryStorage();
    storage.setItem(WEB_SAVE_STORAGE_KEY, "{not json");

    const loadResult = loadSaveDataFromStorage(staticData, storage);
    const state = createInitialWebGameStateFromStorage(staticData, storage);

    expect(loadResult.ok).toBe(false);
    if (loadResult.ok) {
      return;
    }

    expect(loadResult.reason).toBe("invalid_json");
    expect(state.progress.currentStageId).toBe("bamboo_road_1");
    expect(state.progress.resources.silver).toBe(0);
  });

  it("saves battle and purchase states while preserving save timestamps", () => {
    const storage = new MemoryStorage();
    const progress = createInitialPlayerProgress(staticData);
    const previousSave = createSaveData({
      progress,
      selectedOfflineFarmStageId: null,
      nowMs: 1000
    });
    storage.setItem(WEB_SAVE_STORAGE_KEY, JSON.stringify(previousSave));

    const battleState = resolveSelectedStageBattle(
      staticData,
      createInitialWebGameStateFromStorage(staticData, storage)
    );
    const battleSaveResult = saveWebGameStateToStorage(
      staticData,
      battleState,
      storage,
      2000
    );
    const purchaseState = purchaseGameUpgrade(
      staticData,
      {
        ...battleState,
        progress: {
          ...battleState.progress,
          resources: {
            silver: 20,
            cultivation: 0
          }
        }
      },
      {
        upgradeId: "hero_outer_training",
        heroId: "iron_fist_disciple"
      }
    );
    const purchaseSaveResult = saveWebGameStateToStorage(
      staticData,
      purchaseState,
      storage,
      3000
    );

    expect(battleSaveResult.ok).toBe(true);
    expect(purchaseSaveResult.ok).toBe(true);
    if (!battleSaveResult.ok || !purchaseSaveResult.ok) {
      return;
    }

    expect(battleSaveResult.save.progress.resources.silver).toBe(10);
    expect(battleSaveResult.save.createdAtMs).toBe(1000);
    expect(battleSaveResult.save.updatedAtMs).toBe(2000);
    expect(battleSaveResult.save.lastOfflineRewardAtMs).toBe(1000);
    expect(purchaseSaveResult.save.progress.resources.silver).toBe(8);
    expect(purchaseSaveResult.save.createdAtMs).toBe(1000);
    expect(purchaseSaveResult.save.updatedAtMs).toBe(3000);
    expect(purchaseSaveResult.save.lastOfflineRewardAtMs).toBe(1000);
  });

  it("uses an autosave interval within the MVP range", () => {
    expect(WEB_SAVE_AUTOSAVE_INTERVAL_MS).toBeGreaterThanOrEqual(10_000);
    expect(WEB_SAVE_AUTOSAVE_INTERVAL_MS).toBeLessThanOrEqual(30_000);
  });
});
