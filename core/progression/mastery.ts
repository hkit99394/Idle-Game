import type { MasteryThreshold } from "../data";

export function getReachedMasteryThresholds(
  combatExperience: number,
  thresholds: MasteryThreshold[]
): MasteryThreshold[] {
  return thresholds.filter((threshold) => combatExperience >= threshold.experience);
}

export function getNextMasteryThreshold(
  combatExperience: number,
  thresholds: MasteryThreshold[]
): MasteryThreshold | null {
  return thresholds.find((threshold) => combatExperience < threshold.experience) ?? null;
}
