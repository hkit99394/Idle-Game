import type { GameBalanceReport } from "./progressionReport";

type RegionSummary = GameBalanceReport["regionBalances"][number];
type StageSummary = RegionSummary["stageResults"][number];

export const BALANCE_EXPORT_SCHEMA_VERSION = 1;

export const BALANCE_STAGE_EXPORT_CSV_HEADERS = [
  "region_id",
  "region_name",
  "stage_id",
  "stage_name",
  "stage_index",
  "enemy_ids",
  "enemy_types",
  "result",
  "duration_seconds",
  "target_min_seconds",
  "target_max_seconds",
  "target_status",
  "clear_time_reason",
  "difficulty_issue",
  "difficulty_spike_status",
  "difficulty_spike_reason",
  "reward_silver",
  "reward_cultivation",
  "reward_herbs",
  "reward_combat_experience",
  "farm_recommendation",
  "farm_score",
  "farm_reason",
  "status_applications",
  "status_damage",
  "medicine_consumed",
  "guard_absorbs",
  "protections",
  "armor_breaks",
  "heals",
  "cleanses",
  "defensive_damage_prevented",
  "recovery_prevented"
] as const;

type BalanceStageExportRow = ReturnType<typeof buildStageExportRow>;

function toExportNumber(value: number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value.toFixed(2));
}

function getTargetStatus(stage: StageSummary): string {
  if (!stage.ok) {
    return "unresolved";
  }

  if (!stage.targetSeconds) {
    return "untargeted";
  }

  return stage.targetMet ? "pass" : "fail";
}

function getStageResult(stage: StageSummary): string {
  if (!stage.ok) {
    return "unresolved";
  }

  return stage.result;
}

function getDurationSeconds(stage: StageSummary): number | null {
  return stage.ok ? toExportNumber(stage.durationSeconds) : null;
}

function getClearTimeReason(stage: StageSummary): string {
  return stage.ok
    ? stage.clearTimeAssessment.reason
    : stage.reason ?? "unknown";
}

function buildStageExportRow(region: RegionSummary, stage: StageSummary) {
  const difficultyIssue = region.difficultyCurve.issues.find(
    (issue) => issue.stageId === stage.stageId
  );
  const difficultySpike = region.difficultyCurve.spikes.find(
    (spike) => spike.stageId === stage.stageId
  );
  const isFarmRecommendation =
    region.farmRecommendation?.stageId === stage.stageId;
  const rewards = stage.ok ? stage.rewards : null;

  return {
    regionId: region.regionId,
    regionName: region.regionName,
    stageId: stage.stageId,
    stageName: stage.name,
    stageIndex: stage.ok ? stage.index : null,
    enemyIds: stage.enemyIds,
    enemyTypes: stage.enemyTypes,
    result: getStageResult(stage),
    durationSeconds: getDurationSeconds(stage),
    targetMinSeconds: stage.targetSeconds?.[0] ?? null,
    targetMaxSeconds: stage.targetSeconds?.[1] ?? null,
    targetStatus: getTargetStatus(stage),
    clearTimeReason: getClearTimeReason(stage),
    difficultyIssue: difficultyIssue?.reason ?? null,
    difficultySpikeStatus: difficultySpike?.status ?? null,
    difficultySpikeReason: difficultySpike?.reason ?? null,
    rewards: {
      silver: toExportNumber(rewards?.silver),
      cultivation: toExportNumber(rewards?.cultivation),
      herbs: toExportNumber(rewards?.herbs),
      combatExperience: toExportNumber(rewards?.combatExperience)
    },
    farmRecommendation: isFarmRecommendation,
    farmScore: isFarmRecommendation
      ? region.farmRecommendation?.score ?? null
      : null,
    farmReason: isFarmRecommendation
      ? region.farmRecommendation?.reason ?? null
      : null,
    pressure: {
      statusApplications: stage.statusApplications,
      statusDamage: toExportNumber(stage.statusDamage),
      medicineConsumed: stage.medicineConsumed,
      guardAbsorbs: stage.ok ? stage.guardAbsorbs : null,
      protections: stage.ok ? stage.protections : null,
      armorBreaks: stage.ok ? stage.armorBreaks : null,
      heals: stage.ok ? stage.heals : null,
      cleanses: stage.ok ? stage.cleanses : null,
      defensiveDamagePrevented: stage.ok
        ? toExportNumber(stage.defensiveDamagePrevented)
        : null,
      recoveryPrevented: stage.ok ? toExportNumber(stage.recoveryPrevented) : null
    }
  };
}

function buildRegionExport(region: RegionSummary) {
  const statusApplications = region.stageResults.reduce(
    (total, stage) => total + stage.statusApplications,
    0
  );
  const statusDamage = region.stageResults.reduce(
    (total, stage) => total + stage.statusDamage,
    0
  );
  const medicineConsumed = region.stageResults.reduce(
    (total, stage) => total + stage.medicineConsumed,
    0
  );

  return {
    regionId: region.regionId,
    regionName: region.regionName,
    stageCount: region.stageResults.length,
    difficulty: region.difficultyCurve.summary,
    difficultyIssueCount: region.difficultyCurve.issues.length,
    difficultySpikeCount: region.difficultyCurve.spikes.length,
    farmRecommendation: region.farmRecommendation
      ? {
          stageId: region.farmRecommendation.stageId,
          score: region.farmRecommendation.score,
          scoreBreakdown: region.farmRecommendation.scoreBreakdown,
          reason: region.farmRecommendation.reason
        }
      : null,
    masteryMilestone: region.masteryMilestone,
    pressure: {
      statusApplications,
      statusDamage: toExportNumber(statusDamage),
      medicineConsumed,
      guardAbsorbs: region.defensiveEvents.guardAbsorbs,
      protections: region.defensiveEvents.protections,
      armorBreaks: region.defensiveEvents.armorBreaks,
      defensiveDamagePrevented: toExportNumber(
        region.defensiveEvents.defensiveDamagePrevented
      ),
      heals: region.recoveryEvents.heals,
      cleanses: region.recoveryEvents.cleanses,
      recoveryPrevented: toExportNumber(region.recoveryEvents.recoveryPrevented)
    }
  };
}

function buildBudgetCheckExport(region: RegionSummary) {
  return region.budgetChecks.map((check) => ({
    regionId: region.regionId,
    regionName: region.regionName,
    checkId: check.id,
    label: check.label,
    status: check.status,
    reason: check.reason
  }));
}

function buildBossGateExport(region: RegionSummary) {
  return region.bossGateAssumptions.map((assumption) => ({
    regionId: region.regionId,
    regionName: region.regionName,
    scenario: assumption.scenario,
    stageId: assumption.stageId,
    result: assumption.result,
    durationSeconds: toExportNumber(assumption.durationSeconds),
    targetMinSeconds: assumption.targetSeconds?.[0] ?? null,
    targetMaxSeconds: assumption.targetSeconds?.[1] ?? null,
    targetStatus: assumption.targetSeconds
      ? assumption.targetMet
        ? "pass"
        : "fail"
      : "untargeted",
    medicineConsumed: assumption.medicineConsumed,
    statusDamage: toExportNumber(assumption.statusDamage),
    farmStageId: assumption.farmStageId,
    farmClears: assumption.farmClears,
    trainingCost: assumption.trainingCost,
    reason: assumption.reason
  }));
}

export function buildBalanceAuthoringExport(report: GameBalanceReport) {
  const regions = report.regionBalances.map(buildRegionExport);
  const stages = report.regionBalances.flatMap((region) =>
    region.stageResults.map((stage) => buildStageExportRow(region, stage))
  );
  const budgetChecks = report.regionBalances.flatMap(buildBudgetCheckExport);
  const bossGateAssumptions = report.regionBalances.flatMap(buildBossGateExport);

  return {
    schemaVersion: BALANCE_EXPORT_SCHEMA_VERSION,
    regions,
    stages,
    budgetChecks,
    bossGateAssumptions
  };
}

function toCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const text = Array.isArray(value) ? value.join("|") : String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

function stageRowToCsvCells(row: BalanceStageExportRow): unknown[] {
  return [
    row.regionId,
    row.regionName,
    row.stageId,
    row.stageName,
    row.stageIndex,
    row.enemyIds,
    row.enemyTypes,
    row.result,
    row.durationSeconds,
    row.targetMinSeconds,
    row.targetMaxSeconds,
    row.targetStatus,
    row.clearTimeReason,
    row.difficultyIssue,
    row.difficultySpikeStatus,
    row.difficultySpikeReason,
    row.rewards.silver,
    row.rewards.cultivation,
    row.rewards.herbs,
    row.rewards.combatExperience,
    row.farmRecommendation,
    row.farmScore,
    row.farmReason,
    row.pressure.statusApplications,
    row.pressure.statusDamage,
    row.pressure.medicineConsumed,
    row.pressure.guardAbsorbs,
    row.pressure.protections,
    row.pressure.armorBreaks,
    row.pressure.heals,
    row.pressure.cleanses,
    row.pressure.defensiveDamagePrevented,
    row.pressure.recoveryPrevented
  ];
}

export function formatBalanceStageExportCsv(report: GameBalanceReport): string {
  const exportReport = buildBalanceAuthoringExport(report);
  const lines = [
    BALANCE_STAGE_EXPORT_CSV_HEADERS.join(","),
    ...exportReport.stages.map((row) =>
      stageRowToCsvCells(row).map(toCsvCell).join(",")
    )
  ];

  return lines.join("\n");
}
