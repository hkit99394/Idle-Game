import { describe, expect, it } from "vitest";
import {
  createInitialWebGameStateFromStorage,
  equipGameEquipment,
  getWebGameViewModel,
  purchaseGameUpgrade,
  resolveSelectedStageBattle,
  selectGameStyleBranch,
  setGameAssignmentHeroes,
  webGameStateReducer
} from "../../web/state/gameState";
import type { WebGameState } from "../../web/state/gameState";
import {
  loadSaveDataFromStorage,
  saveWebGameStateToStorage
} from "../../web/state/saveStorage";
import type { WebSaveStorage } from "../../web/state/saveStorage";
import { MemoryStorage } from "../helpers/memoryStorage";
import { staticData } from "../helpers/staticData";

const stage12SmokeChoices = {
  assignmentId: "bamboo_road_patrol",
  branchId: "cloud_meridian_palm",
  equipmentId: "training_wraps",
  heroId: "iron_fist_disciple",
  styleId: "palm"
} as const;

function saveState(
  storage: WebSaveStorage,
  state: WebGameState,
  nowMs: number
): void {
  const saveResult = saveWebGameStateToStorage(
    staticData,
    state,
    storage,
    nowMs
  );

  expect(saveResult.ok).toBe(true);
}

function battleAndSave(
  storage: WebSaveStorage,
  state: WebGameState,
  nowMs: number
): WebGameState {
  const battleState = resolveSelectedStageBattle(staticData, state);
  const nextState =
    battleState.lastBattle?.ok && battleState.lastBattle.stageCleared
      ? webGameStateReducer(staticData, battleState, {
          type: "select_stage",
          stageId: battleState.progress.currentStageId
        })
      : battleState;

  saveState(storage, nextState, nowMs);

  return nextState;
}

function expectStage12SmokeChoices(state: WebGameState): void {
  expect(
    state.progress.equipment?.equipped[stage12SmokeChoices.heroId]?.weapon
  ).toBe(stage12SmokeChoices.equipmentId);
  expect(
    state.progress.assignments?.[stage12SmokeChoices.assignmentId]?.heroIds
  ).toEqual([stage12SmokeChoices.heroId]);
  expect(state.progress.styleBranches?.[stage12SmokeChoices.styleId]).toBe(
    stage12SmokeChoices.branchId
  );
}

describe("MVP smoke flow", () => {
  it("plays from new game through boss gate and offline rewards once", () => {
    const storage = new MemoryStorage();
    const missingSave = loadSaveDataFromStorage(staticData, storage);
    let nowMs = 1_000;
    let state = createInitialWebGameStateFromStorage(
      staticData,
      storage,
      nowMs
    );

    expect(missingSave.ok).toBe(false);
    if (missingSave.ok) {
      return;
    }
    expect(missingSave.reason).toBe("missing_save");
    expect(state.progress.currentStageId).toBe("bamboo_road_1");

    state = battleAndSave(storage, state, (nowMs += 1_000));
    state = battleAndSave(storage, state, (nowMs += 1_000));

    expect(state.progress.currentStageId).toBe("bamboo_road_3");
    expect(state.progress.resources.silver).toBe(24);
    expect(state.progress.maps.bamboo_road.combatExperience).toBe(10);

    state = purchaseGameUpgrade(staticData, state, {
      upgradeId: "hero_outer_training",
      heroId: "iron_fist_disciple"
    });
    saveState(storage, state, (nowMs += 1_000));

    expect(state.lastPurchase?.ok).toBe(true);
    expect(state.progress.resources.silver).toBe(12);
    expect(
      state.progress.heroes.iron_fist_disciple.upgrades.hero_outer_training
    ).toBe(1);

    for (let stageIndex = 3; stageIndex <= 9; stageIndex += 1) {
      state = battleAndSave(storage, state, (nowMs += 1_000));
      const battleResult = state.lastBattle;

      expect(battleResult?.ok).toBe(true);
      if (!battleResult?.ok) {
        throw new Error(`Stage ${stageIndex} did not resolve successfully`);
      }
      expect(battleResult.stageCleared, `stage ${stageIndex}`).toBe(true);
    }

    const preBossViewModel = getWebGameViewModel(staticData, state);

    expect(state.progress.currentStageId).toBe("bamboo_road_10");
    expect(
      state.progress.maps.bamboo_road.highestClearedStageIndex
    ).toBe(9);
    expect(preBossViewModel.masteryPanel).toMatchObject({
      combatExperience: 88,
      nextThreshold: {
        experience: 100,
        remainingExperience: 12
      }
    });
    expect(preBossViewModel.equipmentInventory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          equipmentId: stage12SmokeChoices.equipmentId,
          compatibleHeroIds: expect.arrayContaining([
            stage12SmokeChoices.heroId
          ])
        })
      ])
    );

    state = battleAndSave(storage, state, (nowMs += 1_000));
    const bossBattleResult = state.lastBattle;

    expect(bossBattleResult?.ok).toBe(true);
    if (!bossBattleResult?.ok) {
      throw new Error("Boss battle did not resolve successfully");
    }
    expect(bossBattleResult.stageCleared).toBe(false);
    expect(state.progress.currentStageId).toBe("bamboo_road_10");
    expect(state.selectedStageId).toBe("bamboo_road_10");

    state = equipGameEquipment(staticData, state, {
      heroId: stage12SmokeChoices.heroId,
      equipmentId: stage12SmokeChoices.equipmentId
    });
    saveState(storage, state, (nowMs += 1_000));

    expect(state.lastEquipmentAction?.ok).toBe(true);
    expect(
      state.progress.equipment?.equipped[stage12SmokeChoices.heroId]?.weapon
    ).toBe(stage12SmokeChoices.equipmentId);

    state = setGameAssignmentHeroes(staticData, state, {
      assignmentId: stage12SmokeChoices.assignmentId,
      heroIds: [stage12SmokeChoices.heroId]
    });
    saveState(storage, state, (nowMs += 1_000));

    expect(state.lastAssignmentAction?.ok).toBe(true);
    expect(
      state.progress.assignments?.[stage12SmokeChoices.assignmentId]?.heroIds
    ).toEqual([stage12SmokeChoices.heroId]);

    state = webGameStateReducer(staticData, state, {
      type: "replace_progress",
      progress: {
        ...state.progress,
        styleMastery: {
          ...state.progress.styleMastery,
          [stage12SmokeChoices.styleId]: {
            experience: 200
          }
        }
      }
    });
    state = selectGameStyleBranch(staticData, state, {
      styleId: stage12SmokeChoices.styleId,
      branchId: stage12SmokeChoices.branchId
    });
    saveState(storage, state, (nowMs += 1_000));

    expect(state.lastStyleBranchAction?.ok).toBe(true);
    expectStage12SmokeChoices(state);

    state = webGameStateReducer(staticData, state, {
      type: "select_stage",
      stageId: "bamboo_road_1"
    });
    saveState(storage, state, (nowMs += 1_000));

    expect(state.selectedStageId).toBe("bamboo_road_1");
    expect(state.selectedOfflineFarmStageId).toBe("bamboo_road_1");

    const reloadedState = createInitialWebGameStateFromStorage(
      staticData,
      storage,
      nowMs
    );

    expect(reloadedState.progress.currentStageId).toBe("bamboo_road_10");
    expect(
      reloadedState.progress.maps.bamboo_road.highestClearedStageIndex
    ).toBe(9);
    expectStage12SmokeChoices(reloadedState);
    expect(reloadedState.selectedOfflineFarmStageId).toBe("bamboo_road_1");
    expect(reloadedState.offlineSummary).toBeNull();

    const offlineState = createInitialWebGameStateFromStorage(
      staticData,
      storage,
      nowMs + 31_000
    );

    expect(offlineState.offlineSummary).toMatchObject({
      stageId: "bamboo_road_1",
      clears: 3
    });
    expect(offlineState.offlineSummary?.silver).toBeCloseTo(18.124);
    expect(offlineState.offlineSummary?.cultivation).toBeCloseTo(9);
    expect(offlineState.offlineSummary?.combatExperience).toBeCloseTo(9.021);
    expect(offlineState.offlineSummary?.assignmentSilver).toBeGreaterThan(0);

    const silverAfterOffline = offlineState.progress.resources.silver;
    const combatExperienceAfterOffline =
      offlineState.progress.maps.bamboo_road.combatExperience;
    const secondReloadState = createInitialWebGameStateFromStorage(
      staticData,
      storage,
      nowMs + 31_000
    );

    expect(secondReloadState.offlineSummary).toBeNull();
    expect(secondReloadState.progress.resources.silver).toBe(
      silverAfterOffline
    );
    expect(secondReloadState.progress.maps.bamboo_road.combatExperience).toBe(
      combatExperienceAfterOffline
    );
  });
});
