import type { BaseStats, TeamInstance } from "../combat";
import { simulateBattle } from "../combat";
import type { StaticGameData } from "../data";
import {
  applyStageClearRewards
} from "./rewards";
import {
  getMapAttackMultiplier
} from "./mastery";
import {
  getNextCurrentStageId,
  getStageById,
  isStageUnlocked
} from "./stages";
import {
  deriveHeroStatsFromProgress
} from "./upgrades";
import type {
  BuildEnemyTeamResult,
  BuildPlayerTeamResult,
  PlayerProgress,
  ResolveStageBattleInput,
  ResolveStageBattleResult
} from "./types";

function getHeroUpgradeDefinitions(data: StaticGameData) {
  return data.upgrades.filter((upgrade) => upgrade.scope === "hero");
}

function getSectUpgradeDefinitions(data: StaticGameData) {
  return data.upgrades.filter((upgrade) => upgrade.scope === "sect");
}

function createPlayerCombatantStats(
  data: StaticGameData,
  progress: PlayerProgress,
  stageId: string,
  heroId: string
): BaseStats {
  const stage = getStageById(data, stageId);
  const hero = data.heroes.find((candidate) => candidate.id === heroId);

  if (!hero) {
    throw new Error(`Missing hero definition ${heroId}`);
  }

  const combatExperience = stage
    ? progress.maps[stage.regionId]?.combatExperience ?? 0
    : 0;

  return deriveHeroStatsFromProgress({
    baseStats: hero.baseStats,
    heroProgress: progress.heroes[hero.id],
    sectProgress: progress.sect,
    heroUpgradeDefinitions: getHeroUpgradeDefinitions(data),
    sectUpgradeDefinitions: getSectUpgradeDefinitions(data),
    mapAttackMultiplier: getMapAttackMultiplier(
      combatExperience,
      data.mastery.thresholds
    )
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

  const team: TeamInstance = {
    id: "player",
    combatants: data.heroes.map((hero) => ({
      kind: "hero",
      definitionId: hero.id,
      statsOverride: createPlayerCombatantStats(data, progress, stage.id, hero.id)
    }))
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

  for (const enemyId of stage.enemyTeam.combatantIds) {
    if (!data.enemies.some((enemy) => enemy.id === enemyId)) {
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
      combatants: stage.enemyTeam.combatantIds.map((enemyId) => ({
        kind: "enemy",
        definitionId: enemyId
      }))
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

  if (!isStageUnlocked(input.progress, stage)) {
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
      newlyReachedMasteryRanks: []
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
      currentStageId: getNextCurrentStageId(stage, input.progress.currentStageId)
    },
    battle,
    rewards: rewardsResult.rewards,
    masteryRanksBefore: rewardsResult.masteryRanksBefore,
    masteryRanksAfter: rewardsResult.masteryRanksAfter,
    newlyReachedMasteryRanks: rewardsResult.newlyReachedMasteryRanks
  };
}
