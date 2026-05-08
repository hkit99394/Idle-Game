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
import { getActiveHeroIds } from "./playerRoster";
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
    heroId: hero.id,
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
    styleBranches: progress.styleBranches,
    equipmentDefinitions: data.equipment,
    equipmentSetDefinitions: data.equipmentSets,
    equipment: progress.equipment,
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
    combatants: getActiveHeroIds(data, progress).map((heroId, heroIndex) => {
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
    maxDurationSeconds: input.maxDurationSeconds,
    autoMedicine: {
      medicines: data.medicines,
      inventory: input.progress.medicineInventory ?? {},
      preferences: input.autoMedicinePreferences,
      stage,
      enemies: data.enemies,
      skills: data.skills
    }
  });
  const progressAfterBattleMedicine = applyBattleMedicineInventory(
    input.progress,
    battle.autoMedicine.inventory
  );

  if (battle.winner !== "player") {
    return {
      ok: true,
      stageCleared: false,
      progress: progressAfterBattleMedicine,
      battle,
      rewards: null,
      masteryRanksBefore: [],
      masteryRanksAfter: [],
      newlyReachedMasteryRanks: [],
      suggestedFarmStageId:
        getRecommendedOfflineFarmStage(data, input.progress)?.id ?? null,
      equipmentRewards: []
    };
  }

  const rewardsResult = applyStageClearRewards(data, {
    progress: progressAfterBattleMedicine,
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
    suggestedFarmStageId: null,
    equipmentRewards: rewardsResult.equipmentRewards
  };
}

function applyBattleMedicineInventory(
  progress: PlayerProgress,
  medicineInventory: PlayerProgress["medicineInventory"]
): PlayerProgress {
  const currentInventory = progress.medicineInventory ?? {};

  if (isSameMedicineInventory(currentInventory, medicineInventory ?? {})) {
    return progress;
  }

  return {
    ...progress,
    medicineInventory: { ...(medicineInventory ?? {}) }
  };
}

function isSameMedicineInventory(
  left: NonNullable<PlayerProgress["medicineInventory"]>,
  right: NonNullable<PlayerProgress["medicineInventory"]>
): boolean {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);

  for (const key of keys) {
    if ((left[key] ?? 0) !== (right[key] ?? 0)) {
      return false;
    }
  }

  return true;
}
