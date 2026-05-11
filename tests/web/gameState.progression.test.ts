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

    expect(state.progress.currentStageId).toBe("bamboo_road_1");
    expect(state.selectedStageId).toBe("bamboo_road_1");
    expect(state.selectedOfflineFarmStageId).toBeNull();
    expect(state.offlineFarmPreset).toBe("balanced");
    expect(state.progress.selectedTacticId).toBe("balanced");
    expect(state.offlineSummary).toBeNull();
    expect(viewModel.selectedStage?.id).toBe("bamboo_road_1");
    expect(viewModel.selectedStageRegionName).toBe("Bamboo Road");
    expect(viewModel.offlineSummary).toBeNull();
    expect(viewModel.offlineFarmPreset).toBe("balanced");
    expect(viewModel.offlineFarmPresets).toHaveLength(5);
    expect(viewModel.offlineFarmPresets[0]).toMatchObject({
      id: "balanced",
      isSelected: true,
      rewardPriority: ["Combat XP", "Silver", "Cultivation"]
    });
    expect(viewModel.tactics).toHaveLength(staticData.tactics.length);
    expect(viewModel.tactics[0]).toMatchObject({
      tacticId: "balanced",
      name: "Balanced Form",
      selected: true,
      modifierSummary: []
    });
    expect(
      viewModel.tactics.find((tactic) => tactic.tacticId === "outer_pressure")
    ).toMatchObject({
      selected: false,
      behaviorTags: ["targeting", "damage"],
      modifierSummary: expect.arrayContaining([
        "Targets weakest hp",
        "+8% Outer damage"
      ])
    });
    expect(viewModel.offlineFarmRecommendation).toMatchObject({
      stageId: null,
      stageName: "No cleared farm stage",
      presetLabel: "Balanced",
      rewardPriority: ["Combat XP", "Silver", "Cultivation"]
    });
    expect(viewModel.offlineRewardPreview).toMatchObject({
      ok: false,
      reason: "Select a cleared farm stage",
      stageName: "No farm target",
      clears: 0,
      silver: 0,
      cultivation: 0,
      combatExperience: 0,
      masteryExperienceGain: 0
    });
    expect(viewModel.counterplaySettings).toMatchObject({
      unlocked: false,
      lockedReason: "Unlocks when the first medicine becomes available.",
      globalEnabled: true,
      globalLabel: "Auto On",
      resistanceMode: "boss_and_elite",
      resistanceModeLabel: "Boss And Elite"
    });
    expect(viewModel.counterplaySettings.medicineRows[0]).toMatchObject({
      id: "clear_heart_pill",
      canToggle: false,
      autoUseLabel: "Auto On"
    });
    expect(viewModel.enemyTeamLabel).toBe("Bamboo Road Bandit x2");
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
    expect(viewModel.stageOptions).toHaveLength(staticData.stages.length);
    expect(viewModel.stageOptions[0]).toMatchObject({
      id: "bamboo_road_1",
      regionName: "Bamboo Road",
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
    expect(viewModel.stageOptions[10]).toMatchObject({
      id: "mist_valley_1",
      regionName: "Mist Valley",
      isUnlocked: false,
      canSelectStage: false,
      canSelectOfflineFarm: false
    });
    expect(
      viewModel.stageOptions.find((stage) => stage.id === "black_iron_fort_1")
    ).toMatchObject({
      regionName: "Black Iron Fort",
      isUnlocked: false,
      canSelectStage: false,
      canSelectOfflineFarm: false
    });
    expect(viewModel.upgrades).toHaveLength(11);
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
      missingSilver: 12,
      art: "outer",
      effects: expect.arrayContaining([
        "+10% Outer Attack per level",
        "+4% Max Outer Hp per level",
        "+4% Outer Defense per level"
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
      targetName: "Sect"
    });
    expect(
      viewModel.upgrades.find(
        (upgrade) => upgrade.upgradeId === "lotus_purity_training"
      )
    ).toMatchObject({
      level: 0,
      cost: 72,
      targetName: "Sect",
      effects: expect.arrayContaining([
        "+4% Status Resistance per level",
        "+2% Inner Defense per level"
      ])
    });
    expect(viewModel.skillUpgrades).toHaveLength(4);
    expect(viewModel.activeTeamSize).toBe(4);
    expect(viewModel.roster).toHaveLength(staticData.heroes.length);
    expect(viewModel.roster.find((hero) => hero.heroId === "iron_fist_disciple")).toMatchObject({
      active: true,
      unlocked: true,
      canDeactivate: true,
      combatRole: "striker"
    });
    expect(viewModel.roster.find((hero) => hero.heroId === "lotus_mending_disciple")).toMatchObject({
      active: false,
      unlocked: false,
      canActivate: false,
      lockReason: "Clear Jade Needle Cloister"
    });
    expect(viewModel.assignments[0]).toMatchObject({
      assignmentId: "bamboo_road_patrol",
      unlocked: true,
      assignedHeroIds: [],
      rewardSummary: expect.arrayContaining([
        "24 silver/hour",
        "4 Combat XP/hour"
      ])
    });
    expect(viewModel.assignments[1]).toMatchObject({
      assignmentId: "mist_valley_meditation",
      unlocked: false,
      lockReason: "Clear Black Iron Guard"
    });
    expect(viewModel.equipmentInventory).toEqual([]);
    expect(viewModel.heroEquipment).toHaveLength(4);
    expect(viewModel.heroEquipment[0]).toMatchObject({
      heroId: "iron_fist_disciple",
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
      styleId: "fist",
      name: "Fist",
      level: 0,
      experience: 0,
      branches: [
        {
          id: "iron_body_fist",
          isUnlocked: false,
          isSelected: false,
          canSelect: false,
          hiddenInMvp: false,
          requirement: "Iron Fist Disciple level 3",
          effects: ["+6% Max Outer Hp", "+5% Outer Defense"]
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
      name: "Iron Fist Disciple",
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
      name: "Bamboo Road Bandit",
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
      name: "Bamboo Road Bandit",
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
      styleId: "fist",
      branchId: "iron_body_fist"
    });

    expect(lockedState.lastStyleBranchAction).toMatchObject({
      ok: false,
      reason: "locked_branch"
    });
    expect(lockedState.progress.styleBranches?.fist).toBeUndefined();

    const leveledState = webGameStateReducer(
      staticData,
      state,
      {
        type: "replace_progress",
        progress: {
          ...state.progress,
          heroes: {
            ...state.progress.heroes,
            iron_fist_disciple: {
              ...state.progress.heroes.iron_fist_disciple,
              level: 3
            }
          }
        }
      }
    );
    const selectedState = selectGameStyleBranch(staticData, leveledState, {
      styleId: "fist",
      branchId: "iron_body_fist"
    });
    const viewModel = getWebGameViewModel(staticData, selectedState);
    const fistBranch = viewModel.styleMastery
      .find((style) => style.styleId === "fist")
      ?.branches.find((branch) => branch.id === "iron_body_fist");

    expect(selectedState.lastStyleBranchAction).toMatchObject({
      ok: true,
      styleId: "fist",
      branchId: "iron_body_fist"
    });
    expect(selectedState.progress.styleBranches?.fist).toBe("iron_body_fist");
    expect(fistBranch).toMatchObject({
      isUnlocked: true,
      isSelected: true,
      canSelect: false
    });
    expect(viewModel.playerCombatants[0]).toMatchObject({
      definitionId: "iron_fist_disciple",
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
      heroId: "white_crane_swordsman",
      slot: "front"
    });
    const viewModel = getWebGameViewModel(staticData, nextState);

    expect(nextState.progress.formation?.white_crane_swordsman).toBe("front");
    expect(
      viewModel.playerFormation.find(
        (hero) => hero.heroId === "white_crane_swordsman"
      )?.formationSlot
    ).toBe("front");
    expect(
      viewModel.playerCombatants.find(
        (combatant) => combatant.definitionId === "white_crane_swordsman"
      )?.formationSlot
    ).toBe("front");
  });

  it("selects tactics and applies them to stage battles", () => {
    const state = createInitialWebGameState(staticData);
    const selectedState = selectGameTactic(staticData, state, {
      tacticId: "outer_pressure"
    });
    const invalidState = selectGameTactic(staticData, selectedState, {
      tacticId: "missing_tactic"
    });
    const battleState = resolveSelectedStageBattle(staticData, selectedState);
    const viewModel = getWebGameViewModel(staticData, battleState);

    expect(selectedState.lastTacticAction).toMatchObject({
      ok: true,
      tacticId: "outer_pressure"
    });
    expect(selectedState.progress.selectedTacticId).toBe("outer_pressure");
    expect(
      getWebGameViewModel(staticData, selectedState).tactics.find(
        (tactic) => tactic.tacticId === "outer_pressure"
      )
    ).toMatchObject({
      selected: true
    });
    expect(invalidState.progress.selectedTacticId).toBe("outer_pressure");
    expect(invalidState.lastTacticAction).toMatchObject({
      ok: false,
      reason: "missing_tactic"
    });
    expect(battleState.lastBattle?.ok).toBe(true);
    if (!battleState.lastBattle?.ok) {
      return;
    }
    expect(battleState.lastBattle.battle.playerTactic.id).toBe("outer_pressure");
    expect(viewModel.battleSummary?.details[0]).toBe("Tactic: Crushing Blows.");
  });

  it("selects an unlocked Lotus support hero for the active team", () => {
    const state = createInitialWebGameState(staticData);
    const progressedState = webGameStateReducer(staticData, state, {
      type: "replace_progress",
      progress: {
        ...state.progress,
        maps: {
          ...state.progress.maps,
          bamboo_road: {
            combatExperience: 0,
            highestClearedStageIndex: 10
          },
          mist_valley: {
            combatExperience: 0,
            highestClearedStageIndex: 10
          },
          black_iron_fort: {
            combatExperience: 0,
            highestClearedStageIndex: 10
          },
          lotus_monastery: {
            combatExperience: 0,
            highestClearedStageIndex: 3
          }
        }
      }
    });
    const selectedState = setGameActiveHeroTeam(staticData, progressedState, {
      heroIds: [
        "iron_fist_disciple",
        "azure_palm_monk",
        "white_crane_swordsman",
        "lotus_mending_disciple"
      ]
    });
    const viewModel = getWebGameViewModel(staticData, selectedState);

    expect(selectedState.lastActiveTeamAction?.ok).toBe(true);
    expect(selectedState.progress.activeHeroIds).toEqual([
      "iron_fist_disciple",
      "azure_palm_monk",
      "white_crane_swordsman",
      "lotus_mending_disciple"
    ]);
    expect(
      viewModel.roster.find((hero) => hero.heroId === "lotus_mending_disciple")
    ).toMatchObject({
      active: true,
      unlocked: true,
      combatRole: "support"
    });
    expect(
      viewModel.playerCombatants.map((combatant) => combatant.definitionId)
    ).toContain("lotus_mending_disciple");
  });

  it("updates progress while staying on the selected stage after battle", () => {
    const state = createInitialWebGameState(staticData);
    const nextState = resolveSelectedStageBattle(staticData, state);

    expect(nextState.lastBattle?.ok).toBe(true);
    expect(nextState.progress.resources.silver).toBe(10);
    expect(nextState.progress.maps.bamboo_road.highestClearedStageIndex).toBe(1);
    expect(nextState.progress.currentStageId).toBe("bamboo_road_2");
    expect(nextState.selectedStageId).toBe("bamboo_road_1");
    expect(nextState.selectedOfflineFarmStageId).toBe("bamboo_road_1");
    expect(nextState.lastBattleStageId).toBe("bamboo_road_1");

    const viewModel = getWebGameViewModel(staticData, nextState);

    expect(viewModel.lastBattleStage?.id).toBe("bamboo_road_1");
    expect(viewModel.selectedStage?.id).toBe("bamboo_road_1");
    expect(viewModel.enemyTeamLabel).toBe("Bamboo Road Bandit x2");
    expect(viewModel.enemyCombatants[0]).toMatchObject({
      name: "Bamboo Road Bandit",
      outerHp: 0,
      maxOuterHp: 120,
      isDefeated: true
    });
    expect(viewModel.battleSummary?.title).toContain("Victory at Bamboo Road 1");
    expect(viewModel.offlineFarmRecommendation).toMatchObject({
      stageId: "bamboo_road_1",
      isSelected: true
    });
    expect(viewModel.offlineRewardPreview).toMatchObject({
      ok: true,
      stageName: "Bamboo Road 1",
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
        maps: {
          ...state.progress.maps,
          bamboo_road: {
            combatExperience: 95,
            highestClearedStageIndex: 0
          }
        }
      }
    };
    const nextState = resolveSelectedStageBattle(staticData, readyToLevelState);
    const viewModel = getWebGameViewModel(staticData, nextState);

    expect(nextState.progress.heroes.iron_fist_disciple.level).toBe(2);
    expect(viewModel.playerCombatants[0].level).toBe(2);
  });

  it("prevents selecting locked stages in web state", () => {
    const state = createInitialWebGameState(staticData);
    const nextState = webGameStateReducer(staticData, state, {
      type: "select_stage",
      stageId: "bamboo_road_5"
    });
    const missingStageState = webGameStateReducer(staticData, state, {
      type: "select_stage",
      stageId: "missing_stage"
    });

    expect(nextState.selectedStageId).toBe("bamboo_road_1");
    expect(missingStageState.selectedStageId).toBe("bamboo_road_1");
  });

  it("shows unlocked Mist Valley stages and selected-region mastery", () => {
    const state = createInitialWebGameState(staticData);
    const progressedState = webGameStateReducer(staticData, state, {
      type: "replace_progress",
      progress: {
        ...state.progress,
        currentStageId: "mist_valley_1",
        maps: {
          ...state.progress.maps,
          bamboo_road: {
            combatExperience: 188,
            highestClearedStageIndex: 10
          },
          mist_valley: {
            combatExperience: 52,
            highestClearedStageIndex: 2
          }
        }
      }
    });
    const selectedState = webGameStateReducer(staticData, progressedState, {
      type: "select_stage",
      stageId: "mist_valley_2"
    });
    const viewModel = getWebGameViewModel(staticData, selectedState);

    expect(selectedState.selectedStageId).toBe("mist_valley_2");
    expect(viewModel.selectedStageRegionName).toBe("Mist Valley");
    expect(viewModel.masteryPanel).toMatchObject({
      regionId: "mist_valley",
      regionName: "Mist Valley",
      combatExperience: 52
    });
    expect(
      viewModel.stageOptions.find((stage) => stage.id === "mist_valley_3")
    ).toMatchObject({
      isUnlocked: true,
      canSelectStage: true
    });
  });
});
