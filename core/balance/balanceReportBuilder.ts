import {
  calculateEffectiveStatusResistance,
  calculateAttackInterval,
  calculateInnerDamage,
  calculateOuterDamage,
  createStatusDictionary,
  estimateStatusApplication,
  estimateStatusHealingDenied,
  estimateStatusModifierDamage,
  estimateStatusTickDamage,
  getStageStatusPressureIds
} from "../combat";
import {
  getStageClearTimeTargetRange
} from "./targets";
import type { BaseStats, StatusEffectDefinition } from "../combat";
import type {
  ClearTimeTargetRange,
  EnemyDefinition,
  HeroDefinition,
  MedicineDefinition,
  SkillDefinition,
  StageDefinition,
  StaticGameData
} from "../data";

import { defaultBalanceScenarioPresets } from "./balanceTypes";
import type {
  BalanceAssessmentRating,
  BalanceGateRating,
  BalanceReport,
  BalanceResult,
  BalanceReportTotals,
  BalanceScenarioId,
  BalanceScenarioPreset,
  BalanceScenarioReport,
  DemonCultBossGateReport,
  RegionBalanceReport,
  StageBalanceAssessment,
  StageBalanceReport,
  StageStatusMetrics
} from "./balanceTypes";

type StaticDataForBalance = Pick<
  StaticGameData,
  | "heroes"
  | "enemies"
  | "skills"
  | "regions"
  | "stages"
  | "statusEffects"
  | "medicines"
>;

type BossGateSummary = NonNullable<RegionBalanceReport["bossGate"]>;

type DemonCultBossGateContext = {
  baseline: BossGateSummary;
  intended: BossGateSummary;
  intendedStage: StageBalanceReport;
};

type DemonCultBossGateCheck = {
  passed: boolean;
  reason: string;
};

const requiredScenarioIds: BalanceScenarioId[] = [
  "baseline",
  "resistance",
  "medicine",
  "combined"
];

const bossGateCriteria = {
  passSurvivalRatio: 1,
  nearSurvivalRatio: 0.9
};

const demonCultBossGateCriteria = {
  preferredClearTimeSeconds: {
    min: 90,
    max: 120
  },
  acceptableClearTimeSeconds: {
    min: 80,
    max: 140
  },
  maxMedicineConsumed: 4,
  maxStatusDamage: 600
};

export function buildBalanceReport(
  data: StaticDataForBalance,
  options: {
    scenarios?: BalanceScenarioPreset[];
  } = {}
): BalanceReport {
  const scenarioPresets = validateScenarioPresets(
    options.scenarios ?? defaultBalanceScenarioPresets
  );
  const scenarios = scenarioPresets.map((scenario) =>
    buildScenarioBalanceReport(data, scenario)
  );
  const baseline = getScenarioReport(scenarios, "baseline");

  return {
    scenarios,
    regions: baseline.regions,
    totals: baseline.totals,
    demonCultBossGate: getDemonCultBossGate(scenarios)
  };
}

function buildScenarioBalanceReport(
  data: StaticDataForBalance,
  scenario: BalanceScenarioPreset
): BalanceScenarioReport {
  const stageById = new Map(data.stages.map((stage) => [stage.id, stage]));
  const enemyById = new Map(data.enemies.map((enemy) => [enemy.id, enemy]));
  const skillById = new Map(data.skills.map((skill) => [skill.id, skill]));
  const statusDefinitions = createStatusDictionary(data.statusEffects);
  const playerTeam = data.heroes.map((hero) =>
    applyScenarioToHero(hero, scenario)
  );
  const regions = data.regions.map((region): RegionBalanceReport => {
    const stages = region.stageIds.map((stageId) => {
      const stage = stageById.get(stageId);

      if (stage === undefined) {
        throw new Error(
          `Region ${region.id} references missing stage ${stageId}`
        );
      }

      return buildStageBalanceReport({
        data,
        stage,
        scenario,
        playerTeam,
        enemyById,
        skillById,
        statusDefinitions
      });
    });

    return {
      scenarioId: scenario.id,
      regionId: region.id,
      name: region.name,
      stages,
      farmRecommendation: getFarmRecommendation(stages),
      bossGate: getBossGate(stages)
    };
  });

  return {
    scenarioId: scenario.id,
    name: scenario.name,
    description: scenario.description,
    regions,
    totals: getReportTotals(regions)
  };
}

function buildStageBalanceReport(input: {
  data: Pick<StaticDataForBalance, "medicines" | "regions">;
  stage: StageDefinition;
  scenario: BalanceScenarioPreset;
  playerTeam: HeroDefinition[];
  enemyById: Map<string, EnemyDefinition>;
  skillById: Map<string, SkillDefinition>;
  statusDefinitions: Record<string, StatusEffectDefinition>;
}): StageBalanceReport {
  const enemies = input.stage.enemyTeam.combatantIds.map((enemyId) => {
    const enemy = input.enemyById.get(enemyId);

    if (enemy === undefined) {
      throw new Error(
        `Stage ${input.stage.id} references missing enemy ${enemyId}`
      );
    }

    return enemy;
  });
  const averageEnemyStats = averageStats(enemies.map((enemy) => enemy.baseStats));
  const averagePlayerStats = averageStats(
    input.playerTeam.map((hero) => hero.baseStats)
  );
  const playerDps = input.playerTeam.reduce(
    (total, hero) =>
      total +
      estimateCombatantDps(hero, input.skillById, averageEnemyStats, "player"),
    0
  );
  const enemyDps = enemies.reduce(
    (total, enemy) =>
      total +
      estimateCombatantDps(enemy, input.skillById, averagePlayerStats, "enemy"),
    0
  );
  const enemyOuterHp = sumStats(
    enemies.map((enemy) => enemy.baseStats),
    "maxOuterHp"
  );
  const playerOuterHp = sumStats(
    input.playerTeam.map((hero) => hero.baseStats),
    "maxOuterHp"
  );
  const estimatedClearTimeSeconds = enemyOuterHp / Math.max(1, playerDps);
  const statusMetrics = estimateStatusMetrics({
    stage: input.stage,
    enemies,
    scenario: input.scenario,
    skillById: input.skillById,
    statusDefinitions: input.statusDefinitions,
    targetStats: averagePlayerStats,
    estimatedClearTimeSeconds,
    medicines: input.data.medicines,
    enemyDps,
    playerAttackEventsPerSecond: estimateTeamAttackEventsPerSecond(
      input.playerTeam,
      input.skillById
    )
  });
  const enemyPressureDps =
    enemyDps +
    statusMetrics.expectedDamage / Math.max(1, estimatedClearTimeSeconds);
  const estimatedSurvivalSeconds = playerOuterHp / Math.max(1, enemyPressureDps);

  const result =
    estimatedClearTimeSeconds <= estimatedSurvivalSeconds
      ? "player_clear"
      : "enemy_hold";

  return {
    scenarioId: input.scenario.id,
    stageId: input.stage.id,
    regionId: input.stage.regionId,
    index: input.stage.index,
    name: input.stage.name,
    enemyTeamIds: input.stage.enemyTeam.combatantIds,
    result,
    isBoss: input.stage.isBoss,
    canFarmOffline: input.stage.canFarmOffline,
    estimatedClearTimeSeconds,
    estimatedSurvivalSeconds,
    playerDps,
    enemyDps,
    qiBreakPressure: enemies.reduce(
      (total, enemy) => total + Math.max(0, enemy.baseStats.breakPower),
      0
    ),
    rewards: input.stage.rewards,
    statusMetrics,
    balanceAssessment: assessStageBalance(
      input.data,
      input.stage,
      enemies,
      result,
      {
        estimatedClearTimeSeconds,
        estimatedSurvivalSeconds
      }
    )
  };
}

function estimateCombatantDps(
  combatant: HeroDefinition | EnemyDefinition,
  skillById: Map<string, SkillDefinition>,
  target: BaseStats,
  team: "player" | "enemy"
): number {
  const skill = skillById.get(combatant.skillIds[0]);
  const fallbackMultiplier = team === "player" ? 1 : 0.85;
  const outerMultiplier = skill?.outerMultiplier ?? fallbackMultiplier;
  const innerMultiplier = skill?.innerMultiplier ?? 0.1;
  const interval = Math.max(
    calculateAttackInterval(combatant.baseStats.speed),
    skill?.cooldownSeconds ?? 0
  );

  return (
    calculateOuterDamage({
      attacker: combatant.baseStats,
      target,
      skillMultiplier: outerMultiplier
    }) +
    calculateInnerDamage({
      attacker: combatant.baseStats,
      target,
      skillMultiplier: innerMultiplier
    }) *
      0.35
  ) / Math.max(0.5, interval);
}

function estimateStatusMetrics(input: {
  stage: StageDefinition;
  enemies: EnemyDefinition[];
  scenario: BalanceScenarioPreset;
  skillById: Map<string, SkillDefinition>;
  statusDefinitions: Record<string, StatusEffectDefinition>;
  targetStats: BaseStats;
  estimatedClearTimeSeconds: number;
  medicines: StaticDataForBalance["medicines"];
  enemyDps: number;
  playerAttackEventsPerSecond: number;
}): StageStatusMetrics {
  const pressureStatusIds = getStageStatusPressureIds({
    stage: input.stage,
    enemies: input.enemies,
    skills: [...input.skillById.values()]
  });
  const resistanceMedicine = getScenarioResistanceMedicine(
    input.scenario,
    input.medicines,
    new Set(pressureStatusIds)
  );
  const targetStats = {
    ...input.targetStats,
    statusResistance: calculateEffectiveStatusResistance(
      input.targetStats.statusResistance,
      resistanceMedicine.statusResistanceBonus
    )
  };
  const statusIds = new Set<string>();
  let attempts = 0;
  let applications = 0;
  let expectedDamage = 0;
  let healingDenied = 0;
  let expectedDurationSeconds = 0;
  let totalTickDamage = 0;
  let reducedTickDamage = 0;

  for (const enemy of input.enemies) {
    for (const skillId of enemy.skillIds) {
      const skill = input.skillById.get(skillId);

      if (skill === undefined) {
        continue;
      }

      const casts = Math.max(
        1,
        input.estimatedClearTimeSeconds / Math.max(1, skill.cooldownSeconds)
      );

      for (const effect of skill.effects) {
        if (effect.type !== "apply_status" || effect.statusId === undefined) {
          continue;
        }

        const status = input.statusDefinitions[effect.statusId];

        if (status === undefined) {
          continue;
        }

        const application = estimateStatusApplication({
          effect,
          definition: status,
          attackerStats: enemy.baseStats,
          targetStats,
          casts
        });
        const tickDamage = estimateStatusTickDamage({
          definition: status,
          resistedDurationSeconds: application.resistedDurationSeconds,
          targetMaxOuterHp: targetStats.maxOuterHp,
          targetStatusResistance: targetStats.statusResistance,
          stacks: application.stacks,
          expectedApplications: application.expectedApplications
        });
        const unresistedDuration = estimateStatusApplication({
          effect,
          definition: status,
          attackerStats: enemy.baseStats,
          targetStats: { statusResistance: 0 },
          casts
        }).resistedDurationSeconds;
        const unresistedTickDamage = estimateStatusTickDamage({
          definition: status,
          resistedDurationSeconds: unresistedDuration,
          targetMaxOuterHp: targetStats.maxOuterHp,
          targetStatusResistance: 0,
          stacks: application.stacks,
          expectedApplications: application.expectedApplications
        });
        const modifierDamage = estimateStatusModifierDamage({
          definition: status,
          stacks: application.stacks,
          expectedApplications: application.expectedApplications,
          resistedDurationSeconds: application.resistedDurationSeconds,
          targetMaxOuterHp: targetStats.maxOuterHp,
          enemyDps: input.enemyDps,
          playerAttackEventsPerSecond: input.playerAttackEventsPerSecond
        });

        statusIds.add(status.id);
        attempts += casts;
        applications += application.expectedApplications;
        expectedDurationSeconds +=
          application.expectedApplications * application.resistedDurationSeconds;
        totalTickDamage += tickDamage;
        reducedTickDamage += Math.max(0, unresistedTickDamage - tickDamage);
        expectedDamage += tickDamage + modifierDamage;
        healingDenied += estimateStatusHealingDenied({
          definition: status,
          stacks: application.stacks,
          expectedApplications: application.expectedApplications,
          durationSeconds: application.durationSeconds,
          resistedDurationSeconds: application.resistedDurationSeconds
        });
      }
    }
  }

  const cleanseEstimate = estimateCleanses({
    scenario: input.scenario,
    medicines: input.medicines,
    statusIds,
    statusDefinitions: input.statusDefinitions,
    applications
  });
  const cleanseMitigation =
    applications > 0 ? Math.min(0.75, cleanseEstimate.cleanses / applications) : 0;
  const mitigatedExpectedDamage = expectedDamage * (1 - cleanseMitigation);
  const mitigatedHealingDenied = healingDenied * (1 - cleanseMitigation);
  const mitigatedExpectedDurationSeconds =
    expectedDurationSeconds * (1 - cleanseMitigation);

  return {
    attempts,
    applications,
    resisted: Math.max(0, attempts - applications),
    averageApplicationChance: attempts > 0 ? applications / attempts : 0,
    expectedDurationSeconds: mitigatedExpectedDurationSeconds,
    averageDurationSeconds:
      applications > 0 ? mitigatedExpectedDurationSeconds / applications : 0,
    averageTickDamage:
      applications > 0 ? totalTickDamage / applications : 0,
    reducedTickDamage,
    cleanses: cleanseEstimate.cleanses,
    medicineConsumed:
      resistanceMedicine.medicineConsumed + cleanseEstimate.medicineConsumed,
    expectedDamage: mitigatedExpectedDamage,
    healingDenied: mitigatedHealingDenied,
    statusIds: [...statusIds].sort()
  };
}

function estimateCleanses(input: {
  scenario: BalanceScenarioPreset;
  medicines: StaticDataForBalance["medicines"];
  statusIds: Set<string>;
  statusDefinitions: Record<string, StatusEffectDefinition>;
  applications: number;
}): {
  cleanses: number;
  medicineConsumed: number;
} {
  if (!input.scenario.useCleanseMedicine) {
    return {
      cleanses: 0,
      medicineConsumed: 0
    };
  }

  let cleanseCapacity = 0;
  let medicineConsumed = 0;
  for (const medicine of input.medicines) {
    let medicineCapacity = 0;

    for (const statusId of input.statusIds) {
      const status = input.statusDefinitions[statusId];

      if (status === undefined) {
        continue;
      }

      for (const effect of medicine.effects) {
        if (
          effect.type === "cleanse_status" &&
          effect.dispelTags.some((tag) => status.dispelTags.includes(tag))
        ) {
          medicineCapacity = Math.max(
            medicineCapacity,
            effect.maxCount ?? input.statusIds.size
          );
        }
      }
    }

    if (medicineCapacity > 0) {
      cleanseCapacity += medicineCapacity;
      medicineConsumed += 1;
    }
  }

  if (cleanseCapacity === 0) {
    return {
      cleanses: 0,
      medicineConsumed: 0
    };
  }

  return {
    cleanses: Math.min(input.applications, cleanseCapacity),
    medicineConsumed
  };
}

function getScenarioResistanceMedicine(
  scenario: BalanceScenarioPreset,
  medicines: MedicineDefinition[],
  statusIds: Set<string>
): {
  statusResistanceBonus: number;
  medicineConsumed: number;
} {
  if (!scenario.useResistanceMedicine || statusIds.size === 0) {
    return {
      statusResistanceBonus: 0,
      medicineConsumed: 0
    };
  }

  const selected = medicines
    .map((medicine) => ({
      medicine,
      bonus: medicine.effects.reduce(
        (total, effect) =>
          effect.type === "status_resistance_bonus"
            ? total + effect.value
            : total,
        0
      ),
      durationSeconds: medicine.effects.reduce(
        (maxDuration, effect) =>
          effect.type === "status_resistance_bonus"
            ? Math.max(maxDuration, effect.durationSeconds)
            : maxDuration,
        0
      )
    }))
    .filter((candidate) => candidate.bonus > 0)
    .sort(
      (left, right) =>
        right.bonus - left.bonus ||
        right.durationSeconds - left.durationSeconds ||
        left.medicine.id.localeCompare(right.medicine.id)
    )[0];

  if (selected === undefined) {
    return {
      statusResistanceBonus: 0,
      medicineConsumed: 0
    };
  }

  return {
    statusResistanceBonus: selected.bonus,
    medicineConsumed: 1
  };
}

function getFarmRecommendation(
  stages: StageBalanceReport[]
): RegionBalanceReport["farmRecommendation"] {
  const farmStages = stages.filter(
    (stage) => stage.canFarmOffline && !stage.isBoss
  );

  if (farmStages.length === 0) {
    return null;
  }

  const bestStage = farmStages.reduce((best, stage) =>
    getFarmScore(stage) > getFarmScore(best) ? stage : best
  );

  return {
    stageId: bestStage.stageId,
    score: getFarmScore(bestStage)
  };
}

function getBossGate(
  stages: StageBalanceReport[]
): RegionBalanceReport["bossGate"] {
  const boss = stages.find((stage) => stage.isBoss);

  if (boss === undefined) {
    return null;
  }

  const survivalRatio =
    boss.estimatedSurvivalSeconds / Math.max(1, boss.estimatedClearTimeSeconds);
  const rating = getBossGateRating(survivalRatio);

  return {
    stageId: boss.stageId,
    scenarioId: boss.scenarioId,
    result: boss.result,
    rating,
    survivalRatio,
    criteria: bossGateCriteria,
    failureReason:
      rating === "fail"
        ? boss.statusMetrics.applications > 0
          ? "status pressure remains above the intended gate"
          : "raw damage race remains above the intended gate"
        : null
  };
}

function getReportTotals(
  regions: RegionBalanceReport[]
): BalanceReportTotals {
  const stages = regions.flatMap((region) => region.stages);

  return {
    stages: stages.length,
    playerClears: stages.filter((stage) => stage.result === "player_clear")
      .length,
    enemyHolds: stages.filter((stage) => stage.result === "enemy_hold").length,
    statusApplications: stages.reduce(
      (total, stage) => total + stage.statusMetrics.applications,
      0
    ),
    statusDurationSeconds: stages.reduce(
      (total, stage) => total + stage.statusMetrics.expectedDurationSeconds,
      0
    ),
    statusDamage: stages.reduce(
      (total, stage) => total + stage.statusMetrics.expectedDamage,
      0
    ),
    reducedTickDamage: stages.reduce(
      (total, stage) => total + stage.statusMetrics.reducedTickDamage,
      0
    ),
    cleanses: stages.reduce(
      (total, stage) => total + stage.statusMetrics.cleanses,
      0
    ),
    medicineConsumed: stages.reduce(
      (total, stage) => total + stage.statusMetrics.medicineConsumed,
      0
    ),
    tooFastStages: stages.filter(
      (stage) => stage.balanceAssessment.rating === "too_fast"
    ).length,
    tooSlowStages: stages.filter(
      (stage) => stage.balanceAssessment.rating === "too_slow"
    ).length,
    impossibleStages: stages.filter(
      (stage) => stage.balanceAssessment.rating === "impossible"
    ).length
  };
}

function applyScenarioToHero(
  hero: HeroDefinition,
  scenario: BalanceScenarioPreset
): HeroDefinition {
  return {
    ...hero,
    baseStats: applyScenarioToStats(hero.baseStats, scenario)
  };
}

function applyScenarioToStats(
  stats: BaseStats,
  scenario: BalanceScenarioPreset
): BaseStats {
  const nextStats: BaseStats = { ...stats };

  for (const [stat, multiplier] of Object.entries(
    scenario.playerStatMultipliers
  ) as Array<[keyof BaseStats, number]>) {
    nextStats[stat] = nextStats[stat] * multiplier;
  }

  nextStats.statusResistance = calculateEffectiveStatusResistance(
    nextStats.statusResistance,
    scenario.statusResistanceBonus
  );

  return nextStats;
}

function estimateTeamAttackEventsPerSecond(
  team: HeroDefinition[],
  skillById: Map<string, SkillDefinition>
): number {
  return team.reduce((total, combatant) => {
    const skill = skillById.get(combatant.skillIds[0]);
    const interval = Math.max(
      calculateAttackInterval(combatant.baseStats.speed),
      skill?.cooldownSeconds ?? 0
    );

    return total + 1 / Math.max(0.5, interval);
  }, 0);
}

function assessStageBalance(
  data: Pick<StaticDataForBalance, "regions">,
  stage: StageDefinition,
  enemies: EnemyDefinition[],
  result: BalanceResult,
  timing: {
    estimatedClearTimeSeconds: number;
    estimatedSurvivalSeconds: number;
  }
): StageBalanceAssessment {
  const region = data.regions.find(
    (candidate) => candidate.id === stage.regionId
  );
  const clearTimeRangeSeconds = getStageClearTimeTargetRange({
    region,
    stage,
    enemies
  });
  const reasons: string[] = [];

  if (result === "enemy_hold") {
    reasons.push("player cannot clear before estimated survival expires");

    return {
      rating: "impossible",
      reasons,
      clearTimeRangeSeconds
    };
  }

  if (clearTimeRangeSeconds === null) {
    return {
      rating: "target",
      reasons,
      clearTimeRangeSeconds
    };
  }

  if (timing.estimatedClearTimeSeconds < clearTimeRangeSeconds.min) {
    reasons.push("clear time is below target range");

    return {
      rating: "too_fast",
      reasons,
      clearTimeRangeSeconds
    };
  }

  if (timing.estimatedClearTimeSeconds > clearTimeRangeSeconds.max) {
    reasons.push("clear time is above target range");

    return {
      rating: "too_slow",
      reasons,
      clearTimeRangeSeconds
    };
  }

  return {
    rating: "target",
    reasons,
    clearTimeRangeSeconds
  };
}

function getBossGateRating(survivalRatio: number): BalanceGateRating {
  if (survivalRatio >= bossGateCriteria.passSurvivalRatio) {
    return "pass";
  }

  if (survivalRatio >= bossGateCriteria.nearSurvivalRatio) {
    return "near";
  }

  return "fail";
}

function getDemonCultBossGate(
  scenarios: BalanceScenarioReport[]
): DemonCultBossGateReport | null {
  const context = getDemonCultBossGateContext(scenarios);

  if (context === null) {
    return null;
  }

  const { baseline, intended, intendedStage } = context;
  const gateChecks = getDemonCultBossGateChecks(context);
  const pass = gateChecks.every((check) => check.passed);
  const failedCheck = gateChecks.find((check) => !check.passed);

  return {
    stageId: intended.stageId,
    baselineScenarioId: "baseline",
    intendedScenarioId: "combined",
    baselineResult: baseline.result,
    intendedResult: intended.result,
    intendedRating: intended.rating,
    survivalRatio: intended.survivalRatio,
    estimatedClearTimeSeconds: intendedStage.estimatedClearTimeSeconds,
    statusDamage: intendedStage.statusMetrics.expectedDamage,
    medicineConsumed: intendedStage.statusMetrics.medicineConsumed,
    pass,
    criteria: {
      baselineMustHold: true,
      intendedPassSurvivalRatio: bossGateCriteria.passSurvivalRatio,
      intendedNearSurvivalRatio: bossGateCriteria.nearSurvivalRatio,
      ...demonCultBossGateCriteria
    },
    reasons: gateChecks.map((check) => check.reason),
    failureReason: failedCheck?.reason ?? null
  };
}

function getDemonCultBossGateContext(
  scenarios: BalanceScenarioReport[]
): DemonCultBossGateContext | null {
  const baselineScenario = getScenarioReport(scenarios, "baseline");
  const intendedScenario = getScenarioReport(scenarios, "combined");
  const baseline = getScenarioRegion(
    baselineScenario,
    "demon_cult_outpost"
  )?.bossGate;
  const intendedRegion = getScenarioRegion(
    intendedScenario,
    "demon_cult_outpost"
  );
  const intended = intendedRegion?.bossGate;
  const intendedStage = intendedRegion?.stages.find((stage) => stage.isBoss);

  if (baseline == null || intended == null || intendedStage === undefined) {
    return null;
  }

  return {
    baseline,
    intended,
    intendedStage
  };
}

function getDemonCultBossGateChecks(
  context: DemonCultBossGateContext
): DemonCultBossGateCheck[] {
  const { baseline, intended, intendedStage } = context;
  const baselineBlocked = baseline.result === "enemy_hold";
  const survivalPass =
    intended.result === "player_clear" ||
    intended.survivalRatio >= bossGateCriteria.nearSurvivalRatio;
  const clearTimePass = isWithinRange(
    intendedStage.estimatedClearTimeSeconds,
    demonCultBossGateCriteria.acceptableClearTimeSeconds
  );
  const preferredClearTimePass = isWithinRange(
    intendedStage.estimatedClearTimeSeconds,
    demonCultBossGateCriteria.preferredClearTimeSeconds
  );
  const medicinePass =
    intendedStage.statusMetrics.medicineConsumed <=
    demonCultBossGateCriteria.maxMedicineConsumed;
  const statusDamagePass =
    intendedStage.statusMetrics.expectedDamage <=
    demonCultBossGateCriteria.maxStatusDamage;

  return [
    {
      passed: baselineBlocked,
      reason: baselineBlocked
        ? "baseline remains blocked"
        : "baseline should remain blocked"
    },
    {
      passed: survivalPass,
      reason: survivalPass
        ? `combined survival ratio ${formatNumber(intended.survivalRatio)} reaches the intended gate`
        : `combined survival ratio ${formatNumber(intended.survivalRatio)} is below ${formatNumber(bossGateCriteria.nearSurvivalRatio)}`
    },
    {
      passed: clearTimePass,
      reason: getDemonCultClearTimeGateReason(
        intendedStage.estimatedClearTimeSeconds,
        clearTimePass,
        preferredClearTimePass
      )
    },
    {
      passed: medicinePass,
      reason: medicinePass
        ? `medicine use ${formatNumber(intendedStage.statusMetrics.medicineConsumed)} is predictable`
        : `medicine use ${formatNumber(intendedStage.statusMetrics.medicineConsumed)} exceeds the configured limit`
    },
    {
      passed: statusDamagePass,
      reason: statusDamagePass
        ? `status damage ${formatNumber(intendedStage.statusMetrics.expectedDamage)} stays within the intended pressure limit`
        : `status damage ${formatNumber(intendedStage.statusMetrics.expectedDamage)} exceeds the intended pressure limit`
    }
  ];
}

function getDemonCultClearTimeGateReason(
  clearTimeSeconds: number,
  clearTimePass: boolean,
  preferredClearTimePass: boolean
): string {
  const clearTime = formatNumber(clearTimeSeconds);
  const preferredRange = formatRange(
    demonCultBossGateCriteria.preferredClearTimeSeconds
  );
  const acceptableRange = formatRange(
    demonCultBossGateCriteria.acceptableClearTimeSeconds
  );

  if (!clearTimePass) {
    return `combined clear time ${clearTime}s is outside the acceptable ${acceptableRange}s band`;
  }

  if (preferredClearTimePass) {
    return `combined clear time ${clearTime}s is in the preferred ${preferredRange}s band`;
  }

  return `combined clear time ${clearTime}s is in the acceptable ${acceptableRange}s band`;
}

function isWithinRange(
  value: number,
  range: {
    min: number;
    max: number;
  }
): boolean {
  return value >= range.min && value <= range.max;
}

function formatRange(range: { min: number; max: number }): string {
  return `${formatNumber(range.min)}-${formatNumber(range.max)}`;
}

function getScenarioRegion(
  scenario: BalanceScenarioReport,
  regionId: string
): RegionBalanceReport | undefined {
  return scenario.regions.find((region) => region.regionId === regionId);
}

function getScenarioReport(
  scenarios: BalanceScenarioReport[],
  scenarioId: BalanceScenarioId
): BalanceScenarioReport {
  const scenario = scenarios.find((entry) => entry.scenarioId === scenarioId);

  if (scenario === undefined) {
    throw new Error(`Missing balance scenario ${scenarioId}`);
  }

  return scenario;
}

function validateScenarioPresets(
  scenarios: BalanceScenarioPreset[]
): BalanceScenarioPreset[] {
  const seenIds = new Set<BalanceScenarioId>();

  for (const scenario of scenarios) {
    if (seenIds.has(scenario.id)) {
      throw new Error(`Duplicate balance scenario ${scenario.id}`);
    }

    seenIds.add(scenario.id);
  }

  for (const scenarioId of requiredScenarioIds) {
    if (!seenIds.has(scenarioId)) {
      throw new Error(`Missing balance scenario ${scenarioId}`);
    }
  }

  return scenarios;
}

function getFarmScore(stage: StageBalanceReport): number {
  return (
    stage.rewards.combatExperience * 4 +
    stage.rewards.silver +
    stage.rewards.cultivation * 1.5
  );
}

function averageStats(stats: BaseStats[]): BaseStats {
  const count = Math.max(1, stats.length);

  return {
    maxOuterHp: sumStats(stats, "maxOuterHp") / count,
    maxInnerQi: sumStats(stats, "maxInnerQi") / count,
    outerAttack: sumStats(stats, "outerAttack") / count,
    innerAttack: sumStats(stats, "innerAttack") / count,
    outerDefense: sumStats(stats, "outerDefense") / count,
    innerDefense: sumStats(stats, "innerDefense") / count,
    speed: sumStats(stats, "speed") / count,
    critChance: sumStats(stats, "critChance") / count,
    critDamage: sumStats(stats, "critDamage") / count,
    breakPower: sumStats(stats, "breakPower") / count,
    breakResist: sumStats(stats, "breakResist") / count,
    innerRecoveryRate: sumStats(stats, "innerRecoveryRate") / count,
    statusAccuracy: sumStats(stats, "statusAccuracy") / count,
    statusResistance: sumStats(stats, "statusResistance") / count
  };
}

function sumStats(stats: BaseStats[], stat: keyof BaseStats): number {
  return stats.reduce((total, entry) => total + entry[stat], 0);
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}
