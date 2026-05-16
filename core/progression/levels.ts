export {
  LEVEL_STAT_GROWTH,
  scaleStatsForLevel
} from "../combat";
import type { PlayerProgress } from "./types";

export const BASE_COMBAT_EXPERIENCE_PER_LEVEL = 100;

function normalizeLevel(level: number): number {
  return Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
}

export function calculateCombatExperienceRequiredForLevel(level: number): number {
  const completedLevelUps = normalizeLevel(level) - 1;

  return (
    BASE_COMBAT_EXPERIENCE_PER_LEVEL *
    completedLevelUps *
    (completedLevelUps + 1) /
    2
  );
}

export function calculateCombatExperienceRequiredForNextLevel(
  level: number
): number {
  return BASE_COMBAT_EXPERIENCE_PER_LEVEL * normalizeLevel(level);
}

export function calculateLevelFromCombatExperience(
  combatExperience: number
): number {
  const safeCombatExperience = Number.isFinite(combatExperience)
    ? Math.max(0, combatExperience)
    : 0;

  const completedLevelUps = Math.floor(
    (Math.sqrt(
      1 + (8 * safeCombatExperience) / BASE_COMBAT_EXPERIENCE_PER_LEVEL
    ) - 1) / 2
  );

  return completedLevelUps + 1;
}

export function calculateTotalCombatExperience(progress: PlayerProgress): number {
  return Object.values(progress.districts).reduce(
    (total, districtProgress) => total + districtProgress.combatData,
    0
  );
}

export function calculatePlayerLevel(progress: PlayerProgress): number {
  return calculateLevelFromCombatExperience(
    calculateTotalCombatExperience(progress)
  );
}

export function syncHeroLevelsWithCombatExperience(
  progress: PlayerProgress
): void {
  const level = calculatePlayerLevel(progress);

  for (const heroProgress of Object.values(progress.heroes)) {
    heroProgress.level = level;
  }
}
