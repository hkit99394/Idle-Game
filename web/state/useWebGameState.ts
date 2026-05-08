import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
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
  getBrowserSaveStorage,
  exportSaveDataFromStorage,
  importSaveDataToStorage,
  loadSaveDataFromStorage,
  loadSaveDataWithOfflineRewardsFromStorage,
  resetSaveDataInStorage,
  saveWebGameStateToStorage,
  timeTravelOfflineSaveInStorage,
  WEB_SAVE_STORAGE_KEY,
  WEB_SAVE_AUTOSAVE_INTERVAL_MS
} from "./saveStorage";
import type { WebSaveStorage } from "./saveStorage";

import {
  buildSaveDiagnostics,
  getSaveToolErrorMessage,
  getWebGameViewModel
} from "./viewModel";
import { OFFLINE_TIME_TRAVEL_SECONDS } from "./constants";
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
import {
  createInitialWebGameState,
  createInitialWebGameStateFromStorage,
  createOfflineRewardSummary,
  createWebGameStateFromSave,
  resolveSelectedStageBattle,
  webGameStateReducer
} from "./reducer";

export function useWebGameState(data: StaticGameData) {
  const [state, dispatch] = useReducer(
    (currentState: WebGameState, action: WebGameAction) =>
      webGameStateReducer(data, currentState, action),
    data,
    createInitialWebGameStateFromStorage
  );
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const persistState = useCallback(
    (stateToSave: WebGameState) => {
      const storage = getBrowserSaveStorage();

      if (!storage) {
        return;
      }

      saveWebGameStateToStorage(data, stateToSave, storage);
    },
    [data]
  );

  const dispatchAndPersist = useCallback(
    (action: WebGameAction) => {
      const nextState = webGameStateReducer(data, state, action);

      dispatch(action);
      persistState(nextState);
    },
    [data, persistState, state]
  );

  useEffect(() => {
    const storage = getBrowserSaveStorage();

    if (!storage) {
      return;
    }

    const timer = window.setInterval(() => {
      saveWebGameStateToStorage(data, stateRef.current, storage);
    }, WEB_SAVE_AUTOSAVE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [data]);

  const battleSelectedStage = useCallback(() => {
    const nextState = resolveSelectedStageBattle(data, state);

    dispatch({
      type: "replace_state",
      state: nextState
    });
    persistState(nextState);
  }, [
    data,
    persistState,
    state
  ]);

  const purchaseUpgrade = useCallback(
    (input: PurchaseGameUpgradeInput) => {
      dispatchAndPersist({
        type: "purchase_resolved",
        result: purchaseCoreUpgrade(data.upgrades, {
          progress: state.progress,
          ...input
        })
      });
    },
    [data, dispatchAndPersist, state.progress]
  );

  const purchaseSkillUpgrade = useCallback(
    (input: PurchaseGameSkillUpgradeInput) => {
      dispatchAndPersist({
        type: "skill_purchase_resolved",
        result: purchaseCoreSkillUpgrade(data.skillUpgrades, {
          progress: state.progress,
          ...input
        })
      });
    },
    [data, dispatchAndPersist, state.progress]
  );

  const equipEquipment = useCallback(
    (input: EquipGameEquipmentInput) => {
      dispatchAndPersist({
        type: "equipment_equip_resolved",
        result: equipCoreHeroEquipment(data, {
          progress: state.progress,
          ...input
        })
      });
    },
    [data, dispatchAndPersist, state.progress]
  );

  const selectStage = useCallback((stageId: string) => {
    dispatchAndPersist({
      type: "select_stage",
      stageId
    });
  }, [dispatchAndPersist]);

  const setOfflineFarmPreset = useCallback((preset: OfflineFarmPreset) => {
    dispatchAndPersist({
      type: "set_offline_farm_preset",
      preset
    });
  }, [dispatchAndPersist]);

  const setAutoMedicineEnabled = useCallback((enabled: boolean) => {
    dispatchAndPersist({
      type: "set_auto_medicine_enabled",
      enabled
    });
  }, [dispatchAndPersist]);

  const setMedicineAutoUse = useCallback(
    (medicineId: string, enabled: boolean) => {
      dispatchAndPersist({
        type: "set_medicine_auto_use",
        medicineId,
        enabled
      });
    },
    [dispatchAndPersist]
  );

  const setPreBattleResistanceMode = useCallback(
    (mode: PreBattleResistanceMode) => {
      dispatchAndPersist({
        type: "set_pre_battle_resistance_mode",
        mode
      });
    },
    [dispatchAndPersist]
  );

  const setHeroFormation = useCallback((heroId: string, slot: FormationSlot) => {
    dispatchAndPersist({
      type: "set_hero_formation_slot",
      heroId,
      slot
    });
  }, [dispatchAndPersist]);

  const selectStyleBranch = useCallback(
    (input: SelectGameStyleBranchInput) => {
      dispatchAndPersist({
        type: "style_branch_select_resolved",
        result: selectCoreStyleBranch(data, {
          progress: state.progress,
          ...input
        })
      });
    },
    [data, dispatchAndPersist, state.progress]
  );

  const setAssignmentHeroes = useCallback(
    (input: SetGameAssignmentHeroesInput) => {
      dispatchAndPersist({
        type: "assignment_update_resolved",
        result: setCoreAssignmentHeroes(data, {
          progress: state.progress,
          ...input
        })
      });
    },
    [data, dispatchAndPersist, state.progress]
  );

  const setActiveHeroTeam = useCallback(
    (input: SetGameActiveHeroTeamInput) => {
      dispatchAndPersist({
        type: "active_team_update_resolved",
        result: setCoreActiveHeroTeam(data, {
          progress: state.progress,
          ...input
        })
      });
    },
    [data, dispatchAndPersist, state.progress]
  );

  const dismissOfflineSummary = useCallback(() => {
    dispatch({
      type: "dismiss_offline_summary"
    });
  }, []);

  const viewModel = useMemo(
    () => getWebGameViewModel(data, state),
    [data, state]
  );
  const saveDiagnostics = useMemo(
    () => buildSaveDiagnostics(data, state),
    [data, state]
  );

  const exportSave = useCallback((): SaveToolResult => {
    const storage = getBrowserSaveStorage();

    if (!storage) {
      return {
        ok: false,
        message: "Browser save storage is unavailable",
        errors: ["Browser save storage is unavailable"]
      };
    }

    const result = exportSaveDataFromStorage(data, storage);

    if (!result.ok) {
      return {
        ok: false,
        message: getSaveToolErrorMessage(result.reason),
        errors: result.errors
      };
    }

    return {
      ok: true,
      message: "Save exported",
      json: result.json
    };
  }, [data]);

  const importSave = useCallback((rawSaveText: string): SaveToolResult => {
    const storage = getBrowserSaveStorage();

    if (!storage) {
      return {
        ok: false,
        message: "Browser save storage is unavailable",
        errors: ["Browser save storage is unavailable"]
      };
    }

    const result = importSaveDataToStorage(data, storage, rawSaveText);

    if (!result.ok) {
      return {
        ok: false,
        message: getSaveToolErrorMessage(result.reason),
        errors: result.errors
      };
    }

    dispatch({
      type: "replace_state",
      state: createWebGameStateFromSave(data, result.save)
    });

    return {
      ok: true,
      message: "Save imported"
    };
  }, [data]);

  const resetNewGame = useCallback((): SaveToolResult => {
    const storage = getBrowserSaveStorage();

    if (!storage) {
      dispatch({
        type: "replace_state",
        state: createInitialWebGameState(data)
      });

      return {
        ok: false,
        message: "Browser save storage is unavailable",
        errors: ["New game was reset for this session only"]
      };
    }

    const result = resetSaveDataInStorage(data, storage);

    if (!result.ok) {
      return {
        ok: false,
        message: getSaveToolErrorMessage(result.reason),
        errors: result.errors
      };
    }

    dispatch({
      type: "replace_state",
      state: createWebGameStateFromSave(data, result.save)
    });

    return {
      ok: true,
      message: "New game save created"
    };
  }, [data]);

  const timeTravelOfflineFarm = useCallback(
    (
      offlineSeconds = OFFLINE_TIME_TRAVEL_SECONDS
    ): SaveToolResult => {
      const storage = getBrowserSaveStorage();

      if (!state.selectedOfflineFarmStageId) {
        return {
          ok: false,
          message: "Select an offline farm stage first",
          errors: []
        };
      }

      if (!storage) {
        return {
          ok: false,
          message: "Browser save storage is unavailable",
          errors: ["Browser save storage is unavailable"]
        };
      }

      const nowMs = Date.now();
      const saveResult = saveWebGameStateToStorage(data, state, storage, nowMs);

      if (!saveResult.ok) {
        return {
          ok: false,
          message: getSaveToolErrorMessage(saveResult.reason),
          errors: saveResult.errors
        };
      }

      const travelResult = timeTravelOfflineSaveInStorage(
        data,
        storage,
        offlineSeconds,
        nowMs
      );

      if (!travelResult.ok) {
        return {
          ok: false,
          message: getSaveToolErrorMessage(travelResult.reason),
          errors: travelResult.errors
        };
      }

      const loadResult = loadSaveDataWithOfflineRewardsFromStorage(
        data,
        storage,
        nowMs
      );

      if (!loadResult.ok) {
        return {
          ok: false,
          message: getSaveToolErrorMessage(loadResult.reason),
          errors: loadResult.errors
        };
      }

      const offlineSummary = createOfflineRewardSummary(
        loadResult.offlineRewards,
        loadResult.offlineAssignmentRewards
      );

      dispatch({
        type: "replace_state",
        state: createWebGameStateFromSave(data, loadResult.save, offlineSummary)
      });

      return {
        ok: true,
        message: offlineSummary
          ? "Offline time travel rewards applied"
          : "Offline time travel applied with no rewards"
      };
    },
    [data, state]
  );

  return {
    state,
    viewModel,
    saveDiagnostics,
    dispatch,
    battleSelectedStage,
    purchaseUpgrade,
    purchaseSkillUpgrade,
    equipEquipment,
    selectStage,
    setOfflineFarmPreset,
    setAutoMedicineEnabled,
    setMedicineAutoUse,
    setPreBattleResistanceMode,
    setHeroFormation,
    selectStyleBranch,
    setActiveHeroTeam,
    setAssignmentHeroes,
    dismissOfflineSummary,
    exportSave,
    importSave,
    resetNewGame,
    timeTravelOfflineFarm
  };
}
