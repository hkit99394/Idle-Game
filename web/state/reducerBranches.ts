import {
  DEFAULT_OFFLINE_FARM_PRESET,
  getStageById,
  isPreBattleResistanceMode,
  isStageUnlocked,
  normalizeOfflineFarmPreset,
  setMedicineAutoUsePreference,
  setOfflineFarmStageTarget,
  setPlayerFormationSlot
} from "../../core";
import type {
  OfflineFarmPreset,
  PlayerProgress,
  StaticGameData
} from "../../core";
import type {
  AssignmentAction,
  CounterplayAction,
  EquipmentAction,
  ProgressionAction,
  RosterFormationAction,
  SaveStateAction,
  StageIdleAction
} from "./actions";
import type { WebGameState } from "./types";

export function getDefaultFarmStageId(
  data: StaticGameData,
  progress: PlayerProgress,
  preset: OfflineFarmPreset = DEFAULT_OFFLINE_FARM_PRESET
): string | null {
  return setOfflineFarmStageTarget(data, progress, null, preset);
}

export function normalizeFarmStageId(
  data: StaticGameData,
  progress: PlayerProgress,
  selectedStageId: string | null,
  preset: OfflineFarmPreset
): string | null {
  return setOfflineFarmStageTarget(data, progress, selectedStageId, preset);
}

export function normalizeSelectedStageId(
  data: StaticGameData,
  progress: PlayerProgress,
  selectedStageId: string
): string {
  const selectedStage = getStageById(data, selectedStageId);

  return selectedStage && isStageUnlocked(data, progress, selectedStage)
    ? selectedStage.id
    : progress.currentStageId;
}

function clearTransientActionState(
  state: WebGameState,
  overrides: Partial<WebGameState> = {}
): WebGameState {
  return {
    ...state,
    lastBattle: null,
    lastBattleStageId: null,
    lastPurchase: null,
    lastSkillPurchase: null,
    lastEquipmentAction: null,
    lastStyleBranchAction: null,
    lastActiveTeamAction: null,
    lastAssignmentAction: null,
    ...overrides
  };
}

export function reduceStageIdleAction(
  data: StaticGameData,
  state: WebGameState,
  action: StageIdleAction
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

    case "battle_resolved": {
      const nextProgress = action.result.ok
        ? action.result.progress
        : state.progress;
      const selectedStageId = state.selectedStageId;

      return clearTransientActionState(state, {
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
        lastBattleStageId: action.stageId
      });
    }

    case "dismiss_offline_summary":
      return {
        ...state,
        offlineSummary: null
      };
  }
}

export function reduceProgressionAction(
  data: StaticGameData,
  state: WebGameState,
  action: ProgressionAction
): WebGameState {
  switch (action.type) {
    case "purchase_resolved": {
      const nextProgress = action.result.ok
        ? action.result.progress
        : state.progress;

      return clearTransientActionState(state, {
        progress: nextProgress,
        selectedOfflineFarmStageId: normalizeFarmStageId(
          data,
          nextProgress,
          state.selectedOfflineFarmStageId,
          state.offlineFarmPreset
        ),
        lastPurchase: action.result
      });
    }

    case "skill_purchase_resolved": {
      const nextProgress = action.result.ok
        ? action.result.progress
        : state.progress;

      return clearTransientActionState(state, {
        progress: nextProgress,
        lastSkillPurchase: action.result
      });
    }

    case "style_branch_select_resolved": {
      const nextProgress = action.result.ok
        ? action.result.progress
        : state.progress;

      return clearTransientActionState(state, {
        progress: nextProgress,
        lastStyleBranchAction: action.result
      });
    }
  }
}

export function reduceEquipmentAction(
  state: WebGameState,
  action: EquipmentAction
): WebGameState {
  const nextProgress = action.result.ok
    ? action.result.progress
    : state.progress;

  return clearTransientActionState(state, {
    progress: nextProgress,
    lastEquipmentAction: action.result
  });
}

export function reduceRosterFormationAction(
  data: StaticGameData,
  state: WebGameState,
  action: RosterFormationAction
): WebGameState {
  switch (action.type) {
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

      return clearTransientActionState(state, {
        progress: result.progress
      });
    }

    case "active_team_update_resolved": {
      const nextProgress = action.result.ok
        ? action.result.progress
        : state.progress;

      return clearTransientActionState(state, {
        progress: nextProgress,
        lastActiveTeamAction: action.result
      });
    }
  }
}

export function reduceAssignmentAction(
  state: WebGameState,
  action: AssignmentAction
): WebGameState {
  const nextProgress = action.result.ok
    ? action.result.progress
    : state.progress;

  return clearTransientActionState(state, {
    progress: nextProgress,
    lastAssignmentAction: action.result
  });
}

export function reduceCounterplayAction(
  data: StaticGameData,
  state: WebGameState,
  action: CounterplayAction
): WebGameState {
  switch (action.type) {
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
  }
}

export function reduceSaveStateAction(
  data: StaticGameData,
  state: WebGameState,
  action: SaveStateAction
): WebGameState {
  switch (action.type) {
    case "replace_progress":
      return clearTransientActionState(state, {
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
        )
      });

    case "replace_state":
      return action.state;
  }
}
