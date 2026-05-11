import {
  createInitialPlayerProgress,
  DEFAULT_OFFLINE_FARM_PRESET,
  defaultAutoMedicinePreferences,
  normalizeOfflineFarmPreset
} from "../../core";
import type {
  ApplyOfflineAssignmentRewardsResult,
  ApplyOfflineRewardsResult,
  SaveData,
  StaticGameData
} from "../../core";
import type { WebGameAction } from "./actions";
import {
  createActiveTeamUpdateResolvedAction,
  createAssignmentUpdateResolvedAction,
  createBattleResolvedAction,
  createEquipmentEquipResolvedAction,
  createPurchaseResolvedAction,
  createSkillPurchaseResolvedAction,
  createStyleBranchSelectResolvedAction,
  createTacticSelectResolvedAction
} from "./commandActions";
import {
  formatSaveStorageCommitFailure,
  getBrowserSaveStorage,
  loadSaveDataWithOfflineRewardsFromStorage
} from "./saveStorage";
import type { WebSaveStorage } from "./saveStorage";
import type {
  EquipGameEquipmentInput,
  OfflineRewardSummary,
  PurchaseGameSkillUpgradeInput,
  PurchaseGameUpgradeInput,
  SelectGameStyleBranchInput,
  SelectGameTacticInput,
  SetGameActiveHeroTeamInput,
  SetGameAssignmentHeroesInput,
  WebGameState
} from "./types";
import {
  getDefaultFarmStageId,
  normalizeFarmStageId,
  normalizeSelectedStageId,
  reduceAssignmentAction,
  reduceCounterplayAction,
  reduceEquipmentAction,
  reduceProgressionAction,
  reduceRosterFormationAction,
  reduceSaveStateAction,
  reduceStrategyAction,
  reduceStageIdleAction
} from "./reducerBranches";

function assertUnhandledWebGameAction(action: never): never {
  throw new Error(`Unhandled web game action: ${JSON.stringify(action)}`);
}

export function createOfflineRewardSummary(
  offlineRewards: ApplyOfflineRewardsResult | null,
  offlineAssignmentRewards: ApplyOfflineAssignmentRewardsResult | null
): OfflineRewardSummary | null {
  const assignmentRewards = offlineAssignmentRewards?.rewards ?? null;
  const hasFarmRewards = Boolean(
    offlineRewards?.ok && offlineRewards.rewards.clears > 0
  );
  const hasAssignmentRewards = Boolean(
    assignmentRewards && assignmentRewards.assignments.length > 0
  );

  if (!hasFarmRewards && !hasAssignmentRewards) {
    return null;
  }

  return {
    stageId: offlineRewards?.ok ? offlineRewards.stageId : null,
    offlineSeconds: Math.max(
      offlineRewards?.rewards.offlineSeconds ?? 0,
      assignmentRewards?.offlineSeconds ?? 0
    ),
    clears: offlineRewards?.ok ? offlineRewards.rewards.clears : 0,
    silver:
      (offlineRewards?.ok ? offlineRewards.rewards.silver : 0) +
      (assignmentRewards?.silver ?? 0),
    cultivation:
      (offlineRewards?.ok ? offlineRewards.rewards.cultivation : 0) +
      (assignmentRewards?.cultivation ?? 0),
    herbs:
      (offlineRewards?.ok ? offlineRewards.rewards.herbs : 0) +
      (assignmentRewards?.herbs ?? 0),
    combatExperience:
      (offlineRewards?.ok ? offlineRewards.rewards.combatExperience : 0) +
      (assignmentRewards?.combatExperience ?? 0),
    assignmentSilver: assignmentRewards?.silver ?? 0,
    assignmentCultivation: assignmentRewards?.cultivation ?? 0,
    assignmentHerbs: assignmentRewards?.herbs ?? 0,
    assignmentCombatExperience: assignmentRewards?.combatExperience ?? 0,
    assignmentStyleMasteryExperience:
      assignmentRewards?.styleMasteryExperience ?? 0,
    assignmentEquipmentRewards: assignmentRewards?.equipmentRewards ?? []
  };
}

export function createInitialWebGameState(data: StaticGameData): WebGameState {
  const progress = createInitialPlayerProgress(data);

  return {
    progress,
    autoMedicinePreferences: {
      ...defaultAutoMedicinePreferences,
      disabledMedicineIds: [
        ...defaultAutoMedicinePreferences.disabledMedicineIds
      ]
    },
    selectedStageId: progress.currentStageId,
    selectedOfflineFarmStageId: getDefaultFarmStageId(
      data,
      progress,
      DEFAULT_OFFLINE_FARM_PRESET
    ),
    offlineFarmPreset: DEFAULT_OFFLINE_FARM_PRESET,
    offlineSummary: null,
    startupSaveDiagnostics: [],
    startupSavePersistence: null,
    lastBattle: null,
    lastBattleStageId: null,
    lastPurchase: null,
    lastSkillPurchase: null,
    lastEquipmentAction: null,
    lastStyleBranchAction: null,
    lastTacticAction: null,
    lastActiveTeamAction: null,
    lastAssignmentAction: null
  };
}

export function createWebGameStateFromSave(
  data: StaticGameData,
  save: SaveData,
  offlineSummary: OfflineRewardSummary | null = null
): WebGameState {
  const offlineFarmPreset = normalizeOfflineFarmPreset(save.offlineFarmPreset);

  return {
    progress: save.progress,
    autoMedicinePreferences: {
      ...save.autoMedicinePreferences,
      disabledMedicineIds: [
        ...save.autoMedicinePreferences.disabledMedicineIds
      ]
    },
    selectedStageId: normalizeSelectedStageId(
      data,
      save.progress,
      save.progress.currentStageId
    ),
    selectedOfflineFarmStageId: normalizeFarmStageId(
      data,
      save.progress,
      save.selectedOfflineFarmStageId,
      offlineFarmPreset
    ),
    offlineFarmPreset,
    offlineSummary,
    startupSaveDiagnostics: [],
    startupSavePersistence: null,
    lastBattle: null,
    lastBattleStageId: null,
    lastPurchase: null,
    lastSkillPurchase: null,
    lastEquipmentAction: null,
    lastStyleBranchAction: null,
    lastTacticAction: null,
    lastActiveTeamAction: null,
    lastAssignmentAction: null
  };
}

export function createInitialWebGameStateFromStorage(
  data: StaticGameData,
  storage: WebSaveStorage | null = getBrowserSaveStorage(),
  nowMs = Date.now()
): WebGameState {
  if (!storage) {
    return createInitialWebGameState(data);
  }

  const loadResult = loadSaveDataWithOfflineRewardsFromStorage(
    data,
    storage,
    nowMs
  );

  if (!loadResult.ok) {
    return createInitialWebGameState(data);
  }

  const state = createWebGameStateFromSave(
    data,
    loadResult.activeSave,
    createOfflineRewardSummary(
      loadResult.offlineRewards,
      loadResult.offlineAssignmentRewards
    )
  );
  const stateWithPersistence: WebGameState = {
    ...state,
    startupSavePersistence: {
      persistedSave: loadResult.persistedSave,
      offlineRewardBaselineSave: loadResult.offlineRewardBaselineSave,
      commitStatus: loadResult.commitResult.status,
      attemptedWriteReasons: loadResult.commitResult.attemptedWriteReasons
    }
  };

  if (loadResult.commitResult.status !== "failed") {
    return stateWithPersistence;
  }

  return {
    ...stateWithPersistence,
    startupSaveDiagnostics: [
      formatSaveStorageCommitFailure(loadResult.commitResult)
    ]
  };
}

export function webGameStateReducer(
  data: StaticGameData,
  state: WebGameState,
  action: WebGameAction
): WebGameState {
  switch (action.type) {
    case "select_stage":
    case "select_offline_farm_stage":
    case "set_offline_farm_preset":
    case "battle_resolved":
    case "dismiss_offline_summary":
      return reduceStageIdleAction(data, state, action);

    case "purchase_resolved":
    case "skill_purchase_resolved":
    case "style_branch_select_resolved":
      return reduceProgressionAction(data, state, action);

    case "tactic_select_resolved":
      return reduceStrategyAction(state, action);

    case "equipment_equip_resolved":
      return reduceEquipmentAction(state, action);

    case "set_hero_formation_slot":
    case "active_team_update_resolved":
      return reduceRosterFormationAction(data, state, action);

    case "assignment_update_resolved":
      return reduceAssignmentAction(state, action);

    case "set_auto_medicine_enabled":
    case "set_medicine_auto_use":
    case "set_pre_battle_resistance_mode":
      return reduceCounterplayAction(data, state, action);

    case "replace_progress":
    case "replace_state":
      return reduceSaveStateAction(data, state, action);
    default:
      return assertUnhandledWebGameAction(action);
  }
}

export function resolveSelectedStageBattle(
  data: StaticGameData,
  state: WebGameState
): WebGameState {
  return webGameStateReducer(
    data,
    state,
    createBattleResolvedAction(data, state)
  );
}

export function purchaseGameUpgrade(
  data: StaticGameData,
  state: WebGameState,
  input: PurchaseGameUpgradeInput
): WebGameState {
  return webGameStateReducer(
    data,
    state,
    createPurchaseResolvedAction(data, state, input)
  );
}

export function purchaseGameSkillUpgrade(
  data: StaticGameData,
  state: WebGameState,
  input: PurchaseGameSkillUpgradeInput
): WebGameState {
  return webGameStateReducer(
    data,
    state,
    createSkillPurchaseResolvedAction(data, state, input)
  );
}

export function equipGameEquipment(
  data: StaticGameData,
  state: WebGameState,
  input: EquipGameEquipmentInput
): WebGameState {
  return webGameStateReducer(
    data,
    state,
    createEquipmentEquipResolvedAction(data, state, input)
  );
}

export function selectGameStyleBranch(
  data: StaticGameData,
  state: WebGameState,
  input: SelectGameStyleBranchInput
): WebGameState {
  return webGameStateReducer(
    data,
    state,
    createStyleBranchSelectResolvedAction(data, state, input)
  );
}

export function selectGameTactic(
  data: StaticGameData,
  state: WebGameState,
  input: SelectGameTacticInput
): WebGameState {
  return webGameStateReducer(
    data,
    state,
    createTacticSelectResolvedAction(data, state, input)
  );
}

export function setGameAssignmentHeroes(
  data: StaticGameData,
  state: WebGameState,
  input: SetGameAssignmentHeroesInput
): WebGameState {
  return webGameStateReducer(
    data,
    state,
    createAssignmentUpdateResolvedAction(data, state, input)
  );
}

export function setGameActiveHeroTeam(
  data: StaticGameData,
  state: WebGameState,
  input: SetGameActiveHeroTeamInput
): WebGameState {
  return webGameStateReducer(
    data,
    state,
    createActiveTeamUpdateResolvedAction(data, state, input)
  );
}
