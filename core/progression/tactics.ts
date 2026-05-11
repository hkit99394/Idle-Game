import type { StaticGameData } from "../data";
import { DEFAULT_TACTIC_ID } from "../combat/tactics";
import { cloneProgress } from "./progress";
import type {
  PlayerProgress,
  SelectTacticInput,
  SelectTacticResult
} from "./types";

export function getDefaultSelectedTacticId(
  data: Pick<StaticGameData, "tactics">
): string {
  return (
    data.tactics.find((tactic) => tactic.isDefault)?.id ??
    data.tactics.find((tactic) => tactic.id === DEFAULT_TACTIC_ID)?.id ??
    data.tactics[0]?.id ??
    DEFAULT_TACTIC_ID
  );
}

export function isKnownTacticId(
  data: Pick<StaticGameData, "tactics">,
  tacticId: unknown
): tacticId is string {
  return (
    typeof tacticId === "string" &&
    data.tactics.some((tactic) => tactic.id === tacticId)
  );
}

export function normalizeSelectedTacticId(
  data: Pick<StaticGameData, "tactics">,
  tacticId: unknown
): string {
  return isKnownTacticId(data, tacticId)
    ? tacticId
    : getDefaultSelectedTacticId(data);
}

export function getSelectedTacticId(
  data: Pick<StaticGameData, "tactics">,
  progress: Pick<PlayerProgress, "selectedTacticId">
): string {
  return normalizeSelectedTacticId(data, progress.selectedTacticId);
}

export function selectPlayerTactic(
  data: Pick<StaticGameData, "tactics">,
  input: SelectTacticInput
): SelectTacticResult {
  if (!isKnownTacticId(data, input.tacticId)) {
    return {
      ok: false,
      reason: "missing_tactic",
      progress: input.progress,
      tacticId: input.tacticId
    };
  }

  return {
    ok: true,
    progress: {
      ...cloneProgress(input.progress),
      selectedTacticId: input.tacticId
    },
    tacticId: input.tacticId
  };
}
