import { describe, expect, it } from "vitest";
import {
  createInitialWebGameState,
  getWebGameViewModel,
  purchaseGameUpgrade,
  resolveSelectedStageBattle,
  webGameStateReducer
} from "../../web/state/gameState";
import { staticData } from "../helpers/staticData";

describe("web game state", () => {
  it("initializes new progress and selected stage state", () => {
    const state = createInitialWebGameState(staticData);
    const viewModel = getWebGameViewModel(staticData, state);

    expect(state.progress.currentStageId).toBe("bamboo_road_1");
    expect(state.selectedStageId).toBe("bamboo_road_1");
    expect(state.selectedOfflineFarmStageId).toBeNull();
    expect(viewModel.selectedStage?.id).toBe("bamboo_road_1");
    expect(viewModel.enemy?.id).toBe("bamboo_bandit");
    expect(viewModel.battleEvents).toEqual([]);
    expect(viewModel.battleSummary).toBeNull();
    expect(viewModel.playerCombatants).toHaveLength(4);
    expect(viewModel.playerCombatants[0]).toMatchObject({
      name: "Iron Fist Disciple",
      outerHp: 180,
      innerQi: 90,
      maxOuterHp: 180,
      maxInnerQi: 90
    });
    expect(viewModel.enemyCombatants).toHaveLength(1);
    expect(viewModel.enemyCombatants[0]).toMatchObject({
      name: "Bamboo Road Bandit",
      outerHp: 120,
      innerQi: 60,
      maxOuterHp: 120,
      maxInnerQi: 60
    });
  });

  it("updates progress and selected stage after battle", () => {
    const state = createInitialWebGameState(staticData);
    const nextState = resolveSelectedStageBattle(staticData, state);

    expect(nextState.lastBattle?.ok).toBe(true);
    expect(nextState.progress.resources.silver).toBe(10);
    expect(nextState.progress.maps.bamboo_road.highestClearedStageIndex).toBe(1);
    expect(nextState.progress.currentStageId).toBe("bamboo_road_2");
    expect(nextState.selectedStageId).toBe("bamboo_road_2");
    expect(nextState.selectedOfflineFarmStageId).toBe("bamboo_road_1");
    expect(nextState.lastBattleStageId).toBe("bamboo_road_1");

    const viewModel = getWebGameViewModel(staticData, nextState);

    expect(viewModel.lastBattleStage?.id).toBe("bamboo_road_1");
    expect(viewModel.selectedStage?.id).toBe("bamboo_road_2");
    expect(viewModel.enemyCombatants[0]).toMatchObject({
      name: "Bamboo Road Bandit",
      outerHp: 120,
      maxOuterHp: 120
    });
    expect(viewModel.battleSummary?.title).toContain("Victory at Bamboo Road 1");
    expect(viewModel.battleEvents.some((event) => event.category === "attack"))
      .toBe(true);
    expect(viewModel.battleEvents.some((event) => event.category === "defeat"))
      .toBe(true);
    expect(viewModel.battleEvents[0].detail).toContain("Outer damage");
  });

  it("builds readable battle playback rows for Qi Break events", () => {
    const state = createInitialWebGameState(staticData);
    const stageFiveProgress = {
      ...state.progress,
      currentStageId: "bamboo_road_5",
      maps: {
        ...state.progress.maps,
        bamboo_road: {
          combatExperience: 0,
          highestClearedStageIndex: 4
        }
      }
    };
    const stageFiveState = webGameStateReducer(
      staticData,
      {
        ...state,
        progress: stageFiveProgress
      },
      {
        type: "select_stage",
        stageId: "bamboo_road_5"
      }
    );
    const nextState = resolveSelectedStageBattle(staticData, stageFiveState);
    const viewModel = getWebGameViewModel(staticData, nextState);
    const attackEvent = viewModel.battleEvents.find(
      (event) => event.category === "attack"
    );
    const qiBreakEvent = viewModel.battleEvents.find(
      (event) => event.category === "qi_break"
    );

    expect(attackEvent?.headline).toContain("attacks");
    expect(attackEvent?.detail).toContain("Outer damage");
    expect(qiBreakEvent?.headline).toContain("Qi Break");
    expect(qiBreakEvent?.detail).toContain("Inner Qi");
    expect(viewModel.battleSummary?.details.join(" ")).toContain("Qi Breaks");
  });

  it("updates progress after upgrade purchases", () => {
    const state = createInitialWebGameState(staticData);
    const progress = {
      ...state.progress,
      resources: {
        silver: 20,
        cultivation: 0
      }
    };
    const nextState = purchaseGameUpgrade(
      staticData,
      {
        ...state,
        progress
      },
      {
        upgradeId: "hero_outer_training",
        heroId: "iron_fist_disciple"
      }
    );

    expect(nextState.lastPurchase?.ok).toBe(true);
    expect(nextState.progress.resources.silver).toBe(8);
    expect(
      nextState.progress.heroes.iron_fist_disciple.upgrades.hero_outer_training
    ).toBe(1);
  });

  it("normalizes selected offline farm stage to the best unlocked farm", () => {
    const state = createInitialWebGameState(staticData);
    const nextState = webGameStateReducer(staticData, state, {
      type: "replace_progress",
      progress: {
        ...state.progress,
        currentStageId: "bamboo_road_10",
        maps: {
          ...state.progress.maps,
          bamboo_road: {
            combatExperience: 88,
            highestClearedStageIndex: 9
          }
        }
      }
    });

    expect(nextState.selectedOfflineFarmStageId).toBe("bamboo_road_8");
  });
});
