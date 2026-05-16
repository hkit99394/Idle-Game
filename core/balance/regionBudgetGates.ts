import type { BalanceResultExpectation, RegionBalanceTargets } from "../data";
import type { BalanceTargetCheck } from "./targets";
import { assessStageClearTimeTarget } from "./targets";

export type RegionBudgetGateBattleOutcome =
  | {
      ok: false;
      stageId: string;
      reason: string;
    }
  | ({
      ok: true;
      stageId: string;
      durationSeconds: number;
      medicineConsumed: number;
      statusDamage: number;
      farmClears?: number;
      trainingCost?: number;
    } & (
      | {
          result: "player_clear";
        }
      | {
          result: "enemy_hold";
        }
    ));

export function isRegionBudgetGateStageCleared(
  outcome: RegionBudgetGateBattleOutcome
): boolean {
  return outcome.ok && outcome.result === "player_clear";
}

export type StageBudgetMetrics = {
  statusApplications: number;
  statusDamage: number;
  medicineConsumed: number;
  statusIds: Iterable<string>;
  guardAbsorbs: number;
  armorBreaks: number;
  defensiveDamagePrevented: number;
  heals: number;
  bodyIntegrityRestored: number;
  cleanses: number;
  recoveryPrevented: number;
};

export type RegionPressureStageSummary =
  | {
      ok: false;
    }
  | ({
      ok: true;
      protections?: number;
      regenerations?: number;
      wounds?: number;
      woundUptimeSeconds?: number;
      contextStabilityRestored?: number;
      overhealing?: number;
    } & StageBudgetMetrics);

export type RegionPressureMetrics = {
  statusPressure: {
    applications: number;
    damage: number;
    medicineConsumed: number;
    statusIds: Set<string>;
  };
  defensePressure: {
    guardAbsorbs: number;
    protections: number;
    armorBreaks: number;
    defensiveDamagePrevented: number;
  };
  healingPressure: {
    heals: number;
    regenerations: number;
    wounds: number;
    woundUptimeSeconds: number;
    cleanses: number;
    bodyIntegrityRestored: number;
    contextStabilityRestored: number;
    overhealing: number;
    recoveryPrevented: number;
  };
};

export type RegionBudgetGateStageSummary =
  | {
      ok: false;
      stageId: string;
      reason: string;
      targetSeconds?: readonly [number, number] | null;
    }
  | ({
      ok: true;
      stageId: string;
      targetSeconds: readonly [number, number] | null;
      result: BalanceResultExpectation;
      stageCleared: boolean;
      durationSeconds: number;
    } & StageBudgetMetrics);

export type RegionBudgetGateContext = {
  targets: RegionBalanceTargets | undefined;
  clearTime: {
    evaluatedCount: number;
    failures: string[];
  };
  rewardCurve?: {
    actualFarmStageId: string | null;
    expectedFarmStageId: string | null;
    expectedFarmScore: number;
  };
  statusPressure?: {
    applications: number;
    damage: number;
    medicineConsumed: number;
    statusIds: Iterable<string>;
  };
  defensePressure?: {
    guardAbsorbs: number;
    armorBreaks: number;
    defensiveDamagePrevented: number;
  };
  healingPressure?: {
    heals: number;
    bodyIntegrityRestored: number;
    cleanses: number;
    recoveryPrevented: number;
  };
  bossGate?: {
    baseline?: RegionBudgetGateBattleOutcome;
    trained?: RegionBudgetGateBattleOutcome;
    farmed?: RegionBudgetGateBattleOutcome;
  };
};

export function buildRegionBudgetGateContext(input: {
  targets: RegionBalanceTargets | undefined;
  stageResults: readonly RegionBudgetGateStageSummary[];
  rewardCurve?: RegionBudgetGateContext["rewardCurve"];
  bossGate?: RegionBudgetGateContext["bossGate"];
}): RegionBudgetGateContext {
  const pressureMetrics = buildRegionPressureMetrics(input.stageResults);

  return {
    targets: input.targets,
    clearTime: buildClearTimeBudgetContext(input.stageResults),
    rewardCurve: input.rewardCurve,
    statusPressure: pressureMetrics.statusPressure,
    defensePressure: pressureMetrics.defensePressure,
    healingPressure: pressureMetrics.healingPressure,
    bossGate: input.bossGate
  };
}

export function buildRegionBudgetGateChecks(
  context: RegionBudgetGateContext
): BalanceTargetCheck[] {
  return [
    buildClearTimeBudgetCheck(context.clearTime),
    buildRewardCurveBudgetCheck(context),
    buildStatusPressureBudgetCheck(context),
    buildDefensePressureBudgetCheck(context),
    buildHealingPressureBudgetCheck(context),
    buildBossGateBudgetCheck(context)
  ].filter((check): check is BalanceTargetCheck => check !== null);
}

function makeBudgetCheck(
  id: string,
  label: string,
  failures: string[],
  passReason: string
): BalanceTargetCheck {
  return {
    id,
    label,
    status: failures.length > 0 ? "fail" : "pass",
    reason: failures.length > 0 ? failures.join("; ") : passReason
  };
}

function buildClearTimeBudgetCheck(
  clearTime: RegionBudgetGateContext["clearTime"]
): BalanceTargetCheck {
  return makeBudgetCheck(
    "clear_time",
    "Clear Time",
    clearTime.failures,
    `${clearTime.evaluatedCount} configured stages are within clear-time targets`
  );
}

function buildClearTimeBudgetContext(
  stageResults: readonly RegionBudgetGateStageSummary[]
): RegionBudgetGateContext["clearTime"] {
  const assessments = stageResults
    .map(getStageClearTimeAssessment)
    .filter((check): check is BalanceTargetCheck => check !== null);

  return {
    evaluatedCount: assessments.length,
    failures: assessments
      .filter((assessment) => assessment.status === "fail")
      .map((assessment) => assessment.reason)
  };
}

function getStageClearTimeAssessment(
  stage: RegionBudgetGateStageSummary
): BalanceTargetCheck | null {
  if (stage.targetSeconds === undefined || stage.targetSeconds === null) {
    return null;
  }

  if (!stage.ok) {
    return {
      id: "clear_time",
      label: "Clear Time",
      status: "fail",
      reason: `${stage.stageId} could not be resolved: ${stage.reason}`
    };
  }

  return assessStageClearTimeTarget({
    stageId: stage.stageId,
    result: stage.result,
    stageCleared: stage.stageCleared,
    durationSeconds: stage.durationSeconds,
    target: {
      min: stage.targetSeconds[0],
      max: stage.targetSeconds[1]
    }
  });
}

export function buildRegionPressureMetrics(
  stageResults: readonly RegionPressureStageSummary[]
): RegionPressureMetrics {
  return stageResults.reduce(
    (summary, stage) => {
      if (!stage.ok) {
        return summary;
      }

      for (const statusId of stage.statusIds) {
        summary.statusPressure.statusIds.add(statusId);
      }

      return {
        statusPressure: {
          applications:
            summary.statusPressure.applications + stage.statusApplications,
          damage: Number(
            (summary.statusPressure.damage + stage.statusDamage).toFixed(2)
          ),
          medicineConsumed:
            summary.statusPressure.medicineConsumed + stage.medicineConsumed,
          statusIds: summary.statusPressure.statusIds
        },
        defensePressure: {
          guardAbsorbs:
            summary.defensePressure.guardAbsorbs + stage.guardAbsorbs,
          protections:
            summary.defensePressure.protections + (stage.protections ?? 0),
          armorBreaks: summary.defensePressure.armorBreaks + stage.armorBreaks,
          defensiveDamagePrevented: Number(
            (
              summary.defensePressure.defensiveDamagePrevented +
              stage.defensiveDamagePrevented
            ).toFixed(2)
          )
        },
        healingPressure: {
          heals: summary.healingPressure.heals + stage.heals,
          regenerations:
            summary.healingPressure.regenerations +
            (stage.regenerations ?? 0),
          wounds: summary.healingPressure.wounds + (stage.wounds ?? 0),
          woundUptimeSeconds: Number(
            (
              summary.healingPressure.woundUptimeSeconds +
              (stage.woundUptimeSeconds ?? 0)
            ).toFixed(2)
          ),
          cleanses: summary.healingPressure.cleanses + stage.cleanses,
          bodyIntegrityRestored: Number(
            (
              summary.healingPressure.bodyIntegrityRestored + stage.bodyIntegrityRestored
            ).toFixed(2)
          ),
          contextStabilityRestored: Number(
            (
              summary.healingPressure.contextStabilityRestored +
              (stage.contextStabilityRestored ?? 0)
            ).toFixed(2)
          ),
          overhealing: Number(
            (
              summary.healingPressure.overhealing +
              (stage.overhealing ?? 0)
            ).toFixed(2)
          ),
          recoveryPrevented: Number(
            (
              summary.healingPressure.recoveryPrevented +
              stage.recoveryPrevented
            ).toFixed(2)
          )
        }
      };
    },
    {
      statusPressure: {
        applications: 0,
        damage: 0,
        medicineConsumed: 0,
        statusIds: new Set<string>()
      },
      defensePressure: {
        guardAbsorbs: 0,
        protections: 0,
        armorBreaks: 0,
        defensiveDamagePrevented: 0
      },
      healingPressure: {
        heals: 0,
        regenerations: 0,
        wounds: 0,
        woundUptimeSeconds: 0,
        cleanses: 0,
        bodyIntegrityRestored: 0,
        contextStabilityRestored: 0,
        overhealing: 0,
        recoveryPrevented: 0
      }
    }
  );
}

function buildRewardCurveBudgetCheck(
  context: RegionBudgetGateContext
): BalanceTargetCheck | null {
  const target = context.targets?.rewardCurve;

  if (!target?.requireBestFarmRecommendation) {
    return null;
  }

  const rewardCurve = context.rewardCurve;

  if (rewardCurve === undefined) {
    return makeBudgetCheck(
      "reward_curve",
      "Reward Curve",
      ["reward curve metrics were not provided"],
      "reward curve metrics are available"
    );
  }

  const failures =
    rewardCurve.actualFarmStageId === rewardCurve.expectedFarmStageId
      ? []
      : [
          `farm recommendation ${rewardCurve.actualFarmStageId ?? "none"} does not match best configured farm ${rewardCurve.expectedFarmStageId ?? "none"}`
        ];

  return makeBudgetCheck(
    "reward_curve",
    "Reward Curve",
    failures,
    rewardCurve.expectedFarmStageId
      ? `${rewardCurve.expectedFarmStageId} is the best farm target at score ${formatNumber(rewardCurve.expectedFarmScore)}`
      : "no farm target is expected for this region state"
  );
}

function buildStatusPressureBudgetCheck(
  context: RegionBudgetGateContext
): BalanceTargetCheck | null {
  const target = context.targets?.statusPressure;

  if (target === undefined) {
    return null;
  }

  const summary = context.statusPressure;

  if (summary === undefined) {
    return makeBudgetCheck(
      "status_pressure",
      "Status Pressure",
      ["status pressure metrics were not provided"],
      "status pressure metrics are available"
    );
  }

  const statusIds = new Set(summary.statusIds);
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
    if (!statusIds.has(statusId)) {
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
  context: RegionBudgetGateContext
): BalanceTargetCheck | null {
  const target = context.targets?.defensePressure;

  if (target === undefined) {
    return null;
  }

  const events = context.defensePressure;

  if (events === undefined) {
    return makeBudgetCheck(
      "defense_pressure",
      "Defense Pressure",
      ["defense pressure metrics were not provided"],
      "defense pressure metrics are available"
    );
  }

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
  context: RegionBudgetGateContext
): BalanceTargetCheck | null {
  const target = context.targets?.healingPressure;

  if (target === undefined) {
    return null;
  }

  const events = context.healingPressure;

  if (events === undefined) {
    return makeBudgetCheck(
      "healing_pressure",
      "Healing Pressure",
      ["healing pressure metrics were not provided"],
      "healing pressure metrics are available"
    );
  }

  const failures: string[] = [];

  if (target.minHeals !== undefined && events.heals < target.minHeals) {
    failures.push(`heals ${events.heals} below minimum ${target.minHeals}`);
  }

  if (
    target.minBodyIntegrityRestored !== undefined &&
    events.bodyIntegrityRestored < target.minBodyIntegrityRestored
  ) {
    failures.push(
      `Body Integrity restored ${formatNumber(events.bodyIntegrityRestored)} below minimum ${formatNumber(target.minBodyIntegrityRestored)}`
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
    `${events.heals} heals, ${formatNumber(events.bodyIntegrityRestored)} Body Integrity restored, ${events.cleanses} cleanses within healing budget`
  );
}

function buildBossGateBudgetCheck(
  context: RegionBudgetGateContext
): BalanceTargetCheck | null {
  const target = context.targets?.bossGate;

  if (target === undefined) {
    return null;
  }

  const bossGate = context.bossGate;

  if (bossGate === undefined) {
    return makeBudgetCheck(
      "boss_gate",
      "Boss Gate",
      ["boss gate metrics were not provided"],
      "boss gate metrics are available"
    );
  }

  const failures: string[] = [];
  const baseline = bossGate.baseline;
  const trained = bossGate.trained;
  const farmed = bossGate.farmed;

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
    farmed?.ok === true &&
    farmed.farmClears !== undefined &&
    farmed.farmClears > target.maxFarmClears
  ) {
    failures.push(
      `farmed clear needs ${farmed.farmClears} farms above maximum ${target.maxFarmClears}`
    );
  }

  if (
    target.maxTrainingCost !== undefined &&
    farmed?.ok === true &&
    farmed.trainingCost !== undefined &&
    farmed.trainingCost > target.maxTrainingCost
  ) {
    failures.push(
      `farmed clear training cost ${farmed.trainingCost} above maximum ${target.maxTrainingCost}`
    );
  }

  const checkedBoss = farmed ?? trained ?? baseline;
  if (target.clearTimeSeconds !== undefined && checkedBoss !== undefined) {
    const clearTimeAssessment = assessStageClearTimeTarget({
      stageId: checkedBoss.stageId,
      result: checkedBoss.ok ? checkedBoss.result : "enemy_hold",
      stageCleared:
        checkedBoss.ok && isRegionBudgetGateStageCleared(checkedBoss),
      durationSeconds: checkedBoss.ok ? checkedBoss.durationSeconds : 0,
      target: target.clearTimeSeconds
    });

    if (clearTimeAssessment.status === "fail") {
      failures.push(clearTimeAssessment.reason);
    }
  }

  if (
    target.maxMedicineConsumed !== undefined &&
    checkedBoss?.ok === true &&
    checkedBoss.medicineConsumed > target.maxMedicineConsumed
  ) {
    failures.push(
      `boss medicine ${checkedBoss.medicineConsumed} above maximum ${target.maxMedicineConsumed}`
    );
  }

  if (
    target.maxStatusDamage !== undefined &&
    checkedBoss?.ok === true &&
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
    "boss outcomes match configured gate expectations"
  );
}

function summaryMatchesExpectedResult(
  summary: RegionBudgetGateBattleOutcome | undefined,
  expected: BalanceResultExpectation
): boolean {
  return summary?.ok === true && summary.result === expected;
}

function describeSummaryOutcome(
  summary: RegionBudgetGateBattleOutcome | undefined
): string {
  if (summary === undefined) {
    return "missing";
  }

  if (summary.ok === false) {
    return `error:${summary.reason ?? "unknown"}`;
  }

  return summary.result;
}

function formatNumber(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/\.?0+$/, "");
}
