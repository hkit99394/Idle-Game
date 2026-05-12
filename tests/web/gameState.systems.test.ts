import { describe, expect, it } from "vitest";
import { defaultAutoMedicinePreferences } from "../../core";
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
import {
  autoMedicinePoisonScenarioIds,
  createAutoMedicinePoisonProgress,
  createAutoMedicinePoisonScenarioData
} from "../helpers/statusScenarios";
import { staticData } from "../helpers/staticData";

describe("web game state systems", () => {
  it("updates progress after upgrade purchases", () => {
    const state = createInitialWebGameState(staticData);
    const progress = {
      ...state.progress,
      resources: {
        silver: 20,
        cultivation: 0,
        herbs: 0
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
        cultivation: 20,
        herbs: 0
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

  it("updates counterplay automation settings in web state", () => {
    const state = createInitialWebGameState(staticData);
    const unlockedState = webGameStateReducer(staticData, state, {
      type: "replace_progress",
      progress: {
        ...state.progress,
        currentStageId: "mist_valley_1",
        maps: {
          ...state.progress.maps,
          bamboo_road: {
            combatExperience: 300,
            highestClearedStageIndex: 10
          }
        }
      }
    });
    const disabledGlobalState = webGameStateReducer(staticData, unlockedState, {
      type: "set_auto_medicine_enabled",
      enabled: false
    });
    const disabledMedicineState = webGameStateReducer(
      staticData,
      unlockedState,
      {
        type: "set_medicine_auto_use",
        medicineId: "clear_heart_pill",
        enabled: false
      }
    );
    const modeState = webGameStateReducer(staticData, disabledMedicineState, {
      type: "set_pre_battle_resistance_mode",
      mode: "status_heavy"
    });
    const viewModel = getWebGameViewModel(staticData, modeState);

    expect(
      getWebGameViewModel(staticData, unlockedState).counterplaySettings
    ).toMatchObject({
      unlocked: true,
      lockedReason: null
    });
    expect(disabledGlobalState.autoMedicinePreferences.enabled).toBe(false);
    expect(
      disabledMedicineState.autoMedicinePreferences.disabledMedicineIds
    ).toEqual(["clear_heart_pill"]);
    expect(modeState.autoMedicinePreferences.preBattleResistanceMode).toBe(
      "status_heavy"
    );
    expect(viewModel.counterplaySettings).toMatchObject({
      unlocked: true,
      resistanceMode: "status_heavy",
      resistanceModeLabel: "Status Heavy"
    });
    expect(
      viewModel.counterplaySettings.medicineRows.find(
        (medicine) => medicine.id === "clear_heart_pill"
      )
    ).toMatchObject({
      disabled: true,
      autoUseEnabled: false,
      autoUseLabel: "Auto Off",
      canToggle: true
    });
  });

  it("applies auto-medicine preferences through the selected battle command path", () => {
    const data = createAutoMedicinePoisonScenarioData();
    const ids = autoMedicinePoisonScenarioIds;
    const state = createInitialWebGameState(data);
    const readyState = webGameStateReducer(data, state, {
      type: "replace_progress",
      progress: createAutoMedicinePoisonProgress(data)
    });
    const selectedState = webGameStateReducer(data, readyState, {
      type: "select_stage",
      stageId: ids.stageId
    });
    const enabledState = resolveSelectedStageBattle(data, selectedState);
    const disabledPreferenceState = webGameStateReducer(data, selectedState, {
      type: "set_medicine_auto_use",
      medicineId: "clear_heart_pill",
      enabled: false
    });
    const disabledState = resolveSelectedStageBattle(
      data,
      disabledPreferenceState
    );

    expect(selectedState.autoMedicinePreferences).toEqual(
      defaultAutoMedicinePreferences
    );
    expect(enabledState.lastBattle?.ok).toBe(true);
    expect(disabledState.lastBattle?.ok).toBe(true);
    if (!enabledState.lastBattle?.ok || !disabledState.lastBattle?.ok) {
      return;
    }

    expect(
      enabledState.lastBattle.battle.events.some(
        (event) => event.type === "auto_medicine"
      )
    ).toBe(true);
    expect(
      disabledState.lastBattle.battle.events.some(
        (event) => event.type === "auto_medicine"
      )
    ).toBe(false);
    expect(
      disabledState.lastBattle.battle.events.some(
        (event) => event.type === "status_tick"
      )
    ).toBe(true);
    expect(
      enabledState.progress.medicineInventory?.clear_heart_pill
    ).toBeUndefined();
    expect(disabledState.progress.medicineInventory?.clear_heart_pill).toBe(1);

    const enabledViewModel = getWebGameViewModel(data, enabledState);
    const autoMedicineEvent = enabledViewModel.battleEvents.find(
      (event) => event.category === "auto_medicine"
    );

    expect(autoMedicineEvent).toMatchObject({
      category: "auto_medicine",
      headline: "Scenario Patient (Front) uses Clear Heart Pill",
      detail: "Battle purge · removes Poison",
      badges: [
        {
          label: "Auto Countermeasure",
          tone: "neutral"
        },
        {
          label: "Poison",
          tone: "danger"
        }
      ]
    });
  });

  it("shows Lotus support contribution in the selected stage counterplay view", () => {
    const stageId = "web_status_counterplay";
    const data = {
      ...staticData,
      enemies: [
        ...staticData.enemies,
        {
          ...staticData.enemies[0],
          id: "web_status_counterplay_enemy",
          skillIds: ["web_poison_hex"]
        }
      ],
      skills: [
        ...staticData.skills,
        {
          id: "web_poison_hex",
          name: "Web Poison Hex",
          cooldownSeconds: 1,
          outerMultiplier: 0,
          innerMultiplier: 0,
          targetRule: "first_living" as const,
          effects: [
            {
              type: "apply_status" as const,
              statusId: "poison",
              chance: 1,
              durationSeconds: 8,
              stacks: 1
            }
          ]
        }
      ],
      stages: [
        ...staticData.stages,
        {
          id: stageId,
          regionId: "bamboo_road",
          index: 11,
          name: "Web Status Counterplay",
          enemyTeam: {
            combatantIds: ["web_status_counterplay_enemy"]
          },
          isBoss: false,
          canFarmOffline: false,
          rewards: {
            silver: 0,
            cultivation: 0,
            combatExperience: 0
          },
          nextStageId: null
        }
      ]
    };
    const state = createInitialWebGameState(data);
    const progressedState = webGameStateReducer(data, state, {
      type: "replace_progress",
      progress: {
        ...state.progress,
        currentStageId: stageId,
        sect: {
          upgrades: {
            lotus_purity_training: 2
          }
        },
        maps: {
          ...state.progress.maps,
          bamboo_road: {
            ...state.progress.maps.bamboo_road,
            highestClearedStageIndex: 10
          }
        }
      }
    });
    const selectedState = webGameStateReducer(data, progressedState, {
      type: "select_stage",
      stageId
    });
    const viewModel = getWebGameViewModel(data, selectedState);

    expect(viewModel.counterplaySettings.stagePreview).toMatchObject({
      stageId,
      supportResistanceBonus: 0.08,
      supportContributionText:
        "Lotus Purity Training Lv 2 adds 8% team status resistance before the cap."
    });
  });
});
