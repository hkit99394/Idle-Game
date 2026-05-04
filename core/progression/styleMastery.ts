import type { MartialStyleDefinition, StaticGameData } from "../data";
import type { PlayerProgress } from "./types";

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
