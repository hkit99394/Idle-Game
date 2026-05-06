import type { CombatRole, MartialStyleId } from "../combat";
import type { AssignmentDefinition, HeroDefinition, StaticGameData } from "../data";
import { cloneProgress } from "./progress";
import { getStageById, hasClearedStage } from "./stages";
import { getStyleMasteryLevel } from "./styleMastery";
import type { AssignmentProgress, PlayerProgress } from "./types";

export type SetAssignmentHeroesInput = {
  progress: PlayerProgress;
  assignmentId: string;
  heroIds: string[];
};

export type SetAssignmentHeroesResult =
  | {
      ok: true;
      progress: PlayerProgress;
      assignmentId: string;
      heroIds: string[];
    }
  | {
      ok: false;
      reason:
        | "missing_assignment"
        | "locked_assignment"
        | "missing_hero"
        | "duplicate_hero"
        | "hero_already_assigned"
        | "ineligible_hero";
      progress: PlayerProgress;
    };

export function getAssignmentProgress(
  progress: PlayerProgress
): AssignmentProgress {
  return progress.assignments ?? {};
}

export function getAssignedHeroIds(progress: PlayerProgress): string[] {
  return Object.values(getAssignmentProgress(progress)).flatMap(
    (assignment) => assignment.heroIds
  );
}

export function getAssignmentById(
  data: Pick<StaticGameData, "assignments">,
  assignmentId: string
): AssignmentDefinition | null {
  return (
    (data.assignments ?? []).find(
      (assignment) => assignment.id === assignmentId
    ) ?? null
  );
}

export function isAssignmentUnlocked(
  data: Pick<StaticGameData, "stages">,
  progress: PlayerProgress,
  assignment: AssignmentDefinition
): boolean {
  const unlock = assignment.unlockCondition;

  switch (unlock.type) {
    case "always":
      return true;

    case "stage_cleared": {
      const stage = getStageById(data, unlock.stageId);

      return stage ? hasClearedStage(progress, stage) : false;
    }

    case "hero_level":
      return (progress.heroes[unlock.heroId]?.level ?? 0) >= unlock.level;

    case "style_mastery_level":
      return getStyleMasteryLevel(progress, unlock.styleId) >= unlock.level;
  }
}

export function isHeroEligibleForAssignment(
  assignment: Pick<AssignmentDefinition, "allowedRoles" | "allowedStyles">,
  hero: Pick<HeroDefinition, "combatRole" | "style">
): boolean {
  return (
    assignment.allowedRoles.includes(hero.combatRole as CombatRole) &&
    assignment.allowedStyles.includes(hero.style as MartialStyleId)
  );
}

export function getHeroAssignmentId(
  progress: PlayerProgress,
  heroId: string
): string | null {
  for (const [assignmentId, assignment] of Object.entries(
    getAssignmentProgress(progress)
  )) {
    if (assignment.heroIds.includes(heroId)) {
      return assignmentId;
    }
  }

  return null;
}

export function setAssignmentHeroes(
  data: Pick<StaticGameData, "assignments" | "heroes" | "stages">,
  input: SetAssignmentHeroesInput
): SetAssignmentHeroesResult {
  const assignment = getAssignmentById(data, input.assignmentId);

  if (!assignment) {
    return {
      ok: false,
      reason: "missing_assignment",
      progress: input.progress
    };
  }

  if (!isAssignmentUnlocked(data, input.progress, assignment)) {
    return {
      ok: false,
      reason: "locked_assignment",
      progress: input.progress
    };
  }

  const heroById = new Map(data.heroes.map((hero) => [hero.id, hero]));
  const requestedHeroIds = [...new Set(input.heroIds)];

  if (requestedHeroIds.length !== input.heroIds.length) {
    return {
      ok: false,
      reason: "duplicate_hero",
      progress: input.progress
    };
  }

  for (const heroId of requestedHeroIds) {
    const hero = heroById.get(heroId);

    if (!hero) {
      return {
        ok: false,
        reason: "missing_hero",
        progress: input.progress
      };
    }

    if (!isHeroEligibleForAssignment(assignment, hero)) {
      return {
        ok: false,
        reason: "ineligible_hero",
        progress: input.progress
      };
    }

    const currentAssignmentId = getHeroAssignmentId(input.progress, heroId);

    if (
      currentAssignmentId !== null &&
      currentAssignmentId !== input.assignmentId
    ) {
      return {
        ok: false,
        reason: "hero_already_assigned",
        progress: input.progress
      };
    }
  }

  const nextProgress = cloneProgress(input.progress);
  nextProgress.assignments = { ...(nextProgress.assignments ?? {}) };

  if (requestedHeroIds.length === 0) {
    delete nextProgress.assignments[input.assignmentId];
  } else {
    nextProgress.assignments[input.assignmentId] = {
      heroIds: requestedHeroIds
    };
  }

  return {
    ok: true,
    progress: nextProgress,
    assignmentId: input.assignmentId,
    heroIds: requestedHeroIds
  };
}
