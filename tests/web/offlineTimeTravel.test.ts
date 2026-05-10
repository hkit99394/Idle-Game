import { describe, expect, it } from "vitest";
import { createInitialWebGameState } from "../../web/state/gameState";
import { applyOfflineTimeTravel } from "../../web/state/saveToolCommands";
import {
  loadSaveDataFromStorage,
  WEB_SAVE_STORAGE_KEY
} from "../../web/state/saveStorage";
import { MemoryStorage } from "../helpers/memoryStorage";
import { staticData } from "../helpers/staticData";

class FailFromRewardCommitStorage extends MemoryStorage {
  private failed = false;

  override setItem(key: string, value: string): void {
    if (this.failed || isRewardedSave(value)) {
      this.failed = true;
      throw new Error("quota exceeded");
    }

    super.setItem(key, value);
  }
}

function isRewardedSave(value: string): boolean {
  try {
    const save = JSON.parse(value) as {
      progress?: { resources?: { silver?: unknown } };
    };

    return typeof save.progress?.resources?.silver === "number"
      ? save.progress.resources.silver > 0
      : false;
  } catch {
    return false;
  }
}

describe("offline time travel save state", () => {
  it("leaves the pre-travel save persisted when reward commit failures persist", () => {
    const storage = new FailFromRewardCommitStorage();
    const state = createInitialWebGameState(staticData);
    const travelReadyState = {
      ...state,
      selectedOfflineFarmStageId: "bamboo_road_1",
      progress: {
        ...state.progress,
        currentStageId: "bamboo_road_2",
        maps: {
          ...state.progress.maps,
          bamboo_road: {
            ...state.progress.maps.bamboo_road,
            highestClearedStageIndex: 1
          }
        }
      }
    };

    const result = applyOfflineTimeTravel(
      staticData,
      travelReadyState,
      storage,
      30,
      100_000
    );
    const storedSave = loadSaveDataFromStorage(staticData, storage);

    expect(result).toEqual({
      ok: false,
      message: "Save storage failed",
      errors: [
        "Save load write failed after offlineRewardsApplied: quota exceeded"
      ]
    });
    expect(storedSave.ok).toBe(true);
    if (!storedSave.ok) {
      return;
    }
    expect(storedSave.save.createdAtMs).toBe(100_000);
    expect(storedSave.save.updatedAtMs).toBe(100_000);
    expect(storedSave.save.lastOfflineRewardAtMs).toBe(100_000);
    expect(storedSave.save.updatedAtMs).not.toBe(70_000);
    expect(storedSave.save.progress.resources.silver).toBe(0);
    expect(storage.getItem(WEB_SAVE_STORAGE_KEY)).toContain(
      '"selectedOfflineFarmStageId":"bamboo_road_1"'
    );
  });

  it("keeps the pre-travel save active and persisted when tiny time travel has no rewards", () => {
    const storage = new MemoryStorage();
    const state = createInitialWebGameState(staticData);
    const travelReadyState = {
      ...state,
      selectedOfflineFarmStageId: "bamboo_road_1",
      progress: {
        ...state.progress,
        currentStageId: "bamboo_road_2",
        maps: {
          ...state.progress.maps,
          bamboo_road: {
            ...state.progress.maps.bamboo_road,
            highestClearedStageIndex: 1
          }
        }
      }
    };

    const result = applyOfflineTimeTravel(
      staticData,
      travelReadyState,
      storage,
      1,
      100_000
    );
    const storedSave = loadSaveDataFromStorage(staticData, storage);

    expect(result.ok).toBe(true);
    expect(storedSave.ok).toBe(true);
    if (!result.ok || !storedSave.ok) {
      return;
    }
    expect(result.message).toBe("Offline time travel applied with no rewards");
    expect(result.offlineSummary).toBeNull();
    expect(result.save.createdAtMs).toBe(100_000);
    expect(result.save.updatedAtMs).toBe(100_000);
    expect(result.save.lastOfflineRewardAtMs).toBe(100_000);
    expect(result.save.updatedAtMs).not.toBe(99_000);
    expect(storedSave.save).toEqual(result.save);
    expect(storedSave.save.progress.resources.silver).toBe(0);
  });
});
