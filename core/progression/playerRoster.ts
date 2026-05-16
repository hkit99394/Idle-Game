import type { HeroDefinition, StaticGameData, UnlockCondition } from "../data";
import { cloneProgress } from "./progress";
import { getStageById, hasClearedStage } from "./stages";
import { getStyleMasteryLevel } from "./styleMastery";
import type { PlayerProgress } from "./types";
import {
  ACTIVE_TEAM_SIZE,
  createDefaultActiveHeroIds,
  MVP_PLAYER_HERO_IDS
} from "./playerRosterDefaults";

export { ACTIVE_TEAM_SIZE, MVP_PLAYER_HERO_IDS };

export type SetActiveHeroTeamInput = {
  progress: PlayerProgress;
  heroIds: string[];
};

export type SetActiveHeroTeamResult =
  | {
      ok: true;
      progress: PlayerProgress;
      heroIds: string[];
    }
  | {
      ok: false;
      reason:
        | "missing_hero"
        | "locked_hero"
        | "duplicate_hero"
        | "invalid_team_size";
      progress: PlayerProgress;
    };

function isUnlockConditionMet(
  data: Pick<StaticGameData, "heroes" | "stages" | "styles">,
  progress: PlayerProgress,
  unlock: UnlockCondition
): boolean {
  switch (unlock.type) {
    case "always":
      return true;

    case "stage_cleared": {
      const stage = getStageById(data, unlock.stageId);

      return stage && progress.districts
        ? hasClearedStage(progress, stage)
        : false;
    }

    case "hero_level":
      return (progress.heroes?.[unlock.heroId]?.level ?? 0) >= unlock.level;

    case "style_mastery_level":
      return getStyleMasteryLevel(progress, unlock.styleId) >= unlock.level;
  }
}

export function isHeroUnlocked(
  data: Pick<StaticGameData, "heroes" | "stages" | "styles">,
  progress: PlayerProgress,
  heroOrId: HeroDefinition | string
): boolean {
  const hero =
    typeof heroOrId === "string"
      ? data.heroes.find((candidate) => candidate.id === heroOrId)
      : heroOrId;

  return hero ? isUnlockConditionMet(data, progress, hero.unlock) : false;
}

export function getUnlockedHeroes(
  data: Pick<StaticGameData, "heroes" | "stages" | "styles">,
  progress: PlayerProgress
): HeroDefinition[] {
  return data.heroes.filter((hero) => isHeroUnlocked(data, progress, hero));
}

export function getActiveHeroIds(
  data: Pick<StaticGameData, "heroes" | "stages" | "styles">,
  progress: PlayerProgress
): string[] {
  const requestedHeroIds =
    progress.activeHeroIds ??
    createDefaultActiveHeroIds(data.heroes.map((hero) => hero.id));
  const activeHeroIds: string[] = [];

  for (const heroId of requestedHeroIds) {
    if (
      activeHeroIds.length < ACTIVE_TEAM_SIZE &&
      !activeHeroIds.includes(heroId) &&
      isHeroUnlocked(data, progress, heroId)
    ) {
      activeHeroIds.push(heroId);
    }
  }

  if (activeHeroIds.length > 0) {
    return activeHeroIds;
  }

  return getUnlockedHeroes(data, progress)
    .map((hero) => hero.id)
    .slice(0, ACTIVE_TEAM_SIZE);
}

export function setActiveHeroTeam(
  data: Pick<StaticGameData, "heroes" | "stages" | "styles">,
  input: SetActiveHeroTeamInput
): SetActiveHeroTeamResult {
  if (input.heroIds.length < 1 || input.heroIds.length > ACTIVE_TEAM_SIZE) {
    return {
      ok: false,
      reason: "invalid_team_size",
      progress: input.progress
    };
  }

  const requestedHeroIds = [...new Set(input.heroIds)];

  if (requestedHeroIds.length !== input.heroIds.length) {
    return {
      ok: false,
      reason: "duplicate_hero",
      progress: input.progress
    };
  }

  const heroIds = new Set(data.heroes.map((hero) => hero.id));

  for (const heroId of requestedHeroIds) {
    if (!heroIds.has(heroId)) {
      return {
        ok: false,
        reason: "missing_hero",
        progress: input.progress
      };
    }

    if (!isHeroUnlocked(data, input.progress, heroId)) {
      return {
        ok: false,
        reason: "locked_hero",
        progress: input.progress
      };
    }
  }

  const nextProgress = cloneProgress(input.progress);
  nextProgress.activeHeroIds = requestedHeroIds;

  return {
    ok: true,
    progress: nextProgress,
    heroIds: requestedHeroIds
  };
}
