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
    expect(state.offlineSummary).toBeNull();
    expect(viewModel.selectedStage?.id).toBe("bamboo_road_1");
    expect(viewModel.offlineSummary).toBeNull();
    expect(viewModel.enemy?.id).toBe("bamboo_bandit");
    expect(viewModel.battleEvents).toEqual([]);
    expect(viewModel.battleSummary).toBeNull();
    expect(viewModel.masteryPanel).toMatchObject({
      regionId: "bamboo_road",
      regionName: "Bamboo Road",
      combatExperience: 0,
      reachedRanks: [],
      nextThreshold: {
        experience: 100,
        rank: "familiar",
        remainingExperience: 100
      },
      activeBonuses: [],
      progressPercent: 0
    });
    expect(viewModel.stageOptions).toHaveLength(10);
    expect(viewModel.stageOptions[0]).toMatchObject({
      id: "bamboo_road_1",
      isUnlocked: true,
      isCleared: false,
      isSelectedStage: true,
      canSelectStage: true,
      canSelectOfflineFarm: false
    });
    expect(viewModel.stageOptions[1]).toMatchObject({
      id: "bamboo_road_2",
      isUnlocked: false,
      canSelectStage: false,
      canSelectOfflineFarm: false
    });
    expect(viewModel.upgrades).toHaveLength(10);
    expect(
      viewModel.upgrades.find(
        (upgrade) =>
          upgrade.upgradeId === "hero_outer_training" &&
          upgrade.heroId === "iron_fist_disciple"
      )
    ).toMatchObject({
      level: 0,
      cost: 12,
      affordable: false,
      stat: "Outer Attack"
    });
    expect(
      viewModel.upgrades.find(
        (upgrade) => upgrade.upgradeId === "sect_outer_training"
      )
    ).toMatchObject({
      level: 0,
      cost: 48,
      affordable: false,
      targetName: "Sect"
    });
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

    const clearedStage = viewModel.stageOptions.find(
      (stage) => stage.id === "bamboo_road_1"
    );
    const nextStage = viewModel.stageOptions.find(
      (stage) => stage.id === "bamboo_road_2"
    );

    expect(clearedStage).toMatchObject({
      isCleared: true,
      isSelectedOfflineFarmStage: true,
      canSelectOfflineFarm: true
    });
    expect(nextStage).toMatchObject({
      isUnlocked: true,
      isSelectedStage: true,
      canSelectStage: true
    });
  });

  it("prevents selecting locked stages in web state", () => {
    const state = createInitialWebGameState(staticData);
    const nextState = webGameStateReducer(staticData, state, {
      type: "select_stage",
      stageId: "bamboo_road_5"
    });

    expect(nextState.selectedStageId).toBe("bamboo_road_1");
  });

  it("allows cleared non-boss farm stages and rejects boss farming", () => {
    const state = createInitialWebGameState(staticData);
    const clearedProgress = {
      ...state.progress,
      currentStageId: "bamboo_road_10",
      maps: {
        ...state.progress.maps,
        bamboo_road: {
          combatExperience: 0,
          highestClearedStageIndex: 10
        }
      }
    };
    const progressedState = webGameStateReducer(staticData, state, {
      type: "replace_progress",
      progress: clearedProgress
    });
    const farmStageState = webGameStateReducer(staticData, progressedState, {
      type: "select_offline_farm_stage",
      stageId: "bamboo_road_3"
    });
    const bossFarmState = webGameStateReducer(staticData, farmStageState, {
      type: "select_offline_farm_stage",
      stageId: "bamboo_road_10"
    });
    const viewModel = getWebGameViewModel(staticData, bossFarmState);
    const bossOption = viewModel.stageOptions.find(
      (stage) => stage.id === "bamboo_road_10"
    );

    expect(farmStageState.selectedOfflineFarmStageId).toBe("bamboo_road_3");
    expect(bossFarmState.selectedOfflineFarmStageId).toBe("bamboo_road_8");
    expect(bossOption).toMatchObject({
      isBoss: true,
      isCleared: true,
      canSelectOfflineFarm: false
    });
  });

  it("builds mastery panel thresholds, ranks, and active bonuses", () => {
    const state = createInitialWebGameState(staticData);
    const familiarState = webGameStateReducer(staticData, state, {
      type: "replace_progress",
      progress: {
        ...state.progress,
        maps: {
          ...state.progress.maps,
          bamboo_road: {
            combatExperience: 120,
            highestClearedStageIndex: 4
          }
        }
      }
    });
    const trainedState = webGameStateReducer(staticData, state, {
      type: "replace_progress",
      progress: {
        ...state.progress,
        maps: {
          ...state.progress.maps,
          bamboo_road: {
            combatExperience: 600,
            highestClearedStageIndex: 8
          }
        }
      }
    });
    const familiarMastery = getWebGameViewModel(
      staticData,
      familiarState
    ).masteryPanel;
    const trainedMastery = getWebGameViewModel(
      staticData,
      trainedState
    ).masteryPanel;

    expect(familiarMastery).toMatchObject({
      combatExperience: 120,
      reachedRanks: ["familiar"],
      nextThreshold: {
        experience: 500,
        rank: "trained",
        remainingExperience: 380
      }
    });
    expect(familiarMastery?.progressPercent).toBeCloseTo(0.24);
    expect(familiarMastery?.activeBonuses.map((bonus) => bonus.label)).toEqual([
      "+1% Outer and Inner attack"
    ]);
    expect(trainedMastery).toMatchObject({
      combatExperience: 600,
      reachedRanks: ["familiar", "trained"],
      nextThreshold: {
        experience: 3000,
        rank: "mastered",
        remainingExperience: 2400
      }
    });
    expect(trainedMastery?.progressPercent).toBeCloseTo(0.2);
    expect(trainedMastery?.activeBonuses.map((bonus) => bonus.label)).toEqual([
      "+1% Outer and Inner attack",
      "+2% stage rewards"
    ]);
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
    const affordableViewModel = getWebGameViewModel(staticData, {
      ...state,
      progress
    });
    const affordableUpgrade = affordableViewModel.upgrades.find(
      (upgrade) =>
        upgrade.upgradeId === "hero_outer_training" &&
        upgrade.heroId === "iron_fist_disciple"
    );

    expect(affordableUpgrade?.affordable).toBe(true);

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

    const viewModel = getWebGameViewModel(staticData, nextState);
    const ironFist = viewModel.playerCombatants.find(
      (combatant) => combatant.definitionId === "iron_fist_disciple"
    );
    const nextUpgrade = viewModel.upgrades.find(
      (upgrade) =>
        upgrade.upgradeId === "hero_outer_training" &&
        upgrade.heroId === "iron_fist_disciple"
    );

    expect(ironFist?.outerAttack).toBeCloseTo(19.8);
    expect(nextUpgrade).toMatchObject({
      level: 1,
      cost: 13,
      affordable: false
    });
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
