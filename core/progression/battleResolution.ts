import type { BaseStats, FormationSlot, TeamInstance } from "../combat";
import { simulateBattle } from "../combat";
import { getDefaultFormationSlot, FORMATION_SLOTS } from "../combat";
import type { StaticGameData } from "../data";
import {
  applyStageClearRewards
} from "./rewards";
import {
  getActiveMasterySummaryForStage
} from "./masterySummary";
import {
  getNextCurrentStageId,
  getRecommendedOfflineFarmStage,
  getStageById,
  isStageUnlocked
} from "./stages";
import {
  calculatePlayerLevel,
  scaleStatsForLevel
} from "./levels";
import { getPlayerFormationSlot } from "./playerFormation";
import {
  deriveHeroStatsFromProgress
} from "./upgrades";
import { getSkillUpgradeLevelsForBattle } from "./skillUpgrades";
import type {
  BuildEnemyTeamResult,
  BuildPlayerTeamResult,
  HeroProgress,
  PlayerProgress,
  ResolveStageBattleInput,
  ResolveStageBattleResult
} from "./types";

export const MVP_PLAYER_HERO_IDS = [
  "iron_fist_disciple",
  "azure_palm_monk",
  "white_crane_swordsman",
  "mountain_staff_guardian"
] as const;

function getHeroUpgradeDefinitions(data: StaticGameData) {
  return data.upgrades.filter((upgrade) => upgrade.scope === "hero");
}

function getSectUpgradeDefinitions(data: StaticGameData) {
  return data.upgrades.filter((upgrade) => upgrade.scope === "sect");
}

type PlayerCombatantStatsContext = {
  heroUpgradeDefinitions: ReturnType<typeof getHeroUpgradeDefinitions>;
  sectUpgradeDefinitions: ReturnType<typeof getSectUpgradeDefinitions>;
  mapAttackMultiplier: number;
  playerLevel: number;
};

function getEffectiveHeroProgress(
  progress: PlayerProgress,
  heroId: string,
  playerLevel: number
): HeroProgress {
  const heroProgress = progress.heroes[heroId];

  return {
    level: Math.max(heroProgress?.level ?? 1, playerLevel),
    upgrades: heroProgress?.upgrades ?? {}
  };
}

function getEnemyFormationSlot(
  stage: NonNullable<ReturnType<typeof getStageById>>,
  combatantIndex: number
): FormationSlot {
  const formation = stage.enemyTeam.formation;

  if (formation) {
    for (const slot of FORMATION_SLOTS) {
      if (formation[slot]?.includes(combatantIndex)) {
        return slot;
      }
    }
  }

  return getDefaultFormationSlot(combatantIndex);
}

function createPlayerCombatantStats(
  data: StaticGameData,
  progress: PlayerProgress,
  heroId: string,
  context: PlayerCombatantStatsContext
): BaseStats {
  const hero = data.heroes.find((candidate) => candidate.id === heroId);

  if (!hero) {
    throw new Error(`Missing hero definition ${heroId}`);
  }

  return deriveHeroStatsFromProgress({
    baseStats: hero.baseStats,
    heroProgress: getEffectiveHeroProgress(
      progress,
      hero.id,
      context.playerLevel
    ),
    sectProgress: progress.sect,
    heroUpgradeDefinitions: context.heroUpgradeDefinitions,
    sectUpgradeDefinitions: context.sectUpgradeDefinitions,
    style: hero.style,
    styleDefinitions: data.styles,
    styleMastery: progress.styleMastery,
    mapAttackMultiplier: context.mapAttackMultiplier
  });
}

export function buildPlayerTeamForStage(
  data: StaticGameData,
  progress: PlayerProgress,
  stageId: string
): BuildPlayerTeamResult {
  const stage = getStageById(data, stageId);

  if (!stage) {
    return {
      ok: false,
      reason: "missing_stage"
    };
  }

  const masterySummary = getActiveMasterySummaryForStage(data, progress, stage.id);
  const damageMultipliersByFamily = masterySummary.ok
    ? masterySummary.summary.damageMultipliersByFamily
    : {};
  const playerLevel = calculatePlayerLevel(progress);
  const skillUpgradeLevels = getSkillUpgradeLevelsForBattle(
    data.skillUpgrades,
    progress
  );
  const statsContext: PlayerCombatantStatsContext = {
    heroUpgradeDefinitions: getHeroUpgradeDefinitions(data),
    sectUpgradeDefinitions: getSectUpgradeDefinitions(data),
    mapAttackMultiplier: masterySummary.ok
      ? masterySummary.summary.mapAttackMultiplier
      : 0,
    playerLevel
  };

  const team: TeamInstance = {
    id: "player",
    combatants: MVP_PLAYER_HERO_IDS.map((heroId, heroIndex) => {
      const heroProgress = getEffectiveHeroProgress(progress, heroId, playerLevel);

      return {
        kind: "hero",
        definitionId: heroId,
        formationSlot: getPlayerFormationSlot(progress, heroId, heroIndex),
        level: heroProgress.level,
        statsOverride: createPlayerCombatantStats(
          data,
          progress,
          heroId,
          statsContext
        ),
        skillUpgradeLevels,
        damageMultipliersByFamily
      };
    })
  };

  return {
    ok: true,
    team
  };
}

export function buildEnemyTeamForStage(
  data: StaticGameData,
  stageId: string
): BuildEnemyTeamResult {
  const stage = getStageById(data, stageId);

  if (!stage) {
    return {
      ok: false,
      reason: "missing_stage"
    };
  }

  const enemiesById = new Map(data.enemies.map((enemy) => [enemy.id, enemy]));

  for (const enemyId of stage.enemyTeam.combatantIds) {
    if (!enemiesById.has(enemyId)) {
      return {
        ok: false,
        reason: "missing_enemy",
        missingId: enemyId
      };
    }
  }

  return {
    ok: true,
    team: {
      id: "enemy",
      combatants: stage.enemyTeam.combatantIds.map((enemyId, combatantIndex) => {
        const enemy = enemiesById.get(enemyId);

        if (!enemy) {
          throw new Error(`Missing enemy definition ${enemyId}`);
        }

        return {
          kind: "enemy",
          definitionId: enemyId,
          formationSlot: getEnemyFormationSlot(stage, combatantIndex),
          level: enemy.level,
          statsOverride: scaleStatsForLevel(enemy.baseStats, enemy.level)
        };
      })
    }
  };
}

export function resolveStageBattle(
  data: StaticGameData,
  input: ResolveStageBattleInput
): ResolveStageBattleResult {
  const stage = getStageById(data, input.stageId);

  if (!stage) {
    return {
      ok: false,
      reason: "missing_stage",
      progress: input.progress
    };
  }

  if (!isStageUnlocked(data, input.progress, stage)) {
    return {
      ok: false,
      reason: "locked_stage",
      progress: input.progress
    };
  }

  const playerTeam = buildPlayerTeamForStage(data, input.progress, stage.id);
  if (!playerTeam.ok) {
    return {
      ok: false,
      reason: playerTeam.reason,
      progress: input.progress
    };
  }

  const enemyTeam = buildEnemyTeamForStage(data, stage.id);
  if (!enemyTeam.ok) {
    return {
      ok: false,
      reason: enemyTeam.reason,
      progress: input.progress,
      missingId: enemyTeam.missingId
    };
  }

  const battle = simulateBattle(data, {
    playerTeam: playerTeam.team,
    enemyTeam: enemyTeam.team,
    maxDurationSeconds: input.maxDurationSeconds
  });

  if (battle.winner !== "player") {
    return {
      ok: true,
      stageCleared: false,
      progress: input.progress,
      battle,
      rewards: null,
      masteryRanksBefore: [],
      masteryRanksAfter: [],
      newlyReachedMasteryRanks: [],
      suggestedFarmStageId:
        getRecommendedOfflineFarmStage(data, input.progress)?.id ?? null
    };
  }

  const rewardsResult = applyStageClearRewards(data, {
    progress: input.progress,
    stageId: stage.id
  });

  if (!rewardsResult.ok) {
    return {
      ok: false,
      reason: rewardsResult.reason,
      progress: input.progress
    };
  }

  return {
    ok: true,
    stageCleared: true,
    progress: {
      ...rewardsResult.progress,
      currentStageId: getNextCurrentStageId(
        data,
        stage,
        input.progress.currentStageId,
        rewardsResult.progress
      )
    },
    battle,
    rewards: rewardsResult.rewards,
    masteryRanksBefore: rewardsResult.masteryRanksBefore,
    masteryRanksAfter: rewardsResult.masteryRanksAfter,
    newlyReachedMasteryRanks: rewardsResult.newlyReachedMasteryRanks,
    suggestedFarmStageId: null
  };
}
