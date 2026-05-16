import {
  calculateUpgradeCost,
  cloneProgress,
  createInitialPlayerProgress,
  getDefaultSelectedTacticId,
  getRecommendedOfflineFarmStage,
  OFFLINE_FARM_RECOMMENDATION_REWARD_PRIORITY,
  getUpgradeLevel,
  isBetterOfflineFarmStage,
  getNextMasteryThreshold,
  purchaseUpgrade,
  resolveStageBattle
} from "../progression";
import {
  createBattleEventRecord,
  simulateBattle,
  type BattleEvent
} from "../combat";
import type { StaticGameData, StageDefinition } from "../data";
import {
  assessStageClearTimeTarget,
  getStageClearTimeTargetRange,
  getStageRewardScoreBreakdown,
  isWithinClearTimeTarget,
  scoreStageRewards,
  type BalanceTargetCheck
} from "./targets";
import {
  buildRegionBudgetGateChecks,
  buildRegionBudgetGateContext,
  buildRegionPressureMetrics,
  type RegionBudgetGateBattleOutcome
} from "./regionBudgetGates";
import type { PlayerProgress, ResolveStageBattleResult } from "../progression";

export const BAMBOO_ROAD_REGION_ID = "greenline_approach";
export const MIST_VALLEY_REGION_ID = "veil_district";
export const BLACK_IRON_FORT_REGION_ID = "black_iron_foundry";
export const LOTUS_MONASTERY_REGION_ID = "lotus_clinic";

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

type TrainingCandidate = {
  upgradeId: string;
  heroId?: string;
  cost: number;
};

type BattleSummary = ReturnType<typeof summarizeBattle>;
type TacticComparisonBattleSummary = ReturnType<typeof summarizeBattle>;
type BattleSummaryWithBudgetExtras = BattleSummary & {
  farmStageId?: string | null;
  farmClears?: number;
  trainingCost?: number;
};
type RegionBudgetCheck = BalanceTargetCheck;

const DIFFICULTY_SPIKE_MIN_DELTA_SECONDS = 10;
const DIFFICULTY_SPIKE_MIN_RATIO = 1.35;

function roundBalanceNumber(value: number): number {
  return Number(value.toFixed(2));
}

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
  const region = data.regions.find(
    (candidate) => candidate.id === stage.regionId
  );
  const target = getStageClearTimeTargetRange({
    region,
    stage,
    enemies: getStageEnemies(data, stage)
  });

  return target ? [target.min, target.max] : null;
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

  const score = scoreStageRewards(farmStage.rewards);

  return {
    stageId: farmStage.id,
    rewards: farmStage.rewards,
    score,
    scoreBreakdown: getStageRewardScoreBreakdown(farmStage.rewards),
    rewardPriority: [...OFFLINE_FARM_RECOMMENDATION_REWARD_PRIORITY],
    reason: `best cleared farm by ${OFFLINE_FARM_RECOMMENDATION_REWARD_PRIORITY.join(" > ")} priority; weighted score ${formatNumber(score)}`
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

function purchaseAffordableTraining(data: StaticGameData, progress: PlayerProgress) {
  let nextProgress = cloneProgress(progress);
  let totalCost = 0;

  while (true) {
    const candidates: TrainingCandidate[] = [];

    for (const upgrade of data.upgrades) {
      if (upgrade.scope === "hero") {
        for (const hero of data.heroes) {
          candidates.push({
            upgradeId: upgrade.id,
            heroId: hero.id,
            cost: calculateUpgradeCost(
              upgrade,
              getUpgradeLevel(nextProgress, upgrade, hero.id)
            )
          });
        }
        continue;
      }

      candidates.push({
        upgradeId: upgrade.id,
        cost: calculateUpgradeCost(
          upgrade,
          getUpgradeLevel(nextProgress, upgrade)
        )
      });
    }

    candidates.sort((first, second) => first.cost - second.cost);

    const candidate = candidates.find(
      (entry) => entry.cost <= nextProgress.resources.silver
    );

    if (!candidate) {
      return {
        progress: nextProgress,
        totalCost
      };
    }

    const purchase = purchaseUpgrade(data.upgrades, {
      progress: nextProgress,
      upgradeId: candidate.upgradeId,
      heroId: candidate.heroId
    });

    if (!purchase.ok) {
      return {
        progress: nextProgress,
        totalCost
      };
    }

    totalCost += purchase.cost;
    nextProgress = purchase.progress;
  }
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

function hasRegionUnlockedByBossClear(
  data: StaticGameData,
  bossStageId: string
): boolean {
  return data.regions.some(
    (region) =>
      region.unlockCondition.type === "stage_cleared" &&
      region.unlockCondition.stageId === bossStageId
  );
}

function farmUntilRegionBossClears(
  data: StaticGameData,
  progressBeforeBoss: PlayerProgress,
  regionId: string,
  bossStageId: string,
  maxClears: number
) {
  let farmProgress = cloneProgress(progressBeforeBoss);
  let lastFarmStageId: string | null = null;
  let totalTrainingCost = 0;

  for (let farmClears = 0; farmClears <= maxClears; farmClears += 1) {
    const training = purchaseAffordableTraining(data, farmProgress);
    farmProgress = training.progress;
    totalTrainingCost += training.totalCost;

    const bossResult = resolveStageBattle(data, {
      progress: farmProgress,
      stageId: bossStageId,
      maxDurationSeconds: 180
    });

    if (bossResult.ok && bossResult.stageCleared) {
      return {
        ok: true as const,
        farmStageId: lastFarmStageId,
        farmClears,
        trainingCost: totalTrainingCost,
        result: bossResult,
        progress: bossResult.progress
      };
    }

    const farmStage = getRecommendedRegionFarmStage(data, farmProgress, regionId);

    if (!farmStage) {
      return {
        ok: false as const,
        farmStageId: null,
        farmClears,
        reason: "no_farm_stage"
      };
    }

    const farmResult = resolveStageBattle(data, {
      progress: farmProgress,
      stageId: farmStage.id,
      maxDurationSeconds: 180
    });

    if (!farmResult.ok || !farmResult.stageCleared) {
      return {
        ok: false as const,
        farmStageId: farmStage.id,
        farmClears,
        reason: farmResult.ok ? "farm_stage_not_cleared" : farmResult.reason
      };
    }

    lastFarmStageId = farmStage.id;
    farmProgress = farmResult.progress;
  }

  return {
    ok: false as const,
    farmStageId: lastFarmStageId,
    farmClears: maxClears,
    reason: "boss_not_cleared_after_max_farms"
  };
}

function calculateWoundUptimeSeconds(
  events: BattleEvent[],
  durationSeconds: number
): number {
  const intervalsByTarget = new Map<string, Array<[number, number]>>();

  for (const event of events) {
    if (event.type !== "wound" || getRecordedStatusId(event) !== "wound") {
      continue;
    }

    const start = Math.max(0, event.time);
    const end = Math.min(durationSeconds, event.endsAt);

    if (end <= start) {
      continue;
    }

    const intervals = intervalsByTarget.get(event.targetId) ?? [];
    intervals.push([start, end]);
    intervalsByTarget.set(event.targetId, intervals);
  }

  let total = 0;

  for (const intervals of intervalsByTarget.values()) {
    intervals.sort((first, second) => first[0] - second[0]);

    let currentStart: number | null = null;
    let currentEnd = 0;

    for (const [start, end] of intervals) {
      if (currentStart === null) {
        currentStart = start;
        currentEnd = end;
        continue;
      }

      if (start <= currentEnd) {
        currentEnd = Math.max(currentEnd, end);
        continue;
      }

      total += currentEnd - currentStart;
      currentStart = start;
      currentEnd = end;
    }

    if (currentStart !== null) {
      total += currentEnd - currentStart;
    }
  }

  return Number(total.toFixed(2));
}

function getRecordedStatusId(event: BattleEvent): string | null {
  return createBattleEventRecord(event, 0).statusId;
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
      ok: false as const,
      stageId: stage.id,
      name: stage.name,
      enemyIds: stage.enemyTeam.combatantIds,
      enemyFormationSlots: [],
      enemyTypes: enemiesForStage.map((enemy) => enemy.type),
      reason: result.reason,
      targetSeconds,
      budgetReasons: [`${stage.id} could not be resolved: ${result.reason}`],
      statusApplications: 0,
      statusDamage: 0,
      statusIds: [],
      medicineConsumed: 0
    };
  }

  const durationSeconds = roundBalanceNumber(result.battle.durationSeconds);
  const guardEvents = result.battle.events.filter(
    (event) =>
      event.type === "guard_absorb" && getRecordedStatusId(event) === "guard"
  );
  const protectEvents = result.battle.events.filter(
    (event) =>
      event.type === "protect" && getRecordedStatusId(event) === "protection"
  );
  const armorBreakEvents = result.battle.events.filter(
    (event) =>
      event.type === "armor_break" &&
      getRecordedStatusId(event) === "armor_break"
  );
  const healEvents = result.battle.events.filter(
    (event) => event.type === "heal"
  );
  const regenerationTickEvents = result.battle.events.filter(
    (event) =>
      event.type === "regeneration_tick" &&
      getRecordedStatusId(event) === "regeneration"
  );
  const woundEvents = result.battle.events.filter(
    (event) => event.type === "wound" && getRecordedStatusId(event) === "wound"
  );
  const cleanseEvents = result.battle.events.filter(
    (event) => event.type === "cleanse"
  );
  const statusApplyEvents = result.battle.events.filter(
    (event): event is Extract<BattleEvent, { type: "status_apply" }> =>
      event.type === "status_apply" && event.sourceId.startsWith("enemy_")
  );
  const statusTickEvents = result.battle.events.filter(
    (event): event is Extract<BattleEvent, { type: "status_tick" }> =>
      event.type === "status_tick" && event.targetId.startsWith("player_")
  );
  const autoMedicineEvents = result.battle.events.filter(
    (event) => event.type === "auto_medicine"
  );
  const targetMet = targetSeconds
    ? result.battle.winner === "player" &&
      isWithinClearTimeTarget(durationSeconds, {
        min: targetSeconds[0],
        max: targetSeconds[1]
      })
    : null;
  const clearTimeAssessment = assessStageClearTimeTarget({
    stageId: stage.id,
    result:
      result.battle.winner === "player" && result.stageCleared
        ? "player_clear"
        : "enemy_hold",
    stageCleared: result.stageCleared,
    durationSeconds,
    target: targetSeconds
      ? {
          min: targetSeconds[0],
          max: targetSeconds[1]
        }
      : null
  });

  return {
    ok: true as const,
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
    clearTimeAssessment,
    budgetReasons:
      clearTimeAssessment.status === "fail" ? [clearTimeAssessment.reason] : [],
    winner: result.battle.winner,
    stageCleared: result.stageCleared,
    result:
      result.battle.winner === "player" && result.stageCleared
        ? ("player_clear" as const)
        : ("enemy_hold" as const),
    durationSeconds,
    qiBreaks: result.battle.events.filter((event) => event.type === "qi_break").length,
    guardAbsorbs: guardEvents.length,
    protections: protectEvents.length,
    armorBreaks: armorBreakEvents.length,
    heals: healEvents.length + regenerationTickEvents.length,
    regenerations: regenerationTickEvents.length,
    wounds: woundEvents.length,
    woundUptimeSeconds: calculateWoundUptimeSeconds(
      result.battle.events,
      durationSeconds
    ),
    cleanses: cleanseEvents.length,
    statusApplications: statusApplyEvents.length,
    statusDamage: roundBalanceNumber(
      statusTickEvents
        .reduce((total, event) => total + event.outerDamage, 0)
    ),
    statusIds: [
      ...new Set(statusApplyEvents.map((event) => event.statusId))
    ].sort(),
    medicineConsumed: autoMedicineEvents.length,
    outerHealing: roundBalanceNumber(
      result.battle.metrics.playerOuterHealing +
        result.battle.metrics.enemyOuterHealing
    ),
    innerQiRestored: roundBalanceNumber(
      result.battle.metrics.playerInnerQiRestored +
        result.battle.metrics.enemyInnerQiRestored
    ),
    overhealing: roundBalanceNumber(
      result.battle.metrics.playerOverhealing +
        result.battle.metrics.enemyOverhealing
    ),
    recoveryPrevented: roundBalanceNumber(
      result.battle.metrics.recoveryPreventedByPlayer +
        result.battle.metrics.recoveryPreventedByEnemy
    ),
    recoveryPreventedByPlayer: roundBalanceNumber(
      result.battle.metrics.recoveryPreventedByPlayer
    ),
    recoveryPreventedByEnemy: roundBalanceNumber(
      result.battle.metrics.recoveryPreventedByEnemy
    ),
    defensiveDamagePrevented: roundBalanceNumber(
      result.battle.metrics.guardDamagePreventedByPlayer +
        result.battle.metrics.guardDamagePreventedByEnemy +
        result.battle.metrics.protectionDamagePreventedByPlayer +
        result.battle.metrics.protectionDamagePreventedByEnemy
    ),
    metrics: {
      playerOuterDamage: roundBalanceNumber(
        result.battle.metrics.playerOuterDamage
      ),
      playerInnerDamage: roundBalanceNumber(
        result.battle.metrics.playerInnerDamage
      ),
      playerEffectiveDps: roundBalanceNumber(
        result.battle.metrics.playerEffectiveDps
      ),
      enemyEffectiveDps: roundBalanceNumber(
        result.battle.metrics.enemyEffectiveDps
      )
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
  const cutter = data.enemies.find((enemy) => enemy.id === "greenline_cutter");

  if (!cutter) {
    throw new Error("Missing enemy greenline_cutter");
  }

  const frontLineScenario = simulateBattle(data, {
    playerTeam: {
      id: "player",
      combatants: [{ kind: "hero", definitionId: "iron_fist_initiate" }]
    },
    enemyTeam: {
      id: "enemy",
      combatants: [
        {
          kind: "enemy",
          definitionId: "greenline_cutter",
          instanceId: "back_cutter",
          formationSlot: "back"
        },
        {
          kind: "enemy",
          definitionId: "greenline_cutter",
          instanceId: "front_cutter",
          formationSlot: "front"
        }
      ]
    },
    maxDurationSeconds: 5
  });
  const highestCpData: StaticGameData = {
    ...data,
    skills: data.skills.map((skill) =>
      skill.id === "impact_combo"
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
      combatants: [{ kind: "hero", definitionId: "iron_fist_initiate" }]
    },
    enemyTeam: {
      id: "enemy",
      combatants: [
        {
          kind: "enemy",
          definitionId: "greenline_cutter",
          instanceId: "front_guard",
          formationSlot: "front"
        },
        {
          kind: "enemy",
          definitionId: "greenline_cutter",
          instanceId: "back_threat",
          formationSlot: "back",
          statsOverride: {
            ...cutter.baseStats,
            outerAttack: cutter.baseStats.outerAttack * 8
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

function buildDefensiveEventSummary(
  stageResults: Array<ReturnType<typeof summarizeBattle>>
) {
  return buildRegionPressureMetrics(stageResults).defensePressure;
}

function buildRecoveryEventSummary(
  stageResults: Array<ReturnType<typeof summarizeBattle>>
) {
  return buildRegionPressureMetrics(stageResults).healingPressure;
}

function buildRegionDifficultyCurve(stageResults: BattleSummary[]) {
  const stages = stageResults.map((stage) => {
    if (!stage.ok) {
      return {
        stageId: stage.stageId,
        result: "unresolved" as const,
        durationSeconds: null,
        targetSeconds: stage.targetSeconds,
        targetStatus: "unresolved" as const,
        reason: `${stage.stageId} could not be resolved: ${stage.reason ?? "unknown"}`
      };
    }

    return {
      stageId: stage.stageId,
      result: stage.result,
      durationSeconds: stage.durationSeconds,
      targetSeconds: stage.targetSeconds,
      targetStatus: stage.targetSeconds
        ? stage.targetMet
          ? ("pass" as const)
          : ("fail" as const)
        : ("untargeted" as const),
      reason: stage.clearTimeAssessment.reason
    };
  });
  const clearStages = stages.filter(
    (stage): stage is typeof stage & {
      result: "player_clear";
      durationSeconds: number;
    } => stage.result === "player_clear" && stage.durationSeconds !== null
  );
  const maxClearStage = clearStages.reduce<
    (typeof clearStages)[number] | null
  >(
    (maxStage, stage) =>
      !maxStage || stage.durationSeconds > maxStage.durationSeconds
        ? stage
        : maxStage,
    null
  );
  const issues = stages
    .filter(
      (stage) =>
        stage.targetStatus === "fail" || stage.targetStatus === "unresolved"
    )
    .map((stage) => ({
      stageId: stage.stageId,
      status: "fail" as const,
      reason: stage.reason
    }));
  const spikes: Array<{
    stageId: string;
    previousStageId: string;
    status: "watch" | "fail";
    durationDeltaSeconds: number;
    ratio: number;
    reason: string;
  }> = [];
  let previousClear: BattleSummary | null = null;

  for (const stage of stageResults) {
    if (
      !stage.ok ||
      stage.result !== "player_clear" ||
      stage.targetSeconds === null
    ) {
      continue;
    }

    if (
      previousClear?.ok &&
      previousClear.result === "player_clear" &&
      previousClear.targetSeconds !== null
    ) {
      const durationDeltaSeconds = Number(
        (stage.durationSeconds - previousClear.durationSeconds).toFixed(2)
      );
      const ratio = Number(
        (stage.durationSeconds / previousClear.durationSeconds).toFixed(2)
      );

      if (
        durationDeltaSeconds >= DIFFICULTY_SPIKE_MIN_DELTA_SECONDS &&
        ratio >= DIFFICULTY_SPIKE_MIN_RATIO
      ) {
        const status =
          stage.clearTimeAssessment.status === "fail" ? "fail" : "watch";
        const reason =
          `${stage.stageId} is ${formatNumber(durationDeltaSeconds)}s slower ` +
          `than ${previousClear.stageId} (${formatNumber(ratio)}x clear time)` +
          (status === "fail"
            ? `; ${stage.clearTimeAssessment.reason}`
            : "");

        spikes.push({
          stageId: stage.stageId,
          previousStageId: previousClear.stageId,
          status,
          durationDeltaSeconds,
          ratio,
          reason
        });
      }
    }

    previousClear = stage;
  }

  return {
    summary: {
      clearCount: clearStages.length,
      holdCount: stages.filter((stage) => stage.result === "enemy_hold").length,
      unresolvedCount: stages.filter((stage) => stage.result === "unresolved")
        .length,
      firstClearStageId: clearStages[0]?.stageId ?? null,
      firstClearSeconds: clearStages[0]?.durationSeconds ?? null,
      lastClearStageId: clearStages.at(-1)?.stageId ?? null,
      lastClearSeconds: clearStages.at(-1)?.durationSeconds ?? null,
      maxClearStageId: maxClearStage?.stageId ?? null,
      maxClearSeconds: maxClearStage?.durationSeconds ?? null
    },
    stages,
    issues,
    spikes
  };
}

function getRegion(data: StaticGameData, regionId: string) {
  const region = data.regions.find((candidate) => candidate.id === regionId);

  if (!region) {
    throw new Error(`Missing region ${regionId}`);
  }

  return region;
}

function formatNumber(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/\.?0+$/, "");
}

function toRegionBudgetGateBattleOutcome(
  summary: BattleSummaryWithBudgetExtras | undefined
): RegionBudgetGateBattleOutcome | undefined {
  if (summary === undefined) {
    return undefined;
  }

  if (!summary.ok) {
    return {
      ok: false,
      stageId: summary.stageId,
      reason: summary.reason
    };
  }

  if (summary.winner === "timeout") {
    return {
      ok: false,
      stageId: summary.stageId,
      reason: "timeout"
    };
  }

  if (summary.winner === "player" && !summary.stageCleared) {
    return {
      ok: false,
      stageId: summary.stageId,
      reason: "uncleared_player_result"
    };
  }

  return {
    ok: true,
    stageId: summary.stageId,
    result:
      summary.winner === "player" && summary.stageCleared
        ? "player_clear"
        : "enemy_hold",
    durationSeconds: summary.durationSeconds,
    medicineConsumed: summary.medicineConsumed,
    statusDamage: summary.statusDamage,
    ...(summary.farmClears === undefined
      ? {}
      : { farmClears: summary.farmClears }),
    ...(summary.trainingCost === undefined
      ? {}
      : { trainingCost: summary.trainingCost })
  };
}

function buildRegionBudgetChecks(
  data: StaticGameData,
  report: RegionBalanceReportBase
): RegionBudgetCheck[] {
  const region = getRegion(data, report.regionId);
  const expectedFarmStage = getRecommendedRegionFarmStage(
    data,
    report.progressBeforeBoss,
    report.regionId
  );
  return buildRegionBudgetGateChecks(buildRegionBudgetGateContext({
    targets: region.balanceTargets,
    stageResults: report.stageResults,
    rewardCurve: {
      actualFarmStageId: report.farmRecommendation?.stageId ?? null,
      expectedFarmStageId: expectedFarmStage?.id ?? null,
      expectedFarmScore:
        expectedFarmStage === null
          ? 0
          : scoreStageRewards(expectedFarmStage.rewards)
    },
    bossGate: {
      baseline: toRegionBudgetGateBattleOutcome(report.bossGate.baseline),
      trained: toRegionBudgetGateBattleOutcome(report.bossGate.trained),
      farmed: toRegionBudgetGateBattleOutcome(report.bossGate.farmed)
    }
  }));
}

function buildBossGateAssumption(
  scenario: "baseline" | "trained" | "farmed",
  summary: BattleSummaryWithBudgetExtras | undefined
) {
  if (!summary) {
    return null;
  }

  const farmClears = summary.farmClears ?? null;
  const farmStageId = summary.farmStageId ?? null;
  const trainingCost = summary.trainingCost ?? null;

  if (!summary.ok) {
    return {
      scenario,
      ok: false as const,
      stageId: summary.stageId,
      result: "unresolved" as const,
      durationSeconds: null,
      targetSeconds: summary.targetSeconds,
      targetMet: null,
      medicineConsumed: summary.medicineConsumed,
      statusDamage: summary.statusDamage,
      farmClears,
      farmStageId,
      trainingCost,
      reason: `${scenario} ${summary.stageId} could not be resolved: ${summary.reason ?? "unknown"}`
    };
  }

  const farmReason =
    farmClears === null
      ? ""
      : ` after ${farmClears} ${farmStageId ?? "region"} farms`;
  const trainingReason =
    trainingCost === null ? "" : ` and ${formatNumber(trainingCost)} silver training`;
  const reason =
    `${scenario} ${summary.stageId} ${summary.result} in ` +
    `${formatNumber(summary.durationSeconds)}s with ` +
    `${summary.medicineConsumed} medicine and ` +
    `${formatNumber(summary.statusDamage)} status damage${farmReason}${trainingReason}`;

  return {
    scenario,
    ok: true as const,
    stageId: summary.stageId,
    result: summary.result,
    stageCleared: summary.stageCleared,
    durationSeconds: summary.durationSeconds,
    targetSeconds: summary.targetSeconds,
    targetMet: summary.targetMet,
    medicineConsumed: summary.medicineConsumed,
    statusDamage: summary.statusDamage,
    farmClears,
    farmStageId,
    trainingCost,
    reason
  };
}

function buildBossGateAssumptions(
  bossGate: RegionBalanceReportBase["bossGate"]
) {
  return [
    buildBossGateAssumption("baseline", bossGate.baseline),
    buildBossGateAssumption("trained", bossGate.trained),
    buildBossGateAssumption("farmed", bossGate.farmed)
  ].filter((assumption) => assumption !== null);
}

function withRegionBudgetChecks(
  data: StaticGameData,
  report: RegionBalanceReportBase
): RegionBalanceReport {
  return {
    ...report,
    bossGateAssumptions: buildBossGateAssumptions(report.bossGate),
    budgetChecks: buildRegionBudgetChecks(data, report)
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
  const bossFarmClear =
    bossBaseline.ok &&
    !bossBaseline.stageCleared &&
    regionId !== BAMBOO_ROAD_REGION_ID &&
    hasRegionUnlockedByBossClear(data, bossStage.id)
      ? farmUntilRegionBossClears(
          data,
          progressBeforeBoss,
          regionId,
          bossStage.id,
          80
        )
      : null;
  const progressAfterRegion =
    bossFarmClear?.ok ? bossFarmClear.progress : progress;

  return {
    regionId,
    regionName:
      data.regions.find((region) => region.id === regionId)?.name ?? regionId,
    stageResults,
    bossGate: {
      baseline: summarizeBattle(data, bossStage, bossBaseline),
      farmed:
        bossFarmClear?.ok
          ? {
              ...summarizeBattle(data, bossStage, bossFarmClear.result),
              farmStageId: bossFarmClear.farmStageId,
              farmClears: bossFarmClear.farmClears,
              trainingCost: bossFarmClear.trainingCost
            }
          : undefined
    },
    difficultyCurve: buildRegionDifficultyCurve(stageResults),
    farmRecommendation,
    masteryMilestone: buildRegionMasteryMilestone(
      data,
      progressBeforeBoss,
      regionId,
      farmRecommendation
    ),
    defensiveEvents: buildDefensiveEventSummary(stageResults),
    recoveryEvents: buildRecoveryEventSummary(stageResults),
    progressBeforeBoss,
    progressAfterRegion
  };
}

type RegionBalanceReportBase = ReturnType<typeof buildRegionStageProgressionReport> & {
  bossGate: ReturnType<typeof buildRegionStageProgressionReport>["bossGate"] & {
    trained?: BattleSummaryWithBudgetExtras;
  };
};

type RegionBalanceReport = RegionBalanceReportBase & {
  bossGateAssumptions: ReturnType<typeof buildBossGateAssumptions>;
  budgetChecks: RegionBudgetCheck[];
};

type SeededRegionBalanceReport = {
  report: RegionBalanceReportBase;
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
      const seededRegionReport = {
        ...seededReport.report,
        progressAfterRegion: seededReport.progressAfterRegion
      };
      regionBalances.push(withRegionBudgetChecks(data, seededRegionReport));
      nextRegionStartingProgress = seededReport.progressAfterRegion;
      continue;
    }

    const regionBalance = withRegionBudgetChecks(
      data,
      buildRegionStageProgressionReport(data, regionId, nextRegionStartingProgress)
    );
    regionBalances.push(regionBalance);
    nextRegionStartingProgress = regionBalance.progressAfterRegion;
  }

  return regionBalances;
}

export function buildGameBalanceReport(data: StaticGameData) {
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
    throw new Error(
      "No cleared Greenline Approach stage is available for farm simulation"
    );
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
  const trainedBossSummary: BattleSummaryWithBudgetExtras = {
    ...summarizeBattle(data, bossStage, trainedBoss),
    ...(trainingEconomy.ok
      ? {
          farmStageId: trainingEconomy.farmStageId,
          farmClears: trainingEconomy.farmClears,
          trainingCost: trainingEconomy.trainingCost
        }
      : {})
  };
  const bambooRoadRegionReport: RegionBalanceReportBase = {
    ...bambooRoadProgression,
    bossGate: {
      ...bambooRoadProgression.bossGate,
      trained: trainedBossSummary
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
        trained: trainedBossSummary,
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

function getTacticComparisonTargetStatus(
  summary: TacticComparisonBattleSummary
): "pass" | "fail" | "untargeted" | "unresolved" {
  if (!summary.ok) {
    return "unresolved";
  }

  if (!summary.targetSeconds) {
    return "untargeted";
  }

  return summary.targetMet ? "pass" : "fail";
}

function getTacticComparisonResult(
  summary: TacticComparisonBattleSummary
): "player_clear" | "enemy_hold" | "unresolved" {
  return summary.ok ? summary.result : "unresolved";
}

function getTacticComparisonNumberDelta(
  value: number | null,
  baseline: number | null
): number | null {
  return value === null || baseline === null
    ? null
    : roundBalanceNumber(value - baseline);
}

function getTacticComparisonTargetStatusChange(
  targetStatus: ReturnType<typeof getTacticComparisonTargetStatus>,
  baselineTargetStatus: ReturnType<typeof getTacticComparisonTargetStatus>
): "same" | "improved" | "regressed" | "changed" {
  if (targetStatus === baselineTargetStatus) {
    return "same";
  }

  const statusRank = {
    unresolved: 0,
    fail: 1,
    untargeted: 2,
    pass: 3
  } as const satisfies Record<
    ReturnType<typeof getTacticComparisonTargetStatus>,
    number
  >;

  if (statusRank[targetStatus] > statusRank[baselineTargetStatus]) {
    return "improved";
  }

  if (statusRank[targetStatus] < statusRank[baselineTargetStatus]) {
    return "regressed";
  }

  return "changed";
}

function getTacticComparisonBudgetShift(
  targetStatus: ReturnType<typeof getTacticComparisonTargetStatus>,
  baselineTargetStatus: ReturnType<typeof getTacticComparisonTargetStatus>,
  result: ReturnType<typeof getTacticComparisonResult>,
  baselineResult: ReturnType<typeof getTacticComparisonResult>
):
  | "unchanged"
  | "preserved_existing_miss"
  | "improved_existing_miss"
  | "new_miss"
  | "changed" {
  if (result !== baselineResult) {
    if (baselineResult === "player_clear" && result !== "player_clear") {
      return "new_miss";
    }

    if (baselineResult !== "player_clear" && result === "player_clear") {
      return "improved_existing_miss";
    }
  }

  if (targetStatus === baselineTargetStatus) {
    return targetStatus === "fail" || targetStatus === "unresolved"
      ? "preserved_existing_miss"
      : "unchanged";
  }

  if (
    (baselineTargetStatus === "fail" ||
      baselineTargetStatus === "unresolved") &&
    targetStatus === "pass"
  ) {
    return "improved_existing_miss";
  }

  if (
    baselineTargetStatus === "pass" &&
    (targetStatus === "fail" || targetStatus === "unresolved")
  ) {
    return "new_miss";
  }

  return "changed";
}

function getTacticComparisonPressure(summary: TacticComparisonBattleSummary) {
  return {
    statusApplications: summary.statusApplications,
    statusDamage: summary.statusDamage,
    medicineConsumed: summary.medicineConsumed,
    guardAbsorbs: summary.ok ? summary.guardAbsorbs : null,
    protections: summary.ok ? summary.protections : null,
    armorBreaks: summary.ok ? summary.armorBreaks : null,
    heals: summary.ok ? summary.heals : null,
    cleanses: summary.ok ? summary.cleanses : null,
    defensiveDamagePrevented: summary.ok
      ? summary.defensiveDamagePrevented
      : null,
    recoveryPrevented: summary.ok ? summary.recoveryPrevented : null
  };
}

function getTacticComparisonMetrics(summary: TacticComparisonBattleSummary) {
  return {
    playerOuterDamage: summary.ok ? summary.metrics.playerOuterDamage : null,
    playerInnerDamage: summary.ok ? summary.metrics.playerInnerDamage : null,
    playerEffectiveDps: summary.ok ? summary.metrics.playerEffectiveDps : null,
    enemyEffectiveDps: summary.ok ? summary.metrics.enemyEffectiveDps : null
  };
}

function buildTacticComparisonRow({
  baselineSummary,
  regionName,
  regionId,
  stage,
  summary,
  tactic,
  defaultTacticId
}: {
  baselineSummary: TacticComparisonBattleSummary;
  regionName: string;
  regionId: string;
  stage: StageDefinition;
  summary: TacticComparisonBattleSummary;
  tactic: StaticGameData["tactics"][number];
  defaultTacticId: string;
}) {
  const targetStatus = getTacticComparisonTargetStatus(summary);
  const baselineTargetStatus =
    getTacticComparisonTargetStatus(baselineSummary);
  const result = getTacticComparisonResult(summary);
  const baselineResult = getTacticComparisonResult(baselineSummary);
  const durationSeconds = summary.ok ? summary.durationSeconds : null;
  const baselineDurationSeconds = baselineSummary.ok
    ? baselineSummary.durationSeconds
    : null;
  const pressure = getTacticComparisonPressure(summary);
  const baselinePressure = getTacticComparisonPressure(baselineSummary);
  const metrics = getTacticComparisonMetrics(summary);
  const baselineMetrics = getTacticComparisonMetrics(baselineSummary);

  return {
    regionId,
    regionName,
    stageId: stage.id,
    stageName: stage.name,
    stageIndex: stage.index,
    tacticId: tactic.id,
    tacticName: tactic.name,
    isDefaultTactic: tactic.id === defaultTacticId,
    behaviorFlags: [...tactic.behaviorFlags],
    baselineTacticId: defaultTacticId,
    result,
    baselineResult,
    resultChanged: result !== baselineResult,
    durationSeconds,
    baselineDurationSeconds,
    durationDeltaSeconds: getTacticComparisonNumberDelta(
      durationSeconds,
      baselineDurationSeconds
    ),
    targetMinSeconds: summary.targetSeconds?.[0] ?? null,
    targetMaxSeconds: summary.targetSeconds?.[1] ?? null,
    targetStatus,
    baselineTargetStatus,
    targetStatusChange: getTacticComparisonTargetStatusChange(
      targetStatus,
      baselineTargetStatus
    ),
    budgetShift: getTacticComparisonBudgetShift(
      targetStatus,
      baselineTargetStatus,
      result,
      baselineResult
    ),
    clearTimeReason: summary.ok
      ? summary.clearTimeAssessment.reason
      : summary.reason ?? "unknown",
    baselineClearTimeReason: baselineSummary.ok
      ? baselineSummary.clearTimeAssessment.reason
      : baselineSummary.reason ?? "unknown",
    pressure,
    pressureDeltas: {
      statusApplications:
        pressure.statusApplications - baselinePressure.statusApplications,
      statusDamage: getTacticComparisonNumberDelta(
        pressure.statusDamage,
        baselinePressure.statusDamage
      ),
      medicineConsumed:
        pressure.medicineConsumed - baselinePressure.medicineConsumed,
      guardAbsorbs: getTacticComparisonNumberDelta(
        pressure.guardAbsorbs,
        baselinePressure.guardAbsorbs
      ),
      protections: getTacticComparisonNumberDelta(
        pressure.protections,
        baselinePressure.protections
      ),
      armorBreaks: getTacticComparisonNumberDelta(
        pressure.armorBreaks,
        baselinePressure.armorBreaks
      ),
      heals: getTacticComparisonNumberDelta(pressure.heals, baselinePressure.heals),
      cleanses: getTacticComparisonNumberDelta(
        pressure.cleanses,
        baselinePressure.cleanses
      ),
      defensiveDamagePrevented: getTacticComparisonNumberDelta(
        pressure.defensiveDamagePrevented,
        baselinePressure.defensiveDamagePrevented
      ),
      recoveryPrevented: getTacticComparisonNumberDelta(
        pressure.recoveryPrevented,
        baselinePressure.recoveryPrevented
      )
    },
    contributionMetrics: metrics,
    contributionDeltas: {
      playerOuterDamage: getTacticComparisonNumberDelta(
        metrics.playerOuterDamage,
        baselineMetrics.playerOuterDamage
      ),
      playerInnerDamage: getTacticComparisonNumberDelta(
        metrics.playerInnerDamage,
        baselineMetrics.playerInnerDamage
      ),
      playerEffectiveDps: getTacticComparisonNumberDelta(
        metrics.playerEffectiveDps,
        baselineMetrics.playerEffectiveDps
      ),
      enemyEffectiveDps: getTacticComparisonNumberDelta(
        metrics.enemyEffectiveDps,
        baselineMetrics.enemyEffectiveDps
      )
    }
  };
}

function buildRegionTacticComparisonRows(
  data: StaticGameData,
  region: GameBalanceReport["regionBalances"][number],
  startingProgress: PlayerProgress,
  defaultTacticId: string
) {
  const stageIds = getRegionStageIds(data, region.regionId);
  let progress = cloneProgress(startingProgress);
  const rows: ReturnType<typeof buildTacticComparisonRow>[] = [];

  for (const stageId of stageIds) {
    const stage = getStage(data, stageId);
    const tacticResults = data.tactics.map((tactic) => {
      const result = resolveStageBattle(data, {
        progress,
        stageId,
        tacticId: tactic.id,
        maxDurationSeconds: 180
      });

      return {
        tactic,
        result,
        summary: summarizeBattle(data, stage, result)
      };
    });
    const baseline = tacticResults.find(
      (result) => result.tactic.id === defaultTacticId
    );

    if (!baseline) {
      throw new Error(
        `Default tactic ${defaultTacticId} is not configured for tactic comparison`
      );
    }

    rows.push(
      ...tacticResults.map((result) =>
        buildTacticComparisonRow({
          baselineSummary: baseline.summary,
          regionName: region.regionName,
          regionId: region.regionId,
          stage,
          summary: result.summary,
          tactic: result.tactic,
          defaultTacticId
        })
      )
    );

    if (baseline.result.ok && baseline.result.stageCleared) {
      progress = baseline.result.progress;
    }
  }

  return rows;
}

export function buildTacticComparisonReport(data: StaticGameData) {
  if (data.tactics.length === 0) {
    throw new Error("No tactics configured for tactic comparison");
  }

  const defaultTacticId = getDefaultSelectedTacticId(data);
  const baselineReport = buildGameBalanceReport(data);
  let regionStartingProgress = createInitialPlayerProgress(data);
  const rows: ReturnType<typeof buildTacticComparisonRow>[] = [];
  const regions: Array<{
    regionId: string;
    regionName: string;
    stageCount: number;
    rowCount: number;
  }> = [];

  for (const region of baselineReport.regionBalances) {
    const regionRows = buildRegionTacticComparisonRows(
      data,
      region,
      regionStartingProgress,
      defaultTacticId
    );

    rows.push(...regionRows);
    regions.push({
      regionId: region.regionId,
      regionName: region.regionName,
      stageCount: region.stageResults.length,
      rowCount: regionRows.length
    });
    regionStartingProgress = cloneProgress(region.progressAfterRegion);
  }

  return {
    defaultTacticId,
    tactics: data.tactics.map((tactic) => ({
      tacticId: tactic.id,
      tacticName: tactic.name,
      isDefault: tactic.id === defaultTacticId,
      behaviorFlags: [...tactic.behaviorFlags],
      targetPriorities: tactic.targetPriorities ? [...tactic.targetPriorities] : [],
      modifiers: tactic.modifiers.map((modifier) => ({ ...modifier }))
    })),
    regions,
    rows
  };
}

export const buildBambooRoadBalanceReport = buildGameBalanceReport;

export type GameBalanceReport = ReturnType<typeof buildGameBalanceReport>;
export type BambooRoadBalanceReport = GameBalanceReport;
export type TacticComparisonReport = ReturnType<typeof buildTacticComparisonReport>;
