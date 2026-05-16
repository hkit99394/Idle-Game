import { describe, expect, it } from "vitest";
import {
  createInitialPlayerProgress,
  createSaveData,
  SAVE_DATA_VERSION
} from "../../core";
import {
  createInitialWebGameStateFromStorage,
  buildSaveDiagnostics,
  getWebGameViewModel,
  purchaseGameUpgrade,
  resolveSelectedStageBattle,
  webGameStateReducer
} from "../../web/state/gameState";
import {
  exportSaveDataFromStorage,
  importSaveDataToStorage,
  loadSaveDataWithOfflineRewardsFromSave,
  loadSaveDataWithOfflineRewardsFromStorage,
  loadSaveDataFromStorage,
  resetSaveDataInStorage,
  saveWebGameStateToStorage,
  timeTravelOfflineSave,
  LEGACY_WEB_SAVE_STORAGE_KEY,
  WEB_SAVE_AUTOSAVE_INTERVAL_MS,
  WEB_SAVE_STORAGE_KEY,
  type WebSaveStorage
} from "../../web/state/saveStorage";
import { MemoryStorage } from "../helpers/memoryStorage";
import { buildSaveVersionFixtures } from "../fixtures/saveVersionFixtures";
import { staticData } from "../helpers/staticData";

class FailingWriteStorage extends MemoryStorage {
  failWrites = false;

  override setItem(key: string, value: string): void {
    if (this.failWrites) {
      throw new Error("quota exceeded");
    }

    super.setItem(key, value);
  }
}

class FailingReadStorage extends MemoryStorage {
  failKeys = new Set<string>();

  override getItem(key: string): string | null {
    if (this.failKeys.has(key)) {
      throw new Error(`read failed for ${key}`);
    }

    return super.getItem(key);
  }
}

function withBrowserStorage<T>(storage: WebSaveStorage, callback: () => T): T {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: storage
    }
  });

  try {
    return callback();
  } finally {
    if (previousWindow) {
      Object.defineProperty(globalThis, "window", previousWindow);
    } else {
      delete (globalThis as { window?: unknown }).window;
    }
  }
}

describe("web save storage", () => {
  it("uses the Path of Neon save key as canonical while retaining the legacy key", () => {
    expect(WEB_SAVE_STORAGE_KEY).toBe("path-of-neon.save.v1");
    expect(LEGACY_WEB_SAVE_STORAGE_KEY).toBe("path-of-jianghu.save.v1");
  });

  it("falls back to a new game when no save exists", () => {
    const storage = new MemoryStorage();
    const loadResult = loadSaveDataFromStorage(staticData, storage);
    const state = createInitialWebGameStateFromStorage(staticData, storage, 1000);

    expect(loadResult.ok).toBe(false);
    if (loadResult.ok) {
      return;
    }

    expect(loadResult.reason).toBe("missing_save");
    expect(state.progress.currentStageId).toBe("greenline_approach_1");
    expect(state.progress.resources.silver).toBe(0);
    expect(state.selectedStageId).toBe("greenline_approach_1");
    expect(state.selectedOfflineFarmStageId).toBeNull();
    expect(state.offlineFarmPreset).toBe("balanced");
  });

  it("loads a valid legacy-key save and copies it to the canonical key", () => {
    const storage = new MemoryStorage();
    const progress = createInitialPlayerProgress(staticData);
    progress.resources.silver = 123;
    progress.maps.greenline_approach.highestClearedStageIndex = 2;
    progress.currentStageId = "greenline_approach_3";
    const save = createSaveData({
      progress,
      selectedOfflineFarmStageId: "greenline_approach_1",
      offlineFarmPreset: "silver",
      nowMs: 1000
    });

    storage.setItem(LEGACY_WEB_SAVE_STORAGE_KEY, JSON.stringify(save));

    const loadResult = loadSaveDataWithOfflineRewardsFromStorage(
      staticData,
      storage,
      1000
    );
    const copiedSave = loadSaveDataFromStorage(staticData, storage);

    expect(loadResult.ok).toBe(true);
    if (!loadResult.ok || !copiedSave.ok) {
      return;
    }
    expect(loadResult.commitResult.status).toBe("written");
    expect(loadResult.commitResult.attemptedWriteReasons).toEqual([
      "storageKeyMigrated"
    ]);
    expect(copiedSave.storageKey).toBe(WEB_SAVE_STORAGE_KEY);
    expect(copiedSave.save.progress.resources.silver).toBe(123);
    expect(storage.getItem(LEGACY_WEB_SAVE_STORAGE_KEY)).toBe(
      JSON.stringify(save)
    );
    expect(storage.getItem(WEB_SAVE_STORAGE_KEY)).toBe(
      JSON.stringify(copiedSave.save)
    );
  });

  it("migrates legacy-key saves through the region/stage id migration", () => {
    const storage = new MemoryStorage();
    const progress = createInitialPlayerProgress(staticData);
    progress.resources.silver = 123;
    progress.maps.greenline_approach.highestClearedStageIndex = 2;
    const save = {
      ...createSaveData({
        progress: {
          ...progress,
          maps: {
            bamboo_road: progress.maps.greenline_approach
          },
          currentStageId: "bamboo_road_3"
        },
        selectedOfflineFarmStageId: "bamboo_road_1",
        nowMs: 1000
      }),
      version: 10
    };

    storage.setItem(LEGACY_WEB_SAVE_STORAGE_KEY, JSON.stringify(save));

    const loadResult = loadSaveDataWithOfflineRewardsFromStorage(
      staticData,
      storage,
      1000
    );
    const copiedSave = loadSaveDataFromStorage(staticData, storage);

    expect(loadResult.ok).toBe(true);
    if (!loadResult.ok || !copiedSave.ok) {
      return;
    }
    expect(loadResult.commitResult.status).toBe("written");
    expect(loadResult.commitResult.attemptedWriteReasons).toEqual([
      "migrated",
      "storageKeyMigrated"
    ]);
    expect(copiedSave.storageKey).toBe(WEB_SAVE_STORAGE_KEY);
    expect(copiedSave.save.progress.maps.greenline_approach).toEqual({
      combatExperience: 0,
      highestClearedStageIndex: 2
    });
    expect(copiedSave.save.progress.currentStageId).toBe(
      "greenline_approach_3"
    );
    expect(copiedSave.save.selectedOfflineFarmStageId).toBe(
      "greenline_approach_1"
    );
    expect(storage.getItem(LEGACY_WEB_SAVE_STORAGE_KEY)).toBe(
      JSON.stringify(save)
    );
  });

  it("prefers the canonical key when both canonical and legacy saves exist", () => {
    const storage = new MemoryStorage();
    const canonicalProgress = createInitialPlayerProgress(staticData);
    canonicalProgress.resources.silver = 456;
    const canonicalSave = createSaveData({
      progress: canonicalProgress,
      selectedOfflineFarmStageId: null,
      nowMs: 2000
    });

    storage.setItem(WEB_SAVE_STORAGE_KEY, JSON.stringify(canonicalSave));
    storage.setItem(LEGACY_WEB_SAVE_STORAGE_KEY, "{not json");

    const loadResult = loadSaveDataFromStorage(staticData, storage);
    const state = createInitialWebGameStateFromStorage(staticData, storage, 3000);

    expect(loadResult.ok).toBe(true);
    if (!loadResult.ok) {
      return;
    }
    expect(loadResult.storageKey).toBe(WEB_SAVE_STORAGE_KEY);
    expect(loadResult.save.progress.resources.silver).toBe(456);
    expect(state.progress.resources.silver).toBe(456);
    expect(storage.getItem(WEB_SAVE_STORAGE_KEY)).toBe(
      JSON.stringify(canonicalSave)
    );
    expect(storage.getItem(LEGACY_WEB_SAVE_STORAGE_KEY)).toBe("{not json");
  });

  it("does not write the canonical key when the legacy save is invalid", () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_WEB_SAVE_STORAGE_KEY, "{not json");

    const loadResult = loadSaveDataFromStorage(staticData, storage);

    expect(loadResult.ok).toBe(false);
    if (loadResult.ok) {
      return;
    }
    expect(loadResult.reason).toBe("invalid_json");
    expect(loadResult.storageKey).toBe(LEGACY_WEB_SAVE_STORAGE_KEY);
    expect(storage.getItem(WEB_SAVE_STORAGE_KEY)).toBeNull();
  });

  it("keeps the legacy save when canonical copy fails", () => {
    const storage = new FailingWriteStorage();
    const progress = createInitialPlayerProgress(staticData);
    progress.resources.silver = 123;
    const save = createSaveData({
      progress,
      selectedOfflineFarmStageId: null,
      nowMs: 1000
    });

    storage.setItem(LEGACY_WEB_SAVE_STORAGE_KEY, JSON.stringify(save));
    storage.failWrites = true;

    const loadResult = loadSaveDataWithOfflineRewardsFromStorage(
      staticData,
      storage,
      1000
    );

    expect(loadResult.ok).toBe(true);
    if (!loadResult.ok) {
      return;
    }
    expect(loadResult.commitResult.status).toBe("failed");
    expect(loadResult.commitResult.attemptedWriteReasons).toEqual([
      "storageKeyMigrated"
    ]);
    expect(loadResult.activeSave).toEqual(save);
    expect(loadResult.persistedSave).toBeNull();
    expect(storage.getItem(WEB_SAVE_STORAGE_KEY)).toBeNull();
    expect(storage.getItem(LEGACY_WEB_SAVE_STORAGE_KEY)).toBe(
      JSON.stringify(save)
    );
  });

  it("does not claim offline rewards when legacy-key migration copy fails", () => {
    const storage = new FailingWriteStorage();
    const progress = createInitialPlayerProgress(staticData);
    progress.maps.greenline_approach.highestClearedStageIndex = 1;
    progress.currentStageId = "greenline_approach_2";
    const save = createSaveData({
      progress,
      selectedOfflineFarmStageId: "greenline_approach_1",
      nowMs: 1000
    });

    storage.setItem(LEGACY_WEB_SAVE_STORAGE_KEY, JSON.stringify(save));
    storage.failWrites = true;

    const loadResult = loadSaveDataWithOfflineRewardsFromStorage(
      staticData,
      storage,
      31_000
    );
    const storedLegacySave = JSON.parse(
      storage.getItem(LEGACY_WEB_SAVE_STORAGE_KEY) ?? "{}"
    ) as { lastOfflineRewardAtMs?: unknown };

    expect(loadResult.ok).toBe(true);
    if (!loadResult.ok) {
      return;
    }
    expect(loadResult.commitResult.status).toBe("failed");
    expect(loadResult.commitResult.attemptedWriteReasons).toEqual([
      "offlineRewardsApplied",
      "storageKeyMigrated"
    ]);
    expect(loadResult.offlineRewards).toBeNull();
    expect(loadResult.activeSave.lastOfflineRewardAtMs).toBe(1000);
    expect(loadResult.offlineRewardBaselineSave?.lastOfflineRewardAtMs).toBe(
      1000
    );
    expect(storedLegacySave.lastOfflineRewardAtMs).toBe(1000);
    expect(storage.getItem(WEB_SAVE_STORAGE_KEY)).toBeNull();
  });

  it("surfaces storage errors instead of falling through to legacy migration", () => {
    const storage = new FailingReadStorage();
    const save = createSaveData({
      progress: createInitialPlayerProgress(staticData),
      selectedOfflineFarmStageId: null,
      nowMs: 1000
    });

    storage.setItem(LEGACY_WEB_SAVE_STORAGE_KEY, JSON.stringify(save));
    storage.failKeys.add(WEB_SAVE_STORAGE_KEY);

    const loadResult = loadSaveDataFromStorage(staticData, storage);

    expect(loadResult.ok).toBe(false);
    if (loadResult.ok) {
      return;
    }
    expect(loadResult.reason).toBe("storage_error");
    expect(loadResult.storageKey).toBe(WEB_SAVE_STORAGE_KEY);
    expect(loadResult.errors).toEqual([
      `read failed for ${WEB_SAVE_STORAGE_KEY}`
    ]);
    expect(storage.getItem(LEGACY_WEB_SAVE_STORAGE_KEY)).toBe(
      JSON.stringify(save)
    );
  });

  it("loads saved progress and farm target into initial web state", () => {
    const storage = new MemoryStorage();
    const progress = createInitialPlayerProgress(staticData);
    progress.resources.silver = 123;
    progress.maps.greenline_approach.highestClearedStageIndex = 2;
    progress.currentStageId = "greenline_approach_3";
    const save = createSaveData({
      progress,
      selectedOfflineFarmStageId: "greenline_approach_1",
      offlineFarmPreset: "silver",
      nowMs: 1000
    });

    storage.setItem(WEB_SAVE_STORAGE_KEY, JSON.stringify(save));

    const state = createInitialWebGameStateFromStorage(staticData, storage, 1000);

    expect(state.progress.resources.silver).toBe(123);
    expect(state.progress.currentStageId).toBe("greenline_approach_3");
    expect(state.selectedStageId).toBe("greenline_approach_3");
    expect(state.selectedOfflineFarmStageId).toBe("greenline_approach_1");
    expect(state.offlineFarmPreset).toBe("silver");
  });

  it("rewrites migrated legacy saves even when no offline rewards are applied", () => {
    const storage = new MemoryStorage();
    const [fixture] = buildSaveVersionFixtures(staticData);

    storage.setItem(WEB_SAVE_STORAGE_KEY, JSON.stringify(fixture.rawSave));

    const state = createInitialWebGameStateFromStorage(
      staticData,
      storage,
      2000
    );
    const rewritten = loadSaveDataFromStorage(staticData, storage);

    expect(state.offlineSummary).toBeNull();
    expect(rewritten.ok).toBe(true);
    if (!rewritten.ok) {
      return;
    }
    expect(rewritten.save.version).toBe(SAVE_DATA_VERSION);
    expect(rewritten.save.updatedAtMs).toBe(2000);
    expect(rewritten.save.lastOfflineRewardAtMs).toBe(2000);
  });

  it("persists counterplay settings through save reload", () => {
    const storage = new MemoryStorage();
    const progress = createInitialPlayerProgress(staticData);
    const baseState = createInitialWebGameStateFromStorage(
      staticData,
      storage,
      1000
    );
    const configuredState = webGameStateReducer(staticData, baseState, {
      type: "replace_state",
      state: {
        ...baseState,
        progress,
        autoMedicinePreferences: {
          ...baseState.autoMedicinePreferences,
          enabled: false,
          preBattleResistanceMode: "status_heavy",
          disabledMedicineIds: ["clear_heart_countermeasure"]
        }
      }
    });
    const saveResult = saveWebGameStateToStorage(
      staticData,
      configuredState,
      storage,
      2000
    );
    const reloadedState = createInitialWebGameStateFromStorage(
      staticData,
      storage,
      3000
    );

    expect(saveResult.ok).toBe(true);
    expect(reloadedState.autoMedicinePreferences).toMatchObject({
      enabled: false,
      preBattleResistanceMode: "status_heavy",
      disabledMedicineIds: ["clear_heart_countermeasure"]
    });
    expect(
      getWebGameViewModel(staticData, reloadedState).counterplaySettings
    ).toMatchObject({
      globalEnabled: false,
      resistanceMode: "status_heavy"
    });
  });

  it("exports and imports a validated save payload", () => {
    const sourceStorage = new MemoryStorage();
    const targetStorage = new MemoryStorage();
    const progress = createInitialPlayerProgress(staticData);
    progress.resources.silver = 321;
    progress.maps.greenline_approach.highestClearedStageIndex = 2;
    progress.currentStageId = "greenline_approach_3";
    const save = createSaveData({
      progress,
      selectedOfflineFarmStageId: "greenline_approach_2",
      offlineFarmPreset: "cultivation",
      autoMedicinePreferences: {
        enabled: true,
        battleCleanseEnabled: true,
        postBattleCleanseEnabled: true,
        preBattleResistanceEnabled: true,
        preBattleResistanceMode: "status_heavy",
        disabledMedicineIds: ["clear_heart_countermeasure"]
      },
      nowMs: 1000
    });

    sourceStorage.setItem(WEB_SAVE_STORAGE_KEY, JSON.stringify(save));

    const exportResult = exportSaveDataFromStorage(staticData, sourceStorage);

    expect(exportResult.ok).toBe(true);
    if (!exportResult.ok) {
      return;
    }
    expect(JSON.parse(exportResult.json)).toMatchObject({
      progress: {
        currentStageId: "greenline_approach_3"
      },
      selectedOfflineFarmStageId: "greenline_approach_2"
    });

    const importResult = importSaveDataToStorage(
      staticData,
      targetStorage,
      exportResult.json
    );
    const importedSave = loadSaveDataFromStorage(staticData, targetStorage);

    expect(importResult.ok).toBe(true);
    expect(importedSave.ok).toBe(true);
    if (!importResult.ok || !importedSave.ok) {
      return;
    }
    expect(importedSave.save.progress.resources.silver).toBe(321);
    expect(importedSave.save.progress.currentStageId).toBe("greenline_approach_3");
    expect(importedSave.save.selectedOfflineFarmStageId).toBe("greenline_approach_2");
    expect(importedSave.save.offlineFarmPreset).toBe("cultivation");
    expect(importedSave.save.autoMedicinePreferences).toMatchObject({
      preBattleResistanceMode: "status_heavy",
      disabledMedicineIds: ["clear_heart_countermeasure"]
    });
  });

  it("imports legacy region and stage ids as canonical save payloads", () => {
    const storage = new MemoryStorage();
    const progress = createInitialPlayerProgress(staticData);
    progress.resources.silver = 456;
    progress.maps.greenline_approach.highestClearedStageIndex = 2;
    const legacySave = {
      ...createSaveData({
        progress: {
          ...progress,
          maps: {
            bamboo_road: progress.maps.greenline_approach
          },
          currentStageId: "bamboo_road_3"
        },
        selectedOfflineFarmStageId: "bamboo_road_2",
        offlineFarmPreset: "combatExperience",
        nowMs: 1000
      }),
      version: 10
    };

    const importResult = importSaveDataToStorage(
      staticData,
      storage,
      JSON.stringify(legacySave)
    );
    const importedSave = loadSaveDataFromStorage(staticData, storage);

    expect(importResult.ok).toBe(true);
    expect(importedSave.ok).toBe(true);
    if (!importResult.ok || !importedSave.ok) {
      return;
    }
    expect(importResult.save.version).toBe(SAVE_DATA_VERSION);
    expect(importResult.save.progress.maps.greenline_approach).toEqual({
      combatExperience: 0,
      highestClearedStageIndex: 2
    });
    expect(importResult.save.progress.maps.bamboo_road).toBeUndefined();
    expect(importResult.save.progress.currentStageId).toBe(
      "greenline_approach_3"
    );
    expect(importResult.save.selectedOfflineFarmStageId).toBe(
      "greenline_approach_2"
    );
    expect(importedSave.save.progress.currentStageId).toBe(
      "greenline_approach_3"
    );
    expect(importedSave.save.selectedOfflineFarmStageId).toBe(
      "greenline_approach_2"
    );
  });

  it("imports current-version saves with legacy region and stage ids as canonical payloads", () => {
    const storage = new MemoryStorage();
    const progress = createInitialPlayerProgress(staticData);
    progress.resources.silver = 654;
    progress.maps.greenline_approach.highestClearedStageIndex = 2;
    const currentSaveWithLegacyIds = createSaveData({
      progress: {
        ...progress,
        maps: {
          bamboo_road: progress.maps.greenline_approach
        },
        currentStageId: "bamboo_road_3"
      },
      selectedOfflineFarmStageId: "bamboo_road_2",
      offlineFarmPreset: "combatExperience",
      nowMs: 1000
    });

    const importResult = importSaveDataToStorage(
      staticData,
      storage,
      JSON.stringify(currentSaveWithLegacyIds)
    );
    const importedSave = loadSaveDataFromStorage(staticData, storage);

    expect(currentSaveWithLegacyIds.version).toBe(SAVE_DATA_VERSION);
    expect(importResult.ok).toBe(true);
    expect(importedSave.ok).toBe(true);
    if (!importResult.ok || !importedSave.ok) {
      return;
    }

    expect(importResult.save.progress.maps.greenline_approach).toEqual({
      combatExperience: 0,
      highestClearedStageIndex: 2
    });
    expect(importResult.save.progress.maps.bamboo_road).toBeUndefined();
    expect(importResult.save.progress.currentStageId).toBe(
      "greenline_approach_3"
    );
    expect(importResult.save.selectedOfflineFarmStageId).toBe(
      "greenline_approach_2"
    );
    expect(importedSave.save.progress.currentStageId).toBe(
      "greenline_approach_3"
    );
    expect(importedSave.save.selectedOfflineFarmStageId).toBe(
      "greenline_approach_2"
    );
  });

  it("imports current-version saves with content aliases as configured payloads", () => {
    const storage = new MemoryStorage();
    const progress = createInitialPlayerProgress(staticData);
    const currentSaveWithContentAliases = createSaveData({
      progress: {
        ...progress,
        heroes: {
          iron_fist_disciple: {
            level: 3,
            upgrades: {}
          }
        },
        activeHeroIds: ["iron_fist_disciple"],
        formation: {
          iron_fist_disciple: "front"
        },
        styleMastery: {
          fist: {
            experience: 300
          }
        },
        styleBranches: {
          fist: "iron_body_fist"
        },
        skillUpgrades: {
          iron_fist_combo_refinement: 2
        },
        equipment: {
          inventory: {
            impact_training_wraps: 1
          },
          equipped: {
            iron_fist_initiate: {
              weapon: "impact_training_wraps"
            }
          }
        },
        medicineInventory: {
          clear_heart_countermeasure: 1
        },
        assignments: {
          greenline_sweep: {
            heroIds: ["iron_fist_initiate"]
          }
        },
        selectedTacticId: "kinetic_crush"
      },
      autoMedicinePreferences: {
        enabled: true,
        battleCleanseEnabled: true,
        postBattleCleanseEnabled: true,
        preBattleResistanceEnabled: true,
        preBattleResistanceMode: "boss_and_elite",
        disabledMedicineIds: ["clear_heart_countermeasure"]
      },
      selectedOfflineFarmStageId: null,
      nowMs: 1000
    });

    const importResult = importSaveDataToStorage(
      staticData,
      storage,
      JSON.stringify(currentSaveWithContentAliases)
    );
    const importedSave = loadSaveDataFromStorage(staticData, storage);

    expect(currentSaveWithContentAliases.version).toBe(SAVE_DATA_VERSION);
    expect(importResult.ok).toBe(true);
    expect(importedSave.ok).toBe(true);
    if (!importResult.ok || !importedSave.ok) {
      return;
    }

    expect(importResult.save.progress.heroes.iron_fist_initiate).toEqual({
      level: 3,
      upgrades: {}
    });
    expect(importResult.save.progress.heroes.iron_fist_disciple).toBeUndefined();
    expect(importResult.save.progress.selectedTacticId).toBe("kinetic_crush");
    expect(importResult.save.progress.equipment?.inventory).toEqual({
      impact_training_wraps: 1
    });
    expect(importResult.save.progress.assignments).toEqual({
      greenline_sweep: {
        heroIds: ["iron_fist_initiate"]
      }
    });
    expect(importResult.save.autoMedicinePreferences.disabledMedicineIds).toEqual([
      "clear_heart_countermeasure"
    ]);
    expect(importedSave.save.progress.selectedTacticId).toBe("kinetic_crush");
    expect(importedSave.save.progress.assignments).toEqual({
      greenline_sweep: {
        heroIds: ["iron_fist_initiate"]
      }
    });
  });

  it("normalizes imported offline farm metadata through the core save transaction", () => {
    const storage = new MemoryStorage();
    const progress = createInitialPlayerProgress(staticData);
    progress.maps.greenline_approach.highestClearedStageIndex = 1;
    progress.currentStageId = "greenline_approach_2";
    const save = createSaveData({
      progress,
      selectedOfflineFarmStageId: "greenline_approach_10",
      nowMs: 1000
    });

    const importResult = importSaveDataToStorage(
      staticData,
      storage,
      JSON.stringify(save)
    );
    const importedSave = loadSaveDataFromStorage(staticData, storage);

    expect(importResult.ok).toBe(true);
    expect(importedSave.ok).toBe(true);
    if (!importResult.ok || !importedSave.ok) {
      return;
    }
    expect(importResult.save.selectedOfflineFarmStageId).toBe("greenline_approach_1");
    expect(importedSave.save.selectedOfflineFarmStageId).toBe("greenline_approach_1");
    expect(importedSave.save.updatedAtMs).toBe(1000);
    expect(importedSave.save.lastOfflineRewardAtMs).toBe(1000);
  });

  it("rejects invalid imports without replacing the current save", () => {
    const storage = new MemoryStorage();
    const progress = createInitialPlayerProgress(staticData);
    progress.resources.silver = 50;
    const save = createSaveData({
      progress,
      selectedOfflineFarmStageId: null,
      nowMs: 1000
    });

    storage.setItem(WEB_SAVE_STORAGE_KEY, JSON.stringify(save));

    const importResult = importSaveDataToStorage(staticData, storage, "{bad");
    const currentSave = loadSaveDataFromStorage(staticData, storage);

    expect(importResult.ok).toBe(false);
    if (importResult.ok) {
      return;
    }
    expect(importResult.reason).toBe("invalid_json");
    expect(currentSave.ok).toBe(true);
    if (!currentSave.ok) {
      return;
    }
    expect(currentSave.save.progress.resources.silver).toBe(50);
  });

  it("rejects imports with unknown disabled auto medicine ids", () => {
    const storage = new MemoryStorage();
    const progress = createInitialPlayerProgress(staticData);
    progress.resources.silver = 50;
    const currentSave = createSaveData({
      progress,
      selectedOfflineFarmStageId: null,
      nowMs: 1000
    });
    const invalidImport = {
      ...currentSave,
      autoMedicinePreferences: {
        ...currentSave.autoMedicinePreferences,
        disabledMedicineIds: ["missing_medicine"]
      }
    };

    storage.setItem(WEB_SAVE_STORAGE_KEY, JSON.stringify(currentSave));

    const importResult = importSaveDataToStorage(
      staticData,
      storage,
      JSON.stringify(invalidImport)
    );
    const savedAfterImport = loadSaveDataFromStorage(staticData, storage);

    expect(importResult.ok).toBe(false);
    if (importResult.ok) {
      return;
    }
    expect(importResult.reason).toBe("invalid_save");
    expect(importResult.errors).toContain(
      "autoMedicinePreferences.disabledMedicineIds.0 must reference an existing medicine"
    );
    expect(savedAfterImport.ok).toBe(true);
    if (!savedAfterImport.ok) {
      return;
    }
    expect(
      savedAfterImport.save.autoMedicinePreferences.disabledMedicineIds
    ).toEqual([]);
  });

  it("rejects imports with unknown pre-battle resistance modes", () => {
    const storage = new MemoryStorage();
    const progress = createInitialPlayerProgress(staticData);
    const currentSave = createSaveData({
      progress,
      selectedOfflineFarmStageId: null,
      nowMs: 1000
    });
    const invalidImport = {
      ...currentSave,
      autoMedicinePreferences: {
        ...currentSave.autoMedicinePreferences,
        preBattleResistanceMode: "only_boss_when_rich"
      }
    };

    storage.setItem(WEB_SAVE_STORAGE_KEY, JSON.stringify(currentSave));

    const importResult = importSaveDataToStorage(
      staticData,
      storage,
      JSON.stringify(invalidImport)
    );
    const savedAfterImport = loadSaveDataFromStorage(staticData, storage);

    expect(importResult.ok).toBe(false);
    if (importResult.ok) {
      return;
    }
    expect(importResult.reason).toBe("invalid_save");
    expect(importResult.errors).toContain(
      "autoMedicinePreferences.preBattleResistanceMode must be a supported mode"
    );
    expect(savedAfterImport.ok).toBe(true);
    if (!savedAfterImport.ok) {
      return;
    }
    expect(
      savedAfterImport.save.autoMedicinePreferences.preBattleResistanceMode
    ).toBe("boss_and_elite");
  });

  it("resets storage to a new game save", () => {
    const storage = new MemoryStorage();
    const progress = createInitialPlayerProgress(staticData);
    progress.resources.silver = 999;
    progress.maps.greenline_approach.highestClearedStageIndex = 2;
    progress.currentStageId = "greenline_approach_3";
    storage.setItem(
      WEB_SAVE_STORAGE_KEY,
      JSON.stringify(createSaveData({
        progress,
        selectedOfflineFarmStageId: "greenline_approach_1",
        nowMs: 1000
      }))
    );

    const resetResult = resetSaveDataInStorage(staticData, storage, 2000);
    const currentSave = loadSaveDataFromStorage(staticData, storage);

    expect(resetResult.ok).toBe(true);
    expect(currentSave.ok).toBe(true);
    if (!resetResult.ok || !currentSave.ok) {
      return;
    }
    expect(currentSave.save.progress.resources.silver).toBe(0);
    expect(currentSave.save.progress.currentStageId).toBe("greenline_approach_1");
    expect(currentSave.save.selectedOfflineFarmStageId).toBeNull();
    expect(currentSave.save.offlineFarmPreset).toBe("balanced");
    expect(currentSave.save.updatedAtMs).toBe(2000);
  });

  it("time travels a save candidate for offline farm testing without persisting the backdate", () => {
    const storage = new MemoryStorage();
    const progress = createInitialPlayerProgress(staticData);
    progress.maps.greenline_approach.highestClearedStageIndex = 1;
    progress.currentStageId = "greenline_approach_2";
    const save = createSaveData({
      progress,
      selectedOfflineFarmStageId: "greenline_approach_1",
      nowMs: 100_000
    });
    storage.setItem(WEB_SAVE_STORAGE_KEY, JSON.stringify(save));

    const loadedSave = loadSaveDataFromStorage(staticData, storage);

    expect(loadedSave.ok).toBe(true);
    if (!loadedSave.ok) {
      return;
    }

    const timeTravelResult = timeTravelOfflineSave(
      loadedSave.save,
      30,
      100_000
    );
    const storedAfterTravel = loadSaveDataFromStorage(staticData, storage);

    expect(timeTravelResult.ok).toBe(true);
    expect(storedAfterTravel.ok).toBe(true);
    if (!timeTravelResult.ok || !storedAfterTravel.ok) {
      return;
    }

    const loadResult = loadSaveDataWithOfflineRewardsFromSave(
      staticData,
      timeTravelResult.save,
      storage,
      100_000
    );
    const rewardedSave = loadSaveDataFromStorage(staticData, storage);

    expect(loadResult.ok).toBe(true);
    expect(rewardedSave.ok).toBe(true);
    if (!loadResult.ok || !rewardedSave.ok) {
      return;
    }

    expect(timeTravelResult.traveledSeconds).toBe(30);
    expect(timeTravelResult.save.createdAtMs).toBe(70_000);
    expect(timeTravelResult.save.updatedAtMs).toBe(70_000);
    expect(timeTravelResult.save.lastOfflineRewardAtMs).toBe(70_000);
    expect(storedAfterTravel.save.createdAtMs).toBe(100_000);
    expect(storedAfterTravel.save.updatedAtMs).toBe(100_000);
    expect(storedAfterTravel.save.lastOfflineRewardAtMs).toBe(100_000);
    expect(loadResult.offlineRewards?.ok).toBe(true);
    expect(loadResult.offlineRewards?.rewards).toMatchObject({
      offlineSeconds: 30,
      clears: 3,
      silver: 18,
      cultivation: 9,
      combatExperience: 9
    });
    expect(loadResult.commitResult.status).toBe("written");
    expect(loadResult.commitResult.attemptedWriteReasons).toEqual([
      "offlineRewardsApplied"
    ]);
    expect(loadResult.commitResult.committedWriteReasons).toEqual([
      "offlineRewardsApplied"
    ]);
    expect(loadResult.loadedNormalizedSave.updatedAtMs).toBe(70_000);
    expect(loadResult.candidateSave.updatedAtMs).toBe(100_000);
    expect(loadResult.activeSave.updatedAtMs).toBe(100_000);
    expect(loadResult.persistedSave?.updatedAtMs).toBe(100_000);
    expect(rewardedSave.save.updatedAtMs).toBe(100_000);
    expect(rewardedSave.save.lastOfflineRewardAtMs).toBe(100_000);
  });

  it("reports when a load does not need a persistence write", () => {
    const storage = new MemoryStorage();
    const progress = createInitialPlayerProgress(staticData);
    const save = createSaveData({
      progress,
      selectedOfflineFarmStageId: null,
      nowMs: 1000
    });
    storage.setItem(WEB_SAVE_STORAGE_KEY, JSON.stringify(save));

    const loadResult = loadSaveDataWithOfflineRewardsFromStorage(
      staticData,
      storage,
      1000
    );

    expect(loadResult.ok).toBe(true);
    if (!loadResult.ok) {
      return;
    }
    expect(loadResult.commitResult).toEqual({
      status: "not_needed",
      attemptedWriteReasons: [],
      committedWriteReasons: []
    });
    expect(loadResult.loadedNormalizedSave).toEqual(loadResult.activeSave);
    expect(loadResult.persistedSave).toEqual(loadResult.activeSave);
  });

  it("applies offline rewards once on load and advances reward timestamps", () => {
    const storage = new MemoryStorage();
    const progress = createInitialPlayerProgress(staticData);
    progress.maps.greenline_approach.highestClearedStageIndex = 1;
    progress.currentStageId = "greenline_approach_2";
    const save = createSaveData({
      progress,
      selectedOfflineFarmStageId: "greenline_approach_1",
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
      firstLoadState.progress.maps.greenline_approach.combatExperience
    ).toBeCloseTo(9);
    expect(firstLoadState.progress.maps.greenline_approach.highestClearedStageIndex).toBe(1);
    expect(firstLoadState.progress.currentStageId).toBe("greenline_approach_2");
    expect(firstLoadState.offlineSummary).toMatchObject({
      stageId: "greenline_approach_1",
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
      stageName: "Greenline Route 1",
      regionName: "Greenline Approach",
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
      secondLoadState.progress.maps.greenline_approach.combatExperience
    ).toBeCloseTo(9);
    expect(secondLoadState.offlineSummary).toBeNull();
  });

  it("preserves attempted write intent when offline reward persistence fails", () => {
    const storage = new FailingWriteStorage();
    const progress = createInitialPlayerProgress(staticData);
    progress.maps.greenline_approach.highestClearedStageIndex = 1;
    const save = createSaveData({
      progress,
      selectedOfflineFarmStageId: "greenline_approach_1",
      nowMs: 1_000
    });

    storage.setItem(WEB_SAVE_STORAGE_KEY, JSON.stringify(save));
    storage.failWrites = true;

    const loadResult = loadSaveDataWithOfflineRewardsFromStorage(
      staticData,
      storage,
      31_000
    );
    const stateAfterFailedStartupWrite = createInitialWebGameStateFromStorage(
      staticData,
      storage,
      31_000
    );
    const storedAfterFailure = loadSaveDataFromStorage(staticData, storage);

    expect(loadResult.ok).toBe(true);
    expect(storedAfterFailure.ok).toBe(true);
    if (!loadResult.ok || !storedAfterFailure.ok) {
      return;
    }
    expect(loadResult.commitResult.status).toBe("failed");
    if (loadResult.commitResult.status !== "failed") {
      return;
    }
    expect(loadResult.commitResult.attemptedWriteReasons).toEqual([
      "offlineRewardsApplied"
    ]);
    expect(loadResult.commitResult.committedWriteReasons).toEqual([]);
    expect(loadResult.commitResult.errors).toEqual(["quota exceeded"]);
    expect(loadResult.offlineRewards).toBeNull();
    expect(loadResult.loadedNormalizedSave.progress.resources.silver).toBe(0);
    expect(loadResult.candidateSave.progress.resources.silver).toBeGreaterThan(0);
    expect(loadResult.activeSave.progress.resources.silver).toBe(0);
    expect(loadResult.persistedSave).toEqual(loadResult.loadedNormalizedSave);
    expect(stateAfterFailedStartupWrite.startupSaveDiagnostics).toEqual([
      "Save load write failed after offlineRewardsApplied: quota exceeded"
    ]);
    expect(storedAfterFailure.save.lastOfflineRewardAtMs).toBe(1_000);
  });

  it("keeps unclaimed offline time after a failed reward commit and later ordinary save", () => {
    const storage = new FailingWriteStorage();
    const progress = createInitialPlayerProgress(staticData);
    progress.maps.greenline_approach.highestClearedStageIndex = 1;
    progress.currentStageId = "greenline_approach_2";
    const save = createSaveData({
      progress,
      selectedOfflineFarmStageId: "greenline_approach_1",
      nowMs: 1_000
    });

    storage.setItem(WEB_SAVE_STORAGE_KEY, JSON.stringify(save));
    storage.failWrites = true;

    const stateAfterFailedStartupWrite = createInitialWebGameStateFromStorage(
      staticData,
      storage,
      31_000
    );

    const changedStateBeforeOrdinarySave = webGameStateReducer(
      staticData,
      stateAfterFailedStartupWrite,
      {
        type: "set_auto_medicine_enabled",
        enabled: false
      }
    );

    storage.failWrites = false;
    const ordinarySaveResult = saveWebGameStateToStorage(
      staticData,
      changedStateBeforeOrdinarySave,
      storage,
      45_000
    );
    const savedAfterOrdinarySave = loadSaveDataFromStorage(staticData, storage);
    const recoveredLoadResult = loadSaveDataWithOfflineRewardsFromStorage(
      staticData,
      storage,
      61_000
    );

    expect(stateAfterFailedStartupWrite.offlineSummary).toBeNull();
    expect(
      changedStateBeforeOrdinarySave.autoMedicinePreferences.enabled
    ).toBe(false);
    expect(ordinarySaveResult.ok).toBe(true);
    expect(savedAfterOrdinarySave.ok).toBe(true);
    expect(recoveredLoadResult.ok).toBe(true);
    if (
      !ordinarySaveResult.ok ||
      !savedAfterOrdinarySave.ok ||
      !recoveredLoadResult.ok
    ) {
      return;
    }

    expect(ordinarySaveResult.save.updatedAtMs).toBe(1_000);
    expect(ordinarySaveResult.save.lastOfflineRewardAtMs).toBe(1_000);
    expect(ordinarySaveResult.save.autoMedicinePreferences.enabled).toBe(false);
    expect(savedAfterOrdinarySave.save.updatedAtMs).toBe(1_000);
    expect(savedAfterOrdinarySave.save.lastOfflineRewardAtMs).toBe(1_000);
    expect(savedAfterOrdinarySave.save.autoMedicinePreferences.enabled).toBe(false);
    expect(recoveredLoadResult.offlineRewards?.ok).toBe(true);
    expect(recoveredLoadResult.offlineRewards?.rewards).toMatchObject({
      offlineSeconds: 60,
      clears: 6,
      silver: 36,
      cultivation: 18,
      combatExperience: 18
    });
    expect(recoveredLoadResult.activeSave.updatedAtMs).toBe(61_000);
    expect(recoveredLoadResult.activeSave.lastOfflineRewardAtMs).toBe(61_000);
  });

  it("keeps failed offline reward diagnostics after a lossy ordinary save advances only updatedAtMs", () => {
    const storage = new FailingWriteStorage();
    const progress = createInitialPlayerProgress(staticData);
    progress.maps.greenline_approach.highestClearedStageIndex = 1;
    progress.currentStageId = "greenline_approach_2";
    const save = createSaveData({
      progress,
      selectedOfflineFarmStageId: "greenline_approach_1",
      nowMs: 1_000
    });

    storage.setItem(WEB_SAVE_STORAGE_KEY, JSON.stringify(save));
    storage.failWrites = true;

    const stateAfterFailedStartupWrite = createInitialWebGameStateFromStorage(
      staticData,
      storage,
      31_000
    );
    const changedStateBeforeOrdinarySave = webGameStateReducer(
      staticData,
      stateAfterFailedStartupWrite,
      {
        type: "set_auto_medicine_enabled",
        enabled: false
      }
    );
    const lossyOrdinarySave = createSaveData({
      progress: changedStateBeforeOrdinarySave.progress,
      autoMedicinePreferences:
        changedStateBeforeOrdinarySave.autoMedicinePreferences,
      selectedOfflineFarmStageId:
        changedStateBeforeOrdinarySave.selectedOfflineFarmStageId,
      offlineFarmPreset: changedStateBeforeOrdinarySave.offlineFarmPreset,
      nowMs: 45_000,
      previousSave: save
    });

    storage.failWrites = false;
    storage.setItem(WEB_SAVE_STORAGE_KEY, JSON.stringify(lossyOrdinarySave));

    const diagnostics = withBrowserStorage(storage, () =>
      buildSaveDiagnostics(staticData, changedStateBeforeOrdinarySave)
    );

    expect(stateAfterFailedStartupWrite.startupSaveDiagnostics).toEqual([
      "Save load write failed after offlineRewardsApplied: quota exceeded"
    ]);
    expect(lossyOrdinarySave.updatedAtMs).toBe(45_000);
    expect(lossyOrdinarySave.lastOfflineRewardAtMs).toBe(1_000);
    expect(diagnostics.status).toBe("storage_error");
    expect(diagnostics.updatedAtMs).toBe(45_000);
    expect(diagnostics.lastOfflineRewardAtMs).toBe(1_000);
    expect(diagnostics.errors).toEqual([
      "Save load write failed after offlineRewardsApplied: quota exceeded"
    ]);
  });

  it("keeps migrated offline rewards unclaimed after a failed rewrite and later ordinary save", () => {
    const storage = new FailingWriteStorage();
    const [fixture] = buildSaveVersionFixtures(staticData);

    storage.setItem(WEB_SAVE_STORAGE_KEY, JSON.stringify(fixture.rawSave));
    storage.failWrites = true;

    const stateAfterFailedStartupWrite = createInitialWebGameStateFromStorage(
      staticData,
      storage,
      31_000
    );
    const changedStateBeforeOrdinarySave = webGameStateReducer(
      staticData,
      stateAfterFailedStartupWrite,
      {
        type: "set_auto_medicine_enabled",
        enabled: false
      }
    );

    storage.failWrites = false;
    const ordinarySaveResult = saveWebGameStateToStorage(
      staticData,
      changedStateBeforeOrdinarySave,
      storage,
      45_000
    );
    const savedAfterOrdinarySave = loadSaveDataFromStorage(staticData, storage);
    const recoveredLoadResult = loadSaveDataWithOfflineRewardsFromStorage(
      staticData,
      storage,
      61_000
    );

    expect(stateAfterFailedStartupWrite.startupSavePersistence?.commitStatus).toBe(
      "failed"
    );
    expect(
      stateAfterFailedStartupWrite.startupSavePersistence?.attemptedWriteReasons
    ).toEqual(["migrated", "offlineRewardsApplied"]);
    expect(stateAfterFailedStartupWrite.startupSavePersistence?.persistedSave).toBeNull();
    expect(
      stateAfterFailedStartupWrite.startupSavePersistence
        ?.offlineRewardBaselineSave?.lastOfflineRewardAtMs
    ).toBe(2000);
    expect(ordinarySaveResult.ok).toBe(true);
    expect(savedAfterOrdinarySave.ok).toBe(true);
    expect(recoveredLoadResult.ok).toBe(true);
    if (
      !ordinarySaveResult.ok ||
      !savedAfterOrdinarySave.ok ||
      !recoveredLoadResult.ok
    ) {
      return;
    }

    expect(ordinarySaveResult.save.version).toBe(SAVE_DATA_VERSION);
    expect(ordinarySaveResult.save.updatedAtMs).toBe(2000);
    expect(ordinarySaveResult.save.lastOfflineRewardAtMs).toBe(2000);
    expect(savedAfterOrdinarySave.save.updatedAtMs).toBe(2000);
    expect(savedAfterOrdinarySave.save.lastOfflineRewardAtMs).toBe(2000);
    expect(recoveredLoadResult.offlineRewards?.ok).toBe(true);
    expect(recoveredLoadResult.activeSave.progress.resources.silver).toBeGreaterThan(
      savedAfterOrdinarySave.save.progress.resources.silver
    );
    expect(recoveredLoadResult.activeSave.lastOfflineRewardAtMs).toBe(61_000);
  });

  it("keeps normalized offline rewards unclaimed after a failed rewrite and later ordinary save", () => {
    const storage = new FailingWriteStorage();
    const progress = createInitialPlayerProgress(staticData);
    progress.maps.greenline_approach.highestClearedStageIndex = 1;
    progress.currentStageId = "greenline_approach_2";
    const save = createSaveData({
      progress,
      selectedOfflineFarmStageId: "greenline_approach_1",
      nowMs: 1000
    });
    const { offlineFarmPreset: _offlineFarmPreset, ...rawSave } = save;

    storage.setItem(WEB_SAVE_STORAGE_KEY, JSON.stringify(rawSave));
    storage.failWrites = true;

    const stateAfterFailedStartupWrite = createInitialWebGameStateFromStorage(
      staticData,
      storage,
      31_000
    );
    const changedStateBeforeOrdinarySave = webGameStateReducer(
      staticData,
      stateAfterFailedStartupWrite,
      {
        type: "set_auto_medicine_enabled",
        enabled: false
      }
    );

    storage.failWrites = false;
    const ordinarySaveResult = saveWebGameStateToStorage(
      staticData,
      changedStateBeforeOrdinarySave,
      storage,
      45_000
    );
    const savedAfterOrdinarySave = loadSaveDataFromStorage(staticData, storage);
    const recoveredLoadResult = loadSaveDataWithOfflineRewardsFromStorage(
      staticData,
      storage,
      61_000
    );

    expect(stateAfterFailedStartupWrite.startupSavePersistence?.commitStatus).toBe(
      "failed"
    );
    expect(
      stateAfterFailedStartupWrite.startupSavePersistence?.attemptedWriteReasons
    ).toEqual(["normalizedSave", "offlineRewardsApplied"]);
    expect(stateAfterFailedStartupWrite.startupSavePersistence?.persistedSave).toBeNull();
    expect(
      stateAfterFailedStartupWrite.startupSavePersistence
        ?.offlineRewardBaselineSave?.lastOfflineRewardAtMs
    ).toBe(1000);
    expect(ordinarySaveResult.ok).toBe(true);
    expect(savedAfterOrdinarySave.ok).toBe(true);
    expect(recoveredLoadResult.ok).toBe(true);
    if (
      !ordinarySaveResult.ok ||
      !savedAfterOrdinarySave.ok ||
      !recoveredLoadResult.ok
    ) {
      return;
    }

    expect(ordinarySaveResult.save.updatedAtMs).toBe(1000);
    expect(ordinarySaveResult.save.lastOfflineRewardAtMs).toBe(1000);
    expect(savedAfterOrdinarySave.save.updatedAtMs).toBe(1000);
    expect(savedAfterOrdinarySave.save.lastOfflineRewardAtMs).toBe(1000);
    expect(recoveredLoadResult.offlineRewards?.ok).toBe(true);
    expect(recoveredLoadResult.activeSave.progress.resources.silver).toBeGreaterThan(
      savedAfterOrdinarySave.save.progress.resources.silver
    );
    expect(recoveredLoadResult.activeSave.lastOfflineRewardAtMs).toBe(61_000);
  });

  it("keeps combined normalized offline reward diagnostics after a lossy ordinary save advances only updatedAtMs", () => {
    const storage = new FailingWriteStorage();
    const progress = createInitialPlayerProgress(staticData);
    progress.maps.greenline_approach.highestClearedStageIndex = 1;
    progress.currentStageId = "greenline_approach_2";
    const save = createSaveData({
      progress,
      selectedOfflineFarmStageId: "greenline_approach_1",
      nowMs: 1000
    });
    const { offlineFarmPreset: _offlineFarmPreset, ...rawSave } = save;

    storage.setItem(WEB_SAVE_STORAGE_KEY, JSON.stringify(rawSave));
    storage.failWrites = true;

    const stateAfterFailedStartupWrite = createInitialWebGameStateFromStorage(
      staticData,
      storage,
      31_000
    );
    const changedStateBeforeOrdinarySave = webGameStateReducer(
      staticData,
      stateAfterFailedStartupWrite,
      {
        type: "set_auto_medicine_enabled",
        enabled: false
      }
    );
    const lossyOrdinarySave = createSaveData({
      progress: changedStateBeforeOrdinarySave.progress,
      autoMedicinePreferences:
        changedStateBeforeOrdinarySave.autoMedicinePreferences,
      selectedOfflineFarmStageId:
        changedStateBeforeOrdinarySave.selectedOfflineFarmStageId,
      offlineFarmPreset: changedStateBeforeOrdinarySave.offlineFarmPreset,
      nowMs: 45_000,
      previousSave: save
    });

    storage.failWrites = false;
    storage.setItem(WEB_SAVE_STORAGE_KEY, JSON.stringify(lossyOrdinarySave));

    const diagnostics = withBrowserStorage(storage, () =>
      buildSaveDiagnostics(staticData, changedStateBeforeOrdinarySave)
    );

    expect(stateAfterFailedStartupWrite.startupSavePersistence?.persistedSave).toBeNull();
    expect(
      stateAfterFailedStartupWrite.startupSavePersistence
        ?.offlineRewardBaselineSave?.lastOfflineRewardAtMs
    ).toBe(1000);
    expect(lossyOrdinarySave.updatedAtMs).toBe(45_000);
    expect(lossyOrdinarySave.lastOfflineRewardAtMs).toBe(1000);
    expect(diagnostics.status).toBe("storage_error");
    expect(diagnostics.updatedAtMs).toBe(45_000);
    expect(diagnostics.lastOfflineRewardAtMs).toBe(1000);
    expect(diagnostics.errors).toEqual([
      "Save load write failed after normalizedSave, offlineRewardsApplied: quota exceeded"
    ]);
  });

  it("does not claim a migrated save was persisted when the rewrite fails", () => {
    const storage = new FailingWriteStorage();
    const [fixture] = buildSaveVersionFixtures(staticData);

    storage.setItem(WEB_SAVE_STORAGE_KEY, JSON.stringify(fixture.rawSave));
    storage.failWrites = true;

    const loadResult = loadSaveDataWithOfflineRewardsFromStorage(
      staticData,
      storage,
      2000
    );
    const rawStoredAfterFailure = JSON.parse(
      storage.getItem(WEB_SAVE_STORAGE_KEY) ?? "{}"
    ) as { version?: unknown };

    expect(loadResult.ok).toBe(true);
    if (!loadResult.ok) {
      return;
    }
    expect(loadResult.commitResult.status).toBe("failed");
    expect(loadResult.commitResult.attemptedWriteReasons).toEqual(["migrated"]);
    expect(loadResult.migration).toMatchObject({
      fromVersion: fixture.version,
      toVersion: SAVE_DATA_VERSION,
      migrated: true
    });
    expect(loadResult.loadedNormalizedSave.version).toBe(SAVE_DATA_VERSION);
    expect(loadResult.candidateSave.version).toBe(SAVE_DATA_VERSION);
    expect(loadResult.activeSave).toEqual(loadResult.loadedNormalizedSave);
    expect(loadResult.persistedSave).toBeNull();
    expect(rawStoredAfterFailure.version).toBe(fixture.version);
  });

  it("reports failed migrated startup writes as unpersisted in save diagnostics", () => {
    const storage = new FailingWriteStorage();
    const [fixture] = buildSaveVersionFixtures(staticData);

    storage.setItem(WEB_SAVE_STORAGE_KEY, JSON.stringify(fixture.rawSave));
    storage.failWrites = true;

    const state = createInitialWebGameStateFromStorage(
      staticData,
      storage,
      2000
    );
    const diagnostics = withBrowserStorage(storage, () =>
      buildSaveDiagnostics(staticData, state)
    );

    expect(state.startupSavePersistence?.commitStatus).toBe("failed");
    expect(state.startupSavePersistence?.persistedSave).toBeNull();
    expect(diagnostics.status).toBe("storage_error");
    expect(diagnostics.saveVersion).toBe(SAVE_DATA_VERSION);
    expect(diagnostics.updatedAtMs).toBe(2000);
    expect(diagnostics.errors).toEqual([
      "Save load write failed after migrated: quota exceeded"
    ]);
  });

  it("clears stale startup write diagnostics after a later successful save", () => {
    const storage = new FailingWriteStorage();
    const [fixture] = buildSaveVersionFixtures(staticData);

    storage.setItem(WEB_SAVE_STORAGE_KEY, JSON.stringify(fixture.rawSave));
    storage.failWrites = true;

    const state = createInitialWebGameStateFromStorage(
      staticData,
      storage,
      2000
    );

    storage.failWrites = false;
    const saveResult = saveWebGameStateToStorage(
      staticData,
      state,
      storage,
      3000
    );
    const diagnostics = withBrowserStorage(storage, () =>
      buildSaveDiagnostics(staticData, state)
    );

    expect(state.startupSaveDiagnostics).toEqual([
      "Save load write failed after migrated: quota exceeded"
    ]);
    expect(saveResult.ok).toBe(true);
    expect(diagnostics.status).toBe("ready");
    expect(diagnostics.saveVersion).toBe(SAVE_DATA_VERSION);
    expect(diagnostics.updatedAtMs).toBe(3000);
    expect(diagnostics.errors).toEqual([]);
  });

  it("does not claim a normalized current-version save was persisted when the rewrite fails", () => {
    const storage = new FailingWriteStorage();
    const progress = createInitialPlayerProgress(staticData);
    const save = createSaveData({
      progress,
      selectedOfflineFarmStageId: null,
      nowMs: 1000
    });
    const { offlineFarmPreset: _offlineFarmPreset, ...rawSave } = save;

    storage.setItem(WEB_SAVE_STORAGE_KEY, JSON.stringify(rawSave));
    storage.failWrites = true;

    const loadResult = loadSaveDataWithOfflineRewardsFromStorage(
      staticData,
      storage,
      1000
    );
    const rawStoredAfterFailure = JSON.parse(
      storage.getItem(WEB_SAVE_STORAGE_KEY) ?? "{}"
    ) as { offlineFarmPreset?: unknown };

    expect(loadResult.ok).toBe(true);
    if (!loadResult.ok) {
      return;
    }
    expect(loadResult.commitResult.status).toBe("failed");
    expect(loadResult.commitResult.attemptedWriteReasons).toEqual([
      "normalizedSave"
    ]);
    expect(loadResult.loadedNormalizedSave.offlineFarmPreset).toBe("balanced");
    expect(loadResult.candidateSave.offlineFarmPreset).toBe("balanced");
    expect(loadResult.activeSave).toEqual(loadResult.loadedNormalizedSave);
    expect(loadResult.persistedSave).toBeNull();
    expect(rawStoredAfterFailure.offlineFarmPreset).toBeUndefined();
  });

  it("reports failed normalized startup writes as unpersisted in save diagnostics", () => {
    const storage = new FailingWriteStorage();
    const progress = createInitialPlayerProgress(staticData);
    const save = createSaveData({
      progress,
      selectedOfflineFarmStageId: null,
      nowMs: 1000
    });
    const { offlineFarmPreset: _offlineFarmPreset, ...rawSave } = save;

    storage.setItem(WEB_SAVE_STORAGE_KEY, JSON.stringify(rawSave));
    storage.failWrites = true;

    const state = createInitialWebGameStateFromStorage(
      staticData,
      storage,
      1000
    );
    const diagnostics = withBrowserStorage(storage, () =>
      buildSaveDiagnostics(staticData, state)
    );

    expect(state.startupSavePersistence?.commitStatus).toBe("failed");
    expect(state.startupSavePersistence?.persistedSave).toBeNull();
    expect(diagnostics.status).toBe("storage_error");
    expect(diagnostics.saveVersion).toBe(SAVE_DATA_VERSION);
    expect(diagnostics.updatedAtMs).toBe(1000);
    expect(diagnostics.errors).toEqual([
      "Save load write failed after normalizedSave: quota exceeded"
    ]);
  });

  it("falls back safely from invalid saved offline farm targets", () => {
    const cases = [
      {
        name: "missing",
        selectedOfflineFarmStageId: "missing_stage",
        highestClearedStageIndex: 9,
        currentStageId: "greenline_approach_10",
        expectedFarmStageId: "greenline_approach_8"
      },
      {
        name: "locked",
        selectedOfflineFarmStageId: "greenline_approach_3",
        highestClearedStageIndex: 1,
        currentStageId: "greenline_approach_2",
        expectedFarmStageId: "greenline_approach_1"
      },
      {
        name: "boss",
        selectedOfflineFarmStageId: "greenline_approach_10",
        highestClearedStageIndex: 10,
        currentStageId: "greenline_approach_10",
        expectedFarmStageId: "greenline_approach_8"
      }
    ];

    for (const testCase of cases) {
      const storage = new MemoryStorage();
      const progress = createInitialPlayerProgress(staticData);
      progress.maps.greenline_approach.highestClearedStageIndex =
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
    expect(state.progress.currentStageId).toBe("greenline_approach_1");
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
            cultivation: 0,
            herbs: 0
          }
        }
      },
      {
        upgradeId: "hero_outer_training",
        heroId: "iron_fist_initiate"
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
    expect(battleSaveResult.save.offlineFarmPreset).toBe("balanced");
    expect(battleSaveResult.save.createdAtMs).toBe(1000);
    expect(battleSaveResult.save.updatedAtMs).toBe(2000);
    expect(battleSaveResult.save.lastOfflineRewardAtMs).toBe(1000);
    expect(purchaseSaveResult.save.progress.resources.silver).toBe(8);
    expect(purchaseSaveResult.save.offlineFarmPreset).toBe("balanced");
    expect(purchaseSaveResult.save.createdAtMs).toBe(1000);
    expect(purchaseSaveResult.save.updatedAtMs).toBe(3000);
    expect(purchaseSaveResult.save.lastOfflineRewardAtMs).toBe(1000);
  });

  it("persists offline farm presets through autosave", () => {
    const storage = new MemoryStorage();
    const state = webGameStateReducer(
      staticData,
      createInitialWebGameStateFromStorage(staticData, storage, 1000),
      {
        type: "set_offline_farm_preset",
        preset: "silver"
      }
    );
    const saveResult = saveWebGameStateToStorage(
      staticData,
      state,
      storage,
      2000
    );
    const loadResult = loadSaveDataFromStorage(staticData, storage);

    expect(saveResult.ok).toBe(true);
    expect(loadResult.ok).toBe(true);
    if (!saveResult.ok || !loadResult.ok) {
      return;
    }
    expect(saveResult.save.offlineFarmPreset).toBe("silver");
    expect(loadResult.save.offlineFarmPreset).toBe("silver");
  });

  it("uses an autosave interval within the MVP range", () => {
    expect(WEB_SAVE_AUTOSAVE_INTERVAL_MS).toBeGreaterThanOrEqual(10_000);
    expect(WEB_SAVE_AUTOSAVE_INTERVAL_MS).toBeLessThanOrEqual(30_000);
  });
});
