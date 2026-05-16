import { describe, expect, it } from "vitest";
import {
  createInitialWebGameState,
  equipGameEquipment,
  getWebGameViewModel,
  purchaseGameSkillUpgrade,
  purchaseGameUpgrade,
  resolveSelectedStageBattle,
  selectGameTactic,
  selectGameStyleBranch,
  setGameActiveHeroTeam,
  setGameAssignmentHeroes,
  webGameStateReducer
} from "../../web/state/gameState";
import { staticData } from "../helpers/staticData";

describe("web game state progression", () => {
  it("initializes new progress and selected stage state", () => {
    const state = createInitialWebGameState(staticData);
    const viewModel = getWebGameViewModel(staticData, state);

    expect(state.progress.currentRouteId).toBe("greenline_approach_1");
    expect(state.selectedStageId).toBe("greenline_approach_1");
    expect(state.selectedOfflineFarmRouteId).toBeNull();
    expect(state.offlineFarmPreset).toBe("balanced");
    expect(state.progress.selectedRoutineId).toBe("balanced_routine");
    expect(state.offlineSummary).toBeNull();
    expect(viewModel.selectedStage?.id).toBe("greenline_approach_1");
    expect(viewModel.selectedStageRegionName).toBe("Greenline Approach");
    expect(viewModel.offlineSummary).toBeNull();
    expect(viewModel.offlineFarmPreset).toBe("balanced");
    expect(viewModel.offlineFarmPresets).toHaveLength(5);
    expect(viewModel.offlineFarmPresets[0]).toMatchObject({
      id: "balanced",
      isSelected: true,
      rewardPriority: ["Combat Data", "Credits", "Resonance"]
    });
    expect(viewModel.tactics).toHaveLength(staticData.tactics.length);
    expect(viewModel.tactics[0]).toMatchObject({
      tacticId: "balanced_routine",
      name: "Balanced Routine",
      selected: true,
      modifierSummary: []
    });
    expect(
      viewModel.tactics.find((tactic) => tactic.tacticId === "kinetic_crush")
    ).toMatchObject({
      selected: false,
      behaviorTags: ["targeting", "damage"],
      modifierSummary: expect.arrayContaining([
        "Targets weakest hp",
        "+8% Kinetic damage"
      ])
    });
    expect(viewModel.offlineFarmRecommendation).toMatchObject({
      stageId: null,
      stageName: "No cleared farm route",
      presetLabel: "Balanced",
      rewardPriority: ["Combat Data", "Credits", "Resonance"]
    });
    expect(viewModel.offlineRewardPreview).toMatchObject({
      ok: false,
      reason: "Select a cleared farm route",
      stageName: "No farm route target",
      clears: 0,
      silver: 0,
      cultivation: 0,
      combatExperience: 0,
      masteryExperienceGain: 0
    });
    expect(viewModel.counterplaySettings).toMatchObject({
      unlocked: false,
      lockedReason: "Unlocks when the first countermeasure becomes available.",
      globalEnabled: true,
      globalLabel: "Auto On",
      resistanceMode: "boss_and_elite",
      resistanceModeLabel: "Boss And Elite"
    });
    expect(viewModel.counterplaySettings.medicineRows[0]).toMatchObject({
      id: "clear_heart_countermeasure",
      canToggle: false,
      autoUseLabel: "Auto On"
    });
    expect(viewModel.enemyTeamLabel).toBe("Greenline Cutter x2");
    expect(viewModel.battleEvents).toEqual([]);
    expect(viewModel.battleSummary).toBeNull();
    expect(viewModel.masteryPanel).toMatchObject({
      regionId: "greenline_approach",
      regionName: "Greenline Approach",
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
    expect(viewModel.stageOptions).toHaveLength(staticData.stages.length);
    expect(viewModel.stageOptions[0]).toMatchObject({
      id: "greenline_approach_1",
      regionName: "Greenline Approach",
      isUnlocked: true,
      isCleared: false,
      isSelectedStage: true,
      canSelectStage: true,
      canSelectOfflineFarm: false
    });
    expect(viewModel.stageOptions[1]).toMatchObject({
      id: "greenline_approach_2",
      isUnlocked: false,
      canSelectStage: false,
      canSelectOfflineFarm: false
    });
    expect(viewModel.stageOptions[10]).toMatchObject({
      id: "veil_district_1",
      regionName: "Veil District",
      isUnlocked: false,
      canSelectStage: false,
      canSelectOfflineFarm: false
    });
    expect(
      viewModel.stageOptions.find((stage) => stage.id === "black_iron_foundry_1")
    ).toMatchObject({
      regionName: "Black Iron Foundry",
      isUnlocked: false,
      canSelectStage: false,
      canSelectOfflineFarm: false
    });
    expect(viewModel.upgrades).toHaveLength(11);
    expect(
      viewModel.upgrades.find(
        (upgrade) =>
          upgrade.upgradeId === "hero_outer_training" &&
          upgrade.heroId === "iron_fist_initiate"
      )
    ).toMatchObject({
      level: 0,
      cost: 12,
      affordable: false,
      missingSilver: 12,
      art: "outer",
      effects: expect.arrayContaining([
        "+10% Kinetic Attack per level",
        "+4% Max Body Integrity per level",
        "+4% Kinetic Defense per level"
      ])
    });
    expect(
      viewModel.upgrades.find(
        (upgrade) => upgrade.upgradeId === "sect_outer_training"
      )
    ).toMatchObject({
      level: 0,
      cost: 48,
      affordable: false,
      missingSilver: 48,
      targetName: "Techno-sect"
    });
    expect(
      viewModel.upgrades.find(
        (upgrade) => upgrade.upgradeId === "lotus_purity_training"
      )
    ).toMatchObject({
      level: 0,
      cost: 72,
      targetName: "Techno-sect",
      effects: expect.arrayContaining([
        "+4% Status Resistance per level",
        "+2% Cognitive Defense per level"
      ])
    });
    expect(viewModel.skillUpgrades).toHaveLength(4);
    expect(viewModel.activeTeamSize).toBe(4);
    expect(viewModel.roster).toHaveLength(staticData.heroes.length);
    expect(viewModel.roster.find((hero) => hero.heroId === "iron_fist_initiate")).toMatchObject({
      active: true,
      unlocked: true,
      canDeactivate: true,
      combatRole: "striker"
    });
    expect(viewModel.roster.find((hero) => hero.heroId === "lotus_stabilizer")).toMatchObject({
      active: false,
      unlocked: false,
      canActivate: false,
      lockReason: "Clear Jade Needle Clinic"
    });
    expect(viewModel.assignments[0]).toMatchObject({
      assignmentId: "greenline_sweep",
      unlocked: true,
      assignedHeroIds: [],
      rewardSummary: expect.arrayContaining([
        "24 Credits/hour",
        "4 Combat Data/hour"
      ])
    });
    expect(viewModel.assignments[1]).toMatchObject({
      assignmentId: "veil_district_calibration",
      unlocked: false,
      lockReason: "Clear Ironwall Guard"
    });
    expect(viewModel.equipmentInventory).toEqual([]);
    expect(viewModel.heroEquipment).toHaveLength(4);
    expect(viewModel.heroEquipment[0]).toMatchObject({
      heroId: "iron_fist_initiate",
      activeSetBonuses: [],
      slots: expect.arrayContaining([
        expect.objectContaining({
          slot: "weapon",
          label: "Weapon",
          equipmentId: null,
          name: null,
          rarity: null,
          setName: null
        })
      ])
    });
    expect(viewModel.styleMastery).toHaveLength(7);
    expect(viewModel.styleMastery[0]).toMatchObject({
      styleId: "impact",
      name: "Impact Style",
      level: 0,
      experience: 0,
      branches: [
        {
          id: "iron_body_impact",
          isUnlocked: false,
          isSelected: false,
          canSelect: false,
          hiddenInMvp: false,
          requirement: "Iron Fist Initiate level 3",
          effects: ["+6% Max Body Integrity", "+5% Kinetic Defense"]
        }
      ]
    });
    expect(viewModel.playerCombatants).toHaveLength(4);
    expect(viewModel.playerFormation.map((hero) => hero.formationSlot)).toEqual([
      "front",
      "middle",
      "back",
      "front"
    ]);
    expect(viewModel.playerCombatants[0]).toMatchObject({
      name: "Iron Fist Initiate",
      outerHp: 180,
      innerQi: 90,
      maxOuterHp: 180,
      maxInnerQi: 90,
      formationSlot: "front",
      combatRole: "striker",
      level: 1,
      combatPower: 516
    });
    expect(viewModel.enemyCombatants).toHaveLength(2);
    expect(viewModel.enemyCombatants[0]).toMatchObject({
      name: "Greenline Cutter",
      outerHp: 120,
      innerQi: 60,
      maxOuterHp: 120,
      maxInnerQi: 60,
      formationSlot: "front",
      combatRole: "striker",
      level: 1,
      combatPower: 259
    });
    expect(viewModel.enemyCombatants[1]).toMatchObject({
      name: "Greenline Cutter",
      outerHp: 120,
      maxOuterHp: 120,
      formationSlot: "middle",
      level: 1,
      combatPower: 259
    });
  });

  it("selects unlocked style branches and applies them to hero previews", () => {
    const state = createInitialWebGameState(staticData);
    const lockedState = selectGameStyleBranch(staticData, state, {
      styleId: "impact",
      branchId: "iron_body_impact"
    });

    expect(lockedState.lastStyleBranchAction).toMatchObject({
      ok: false,
      reason: "locked_branch"
    });
    expect(lockedState.progress.styleBranches?.impact).toBeUndefined();

    const leveledState = webGameStateReducer(
      staticData,
      state,
      {
        type: "replace_progress",
        progress: {
          ...state.progress,
          heroes: {
            ...state.progress.heroes,
            iron_fist_initiate: {
              ...state.progress.heroes.iron_fist_initiate,
              level: 3
            }
          }
        }
      }
    );
    const selectedState = selectGameStyleBranch(staticData, leveledState, {
      styleId: "impact",
      branchId: "iron_body_impact"
    });
    const viewModel = getWebGameViewModel(staticData, selectedState);
    const fistBranch = viewModel.styleMastery
      .find((style) => style.styleId === "impact")
      ?.branches.find((branch) => branch.id === "iron_body_impact");

    expect(selectedState.lastStyleBranchAction).toMatchObject({
      ok: true,
      styleId: "impact",
      branchId: "iron_body_impact"
    });
    expect(selectedState.progress.styleBranches?.impact).toBe("iron_body_impact");
    expect(fistBranch).toMatchObject({
      isUnlocked: true,
      isSelected: true,
      canSelect: false
    });
    expect(viewModel.playerCombatants[0]).toMatchObject({
      definitionId: "iron_fist_initiate",
      level: 3
    });
    expect(viewModel.playerCombatants[0].maxOuterHp).toBeCloseTo(
      180 * 1.06 ** 2 * 1.06
    );
  });

  it("updates and applies player formation from web state", () => {
    const state = createInitialWebGameState(staticData);
    const nextState = webGameStateReducer(staticData, state, {
      type: "set_hero_formation_slot",
      heroId: "white_crane_edge_runner",
      slot: "front"
    });
    const viewModel = getWebGameViewModel(staticData, nextState);

    expect(nextState.progress.formation?.white_crane_edge_runner).toBe("front");
    expect(
      viewModel.playerFormation.find(
        (hero) => hero.heroId === "white_crane_edge_runner"
      )?.formationSlot
    ).toBe("front");
    expect(
      viewModel.playerCombatants.find(
        (combatant) => combatant.definitionId === "white_crane_edge_runner"
      )?.formationSlot
    ).toBe("front");
  });

  it("selects tactics and applies them to stage battles", () => {
    const state = createInitialWebGameState(staticData);
    const selectedState = selectGameTactic(staticData, state, {
      tacticId: "kinetic_crush"
    });
    const invalidState = selectGameTactic(staticData, selectedState, {
      tacticId: "missing_tactic"
    });
    const battleState = resolveSelectedStageBattle(staticData, selectedState);
    const viewModel = getWebGameViewModel(staticData, battleState);

    expect(selectedState.lastTacticAction).toMatchObject({
      ok: true,
      tacticId: "kinetic_crush"
    });
    expect(selectedState.progress.selectedRoutineId).toBe("kinetic_crush");
    expect(
      getWebGameViewModel(staticData, selectedState).tactics.find(
        (tactic) => tactic.tacticId === "kinetic_crush"
      )
    ).toMatchObject({
      selected: true
    });
    expect(invalidState.progress.selectedRoutineId).toBe("kinetic_crush");
    expect(invalidState.lastTacticAction).toMatchObject({
      ok: false,
      reason: "missing_tactic"
    });
    expect(battleState.lastBattle?.ok).toBe(true);
    if (!battleState.lastBattle?.ok) {
      return;
    }
    expect(battleState.lastBattle.battle.playerTactic.id).toBe("kinetic_crush");
    expect(viewModel.battleSummary?.details[0]).toBe("Tactic: Kinetic Crush.");
  });

  it("selects an unlocked Lotus support hero for the active team", () => {
    const state = createInitialWebGameState(staticData);
    const progressedState = webGameStateReducer(staticData, state, {
      type: "replace_progress",
      progress: {
        ...state.progress,
        districts: {
          ...state.progress.districts,
          greenline_approach: {
            combatData: 0,
            highestClearedRouteIndex: 10
          },
          veil_district: {
            combatData: 0,
            highestClearedRouteIndex: 10
          },
          black_iron_foundry: {
            combatData: 0,
            highestClearedRouteIndex: 10
          },
          lotus_clinic: {
            combatData: 0,
            highestClearedRouteIndex: 3
          }
        }
      }
    });
    const selectedState = setGameActiveHeroTeam(staticData, progressedState, {
      heroIds: [
        "iron_fist_initiate",
        "azure_pulse_monk",
        "white_crane_edge_runner",
        "lotus_stabilizer"
      ]
    });
    const viewModel = getWebGameViewModel(staticData, selectedState);

    expect(selectedState.lastActiveTeamAction?.ok).toBe(true);
    expect(selectedState.progress.activeHeroIds).toEqual([
      "iron_fist_initiate",
      "azure_pulse_monk",
      "white_crane_edge_runner",
      "lotus_stabilizer"
    ]);
    expect(
      viewModel.roster.find((hero) => hero.heroId === "lotus_stabilizer")
    ).toMatchObject({
      active: true,
      unlocked: true,
      combatRole: "support"
    });
    expect(
      viewModel.playerCombatants.map((combatant) => combatant.definitionId)
    ).toContain("lotus_stabilizer");
  });

  it("updates progress while staying on the selected stage after battle", () => {
    const state = createInitialWebGameState(staticData);
    const nextState = resolveSelectedStageBattle(staticData, state);

    expect(nextState.lastBattle?.ok).toBe(true);
    expect(nextState.progress.resources.credits).toBe(10);
    expect(nextState.progress.districts.greenline_approach.highestClearedRouteIndex).toBe(1);
    expect(nextState.progress.currentRouteId).toBe("greenline_approach_2");
    expect(nextState.selectedStageId).toBe("greenline_approach_1");
    expect(nextState.selectedOfflineFarmRouteId).toBe("greenline_approach_1");
    expect(nextState.lastBattleStageId).toBe("greenline_approach_1");

    const viewModel = getWebGameViewModel(staticData, nextState);

    expect(viewModel.lastBattleStage?.id).toBe("greenline_approach_1");
    expect(viewModel.selectedStage?.id).toBe("greenline_approach_1");
    expect(viewModel.enemyTeamLabel).toBe("Greenline Cutter x2");
    expect(viewModel.enemyCombatants[0]).toMatchObject({
      name: "Greenline Cutter",
      outerHp: 0,
      maxOuterHp: 120,
      isDefeated: true
    });
    expect(viewModel.battleSummary?.title).toContain("Victory at Greenline Route 1");
    expect(viewModel.offlineFarmRecommendation).toMatchObject({
      stageId: "greenline_approach_1",
      isSelected: true
    });
    expect(viewModel.offlineRewardPreview).toMatchObject({
      ok: true,
      stageName: "Greenline Route 1",
      previewSeconds: 3600,
      clears: 360,
      silver: 2160,
      cultivation: 1080,
      combatExperience: 1080,
      masteryExperienceGain: 1080
    });
    expect(viewModel.battleEvents.some((event) => event.category === "attack"))
      .toBe(true);
    expect(viewModel.battleEvents.some((event) => event.category === "defeat"))
      .toBe(true);
    expect(viewModel.battleEvents[0].detail).toContain("Kinetic damage");

    const clearedStage = viewModel.stageOptions.find(
      (stage) => stage.id === "greenline_approach_1"
    );
    const nextStage = viewModel.stageOptions.find(
      (stage) => stage.id === "greenline_approach_2"
    );

    expect(clearedStage).toMatchObject({
      isCleared: true,
      isSelectedOfflineFarmStage: true,
      canSelectOfflineFarm: true
    });
    expect(nextStage).toMatchObject({
      isUnlocked: true,
      isSelectedStage: false,
      canSelectStage: true
    });
  });

  it("shows newly earned combat levels after battle rewards", () => {
    const state = createInitialWebGameState(staticData);
    const readyToLevelState = {
      ...state,
      progress: {
        ...state.progress,
        districts: {
          ...state.progress.districts,
          greenline_approach: {
            combatData: 95,
            highestClearedRouteIndex: 0
          }
        }
      }
    };
    const nextState = resolveSelectedStageBattle(staticData, readyToLevelState);
    const viewModel = getWebGameViewModel(staticData, nextState);

    expect(nextState.progress.heroes.iron_fist_initiate.level).toBe(2);
    expect(viewModel.playerCombatants[0].level).toBe(2);
  });

  it("prevents selecting locked stages in web state", () => {
    const state = createInitialWebGameState(staticData);
    const nextState = webGameStateReducer(staticData, state, {
      type: "select_stage",
      stageId: "greenline_approach_5"
    });
    const missingStageState = webGameStateReducer(staticData, state, {
      type: "select_stage",
      stageId: "missing_stage"
    });

    expect(nextState.selectedStageId).toBe("greenline_approach_1");
    expect(missingStageState.selectedStageId).toBe("greenline_approach_1");
  });

  it("shows unlocked Veil District stages and selected-region mastery", () => {
    const state = createInitialWebGameState(staticData);
    const progressedState = webGameStateReducer(staticData, state, {
      type: "replace_progress",
      progress: {
        ...state.progress,
        currentRouteId: "veil_district_1",
        districts: {
          ...state.progress.districts,
          greenline_approach: {
            combatData: 188,
            highestClearedRouteIndex: 10
          },
          veil_district: {
            combatData: 52,
            highestClearedRouteIndex: 2
          }
        }
      }
    });
    const selectedState = webGameStateReducer(staticData, progressedState, {
      type: "select_stage",
      stageId: "veil_district_2"
    });
    const viewModel = getWebGameViewModel(staticData, selectedState);

    expect(selectedState.selectedStageId).toBe("veil_district_2");
    expect(viewModel.selectedStageRegionName).toBe("Veil District");
    expect(viewModel.masteryPanel).toMatchObject({
      regionId: "veil_district",
      regionName: "Veil District",
      combatExperience: 52
    });
    expect(
      viewModel.stageOptions.find((stage) => stage.id === "veil_district_3")
    ).toMatchObject({
      isUnlocked: true,
      canSelectStage: true
    });
  });
});
