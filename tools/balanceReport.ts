import {
  calculateUpgradeCost,
  cloneProgress,
  createInitialPlayerProgress,
  getRecommendedOfflineFarmStage,
  getUpgradeLevel,
  isBetterOfflineFarmStage,
  getNextMasteryThreshold,
  purchaseUpgrade,
  resolveStageBattle,
  simulateBattle
} from "../core";
import type {
  PlayerProgress,
  ResolveStageBattleResult,
  StaticGameData,
  StageDefinition
} from "../core";

export const BAMBOO_ROAD_REGION_ID = "bamboo_road";
export const MIST_VALLEY_REGION_ID = "mist_valley";
export const BLACK_IRON_FORT_REGION_ID = "black_iron_fort";

export const TRAINED_BOSS_UPGRADES = {
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

function createTrainedBossPlan(data: StaticGameData): TrainingPlanEntry[] {
  return [
    ...data.heroes.flatMap((hero) => [
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
}

function getStage(data: StaticGameData, stageId: string): StageDefinition {
  const stage = data.stages.find((candidate) => candidate.id === stageId);

  if (!stage) {
    throw new Error(`Missing stage ${stageId}`);
  }

  return stage;
}

function getRegionStageIds(data: StaticGameData, regionId: string): string[] {
  const region = data.regions.find((candidate) => candidate.id === regionId);

  if (!region) {
    throw new Error(`Missing region ${regionId}`);
  }

  for (const stageId of region.stageIds) {
    getStage(data, stageId);
  }

  return [...region.stageIds];
}

function getRegionIds(data: StaticGameData): string[] {
  if (data.regions.length === 0) {
    throw new Error("No regions configured for balance report");
  }

  for (const region of data.regions) {
    getRegionStageIds(data, region.id);
  }

  return data.regions.map((region) => region.id);
}

function getRegionBossStage(
  data: StaticGameData,
  regionId: string,
  stageIds: string[]
): StageDefinition {
  const bossStage = stageIds
    .map((stageId) => getStage(data, stageId))
    .find((stage) => stage.isBoss);

  if (!bossStage) {
    throw new Error(`Missing boss stage in region ${regionId}`);
  }

  return bossStage;
}

function getStageEnemies(data: StaticGameData, stage: StageDefinition) {
  return stage.enemyTeam.combatantIds.map((enemyId) => {
    const enemy = data.enemies.find((candidate) => candidate.id === enemyId);

    if (!enemy) {
      throw new Error(`Missing enemy ${enemyId}`);
    }

    return enemy;
  });
}

function getTargetSeconds(
  data: StaticGameData,
  stage: StageDefinition
): [number, number] | null {
  if (stage.isBoss) {
    return null;
  }

  const enemyTypes = getStageEnemies(data, stage).map((enemy) => enemy.type);

  if (stage.regionId === MIST_VALLEY_REGION_ID) {
    return enemyTypes.includes("elite") ? [10, 25] : [5, 18];
  }

  if (stage.regionId === BLACK_IRON_FORT_REGION_ID) {
    return enemyTypes.includes("elite") ? [25, 65] : [12, 55];
  }

  return enemyTypes.includes("elite") ? [20, 40] : [5, 15];
}

function getUpgrade(data: StaticGameData, upgradeId: string) {
  const upgrade = data.upgrades.find((candidate) => candidate.id === upgradeId);

  if (!upgrade) {
    throw new Error(`Missing upgrade ${upgradeId}`);
  }

  return upgrade;
}

function getClearsRequiredForSilver(
  data: StaticGameData,
  stageIds: string[],
  cost: number
): number | null {
  let silver = 0;

  for (let index = 0; index < stageIds.length; index += 1) {
    const stage = getStage(data, stageIds[index]);
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

function getRecommendedRegionFarmStage(
  data: StaticGameData,
  progress: PlayerProgress,
  regionId: string
): StageDefinition | null {
  return getRegionStageIds(data, regionId)
    .map((stageId) => getStage(data, stageId))
    .filter(
      (stage) =>
        !stage.isBoss &&
        stage.canFarmOffline &&
        (progress.maps[stage.regionId]?.highestClearedStageIndex ?? 0) >=
          stage.index
    )
    .reduce<StageDefinition | null>(
      (bestStage, stage) =>
        !bestStage || isBetterOfflineFarmStage(stage, bestStage)
          ? stage
          : bestStage,
      null
    );
}

function buildRegionFarmRecommendation(
  data: StaticGameData,
  progressBeforeBoss: PlayerProgress,
  regionId: string
) {
  const farmStage = getRecommendedRegionFarmStage(
    data,
    progressBeforeBoss,
    regionId
  );

  if (!farmStage) {
    return null;
  }

  return {
    stageId: farmStage.id,
    rewards: farmStage.rewards
  };
}

function buildRegionMasteryMilestone(
  data: StaticGameData,
  progressBeforeBoss: PlayerProgress,
  regionId: string,
  farmRecommendation: ReturnType<typeof buildRegionFarmRecommendation>
) {
  const mapProgress = progressBeforeBoss.maps[regionId] ?? {
    combatExperience: 0,
    highestClearedStageIndex: 0
  };
  const nextMastery = getNextMasteryThreshold(
    mapProgress.combatExperience,
    data.mastery.thresholds
  );

  if (!nextMastery) {
    return null;
  }

  return {
    threshold: nextMastery.experience,
    rank: nextMastery.rank,
    currentCombatExperience: mapProgress.combatExperience,
    farmStageId: farmRecommendation?.stageId ?? null,
    farmClearsRequired: farmRecommendation
      ? Math.ceil(
          Math.max(0, nextMastery.experience - mapProgress.combatExperience) /
            farmRecommendation.rewards.combatExperience
        )
      : null
  };
}

function getTrainingPlanCost(
  data: StaticGameData,
  progress: PlayerProgress,
  plan: TrainingPlanEntry[]
): number {
  return plan.reduce((total, entry) => {
    const upgrade = getUpgrade(data, entry.upgradeId);
    let entryCost = 0;
    const currentLevel = getUpgradeLevel(progress, upgrade, entry.heroId);

    for (let level = currentLevel; level < entry.targetLevel; level += 1) {
      entryCost += calculateUpgradeCost(upgrade, level);
    }

    return total + entryCost;
  }, 0);
}

function purchaseTrainingPlan(
  data: StaticGameData,
  progress: PlayerProgress,
  plan: TrainingPlanEntry[]
) {
  let nextProgress = cloneProgress(progress);
  let totalCost = 0;

  for (const entry of plan) {
    const upgrade = getUpgrade(data, entry.upgradeId);
    let currentLevel = getUpgradeLevel(nextProgress, upgrade, entry.heroId);

    while (currentLevel < entry.targetLevel) {
      const result = purchaseUpgrade(data.upgrades, {
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

function farmUntilTrainingClearsBoss(
  data: StaticGameData,
  progress: PlayerProgress,
  plan: TrainingPlanEntry[],
  farmStageId: string,
  bossStageId: string,
  maxClears: number
) {
  let farmProgress = cloneProgress(progress);

  for (let farmClears = 0; farmClears <= maxClears; farmClears += 1) {
    const purchase = purchaseTrainingPlan(data, farmProgress, plan);

    if (purchase.ok) {
      const bossResult = resolveStageBattle(data, {
        progress: purchase.progress,
        stageId: bossStageId,
        maxDurationSeconds: 180
      });

      if (bossResult.ok && bossResult.stageCleared) {
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
    }

    const result = resolveStageBattle(data, {
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
    reason: "boss_not_cleared_after_max_farms",
    resourcesBeforeTraining: farmProgress.resources
  };
}

function summarizeBattle(
  data: StaticGameData,
  stage: StageDefinition,
  result: ResolveStageBattleResult
) {
  const enemiesForStage = getStageEnemies(data, stage);
  const targetSeconds = getTargetSeconds(data, stage);

  if (!result.ok) {
    return {
      ok: false,
      stageId: stage.id,
      name: stage.name,
      enemyIds: stage.enemyTeam.combatantIds,
      enemyFormationSlots: [],
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
    enemyFormationSlots: result.battle.finalEnemyTeam.map(
      (combatant) => combatant.formationSlot
    ),
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

function getFirstPlayerAttackTargetId(
  result: ReturnType<typeof simulateBattle>
): string | null {
  const firstPlayerAttack = result.events.find(
    (event) => event.type === "attack" && event.sourceId.startsWith("player_")
  );

  return firstPlayerAttack?.type === "attack" ? firstPlayerAttack.targetId : null;
}

function buildFormationScenarioReport(data: StaticGameData) {
  const bandit = data.enemies.find((enemy) => enemy.id === "bamboo_bandit");

  if (!bandit) {
    throw new Error("Missing enemy bamboo_bandit");
  }

  const frontLineScenario = simulateBattle(data, {
    playerTeam: {
      id: "player",
      combatants: [{ kind: "hero", definitionId: "iron_fist_disciple" }]
    },
    enemyTeam: {
      id: "enemy",
      combatants: [
        {
          kind: "enemy",
          definitionId: "bamboo_bandit",
          instanceId: "back_bandit",
          formationSlot: "back"
        },
        {
          kind: "enemy",
          definitionId: "bamboo_bandit",
          instanceId: "front_bandit",
          formationSlot: "front"
        }
      ]
    },
    maxDurationSeconds: 5
  });
  const highestCpData: StaticGameData = {
    ...data,
    skills: data.skills.map((skill) =>
      skill.id === "iron_fist_combo"
        ? {
            ...skill,
            targetRule: "highest_cp" as const
          }
        : skill
    )
  };
  const highestCpScenario = simulateBattle(highestCpData, {
    playerTeam: {
      id: "player",
      combatants: [{ kind: "hero", definitionId: "iron_fist_disciple" }]
    },
    enemyTeam: {
      id: "enemy",
      combatants: [
        {
          kind: "enemy",
          definitionId: "bamboo_bandit",
          instanceId: "front_guard",
          formationSlot: "front"
        },
        {
          kind: "enemy",
          definitionId: "bamboo_bandit",
          instanceId: "back_threat",
          formationSlot: "back",
          statsOverride: {
            ...bandit.baseStats,
            outerAttack: bandit.baseStats.outerAttack * 8
          }
        }
      ]
    },
    maxDurationSeconds: 5
  });

  return {
    firstLivingFrontlineTargetId: getFirstPlayerAttackTargetId(frontLineScenario),
    highestCpBacklineTargetId: getFirstPlayerAttackTargetId(highestCpScenario)
  };
}

function buildRegionStageProgressionReport(
  data: StaticGameData,
  regionId: string,
  startingProgress: PlayerProgress
) {
  const stageIds = getRegionStageIds(data, regionId);
  let progress = cloneProgress(startingProgress);
  const stageResults: Array<ReturnType<typeof summarizeBattle>> = [];
  let progressBeforeBoss = cloneProgress(progress);
  const bossStage = getRegionBossStage(data, regionId, stageIds);

  for (const stageId of stageIds) {
    const stage = getStage(data, stageId);

    if (stage.isBoss) {
      progressBeforeBoss = cloneProgress(progress);
    }

    const result = resolveStageBattle(data, {
      progress,
      stageId,
      maxDurationSeconds: 180
    });

    stageResults.push(summarizeBattle(data, stage, result));

    if (result.ok && result.stageCleared) {
      progress = result.progress;
    }
  }

  const bossBaseline = resolveStageBattle(data, {
    progress: progressBeforeBoss,
    stageId: bossStage.id,
    maxDurationSeconds: 180
  });
  const farmRecommendation = buildRegionFarmRecommendation(
    data,
    progressBeforeBoss,
    regionId
  );

  return {
    regionId,
    regionName:
      data.regions.find((region) => region.id === regionId)?.name ?? regionId,
    stageResults,
    bossGate: {
      baseline: summarizeBattle(data, bossStage, bossBaseline)
    },
    farmRecommendation,
    masteryMilestone: buildRegionMasteryMilestone(
      data,
      progressBeforeBoss,
      regionId,
      farmRecommendation
    ),
    progressBeforeBoss,
    progressAfterRegion: progress
  };
}

type RegionBalanceReport = ReturnType<typeof buildRegionStageProgressionReport> & {
  bossGate: ReturnType<typeof buildRegionStageProgressionReport>["bossGate"] & {
    trained?: ReturnType<typeof summarizeBattle>;
  };
};

type SeededRegionBalanceReport = {
  report: RegionBalanceReport;
  progressAfterRegion: PlayerProgress;
};

function buildRegionBalancesInOrder(
  data: StaticGameData,
  regionIds: string[],
  startingProgress: PlayerProgress,
  seededReports: Map<string, SeededRegionBalanceReport>
): RegionBalanceReport[] {
  const regionBalances: RegionBalanceReport[] = [];
  let nextRegionStartingProgress = cloneProgress(startingProgress);

  for (const regionId of regionIds) {
    const seededReport = seededReports.get(regionId);

    if (seededReport) {
      regionBalances.push({
        ...seededReport.report,
        progressAfterRegion: seededReport.progressAfterRegion
      });
      nextRegionStartingProgress = seededReport.progressAfterRegion;
      continue;
    }

    const regionBalance = buildRegionStageProgressionReport(
      data,
      regionId,
      nextRegionStartingProgress
    );
    regionBalances.push(regionBalance);
    nextRegionStartingProgress = regionBalance.progressAfterRegion;
  }

  return regionBalances;
}

export function buildBambooRoadBalanceReport(data: StaticGameData) {
  const regionIds = getRegionIds(data);
  const bambooRoadStageIds = getRegionStageIds(data, BAMBOO_ROAD_REGION_ID);
  const trainedBossPlan = createTrainedBossPlan(data);
  const initialProgress = createInitialPlayerProgress(data);
  const bambooRoadProgression = buildRegionStageProgressionReport(
    data,
    BAMBOO_ROAD_REGION_ID,
    initialProgress
  );
  const stageResults = bambooRoadProgression.stageResults;
  const progressBeforeBoss = bambooRoadProgression.progressBeforeBoss;
  const bossStage = getRegionBossStage(
    data,
    BAMBOO_ROAD_REGION_ID,
    bambooRoadStageIds
  );
  const baselineBoss = resolveStageBattle(data, {
    progress: progressBeforeBoss,
    stageId: bossStage.id,
    maxDurationSeconds: 180
  });
  const recommendedFarmStage = getRecommendedOfflineFarmStage(
    data,
    progressBeforeBoss
  );

  if (!recommendedFarmStage) {
    throw new Error("No cleared Bamboo Road stage is available for farm simulation");
  }

  const farmStageId = recommendedFarmStage.id;
  const trainingEconomy = farmUntilTrainingClearsBoss(
    data,
    progressBeforeBoss,
    trainedBossPlan,
    farmStageId,
    bossStage.id,
    60
  );
  const trainingEconomyReport = trainingEconomy.ok
    ? {
        ok: true as const,
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
  const trainedBoss = resolveStageBattle(data, {
    progress: trainedBossProgress,
    stageId: bossStage.id,
    maxDurationSeconds: 180
  });
  const progressAfterBambooRoad =
    trainedBoss.ok && trainedBoss.stageCleared
      ? trainedBoss.progress
      : trainedBossProgress;
  const bambooRoadRegionReport: RegionBalanceReport = {
    ...bambooRoadProgression,
    bossGate: {
      ...bambooRoadProgression.bossGate,
      trained: summarizeBattle(data, bossStage, trainedBoss)
    }
  };
  const seededRegionReports = new Map<string, SeededRegionBalanceReport>([
    [
      BAMBOO_ROAD_REGION_ID,
      {
        report: bambooRoadRegionReport,
        progressAfterRegion: progressAfterBambooRoad
      }
    ]
  ]);
  const regionBalances = buildRegionBalancesInOrder(
    data,
    regionIds,
    initialProgress,
    seededRegionReports
  );
  const bambooRoadProgressBeforeBoss = progressBeforeBoss.maps[
    BAMBOO_ROAD_REGION_ID
  ] ?? {
    combatExperience: 0,
    highestClearedStageIndex: 0
  };
  const nextMastery = getNextMasteryThreshold(
    bambooRoadProgressBeforeBoss.combatExperience,
    data.mastery.thresholds
  );
  const firstHeroUpgrade = getUpgrade(data, "hero_outer_training");
  const firstSectUpgrade = getUpgrade(data, "sect_outer_training");
  const firstHeroUpgradeCost = calculateUpgradeCost(firstHeroUpgrade, 0);
  const firstSectUpgradeCost = calculateUpgradeCost(firstSectUpgrade, 0);
  const farmStage = getStage(data, farmStageId);
  const firstMasteryFarmClears = nextMastery
    ? Math.ceil(
        Math.max(
          0,
          nextMastery.experience -
            bambooRoadProgressBeforeBoss.combatExperience
        ) / farmStage.rewards.combatExperience
      )
    : 0;

  return {
    regionBalances,
    bambooRoadBalance: {
      stageResults,
      bossGate: {
        baseline: summarizeBattle(data, bossStage, baselineBoss),
        trained: summarizeBattle(data, bossStage, trainedBoss),
        training: TRAINED_BOSS_UPGRADES,
        economy: {
          planCost: getTrainingPlanCost(
            data,
            progressBeforeBoss,
            trainedBossPlan
          ),
          trainingEconomy: trainingEconomyReport
        }
      },
      upgradeEconomy: {
        firstHeroUpgrade: {
          cost: firstHeroUpgradeCost,
          clearsRequired: getClearsRequiredForSilver(
            data,
            bambooRoadStageIds,
            firstHeroUpgradeCost
          )
        },
        firstSectUpgrade: {
          cost: firstSectUpgradeCost,
          clearsRequired: getClearsRequiredForSilver(
            data,
            bambooRoadStageIds,
            firstSectUpgradeCost
          )
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
        bambooRoad: bambooRoadProgressBeforeBoss,
        nextMastery
      },
      farmRecommendation: bambooRoadProgression.farmRecommendation,
      masteryMilestone: bambooRoadProgression.masteryMilestone,
      formationScenarios: buildFormationScenarioReport(data)
    }
  };
}

export type BambooRoadBalanceReport = ReturnType<
  typeof buildBambooRoadBalanceReport
>;

type StageSummary =
  BambooRoadBalanceReport["bambooRoadBalance"]["stageResults"][number];
type RegionSummary = BambooRoadBalanceReport["regionBalances"][number];

function formatReward(rewards: StageSummary["rewards"]): string {
  if (!rewards) {
    return "-";
  }

  return `${rewards.silver} silver / ${rewards.cultivation} cult / ${rewards.combatExperience} xp`;
}

function formatTarget(stage: StageSummary): string {
  if (!stage.ok || !stage.targetSeconds) {
    return "-";
  }

  return `${stage.targetSeconds[0]}-${stage.targetSeconds[1]}s ${stage.targetMet ? "ok" : "miss"}`;
}

function formatStageRow(stage: StageSummary): string {
  const formation = stage.ok ? stage.enemyFormationSlots.join("+") : "-";

  if (!stage.ok) {
    const reason = stage.reason ?? "unknown";

    return [
      stage.stageId.padEnd(14),
      stage.enemyIds.join("+").padEnd(16),
      reason.padEnd(13),
      "-".padStart(6),
      "-".padStart(5),
      formation.padEnd(14),
      "-".padEnd(28),
      "-".padEnd(10)
    ].join("  ");
  }

  return [
    stage.stageId.padEnd(14),
    stage.enemyIds.join("+").padEnd(16),
    `${stage.winner}${stage.stageCleared ? " clear" : " hold"}`.padEnd(13),
    `${stage.durationSeconds}s`.padStart(6),
    String(stage.qiBreaks).padStart(5),
    formation.padEnd(14),
    formatReward(stage.rewards).padEnd(28),
    formatTarget(stage).padEnd(10)
  ].join("  ");
}

function formatBossLine(stage: StageSummary): string {
  if (!stage.ok) {
    return `${stage.stageId}: ${stage.reason ?? "unknown"}`;
  }

  return `${stage.winner}${stage.stageCleared ? " clear" : " hold"} in ${stage.durationSeconds}s, ${stage.qiBreaks} Qi Breaks`;
}

function formatRegionFarmLine(region: RegionSummary): string {
  if (!region.farmRecommendation) {
    return `- ${region.regionName}: no cleared farm stage`;
  }

  const rewards = formatReward(region.farmRecommendation.rewards);

  return `- ${region.regionName}: ${region.farmRecommendation.stageId} (${rewards})`;
}

function formatRegionMasteryLine(region: RegionSummary): string {
  const milestone = region.masteryMilestone;

  if (!milestone) {
    return `- ${region.regionName}: all mastery thresholds reached`;
  }

  const farmText =
    milestone.farmStageId && milestone.farmClearsRequired !== null
      ? `${milestone.farmClearsRequired} ${milestone.farmStageId} farms`
      : "no farm target";

  return `- ${region.regionName}: ${milestone.currentCombatExperience}/${milestone.threshold} Combat XP toward ${milestone.rank}, ${farmText}`;
}

function formatRegionBossGateLine(region: RegionSummary): string {
  const trained =
    "trained" in region.bossGate && region.bossGate.trained
      ? `, trained ${formatBossLine(region.bossGate.trained)}`
      : "";

  return `- ${region.regionName}: baseline ${formatBossLine(region.bossGate.baseline)}${trained}`;
}

function formatRegionStageTable(
  title: string,
  stages: StageSummary[]
): string[] {
  const header = [
    "stage".padEnd(14),
    "enemy".padEnd(16),
    "result".padEnd(13),
    "time".padStart(6),
    "break".padStart(5),
    "formation".padEnd(14),
    "rewards".padEnd(28),
    "target".padEnd(10)
  ].join("  ");
  const divider = "-".repeat(header.length);

  return [
    title,
    "",
    header,
    divider,
    ...stages.map(formatStageRow)
  ];
}

export function formatBalanceReport(report: BambooRoadBalanceReport): string {
  const balance = report.bambooRoadBalance;
  const firstMastery = balance.upgradeEconomy.firstMastery;
  const trainingEconomy = balance.bossGate.economy.trainingEconomy;
  const trainingLine = trainingEconomy.ok
    ? `${trainingEconomy.farmClears} ${trainingEconomy.farmStageId} farms, ${trainingEconomy.trainingCost} silver`
    : `not affordable: ${trainingEconomy.reason}`;

  return [
    "Path of Jianghu Balance Report",
    "",
    ...report.regionBalances.flatMap((region, index) => [
      ...(index > 0 ? [""] : []),
      ...formatRegionStageTable(
        `${region.regionName} Balance Report`,
        region.stageResults
      )
    ]),
    "",
    "Region Farm Recommendations",
    ...report.regionBalances.map(formatRegionFarmLine),
    "",
    "Region Mastery Milestones",
    ...report.regionBalances.map(formatRegionMasteryLine),
    "",
    "Region Boss Gates",
    ...report.regionBalances.map(formatRegionBossGateLine),
    "",
    "Formation Targeting",
    `- first_living frontline target: ${balance.formationScenarios.firstLivingFrontlineTargetId}`,
    `- highest_cp backline target: ${balance.formationScenarios.highestCpBacklineTargetId}`,
    "",
    "Upgrade Economy",
    `- First hero upgrade: ${balance.upgradeEconomy.firstHeroUpgrade.cost} silver, ${balance.upgradeEconomy.firstHeroUpgrade.clearsRequired} clears`,
    `- First sect upgrade: ${balance.upgradeEconomy.firstSectUpgrade.cost} silver, ${balance.upgradeEconomy.firstSectUpgrade.clearsRequired} clears`,
    firstMastery
      ? `- First mastery: ${firstMastery.threshold} Combat XP after ${firstMastery.farmClearsRequired} ${firstMastery.farmStageId} farms`
      : "- First mastery: all thresholds reached",
    "",
    "Boss Gate",
    `- Baseline: ${formatBossLine(balance.bossGate.baseline)}`,
    `- Trained: ${formatBossLine(balance.bossGate.trained)}`,
    `- Training economy: ${trainingLine}`,
    "",
    "Run `npm run simulate -- --json` for full metrics."
  ].join("\n");
}
