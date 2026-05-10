import type { BalanceReport, BalanceScenarioReport, RegionBalanceReport } from "./balanceTypes";

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
          `farm ${region.farmRecommendation.stageId} score ${formatNumber(region.farmRecommendation.score)} (${region.farmRecommendation.reason})`
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

function getScenarioRegion(
  scenario: BalanceScenarioReport,
  regionId: string
): RegionBalanceReport | undefined {
  return scenario.regions.find((region) => region.regionId === regionId);
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}
