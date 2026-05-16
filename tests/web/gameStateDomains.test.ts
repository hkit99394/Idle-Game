import { describe, expect, it } from "vitest";
import {
  createInitialWebGameState,
  webGameStateReducer
} from "../../web/state/gameState";
import {
  webGameActionDomainTypes,
  webGameActionTypeDomains
} from "../../web/state/actions";
import {
  createAssignmentUpdateResolvedAction,
  createEquipmentEquipResolvedAction,
  createPurchaseResolvedAction,
  createReplaceProgressAction,
  createSelectStageAction,
  createSetMedicineAutoUseAction,
  createTacticSelectResolvedAction
} from "../../web/state/commandActions";
import { resetBrowserSave } from "../../web/state/saveToolCommands";
import { staticData } from "../helpers/staticData";

describe("web game state domains", () => {
  it("groups web game actions by reducer domain", () => {
    const domainActionTypes = Object.values(webGameActionDomainTypes).flat();

    expect(webGameActionDomainTypes.stage_idle).toEqual(
      expect.arrayContaining([
        "select_stage",
        "select_offline_farm_stage",
        "set_offline_farm_preset",
        "battle_resolved",
        "dismiss_offline_summary"
      ])
    );
    expect(webGameActionDomainTypes.progression).toEqual(
      expect.arrayContaining([
        "purchase_resolved",
        "skill_purchase_resolved",
        "style_branch_select_resolved"
      ])
    );
    expect(webGameActionDomainTypes.strategy).toEqual([
      "tactic_select_resolved"
    ]);
    expect(webGameActionDomainTypes.equipment).toEqual([
      "equipment_equip_resolved"
    ]);
    expect(webGameActionDomainTypes.roster_formation).toEqual(
      expect.arrayContaining([
        "set_hero_formation_slot",
        "active_team_update_resolved"
      ])
    );
    expect(webGameActionDomainTypes.assignments).toEqual([
      "assignment_update_resolved"
    ]);
    expect(webGameActionDomainTypes.counterplay).toEqual(
      expect.arrayContaining([
        "set_auto_medicine_enabled",
        "set_medicine_auto_use",
        "set_pre_battle_resistance_mode"
      ])
    );
    expect(webGameActionDomainTypes.save_state).toEqual(
      expect.arrayContaining(["replace_progress", "replace_state"])
    );
    expect(domainActionTypes).toHaveLength(
      Object.keys(webGameActionTypeDomains).length
    );
    expect(new Set(domainActionTypes).size).toBe(domainActionTypes.length);
  });

  it("keeps command action factories aligned with reducer behavior", () => {
    const state = createInitialWebGameState(staticData);
    const lockedStageState = webGameStateReducer(
      staticData,
      state,
      createSelectStageAction("veil_district_1")
    );
    const purchaseReadyState = webGameStateReducer(
      staticData,
      state,
      createReplaceProgressAction({
        ...state.progress,
        resources: {
          credits: 20,
          resonance: 0,
          reagents: 0
        }
      })
    );
    const purchasedState = webGameStateReducer(
      staticData,
      purchaseReadyState,
      createPurchaseResolvedAction(staticData, purchaseReadyState, {
        upgradeId: "hero_outer_training",
        heroId: "iron_fist_initiate"
      })
    );
    const equipmentReadyState = webGameStateReducer(
      staticData,
      state,
      createReplaceProgressAction({
        ...state.progress,
        equipment: {
          inventory: {
            impact_training_wraps: 1
          },
          equipped: {}
        }
      })
    );
    const equippedState = webGameStateReducer(
      staticData,
      equipmentReadyState,
      createEquipmentEquipResolvedAction(staticData, equipmentReadyState, {
        heroId: "iron_fist_initiate",
        equipmentId: "impact_training_wraps"
      })
    );
    const assignedState = webGameStateReducer(
      staticData,
      state,
      createAssignmentUpdateResolvedAction(staticData, state, {
        assignmentId: "greenline_sweep",
        heroIds: ["iron_fist_initiate"]
      })
    );
    const counterplayState = webGameStateReducer(
      staticData,
      state,
      createSetMedicineAutoUseAction("clear_heart_countermeasure", false)
    );
    const tacticState = webGameStateReducer(
      staticData,
      state,
      createTacticSelectResolvedAction(staticData, state, {
        tacticId: "long_stabilization"
      })
    );

    expect(lockedStageState.selectedStageId).toBe(state.selectedStageId);
    expect(purchasedState.lastPurchase?.ok).toBe(true);
    expect(purchasedState.progress.resources.credits).toBe(8);
    expect(equippedState.lastEquipmentAction?.ok).toBe(true);
    expect(
      equippedState.progress.equipment?.equipped.iron_fist_initiate?.weapon
    ).toBe("impact_training_wraps");
    expect(assignedState.lastAssignmentAction?.ok).toBe(true);
    expect(
      assignedState.progress.assignments?.greenline_sweep?.heroIds
    ).toEqual(["iron_fist_initiate"]);
    expect(counterplayState.autoMedicinePreferences.disabledMedicineIds).toEqual([
      "clear_heart_countermeasure"
    ]);
    expect(tacticState.progress.selectedTacticId).toBe("long_stabilization");
  });

  it("keeps save/reset helpers behind the save command surface", () => {
    const result = resetBrowserSave(staticData);

    expect(result.result).toMatchObject({
      ok: false,
      message: "Browser save storage is unavailable"
    });
    expect(result.state).toMatchObject({
      selectedStageId: "greenline_approach_1",
      lastBattle: null
    });
  });
});
