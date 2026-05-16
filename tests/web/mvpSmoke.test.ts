import { describe, expect, it } from "vitest";
import {
  createInitialWebGameStateFromStorage,
  equipGameEquipment,
  getWebGameViewModel,
  purchaseGameUpgrade,
  resolveSelectedStageBattle,
  selectGameStyleBranch,
  setGameActiveHeroTeam,
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
  branchId: "cloud_context_pulse",
  equipmentId: "training_wraps",
  heroId: "iron_fist_initiate",
  styleId: "pulse"
} as const;

const stage13SmokeChoices = {
  assignmentHeroId: "mountain_brace_guardian",
  assignmentId: "lotus_medicine_pavilion",
  entryBossStageId: "black_iron_foundry_7",
  farmStageId: "lotus_clinic_1",
  supportHeroId: "lotus_stabilizer"
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

function createStage13BlackIronBossReadyState(
  storage: WebSaveStorage,
  nowMs: number
): WebGameState {
  const state = createInitialWebGameStateFromStorage(
    staticData,
    storage,
    nowMs
  );
  const advancedProgress = {
    ...state.progress,
    resources: {
      silver: 50_000,
      cultivation: 50_000,
      herbs: 0
    },
    heroes: Object.fromEntries(
      Object.entries(state.progress.heroes).map(([heroId, heroProgress]) => [
        heroId,
        {
          ...heroProgress,
          level: heroId === stage13SmokeChoices.supportHeroId ? 1 : 30,
          upgrades:
            heroId === stage13SmokeChoices.supportHeroId
              ? heroProgress.upgrades
              : {
                  ...heroProgress.upgrades,
                  hero_outer_training: 24,
                  hero_inner_training: 20
                }
        }
      ])
    ),
    sect: {
      upgrades: {
        sect_outer_training: 24,
        sect_inner_training: 20
      }
    },
    maps: {
      ...state.progress.maps,
      greenline_approach: {
        combatExperience: 188,
        highestClearedStageIndex: 10
      },
      veil_district: {
        combatExperience: 152,
        highestClearedStageIndex: 6
      },
      black_iron_foundry: {
        combatExperience: 378,
        highestClearedStageIndex: 6
      },
      lotus_clinic: {
        combatExperience: 0,
        highestClearedStageIndex: 0
      }
    },
    currentStageId: stage13SmokeChoices.entryBossStageId
  };
  const progressedState = webGameStateReducer(staticData, state, {
    type: "replace_progress",
    progress: advancedProgress
  });
  const selectedState = webGameStateReducer(staticData, progressedState, {
    type: "select_stage",
    stageId: stage13SmokeChoices.entryBossStageId
  });

  saveState(storage, selectedState, nowMs);

  return selectedState;
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
    expect(state.progress.currentStageId).toBe("greenline_approach_1");

    state = battleAndSave(storage, state, (nowMs += 1_000));
    state = battleAndSave(storage, state, (nowMs += 1_000));

    expect(state.progress.currentStageId).toBe("greenline_approach_3");
    expect(state.progress.resources.silver).toBe(24);
    expect(state.progress.maps.greenline_approach.combatExperience).toBe(10);

    state = purchaseGameUpgrade(staticData, state, {
      upgradeId: "hero_outer_training",
      heroId: "iron_fist_initiate"
    });
    saveState(storage, state, (nowMs += 1_000));

    expect(state.lastPurchase?.ok).toBe(true);
    expect(state.progress.resources.silver).toBe(12);
    expect(
      state.progress.heroes.iron_fist_initiate.upgrades.hero_outer_training
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

    expect(state.progress.currentStageId).toBe("greenline_approach_10");
    expect(
      state.progress.maps.greenline_approach.highestClearedStageIndex
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
    expect(state.progress.currentStageId).toBe("greenline_approach_10");
    expect(state.selectedStageId).toBe("greenline_approach_10");

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
      stageId: "greenline_approach_1"
    });
    saveState(storage, state, (nowMs += 1_000));

    expect(state.selectedStageId).toBe("greenline_approach_1");
    expect(state.selectedOfflineFarmStageId).toBe("greenline_approach_1");

    const reloadedState = createInitialWebGameStateFromStorage(
      staticData,
      storage,
      nowMs
    );

    expect(reloadedState.progress.currentStageId).toBe("greenline_approach_10");
    expect(
      reloadedState.progress.maps.greenline_approach.highestClearedStageIndex
    ).toBe(9);
    expectStage12SmokeChoices(reloadedState);
    expect(reloadedState.selectedOfflineFarmStageId).toBe("greenline_approach_1");
    expect(reloadedState.offlineSummary).toBeNull();

    const offlineState = createInitialWebGameStateFromStorage(
      staticData,
      storage,
      nowMs + 31_000
    );

    expect(offlineState.offlineSummary).toMatchObject({
      stageId: "greenline_approach_1",
      clears: 3
    });
    expect(offlineState.offlineSummary?.silver).toBeCloseTo(18.124);
    expect(offlineState.offlineSummary?.cultivation).toBeCloseTo(9);
    expect(offlineState.offlineSummary?.combatExperience).toBeCloseTo(9.021);
    expect(offlineState.offlineSummary?.assignmentSilver).toBeGreaterThan(0);

    const silverAfterOffline = offlineState.progress.resources.silver;
    const combatExperienceAfterOffline =
      offlineState.progress.maps.greenline_approach.combatExperience;
    const secondReloadState = createInitialWebGameStateFromStorage(
      staticData,
      storage,
      nowMs + 31_000
    );

    expect(secondReloadState.offlineSummary).toBeNull();
    expect(secondReloadState.progress.resources.silver).toBe(
      silverAfterOffline
    );
    expect(secondReloadState.progress.maps.greenline_approach.combatExperience).toBe(
      combatExperienceAfterOffline
    );
  });

  it("covers Stage 1.3 region handoff, Lotus support, medicine, save reload, and offline idempotency", () => {
    const storage = new MemoryStorage();
    let nowMs = 10_000;
    let state = createStage13BlackIronBossReadyState(storage, nowMs);

    expect(state.progress.currentStageId).toBe(
      stage13SmokeChoices.entryBossStageId
    );
    expect(state.selectedStageId).toBe(stage13SmokeChoices.entryBossStageId);

    state = battleAndSave(storage, state, (nowMs += 1_000));

    expect(state.lastBattle?.ok).toBe(true);
    if (!state.lastBattle?.ok) {
      throw new Error("Black Iron boss did not resolve successfully");
    }
    expect(state.lastBattle.stageCleared).toBe(true);
    expect(state.progress.currentStageId).toBe("lotus_clinic_1");
    expect(state.selectedStageId).toBe("lotus_clinic_1");
    expect(
      state.progress.maps.black_iron_foundry.highestClearedStageIndex
    ).toBe(7);

    for (const stageId of [
      "lotus_clinic_1",
      "lotus_clinic_2",
      "lotus_clinic_3"
    ]) {
      expect(state.selectedStageId).toBe(stageId);

      state = battleAndSave(storage, state, (nowMs += 1_000));

      expect(state.lastBattle?.ok).toBe(true);
      if (!state.lastBattle?.ok) {
        throw new Error(`${stageId} did not resolve successfully`);
      }
      expect(state.lastBattle.stageCleared, stageId).toBe(true);
    }

    expect(state.progress.currentStageId).toBe("lotus_clinic_4");
    expect(
      state.progress.maps.lotus_clinic.highestClearedStageIndex
    ).toBe(3);
    expect(state.progress.resources.herbs).toBeGreaterThan(0);

    const lotusViewModel = getWebGameViewModel(staticData, state);

    expect(
      lotusViewModel.roster.find(
        (hero) => hero.heroId === stage13SmokeChoices.supportHeroId
      )
    ).toMatchObject({
      unlocked: true,
      combatRole: "support"
    });
    expect(
      lotusViewModel.assignments.find(
        (assignment) => assignment.assignmentId === stage13SmokeChoices.assignmentId
      )
    ).toMatchObject({
      unlocked: true,
      rewardSummary: expect.arrayContaining(["18 Reagents/hour"])
    });

    state = setGameActiveHeroTeam(staticData, state, {
      heroIds: [
        "iron_fist_initiate",
        "azure_pulse_monk",
        stage13SmokeChoices.assignmentHeroId,
        stage13SmokeChoices.supportHeroId
      ]
    });
    saveState(storage, state, (nowMs += 1_000));

    expect(state.lastActiveTeamAction?.ok).toBe(true);
    expect(state.progress.activeHeroIds).toContain(
      stage13SmokeChoices.supportHeroId
    );

    state = setGameAssignmentHeroes(staticData, state, {
      assignmentId: stage13SmokeChoices.assignmentId,
      heroIds: [stage13SmokeChoices.assignmentHeroId]
    });
    saveState(storage, state, (nowMs += 1_000));

    expect(state.lastAssignmentAction?.ok).toBe(true);
    expect(
      state.progress.assignments?.[stage13SmokeChoices.assignmentId]?.heroIds
    ).toEqual([stage13SmokeChoices.assignmentHeroId]);

    state = webGameStateReducer(staticData, state, {
      type: "select_stage",
      stageId: stage13SmokeChoices.farmStageId
    });
    saveState(storage, state, (nowMs += 1_000));

    expect(state.selectedStageId).toBe(stage13SmokeChoices.farmStageId);
    expect(state.selectedOfflineFarmStageId).toBe(
      stage13SmokeChoices.farmStageId
    );

    const reloadedState = createInitialWebGameStateFromStorage(
      staticData,
      storage,
      nowMs
    );

    expect(reloadedState.progress.currentStageId).toBe("lotus_clinic_4");
    expect(reloadedState.progress.activeHeroIds).toContain(
      stage13SmokeChoices.supportHeroId
    );
    expect(
      reloadedState.progress.assignments?.[stage13SmokeChoices.assignmentId]?.heroIds
    ).toEqual([stage13SmokeChoices.assignmentHeroId]);
    expect(reloadedState.selectedOfflineFarmStageId).toBe(
      stage13SmokeChoices.farmStageId
    );
    expect(reloadedState.progress.resources.herbs).toBe(
      state.progress.resources.herbs
    );

    const offlineState = createInitialWebGameStateFromStorage(
      staticData,
      storage,
      nowMs + 24 * 60 * 60 * 1000
    );

    expect(offlineState.offlineSummary).toMatchObject({
      stageId: stage13SmokeChoices.farmStageId
    });
    expect(offlineState.offlineSummary?.herbs).toBeGreaterThan(0);
    expect(offlineState.offlineSummary?.assignmentHerbs).toBeGreaterThan(0);
    expect(offlineState.progress.resources.herbs).toBeGreaterThan(
      reloadedState.progress.resources.herbs
    );
    expect(
      offlineState.progress.equipment?.inventory.lotus_dew_pill
    ).toBeGreaterThanOrEqual(1);

    const herbsAfterOffline = offlineState.progress.resources.herbs;
    const lotusDewAfterOffline =
      offlineState.progress.equipment?.inventory.lotus_dew_pill;
    const secondReloadState = createInitialWebGameStateFromStorage(
      staticData,
      storage,
      nowMs + 24 * 60 * 60 * 1000
    );

    expect(secondReloadState.offlineSummary).toBeNull();
    expect(secondReloadState.progress.resources.herbs).toBe(herbsAfterOffline);
    expect(secondReloadState.progress.equipment?.inventory.lotus_dew_pill).toBe(
      lotusDewAfterOffline
    );
  });
});
