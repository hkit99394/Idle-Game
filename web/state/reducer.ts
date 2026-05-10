import {
  buildEnemyTeamForStage,
  buildPlayerTeamForStage,
  ACTIVE_TEAM_SIZE,
  buildMedicineCounterplayViewModels,
  buildStageCounterplayPreview,
  calculateCombatPower,
  calculateSkillUpgradeCost,
  calculateUpgradeCost,
  createInitialPlayerProgress,
  DEFAULT_OFFLINE_FARM_PRESET,
  defaultAutoMedicinePreferences,
  deriveStats,
  equipHeroEquipment as equipCoreHeroEquipment,
  EQUIPMENT_SLOTS,
  getMedicineAutoUseLabel,
  getPreBattleResistanceModeLabel,
  getDefaultFormationSlot,
  getAvailableEquipmentCopyCount,
  getActiveMasterySummaryForStage,
  getActiveEquipmentSetBonuses,
  getHeroAssignmentId,
  getActiveHeroIds,
  getEquipmentInventoryCount,
  getBattleEventStatusId,
  getOfflineFarmPresetPolicy,
  getRecommendedOfflineFarmStage,
  getStageById,
  getSkillUpgradeLevel,
  getStyleMasteryExperience,
  getStyleMasteryLevel,
  getUpgradeLevel,
  hasClearedStage,
  isAutoMedicineUnlocked,
  isOfflineFarmStageUnlocked,
  isAssignmentUnlocked,
  isHeroUnlocked,
  isHeroEligibleForAssignment,
  isPreBattleResistanceMode,
  isStageUnlocked,
  isStyleBranchUnlocked,
  normalizeOfflineFarmPreset,
  OFFLINE_FARM_PRESET_POLICIES,
  PRE_BATTLE_RESISTANCE_MODES,
  previewOfflineRewards,
  purchaseSkillUpgrade as purchaseCoreSkillUpgrade,
  purchaseUpgrade as purchaseCoreUpgrade,
  resolveStageBattle,
  scaleStatsForLevel,
  selectStyleBranch as selectCoreStyleBranch,
  setMedicineAutoUsePreference,
  setActiveHeroTeam as setCoreActiveHeroTeam,
  setAssignmentHeroes as setCoreAssignmentHeroes,
  setPlayerFormationSlot,
  setOfflineFarmStageTarget,
  STYLE_MASTERY_EXPERIENCE_PER_LEVEL
} from "../../core";
import type {
  ActiveMasterySummary,
  ApplyOfflineAssignmentRewardsResult,
  AutoMedicinePreferences,
  BattleEvent,
  BattleContribution,
  CombatantInstanceDefinition,
  CombatantState,
  CombatRole,
  DerivedStats,
  FormationSlot,
  EquipHeroEquipmentInput,
  EquipHeroEquipmentResult,
  EquipmentRarity,
  EquipmentSlot,
  MasteryBonus,
  OfflineFarmPreset,
  TeamId,
  MedicineCounterplayViewModel,
  PlayerProgress,
  PreBattleResistanceMode,
  ApplyOfflineRewardsResult,
  PurchaseSkillUpgradeInput,
  PurchaseSkillUpgradeResult,
  PurchaseUpgradeInput,
  PurchaseUpgradeResult,
  ResolveStageBattleResult,
  SaveData,
  SelectStyleBranchInput,
  SelectStyleBranchResult,
  SetActiveHeroTeamInput,
  SetActiveHeroTeamResult,
  SetAssignmentHeroesInput,
  SetAssignmentHeroesResult,
  StageCounterplayPreview,
  StatusEffectId,
  StaticGameData
} from "../../core";
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
  SaveToolResult,
  SelectGameStyleBranchInput,
  SetGameActiveHeroTeamInput,
  SetGameAssignmentHeroesInput,
  WebGameAction,
  WebGameState
} from "./types";
function getDefaultFarmStageId(
  data: StaticGameData,
  progress: PlayerProgress,
  preset: OfflineFarmPreset = DEFAULT_OFFLINE_FARM_PRESET
): string | null {
  return setOfflineFarmStageTarget(data, progress, null, preset);
}

function normalizeFarmStageId(
  data: StaticGameData,
  progress: PlayerProgress,
  selectedStageId: string | null,
  preset: OfflineFarmPreset
): string | null {
  return setOfflineFarmStageTarget(data, progress, selectedStageId, preset);
}

function normalizeSelectedStageId(
  data: StaticGameData,
  progress: PlayerProgress,
  selectedStageId: string
): string {
  const selectedStage = getStageById(data, selectedStageId);

  return selectedStage && isStageUnlocked(data, progress, selectedStage)
    ? selectedStage.id
    : progress.currentStageId;
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
    case "select_stage": {
      const selectedStageId = normalizeSelectedStageId(
        data,
        state.progress,
        action.stageId
      );

      return {
        ...state,
        selectedStageId,
        selectedOfflineFarmStageId: normalizeFarmStageId(
          data,
          state.progress,
          selectedStageId,
          state.offlineFarmPreset
        )
      };
    }

    case "select_offline_farm_stage":
      return {
        ...state,
        selectedOfflineFarmStageId: normalizeFarmStageId(
          data,
          state.progress,
          action.stageId,
          state.offlineFarmPreset
        )
      };

    case "set_offline_farm_preset": {
      const preset = normalizeOfflineFarmPreset(action.preset);

      return {
        ...state,
        offlineFarmPreset: preset,
        selectedOfflineFarmStageId: normalizeFarmStageId(
          data,
          state.progress,
          null,
          preset
        )
      };
    }

    case "set_auto_medicine_enabled":
      return {
        ...state,
        autoMedicinePreferences: {
          ...state.autoMedicinePreferences,
          enabled: action.enabled
        }
      };

    case "set_medicine_auto_use": {
      const medicineExists = data.medicines.some(
        (medicine) => medicine.id === action.medicineId
      );

      if (!medicineExists) {
        return state;
      }

      return {
        ...state,
        autoMedicinePreferences: setMedicineAutoUsePreference(
          state.autoMedicinePreferences,
          action.medicineId,
          action.enabled
        )
      };
    }

    case "set_pre_battle_resistance_mode":
      if (!isPreBattleResistanceMode(action.mode)) {
        return state;
      }

      return {
        ...state,
        autoMedicinePreferences: {
          ...state.autoMedicinePreferences,
          preBattleResistanceMode: action.mode
        }
      };

    case "set_hero_formation_slot": {
      const result = setPlayerFormationSlot(
        data,
        state.progress,
        action.heroId,
        action.slot
      );

      if (!result.ok) {
        return state;
      }

      return {
        ...state,
        progress: result.progress,
        lastBattle: null,
        lastBattleStageId: null,
        lastPurchase: null,
        lastSkillPurchase: null,
        lastEquipmentAction: null,
        lastStyleBranchAction: null,
        lastActiveTeamAction: null,
        lastAssignmentAction: null
      };
    }

    case "style_branch_select_resolved": {
      const nextProgress = action.result.ok
        ? action.result.progress
        : state.progress;

      return {
        ...state,
        progress: nextProgress,
        lastStyleBranchAction: action.result,
        lastEquipmentAction: null,
        lastSkillPurchase: null,
        lastPurchase: null,
        lastBattle: null,
        lastBattleStageId: null,
        lastActiveTeamAction: null,
        lastAssignmentAction: null
      };
    }

    case "active_team_update_resolved": {
      const nextProgress = action.result.ok
        ? action.result.progress
        : state.progress;

      return {
        ...state,
        progress: nextProgress,
        lastActiveTeamAction: action.result,
        lastAssignmentAction: null,
        lastStyleBranchAction: null,
        lastEquipmentAction: null,
        lastSkillPurchase: null,
        lastPurchase: null,
        lastBattle: null,
        lastBattleStageId: null
      };
    }

    case "assignment_update_resolved": {
      const nextProgress = action.result.ok
        ? action.result.progress
        : state.progress;

      return {
        ...state,
        progress: nextProgress,
        lastAssignmentAction: action.result,
        lastStyleBranchAction: null,
        lastEquipmentAction: null,
        lastSkillPurchase: null,
        lastPurchase: null,
        lastBattle: null,
        lastBattleStageId: null,
        lastActiveTeamAction: null
      };
    }

    case "battle_resolved": {
      const nextProgress = action.result.ok
        ? action.result.progress
        : state.progress;
      const selectedStageId = state.selectedStageId;

      return {
        ...state,
        progress: nextProgress,
        selectedStageId: normalizeSelectedStageId(
          data,
          nextProgress,
          selectedStageId
        ),
        selectedOfflineFarmStageId: normalizeFarmStageId(
          data,
          nextProgress,
          selectedStageId,
          state.offlineFarmPreset
        ),
        lastBattle: action.result,
        lastBattleStageId: action.stageId,
        lastPurchase: null,
        lastSkillPurchase: null,
        lastEquipmentAction: null,
        lastStyleBranchAction: null,
        lastActiveTeamAction: null,
        lastAssignmentAction: null
      };
    }

    case "purchase_resolved": {
      const nextProgress = action.result.ok
        ? action.result.progress
        : state.progress;

      return {
        ...state,
        progress: nextProgress,
        selectedOfflineFarmStageId: normalizeFarmStageId(
          data,
          nextProgress,
          state.selectedOfflineFarmStageId,
          state.offlineFarmPreset
        ),
        lastPurchase: action.result,
        lastSkillPurchase: null,
        lastEquipmentAction: null,
        lastStyleBranchAction: null,
        lastBattle: null,
        lastBattleStageId: null,
        lastActiveTeamAction: null,
        lastAssignmentAction: null
      };
    }

    case "skill_purchase_resolved": {
      const nextProgress = action.result.ok
        ? action.result.progress
        : state.progress;

      return {
        ...state,
        progress: nextProgress,
        lastSkillPurchase: action.result,
        lastPurchase: null,
        lastEquipmentAction: null,
        lastStyleBranchAction: null,
        lastBattle: null,
        lastBattleStageId: null,
        lastActiveTeamAction: null,
        lastAssignmentAction: null
      };
    }

    case "equipment_equip_resolved": {
      const nextProgress = action.result.ok
        ? action.result.progress
        : state.progress;

      return {
        ...state,
        progress: nextProgress,
        lastEquipmentAction: action.result,
        lastStyleBranchAction: null,
        lastSkillPurchase: null,
        lastPurchase: null,
        lastBattle: null,
        lastBattleStageId: null,
        lastActiveTeamAction: null,
        lastAssignmentAction: null
      };
    }

    case "replace_progress":
      return {
        ...state,
        progress: action.progress,
        selectedStageId: normalizeSelectedStageId(
          data,
          action.progress,
          state.selectedStageId
        ),
        selectedOfflineFarmStageId: normalizeFarmStageId(
          data,
          action.progress,
          state.selectedOfflineFarmStageId,
          state.offlineFarmPreset
        ),
        lastBattle: null,
        lastBattleStageId: null,
        lastPurchase: null,
        lastSkillPurchase: null,
        lastEquipmentAction: null,
        lastStyleBranchAction: null,
        lastActiveTeamAction: null,
        lastAssignmentAction: null
      };

    case "replace_state":
      return action.state;

    case "dismiss_offline_summary":
      return {
        ...state,
        offlineSummary: null
      };
  }
}

export function resolveSelectedStageBattle(
  data: StaticGameData,
  state: WebGameState
): WebGameState {
  const result = resolveStageBattle(data, {
    progress: state.progress,
    stageId: state.selectedStageId,
    maxDurationSeconds: 180,
    autoMedicinePreferences: state.autoMedicinePreferences
  });

  return webGameStateReducer(data, state, {
    type: "battle_resolved",
    stageId: state.selectedStageId,
    result
  });
}

export function purchaseGameUpgrade(
  data: StaticGameData,
  state: WebGameState,
  input: PurchaseGameUpgradeInput
): WebGameState {
  const result = purchaseCoreUpgrade(data.upgrades, {
    progress: state.progress,
    ...input
  });

  return webGameStateReducer(data, state, {
    type: "purchase_resolved",
    result
  });
}

export function purchaseGameSkillUpgrade(
  data: StaticGameData,
  state: WebGameState,
  input: PurchaseGameSkillUpgradeInput
): WebGameState {
  const result = purchaseCoreSkillUpgrade(data.skillUpgrades, {
    progress: state.progress,
    ...input
  });

  return webGameStateReducer(data, state, {
    type: "skill_purchase_resolved",
    result
  });
}

export function equipGameEquipment(
  data: StaticGameData,
  state: WebGameState,
  input: EquipGameEquipmentInput
): WebGameState {
  const result = equipCoreHeroEquipment(data, {
    progress: state.progress,
    ...input
  });

  return webGameStateReducer(data, state, {
    type: "equipment_equip_resolved",
    result
  });
}

export function selectGameStyleBranch(
  data: StaticGameData,
  state: WebGameState,
  input: SelectGameStyleBranchInput
): WebGameState {
  const result = selectCoreStyleBranch(data, {
    progress: state.progress,
    ...input
  });

  return webGameStateReducer(data, state, {
    type: "style_branch_select_resolved",
    result
  });
}

export function setGameAssignmentHeroes(
  data: StaticGameData,
  state: WebGameState,
  input: SetGameAssignmentHeroesInput
): WebGameState {
  const result = setCoreAssignmentHeroes(data, {
    progress: state.progress,
    ...input
  });

  return webGameStateReducer(data, state, {
    type: "assignment_update_resolved",
    result
  });
}

export function setGameActiveHeroTeam(
  data: StaticGameData,
  state: WebGameState,
  input: SetGameActiveHeroTeamInput
): WebGameState {
  const result = setCoreActiveHeroTeam(data, {
    progress: state.progress,
    ...input
  });

  return webGameStateReducer(data, state, {
    type: "active_team_update_resolved",
    result
  });
}
