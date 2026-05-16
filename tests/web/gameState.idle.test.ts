import { describe, expect, it } from "vitest";
import {
  createInitialWebGameState,
  equipGameEquipment,
  getWebGameViewModel,
  purchaseGameSkillUpgrade,
  purchaseGameUpgrade,
  resolveSelectedStageBattle,
  selectGameStyleBranch,
  setGameActiveHeroTeam,
  setGameAssignmentHeroes,
  webGameStateReducer
} from "../../web/state/gameState";
import { staticData } from "../helpers/staticData";

describe("web game state idle", () => {
  it("shows Lotus herb rewards in routes, offline preview, and assignments", () => {
    const state = createInitialWebGameState(staticData);
    const progressedState = webGameStateReducer(staticData, state, {
      type: "replace_progress",
      progress: {
        ...state.progress,
        currentStageId: "lotus_clinic_2",
        maps: {
          ...state.progress.maps,
          greenline_approach: {
            combatExperience: 0,
            highestClearedStageIndex: 10
          },
          veil_district: {
            combatExperience: 0,
            highestClearedStageIndex: 10
          },
          black_iron_foundry: {
            combatExperience: 0,
            highestClearedStageIndex: 10
          },
          lotus_clinic: {
            combatExperience: 0,
            highestClearedStageIndex: 3
          }
        }
      }
    });
    const selectedState = webGameStateReducer(staticData, progressedState, {
      type: "select_offline_farm_stage",
      stageId: "lotus_clinic_1"
    });
    const viewModel = getWebGameViewModel(staticData, selectedState);

    expect(
      viewModel.stageOptions.find((stage) => stage.id === "lotus_clinic_1")
    ).toMatchObject({
      rewards: {
        herbs: 6
      }
    });
    expect(viewModel.offlineRewardPreview).toMatchObject({
      ok: true,
      stageName: "Lotus Clinic Gate",
      herbs: 1296
    });
    expect(viewModel.offlineFarmRecommendation.herbsPerClear).toBeGreaterThan(0);
    expect(
      viewModel.assignments.find(
        (assignment) => assignment.assignmentId === "lotus_countermeasure_pavilion"
      )
    ).toMatchObject({
      unlocked: true,
      rewardSummary: expect.arrayContaining(["18 Reagents/hour"])
    });
  });

  it("uses selected cleared stages as the automatic offline target", () => {
    const state = createInitialWebGameState(staticData);
    const progressedState = webGameStateReducer(staticData, state, {
      type: "replace_progress",
      progress: {
        ...state.progress,
        currentStageId: "greenline_approach_4",
        maps: {
          ...state.progress.maps,
          greenline_approach: {
            combatExperience: 0,
            highestClearedStageIndex: 3
          }
        }
      }
    });
    const selectedState = webGameStateReducer(staticData, progressedState, {
      type: "select_stage",
      stageId: "greenline_approach_3"
    });

    expect(selectedState.selectedStageId).toBe("greenline_approach_3");
    expect(selectedState.selectedOfflineFarmStageId).toBe("greenline_approach_3");
  });

  it("allows cleared non-boss farm stages and rejects boss farming", () => {
    const state = createInitialWebGameState(staticData);
    const clearedProgress = {
      ...state.progress,
      currentStageId: "greenline_approach_10",
      maps: {
        ...state.progress.maps,
        greenline_approach: {
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
      stageId: "greenline_approach_3"
    });
    const bossFarmState = webGameStateReducer(staticData, farmStageState, {
      type: "select_offline_farm_stage",
      stageId: "greenline_approach_10"
    });
    const viewModel = getWebGameViewModel(staticData, bossFarmState);
    const bossOption = viewModel.stageOptions.find(
      (stage) => stage.id === "greenline_approach_10"
    );

    expect(farmStageState.selectedOfflineFarmStageId).toBe("greenline_approach_3");
    expect(bossFarmState.selectedOfflineFarmStageId).toBe("greenline_approach_8");
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
          greenline_approach: {
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
          greenline_approach: {
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
      reachedRanks: [
        {
          label: "Familiar",
          rank: "familiar",
          tone: "familiar"
        }
      ],
      nextThreshold: {
        experience: 500,
        rank: "trained",
        remainingExperience: 380
      }
    });
    expect(familiarMastery?.progressPercent).toBeCloseTo(0.24);
    expect(familiarMastery?.activeBonuses.map((bonus) => bonus.label)).toEqual([
      "+1% Kinetic and Cognitive attack"
    ]);
    expect(trainedMastery).toMatchObject({
      combatExperience: 600,
      reachedRanks: [
        {
          label: "Familiar",
          rank: "familiar",
          tone: "familiar"
        },
        {
          label: "Trained",
          rank: "trained",
          tone: "trained"
        }
      ],
      nextThreshold: {
        experience: 3000,
        rank: "mastered",
        remainingExperience: 2400
      }
    });
    expect(trainedMastery?.progressPercent).toBeCloseTo(0.2);
    expect(trainedMastery?.activeBonuses.map((bonus) => bonus.label)).toEqual([
      "+1% Kinetic and Cognitive attack",
      "+2% route rewards"
    ]);
  });

  it("builds readable battle playback rows for AI Overload events", () => {
    const state = createInitialWebGameState(staticData);
    const stageFiveProgress = {
      ...state.progress,
      currentStageId: "greenline_approach_5",
      maps: {
        ...state.progress.maps,
        greenline_approach: {
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
        stageId: "greenline_approach_5"
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
    expect(attackEvent?.detail).toContain("Kinetic damage");
    expect(attackEvent?.badges.map((badge) => badge.tone)).toEqual([
      "skill",
      "outer",
      "inner"
    ]);
    expect(
      attackEvent?.badges.some((badge) =>
        badge.label.includes("Body Integrity")
      )
    ).toBe(true);
    expect(qiBreakEvent?.headline).toContain("AI Overload");
    expect(qiBreakEvent?.detail).toContain("Context Stability");
    expect(qiBreakEvent?.badges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "AI Overload",
          tone: "danger"
        })
      ])
    );
    expect(viewModel.battleSummary?.details.join(" ")).toContain("AI Overloads");
  });

  it("normalizes selected offline farm stage to the best unlocked farm", () => {
    const state = createInitialWebGameState(staticData);
    const nextState = webGameStateReducer(staticData, state, {
      type: "replace_progress",
      progress: {
        ...state.progress,
        currentStageId: "greenline_approach_10",
        maps: {
          ...state.progress.maps,
          greenline_approach: {
            combatExperience: 88,
            highestClearedStageIndex: 9
          }
        }
      }
    });

    expect(nextState.selectedOfflineFarmStageId).toBe("greenline_approach_8");
  });

  it("switches offline farm recommendations by preset", () => {
    const state = createInitialWebGameState(staticData);
    const progressedState = webGameStateReducer(staticData, state, {
      type: "replace_progress",
      progress: {
        ...state.progress,
        currentStageId: "greenline_approach_10",
        maps: {
          ...state.progress.maps,
          greenline_approach: {
            combatExperience: 88,
            highestClearedStageIndex: 9
          }
        }
      }
    });
    const silverState = webGameStateReducer(staticData, progressedState, {
      type: "set_offline_farm_preset",
      preset: "silver"
    });
    const silverViewModel = getWebGameViewModel(staticData, silverState);
    const masteryState = webGameStateReducer(staticData, silverState, {
      type: "set_offline_farm_preset",
      preset: "mastery"
    });

    expect(progressedState.selectedOfflineFarmStageId).toBe("greenline_approach_8");
    expect(silverState.offlineFarmPreset).toBe("silver");
    expect(silverState.selectedOfflineFarmStageId).toBe("greenline_approach_9");
    expect(silverViewModel.offlineFarmPresets.find((preset) => preset.id === "silver")).toMatchObject({
      isSelected: true,
      rewardPriority: ["Credits", "Combat Data", "Resonance"]
    });
    expect(silverViewModel.offlineFarmRecommendation).toMatchObject({
      stageId: "greenline_approach_9",
      presetLabel: "Silver",
      isSelected: true
    });
    expect(silverViewModel.offlineRewardPreview).toMatchObject({
      ok: true,
      stageName: "Greenline Route 9",
      silver: 11232,
      cultivation: 5616,
      combatExperience: 2160
    });
    expect(masteryState.offlineFarmPreset).toBe("mastery");
    expect(masteryState.selectedOfflineFarmStageId).toBe("greenline_approach_8");
  });
});
