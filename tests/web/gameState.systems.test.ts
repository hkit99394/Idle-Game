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
  autoMedicineCorruptionScenarioIds,
  createAutoMedicineCorruptionProgress,
  createAutoMedicineCorruptionScenarioData
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
        upgrade.heroId === "iron_fist_initiate"
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
        heroId: "iron_fist_initiate"
      }
    );

    expect(nextState.lastPurchase?.ok).toBe(true);
    expect(nextState.progress.resources.silver).toBe(8);
    expect(
      nextState.progress.heroes.iron_fist_initiate.upgrades.hero_outer_training
    ).toBe(1);

    const viewModel = getWebGameViewModel(staticData, nextState);
    const ironFist = viewModel.playerCombatants.find(
      (combatant) => combatant.definitionId === "iron_fist_initiate"
    );
    const nextUpgrade = viewModel.upgrades.find(
      (upgrade) =>
        upgrade.upgradeId === "hero_outer_training" &&
        upgrade.heroId === "iron_fist_initiate"
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
      (upgrade) => upgrade.skillUpgradeId === "impact_combo_refinement"
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
        skillUpgradeId: "impact_combo_refinement"
      }
    );

    expect(nextState.lastSkillPurchase?.ok).toBe(true);
    expect(nextState.progress.resources.cultivation).toBe(12);
    expect(nextState.progress.skillUpgrades?.impact_combo_refinement).toBe(1);
  });

  it("shows equipment inventory and equips compatible gear", () => {
    const state = createInitialWebGameState(staticData);
    const lootState = webGameStateReducer(staticData, state, {
      type: "replace_progress",
      progress: {
        ...state.progress,
        equipment: {
          inventory: {
            impact_training_wraps: 1
          },
          equipped: {}
        }
      }
    });
    const viewModel = getWebGameViewModel(staticData, lootState);

    expect(viewModel.equipmentInventory[0]).toMatchObject({
      equipmentId: "impact_training_wraps",
      name: "Impact Training Wraps",
      slot: "weapon",
      rarity: "common",
      count: 1,
      availableCount: 1,
      compatibleHeroIds: ["iron_fist_initiate"]
    });

    const beforeCp = viewModel.playerCombatants.find(
      (combatant) => combatant.definitionId === "iron_fist_initiate"
    )?.combatPower;
    const equippedState = equipGameEquipment(staticData, lootState, {
      heroId: "iron_fist_initiate",
      equipmentId: "impact_training_wraps"
    });

    expect(equippedState.lastEquipmentAction?.ok).toBe(true);

    const equippedViewModel = getWebGameViewModel(staticData, equippedState);
    const afterCp = equippedViewModel.playerCombatants.find(
      (combatant) => combatant.definitionId === "iron_fist_initiate"
    )?.combatPower;

    expect(equippedViewModel.heroEquipment[0].slots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slot: "weapon",
          equipmentId: "impact_training_wraps",
          name: "Impact Training Wraps",
          rarity: "common"
        })
      ])
    );
    expect(equippedViewModel.equipmentInventory[0]).toMatchObject({
      availableCount: 0,
      compatibleHeroIds: ["iron_fist_initiate"]
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
            iron_thread_plating: 1,
            fortress_guard_protocol: 1
          },
          equipped: {}
        }
      }
    });
    const inventoryViewModel = getWebGameViewModel(staticData, lootState);
    const armorView = inventoryViewModel.equipmentInventory.find(
      (item) => item.equipmentId === "iron_thread_plating"
    );

    expect(armorView).toMatchObject({
      setName: "Ironwall Ward",
      affixes: expect.arrayContaining([
        expect.stringContaining("Tempered Weave")
      ]),
      setBonuses: expect.arrayContaining([
        expect.stringContaining("Ironwall Ward 2-piece")
      ])
    });

    const armorState = equipGameEquipment(staticData, lootState, {
      heroId: "iron_fist_initiate",
      equipmentId: "iron_thread_plating"
    });
    const manualState = equipGameEquipment(staticData, armorState, {
      heroId: "iron_fist_initiate",
      equipmentId: "fortress_guard_protocol"
    });
    const equippedViewModel = getWebGameViewModel(staticData, manualState);
    const heroView = equippedViewModel.heroEquipment.find(
      (hero) => hero.heroId === "iron_fist_initiate"
    );

    expect(heroView?.activeSetBonuses).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Ironwall Ward 2-piece")
      ])
    );
  });

  it("shows and updates patrol assignments", () => {
    const state = createInitialWebGameState(staticData);
    const assignedState = setGameAssignmentHeroes(staticData, state, {
      assignmentId: "greenline_sweep",
      heroIds: ["iron_fist_initiate"]
    });

    expect(assignedState.lastAssignmentAction?.ok).toBe(true);
    expect(
      assignedState.progress.assignments?.greenline_sweep?.heroIds
    ).toEqual(["iron_fist_initiate"]);

    const viewModel = getWebGameViewModel(staticData, assignedState);
    const patrol = viewModel.assignments.find(
      (assignment) => assignment.assignmentId === "greenline_sweep"
    );

    expect(patrol).toMatchObject({
      assignedHeroIds: ["iron_fist_initiate"]
    });
    expect(
      patrol?.heroOptions.find((hero) => hero.heroId === "iron_fist_initiate")
    ).toMatchObject({
      assignedHere: true
    });

    const rejectedState = setGameAssignmentHeroes(staticData, assignedState, {
      assignmentId: "veil_district_calibration",
      heroIds: ["iron_fist_initiate"]
    });

    expect(rejectedState.lastAssignmentAction).toMatchObject({
      ok: false,
      reason: "locked_assignment"
    });
    expect(rejectedState.progress.assignments?.greenline_sweep?.heroIds).toEqual([
      "iron_fist_initiate"
    ]);
  });

  it("updates counterplay automation settings in web state", () => {
    const state = createInitialWebGameState(staticData);
    const unlockedState = webGameStateReducer(staticData, state, {
      type: "replace_progress",
      progress: {
        ...state.progress,
        currentStageId: "veil_district_1",
        maps: {
          ...state.progress.maps,
          greenline_approach: {
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
        medicineId: "clear_heart_countermeasure",
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
    ).toEqual(["clear_heart_countermeasure"]);
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
        (medicine) => medicine.id === "clear_heart_countermeasure"
      )
    ).toMatchObject({
      disabled: true,
      autoUseEnabled: false,
      autoUseLabel: "Auto Off",
      canToggle: true
    });
  });

  it("applies auto-medicine preferences through the selected battle command path", () => {
    const data = createAutoMedicineCorruptionScenarioData();
    const ids = autoMedicineCorruptionScenarioIds;
    const state = createInitialWebGameState(data);
    const readyState = webGameStateReducer(data, state, {
      type: "replace_progress",
      progress: createAutoMedicineCorruptionProgress(data)
    });
    const selectedState = webGameStateReducer(data, readyState, {
      type: "select_stage",
      stageId: ids.stageId
    });
    const enabledState = resolveSelectedStageBattle(data, selectedState);
    const disabledPreferenceState = webGameStateReducer(data, selectedState, {
      type: "set_medicine_auto_use",
      medicineId: "clear_heart_countermeasure",
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
      enabledState.progress.medicineInventory?.clear_heart_countermeasure
    ).toBeUndefined();
    expect(disabledState.progress.medicineInventory?.clear_heart_countermeasure).toBe(1);

    const enabledViewModel = getWebGameViewModel(data, enabledState);
    const autoMedicineEvent = enabledViewModel.battleEvents.find(
      (event) => event.category === "auto_medicine"
    );

    expect(autoMedicineEvent).toMatchObject({
      category: "auto_medicine",
      headline: "Scenario Patient (Front) uses Clear Heart Countermeasure",
      detail: "Battle purge · removes Corruption",
      badges: [
        {
          label: "Auto Countermeasure",
          tone: "neutral"
        },
        {
          label: "Corruption",
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
          name: "Web Corruption Hex",
          cooldownSeconds: 1,
          outerMultiplier: 0,
          innerMultiplier: 0,
          targetRule: "first_living" as const,
          effects: [
            {
              type: "apply_status" as const,
              statusId: "corruption",
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
          regionId: "greenline_approach",
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
          greenline_approach: {
            ...state.progress.maps.greenline_approach,
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
        "Lotus Purge Training Lv 2 adds 8% team status resistance before the cap."
    });
  });
});
