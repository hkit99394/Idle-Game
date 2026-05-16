import type { Dispatch } from "react";
import type { StaticGameData } from "../../core";
import type { WebGameAction } from "./actions";
import {
  useAssignmentCommands,
  useCounterplayCommands,
  useEquipmentCommands,
  useProgressionCommands,
  useRosterFormationCommands,
  useSaveToolCommands,
  useStrategyCommands,
  useStageIdleCommands
} from "./useWebGameCommandDomains";
import type { WebGameState } from "./types";

type UseWebGameCommandsInput = {
  data: StaticGameData;
  dispatch: Dispatch<WebGameAction>;
  dispatchAndPersist: (action: WebGameAction) => void;
  state: WebGameState;
};

export function useWebGameCommands({
  data,
  dispatch,
  dispatchAndPersist,
  state
}: UseWebGameCommandsInput) {
  const stageIdleCommands = useStageIdleCommands({
    data,
    dispatch,
    dispatchAndPersist,
    state: {
      autoMedicinePreferences: state.autoMedicinePreferences,
      progress: state.progress,
      selectedStageId: state.selectedStageId
    }
  });
  const progressionCommands = useProgressionCommands({
    data,
    dispatchAndPersist,
    progress: state.progress
  });
  const strategyCommands = useStrategyCommands({
    data,
    dispatchAndPersist,
    progress: state.progress
  });
  const equipmentCommands = useEquipmentCommands({
    data,
    dispatchAndPersist,
    progress: state.progress
  });
  const rosterFormationCommands = useRosterFormationCommands({
    data,
    dispatchAndPersist,
    progress: state.progress
  });
  const assignmentCommands = useAssignmentCommands({
    data,
    dispatchAndPersist,
    progress: state.progress
  });
  const counterplayCommands = useCounterplayCommands({
    dispatchAndPersist
  });
  const saveToolCommands = useSaveToolCommands({
    data,
    dispatch,
    state: {
      autoMedicinePreferences: state.autoMedicinePreferences,
      offlineFarmPreset: state.offlineFarmPreset,
      progress: state.progress,
      selectedOfflineFarmRouteId: state.selectedOfflineFarmRouteId
    }
  });

  return {
    ...stageIdleCommands,
    ...progressionCommands,
    ...strategyCommands,
    ...equipmentCommands,
    ...rosterFormationCommands,
    ...assignmentCommands,
    ...counterplayCommands,
    ...saveToolCommands
  };
}
