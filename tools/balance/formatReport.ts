import type { GameBalanceReport } from "./progressionReport";

type StageSummary =
  GameBalanceReport["bambooRoadBalance"]["stageResults"][number];
type RegionSummary = GameBalanceReport["regionBalances"][number];

function formatReward(
  rewards: {
    silver: number;
    cultivation: number;
    herbs?: number;
    combatExperience: number;
  } | null | undefined
): string {
  if (!rewards) {
    return "-";
  }

  return [
    `${formatNumber(rewards.silver)} silver`,
    `${formatNumber(rewards.cultivation)} cult`,
    ...(rewards.herbs ? [`${formatNumber(rewards.herbs)} herbs`] : []),
    `${formatNumber(rewards.combatExperience)} xp`
  ].join(" / ");
}

function formatNumber(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/\.?0+$/, "");
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
      "-".padEnd(13),
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
    String(stage.aiOverloads).padStart(5),
    `g${stage.guardAbsorbs}/p${stage.protections}/a${stage.armorBreaks}`.padEnd(13),
    formation.padEnd(14),
    formatReward(stage.rewards).padEnd(28),
    formatTarget(stage).padEnd(10)
  ].join("  ");
}

function formatBossLine(stage: StageSummary): string {
  if (!stage.ok) {
    return `${stage.stageId}: ${stage.reason ?? "unknown"}`;
  }

  return `${stage.winner}${stage.stageCleared ? " clear" : " hold"} in ${stage.durationSeconds}s, ${stage.aiOverloads} AI Overloads, g${stage.guardAbsorbs}/p${stage.protections}/a${stage.armorBreaks}`;
}

function formatRegionFarmLine(region: RegionSummary): string {
  if (!region.farmRecommendation) {
    return `- ${region.regionName}: no cleared farm stage`;
  }

  const rewards = formatReward(region.farmRecommendation.rewards);
  const score =
    "score" in region.farmRecommendation
      ? `, score ${formatNumber(region.farmRecommendation.score)}`
      : "";
  const reason =
    "reason" in region.farmRecommendation
      ? `, ${region.farmRecommendation.reason}`
      : "";

  return `- ${region.regionName}: ${region.farmRecommendation.stageId} (${rewards}${score}${reason})`;
}

function formatRewardRate(rate: {
  silver: number;
  cultivation: number;
  herbs: number;
  combatExperience: number;
  farmScore: number;
}): string {
  return (
    `${formatNumber(rate.farmScore)} score/h ` +
    `(${formatNumber(rate.silver)} silver/h, ` +
    `${formatNumber(rate.cultivation)} cult/h, ` +
    `${formatNumber(rate.herbs)} herbs/h, ` +
    `${formatNumber(rate.combatExperience)} xp/h)`
  );
}

function formatRegionOfflineParityLine(region: RegionSummary): string {
  const parity = region.offlineParity;

  if (parity.stageId === null) {
    return `- ${region.regionName}: ${parity.reason}`;
  }

  if (
    parity.activeClearTimeSeconds === null ||
    parity.activeRewardsPerHour === null ||
    parity.offlineRewardsPerHour === null ||
    parity.offlineToActiveRatio === null
  ) {
    return `- ${region.regionName}: ${parity.stageId} (${parity.reason})`;
  }

  return (
    `- ${region.regionName}: ${parity.stageId} offline ` +
    `${formatNumber(parity.offlineToActiveRatio)}x active ` +
    `(active clear ${formatNumber(parity.activeClearTimeSeconds)}s; ` +
    `active ${formatRewardRate(parity.activeRewardsPerHour)}; ` +
    `offline ${formatRewardRate(parity.offlineRewardsPerHour)}; ` +
    `estimate ${formatNumber(parity.offlineEffectiveClearTimeSeconds)}s @ ` +
    `${formatNumber(parity.offlineEfficiency * 100)}%; ` +
    `${parity.classification}; ${parity.status})`
  );
}

function formatRegionDistrictHeatLine(region: RegionSummary): string {
  const projection = region.districtHeatProjection;
  const route = projection.affectedRouteId ?? "no route";
  const clearTime =
    projection.clearTimeSeconds === null
      ? "clear n/a"
      : `clear ${formatNumber(projection.clearTimeSeconds)}s`;
  const windowMinutes = formatNumber(projection.elapsedSeconds / 60);

  return (
    `- ${region.regionName}: ${projection.heatBand} ` +
    `${formatNumber(projection.projectedHeat)}/100 from ` +
    `${projection.activityCount} ${projection.activityType} clears on ` +
    `${route} over ${windowMinutes}m (${clearTime}; ` +
    `${projection.gainReason}; ${projection.decayReason})`
  );
}

function formatDistrictHeatPromotionDecisionLine(
  report: GameBalanceReport
): string[] {
  const decision = report.districtHeatPromotionDecision;
  const boundaryText = [
    `save ${decision.boundaries.save}`,
    `cloud ${decision.boundaries.cloud}`,
    `web ${decision.boundaries.webUi}`,
    `compact ${decision.boundaries.compactExport}`,
    `tactic ${decision.boundaries.tacticExport}`,
    `rewards ${decision.boundaries.liveRewards}`
  ].join("; ");
  const gateText = decision.gates
    .map((gate) => `${gate.id} ${gate.status}`)
    .join("; ");

  return [
    `- posture: ${decision.posture}`,
    `- summary: ${decision.summary}`,
    `- next: ${decision.nextAction}`,
    `- boundaries: ${boundaryText}`,
    `- gates: ${gateText}`
  ];
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
  const farmed = region.bossGate.farmed
    ? [
        `, farmed ${formatBossLine(region.bossGate.farmed)}`,
        `after ${region.bossGate.farmed.farmClears}`,
        `${region.bossGate.farmed.farmStageId ?? "region"} farms`,
        `and ${region.bossGate.farmed.trainingCost} silver training`
      ].join(" ")
    : "";

  return `- ${region.regionName}: baseline ${formatBossLine(region.bossGate.baseline)}${trained}${farmed}`;
}

function formatRegionDifficultyLine(region: RegionSummary): string {
  const curve = region.difficultyCurve;
  const summary = curve.summary;
  const trend =
    summary.firstClearStageId && summary.lastClearStageId
      ? `${summary.clearCount} clears from ${summary.firstClearStageId} ${formatNumber(
          summary.firstClearSeconds ?? 0
        )}s to ${summary.lastClearStageId} ${formatNumber(
          summary.lastClearSeconds ?? 0
        )}s, max ${summary.maxClearStageId} ${formatNumber(
          summary.maxClearSeconds ?? 0
        )}s`
      : "no player clears";
  const resultCounts = [
    `${summary.holdCount} holds`,
    `${summary.unresolvedCount} unresolved`
  ].join(", ");
  const issues =
    curve.issues.length === 0
      ? "none"
      : curve.issues
          .map((issue) => `${issue.stageId}: ${issue.reason}`)
          .join("; ");
  const spikes =
    curve.spikes.length === 0
      ? "none"
      : curve.spikes
          .map(
            (spike) =>
              `${spike.status} ${spike.stageId} +${formatNumber(
                spike.durationDeltaSeconds
              )}s vs ${spike.previousStageId} (${formatNumber(
                spike.ratio
              )}x)`
          )
          .join("; ");

  return `- ${region.regionName}: trend ${trend}; results ${resultCounts}; issues ${issues}; spikes ${spikes}`;
}

function formatRegionBossGateAssumptionLine(region: RegionSummary): string {
  const assumptions = region.bossGateAssumptions.map((assumption) => {
    const result = assumption.ok
      ? `${assumption.result} in ${formatNumber(assumption.durationSeconds)}s`
      : `unresolved (${assumption.reason})`;
    const target = assumption.targetSeconds
      ? `, target ${assumption.targetSeconds[0]}-${assumption.targetSeconds[1]}s ${
          assumption.targetMet ? "ok" : "miss"
        }`
      : "";
    const farms =
      assumption.farmClears === null
        ? ""
        : `, farms ${assumption.farmClears} ${
            assumption.farmStageId ?? "region"
          }`;
    const training =
      assumption.trainingCost === null
        ? ", training n/a"
        : `, training ${formatNumber(assumption.trainingCost)} silver`;

    return (
      `${assumption.scenario} ${result}${target}, ` +
      `medicine ${assumption.medicineConsumed}, ` +
      `status damage ${formatNumber(assumption.statusDamage)}` +
      `${farms}${training}`
    );
  });

  return `- ${region.regionName}: ${assumptions.join("; ")}`;
}

function formatRegionBudgetGateLine(region: RegionSummary): string {
  const failedChecks = region.budgetChecks.filter(
    (check) => check.status === "fail"
  );

  if (failedChecks.length === 0) {
    return `- ${region.regionName}: pass (${region.budgetChecks.length} checks)`;
  }

  return `- ${region.regionName}: miss ${failedChecks
    .map((check) => `${check.label}: ${check.reason}`)
    .join("; ")}`;
}

function formatRegionDefensiveEventLine(region: RegionSummary): string {
  const events = region.defensiveEvents;

  return `- ${region.regionName}: g${events.guardAbsorbs}/p${events.protections}/a${events.armorBreaks}, ${events.defensiveDamagePrevented} damage prevented`;
}

function formatRegionRecoveryEventLine(region: RegionSummary): string {
  const events = region.recoveryEvents;

  return (
    `- ${region.regionName}: ${events.heals} heals/regen ticks, ` +
    `${events.bodyIntegrityRestored} Body Integrity and ${events.contextStabilityRestored} Context Stability restored, ` +
    `${events.overhealing} overheal, ${events.recoveryPrevented} recovery denied, ` +
    `${events.wounds} wounds, ${events.woundUptimeSeconds}s wound uptime, ` +
    `${events.cleanses} cleanses`
  );
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
    "ovld".padStart(5),
    "defense".padEnd(13),
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

export function formatBalanceReport(report: GameBalanceReport): string {
  const balance = report.bambooRoadBalance;
  const firstMastery = balance.upgradeEconomy.firstMastery;
  const trainingEconomy = balance.bossGate.economy.trainingEconomy;
  const trainingLine = trainingEconomy.ok
    ? `${trainingEconomy.farmClears} ${trainingEconomy.farmStageId} farms, ${trainingEconomy.trainingCost} silver`
    : `not affordable: ${trainingEconomy.reason}`;

  return [
    "Path of Neon Balance Report",
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
    "Offline Parity Report",
    ...report.regionBalances.map(formatRegionOfflineParityLine),
    "",
    "District Heat Projection",
    ...report.regionBalances.map(formatRegionDistrictHeatLine),
    "",
    "District Heat Promotion Decision",
    ...formatDistrictHeatPromotionDecisionLine(report),
    "",
    "Region Mastery Milestones",
    ...report.regionBalances.map(formatRegionMasteryLine),
    "",
    "Region Difficulty Curve",
    ...report.regionBalances.map(formatRegionDifficultyLine),
    "",
    "Region Boss Gates",
    ...report.regionBalances.map(formatRegionBossGateLine),
    "",
    "Region Boss Gate Assumptions",
    ...report.regionBalances.map(formatRegionBossGateAssumptionLine),
    "",
    "Region Budget Gates",
    ...report.regionBalances.map(formatRegionBudgetGateLine),
    "",
    "Region Defensive Events",
    ...report.regionBalances.map(formatRegionDefensiveEventLine),
    "",
    "Region Recovery Events",
    ...report.regionBalances.map(formatRegionRecoveryEventLine),
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
    "Run `npm run simulate -- --json` for full metrics, or `npm run --silent simulate -- --export-json` / `--csv` for clean export stdout."
  ].join("\n");
}
