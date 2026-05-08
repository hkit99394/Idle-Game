import {
  calculateEffectiveStatusResistance,
  calculateAttackInterval,
  calculateInnerDamage,
  calculateOuterDamage,
  calculateStatusApplicationChance,
  calculateStatusDuration,
  calculateStatusTickOuterDamage,
  createStatusDictionary
} from "../combat";
import type { BaseStats, StatusEffectDefinition } from "../combat";
import type {
  EnemyDefinition,
  HeroDefinition,
  MedicineDefinition,
  SkillDefinition,
  StageDefinition,
  StaticGameData
} from "../data";

export type BalanceResult = "player_clear" | "enemy_hold";
export type BalanceScenarioId =
  | "baseline"
  | "resistance"
  | "medicine"
  | "combined";
export type BalanceAssessmentRating =
  | "too_fast"
  | "target"
  | "too_slow"
  | "impossible";
export type BalanceGateRating = "pass" | "near" | "fail";

export type BalanceScenarioPreset = {
  id: BalanceScenarioId;
  name: string;
  description: string;
  playerStatMultipliers: Partial<Record<keyof BaseStats, number>>;
  statusResistanceBonus: number;
  useResistanceMedicine: boolean;
  useCleanseMedicine: boolean;
};

export type StageStatusMetrics = {
  attempts: number;
  applications: number;
  resisted: number;
  averageApplicationChance: number;
  expectedDurationSeconds: number;
  averageDurationSeconds: number;
  averageTickDamage: number;
  reducedTickDamage: number;
  cleanses: number;
  medicineConsumed: number;
  expectedDamage: number;
  healingDenied: number;
  statusIds: string[];
};

export type StageBalanceAssessment = {
  rating: BalanceAssessmentRating;
  reasons: string[];
  clearTimeRangeSeconds: {
    min: number;
    max: number;
  };
};

export type StageBalanceReport = {
  scenarioId: BalanceScenarioId;
  stageId: string;
  regionId: string;
  index: number;
  name: string;
  enemyTeamIds: string[];
  result: BalanceResult;
  isBoss: boolean;
  canFarmOffline: boolean;
  estimatedClearTimeSeconds: number;
  estimatedSurvivalSeconds: number;
  playerDps: number;
  enemyDps: number;
  qiBreakPressure: number;
  rewards: StageDefinition["rewards"];
  statusMetrics: StageStatusMetrics;
  balanceAssessment: StageBalanceAssessment;
};

export type RegionBalanceReport = {
  scenarioId: BalanceScenarioId;
  regionId: string;
  name: string;
  stages: StageBalanceReport[];
  farmRecommendation: {
    stageId: string;
    score: number;
  } | null;
  bossGate: {
    stageId: string;
    scenarioId: BalanceScenarioId;
    result: BalanceResult;
    rating: BalanceGateRating;
    survivalRatio: number;
    criteria: {
      passSurvivalRatio: number;
      nearSurvivalRatio: number;
    };
    failureReason: string | null;
  } | null;
};

export type BalanceReportTotals = {
  stages: number;
  playerClears: number;
  enemyHolds: number;
  statusApplications: number;
  statusDurationSeconds: number;
  statusDamage: number;
  reducedTickDamage: number;
  cleanses: number;
  medicineConsumed: number;
  tooFastStages: number;
  tooSlowStages: number;
  impossibleStages: number;
};

export type BalanceScenarioReport = {
  scenarioId: BalanceScenarioId;
  name: string;
  description: string;
  regions: RegionBalanceReport[];
  totals: BalanceReportTotals;
};

export type DemonCultBossGateReport = {
  stageId: string;
  baselineScenarioId: BalanceScenarioId;
  intendedScenarioId: BalanceScenarioId;
  baselineResult: BalanceResult;
  intendedResult: BalanceResult;
  intendedRating: BalanceGateRating;
  survivalRatio: number;
  estimatedClearTimeSeconds: number;
  statusDamage: number;
  medicineConsumed: number;
  pass: boolean;
  criteria: {
    baselineMustHold: true;
    intendedPassSurvivalRatio: number;
    intendedNearSurvivalRatio: number;
    preferredClearTimeSeconds: {
      min: number;
      max: number;
    };
    acceptableClearTimeSeconds: {
      min: number;
      max: number;
    };
    maxMedicineConsumed: number;
    maxStatusDamage: number;
  };
  reasons: string[];
  failureReason: string | null;
};

export type BalanceReport = {
  scenarios: BalanceScenarioReport[];
  regions: RegionBalanceReport[];
  totals: BalanceReportTotals;
  demonCultBossGate: DemonCultBossGateReport | null;
};

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

export const defaultBalanceScenarioPresets: BalanceScenarioPreset[] = [
  {
    id: "baseline",
    name: "Baseline",
    description: "Boss-ready team without special status counterplay.",
    playerStatMultipliers: {
      maxOuterHp: 2,
      maxInnerQi: 1.4,
      outerAttack: 4,
      innerAttack: 4,
      outerDefense: 1.3,
      innerDefense: 1.3
    },
    statusResistanceBonus: 0,
    useResistanceMedicine: false,
    useCleanseMedicine: false
  },
  {
    id: "resistance",
    name: "Resistance",
    description: "Boss-ready team with resistance training and manuals.",
    playerStatMultipliers: {
      maxOuterHp: 2,
      maxInnerQi: 1.4,
      outerAttack: 4,
      innerAttack: 4,
      outerDefense: 1.3,
      innerDefense: 1.3
    },
    statusResistanceBonus: 0.22,
    useResistanceMedicine: false,
    useCleanseMedicine: false
  },
  {
    id: "medicine",
    name: "Medicine",
    description: "Boss-ready team using automatic resistance and cleanse medicine.",
    playerStatMultipliers: {
      maxOuterHp: 2,
      maxInnerQi: 1.4,
      outerAttack: 4,
      innerAttack: 4,
      outerDefense: 1.3,
      innerDefense: 1.3
    },
    statusResistanceBonus: 0,
    useResistanceMedicine: true,
    useCleanseMedicine: true
  },
  {
    id: "combined",
    name: "Combined",
    description: "Intended Demon Cult route with resistance training and medicine.",
    playerStatMultipliers: {
      maxOuterHp: 2,
      maxInnerQi: 1.4,
      outerAttack: 4,
      innerAttack: 4,
      outerDefense: 1.3,
      innerDefense: 1.3
    },
    statusResistanceBonus: 0.22,
    useResistanceMedicine: true,
    useCleanseMedicine: true
  }
];

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

export function formatBalanceReport(report: BalanceReport): string {
  const lines = ["Path of Jianghu Balance Report", "", "Scenario Summary"];
  lines.push(
    "scenario clears holds status status_dmg reduced_tick cleanses medicine impossible gate"
  );

  for (const scenario of report.scenarios) {
    const gate = getScenarioRegion(scenario, "demon_cult_outpost")?.bossGate;

    lines.push(
      [
        scenario.scenarioId,
        scenario.totals.playerClears,
        scenario.totals.enemyHolds,
        formatNumber(scenario.totals.statusApplications),
        formatNumber(scenario.totals.statusDamage),
        formatNumber(scenario.totals.reducedTickDamage),
        formatNumber(scenario.totals.cleanses),
        formatNumber(scenario.totals.medicineConsumed),
        scenario.totals.impossibleStages,
        gate?.rating ?? "none"
      ].join(" ")
    );
  }

  if (report.demonCultBossGate !== null) {
    lines.push(
      `Demon Cult boss gate: ${report.demonCultBossGate.pass ? "pass" : "fail"} (${report.demonCultBossGate.baselineScenarioId} ${report.demonCultBossGate.baselineResult}, ${report.demonCultBossGate.intendedScenarioId} ${report.demonCultBossGate.intendedRating}, ${formatNumber(report.demonCultBossGate.estimatedClearTimeSeconds)}s)`
    );
    for (const reason of report.demonCultBossGate.reasons) {
      lines.push(`- ${reason}`);
    }
  }

  lines.push("");

  for (const scenario of report.scenarios) {
    lines.push(`Scenario: ${scenario.name} (${scenario.scenarioId})`);
    lines.push(scenario.description);
    lines.push("");

    for (const region of scenario.regions) {
      lines.push(`${region.name}`);
      lines.push("stage result gate time status status_dmg medicine rewards");

      for (const stage of region.stages) {
        lines.push(
          [
            stage.stageId,
            stage.result,
            stage.balanceAssessment.rating,
            `${formatNumber(stage.estimatedClearTimeSeconds)}s`,
            formatNumber(stage.statusMetrics.applications),
            formatNumber(stage.statusMetrics.expectedDamage),
            formatNumber(stage.statusMetrics.medicineConsumed),
            `${stage.rewards.silver}/${stage.rewards.cultivation}/${stage.rewards.combatExperience}`
          ].join(" ")
        );
      }

      if (region.farmRecommendation !== null) {
        lines.push(
          `farm ${region.farmRecommendation.stageId} score ${formatNumber(region.farmRecommendation.score)}`
        );
      }

      if (region.bossGate !== null) {
        lines.push(
          `boss ${region.bossGate.stageId} ${region.bossGate.scenarioId} ${region.bossGate.result} ${region.bossGate.rating} ratio ${formatNumber(region.bossGate.survivalRatio)}`
        );
      }

      lines.push("");
    }
  }

  lines.push(
    `Baseline totals: ${report.totals.stages} stages, ${formatNumber(
      report.totals.statusApplications
    )} status applications, ${formatNumber(
      report.totals.statusDamage
    )} status damage, ${formatNumber(
      report.totals.cleanses
    )} cleanses, ${formatNumber(report.totals.medicineConsumed)} medicine`
  );

  return lines.join("\n");
}

function buildStageBalanceReport(input: {
  data: Pick<StaticDataForBalance, "medicines">;
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
    balanceAssessment: assessStageBalance(input.stage, result, {
      estimatedClearTimeSeconds,
      estimatedSurvivalSeconds
    })
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
  const pressureStatusIds = getStageStatusIds({
    stage: input.stage,
    enemies: input.enemies,
    skillById: input.skillById
  });
  const resistanceMedicine = getScenarioResistanceMedicine(
    input.scenario,
    input.medicines,
    pressureStatusIds
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

        const chance = calculateStatusApplicationChance({
          baseChance: effect.chance ?? 1,
          attackerStatusAccuracy: enemy.baseStats.statusAccuracy,
          targetStatusResistance: targetStats.statusResistance
        });
        const expectedApplications = casts * chance;
        const stacks = effect.stacks ?? 1;
        const durationSeconds = effect.durationSeconds ?? status.durationSeconds;
        const resistedDurationSeconds = calculateStatusDuration(
          durationSeconds,
          targetStats.statusResistance
        );
        const tickDamage = estimateStatusDamage(
          status,
          durationSeconds,
          targetStats.maxOuterHp,
          targetStats.statusResistance,
          stacks,
          expectedApplications
        );
        const unresistedTickDamage = estimateStatusDamage(
          status,
          durationSeconds,
          targetStats.maxOuterHp,
          0,
          stacks,
          expectedApplications
        );
        const modifierDamage = estimateStatusModifierDamage({
          status,
          stacks,
          expectedApplications,
          resistedDurationSeconds,
          targetMaxOuterHp: targetStats.maxOuterHp,
          enemyDps: input.enemyDps,
          playerAttackEventsPerSecond: input.playerAttackEventsPerSecond
        });

        statusIds.add(status.id);
        attempts += casts;
        applications += expectedApplications;
        expectedDurationSeconds += expectedApplications * resistedDurationSeconds;
        totalTickDamage += tickDamage;
        reducedTickDamage += Math.max(0, unresistedTickDamage - tickDamage);
        expectedDamage += tickDamage + modifierDamage;
        healingDenied += estimateHealingDenied(
          status,
          stacks,
          expectedApplications,
          durationSeconds,
          targetStats.statusResistance
        );
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

function estimateStatusDamage(
  status: StatusEffectDefinition,
  durationSeconds: number,
  targetMaxOuterHp: number,
  targetStatusResistance: number,
  stacks: number,
  expectedApplications: number
): number {
  if (status.tickIntervalSeconds === undefined) {
    return 0;
  }

  const damagePerTick = calculateStatusTickOuterDamage({
    definition: status,
    targetMaxOuterHp,
    stacks,
    targetStatusResistance
  });
  const resistedDurationSeconds = calculateStatusDuration(
    durationSeconds,
    targetStatusResistance
  );
  const expectedTicks = resistedDurationSeconds / status.tickIntervalSeconds;

  return damagePerTick * expectedTicks * expectedApplications;
}

function estimateHealingDenied(
  status: StatusEffectDefinition,
  stacks: number,
  expectedApplications: number,
  durationSeconds: number,
  targetStatusResistance: number
): number {
  const multiplier = status.effects.healingReceivedMultiplier;

  if (multiplier === undefined) {
    return 0;
  }

  const resistedDurationSeconds = calculateStatusDuration(
    durationSeconds,
    targetStatusResistance
  );
  const durationRatio = resistedDurationSeconds / durationSeconds;

  return (1 - multiplier ** stacks) * 20 * expectedApplications * durationRatio;
}

function estimateStatusModifierDamage(input: {
  status: StatusEffectDefinition;
  stacks: number;
  expectedApplications: number;
  resistedDurationSeconds: number;
  targetMaxOuterHp: number;
  enemyDps: number;
  playerAttackEventsPerSecond: number;
}): number {
  const vulnerabilityMultiplier =
    input.status.effects.outerDamageTakenMultiplier === undefined
      ? 1
      : input.status.effects.outerDamageTakenMultiplier ** input.stacks;
  const vulnerabilityDamage =
    vulnerabilityMultiplier > 1
      ? input.enemyDps *
        (vulnerabilityMultiplier - 1) *
        input.resistedDurationSeconds *
        input.expectedApplications
      : 0;
  const backlashDamage =
    input.status.effects.attackBacklashOuterHpPercent === undefined
      ? 0
      : input.targetMaxOuterHp *
        input.status.effects.attackBacklashOuterHpPercent *
        input.stacks *
        input.playerAttackEventsPerSecond *
        input.resistedDurationSeconds *
        input.expectedApplications;

  return vulnerabilityDamage + backlashDamage;
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

function getStageStatusIds(input: {
  stage: StageDefinition;
  enemies: EnemyDefinition[];
  skillById: Map<string, SkillDefinition>;
}): Set<string> {
  const enemyById = new Map(input.enemies.map((enemy) => [enemy.id, enemy]));
  const statusIds = new Set<string>();

  for (const enemyId of input.stage.enemyTeam.combatantIds) {
    const enemy = enemyById.get(enemyId);

    if (enemy === undefined) {
      continue;
    }

    for (const skillId of enemy.skillIds) {
      const skill = input.skillById.get(skillId);

      if (skill === undefined) {
        continue;
      }

      for (const effect of skill.effects) {
        if (effect.type === "apply_status" && effect.statusId !== undefined) {
          statusIds.add(effect.statusId);
        }
      }
    }
  }

  return statusIds;
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
  stage: StageDefinition,
  result: BalanceResult,
  timing: {
    estimatedClearTimeSeconds: number;
    estimatedSurvivalSeconds: number;
  }
): StageBalanceAssessment {
  const clearTimeRangeSeconds = getClearTimeRange(stage);
  const reasons: string[] = [];

  if (result === "enemy_hold") {
    reasons.push("player cannot clear before estimated survival expires");

    return {
      rating: "impossible",
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

function getClearTimeRange(stage: StageDefinition): {
  min: number;
  max: number;
} {
  if (stage.isBoss) {
    return {
      min: 45,
      max: 240
    };
  }

  if (stage.enemyTeam.combatantIds.length >= 3) {
    return {
      min: 20,
      max: 150
    };
  }

  return {
    min: 10,
    max: 120
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
  const baseline = getScenarioRegion(
    getScenarioReport(scenarios, "baseline"),
    "demon_cult_outpost"
  )?.bossGate;
  const intended = getScenarioRegion(
    getScenarioReport(scenarios, "combined"),
    "demon_cult_outpost"
  )?.bossGate;
  const intendedStage = getScenarioRegion(
    getScenarioReport(scenarios, "combined"),
    "demon_cult_outpost"
  )?.stages.find((stage) => stage.isBoss);

  if (baseline == null || intended == null || intendedStage === undefined) {
    return null;
  }

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
  const gateChecks = [
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
      reason: clearTimePass
        ? preferredClearTimePass
          ? `combined clear time ${formatNumber(intendedStage.estimatedClearTimeSeconds)}s is in the preferred 90-120s band`
          : `combined clear time ${formatNumber(intendedStage.estimatedClearTimeSeconds)}s is in the acceptable 80-140s band`
        : `combined clear time ${formatNumber(intendedStage.estimatedClearTimeSeconds)}s is outside the acceptable 80-140s band`
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

function isWithinRange(
  value: number,
  range: {
    min: number;
    max: number;
  }
): boolean {
  return value >= range.min && value <= range.max;
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
