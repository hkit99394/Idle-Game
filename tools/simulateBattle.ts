import {
  calculateUpgradeCost,
  cloneProgress,
  createInitialPlayerProgress,
  getUpgradeLevel,
  getNextMasteryThreshold,
  purchaseUpgrade,
  resolveStageBattle
} from "../core";
import type {
  PlayerProgress,
  ResolveStageBattleResult,
  StaticGameData,
  StageDefinition
} from "../core";
import enemies from "../data/enemies.json" with { type: "json" };
import formations from "../data/formations.json" with { type: "json" };
import heroes from "../data/heroes.json" with { type: "json" };
import mastery from "../data/mastery.json" with { type: "json" };
import regions from "../data/regions.json" with { type: "json" };
import skills from "../data/skills.json" with { type: "json" };
import stages from "../data/stages.json" with { type: "json" };
import upgrades from "../data/upgrades.json" with { type: "json" };

const staticData: StaticGameData = {
  heroes: heroes as StaticGameData["heroes"],
  skills: skills as StaticGameData["skills"],
  enemies: enemies as StaticGameData["enemies"],
  regions: regions as StaticGameData["regions"],
  stages: stages as StaticGameData["stages"],
  upgrades: upgrades as StaticGameData["upgrades"],
  mastery: mastery as StaticGameData["mastery"],
  formations: formations as StaticGameData["formations"]
};

const BAMBOO_ROAD_STAGE_IDS = [
  "bamboo_road_1",
  "bamboo_road_2",
  "bamboo_road_3",
  "bamboo_road_4",
  "bamboo_road_5",
  "bamboo_road_6",
  "bamboo_road_7",
  "bamboo_road_8",
  "bamboo_road_9",
  "bamboo_road_10"
];

const TRAINED_BOSS_UPGRADES = {
  heroOuterTraining: 6,
  heroInnerTraining: 4,
  sectOuterTraining: 4,
  sectInnerTraining: 3
};

type TrainingPlanEntry = {
  upgradeId: string;
  targetLevel: number;
  heroId?: string;
};

const TRAINED_BOSS_PLAN: TrainingPlanEntry[] = [
  ...staticData.heroes.flatMap((hero) => [
    {
      upgradeId: "hero_outer_training",
      targetLevel: TRAINED_BOSS_UPGRADES.heroOuterTraining,
      heroId: hero.id
    },
    {
      upgradeId: "hero_inner_training",
      targetLevel: TRAINED_BOSS_UPGRADES.heroInnerTraining,
      heroId: hero.id
    }
  ]),
  {
    upgradeId: "sect_outer_training",
    targetLevel: TRAINED_BOSS_UPGRADES.sectOuterTraining
  },
  {
    upgradeId: "sect_inner_training",
    targetLevel: TRAINED_BOSS_UPGRADES.sectInnerTraining
  }
];

function getStage(stageId: string): StageDefinition {
  const stage = staticData.stages.find((candidate) => candidate.id === stageId);

  if (!stage) {
    throw new Error(`Missing stage ${stageId}`);
  }

  return stage;
}

function getStageEnemies(stage: StageDefinition) {
  return stage.enemyTeam.combatantIds.map((enemyId) => {
    const enemy = staticData.enemies.find((candidate) => candidate.id === enemyId);

    if (!enemy) {
      throw new Error(`Missing enemy ${enemyId}`);
    }

    return enemy;
  });
}

function getTargetSeconds(stage: StageDefinition): [number, number] | null {
  if (stage.isBoss) {
    return null;
  }

  const enemyTypes = getStageEnemies(stage).map((enemy) => enemy.type);

  return enemyTypes.includes("elite") ? [20, 40] : [5, 15];
}

function getUpgrade(upgradeId: string) {
  const upgrade = staticData.upgrades.find((candidate) => candidate.id === upgradeId);

  if (!upgrade) {
    throw new Error(`Missing upgrade ${upgradeId}`);
  }

  return upgrade;
}

function getClearsRequiredForSilver(cost: number): number | null {
  let silver = 0;

  for (let index = 0; index < BAMBOO_ROAD_STAGE_IDS.length; index += 1) {
    const stage = getStage(BAMBOO_ROAD_STAGE_IDS[index]);
    if (stage.isBoss) {
      return null;
    }

    silver += stage.rewards.silver;

    if (silver >= cost) {
      return index + 1;
    }
  }

  return null;
}

function getTrainingPlanCost(
  progress: PlayerProgress,
  plan: TrainingPlanEntry[]
): number {
  return plan.reduce((total, entry) => {
    const upgrade = getUpgrade(entry.upgradeId);
    let entryCost = 0;
    const currentLevel = getUpgradeLevel(progress, upgrade, entry.heroId);

    for (let level = currentLevel; level < entry.targetLevel; level += 1) {
      entryCost += calculateUpgradeCost(upgrade, level);
    }

    return total + entryCost;
  }, 0);
}

function purchaseTrainingPlan(
  progress: PlayerProgress,
  plan: TrainingPlanEntry[]
) {
  let nextProgress = cloneProgress(progress);
  let totalCost = 0;

  for (const entry of plan) {
    const upgrade = getUpgrade(entry.upgradeId);
    let currentLevel = getUpgradeLevel(nextProgress, upgrade, entry.heroId);

    while (currentLevel < entry.targetLevel) {
      const result = purchaseUpgrade(staticData.upgrades, {
        progress: nextProgress,
        upgradeId: entry.upgradeId,
        heroId: entry.heroId
      });

      if (!result.ok) {
        return {
          ok: false as const,
          reason: result.reason,
          cost: result.cost,
          progress: nextProgress,
          totalCost
        };
      }

      totalCost += result.cost;
      nextProgress = result.progress;
      currentLevel = result.newLevel;
    }
  }

  return {
    ok: true as const,
    progress: nextProgress,
    totalCost
  };
}

function farmUntilTrainingAffordable(
  progress: PlayerProgress,
  plan: TrainingPlanEntry[],
  farmStageId: string,
  maxClears: number
) {
  let farmProgress = cloneProgress(progress);

  for (let farmClears = 0; farmClears <= maxClears; farmClears += 1) {
    const purchase = purchaseTrainingPlan(farmProgress, plan);

    if (purchase.ok) {
      return {
        ok: true as const,
        farmStageId,
        farmClears,
        trainingCost: purchase.totalCost,
        resourcesBeforeTraining: farmProgress.resources,
        resourcesAfterTraining: purchase.progress.resources,
        progress: purchase.progress
      };
    }

    const result = resolveStageBattle(staticData, {
      progress: farmProgress,
      stageId: farmStageId,
      maxDurationSeconds: 180
    });

    if (!result.ok || !result.stageCleared) {
      return {
        ok: false as const,
        farmStageId,
        farmClears,
        reason: result.ok ? "farm_stage_not_cleared" : result.reason,
        resourcesBeforeTraining: farmProgress.resources
      };
    }

    farmProgress = result.progress;
  }

  return {
    ok: false as const,
    farmStageId,
    farmClears: maxClears,
    reason: "max_farm_clears_reached",
    resourcesBeforeTraining: farmProgress.resources
  };
}

function summarizeBattle(stage: StageDefinition, result: ResolveStageBattleResult) {
  const enemiesForStage = getStageEnemies(stage);
  const targetSeconds = getTargetSeconds(stage);

  if (!result.ok) {
    return {
      ok: false,
      stageId: stage.id,
      name: stage.name,
      enemyIds: stage.enemyTeam.combatantIds,
      enemyTypes: enemiesForStage.map((enemy) => enemy.type),
      reason: result.reason
    };
  }

  const durationSeconds = Number(result.battle.durationSeconds.toFixed(2));
  const targetMet = targetSeconds
    ? result.battle.winner === "player" &&
      durationSeconds >= targetSeconds[0] &&
      durationSeconds <= targetSeconds[1]
    : null;

  return {
    ok: true,
    stageId: stage.id,
    name: stage.name,
    index: stage.index,
    enemyIds: stage.enemyTeam.combatantIds,
    enemyTypes: enemiesForStage.map((enemy) => enemy.type),
    targetSeconds,
    targetMet,
    winner: result.battle.winner,
    stageCleared: result.stageCleared,
    durationSeconds,
    qiBreaks: result.battle.events.filter((event) => event.type === "qi_break").length,
    metrics: {
      playerOuterDamage: Number(result.battle.metrics.playerOuterDamage.toFixed(2)),
      playerInnerDamage: Number(result.battle.metrics.playerInnerDamage.toFixed(2)),
      playerEffectiveDps: Number(result.battle.metrics.playerEffectiveDps.toFixed(2)),
      enemyEffectiveDps: Number(result.battle.metrics.enemyEffectiveDps.toFixed(2))
    },
    rewards: result.rewards,
    currentStageId: result.progress.currentStageId,
    highestClearedStageIndex:
      result.progress.maps[stage.regionId]?.highestClearedStageIndex ?? 0,
    suggestedFarmStageId: result.suggestedFarmStageId
  };
}

let progress = createInitialPlayerProgress(staticData);
const stageResults = [];
let progressBeforeBoss = cloneProgress(progress);

for (const stageId of BAMBOO_ROAD_STAGE_IDS) {
  const stage = getStage(stageId);

  if (stage.isBoss) {
    progressBeforeBoss = cloneProgress(progress);
  }

  const result = resolveStageBattle(staticData, {
    progress,
    stageId,
    maxDurationSeconds: 180
  });

  stageResults.push(summarizeBattle(stage, result));

  if (result.ok && result.stageCleared) {
    progress = result.progress;
  }
}

const bossStage = getStage("bamboo_road_10");
const baselineBoss = resolveStageBattle(staticData, {
  progress: progressBeforeBoss,
  stageId: bossStage.id,
  maxDurationSeconds: 180
});
const farmStageId = progressBeforeBoss.currentStageId === bossStage.id
  ? "bamboo_road_9"
  : progressBeforeBoss.currentStageId;
const trainingEconomy = farmUntilTrainingAffordable(
  progressBeforeBoss,
  TRAINED_BOSS_PLAN,
  farmStageId,
  60
);
const trainingEconomyReport = trainingEconomy.ok
  ? {
      ok: true,
      farmStageId: trainingEconomy.farmStageId,
      farmClears: trainingEconomy.farmClears,
      trainingCost: trainingEconomy.trainingCost,
      resourcesBeforeTraining: trainingEconomy.resourcesBeforeTraining,
      resourcesAfterTraining: trainingEconomy.resourcesAfterTraining
    }
  : trainingEconomy;
const trainedBossProgress = trainingEconomy.ok
  ? trainingEconomy.progress
  : progressBeforeBoss;
const trainedBoss = resolveStageBattle(staticData, {
  progress: trainedBossProgress,
  stageId: bossStage.id,
  maxDurationSeconds: 180
});
const nextMastery = getNextMasteryThreshold(
  progressBeforeBoss.maps.bamboo_road.combatExperience,
  staticData.mastery.thresholds
);
const firstHeroUpgrade = getUpgrade("hero_outer_training");
const firstSectUpgrade = getUpgrade("sect_outer_training");
const firstHeroUpgradeCost = calculateUpgradeCost(firstHeroUpgrade, 0);
const firstSectUpgradeCost = calculateUpgradeCost(firstSectUpgrade, 0);
const farmStage = getStage(farmStageId);
const firstMasteryFarmClears = nextMastery
  ? Math.ceil(
      Math.max(
        0,
        nextMastery.experience -
          progressBeforeBoss.maps.bamboo_road.combatExperience
      ) / farmStage.rewards.combatExperience
    )
  : 0;

console.log(
  JSON.stringify(
    {
      bambooRoadBalance: {
        stageResults,
        bossGate: {
          baseline: summarizeBattle(bossStage, baselineBoss),
          trained: summarizeBattle(bossStage, trainedBoss),
          training: TRAINED_BOSS_UPGRADES,
          economy: {
            planCost: getTrainingPlanCost(progressBeforeBoss, TRAINED_BOSS_PLAN),
            trainingEconomy: trainingEconomyReport
          }
        },
        upgradeEconomy: {
          firstHeroUpgrade: {
            cost: firstHeroUpgradeCost,
            clearsRequired: getClearsRequiredForSilver(firstHeroUpgradeCost)
          },
          firstSectUpgrade: {
            cost: firstSectUpgradeCost,
            clearsRequired: getClearsRequiredForSilver(firstSectUpgradeCost)
          },
          firstMastery: nextMastery
            ? {
                threshold: nextMastery.experience,
                farmStageId,
                farmClearsRequired: firstMasteryFarmClears
              }
            : null
        },
        progressBeforeBoss: {
          resources: progressBeforeBoss.resources,
          bambooRoad: progressBeforeBoss.maps.bamboo_road,
          nextMastery
        }
      }
    },
    null,
    2
  )
);
