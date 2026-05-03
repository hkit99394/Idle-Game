import {
  cloneProgress,
  createInitialPlayerProgress,
  getNextMasteryThreshold,
  resolveStageBattle
} from "../core";
import type {
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

function applyTrainingForBoss(progress: ReturnType<typeof cloneProgress>) {
  const trainedProgress = cloneProgress(progress);

  for (const hero of staticData.heroes) {
    trainedProgress.heroes[hero.id].upgrades.hero_outer_training =
      TRAINED_BOSS_UPGRADES.heroOuterTraining;
    trainedProgress.heroes[hero.id].upgrades.hero_inner_training =
      TRAINED_BOSS_UPGRADES.heroInnerTraining;
  }

  trainedProgress.sect.upgrades.sect_outer_training =
    TRAINED_BOSS_UPGRADES.sectOuterTraining;
  trainedProgress.sect.upgrades.sect_inner_training =
    TRAINED_BOSS_UPGRADES.sectInnerTraining;

  return trainedProgress;
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
const trainedBossProgress = applyTrainingForBoss(progressBeforeBoss);
const trainedBoss = resolveStageBattle(staticData, {
  progress: trainedBossProgress,
  stageId: bossStage.id,
  maxDurationSeconds: 180
});
const nextMastery = getNextMasteryThreshold(
  progressBeforeBoss.maps.bamboo_road.combatExperience,
  staticData.mastery.thresholds
);

console.log(
  JSON.stringify(
    {
      bambooRoadBalance: {
        stageResults,
        bossGate: {
          baseline: summarizeBattle(bossStage, baselineBoss),
          trained: summarizeBattle(bossStage, trainedBoss),
          training: TRAINED_BOSS_UPGRADES
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
