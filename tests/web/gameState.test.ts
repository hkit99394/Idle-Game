import { describe, expect, it } from "vitest";
import {
  createInitialWebGameState,
  equipGameEquipment,
  getWebGameViewModel,
  purchaseGameSkillUpgrade,
  purchaseGameUpgrade,
  resolveSelectedStageBattle,
  selectGameStyleBranch,
  setGameAssignmentHeroes,
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
    expect(state.offlineFarmPreset).toBe("balanced");
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
    expect(viewModel.skillUpgrades).toHaveLength(4);
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
      combatPower: 504
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

  it("uses selected cleared stages as the automatic offline target", () => {
    const state = createInitialWebGameState(staticData);
    const progressedState = webGameStateReducer(staticData, state, {
      type: "replace_progress",
      progress: {
        ...state.progress,
        currentStageId: "bamboo_road_4",
        maps: {
          ...state.progress.maps,
          bamboo_road: {
            combatExperience: 0,
            highestClearedStageIndex: 3
          }
        }
      }
    });
    const selectedState = webGameStateReducer(staticData, progressedState, {
      type: "select_stage",
      stageId: "bamboo_road_3"
    });

    expect(selectedState.selectedStageId).toBe("bamboo_road_3");
    expect(selectedState.selectedOfflineFarmStageId).toBe("bamboo_road_3");
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
      "+1% Outer and Inner attack"
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
    expect(attackEvent?.badges.map((badge) => badge.tone)).toEqual([
      "skill",
      "outer",
      "inner"
    ]);
    expect(attackEvent?.badges.some((badge) => badge.label.includes("Outer HP")))
      .toBe(true);
    expect(qiBreakEvent?.headline).toContain("Qi Break");
    expect(qiBreakEvent?.detail).toContain("Inner Qi");
    expect(qiBreakEvent?.badges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Qi Break",
          tone: "danger"
        })
      ])
    );
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

    expect(affordableUpgrade).toMatchObject({
      affordable: true,
      missingSilver: 0
    });

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
    expect(ironFist?.maxOuterHp).toBeCloseTo(187.2);
    expect(ironFist?.combatPower).toBeGreaterThan(523);
    expect(nextUpgrade).toMatchObject({
      level: 1,
      cost: 13,
      affordable: false,
      missingSilver: 5
    });
  });

  it("updates progress after skill refinement purchases", () => {
    const state = createInitialWebGameState(staticData);
    const progress = {
      ...state.progress,
      resources: {
        silver: 0,
        cultivation: 20
      }
    };
    const affordableViewModel = getWebGameViewModel(staticData, {
      ...state,
      progress
    });
    const skillUpgrade = affordableViewModel.skillUpgrades.find(
      (upgrade) => upgrade.skillUpgradeId === "iron_fist_combo_refinement"
    );

    expect(skillUpgrade).toMatchObject({
      affordable: true,
      cost: 8,
      level: 0,
      maxLevel: 5
    });

    const nextState = purchaseGameSkillUpgrade(
      staticData,
      {
        ...state,
        progress
      },
      {
        skillUpgradeId: "iron_fist_combo_refinement"
      }
    );

    expect(nextState.lastSkillPurchase?.ok).toBe(true);
    expect(nextState.progress.resources.cultivation).toBe(12);
    expect(nextState.progress.skillUpgrades?.iron_fist_combo_refinement).toBe(1);
  });

  it("shows equipment inventory and equips compatible gear", () => {
    const state = createInitialWebGameState(staticData);
    const lootState = webGameStateReducer(staticData, state, {
      type: "replace_progress",
      progress: {
        ...state.progress,
        equipment: {
          inventory: {
            training_wraps: 1
          },
          equipped: {}
        }
      }
    });
    const viewModel = getWebGameViewModel(staticData, lootState);

    expect(viewModel.equipmentInventory[0]).toMatchObject({
      equipmentId: "training_wraps",
      name: "Training Wraps",
      slot: "weapon",
      rarity: "common",
      count: 1,
      availableCount: 1,
      compatibleHeroIds: ["iron_fist_disciple"]
    });

    const beforeCp = viewModel.playerCombatants.find(
      (combatant) => combatant.definitionId === "iron_fist_disciple"
    )?.combatPower;
    const equippedState = equipGameEquipment(staticData, lootState, {
      heroId: "iron_fist_disciple",
      equipmentId: "training_wraps"
    });

    expect(equippedState.lastEquipmentAction?.ok).toBe(true);

    const equippedViewModel = getWebGameViewModel(staticData, equippedState);
    const afterCp = equippedViewModel.playerCombatants.find(
      (combatant) => combatant.definitionId === "iron_fist_disciple"
    )?.combatPower;

    expect(equippedViewModel.heroEquipment[0].slots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slot: "weapon",
          equipmentId: "training_wraps",
          name: "Training Wraps",
          rarity: "common"
        })
      ])
    );
    expect(equippedViewModel.equipmentInventory[0]).toMatchObject({
      availableCount: 0,
      compatibleHeroIds: ["iron_fist_disciple"]
    });
    expect(afterCp).toBeGreaterThan(beforeCp ?? 0);
  });

  it("shows equipment affixes and active set bonuses", () => {
    const state = createInitialWebGameState(staticData);
    const lootState = webGameStateReducer(staticData, state, {
      type: "replace_progress",
      progress: {
        ...state.progress,
        equipment: {
          inventory: {
            iron_thread_armor: 1,
            fortress_guard_manual: 1
          },
          equipped: {}
        }
      }
    });
    const inventoryViewModel = getWebGameViewModel(staticData, lootState);
    const armorView = inventoryViewModel.equipmentInventory.find(
      (item) => item.equipmentId === "iron_thread_armor"
    );

    expect(armorView).toMatchObject({
      setName: "Black Iron Ward",
      affixes: expect.arrayContaining([
        expect.stringContaining("Tempered Weave")
      ]),
      setBonuses: expect.arrayContaining([
        expect.stringContaining("Black Iron Ward 2-piece")
      ])
    });

    const armorState = equipGameEquipment(staticData, lootState, {
      heroId: "iron_fist_disciple",
      equipmentId: "iron_thread_armor"
    });
    const manualState = equipGameEquipment(staticData, armorState, {
      heroId: "iron_fist_disciple",
      equipmentId: "fortress_guard_manual"
    });
    const equippedViewModel = getWebGameViewModel(staticData, manualState);
    const heroView = equippedViewModel.heroEquipment.find(
      (hero) => hero.heroId === "iron_fist_disciple"
    );

    expect(heroView?.activeSetBonuses).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Black Iron Ward 2-piece")
      ])
    );
  });

  it("shows and updates patrol assignments", () => {
    const state = createInitialWebGameState(staticData);
    const assignedState = setGameAssignmentHeroes(staticData, state, {
      assignmentId: "bamboo_road_patrol",
      heroIds: ["iron_fist_disciple"]
    });

    expect(assignedState.lastAssignmentAction?.ok).toBe(true);
    expect(
      assignedState.progress.assignments?.bamboo_road_patrol?.heroIds
    ).toEqual(["iron_fist_disciple"]);

    const viewModel = getWebGameViewModel(staticData, assignedState);
    const patrol = viewModel.assignments.find(
      (assignment) => assignment.assignmentId === "bamboo_road_patrol"
    );

    expect(patrol).toMatchObject({
      assignedHeroIds: ["iron_fist_disciple"]
    });
    expect(
      patrol?.heroOptions.find((hero) => hero.heroId === "iron_fist_disciple")
    ).toMatchObject({
      assignedHere: true
    });

    const rejectedState = setGameAssignmentHeroes(staticData, assignedState, {
      assignmentId: "mist_valley_meditation",
      heroIds: ["iron_fist_disciple"]
    });

    expect(rejectedState.lastAssignmentAction).toMatchObject({
      ok: false,
      reason: "locked_assignment"
    });
    expect(rejectedState.progress.assignments?.bamboo_road_patrol?.heroIds).toEqual([
      "iron_fist_disciple"
    ]);
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

  it("switches offline farm recommendations by preset", () => {
    const state = createInitialWebGameState(staticData);
    const progressedState = webGameStateReducer(staticData, state, {
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
    const silverState = webGameStateReducer(staticData, progressedState, {
      type: "set_offline_farm_preset",
      preset: "silver"
    });
    const silverViewModel = getWebGameViewModel(staticData, silverState);
    const masteryState = webGameStateReducer(staticData, silverState, {
      type: "set_offline_farm_preset",
      preset: "mastery"
    });

    expect(progressedState.selectedOfflineFarmStageId).toBe("bamboo_road_8");
    expect(silverState.offlineFarmPreset).toBe("silver");
    expect(silverState.selectedOfflineFarmStageId).toBe("bamboo_road_9");
    expect(silverViewModel.offlineFarmPresets.find((preset) => preset.id === "silver")).toMatchObject({
      isSelected: true,
      rewardPriority: ["Silver", "Combat XP", "Cultivation"]
    });
    expect(silverViewModel.offlineFarmRecommendation).toMatchObject({
      stageId: "bamboo_road_9",
      presetLabel: "Silver",
      isSelected: true
    });
    expect(silverViewModel.offlineRewardPreview).toMatchObject({
      ok: true,
      stageName: "Bamboo Road 9",
      silver: 11232,
      cultivation: 5616,
      combatExperience: 2160
    });
    expect(masteryState.offlineFarmPreset).toBe("mastery");
    expect(masteryState.selectedOfflineFarmStageId).toBe("bamboo_road_8");
  });
});
