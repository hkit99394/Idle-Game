import {
  equipHeroEquipment as equipCoreHeroEquipment,
  purchaseSkillUpgrade as purchaseCoreSkillUpgrade,
  purchaseUpgrade as purchaseCoreUpgrade,
  resolveStageBattle,
  selectPlayerTactic,
  selectStyleBranch as selectCoreStyleBranch,
  setActiveHeroTeam as setCoreActiveHeroTeam,
  setAssignmentHeroes as setCoreAssignmentHeroes
} from "../../core";
import type {
  FormationSlot,
  OfflineFarmPreset,
  PlayerProgress,
  PreBattleResistanceMode,
  StaticGameData
} from "../../core";
import type { WebGameAction } from "./actions";
import type {
  EquipGameEquipmentInput,
  PurchaseGameSkillUpgradeInput,
  PurchaseGameUpgradeInput,
  SelectGameStyleBranchInput,
  SelectGameTacticInput,
  SetGameActiveHeroTeamInput,
  SetGameAssignmentHeroesInput,
  WebGameState
} from "./types";

type ActionOf<Type extends WebGameAction["type"]> = Extract<
  WebGameAction,
  { type: Type }
>;

type BattleCommandState = Pick<
  WebGameState,
  "autoMedicinePreferences" | "progress" | "selectedStageId"
>;

type ProgressCommandState = Pick<WebGameState, "progress">;

export function createSelectStageAction(
  stageId: string
): ActionOf<"select_stage"> {
  return {
    type: "select_stage",
    stageId
  };
}

export function createSelectOfflineFarmStageAction(
  stageId: string | null
): ActionOf<"select_offline_farm_stage"> {
  return {
    type: "select_offline_farm_stage",
    stageId
  };
}

export function createSetOfflineFarmPresetAction(
  preset: OfflineFarmPreset
): ActionOf<"set_offline_farm_preset"> {
  return {
    type: "set_offline_farm_preset",
    preset
  };
}

export function createSetAutoMedicineEnabledAction(
  enabled: boolean
): ActionOf<"set_auto_medicine_enabled"> {
  return {
    type: "set_auto_medicine_enabled",
    enabled
  };
}

export function createSetMedicineAutoUseAction(
  medicineId: string,
  enabled: boolean
): ActionOf<"set_medicine_auto_use"> {
  return {
    type: "set_medicine_auto_use",
    medicineId,
    enabled
  };
}

export function createSetPreBattleResistanceModeAction(
  mode: PreBattleResistanceMode
): ActionOf<"set_pre_battle_resistance_mode"> {
  return {
    type: "set_pre_battle_resistance_mode",
    mode
  };
}

export function createSetHeroFormationAction(
  heroId: string,
  slot: FormationSlot
): ActionOf<"set_hero_formation_slot"> {
  return {
    type: "set_hero_formation_slot",
    heroId,
    slot
  };
}

export function createReplaceProgressAction(
  progress: PlayerProgress
): ActionOf<"replace_progress"> {
  return {
    type: "replace_progress",
    progress
  };
}

export function createReplaceStateAction(
  state: WebGameState
): ActionOf<"replace_state"> {
  return {
    type: "replace_state",
    state
  };
}

export function createDismissOfflineSummaryAction(): ActionOf<"dismiss_offline_summary"> {
  return {
    type: "dismiss_offline_summary"
  };
}

export function createBattleResolvedAction(
  data: StaticGameData,
  state: BattleCommandState
): ActionOf<"battle_resolved"> {
  return {
    type: "battle_resolved",
    stageId: state.selectedStageId,
    result: resolveStageBattle(data, {
      progress: state.progress,
      stageId: state.selectedStageId,
      maxDurationSeconds: 180,
      autoMedicinePreferences: state.autoMedicinePreferences
    })
  };
}

export function createPurchaseResolvedAction(
  data: StaticGameData,
  state: ProgressCommandState,
  input: PurchaseGameUpgradeInput
): ActionOf<"purchase_resolved"> {
  return {
    type: "purchase_resolved",
    result: purchaseCoreUpgrade(data.upgrades, {
      progress: state.progress,
      ...input
    })
  };
}

export function createSkillPurchaseResolvedAction(
  data: StaticGameData,
  state: ProgressCommandState,
  input: PurchaseGameSkillUpgradeInput
): ActionOf<"skill_purchase_resolved"> {
  return {
    type: "skill_purchase_resolved",
    result: purchaseCoreSkillUpgrade(data.skillUpgrades, {
      progress: state.progress,
      ...input
    })
  };
}

export function createEquipmentEquipResolvedAction(
  data: StaticGameData,
  state: ProgressCommandState,
  input: EquipGameEquipmentInput
): ActionOf<"equipment_equip_resolved"> {
  return {
    type: "equipment_equip_resolved",
    result: equipCoreHeroEquipment(data, {
      progress: state.progress,
      ...input
    })
  };
}

export function createStyleBranchSelectResolvedAction(
  data: StaticGameData,
  state: ProgressCommandState,
  input: SelectGameStyleBranchInput
): ActionOf<"style_branch_select_resolved"> {
  return {
    type: "style_branch_select_resolved",
    result: selectCoreStyleBranch(data, {
      progress: state.progress,
      ...input
    })
  };
}

export function createTacticSelectResolvedAction(
  data: StaticGameData,
  state: ProgressCommandState,
  input: SelectGameTacticInput
): ActionOf<"tactic_select_resolved"> {
  return {
    type: "tactic_select_resolved",
    result: selectPlayerTactic(data, {
      progress: state.progress,
      ...input
    })
  };
}

export function createAssignmentUpdateResolvedAction(
  data: StaticGameData,
  state: ProgressCommandState,
  input: SetGameAssignmentHeroesInput
): ActionOf<"assignment_update_resolved"> {
  return {
    type: "assignment_update_resolved",
    result: setCoreAssignmentHeroes(data, {
      progress: state.progress,
      ...input
    })
  };
}

export function createActiveTeamUpdateResolvedAction(
  data: StaticGameData,
  state: ProgressCommandState,
  input: SetGameActiveHeroTeamInput
): ActionOf<"active_team_update_resolved"> {
  return {
    type: "active_team_update_resolved",
    result: setCoreActiveHeroTeam(data, {
      progress: state.progress,
      ...input
    })
  };
}
