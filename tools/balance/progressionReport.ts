import {
  assessStageClearTimeTarget,
  calculateUpgradeCost,
  cloneProgress,
  createInitialPlayerProgress,
  getBattleEventStatusId,
  getRecommendedOfflineFarmStage,
  getStageClearTimeTargetRange,
  getUpgradeLevel,
  isWithinClearTimeTarget,
  isBetterOfflineFarmStage,
  getNextMasteryThreshold,
  purchaseUpgrade,
  resolveStageBattle,
  scoreStageRewards,
  simulateBattle
} from "../../core";
import type {
  BalanceResultExpectation,
  BalanceTargetCheck,
  BattleEvent,
  PlayerProgress,
  ResolveStageBattleResult,
  StaticGameData,
  StageDefinition
} from "../../core";

export const BAMBOO_ROAD_REGION_ID = "bamboo_road";
export const MIST_VALLEY_REGION_ID = "mist_valley";
export const BLACK_IRON_FORT_REGION_ID = "black_iron_fort";
export const LOTUS_MONASTERY_REGION_ID = "lotus_monastery";

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
type RegionBudgetCheck = BalanceTargetCheck;

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
    if (event.type !== "wound" || getBattleEventStatusId(event) !== "wound") {
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
      reason: result.reason,
      clearTimeAssessment: {
        id: "clear_time",
        label: "Clear Time",
        status: "fail" as const,
        reason: `${stage.id} could not be resolved: ${result.reason}`
      },
      budgetReasons: [`${stage.id} could not be resolved: ${result.reason}`],
      statusApplications: 0,
      statusDamage: 0,
      statusIds: [],
      medicineConsumed: 0
    };
  }

  const durationSeconds = Number(result.battle.durationSeconds.toFixed(2));
  const guardEvents = result.battle.events.filter(
    (event) =>
      event.type === "guard_absorb" && getBattleEventStatusId(event) === "guard"
  );
  const protectEvents = result.battle.events.filter(
    (event) =>
      event.type === "protect" && getBattleEventStatusId(event) === "protection"
  );
  const armorBreakEvents = result.battle.events.filter(
    (event) =>
      event.type === "armor_break" &&
      getBattleEventStatusId(event) === "armor_break"
  );
  const healEvents = result.battle.events.filter(
    (event) => event.type === "heal"
  );
  const regenerationTickEvents = result.battle.events.filter(
    (event) =>
      event.type === "regeneration_tick" &&
      getBattleEventStatusId(event) === "regeneration"
  );
  const woundEvents = result.battle.events.filter(
    (event) => event.type === "wound" && getBattleEventStatusId(event) === "wound"
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
    clearTimeAssessment,
    budgetReasons:
      clearTimeAssessment.status === "fail" ? [clearTimeAssessment.reason] : [],
    winner: result.battle.winner,
    stageCleared: result.stageCleared,
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
    statusDamage: Number(
      statusTickEvents
        .reduce((total, event) => total + event.outerDamage, 0)
        .toFixed(2)
    ),
    statusIds: [
      ...new Set(statusApplyEvents.map((event) => event.statusId))
    ].sort(),
    medicineConsumed: autoMedicineEvents.length,
    outerHealing: Number(
      (
        result.battle.metrics.playerOuterHealing +
        result.battle.metrics.enemyOuterHealing
      ).toFixed(2)
    ),
    innerQiRestored: Number(
      (
        result.battle.metrics.playerInnerQiRestored +
        result.battle.metrics.enemyInnerQiRestored
      ).toFixed(2)
    ),
    overhealing: Number(
      (
        result.battle.metrics.playerOverhealing +
        result.battle.metrics.enemyOverhealing
      ).toFixed(2)
    ),
    recoveryPrevented: Number(
      (
        result.battle.metrics.recoveryPreventedByPlayer +
        result.battle.metrics.recoveryPreventedByEnemy
      ).toFixed(2)
    ),
    recoveryPreventedByPlayer: Number(
      result.battle.metrics.recoveryPreventedByPlayer.toFixed(2)
    ),
    recoveryPreventedByEnemy: Number(
      result.battle.metrics.recoveryPreventedByEnemy.toFixed(2)
    ),
    defensiveDamagePrevented: Number(
      (
        result.battle.metrics.guardDamagePreventedByPlayer +
        result.battle.metrics.guardDamagePreventedByEnemy +
        result.battle.metrics.protectionDamagePreventedByPlayer +
        result.battle.metrics.protectionDamagePreventedByEnemy
      ).toFixed(2)
    ),
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

function buildDefensiveEventSummary(
  stageResults: Array<ReturnType<typeof summarizeBattle>>
) {
  return stageResults.reduce(
    (summary, stage) => {
      if (!stage.ok) {
        return summary;
      }

      return {
        guardAbsorbs: summary.guardAbsorbs + (stage.guardAbsorbs ?? 0),
        protections: summary.protections + (stage.protections ?? 0),
        armorBreaks: summary.armorBreaks + (stage.armorBreaks ?? 0),
        defensiveDamagePrevented: Number(
          (
            summary.defensiveDamagePrevented +
            (stage.defensiveDamagePrevented ?? 0)
          ).toFixed(2)
        )
      };
    },
    {
      guardAbsorbs: 0,
      protections: 0,
      armorBreaks: 0,
      defensiveDamagePrevented: 0
    }
  );
}

function buildRecoveryEventSummary(
  stageResults: Array<ReturnType<typeof summarizeBattle>>
) {
  return stageResults.reduce(
    (summary, stage) => {
      if (!stage.ok) {
        return summary;
      }

      return {
        heals: summary.heals + (stage.heals ?? 0),
        regenerations: summary.regenerations + (stage.regenerations ?? 0),
        wounds: summary.wounds + (stage.wounds ?? 0),
        woundUptimeSeconds: Number(
          (
            summary.woundUptimeSeconds +
            (stage.woundUptimeSeconds ?? 0)
          ).toFixed(2)
        ),
        cleanses: summary.cleanses + (stage.cleanses ?? 0),
        outerHealing: Number(
          (summary.outerHealing + (stage.outerHealing ?? 0)).toFixed(2)
        ),
        innerQiRestored: Number(
          (summary.innerQiRestored + (stage.innerQiRestored ?? 0)).toFixed(2)
        ),
        overhealing: Number(
          (summary.overhealing + (stage.overhealing ?? 0)).toFixed(2)
        ),
        recoveryPrevented: Number(
          (
            summary.recoveryPrevented +
            (stage.recoveryPrevented ?? 0)
          ).toFixed(2)
        )
      };
    },
    {
      heals: 0,
      regenerations: 0,
      wounds: 0,
      woundUptimeSeconds: 0,
      cleanses: 0,
      outerHealing: 0,
      innerQiRestored: 0,
      overhealing: 0,
      recoveryPrevented: 0
    }
  );
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

function buildRegionStatusSummary(stageResults: BattleSummary[]) {
  return stageResults.reduce(
    (summary, stage) => {
      if (!stage.ok) {
        return summary;
      }

      for (const statusId of stage.statusIds) {
        summary.statusIds.add(statusId);
      }

      return {
        applications: summary.applications + stage.statusApplications,
        damage: Number((summary.damage + stage.statusDamage).toFixed(2)),
        medicineConsumed: summary.medicineConsumed + stage.medicineConsumed,
        statusIds: summary.statusIds
      };
    },
    {
      applications: 0,
      damage: 0,
      medicineConsumed: 0,
      statusIds: new Set<string>()
    }
  );
}

function makeBudgetCheck(
  id: string,
  label: string,
  failures: string[],
  passReason: string
): RegionBudgetCheck {
  return {
    id,
    label,
    status: failures.length > 0 ? "fail" : "pass",
    reason: failures.length > 0 ? failures.join("; ") : passReason
  };
}

function buildClearTimeBudgetCheck(stageResults: BattleSummary[]): RegionBudgetCheck {
  const evaluatedStages = stageResults.filter(
    (stage) => stage.ok && stage.targetSeconds !== null
  );
  const failures = evaluatedStages
    .filter((stage) => stage.clearTimeAssessment.status === "fail")
    .map((stage) => stage.clearTimeAssessment.reason);

  return makeBudgetCheck(
    "clear_time",
    "Clear Time",
    failures,
    `${evaluatedStages.length} configured stages are within clear-time targets`
  );
}

function buildRewardCurveBudgetCheck(
  data: StaticGameData,
  report: RegionBalanceReportBase
): RegionBudgetCheck | null {
  const target = getRegion(data, report.regionId).balanceTargets?.rewardCurve;

  if (!target?.requireBestFarmRecommendation) {
    return null;
  }

  const expectedFarmStage = getRecommendedRegionFarmStage(
    data,
    report.progressBeforeBoss,
    report.regionId
  );
  const actualStageId = report.farmRecommendation?.stageId ?? null;
  const expectedStageId = expectedFarmStage?.id ?? null;
  const failures =
    actualStageId === expectedStageId
      ? []
      : [
          `farm recommendation ${actualStageId ?? "none"} does not match best configured farm ${expectedStageId ?? "none"}`
        ];
  const score =
    expectedFarmStage === null
      ? 0
      : scoreStageRewards(expectedFarmStage.rewards);

  return makeBudgetCheck(
    "reward_curve",
    "Reward Curve",
    failures,
    expectedFarmStage
      ? `${expectedFarmStage.id} is the best farm target at score ${formatNumber(score)}`
      : "no farm target is expected for this region state"
  );
}

function buildStatusPressureBudgetCheck(
  data: StaticGameData,
  report: RegionBalanceReportBase
): RegionBudgetCheck | null {
  const target = getRegion(data, report.regionId).balanceTargets?.statusPressure;

  if (target === undefined) {
    return null;
  }

  const summary = buildRegionStatusSummary(report.stageResults);
  const failures: string[] = [];

  if (
    target.minApplications !== undefined &&
    summary.applications < target.minApplications
  ) {
    failures.push(
      `status applications ${summary.applications} below minimum ${target.minApplications}`
    );
  }

  if (
    target.maxApplications !== undefined &&
    summary.applications > target.maxApplications
  ) {
    failures.push(
      `status applications ${summary.applications} above maximum ${target.maxApplications}`
    );
  }

  if (
    target.maxExpectedDamage !== undefined &&
    summary.damage > target.maxExpectedDamage
  ) {
    failures.push(
      `status damage ${formatNumber(summary.damage)} above maximum ${formatNumber(target.maxExpectedDamage)}`
    );
  }

  if (
    target.maxMedicineConsumed !== undefined &&
    summary.medicineConsumed > target.maxMedicineConsumed
  ) {
    failures.push(
      `medicine consumed ${summary.medicineConsumed} above maximum ${target.maxMedicineConsumed}`
    );
  }

  for (const statusId of target.expectedStatusIds ?? []) {
    if (!summary.statusIds.has(statusId)) {
      failures.push(`expected status ${statusId} was not applied`);
    }
  }

  return makeBudgetCheck(
    "status_pressure",
    "Status Pressure",
    failures,
    `${summary.applications} applications, ${formatNumber(summary.damage)} damage, ${summary.medicineConsumed} medicine within status budget`
  );
}

function buildDefensePressureBudgetCheck(
  data: StaticGameData,
  report: RegionBalanceReportBase
): RegionBudgetCheck | null {
  const target = getRegion(data, report.regionId).balanceTargets?.defensePressure;

  if (target === undefined) {
    return null;
  }

  const events = report.defensiveEvents;
  const failures: string[] = [];

  if (
    target.minGuardAbsorbs !== undefined &&
    events.guardAbsorbs < target.minGuardAbsorbs
  ) {
    failures.push(
      `guard absorbs ${events.guardAbsorbs} below minimum ${target.minGuardAbsorbs}`
    );
  }

  if (
    target.minArmorBreaks !== undefined &&
    events.armorBreaks < target.minArmorBreaks
  ) {
    failures.push(
      `armor breaks ${events.armorBreaks} below minimum ${target.minArmorBreaks}`
    );
  }

  if (
    target.minDamagePrevented !== undefined &&
    events.defensiveDamagePrevented < target.minDamagePrevented
  ) {
    failures.push(
      `damage prevented ${formatNumber(events.defensiveDamagePrevented)} below minimum ${formatNumber(target.minDamagePrevented)}`
    );
  }

  return makeBudgetCheck(
    "defense_pressure",
    "Defense Pressure",
    failures,
    `g${events.guardAbsorbs}/a${events.armorBreaks}, ${formatNumber(events.defensiveDamagePrevented)} damage prevented within defense budget`
  );
}

function buildHealingPressureBudgetCheck(
  data: StaticGameData,
  report: RegionBalanceReportBase
): RegionBudgetCheck | null {
  const target = getRegion(data, report.regionId).balanceTargets?.healingPressure;

  if (target === undefined) {
    return null;
  }

  const events = report.recoveryEvents;
  const failures: string[] = [];

  if (target.minHeals !== undefined && events.heals < target.minHeals) {
    failures.push(`heals ${events.heals} below minimum ${target.minHeals}`);
  }

  if (
    target.minOuterHealing !== undefined &&
    events.outerHealing < target.minOuterHealing
  ) {
    failures.push(
      `Outer healing ${formatNumber(events.outerHealing)} below minimum ${formatNumber(target.minOuterHealing)}`
    );
  }

  if (target.minCleanses !== undefined && events.cleanses < target.minCleanses) {
    failures.push(
      `cleanses ${events.cleanses} below minimum ${target.minCleanses}`
    );
  }

  if (
    target.maxRecoveryPrevented !== undefined &&
    events.recoveryPrevented > target.maxRecoveryPrevented
  ) {
    failures.push(
      `recovery denied ${formatNumber(events.recoveryPrevented)} above maximum ${formatNumber(target.maxRecoveryPrevented)}`
    );
  }

  return makeBudgetCheck(
    "healing_pressure",
    "Healing Pressure",
    failures,
    `${events.heals} heals, ${formatNumber(events.outerHealing)} Outer healing, ${events.cleanses} cleanses within healing budget`
  );
}

function summaryMatchesExpectedResult(
  summary: BattleSummary | undefined,
  expected: BalanceResultExpectation
): boolean {
  if (summary === undefined || !summary.ok) {
    return false;
  }

  if (expected === "player_clear") {
    return summary.winner === "player" && summary.stageCleared;
  }

  return summary.winner === "enemy" && !summary.stageCleared;
}

function describeSummaryOutcome(summary: BattleSummary | undefined): string {
  if (summary === undefined) {
    return "missing";
  }

  if (!summary.ok) {
    return `error:${summary.reason}`;
  }

  return summary.winner === "player" && summary.stageCleared
    ? "player_clear"
    : "enemy_hold";
}

function buildBossGateBudgetCheck(
  data: StaticGameData,
  report: RegionBalanceReportBase
): RegionBudgetCheck | null {
  const target = getRegion(data, report.regionId).balanceTargets?.bossGate;

  if (target === undefined) {
    return null;
  }

  const failures: string[] = [];
  const baseline = report.bossGate.baseline;
  const trained = report.bossGate.trained;
  const farmed = report.bossGate.farmed;

  if (
    target.baselineResult !== undefined &&
    !summaryMatchesExpectedResult(baseline, target.baselineResult)
  ) {
    failures.push(
      `baseline expected ${target.baselineResult}, got ${describeSummaryOutcome(baseline)}`
    );
  }

  if (
    target.trainedResult !== undefined &&
    !summaryMatchesExpectedResult(trained, target.trainedResult)
  ) {
    failures.push(
      `trained expected ${target.trainedResult}, got ${describeSummaryOutcome(trained)}`
    );
  }

  if (
    target.farmedResult !== undefined &&
    !summaryMatchesExpectedResult(farmed, target.farmedResult)
  ) {
    failures.push(
      `farmed expected ${target.farmedResult}, got ${describeSummaryOutcome(farmed)}`
    );
  }

  if (
    target.maxFarmClears !== undefined &&
    farmed !== undefined &&
    "farmClears" in farmed &&
    farmed.farmClears > target.maxFarmClears
  ) {
    failures.push(
      `farmed clear needs ${farmed.farmClears} farms above maximum ${target.maxFarmClears}`
    );
  }

  if (
    target.maxTrainingCost !== undefined &&
    farmed !== undefined &&
    "trainingCost" in farmed &&
    farmed.trainingCost > target.maxTrainingCost
  ) {
    failures.push(
      `farmed clear training cost ${farmed.trainingCost} above maximum ${target.maxTrainingCost}`
    );
  }

  const checkedBoss = farmed ?? trained ?? baseline;
  if (
    target.clearTimeSeconds !== undefined &&
    "durationSeconds" in checkedBoss &&
    "stageCleared" in checkedBoss &&
    "winner" in checkedBoss
  ) {
    const stageCleared = checkedBoss.stageCleared === true;
    const durationSeconds = checkedBoss.durationSeconds ?? 0;
    const clearTimeAssessment = assessStageClearTimeTarget({
      stageId: checkedBoss.stageId,
      result:
        checkedBoss.winner === "player" && stageCleared
          ? "player_clear"
          : "enemy_hold",
      stageCleared,
      durationSeconds,
      target: target.clearTimeSeconds
    });

    if (clearTimeAssessment.status === "fail") {
      failures.push(clearTimeAssessment.reason);
    }
  }

  if (
    target.maxMedicineConsumed !== undefined &&
    "medicineConsumed" in checkedBoss &&
    checkedBoss.medicineConsumed > target.maxMedicineConsumed
  ) {
    failures.push(
      `boss medicine ${checkedBoss.medicineConsumed} above maximum ${target.maxMedicineConsumed}`
    );
  }

  if (
    target.maxStatusDamage !== undefined &&
    "statusDamage" in checkedBoss &&
    checkedBoss.statusDamage > target.maxStatusDamage
  ) {
    failures.push(
      `boss status damage ${formatNumber(checkedBoss.statusDamage)} above maximum ${formatNumber(target.maxStatusDamage)}`
    );
  }

  return makeBudgetCheck(
    "boss_gate",
    "Boss Gate",
    failures,
    `boss outcomes match configured gate expectations`
  );
}

function buildRegionBudgetChecks(
  data: StaticGameData,
  report: RegionBalanceReportBase
): RegionBudgetCheck[] {
  return [
    buildClearTimeBudgetCheck(report.stageResults),
    buildRewardCurveBudgetCheck(data, report),
    buildStatusPressureBudgetCheck(data, report),
    buildDefensePressureBudgetCheck(data, report),
    buildHealingPressureBudgetCheck(data, report),
    buildBossGateBudgetCheck(data, report)
  ].filter((check): check is RegionBudgetCheck => check !== null);
}

function withRegionBudgetChecks(
  data: StaticGameData,
  report: RegionBalanceReportBase
): RegionBalanceReport {
  return {
    ...report,
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
    trained?: ReturnType<typeof summarizeBattle>;
  };
};

type RegionBalanceReport = RegionBalanceReportBase & {
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
      "No cleared Bamboo Road stage is available for farm simulation"
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
  const bambooRoadRegionReport: RegionBalanceReportBase = {
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

export const buildBambooRoadBalanceReport = buildGameBalanceReport;

export type GameBalanceReport = ReturnType<typeof buildGameBalanceReport>;
export type BambooRoadBalanceReport = GameBalanceReport;
