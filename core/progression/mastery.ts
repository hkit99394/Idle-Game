import type { MasteryBonus, MasteryThreshold } from "../data";

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

export function getReachedMasteryRanks(
  combatExperience: number,
  thresholds: MasteryThreshold[]
): string[] {
  return getReachedMasteryThresholds(combatExperience, thresholds).map(
    (threshold) => threshold.rank
  );
}

export function getReachedMasteryBonuses(
  combatExperience: number,
  thresholds: MasteryThreshold[]
): MasteryBonus[] {
  return getReachedMasteryThresholds(combatExperience, thresholds).flatMap(
    (threshold) => threshold.bonuses
  );
}

export function getMapAttackMultiplier(
  combatExperience: number,
  thresholds: MasteryThreshold[]
): number {
  return getReachedMasteryBonuses(combatExperience, thresholds)
    .filter((bonus) => bonus.type === "map_outer_and_inner_attack_multiplier")
    .reduce((total, bonus) => total + bonus.value, 0);
}

export function getMapRewardMultiplier(
  combatExperience: number,
  thresholds: MasteryThreshold[]
): number {
  return getReachedMasteryBonuses(combatExperience, thresholds)
    .filter((bonus) => bonus.type === "map_reward_multiplier")
    .reduce((total, bonus) => total + bonus.value, 0);
}

export function getEnemyFamilyDamageMultiplier(
  combatExperience: number,
  thresholds: MasteryThreshold[]
): number {
  return getReachedMasteryBonuses(combatExperience, thresholds)
    .filter((bonus) => bonus.type === "enemy_family_damage_multiplier")
    .reduce((total, bonus) => total + bonus.value, 0);
}
