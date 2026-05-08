import { calculateEffectiveStatusResistance } from "../combat";
import type { StaticGameData } from "../data";
import type { PlayerProgress } from "./types";

export const LOTUS_PURITY_TRAINING_UPGRADE_ID = "lotus_purity_training";

export type LotusSupportGrowthContribution = {
  upgradeId: string;
  name: string;
  level: number;
  resistanceBonus: number;
  nextResistanceBonus: number;
  effectiveResistanceBonus: number;
  isActive: boolean;
  contributionText: string;
};

export function getLotusSupportGrowthContribution(
  data: Pick<StaticGameData, "upgrades">,
  progress: Pick<PlayerProgress, "sect">
): LotusSupportGrowthContribution | null {
  const upgrade = data.upgrades.find(
    (candidate) => candidate.id === LOTUS_PURITY_TRAINING_UPGRADE_ID
  );

  if (upgrade === undefined) {
    return null;
  }

  const level = progress.sect.upgrades[upgrade.id] ?? 0;
  const nextResistanceBonus = upgrade.effects
    .filter(
      (effect) =>
        effect.stat === "statusResistance" &&
        (effect.mode ?? "multiplier") === "flat"
    )
    .reduce((total, effect) => total + effect.effectPerLevel, 0);
  const resistanceBonus = nextResistanceBonus * level;
  const effectiveResistanceBonus = calculateEffectiveStatusResistance(
    0,
    resistanceBonus
  );
  const isActive = level > 0 && resistanceBonus > 0;

  return {
    upgradeId: upgrade.id,
    name: upgrade.name,
    level,
    resistanceBonus,
    nextResistanceBonus,
    effectiveResistanceBonus,
    isActive,
    contributionText: isActive
      ? `${upgrade.name} Lv ${level} adds ${formatPercent(
          effectiveResistanceBonus
        )} team status resistance before the cap.`
      : `${upgrade.name} adds ${formatPercent(
          nextResistanceBonus
        )} team status resistance per level.`
  };
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
