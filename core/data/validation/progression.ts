import type {
  EnemyDefinition,
  FormationDefinition,
  RegionDefinition,
  StageRewards,
  SkillDefinition,
  StageDefinition
} from "../types";
import { FORMATION_SLOTS, isFormationSlot } from "../../combat";
import { isRecord, type StaticDataValidationContext } from "./shared";

const BALANCE_RESULT_EXPECTATIONS = ["player_clear", "enemy_hold"] as const;
const BALANCE_TARGET_KEYS = [
  "clearTimeSeconds",
  "rewardCurve",
  "statusPressure",
  "defensePressure",
  "healingPressure",
  "bossGate",
  "budgetExceptions"
] as const;
const CLEAR_TIME_TARGET_KEYS = ["normal", "elite", "boss"] as const;
const CLEAR_TIME_RANGE_KEYS = ["min", "max"] as const;
const REWARD_CURVE_TARGET_KEYS = [
  "requireBestFarmRecommendation",
  "allowedRegressions"
] as const;
const REWARD_CURVE_REGRESSION_KEYS = [
  "stageId",
  "metrics",
  "reason"
] as const;
const REWARD_CURVE_REGRESSION_METRICS = [
  "farmScore",
  "silver",
  "cultivation",
  "herbs",
  "combatExperience",
  "mastery"
] as const;
const REWARD_CURVE_SCORE_WEIGHTS = {
  combatExperience: 4,
  silver: 1,
  cultivation: 1.5,
  herbs: 2
} as const satisfies Record<keyof StageRewards, number>;
const STATUS_PRESSURE_TARGET_KEYS = [
  "minApplications",
  "maxApplications",
  "maxExpectedDamage",
  "maxMedicineConsumed",
  "expectedStatusIds"
] as const;
const DEFENSE_PRESSURE_TARGET_KEYS = [
  "minGuardAbsorbs",
  "minArmorBreaks",
  "minDamagePrevented"
] as const;
const HEALING_PRESSURE_TARGET_KEYS = [
  "minHeals",
  "minOuterHealing",
  "minCleanses",
  "maxRecoveryPrevented"
] as const;
const BOSS_GATE_TARGET_KEYS = [
  "baselineResult",
  "trainedResult",
  "farmedResult",
  "maxFarmClears",
  "maxTrainingCost",
  "clearTimeSeconds",
  "maxMedicineConsumed",
  "maxStatusDamage"
] as const;
const BUDGET_EXCEPTION_KEYS = ["type", "stageId", "reason"] as const;
const BUDGET_EXCEPTION_TYPES = ["boss_clear_time_target"] as const;

type RegionBudgetComposition = {
  hasNormalStages: boolean;
  hasEliteStages: boolean;
  hasFarmableStages: boolean;
  hasEnemyStatusPressure: boolean;
  bossStageIds: string[];
  farmableStages: StageDefinition[];
};

type RewardCurveRegression = {
  stageId: string;
  previousStageId: string;
  metric: (typeof REWARD_CURVE_REGRESSION_METRICS)[number];
  value: number;
  previousValue: number;
};

export function validateClearTimeTargetRange(
  ownerLabel: string,
  value: unknown
): string[] {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return [`${ownerLabel} must be an object`];
  }

  errors.push(...validateAllowedKeys(ownerLabel, value, CLEAR_TIME_RANGE_KEYS));

  if (typeof value.min !== "number" || !Number.isFinite(value.min)) {
    errors.push(`${ownerLabel}.min must be a finite number`);
  }

  if (typeof value.max !== "number" || !Number.isFinite(value.max)) {
    errors.push(`${ownerLabel}.max must be a finite number`);
  }

  if (
    typeof value.min === "number" &&
    Number.isFinite(value.min) &&
    value.min < 0
  ) {
    errors.push(`${ownerLabel}.min must be non-negative`);
  }

  if (
    typeof value.max === "number" &&
    Number.isFinite(value.max) &&
    value.max <= 0
  ) {
    errors.push(`${ownerLabel}.max must be greater than zero`);
  }

  if (
    typeof value.min === "number" &&
    Number.isFinite(value.min) &&
    typeof value.max === "number" &&
    Number.isFinite(value.max) &&
    value.min > value.max
  ) {
    errors.push(`${ownerLabel}.min must be less than or equal to max`);
  }

  return errors;
}

export function validateRegionBalanceTargets(
  region: RegionDefinition,
  context: Pick<StaticDataValidationContext, "statusEffectIds">,
  stages: StageDefinition[],
  enemies: EnemyDefinition[],
  skills: SkillDefinition[]
): string[] {
  const targets = region.balanceTargets;
  const composition = buildRegionBudgetComposition(
    region,
    stages,
    enemies,
    skills
  );

  if (targets === undefined) {
    return [`Region ${region.id} must define balanceTargets`];
  }

  if (!isRecord(targets)) {
    return [`Region ${region.id} balanceTargets must be an object`];
  }

  const errors = validateAllowedKeys(
    `Region ${region.id} balanceTargets`,
    targets,
    BALANCE_TARGET_KEYS
  );

  errors.push(...validateClearTimeTargets(region, composition));
  errors.push(...validateRewardCurveTargets(region, composition));
  errors.push(...validateStatusPressureTargets(region, context, composition));
  errors.push(...validateDefensePressureTargets(region));
  errors.push(...validateHealingPressureTargets(region));
  errors.push(...validateBossGateTargets(region, composition));
  errors.push(...validateBudgetExceptions(region, composition));
  errors.push(...validateBossClearTimeTargetContract(region, composition));

  return errors;
}

function validateClearTimeTargets(
  region: RegionDefinition,
  composition: RegionBudgetComposition
): string[] {
  const targets = region.balanceTargets?.clearTimeSeconds;

  if (!isRecord(targets)) {
    return [
      `Region ${region.id} balanceTargets.clearTimeSeconds must be an object`
    ];
  }

  const errors = validateAllowedKeys(
    `Region ${region.id} balanceTargets.clearTimeSeconds`,
    targets,
    CLEAR_TIME_TARGET_KEYS
  );

  if (composition.hasNormalStages) {
    errors.push(
      ...validateRequiredClearTimeTargetRange(
        `Region ${region.id} balanceTargets.clearTimeSeconds.normal`,
        targets.normal,
        "normal"
      )
    );
  } else if (targets.normal !== undefined) {
    errors.push(
      ...validateClearTimeTargetRange(
        `Region ${region.id} balanceTargets.clearTimeSeconds.normal`,
        targets.normal
      )
    );
  }

  if (composition.hasEliteStages) {
    errors.push(
      ...validateRequiredClearTimeTargetRange(
        `Region ${region.id} balanceTargets.clearTimeSeconds.elite`,
        targets.elite,
        "elite"
      )
    );
  } else if (targets.elite !== undefined) {
    errors.push(
      ...validateClearTimeTargetRange(
        `Region ${region.id} balanceTargets.clearTimeSeconds.elite`,
        targets.elite
      )
    );
  }

  if (targets.boss !== undefined) {
    errors.push(
      ...validateClearTimeTargetRange(
        `Region ${region.id} balanceTargets.clearTimeSeconds.boss`,
        targets.boss
      )
    );
  }

  return errors;
}

function validateRequiredClearTimeTargetRange(
  ownerLabel: string,
  value: unknown,
  stageType: "normal" | "elite"
): string[] {
  return value === undefined
    ? [`${ownerLabel} is required because region has ${stageType} stages`]
    : validateClearTimeTargetRange(ownerLabel, value);
}

function validateRewardCurveTargets(
  region: RegionDefinition,
  composition: RegionBudgetComposition
): string[] {
  const targets = region.balanceTargets?.rewardCurve;

  if (targets === undefined) {
    return composition.hasFarmableStages
      ? [
          `Region ${region.id} balanceTargets.rewardCurve.requireBestFarmRecommendation must be true because region has farmable stages`
        ]
      : [];
  }

  if (!isRecord(targets)) {
    return [`Region ${region.id} balanceTargets.rewardCurve must be an object`];
  }

  const errors = validateAllowedKeys(
    `Region ${region.id} balanceTargets.rewardCurve`,
    targets,
    REWARD_CURVE_TARGET_KEYS
  );

  if (
    targets.requireBestFarmRecommendation !== undefined &&
    typeof targets.requireBestFarmRecommendation !== "boolean"
  ) {
    errors.push(
      `Region ${region.id} balanceTargets.rewardCurve.requireBestFarmRecommendation must be a boolean`
    );
  } else if (
    composition.hasFarmableStages &&
    targets.requireBestFarmRecommendation !== true
  ) {
    errors.push(
      `Region ${region.id} balanceTargets.rewardCurve.requireBestFarmRecommendation must be true because region has farmable stages`
    );
  } else if (
    !composition.hasFarmableStages &&
    targets.requireBestFarmRecommendation === true
  ) {
    errors.push(
      `Region ${region.id} balanceTargets.rewardCurve.requireBestFarmRecommendation cannot be true because region has no farmable stages`
    );
  }

  const regressions = getRewardCurveRegressions(composition.farmableStages);
  const allowedRegressionKeys = getAllowedRewardRegressionKeys(
    region,
    targets,
    composition,
    regressions,
    errors
  );

  for (const regression of regressions) {
    if (allowedRegressionKeys.has(getRewardRegressionKey(regression))) {
      continue;
    }

    errors.push(
      `Region ${region.id} rewardCurve stage ${regression.stageId} ${formatRewardMetric(regression.metric)} ${formatNumber(regression.value)} is below previous farm stage ${regression.previousStageId} value ${formatNumber(regression.previousValue)}; add an allowedRegressions entry if intentional`
    );
  }

  return errors;
}

function getAllowedRewardRegressionKeys(
  region: RegionDefinition,
  targets: Record<string, unknown>,
  composition: RegionBudgetComposition,
  regressions: RewardCurveRegression[],
  errors: string[]
): Set<string> {
  const allowedRegressions = targets.allowedRegressions;
  const allowedKeys = new Set<string>();

  if (allowedRegressions === undefined) {
    return allowedKeys;
  }

  if (!Array.isArray(allowedRegressions)) {
    errors.push(
      `Region ${region.id} balanceTargets.rewardCurve.allowedRegressions must be an array`
    );
    return allowedKeys;
  }

  const farmableStageIds = new Set(
    composition.farmableStages.map((stage) => stage.id)
  );
  const regressionKeys = new Set(regressions.map(getRewardRegressionKey));
  const seenKeys = new Set<string>();

  for (const [index, allowance] of allowedRegressions.entries()) {
    const ownerLabel = `Region ${region.id} balanceTargets.rewardCurve.allowedRegressions[${index}]`;

    if (!isRecord(allowance)) {
      errors.push(`${ownerLabel} must be an object`);
      continue;
    }

    errors.push(
      ...validateAllowedKeys(ownerLabel, allowance, REWARD_CURVE_REGRESSION_KEYS)
    );

    if (typeof allowance.stageId !== "string" || allowance.stageId.length === 0) {
      errors.push(`${ownerLabel}.stageId must be a non-empty string`);
    } else if (!farmableStageIds.has(allowance.stageId)) {
      errors.push(
        `${ownerLabel}.stageId ${allowance.stageId} must reference a farmable non-boss stage in region ${region.id}`
      );
    }

    if (typeof allowance.reason !== "string" || allowance.reason.trim().length === 0) {
      errors.push(`${ownerLabel}.reason must be a non-empty string`);
    }

    if (!Array.isArray(allowance.metrics) || allowance.metrics.length === 0) {
      errors.push(`${ownerLabel}.metrics must be a non-empty array`);
      continue;
    }

    const seenMetrics = new Set<string>();
    for (const metric of allowance.metrics) {
      const metricValue = String(metric);

      if (
        !REWARD_CURVE_REGRESSION_METRICS.includes(
          metricValue as (typeof REWARD_CURVE_REGRESSION_METRICS)[number]
        )
      ) {
        errors.push(
          `${ownerLabel}.metrics includes unsupported metric ${String(metric)}`
        );
        continue;
      }

      if (seenMetrics.has(metricValue)) {
        errors.push(`${ownerLabel}.metrics duplicates ${metricValue}`);
      }
      seenMetrics.add(metricValue);

      if (typeof allowance.stageId !== "string" || allowance.stageId.length === 0) {
        continue;
      }

      const key = `${allowance.stageId}:${metricValue}`;
      if (seenKeys.has(key)) {
        errors.push(`${ownerLabel} duplicates ${metricValue} regression for ${allowance.stageId}`);
      }
      seenKeys.add(key);

      if (!regressionKeys.has(key)) {
        errors.push(
          `${ownerLabel} allows ${formatRewardMetric(metricValue)} regression for ${allowance.stageId}, but no such regression exists`
        );
        continue;
      }

      allowedKeys.add(key);
    }
  }

  return allowedKeys;
}

function validateStatusPressureTargets(
  region: RegionDefinition,
  context: Pick<StaticDataValidationContext, "statusEffectIds">,
  composition: RegionBudgetComposition
): string[] {
  const targets = region.balanceTargets?.statusPressure;

  if (targets === undefined) {
    return composition.hasEnemyStatusPressure
      ? [
          `Region ${region.id} balanceTargets.statusPressure is required because region enemies apply status effects`
        ]
      : [];
  }

  if (!isRecord(targets)) {
    return [`Region ${region.id} balanceTargets.statusPressure must be an object`];
  }

  const errors = validateAllowedKeys(
    `Region ${region.id} balanceTargets.statusPressure`,
    targets,
    STATUS_PRESSURE_TARGET_KEYS
  );
  validateAtLeastOneKnownKey(
    errors,
    targets,
    STATUS_PRESSURE_TARGET_KEYS,
    `Region ${region.id} balanceTargets.statusPressure`
  );
  validateOptionalNonNegativeNumber(
    errors,
    targets.minApplications,
    `Region ${region.id} balanceTargets.statusPressure.minApplications`
  );
  validateOptionalNonNegativeNumber(
    errors,
    targets.maxApplications,
    `Region ${region.id} balanceTargets.statusPressure.maxApplications`
  );
  validateOptionalNonNegativeNumber(
    errors,
    targets.maxExpectedDamage,
    `Region ${region.id} balanceTargets.statusPressure.maxExpectedDamage`
  );
  validateOptionalNonNegativeNumber(
    errors,
    targets.maxMedicineConsumed,
    `Region ${region.id} balanceTargets.statusPressure.maxMedicineConsumed`
  );

  if (targets.expectedStatusIds !== undefined) {
    if (
      !Array.isArray(targets.expectedStatusIds) ||
      targets.expectedStatusIds.some((statusId) => typeof statusId !== "string")
    ) {
      errors.push(
        `Region ${region.id} balanceTargets.statusPressure.expectedStatusIds must be an array of strings`
      );
    } else {
      for (const statusId of targets.expectedStatusIds) {
        if (!context.statusEffectIds.has(statusId)) {
          errors.push(
            `Region ${region.id} balanceTargets.statusPressure.expectedStatusIds includes unknown status ${statusId}`
          );
        }
      }
    }
  }

  validateMinMaxPair(
    errors,
    targets.minApplications,
    targets.maxApplications,
    `Region ${region.id} balanceTargets.statusPressure.applications`
  );

  return errors;
}

function validateDefensePressureTargets(region: RegionDefinition): string[] {
  const targets = region.balanceTargets?.defensePressure;

  if (targets === undefined) {
    return [];
  }

  if (!isRecord(targets)) {
    return [`Region ${region.id} balanceTargets.defensePressure must be an object`];
  }

  const errors = validateAllowedKeys(
    `Region ${region.id} balanceTargets.defensePressure`,
    targets,
    DEFENSE_PRESSURE_TARGET_KEYS
  );
  validateAtLeastOneKnownKey(
    errors,
    targets,
    DEFENSE_PRESSURE_TARGET_KEYS,
    `Region ${region.id} balanceTargets.defensePressure`
  );
  validateOptionalNonNegativeNumber(
    errors,
    targets.minGuardAbsorbs,
    `Region ${region.id} balanceTargets.defensePressure.minGuardAbsorbs`
  );
  validateOptionalNonNegativeNumber(
    errors,
    targets.minArmorBreaks,
    `Region ${region.id} balanceTargets.defensePressure.minArmorBreaks`
  );
  validateOptionalNonNegativeNumber(
    errors,
    targets.minDamagePrevented,
    `Region ${region.id} balanceTargets.defensePressure.minDamagePrevented`
  );

  return errors;
}

function validateHealingPressureTargets(region: RegionDefinition): string[] {
  const targets = region.balanceTargets?.healingPressure;

  if (targets === undefined) {
    return [];
  }

  if (!isRecord(targets)) {
    return [`Region ${region.id} balanceTargets.healingPressure must be an object`];
  }

  const errors = validateAllowedKeys(
    `Region ${region.id} balanceTargets.healingPressure`,
    targets,
    HEALING_PRESSURE_TARGET_KEYS
  );
  validateAtLeastOneKnownKey(
    errors,
    targets,
    HEALING_PRESSURE_TARGET_KEYS,
    `Region ${region.id} balanceTargets.healingPressure`
  );
  validateOptionalNonNegativeNumber(
    errors,
    targets.minHeals,
    `Region ${region.id} balanceTargets.healingPressure.minHeals`
  );
  validateOptionalNonNegativeNumber(
    errors,
    targets.minOuterHealing,
    `Region ${region.id} balanceTargets.healingPressure.minOuterHealing`
  );
  validateOptionalNonNegativeNumber(
    errors,
    targets.minCleanses,
    `Region ${region.id} balanceTargets.healingPressure.minCleanses`
  );
  validateOptionalNonNegativeNumber(
    errors,
    targets.maxRecoveryPrevented,
    `Region ${region.id} balanceTargets.healingPressure.maxRecoveryPrevented`
  );

  return errors;
}

function validateBossGateTargets(
  region: RegionDefinition,
  composition: RegionBudgetComposition
): string[] {
  const targets = region.balanceTargets?.bossGate;

  if (targets === undefined) {
    return composition.bossStageIds.length > 0
      ? [
          `Region ${region.id} balanceTargets.bossGate is required because region has boss stages`
        ]
      : [];
  }

  if (!isRecord(targets)) {
    return [`Region ${region.id} balanceTargets.bossGate must be an object`];
  }

  const errors = validateAllowedKeys(
    `Region ${region.id} balanceTargets.bossGate`,
    targets,
    BOSS_GATE_TARGET_KEYS
  );
  validateOptionalResultExpectation(
    errors,
    targets.baselineResult,
    `Region ${region.id} balanceTargets.bossGate.baselineResult`
  );
  validateOptionalResultExpectation(
    errors,
    targets.trainedResult,
    `Region ${region.id} balanceTargets.bossGate.trainedResult`
  );
  validateOptionalResultExpectation(
    errors,
    targets.farmedResult,
    `Region ${region.id} balanceTargets.bossGate.farmedResult`
  );
  validateOptionalNonNegativeNumber(
    errors,
    targets.maxFarmClears,
    `Region ${region.id} balanceTargets.bossGate.maxFarmClears`
  );
  validateOptionalNonNegativeNumber(
    errors,
    targets.maxTrainingCost,
    `Region ${region.id} balanceTargets.bossGate.maxTrainingCost`
  );
  validateOptionalNonNegativeNumber(
    errors,
    targets.maxMedicineConsumed,
    `Region ${region.id} balanceTargets.bossGate.maxMedicineConsumed`
  );
  validateOptionalNonNegativeNumber(
    errors,
    targets.maxStatusDamage,
    `Region ${region.id} balanceTargets.bossGate.maxStatusDamage`
  );

  if (targets.clearTimeSeconds !== undefined) {
    errors.push(
      ...validateClearTimeTargetRange(
        `Region ${region.id} balanceTargets.bossGate.clearTimeSeconds`,
        targets.clearTimeSeconds
      )
    );
  }

  const expectedResults = [
    targets.baselineResult,
    targets.trainedResult,
    targets.farmedResult
  ].filter((result) => result !== undefined);

  if (composition.bossStageIds.length > 0 && expectedResults.length === 0) {
    errors.push(
      `Region ${region.id} balanceTargets.bossGate must define at least one expected result because region has boss stages`
    );
  }

  if (targets.maxFarmClears !== undefined && targets.farmedResult === undefined) {
    errors.push(
      `Region ${region.id} balanceTargets.bossGate.maxFarmClears requires farmedResult`
    );
  }

  if (
    targets.maxTrainingCost !== undefined &&
    targets.farmedResult === undefined
  ) {
    errors.push(
      `Region ${region.id} balanceTargets.bossGate.maxTrainingCost requires farmedResult`
    );
  }

  if (
    targets.clearTimeSeconds !== undefined &&
    !expectedResults.includes("player_clear")
  ) {
    errors.push(
      `Region ${region.id} balanceTargets.bossGate.clearTimeSeconds requires at least one player_clear boss result`
    );
  }

  return errors;
}

function validateBudgetExceptions(
  region: RegionDefinition,
  composition: RegionBudgetComposition
): string[] {
  const exceptions = region.balanceTargets?.budgetExceptions;

  if (exceptions === undefined) {
    return [];
  }

  if (!Array.isArray(exceptions)) {
    return [`Region ${region.id} balanceTargets.budgetExceptions must be an array`];
  }

  const errors: string[] = [];
  const seen = new Set<string>();

  for (const [index, exception] of exceptions.entries()) {
    const ownerLabel = `Region ${region.id} balanceTargets.budgetExceptions[${index}]`;

    if (!isRecord(exception)) {
      errors.push(`${ownerLabel} must be an object`);
      continue;
    }

    errors.push(...validateAllowedKeys(ownerLabel, exception, BUDGET_EXCEPTION_KEYS));

    if (
      !BUDGET_EXCEPTION_TYPES.includes(
        exception.type as (typeof BUDGET_EXCEPTION_TYPES)[number]
      )
    ) {
      errors.push(
        `${ownerLabel}.type must be one of ${BUDGET_EXCEPTION_TYPES.join(", ")}`
      );
    }

    if (typeof exception.stageId !== "string" || exception.stageId.length === 0) {
      errors.push(`${ownerLabel}.stageId must be a non-empty string`);
    }

    if (typeof exception.reason !== "string" || exception.reason.trim().length === 0) {
      errors.push(`${ownerLabel}.reason must be a non-empty string`);
    }

    if (
      exception.type === "boss_clear_time_target" &&
      typeof exception.stageId === "string"
    ) {
      const key = `${exception.type}:${exception.stageId}`;

      if (seen.has(key)) {
        errors.push(`${ownerLabel} duplicates ${exception.type} for ${exception.stageId}`);
      }
      seen.add(key);

      if (!composition.bossStageIds.includes(exception.stageId)) {
        errors.push(
          `${ownerLabel}.stageId ${exception.stageId} must reference a boss stage in region ${region.id}`
        );
      }

      if (hasConfiguredBossClearTimeTarget(region)) {
        errors.push(
          `${ownerLabel} is redundant because a boss clear-time target is configured`
        );
      }
    }
  }

  return errors;
}

function validateBossClearTimeTargetContract(
  region: RegionDefinition,
  composition: RegionBudgetComposition
): string[] {
  const bossGate = region.balanceTargets?.bossGate;

  if (!isRecord(bossGate)) {
    return [];
  }

  const expectsBossClear =
    bossGate.baselineResult === "player_clear" ||
    bossGate.trainedResult === "player_clear" ||
    bossGate.farmedResult === "player_clear";

  if (!expectsBossClear || hasConfiguredBossClearTimeTarget(region)) {
    return [];
  }

  return composition.bossStageIds.flatMap((stageId) =>
    hasValidBudgetException(region, "boss_clear_time_target", stageId)
      ? []
      : [
          `Region ${region.id} boss stage ${stageId} requires balanceTargets.bossGate.clearTimeSeconds, balanceTargets.clearTimeSeconds.boss, or a boss_clear_time_target budget exception because a boss result is expected to clear`
        ]
  );
}

function validateOptionalResultExpectation(
  errors: string[],
  value: unknown,
  ownerLabel: string
): void {
  if (
    value !== undefined &&
    !BALANCE_RESULT_EXPECTATIONS.includes(
      value as (typeof BALANCE_RESULT_EXPECTATIONS)[number]
    )
  ) {
    errors.push(
      `${ownerLabel} must be one of ${BALANCE_RESULT_EXPECTATIONS.join(", ")}`
    );
  }
}

function validateOptionalNonNegativeNumber(
  errors: string[],
  value: unknown,
  ownerLabel: string
): void {
  if (value === undefined) {
    return;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors.push(`${ownerLabel} must be a finite number`);
    return;
  }

  if (value < 0) {
    errors.push(`${ownerLabel} must be non-negative`);
  }
}

function validateMinMaxPair(
  errors: string[],
  minValue: unknown,
  maxValue: unknown,
  ownerLabel: string
): void {
  if (
    typeof minValue === "number" &&
    Number.isFinite(minValue) &&
    typeof maxValue === "number" &&
    Number.isFinite(maxValue) &&
    minValue > maxValue
  ) {
    errors.push(`${ownerLabel}.min must be less than or equal to max`);
  }
}

function validateAllowedKeys(
  ownerLabel: string,
  value: Record<string, unknown>,
  allowedKeys: readonly string[]
): string[] {
  return Object.keys(value)
    .filter((key) => !allowedKeys.includes(key))
    .map((key) => `${ownerLabel}.${key} is not supported`);
}

function validateAtLeastOneKnownKey(
  errors: string[],
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
  ownerLabel: string
): void {
  if (allowedKeys.some((key) => value[key] !== undefined)) {
    return;
  }

  errors.push(`${ownerLabel} must define at least one budget field`);
}

function getRewardCurveRegressions(
  farmableStages: StageDefinition[]
): RewardCurveRegression[] {
  const regressions: RewardCurveRegression[] = [];

  for (let index = 1; index < farmableStages.length; index += 1) {
    const previousStage = farmableStages[index - 1];
    const stage = farmableStages[index];
    const comparisons: Array<{
      metric: RewardCurveRegression["metric"];
      value: number;
      previousValue: number;
    }> = [
      {
        metric: "farmScore",
        value: scoreFarmRewards(stage.rewards),
        previousValue: scoreFarmRewards(previousStage.rewards)
      },
      {
        metric: "silver",
        value: stage.rewards.silver,
        previousValue: previousStage.rewards.silver
      },
      {
        metric: "cultivation",
        value: stage.rewards.cultivation,
        previousValue: previousStage.rewards.cultivation
      },
      {
        metric: "herbs",
        value: stage.rewards.herbs ?? 0,
        previousValue: previousStage.rewards.herbs ?? 0
      },
      {
        metric: "combatExperience",
        value: stage.rewards.combatExperience,
        previousValue: previousStage.rewards.combatExperience
      },
      {
        metric: "mastery",
        value: stage.rewards.combatExperience,
        previousValue: previousStage.rewards.combatExperience
      }
    ];

    for (const comparison of comparisons) {
      if (comparison.value < comparison.previousValue) {
        regressions.push({
          stageId: stage.id,
          previousStageId: previousStage.id,
          ...comparison
        });
      }
    }
  }

  return regressions;
}

function scoreFarmRewards(rewards: StageRewards): number {
  return (
    rewards.combatExperience * REWARD_CURVE_SCORE_WEIGHTS.combatExperience +
    rewards.silver * REWARD_CURVE_SCORE_WEIGHTS.silver +
    rewards.cultivation * REWARD_CURVE_SCORE_WEIGHTS.cultivation +
    (rewards.herbs ?? 0) * REWARD_CURVE_SCORE_WEIGHTS.herbs
  );
}

function getRewardRegressionKey(regression: RewardCurveRegression): string {
  return `${regression.stageId}:${regression.metric}`;
}

function formatRewardMetric(metric: string): string {
  return metric === "farmScore" ? "farm score" : metric;
}

function formatNumber(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/\.?0+$/, "");
}

function buildRegionBudgetComposition(
  region: RegionDefinition,
  stages: StageDefinition[],
  enemies: EnemyDefinition[],
  skills: SkillDefinition[]
): RegionBudgetComposition {
  const stagesById = new Map(stages.map((stage) => [stage.id, stage]));
  const enemiesById = new Map(enemies.map((enemy) => [enemy.id, enemy]));
  const skillsById = new Map(skills.map((skill) => [skill.id, skill]));
  const composition: RegionBudgetComposition = {
    hasNormalStages: false,
    hasEliteStages: false,
    hasFarmableStages: false,
    hasEnemyStatusPressure: false,
    bossStageIds: [],
    farmableStages: []
  };

  for (const stageId of region.stageIds) {
    const stage = stagesById.get(stageId);

    if (stage === undefined) {
      continue;
    }

    if (stage.isBoss) {
      composition.bossStageIds.push(stage.id);
    } else {
      const hasEliteEnemy = stage.enemyTeam.combatantIds.some(
        (enemyId) => enemiesById.get(enemyId)?.type === "elite"
      );

      if (hasEliteEnemy) {
        composition.hasEliteStages = true;
      } else {
        composition.hasNormalStages = true;
      }
    }

    if (stage.canFarmOffline && !stage.isBoss) {
      composition.hasFarmableStages = true;
      composition.farmableStages.push(stage);
    }

    if (
      stage.enemyTeam.combatantIds.some((enemyId) =>
        (enemiesById.get(enemyId)?.skillIds ?? []).some((skillId) =>
          (skillsById.get(skillId)?.effects ?? []).some(
            (effect) => effect.type === "apply_status"
          )
        )
      )
    ) {
      composition.hasEnemyStatusPressure = true;
    }
  }

  return composition;
}

function hasConfiguredBossClearTimeTarget(region: RegionDefinition): boolean {
  const clearTimeTargets = region.balanceTargets?.clearTimeSeconds;
  const bossGateTargets = region.balanceTargets?.bossGate;

  return (
    (isRecord(clearTimeTargets) && clearTimeTargets.boss !== undefined) ||
    (isRecord(bossGateTargets) && bossGateTargets.clearTimeSeconds !== undefined)
  );
}

function hasValidBudgetException(
  region: RegionDefinition,
  type: (typeof BUDGET_EXCEPTION_TYPES)[number],
  stageId: string
): boolean {
  const exceptions = region.balanceTargets?.budgetExceptions;

  return (
    Array.isArray(exceptions) &&
    exceptions.some(
      (exception) =>
        isRecord(exception) &&
        exception.type === type &&
        exception.stageId === stageId &&
        typeof exception.reason === "string" &&
        exception.reason.trim().length > 0
    )
  );
}

export function validateStageEnemyRefs(
  stages: StageDefinition[],
  context: Pick<StaticDataValidationContext, "enemyIds">
): string[] {
  return stages.flatMap((stage) =>
    stage.enemyTeam.combatantIds
      .filter((enemyId) => !context.enemyIds.has(enemyId))
      .map((enemyId) => `Stage ${stage.id} references missing enemy ${enemyId}`)
  );
}

export function validateStageEquipmentRefs(
  stages: StageDefinition[],
  context: Pick<StaticDataValidationContext, "equipmentIds">
): string[] {
  return stages.flatMap((stage) =>
    (stage.equipmentDrops ?? []).flatMap((drop) =>
      context.equipmentIds.has(drop.equipmentId)
        ? []
        : [`Stage ${stage.id} references missing equipment ${drop.equipmentId}`]
    )
  );
}

export function validateStageRegionRefs(
  stages: StageDefinition[],
  context: Pick<StaticDataValidationContext, "regionIds">
): string[] {
  return stages.flatMap((stage) =>
    context.regionIds.has(stage.regionId)
      ? []
      : [`Stage ${stage.id} references missing region ${stage.regionId}`]
  );
}

export function validateStageNextRefs(
  stages: StageDefinition[],
  context: Pick<StaticDataValidationContext, "stageIds">
): string[] {
  return stages.flatMap((stage) =>
    stage.nextStageId === null || context.stageIds.has(stage.nextStageId)
      ? []
      : [`Stage ${stage.id} references missing next stage ${stage.nextStageId}`]
  );
}

export function validateRegionStageRefs(
  regions: RegionDefinition[],
  context: Pick<StaticDataValidationContext, "stageIds">
): string[] {
  return regions.flatMap((region) =>
    region.stageIds
      .filter((stageId) => !context.stageIds.has(stageId))
      .map((stageId) => `Region ${region.id} references missing stage ${stageId}`)
  );
}

export function validateRegionStageOwnership(
  regions: RegionDefinition[],
  stages: StageDefinition[]
): string[] {
  const stagesById = new Map(stages.map((stage) => [stage.id, stage]));

  return regions.flatMap((region) =>
    region.stageIds.flatMap((stageId) => {
      const stage = stagesById.get(stageId);

      return stage && stage.regionId !== region.id
        ? [
            `Region ${region.id} includes stage ${stageId} from region ${stage.regionId}`
          ]
        : [];
    })
  );
}

export function validateFormation(formation: FormationDefinition): string[] {
  const errors: string[] = [];
  const seenSlots = new Set<string>();

  for (const slot of formation.slots) {
    if (!isFormationSlot(slot)) {
      errors.push(
        `Formation ${formation.id} slot ${String(slot)} must be one of ${FORMATION_SLOTS.join(", ")}`
      );
      continue;
    }

    if (seenSlots.has(slot)) {
      errors.push(`Formation ${formation.id} slot ${slot} is duplicated`);
    }

    seenSlots.add(slot);
  }

  return errors;
}

export function validateStage(stage: StageDefinition): string[] {
  const errors: string[] = [];

  if (stage.isBoss && stage.canFarmOffline) {
    errors.push(`Boss stage ${stage.id} cannot be marked for offline farming`);
  }

  if (
    stage.rewards.silver < 0 ||
    stage.rewards.cultivation < 0 ||
    (stage.rewards.herbs ?? 0) < 0 ||
    stage.rewards.combatExperience < 0
  ) {
    errors.push(`Stage ${stage.id} rewards must be non-negative`);
  }

  for (const drop of stage.equipmentDrops ?? []) {
    if (!Number.isInteger(drop.quantity) || drop.quantity < 1) {
      errors.push(`Stage ${stage.id} equipment drop quantity must be an integer >= 1`);
    }
  }

  const placedCombatantIndexes = new Set<number>();

  for (const [slot, combatantIndexes] of Object.entries(
    stage.enemyTeam.formation ?? {}
  )) {
    if (!isFormationSlot(slot)) {
      errors.push(
        `Stage ${stage.id} enemyTeam formation slot ${slot} must be one of ${FORMATION_SLOTS.join(", ")}`
      );
      continue;
    }

    if (!Array.isArray(combatantIndexes)) {
      errors.push(`Stage ${stage.id} enemyTeam formation slot ${slot} must be an array`);
      continue;
    }

    for (const combatantIndex of combatantIndexes) {
      if (
        typeof combatantIndex !== "number" ||
        !Number.isInteger(combatantIndex) ||
        combatantIndex < 0 ||
        combatantIndex >= stage.enemyTeam.combatantIds.length
      ) {
        errors.push(
          `Stage ${stage.id} enemyTeam formation slot ${slot} has invalid combatant index ${String(combatantIndex)}`
        );
        continue;
      }

      if (placedCombatantIndexes.has(combatantIndex)) {
        errors.push(
          `Stage ${stage.id} enemyTeam formation places combatant index ${combatantIndex} more than once`
        );
      }

      placedCombatantIndexes.add(combatantIndex);
    }
  }

  return errors;
}
