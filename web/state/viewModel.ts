import type { StaticGameData } from "../../core";
import type { WebGameState } from "./types";
import { buildWebGameViewModel } from "./viewModels/webGameViewModel";

export { buildSaveDiagnostics } from "./viewModels/saveDiagnostics";

export function getWebGameViewModel(
  data: StaticGameData,
  state: WebGameState
) {
  return buildWebGameViewModel(data, state);
}

export type WebGameViewModel = ReturnType<typeof getWebGameViewModel>;
