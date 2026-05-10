import {
  calculateSkillUpgradeCost,
  calculateUpgradeCost,
  getSkillUpgradeLevel,
  getStageById,
  getStyleMasteryExperience,
  getStyleMasteryLevel,
  getUpgradeLevel,
  isHeroUnlocked,
  isStyleBranchUnlocked,
  STYLE_MASTERY_EXPERIENCE_PER_LEVEL
} from "../../../core";
import type {
  ActiveMasterySummary,
  MasteryBonus,
  PlayerProgress,
  StaticGameData
} from "../../../core";
import type {
  MasteryPanelView,
  MasteryRankTone,
  MasteryRankView,
  SkillUpgradeView,
  StyleMasteryView,
  UpgradeView
} from "./progressionTypes";

function formatStatName(stat: string): string {
  return stat.replace(/[A-Z]/g, (match) => ` ${match}`).replace(/^./, (match) =>
    match.toUpperCase()
  );
}

function formatPerLevelEffect(
  stat: string,
  value: number,
  mode: "multiplier" | "flat" = "multiplier"
): string {
  if (mode === "flat") {
    const formattedValue =
      stat === "statusResistance"
        ? formatMasteryPercent(value)
        : `${value >= 0 ? "+" : ""}${value}`;
    return `${formattedValue} ${formatStatName(stat)} per level`;
  }

  return `${formatMasteryPercent(value)} ${formatStatName(stat)} per level`;
}

function getUnlockedHeroDefinitions(
  data: StaticGameData,
  progress: PlayerProgress
): StaticGameData["heroes"] {
  return data.heroes.filter((hero) => isHeroUnlocked(data, progress, hero));
}

export function buildUpgradeViews(
  data: StaticGameData,
  progress: PlayerProgress
): UpgradeView[] {
  const buildUpgradeView = (
    upgrade: StaticGameData["upgrades"][number],
    level: number,
    cost: number,
    missingSilver: number,
    key: string,
    targetName: string,
    heroId?: string
  ): UpgradeView => ({
    key,
    upgradeId: upgrade.id,
    name: upgrade.name,
    scope: upgrade.scope,
    art: upgrade.art,
    heroId,
    targetName,
    effects: upgrade.effects.map((effect) =>
      formatPerLevelEffect(effect.stat, effect.effectPerLevel, effect.mode)
    ),
    level,
    cost,
    affordable: missingSilver === 0,
    missingSilver
  });

  return data.upgrades.flatMap<UpgradeView>((upgrade) => {
    if (upgrade.scope === "sect") {
      const level = getUpgradeLevel(progress, upgrade);
      const cost = calculateUpgradeCost(upgrade, level);
      const missingSilver = Math.max(0, cost - progress.resources.silver);

      return [
        buildUpgradeView(
          upgrade,
          level,
          cost,
          missingSilver,
          `sect:${upgrade.id}`,
          "Sect"
        )
      ];
    }

    return getUnlockedHeroDefinitions(data, progress).map((hero) => {
      const level = getUpgradeLevel(progress, upgrade, hero.id);
      const cost = calculateUpgradeCost(upgrade, level);
      const missingSilver = Math.max(0, cost - progress.resources.silver);

      return buildUpgradeView(
        upgrade,
        level,
        cost,
        missingSilver,
        `${hero.id}:${upgrade.id}`,
        hero.name,
        hero.id
      );
    });
  });
}

function formatSkillUpgradeEffect(
  effect: StaticGameData["skillUpgrades"][number]["effects"][number]
): string {
  switch (effect.type) {
    case "cooldown_seconds":
      return `${effect.valuePerLevel < 0 ? "" : "+"}${effect.valuePerLevel.toFixed(
        2
      )}s cooldown per level`;
    case "outer_multiplier":
      return `${formatMasteryPercent(effect.valuePerLevel)} Outer ratio per level`;
    case "inner_multiplier":
      return `${formatMasteryPercent(effect.valuePerLevel)} Inner ratio per level`;
    case "add_skill_effect":
      return `Adds ${effect.effect.type.replaceAll("_", " ")} at level ${effect.unlockLevel}`;
  }
}

export function buildSkillUpgradeViews(
  data: StaticGameData,
  progress: PlayerProgress
): SkillUpgradeView[] {
  const unlockedSkillIds = new Set(
    getUnlockedHeroDefinitions(data, progress).flatMap((hero) => hero.skillIds)
  );

  return data.skillUpgrades.flatMap((upgrade) => {
    if (!unlockedSkillIds.has(upgrade.skillId)) {
      return [];
    }

    const skill = data.skills.find((candidate) => candidate.id === upgrade.skillId);
    const level = getSkillUpgradeLevel(progress, upgrade.id);
    const isMaxLevel = level >= upgrade.maxLevel;
    const cost = isMaxLevel ? 0 : calculateSkillUpgradeCost(upgrade, level);
    const missingCultivation = Math.max(
      0,
      cost - progress.resources.cultivation
    );

    return [
      {
        key: upgrade.id,
        skillUpgradeId: upgrade.id,
        skillId: upgrade.skillId,
        name: upgrade.name,
        skillName: skill?.name ?? upgrade.skillId,
        level,
        maxLevel: upgrade.maxLevel,
        cost,
        affordable: !isMaxLevel && missingCultivation === 0,
        missingCultivation,
        effects: upgrade.effects.map(formatSkillUpgradeEffect)
      }
    ];
  });
}


function formatMasteryPercent(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    signDisplay: "always",
    style: "percent"
  }).format(value);
}

function formatMasteryBonus(bonus: MasteryBonus): string {
  switch (bonus.type) {
    case "map_outer_and_inner_attack_multiplier":
      return `${formatMasteryPercent(bonus.value)} Outer and Inner attack`;
    case "map_reward_multiplier":
      return `${formatMasteryPercent(bonus.value)} stage rewards`;
    case "enemy_family_damage_multiplier":
      return `${formatMasteryPercent(bonus.value)} damage to enemy family`;
  }
}

function getMasteryRankTone(rank: string): MasteryRankTone {
  switch (rank) {
    case "familiar":
      return "familiar";
    case "trained":
      return "trained";
    case "mastered":
      return "mastered";
    default:
      return "unfamiliar";
  }
}

function formatMasteryRankLabel(rank: string): string {
  const words = rank
    .replace(/[-_]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "Unfamiliar";
  }

  return words
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function buildMasteryRankView(rank: string): MasteryRankView {
  return {
    rank,
    label: formatMasteryRankLabel(rank),
    tone: getMasteryRankTone(rank)
  };
}

export function buildMasteryPanel(
  data: StaticGameData,
  summary: ActiveMasterySummary | null
): MasteryPanelView | null {
  if (!summary) {
    return null;
  }

  const region = data.regions.find(
    (candidate) => candidate.id === summary.regionId
  );
  const nextThreshold = summary.nextThreshold
    ? {
        experience: summary.nextThreshold.experience,
        rank: summary.nextThreshold.rank,
        remainingExperience: Math.max(
          0,
          summary.nextThreshold.experience - summary.combatExperience
        )
      }
    : null;
  const progressTargetExperience =
    nextThreshold?.experience ??
    data.mastery.thresholds.at(-1)?.experience ??
    summary.combatExperience;

  return {
    regionId: summary.regionId,
    regionName: region?.name ?? summary.regionId,
    combatExperience: summary.combatExperience,
    reachedRanks: summary.reachedRanks.map(buildMasteryRankView),
    nextThreshold,
    activeBonuses: summary.activeBonuses.map((bonus, index) => ({
      key: `${bonus.type}-${bonus.value}-${index}`,
      label: formatMasteryBonus(bonus)
    })),
    progressPercent:
      progressTargetExperience > 0
        ? Math.min(summary.combatExperience / progressTargetExperience, 1)
        : 0
  };
}

function formatStyleBranchRequirement(
  data: StaticGameData,
  branch: StaticGameData["styles"][number]["branches"][number]
): string {
  const unlock = branch.unlock;

  switch (unlock.type) {
    case "always":
      return "Available";
    case "stage_cleared":
      return `Clear ${
        getStageById(data, unlock.stageId)?.name ?? unlock.stageId
      }`;
    case "hero_level":
      return `${
        data.heroes.find((hero) => hero.id === unlock.heroId)?.name ??
        unlock.heroId
      } level ${unlock.level}`;
    case "style_mastery_level":
      return `${
        data.styles.find((style) => style.id === unlock.styleId)?.name ??
        unlock.styleId
      } mastery ${unlock.level}`;
  }
}

function formatStyleBranchEffect(
  effect: StaticGameData["styles"][number]["branches"][number]["effects"][number]
): string {
  switch (effect.type) {
    case "stat_multiplier":
      return `${formatMasteryPercent(effect.value)} ${formatStatName(effect.stat)}`;
  }
}

export function buildStyleMasteryViews(
  data: StaticGameData,
  progress: PlayerProgress
): StyleMasteryView[] {
  return data.styles.map((style) => {
    const experience = getStyleMasteryExperience(progress, style.id);
    const level = getStyleMasteryLevel(progress, style.id);
    const currentLevelExperience = level * STYLE_MASTERY_EXPERIENCE_PER_LEVEL;
    const nextLevelExperience = (level + 1) * STYLE_MASTERY_EXPERIENCE_PER_LEVEL;
    const progressPercent = Math.min(
      Math.max(
        (experience - currentLevelExperience) /
          (nextLevelExperience - currentLevelExperience),
        0
      ),
      1
    );

    return {
      styleId: style.id,
      name: style.name,
      level,
      experience,
      nextLevelExperience,
      progressPercent,
      bonuses: style.bonuses.map((bonus) =>
        formatPerLevelEffect(bonus.stat, bonus.effectPerLevel)
      ),
      branches: style.branches.map((branch) => {
        const isUnlocked = isStyleBranchUnlocked(data, progress, branch);
        const isSelected = progress.styleBranches?.[style.id] === branch.id;

        return {
          id: branch.id,
          name: branch.name,
          isUnlocked,
          isSelected,
          canSelect: isUnlocked && !isSelected,
          hiddenInMvp: branch.hiddenInMvp,
          requirement: formatStyleBranchRequirement(data, branch),
          effects: branch.effects.map(formatStyleBranchEffect)
        };
      })
    };
  });
}
