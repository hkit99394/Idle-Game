import type { MartialStyleDefinition, StaticGameData } from "../data";
import { cloneProgress } from "./progress";
import type {
  PlayerProgress,
  SelectStyleBranchInput,
  SelectStyleBranchResult
} from "./types";

export const STYLE_MASTERY_EXPERIENCE_PER_LEVEL = 100;

export function calculateStyleMasteryLevel(experience: number): number {
  return Math.floor(
    Math.max(0, experience) / STYLE_MASTERY_EXPERIENCE_PER_LEVEL
  );
}

export function getStyleMasteryExperience(
  progress: PlayerProgress,
  styleId: string
): number {
  return progress.styleMastery?.[styleId]?.experience ?? 0;
}

export function getStyleMasteryLevel(
  progress: PlayerProgress,
  styleId: string
): number {
  return calculateStyleMasteryLevel(
    getStyleMasteryExperience(progress, styleId)
  );
}

export function addStyleMasteryExperience(
  progress: PlayerProgress,
  styleIds: string[],
  experience: number
): void {
  if (experience <= 0) {
    return;
  }

  progress.styleMastery = progress.styleMastery ?? {};

  for (const styleId of new Set(styleIds)) {
    const current = progress.styleMastery[styleId] ?? { experience: 0 };
    progress.styleMastery[styleId] = {
      experience: current.experience + experience
    };
  }
}

export function applyStyleMasteryBonuses(
  stats: Record<string, number>,
  styleId: string | undefined,
  styleDefinitions: MartialStyleDefinition[] | undefined,
  styleMastery: PlayerProgress["styleMastery"] | undefined
): void {
  if (!styleId || !styleDefinitions || !styleMastery) {
    return;
  }

  const style = styleDefinitions.find((candidate) => candidate.id === styleId);
  const level = calculateStyleMasteryLevel(
    styleMastery[styleId]?.experience ?? 0
  );

  if (!style || level <= 0) {
    return;
  }

  for (const bonus of style.bonuses) {
    stats[bonus.stat] *= 1 + bonus.effectPerLevel * level;
  }
}

export function isStyleBranchUnlocked(
  data: Pick<StaticGameData, "stages">,
  progress: PlayerProgress,
  branch: MartialStyleDefinition["branches"][number]
): boolean {
  const unlock = branch.unlock;

  switch (unlock.type) {
    case "always":
      return true;

    case "stage_cleared": {
      const stage = data.stages.find(
        (candidate) => candidate.id === unlock.stageId
      );

      return stage
        ? (progress.maps[stage.regionId]?.highestClearedStageIndex ?? 0) >= stage.index
        : false;
    }

    case "hero_level":
      return (progress.heroes[unlock.heroId]?.level ?? 0) >= unlock.level;

    case "style_mastery_level":
      return getStyleMasteryLevel(progress, unlock.styleId) >= unlock.level;
  }
}

export function getStyleBranchById(
  style: MartialStyleDefinition,
  branchId: string
): MartialStyleDefinition["branches"][number] | null {
  return style.branches.find((branch) => branch.id === branchId) ?? null;
}

export function getSelectedStyleBranchId(
  progress: PlayerProgress,
  styleId: string
): string | null {
  return progress.styleBranches?.[styleId] ?? null;
}

export function normalizeStyleBranchSelections(
  data: Pick<StaticGameData, "styles" | "stages">,
  progress: PlayerProgress
): PlayerProgress["styleBranches"] {
  const normalized: NonNullable<PlayerProgress["styleBranches"]> = {};
  const selections = progress.styleBranches ?? {};

  for (const style of data.styles) {
    const branchId = selections[style.id];

    if (!branchId) {
      continue;
    }

    const branch = getStyleBranchById(style, branchId);

    if (branch && isStyleBranchUnlocked(data, progress, branch)) {
      normalized[style.id] = branch.id;
    }
  }

  return normalized;
}

export function selectStyleBranch(
  data: Pick<StaticGameData, "styles" | "stages">,
  input: SelectStyleBranchInput
): SelectStyleBranchResult {
  const style = data.styles.find((candidate) => candidate.id === input.styleId);

  if (!style) {
    return {
      ok: false,
      reason: "missing_style",
      progress: input.progress
    };
  }

  const nextProgress = cloneProgress(input.progress);
  const styleBranches = normalizeStyleBranchSelections(data, nextProgress) ?? {};
  nextProgress.styleBranches = styleBranches;

  if (input.branchId === null) {
    delete styleBranches[style.id];

    return {
      ok: true,
      progress: nextProgress,
      styleId: style.id,
      branchId: null
    };
  }

  const branch = getStyleBranchById(style, input.branchId);

  if (!branch) {
    const branchExistsInOtherStyle = data.styles.some((candidate) =>
      candidate.id !== style.id &&
      candidate.branches.some((candidateBranch) => candidateBranch.id === input.branchId)
    );

    return {
      ok: false,
      reason: branchExistsInOtherStyle ? "branch_style_mismatch" : "missing_branch",
      progress: input.progress
    };
  }

  if (!isStyleBranchUnlocked(data, input.progress, branch)) {
    return {
      ok: false,
      reason: "locked_branch",
      progress: input.progress
    };
  }

  styleBranches[style.id] = branch.id;

  return {
    ok: true,
    progress: nextProgress,
    styleId: style.id,
    branchId: branch.id
  };
}

export function applyStyleBranchEffects(
  stats: Record<string, number>,
  styleId: string | undefined,
  styleDefinitions: MartialStyleDefinition[] | undefined,
  styleBranches: PlayerProgress["styleBranches"] | undefined
): void {
  if (!styleId || !styleDefinitions || !styleBranches) {
    return;
  }

  const style = styleDefinitions.find((candidate) => candidate.id === styleId);
  const branchId = styleBranches[styleId];
  const branch = style && branchId ? getStyleBranchById(style, branchId) : null;

  if (!branch) {
    return;
  }

  for (const effect of branch.effects) {
    switch (effect.type) {
      case "stat_multiplier":
        stats[effect.stat] *= 1 + effect.value;
        break;
    }
  }
}
