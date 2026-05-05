import type { BaseStats } from "../combat";
import type { UpgradeDefinition } from "../data";
import { applyEquipmentBonuses } from "./equipment";
import { scaleStatsForLevel } from "./levels";
import { cloneProgress } from "./progress";
import {
  applyStyleBranchEffects,
  applyStyleMasteryBonuses
} from "./styleMastery";
import type {
  DerivedHeroStatsInput,
  PlayerProgress,
  PurchaseUpgradeInput,
  PurchaseUpgradeResult
} from "./types";

export function calculateUpgradeCost(
  upgrade: Pick<UpgradeDefinition, "baseCost" | "costGrowth">,
  currentLevel: number
): number {
  return Math.floor(upgrade.baseCost * upgrade.costGrowth ** currentLevel);
}

export function getUpgradeLevel(
  progress: PlayerProgress,
  upgrade: UpgradeDefinition,
  heroId?: string
): number {
  if (upgrade.scope === "hero") {
    return heroId ? progress.heroes[heroId]?.upgrades[upgrade.id] ?? 0 : 0;
  }

  return progress.sect.upgrades[upgrade.id] ?? 0;
}

export function purchaseUpgrade(
  upgrades: UpgradeDefinition[],
  input: PurchaseUpgradeInput
): PurchaseUpgradeResult {
  const upgrade = upgrades.find((candidate) => candidate.id === input.upgradeId);

  if (!upgrade) {
    return { ok: false, reason: "missing_upgrade", progress: input.progress };
  }

  if (upgrade.scope === "hero" && !input.heroId) {
    return { ok: false, reason: "missing_hero", progress: input.progress };
  }

  if (upgrade.scope === "hero" && input.heroId && !input.progress.heroes[input.heroId]) {
    return { ok: false, reason: "missing_hero", progress: input.progress };
  }

  if (upgrade.scope === "sect" && input.heroId) {
    return { ok: false, reason: "wrong_scope", progress: input.progress };
  }

  const currentLevel = getUpgradeLevel(input.progress, upgrade, input.heroId);
  const cost = calculateUpgradeCost(upgrade, currentLevel);

  if (input.progress.resources.silver < cost) {
    return {
      ok: false,
      reason: "not_enough_silver",
      progress: input.progress,
      cost
    };
  }

  const nextProgress = cloneProgress(input.progress);
  nextProgress.resources.silver -= cost;

  if (upgrade.scope === "hero") {
    const hero = nextProgress.heroes[input.heroId as string];
    hero.upgrades[upgrade.id] = currentLevel + 1;
  } else {
    nextProgress.sect.upgrades[upgrade.id] = currentLevel + 1;
  }

  return {
    ok: true,
    progress: nextProgress,
    cost,
    newLevel: currentLevel + 1
  };
}

export function formatUpgradeEffectStats(
  effects: Pick<UpgradeDefinition, "effects">["effects"]
): Array<keyof BaseStats> {
  return effects.map((effect) => effect.stat);
}

function applyStatMultiplier(
  stats: BaseStats,
  stat: keyof BaseStats,
  effectPerLevel: number,
  level: number
): void {
  stats[stat] *= 1 + effectPerLevel * level;
}

function applyUpgradeEffects(
  stats: BaseStats,
  upgrade: Pick<UpgradeDefinition, "effects">,
  level: number
): void {
  for (const effect of upgrade.effects) {
    applyStatMultiplier(stats, effect.stat, effect.effectPerLevel, level);
  }
}

export function deriveHeroStatsFromProgress(input: DerivedHeroStatsInput): BaseStats {
  const stats = scaleStatsForLevel(
    input.baseStats,
    input.heroProgress?.level ?? 1
  );

  for (const upgrade of input.heroUpgradeDefinitions) {
    const level = input.heroProgress?.upgrades[upgrade.id] ?? 0;
    applyUpgradeEffects(stats, upgrade, level);
  }

  for (const upgrade of input.sectUpgradeDefinitions) {
    const level = input.sectProgress?.upgrades[upgrade.id] ?? 0;
    applyUpgradeEffects(stats, upgrade, level);
  }

  applyStyleMasteryBonuses(
    stats,
    input.style,
    input.styleDefinitions,
    input.styleMastery
  );
  applyStyleBranchEffects(
    stats,
    input.style,
    input.styleDefinitions,
    input.styleBranches
  );
  applyEquipmentBonuses(
    stats,
    input.equipmentDefinitions,
    input.equipment,
    input.heroId
  );

  const mapAttackMultiplier = input.mapAttackMultiplier ?? 0;
  if (mapAttackMultiplier > 0) {
    stats.outerAttack *= 1 + mapAttackMultiplier;
    stats.innerAttack *= 1 + mapAttackMultiplier;
  }

  return stats;
}
