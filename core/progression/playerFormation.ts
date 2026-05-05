import { isFormationSlot } from "../combat";
import type { FormationSlot } from "../combat";
import type { StaticGameData } from "../data";
import type { PlayerProgress } from "./types";
import { cloneProgress } from "./progress";
import {
  createDefaultPlayerFormation,
  getDefaultPlayerFormationSlot
} from "./playerFormationDefaults";

export type SetPlayerFormationSlotResult =
  | {
      ok: true;
      progress: PlayerProgress;
    }
  | {
      ok: false;
      reason: "missing_hero" | "invalid_slot";
      progress: PlayerProgress;
    };

export function getPlayerFormationSlot(
  progress: PlayerProgress,
  heroId: string,
  heroIndex: number
): FormationSlot {
  const savedSlot = progress.formation?.[heroId];

  return isFormationSlot(savedSlot)
    ? savedSlot
    : getDefaultPlayerFormationSlot(heroId, heroIndex);
}

export function setPlayerFormationSlot(
  data: Pick<StaticGameData, "heroes">,
  progress: PlayerProgress,
  heroId: string,
  slot: FormationSlot
): SetPlayerFormationSlotResult {
  if (!isFormationSlot(slot)) {
    return {
      ok: false,
      reason: "invalid_slot",
      progress
    };
  }

  if (!data.heroes.some((hero) => hero.id === heroId)) {
    return {
      ok: false,
      reason: "missing_hero",
      progress
    };
  }

  const nextProgress = cloneProgress(progress);

  nextProgress.formation = {
    ...createDefaultPlayerFormation(data.heroes.map((hero) => hero.id)),
    ...nextProgress.formation,
    [heroId]: slot
  };

  return {
    ok: true,
    progress: nextProgress
  };
}
