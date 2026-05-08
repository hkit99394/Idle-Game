import {
  ACTIVE_TEAM_SIZE,
  calculateCombatPower,
  calculateSkillUpgradeCost,
  calculateUpgradeCost,
  deriveStats,
  getActiveHeroIds,
  getHeroAssignmentId,
  getSkillUpgradeLevel,
  getStageById,
  getStyleMasteryExperience,
  getStyleMasteryLevel,
  getUpgradeLevel,
  isAssignmentUnlocked,
  isHeroEligibleForAssignment,
  isHeroUnlocked,
  isStyleBranchUnlocked,
  scaleStatsForLevel,
  STYLE_MASTERY_EXPERIENCE_PER_LEVEL
} from "../../../core";
import type {
  ActiveMasterySummary,
  MasteryBonus,
  PlayerProgress,
  StaticGameData
} from "../../../core";
import type {
  AssignmentView,
  MasteryPanelView,
  MasteryRankTone,
  MasteryRankView,
  RosterHeroView,
  SkillUpgradeView,
  StyleMasteryView,
  UpgradeView
} from "../types";
import { calculateSkillSupportCombatPower } from "./battle";

function formatBattleNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
  }).format(Math.max(0, value));
}

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

function formatAssignmentRequirement(
  data: StaticGameData,
  assignment: NonNullable<StaticGameData["assignments"]>[number]
): string {
  const unlock = assignment.unlockCondition;

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

function formatHeroUnlockRequirement(
  data: StaticGameData,
  hero: StaticGameData["heroes"][number]
): string {
  const unlock = hero.unlock;

  switch (unlock.type) {
    case "always":
      return "Available";
    case "stage_cleared":
      return `Clear ${
        getStageById(data, unlock.stageId)?.name ?? unlock.stageId
      }`;
    case "hero_level":
      return `${
        data.heroes.find((candidate) => candidate.id === unlock.heroId)?.name ??
        unlock.heroId
      } level ${unlock.level}`;
    case "style_mastery_level":
      return `${
        data.styles.find((style) => style.id === unlock.styleId)?.name ??
        unlock.styleId
      } mastery ${unlock.level}`;
  }
}

function calculateRosterHeroCombatPower(
  data: StaticGameData,
  progress: PlayerProgress,
  hero: StaticGameData["heroes"][number]
): number {
  const level = progress.heroes[hero.id]?.level ?? 1;
  const stats = deriveStats(scaleStatsForLevel(hero.baseStats, level));

  return Math.round(
    calculateCombatPower(stats) +
      calculateSkillSupportCombatPower(data, hero.skillIds, stats)
  );
}

export function buildRosterHeroViews(
  data: StaticGameData,
  progress: PlayerProgress
): RosterHeroView[] {
  const activeHeroIds = getActiveHeroIds(data, progress);
  const activeHeroIdSet = new Set(activeHeroIds);
  const assignmentNameById = new Map(
    (data.assignments ?? []).map((assignment) => [assignment.id, assignment.name])
  );

  return data.heroes.map((hero) => {
    const unlocked = isHeroUnlocked(data, progress, hero);
    const active = activeHeroIdSet.has(hero.id);
    const assignedAssignmentId = getHeroAssignmentId(progress, hero.id);

    return {
      heroId: hero.id,
      name: hero.name,
      style: hero.style,
      role: hero.role,
      combatRole: hero.combatRole,
      level: progress.heroes[hero.id]?.level ?? 1,
      combatPower: calculateRosterHeroCombatPower(data, progress, hero),
      unlocked,
      active,
      canActivate:
        unlocked && !active && activeHeroIds.length < ACTIVE_TEAM_SIZE,
      canDeactivate: active && activeHeroIds.length > 1,
      lockReason: unlocked ? null : formatHeroUnlockRequirement(data, hero),
      assignedAssignmentName: assignedAssignmentId
        ? assignmentNameById.get(assignedAssignmentId) ?? assignedAssignmentId
        : null
    };
  });
}

function buildAssignmentRewardSummary(
  data: StaticGameData,
  assignment: NonNullable<StaticGameData["assignments"]>[number]
): string[] {
  const rewards = assignment.rewardProfile;
  const equipmentNames = new Map(
    data.equipment.map((equipment) => [equipment.id, equipment.name])
  );
  const details: string[] = [];

  if (rewards.silverPerHour) {
    details.push(`${formatBattleNumber(rewards.silverPerHour)} silver/hour`);
  }

  if (rewards.cultivationPerHour) {
    details.push(
      `${formatBattleNumber(rewards.cultivationPerHour)} cultivation/hour`
    );
  }

  if (rewards.herbsPerHour) {
    details.push(`${formatBattleNumber(rewards.herbsPerHour)} herbs/hour`);
  }

  if (rewards.combatExperiencePerHour) {
    details.push(
      `${formatBattleNumber(rewards.combatExperiencePerHour)} Combat XP/hour`
    );
  }

  if (rewards.styleMasteryExperiencePerHour) {
    details.push(
      `${formatBattleNumber(
        rewards.styleMasteryExperiencePerHour
      )} style mastery/hour`
    );
  }

  for (const reward of rewards.equipmentRewardsPerHour ?? []) {
    details.push(
      `${reward.quantityPerHour}/hour ${
        equipmentNames.get(reward.equipmentId) ?? reward.equipmentId
      }`
    );
  }

  return details;
}

export function buildAssignmentViews(
  data: StaticGameData,
  progress: PlayerProgress
): AssignmentView[] {
  const assignmentNameById = new Map(
    (data.assignments ?? []).map((assignment) => [assignment.id, assignment.name])
  );

  return (data.assignments ?? []).map((assignment) => {
    const unlocked = isAssignmentUnlocked(data, progress, assignment);
    const assignedHeroIds =
      progress.assignments?.[assignment.id]?.heroIds ?? [];

    return {
      assignmentId: assignment.id,
      name: assignment.name,
      type: assignment.type,
      durationBucket: assignment.durationBucket,
      unlocked,
      lockReason: unlocked
        ? null
        : formatAssignmentRequirement(data, assignment),
      assignedHeroIds,
      rewardSummary: buildAssignmentRewardSummary(data, assignment),
      heroOptions: getUnlockedHeroDefinitions(data, progress).map((hero) => {
        const assignedAssignmentId = getHeroAssignmentId(progress, hero.id);

        return {
          heroId: hero.id,
          name: hero.name,
          style: hero.style,
          role: hero.combatRole,
          eligible: isHeroEligibleForAssignment(assignment, hero),
          assignedHere: assignedAssignmentId === assignment.id,
          assignedAssignmentName: assignedAssignmentId
            ? assignmentNameById.get(assignedAssignmentId) ?? assignedAssignmentId
            : null
        };
      })
    };
  });
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
