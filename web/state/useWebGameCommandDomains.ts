import { useCallback } from "react";
import type { Dispatch } from "react";
import type {
  FormationSlot,
  OfflineFarmPreset,
  PreBattleResistanceMode,
  StaticGameData
} from "../../core";
import type { WebGameAction } from "./actions";
import {
  createActiveTeamUpdateResolvedAction,
  createAssignmentUpdateResolvedAction,
  createBattleResolvedAction,
  createDismissOfflineSummaryAction,
  createEquipmentEquipResolvedAction,
  createPurchaseResolvedAction,
  createReplaceStateAction,
  createSelectStageAction,
  createSetAutoMedicineEnabledAction,
  createSetHeroFormationAction,
  createSetMedicineAutoUseAction,
  createSetOfflineFarmPresetAction,
  createSetPreBattleResistanceModeAction,
  createSkillPurchaseResolvedAction,
  createStyleBranchSelectResolvedAction
} from "./commandActions";
import {
  exportBrowserSave,
  importBrowserSave,
  resetBrowserSave,
  timeTravelOfflineFarmSave
} from "./saveToolCommands";
import type {
  EquipGameEquipmentInput,
  PurchaseGameSkillUpgradeInput,
  PurchaseGameUpgradeInput,
  SaveToolResult,
  SelectGameStyleBranchInput,
  SetGameActiveHeroTeamInput,
  SetGameAssignmentHeroesInput,
  WebGameState
} from "./types";

type DispatchAndPersist = (action: WebGameAction) => void;

type StageIdleCommandState = Pick<
  WebGameState,
  "autoMedicinePreferences" | "progress" | "selectedStageId"
>;

type SaveCommandState = Pick<
  WebGameState,
  | "autoMedicinePreferences"
  | "offlineFarmPreset"
  | "progress"
  | "selectedOfflineFarmStageId"
>;

export function useStageIdleCommands({
  data,
  dispatch,
  dispatchAndPersist,
  state
}: {
  data: StaticGameData;
  dispatch: Dispatch<WebGameAction>;
  dispatchAndPersist: DispatchAndPersist;
  state: StageIdleCommandState;
}) {
  const battleSelectedStage = useCallback(() => {
    dispatchAndPersist(createBattleResolvedAction(data, state));
  }, [data, dispatchAndPersist, state]);

  const dismissOfflineSummary = useCallback(() => {
    dispatch(createDismissOfflineSummaryAction());
  }, [dispatch]);

  const selectStage = useCallback(
    (stageId: string) => {
      dispatchAndPersist(createSelectStageAction(stageId));
    },
    [dispatchAndPersist]
  );

  const setOfflineFarmPreset = useCallback(
    (preset: OfflineFarmPreset) => {
      dispatchAndPersist(createSetOfflineFarmPresetAction(preset));
    },
    [dispatchAndPersist]
  );

  return {
    battleSelectedStage,
    dismissOfflineSummary,
    selectStage,
    setOfflineFarmPreset
  };
}

export function useProgressionCommands({
  data,
  dispatchAndPersist,
  progress
}: {
  data: StaticGameData;
  dispatchAndPersist: DispatchAndPersist;
  progress: WebGameState["progress"];
}) {
  const purchaseUpgrade = useCallback(
    (input: PurchaseGameUpgradeInput) => {
      dispatchAndPersist(createPurchaseResolvedAction(data, { progress }, input));
    },
    [data, dispatchAndPersist, progress]
  );

  const purchaseSkillUpgrade = useCallback(
    (input: PurchaseGameSkillUpgradeInput) => {
      dispatchAndPersist(
        createSkillPurchaseResolvedAction(data, { progress }, input)
      );
    },
    [data, dispatchAndPersist, progress]
  );

  const selectStyleBranch = useCallback(
    (input: SelectGameStyleBranchInput) => {
      dispatchAndPersist(
        createStyleBranchSelectResolvedAction(data, { progress }, input)
      );
    },
    [data, dispatchAndPersist, progress]
  );

  return {
    purchaseSkillUpgrade,
    purchaseUpgrade,
    selectStyleBranch
  };
}

export function useEquipmentCommands({
  data,
  dispatchAndPersist,
  progress
}: {
  data: StaticGameData;
  dispatchAndPersist: DispatchAndPersist;
  progress: WebGameState["progress"];
}) {
  const equipEquipment = useCallback(
    (input: EquipGameEquipmentInput) => {
      dispatchAndPersist(
        createEquipmentEquipResolvedAction(data, { progress }, input)
      );
    },
    [data, dispatchAndPersist, progress]
  );

  return { equipEquipment };
}

export function useRosterFormationCommands({
  data,
  dispatchAndPersist,
  progress
}: {
  data: StaticGameData;
  dispatchAndPersist: DispatchAndPersist;
  progress: WebGameState["progress"];
}) {
  const setActiveHeroTeam = useCallback(
    (input: SetGameActiveHeroTeamInput) => {
      dispatchAndPersist(
        createActiveTeamUpdateResolvedAction(data, { progress }, input)
      );
    },
    [data, dispatchAndPersist, progress]
  );

  const setHeroFormation = useCallback(
    (heroId: string, slot: FormationSlot) => {
      dispatchAndPersist(createSetHeroFormationAction(heroId, slot));
    },
    [dispatchAndPersist]
  );

  return {
    setActiveHeroTeam,
    setHeroFormation
  };
}

export function useAssignmentCommands({
  data,
  dispatchAndPersist,
  progress
}: {
  data: StaticGameData;
  dispatchAndPersist: DispatchAndPersist;
  progress: WebGameState["progress"];
}) {
  const setAssignmentHeroes = useCallback(
    (input: SetGameAssignmentHeroesInput) => {
      dispatchAndPersist(
        createAssignmentUpdateResolvedAction(data, { progress }, input)
      );
    },
    [data, dispatchAndPersist, progress]
  );

  return { setAssignmentHeroes };
}

export function useCounterplayCommands({
  dispatchAndPersist
}: {
  dispatchAndPersist: DispatchAndPersist;
}) {
  const setAutoMedicineEnabled = useCallback(
    (enabled: boolean) => {
      dispatchAndPersist(createSetAutoMedicineEnabledAction(enabled));
    },
    [dispatchAndPersist]
  );

  const setMedicineAutoUse = useCallback(
    (medicineId: string, enabled: boolean) => {
      dispatchAndPersist(createSetMedicineAutoUseAction(medicineId, enabled));
    },
    [dispatchAndPersist]
  );

  const setPreBattleResistanceMode = useCallback(
    (mode: PreBattleResistanceMode) => {
      dispatchAndPersist(createSetPreBattleResistanceModeAction(mode));
    },
    [dispatchAndPersist]
  );

  return {
    setAutoMedicineEnabled,
    setMedicineAutoUse,
    setPreBattleResistanceMode
  };
}

export function useSaveToolCommands({
  data,
  dispatch,
  state
}: {
  data: StaticGameData;
  dispatch: Dispatch<WebGameAction>;
  state: SaveCommandState;
}) {
  const exportSave = useCallback(
    (): SaveToolResult => exportBrowserSave(data),
    [data]
  );

  const importSave = useCallback(
    (rawSaveText: string): SaveToolResult => {
      const command = importBrowserSave(data, rawSaveText);

      if (command.state) {
        dispatch(createReplaceStateAction(command.state));
      }

      return command.result;
    },
    [data, dispatch]
  );

  const resetNewGame = useCallback((): SaveToolResult => {
    const command = resetBrowserSave(data);

    if (command.state) {
      dispatch(createReplaceStateAction(command.state));
    }

    return command.result;
  }, [data, dispatch]);

  const timeTravelOfflineFarm = useCallback(
    (offlineSeconds?: number): SaveToolResult => {
      const command = timeTravelOfflineFarmSave(data, state, offlineSeconds);

      if (command.state) {
        dispatch(createReplaceStateAction(command.state));
      }

      return command.result;
    },
    [data, dispatch, state]
  );

  return {
    exportSave,
    importSave,
    resetNewGame,
    timeTravelOfflineFarm
  };
}
