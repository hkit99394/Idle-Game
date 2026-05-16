import type { SkillDefinition, SkillUpgradeDefinition } from "../data";
import { cloneProgress } from "./progress";
import type {
  PlayerProgress,
  PurchaseSkillUpgradeInput,
  PurchaseSkillUpgradeResult
} from "./types";

export function calculateSkillUpgradeCost(
  upgrade: Pick<SkillUpgradeDefinition, "baseCost" | "costGrowth">,
  currentLevel: number
): number {
  return Math.floor(upgrade.baseCost * upgrade.costGrowth ** currentLevel);
}

export function getSkillUpgradeLevel(
  progress: PlayerProgress,
  upgradeId: string
): number {
  return progress.skillUpgrades?.[upgradeId] ?? 0;
}

export function purchaseSkillUpgrade(
  skillUpgrades: SkillUpgradeDefinition[],
  input: PurchaseSkillUpgradeInput
): PurchaseSkillUpgradeResult {
  const upgrade = skillUpgrades.find(
    (candidate) => candidate.id === input.skillUpgradeId
  );

  if (!upgrade) {
    return {
      ok: false,
      reason: "missing_skill_upgrade",
      progress: input.progress
    };
  }

  const currentLevel = getSkillUpgradeLevel(input.progress, upgrade.id);

  if (currentLevel >= upgrade.maxLevel) {
    return {
      ok: false,
      reason: "max_level",
      progress: input.progress
    };
  }

  const cost = calculateSkillUpgradeCost(upgrade, currentLevel);

  if (input.progress.resources.resonance < cost) {
    return {
      ok: false,
      reason: "not_enough_cultivation",
      progress: input.progress,
      cost
    };
  }

  const nextProgress = cloneProgress(input.progress);

  nextProgress.resources.resonance -= cost;
  nextProgress.skillUpgrades = {
    ...nextProgress.skillUpgrades,
    [upgrade.id]: currentLevel + 1
  };

  return {
    ok: true,
    progress: nextProgress,
    cost,
    newLevel: currentLevel + 1
  };
}

export function getSkillUpgradeLevelsForBattle(
  skillUpgrades: SkillUpgradeDefinition[],
  progress: PlayerProgress
): Record<string, number> {
  return Object.fromEntries(
    skillUpgrades.flatMap((upgrade) => {
      const level = getSkillUpgradeLevel(progress, upgrade.id);

      return level > 0 ? [[upgrade.id, level]] : [];
    })
  );
}

export function applySkillUpgradesToSkill(
  skill: SkillDefinition,
  skillUpgrades: SkillUpgradeDefinition[],
  levels: Record<string, number>
): SkillDefinition {
  let cooldownSeconds = skill.cooldownSeconds;
  let outerMultiplier = skill.outerMultiplier;
  let innerMultiplier = skill.innerMultiplier;
  const effects = [...skill.effects];

  for (const upgrade of skillUpgrades) {
    if (upgrade.skillId !== skill.id) {
      continue;
    }

    const level = levels[upgrade.id] ?? 0;

    if (level <= 0) {
      continue;
    }

    for (const effect of upgrade.effects) {
      switch (effect.type) {
        case "cooldown_seconds":
          cooldownSeconds += effect.valuePerLevel * level;
          break;

        case "outer_multiplier":
          outerMultiplier += effect.valuePerLevel * level;
          break;

        case "inner_multiplier":
          innerMultiplier += effect.valuePerLevel * level;
          break;

        case "add_skill_effect":
          if (level >= effect.unlockLevel) {
            effects.push(effect.effect);
          }
          break;
      }
    }
  }

  return {
    ...skill,
    cooldownSeconds: Math.max(0, cooldownSeconds),
    outerMultiplier: Math.max(0, outerMultiplier),
    innerMultiplier: Math.max(0, innerMultiplier),
    effects
  };
}
