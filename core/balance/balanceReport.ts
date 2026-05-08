import {
  calculateAttackInterval,
  calculateInnerDamage,
  calculateOuterDamage,
  calculateStatusApplicationChance,
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

export type StageStatusMetrics = {
  applications: number;
  resisted: number;
  cleanses: number;
  expectedDamage: number;
  healingDenied: number;
  statusIds: string[];
};

export type StageBalanceReport = {
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
};

export type RegionBalanceReport = {
  regionId: string;
  name: string;
  stages: StageBalanceReport[];
  farmRecommendation: {
    stageId: string;
    score: number;
  } | null;
  bossGate: {
    stageId: string;
    baselineResult: BalanceResult;
    counterplayResult: BalanceResult;
    failureReason: string | null;
  } | null;
};

export type BalanceReport = {
  regions: RegionBalanceReport[];
  totals: {
    stages: number;
    statusApplications: number;
    statusDamage: number;
    cleanses: number;
  };
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

export function buildBalanceReport(data: StaticDataForBalance): BalanceReport {
  const stageById = new Map(data.stages.map((stage) => [stage.id, stage]));
  const enemyById = new Map(data.enemies.map((enemy) => [enemy.id, enemy]));
  const skillById = new Map(data.skills.map((skill) => [skill.id, skill]));
  const statusDefinitions = createStatusDictionary(data.statusEffects);
  const playerTeam = data.heroes;
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
        playerTeam,
        enemyById,
        skillById,
        statusDefinitions
      });
    });

    return {
      regionId: region.id,
      name: region.name,
      stages,
      farmRecommendation: getFarmRecommendation(stages),
      bossGate: getBossGate(stages)
    };
  });

  return {
    regions,
    totals: getReportTotals(regions)
  };
}

export function formatBalanceReport(report: BalanceReport): string {
  const lines = ["Path of Jianghu Balance Report", ""];

  for (const region of report.regions) {
    lines.push(`${region.name}`);
    lines.push("stage result time status status_dmg rewards");

    for (const stage of region.stages) {
      lines.push(
        [
          stage.stageId,
          stage.result,
          `${formatNumber(stage.estimatedClearTimeSeconds)}s`,
          formatNumber(stage.statusMetrics.applications),
          formatNumber(stage.statusMetrics.expectedDamage),
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
        `boss ${region.bossGate.stageId} baseline ${region.bossGate.baselineResult} counterplay ${region.bossGate.counterplayResult}`
      );
    }

    lines.push("");
  }

  lines.push(
    `Totals: ${report.totals.stages} stages, ${formatNumber(
      report.totals.statusApplications
    )} status applications, ${formatNumber(
      report.totals.statusDamage
    )} status damage, ${formatNumber(report.totals.cleanses)} cleanses`
  );

  return lines.join("\n");
}

function buildStageBalanceReport(input: {
  data: Pick<StaticDataForBalance, "medicines">;
  stage: StageDefinition;
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
    skillById: input.skillById,
    statusDefinitions: input.statusDefinitions,
    targetStats: averagePlayerStats,
    estimatedClearTimeSeconds,
    medicines: input.data.medicines
  });
  const enemyPressureDps =
    enemyDps +
    statusMetrics.expectedDamage / Math.max(1, estimatedClearTimeSeconds);
  const estimatedSurvivalSeconds = playerOuterHp / Math.max(1, enemyPressureDps);

  return {
    stageId: input.stage.id,
    regionId: input.stage.regionId,
    index: input.stage.index,
    name: input.stage.name,
    enemyTeamIds: input.stage.enemyTeam.combatantIds,
    result:
      estimatedClearTimeSeconds <= estimatedSurvivalSeconds
        ? "player_clear"
        : "enemy_hold",
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
    statusMetrics
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
  skillById: Map<string, SkillDefinition>;
  statusDefinitions: Record<string, StatusEffectDefinition>;
  targetStats: BaseStats;
  estimatedClearTimeSeconds: number;
  medicines: StaticDataForBalance["medicines"];
}): StageStatusMetrics {
  const statusIds = new Set<string>();
  let attempts = 0;
  let applications = 0;
  let expectedDamage = 0;
  let healingDenied = 0;

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
          targetStatusResistance: input.targetStats.statusResistance
        });
        const expectedApplications = casts * chance;
        const stacks = effect.stacks ?? 1;

        statusIds.add(status.id);
        attempts += casts;
        applications += expectedApplications;
        expectedDamage += estimateStatusDamage(
          status,
          effect.durationSeconds ?? status.durationSeconds,
          input.targetStats.maxOuterHp,
          stacks,
          expectedApplications
        );
        healingDenied += estimateHealingDenied(
          status,
          stacks,
          expectedApplications
        );
      }
    }
  }

  const cleanses = estimateCleanses({
    medicines: input.medicines,
    statusIds,
    statusDefinitions: input.statusDefinitions,
    applications
  });

  return {
    applications,
    resisted: Math.max(0, attempts - applications),
    cleanses,
    expectedDamage,
    healingDenied,
    statusIds: [...statusIds].sort()
  };
}

function estimateStatusDamage(
  status: StatusEffectDefinition,
  durationSeconds: number,
  targetMaxOuterHp: number,
  stacks: number,
  expectedApplications: number
): number {
  return (
    targetMaxOuterHp *
    (status.effects.outerDamagePerSecond ?? 0) *
    durationSeconds *
    stacks *
    expectedApplications
  );
}

function estimateHealingDenied(
  status: StatusEffectDefinition,
  stacks: number,
  expectedApplications: number
): number {
  const multiplier = status.effects.healingReceivedMultiplier;

  if (multiplier === undefined) {
    return 0;
  }

  return (1 - multiplier ** stacks) * 20 * expectedApplications;
}

function estimateCleanses(input: {
  medicines: StaticDataForBalance["medicines"];
  statusIds: Set<string>;
  statusDefinitions: Record<string, StatusEffectDefinition>;
  applications: number;
}): number {
  const coveredStatusIds = new Set<string>();

  for (const medicine of input.medicines) {
    for (const statusId of input.statusIds) {
      const status = input.statusDefinitions[statusId];

      if (status !== undefined && medicineCanCleanseStatus(medicine, status)) {
        coveredStatusIds.add(statusId);
      }
    }
  }

  if (coveredStatusIds.size === 0) {
    return 0;
  }

  return Math.min(input.applications, coveredStatusIds.size);
}

function medicineCanCleanseStatus(
  medicine: MedicineDefinition,
  status: StatusEffectDefinition
): boolean {
  return medicine.effects.some(
    (effect) =>
      effect.type === "cleanse_status" &&
      effect.dispelTags.some((tag) => status.dispelTags.includes(tag))
  );
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

  const counterplaySurvivalSeconds =
    boss.estimatedSurvivalSeconds + boss.statusMetrics.cleanses * 4;
  const counterplayResult =
    boss.estimatedClearTimeSeconds <= counterplaySurvivalSeconds
      ? "player_clear"
      : "enemy_hold";

  return {
    stageId: boss.stageId,
    baselineResult: boss.result,
    counterplayResult,
    failureReason:
      boss.result === "enemy_hold"
        ? boss.statusMetrics.applications > 0
          ? "status pressure"
          : "outer damage race"
        : null
  };
}

function getReportTotals(
  regions: RegionBalanceReport[]
): BalanceReport["totals"] {
  const stages = regions.flatMap((region) => region.stages);

  return {
    stages: stages.length,
    statusApplications: stages.reduce(
      (total, stage) => total + stage.statusMetrics.applications,
      0
    ),
    statusDamage: stages.reduce(
      (total, stage) => total + stage.statusMetrics.expectedDamage,
      0
    ),
    cleanses: stages.reduce(
      (total, stage) => total + stage.statusMetrics.cleanses,
      0
    )
  };
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
