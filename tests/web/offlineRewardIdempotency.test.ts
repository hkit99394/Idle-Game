import { describe, expect, it } from "vitest";
import {
  createInitialPlayerProgress,
  createSaveData,
  setAssignmentHeroes
} from "../../core";
import {
  loadSaveDataFromStorage,
  loadSaveDataWithOfflineRewardsFromStorage,
  WEB_SAVE_STORAGE_KEY
} from "../../web/state/saveStorage";
import { MemoryStorage } from "../helpers/memoryStorage";
import { staticData } from "../helpers/staticData";

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

  it("grants Demon Cult farm rewards once through the current save schema", () => {
    const storage = new MemoryStorage();
    const progress = createInitialPlayerProgress(staticData);
    const savedAtMs = 1000;
    const firstLoadAtMs = savedAtMs + 60_000;

    progress.maps.bamboo_road.highestClearedStageIndex = 10;
    progress.maps.mist_valley.highestClearedStageIndex = 6;
    progress.maps.black_iron_fort.highestClearedStageIndex = 7;
    progress.maps.lotus_monastery.highestClearedStageIndex = 7;
    progress.maps.demon_cult_outpost.highestClearedStageIndex = 6;
    progress.currentStageId = "demon_cult_outpost_7";

    const save = createSaveData({
      progress,
      selectedOfflineFarmStageId: "demon_cult_outpost_6",
      nowMs: savedAtMs
    });

    storage.setItem(WEB_SAVE_STORAGE_KEY, JSON.stringify(save));

    const firstLoad = loadSaveDataWithOfflineRewardsFromStorage(
      staticData,
      storage,
      firstLoadAtMs
    );
    const secondLoad = loadSaveDataWithOfflineRewardsFromStorage(
      staticData,
      storage,
      firstLoadAtMs
    );

    expect(firstLoad.ok).toBe(true);
    expect(secondLoad.ok).toBe(true);
    if (!firstLoad.ok || !secondLoad.ok) {
      return;
    }

    const firstOfflineRewards = firstLoad.offlineRewards;

    expect(firstOfflineRewards?.ok).toBe(true);
    if (!firstOfflineRewards?.ok) {
      return;
    }

    expect(firstOfflineRewards.stageId).toBe("demon_cult_outpost_6");
    expect(firstOfflineRewards.rewards.clears).toBe(6);
    expect(firstLoad.save.progress.resources.silver).toBeCloseTo(5832);
    expect(firstLoad.save.progress.resources.cultivation).toBeCloseTo(2916);
    expect(firstLoad.save.progress.resources.herbs).toBeCloseTo(180);
    expect(firstLoad.save.progress.maps.demon_cult_outpost.combatExperience).toBeCloseTo(
      1101.6
    );
    expect(firstLoad.save.progress.currentStageId).toBe("demon_cult_outpost_7");

    const secondOfflineRewards = secondLoad.offlineRewards;

    expect(secondOfflineRewards?.ok).toBe(true);
    if (!secondOfflineRewards?.ok) {
      return;
    }

    expect(secondOfflineRewards.rewards.clears).toBe(0);
    expect(secondLoad.save.progress.resources).toEqual(firstLoad.save.progress.resources);
    expect(secondLoad.save.progress.maps.demon_cult_outpost).toEqual(
      firstLoad.save.progress.maps.demon_cult_outpost
    );
  });

  it("grants offline assignment rewards once with the same timestamp guard", () => {
    const storage = new MemoryStorage();
    const progress = createInitialPlayerProgress(staticData);
    const savedAtMs = 1000;
    const firstLoadAtMs = savedAtMs + 10 * 60 * 60 * 1000;
    const assigned = setAssignmentHeroes(staticData, {
      progress,
      assignmentId: "bamboo_road_patrol",
      heroIds: ["iron_fist_disciple"]
    });

    expect(assigned.ok).toBe(true);
    if (!assigned.ok) {
      return;
    }

    const save = createSaveData({
      progress: assigned.progress,
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

    expect(firstLoad.offlineAssignmentRewards?.rewards.offlineSeconds).toBe(
      8 * 60 * 60
    );
    expect(firstLoad.offlineAssignmentRewards?.rewards.silver).toBeCloseTo(115.2);
    expect(
      firstLoad.offlineAssignmentRewards?.rewards.combatExperience
    ).toBeCloseTo(19.2);
    expect(firstLoad.save.progress.resources.silver).toBeCloseTo(115.2);
    expect(firstLoad.save.progress.maps.bamboo_road.combatExperience).toBeCloseTo(
      19.2
    );
    expect(firstLoad.save.progress.equipment?.inventory.training_wraps).toBe(1);
    expect(savedAfterFirstLoad.save.updatedAtMs).toBe(firstLoadAtMs);
    expect(savedAfterFirstLoad.save.lastOfflineRewardAtMs).toBe(firstLoadAtMs);

    expect(secondLoad.offlineAssignmentRewards?.rewards).toMatchObject({
      offlineSeconds: 0,
      assignments: []
    });
    expect(secondLoad.save.progress.resources.silver).toBeCloseTo(115.2);
    expect(secondLoad.save.progress.equipment?.inventory.training_wraps).toBe(1);
  });

  it("grants medicine assignment herbs once with the same timestamp guard", () => {
    const storage = new MemoryStorage();
    const progress = createInitialPlayerProgress(staticData);
    const savedAtMs = 1000;
    const firstLoadAtMs = savedAtMs + 24 * 60 * 60 * 1000;

    progress.maps.bamboo_road.highestClearedStageIndex = 10;
    progress.maps.mist_valley.highestClearedStageIndex = 6;
    progress.maps.black_iron_fort.highestClearedStageIndex = 7;
    progress.maps.lotus_monastery.highestClearedStageIndex = 3;

    const assigned = setAssignmentHeroes(staticData, {
      progress,
      assignmentId: "lotus_medicine_pavilion",
      heroIds: ["mountain_staff_guardian"]
    });

    expect(assigned.ok).toBe(true);
    if (!assigned.ok) {
      return;
    }

    const save = createSaveData({
      progress: assigned.progress,
      selectedOfflineFarmStageId: "bamboo_road_1",
      nowMs: savedAtMs
    });

    storage.setItem(WEB_SAVE_STORAGE_KEY, JSON.stringify(save));

    const firstLoad = loadSaveDataWithOfflineRewardsFromStorage(
      staticData,
      storage,
      firstLoadAtMs
    );
    const secondLoad = loadSaveDataWithOfflineRewardsFromStorage(
      staticData,
      storage,
      firstLoadAtMs
    );

    expect(firstLoad.ok).toBe(true);
    expect(secondLoad.ok).toBe(true);
    if (!firstLoad.ok || !secondLoad.ok) {
      return;
    }

    expect(firstLoad.offlineAssignmentRewards?.rewards.herbs).toBeCloseTo(86.4);
    expect(firstLoad.save.progress.resources.herbs).toBeCloseTo(86.4);
    expect(firstLoad.save.progress.equipment?.inventory.lotus_dew_pill).toBe(1);
    expect(secondLoad.offlineAssignmentRewards?.rewards).toMatchObject({
      offlineSeconds: 0,
      assignments: []
    });
    expect(secondLoad.save.progress.resources.herbs).toBeCloseTo(86.4);
    expect(secondLoad.save.progress.equipment?.inventory.lotus_dew_pill).toBe(1);
  });
});
