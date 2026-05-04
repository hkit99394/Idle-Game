import { useCallback, useMemo, useReducer } from "react";
import {
  createInitialPlayerProgress,
  getActiveMasterySummaryForStage,
  getRecommendedOfflineFarmStage,
  getStageById,
  isOfflineFarmStageUnlocked,
  purchaseUpgrade as purchaseCoreUpgrade,
  resolveStageBattle
} from "../../core";
import type {
  PlayerProgress,
  PurchaseUpgradeInput,
  PurchaseUpgradeResult,
  ResolveStageBattleResult,
  StaticGameData
} from "../../core";

export type WebGameState = {
  progress: PlayerProgress;
  selectedStageId: string;
  selectedOfflineFarmStageId: string | null;
  lastBattle: ResolveStageBattleResult | null;
  lastPurchase: PurchaseUpgradeResult | null;
};

export type WebGameAction =
  | {
      type: "select_stage";
      stageId: string;
    }
  | {
      type: "select_offline_farm_stage";
      stageId: string | null;
    }
  | {
      type: "battle_resolved";
      result: ResolveStageBattleResult;
    }
  | {
      type: "purchase_resolved";
      result: PurchaseUpgradeResult;
    }
  | {
      type: "replace_progress";
      progress: PlayerProgress;
    };

export type PurchaseGameUpgradeInput = Omit<PurchaseUpgradeInput, "progress">;

function getDefaultFarmStageId(
  data: StaticGameData,
  progress: PlayerProgress
): string | null {
  return getRecommendedOfflineFarmStage(data, progress)?.id ?? null;
}

function normalizeFarmStageId(
  data: StaticGameData,
  progress: PlayerProgress,
  selectedStageId: string | null
): string | null {
  if (
    selectedStageId &&
    isOfflineFarmStageUnlocked(data, progress, selectedStageId)
  ) {
    return selectedStageId;
  }

  return getDefaultFarmStageId(data, progress);
}

function normalizeSelectedStageId(
  data: StaticGameData,
  progress: PlayerProgress,
  selectedStageId: string
): string {
  return getStageById(data, selectedStageId)?.id ?? progress.currentStageId;
}

export function createInitialWebGameState(data: StaticGameData): WebGameState {
  const progress = createInitialPlayerProgress(data);

  return {
    progress,
    selectedStageId: progress.currentStageId,
    selectedOfflineFarmStageId: getDefaultFarmStageId(data, progress),
    lastBattle: null,
    lastPurchase: null
  };
}

export function webGameStateReducer(
  data: StaticGameData,
  state: WebGameState,
  action: WebGameAction
): WebGameState {
  switch (action.type) {
    case "select_stage":
      return {
        ...state,
        selectedStageId: normalizeSelectedStageId(
          data,
          state.progress,
          action.stageId
        )
      };

    case "select_offline_farm_stage":
      return {
        ...state,
        selectedOfflineFarmStageId: normalizeFarmStageId(
          data,
          state.progress,
          action.stageId
        )
      };

    case "battle_resolved": {
      const nextProgress = action.result.ok
        ? action.result.progress
        : state.progress;
      const selectedStageId =
        action.result.ok && action.result.stageCleared
          ? nextProgress.currentStageId
          : state.selectedStageId;

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
          state.selectedOfflineFarmStageId
        ),
        lastBattle: action.result,
        lastPurchase: null
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
          state.selectedOfflineFarmStageId
        ),
        lastPurchase: action.result,
        lastBattle: null
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
          state.selectedOfflineFarmStageId
        ),
        lastBattle: null,
        lastPurchase: null
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
    maxDurationSeconds: 180
  });

  return webGameStateReducer(data, state, {
    type: "battle_resolved",
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

export function getWebGameViewModel(
  data: StaticGameData,
  state: WebGameState
) {
  const selectedStage = getStageById(data, state.selectedStageId);
  const enemyId = selectedStage?.enemyTeam.combatantIds[0];
  const enemy = data.enemies.find((candidate) => candidate.id === enemyId) ?? null;
  const selectedOfflineFarmStage = state.selectedOfflineFarmStageId
    ? getStageById(data, state.selectedOfflineFarmStageId)
    : null;
  const masterySummary = getActiveMasterySummaryForStage(
    data,
    state.progress,
    state.selectedStageId
  );

  return {
    progress: state.progress,
    selectedStage,
    selectedOfflineFarmStage,
    enemy,
    masterySummary: masterySummary.ok ? masterySummary.summary : null,
    lastBattle: state.lastBattle,
    lastPurchase: state.lastPurchase
  };
}

export function useWebGameState(data: StaticGameData) {
  const [state, dispatch] = useReducer(
    (currentState: WebGameState, action: WebGameAction) =>
      webGameStateReducer(data, currentState, action),
    data,
    createInitialWebGameState
  );

  const battleSelectedStage = useCallback(() => {
    dispatch({
      type: "battle_resolved",
      result: resolveStageBattle(data, {
        progress: state.progress,
        stageId: state.selectedStageId,
        maxDurationSeconds: 180
      })
    });
  }, [data, state.progress, state.selectedStageId]);

  const purchaseUpgrade = useCallback(
    (input: PurchaseGameUpgradeInput) => {
      dispatch({
        type: "purchase_resolved",
        result: purchaseCoreUpgrade(data.upgrades, {
          progress: state.progress,
          ...input
        })
      });
    },
    [data, state.progress]
  );

  const viewModel = useMemo(
    () => getWebGameViewModel(data, state),
    [data, state]
  );

  return {
    state,
    viewModel,
    dispatch,
    battleSelectedStage,
    purchaseUpgrade
  };
}
