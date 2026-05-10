import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import type { StaticGameData } from "../../core";
import type { WebGameAction } from "./actions";
import {
  getBrowserSaveStorage,
  saveWebGameStateToStorage,
  WEB_SAVE_AUTOSAVE_INTERVAL_MS
} from "./saveStorage";
import type { WebGameState } from "./types";
import {
  buildSaveDiagnostics,
  getWebGameViewModel
} from "./viewModel";
import {
  createInitialWebGameStateFromStorage,
  webGameStateReducer
} from "./reducer";
import { useWebGameCommands } from "./useWebGameCommands";

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

  const viewModel = useMemo(
    () => getWebGameViewModel(data, state),
    [data, state]
  );
  const saveDiagnostics = useMemo(
    () => buildSaveDiagnostics(data, state),
    [data, state]
  );
  const commands = useWebGameCommands({
    data,
    dispatch,
    dispatchAndPersist,
    state
  });

  return {
    state,
    viewModel,
    saveDiagnostics,
    dispatch,
    ...commands
  };
}
