import { describe, expect, it } from "vitest";
import {
  buildBalanceReport,
  defaultAutoMedicinePreferences,
  defaultBalanceScenarioPresets,
  formatBalanceReport,
  getStageStatusPressureIds,
  resolveStageBattle
} from "../../core";
import type { StaticGameData } from "../../core";
import {
  createStatusPressureProgress,
  createStatusPressureScenarioData
} from "../helpers/statusScenarios";
import { staticData } from "../helpers/staticData";

function getUniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort();
}

describe("balance report", () => {
  it("includes every configured region and stage in region order", () => {
    const report = buildBalanceReport(staticData);

    expect(report.regions.map((region) => region.regionId)).toEqual(
      staticData.regions.map((region) => region.id)
    );
    expect(report.totals.stages).toBe(staticData.stages.length);
    expect(
      report.regions
        .flatMap((region) => region.stages)
        .map((stage) => stage.stageId)
    ).toEqual(staticData.regions.flatMap((region) => region.stageIds));
    expect(report.scenarios.map((scenario) => scenario.scenarioId)).toEqual([
      "baseline",
      "resistance",
      "medicine",
      "combined"
    ]);
    for (const scenario of report.scenarios) {
      expect(scenario.regions.map((region) => region.regionId)).toEqual(
        staticData.regions.map((region) => region.id)
      );
      expect(scenario.totals.stages).toBe(staticData.stages.length);
    }
  });

  it("fails loudly when a configured region references a missing stage", () => {
    const invalidData: StaticGameData = {
      ...staticData,
      regions: staticData.regions.map((region) =>
        region.id === "demon_cult_outpost"
          ? {
              ...region,
              stageIds: [...region.stageIds, "missing_stage"]
            }
          : region
      )
    };

    expect(() => buildBalanceReport(invalidData)).toThrow(
      "Region demon_cult_outpost references missing stage missing_stage"
    );
  });

  it("reports nonzero Demon Cult status pressure and farm recommendation", () => {
    const report = buildBalanceReport(staticData);
    const demonCult = report.regions.find(
      (region) => region.regionId === "demon_cult_outpost"
    );

    expect(demonCult).toBeDefined();
    if (demonCult === undefined) {
      return;
    }

    expect(
      demonCult.stages.reduce(
        (total, stage) => total + stage.statusMetrics.applications,
        0
      )
    ).toBeGreaterThan(0);
    expect(
      demonCult.stages.reduce(
        (total, stage) => total + stage.statusMetrics.expectedDamage,
        0
      )
    ).toBeGreaterThan(0);
    expect(demonCult.farmRecommendation?.stageId).toBe("demon_cult_outpost_6");
    expect(demonCult.farmRecommendation).toMatchObject({
      score: 4159,
      scoreBreakdown: {
        combatExperience: 1224,
        silver: 1620,
        cultivation: 1215,
        herbs: 100,
        total: 4159
      },
      reason: expect.stringContaining("highest weighted farm score")
    });
    expect(demonCult.bossGate).toMatchObject({
      stageId: "demon_cult_outpost_7"
    });
  });

  it("estimates cleanse coverage by status dispel tags", () => {
    const report = buildBalanceReport({
      ...staticData,
      medicines: [
        {
          id: "inner_calm_tablet",
          name: "Inner Calm Tablet",
          unlock: {
            type: "stage_cleared",
            stageId: "bamboo_road_5"
          },
          maxCarry: 5,
          effects: [
            {
              type: "cleanse_status",
              dispelTags: ["inner"],
              maxCount: 1
            }
          ]
        }
      ]
    });
    const medicineScenario = report.scenarios.find(
      (scenario) => scenario.scenarioId === "medicine"
    );
    const qiSuppressionStage = medicineScenario?.regions
      .flatMap((region) => region.stages)
      .find((stage) => stage.statusMetrics.statusIds.includes("qi_suppression"));

    expect(qiSuppressionStage).toBeDefined();
    expect(qiSuppressionStage?.statusMetrics.cleanses).toBeGreaterThan(0);
    expect(qiSuppressionStage?.statusMetrics.medicineConsumed).toBe(1);
  });

  it("reports scenario totals for resistance, medicine, and boss gate checks", () => {
    const report = buildBalanceReport(staticData);
    const baseline = getScenario(report, "baseline");
    const resistance = getScenario(report, "resistance");
    const medicine = getScenario(report, "medicine");
    const combined = getScenario(report, "combined");
    const baselineDemonBoss = getDemonCultBoss(baseline);
    const resistanceDemonBoss = getDemonCultBoss(resistance);
    const medicineDemonBoss = getDemonCultBoss(medicine);
    const combinedDemonBoss = getDemonCultBoss(combined);

    expect(resistance.totals.statusApplications).toBeLessThan(
      baseline.totals.statusApplications
    );
    expect(resistance.totals.reducedTickDamage).toBeGreaterThan(0);
    expect(medicine.totals.medicineConsumed).toBeGreaterThan(0);
    expect(medicine.totals.cleanses).toBeGreaterThan(0);
    expect(combined.totals.statusDurationSeconds).toBeLessThan(
      baseline.totals.statusDurationSeconds
    );
    expect(baselineDemonBoss.result).toBe("enemy_hold");
    expect(resistanceDemonBoss.rating).toBe("fail");
    expect(medicineDemonBoss.rating).toBe("fail");
    expect(combinedDemonBoss.survivalRatio).toBeGreaterThan(
      baselineDemonBoss.survivalRatio
    );
    expect(report.demonCultBossGate).toMatchObject({
      stageId: "demon_cult_outpost_7",
      baselineScenarioId: "baseline",
      intendedScenarioId: "combined",
      pass: true
    });
    expect(report.demonCultBossGate?.criteria).toMatchObject({
      intendedNearSurvivalRatio: 0.9,
      preferredClearTimeSeconds: {
        min: 90,
        max: 120
      },
      acceptableClearTimeSeconds: {
        min: 80,
        max: 140
      }
    });
    expect(report.demonCultBossGate?.estimatedClearTimeSeconds).toBeGreaterThanOrEqual(80);
    expect(report.demonCultBossGate?.estimatedClearTimeSeconds).toBeLessThanOrEqual(140);
    expect(report.demonCultBossGate?.medicineConsumed).toBeLessThanOrEqual(4);
    expect(report.demonCultBossGate?.statusDamage).toBeLessThanOrEqual(600);
    expect(report.demonCultBossGate?.reasons).toEqual(
      expect.arrayContaining([
        "baseline remains blocked",
        expect.stringContaining("combined survival ratio"),
        expect.stringContaining("combined clear time"),
        expect.stringContaining("medicine use"),
        expect.stringContaining("status damage")
      ])
    );
  });

  it("keeps Demon Cult boss balance status pressure aligned with combat helpers", () => {
    const report = buildBalanceReport(staticData);
    const combined = getScenario(report, "combined");
    const combinedDemonBoss = getDemonCultBoss(combined);
    const combinedDemonBossStage = combined.regions
      .flatMap((region) => region.stages)
      .find((stage) => stage.stageId === combinedDemonBoss.stageId);
    const bossStage = staticData.stages.find(
      (stage) => stage.id === combinedDemonBoss.stageId
    );

    expect(bossStage).toBeDefined();
    expect(combinedDemonBossStage).toBeDefined();
    if (bossStage === undefined || combinedDemonBossStage === undefined) {
      return;
    }

    expect(combinedDemonBossStage.statusMetrics.statusIds).toEqual(
      getStageStatusPressureIds({
        stage: bossStage,
        enemies: staticData.enemies,
        skills: staticData.skills
      })
    );
    expect(combinedDemonBossStage.statusMetrics.medicineConsumed).toBe(
      report.demonCultBossGate?.medicineConsumed
    );
  });

  it("keeps status-heavy balance status ids aligned with actual stage battles", () => {
    const stageId = "balance_status_parity_stage";
    const heroId = "balance_status_parity_patient";
    const enemyId = "balance_status_parity_enemy";
    const skillId = "balance_status_parity_pressure";
    const data = createStatusPressureScenarioData({
      stageId,
      heroId,
      enemyId,
      skillId,
      heroName: "Balance Status Patient",
      enemyName: "Balance Status Enemy",
      enemyFamily: "demon_cult",
      enemyCombatRole: "breaker",
      heroStats: {
        maxOuterHp: 3000
      },
      statusEffects: [{ statusId: "poison" }, { statusId: "qi_suppression" }],
      stageName: "Balance Status Parity Stage",
      stageRegionId: "balance_status_parity_region",
      region: {
        name: "Balance Status Parity Region",
        balanceTargets: {
          clearTimeSeconds: {
            normal: { min: 0, max: 30 },
            elite: { min: 0, max: 30 }
          },
          statusPressure: {
            minApplications: 1,
            expectedStatusIds: ["poison", "qi_suppression"]
          }
        }
      }
    });
    const report = buildBalanceReport(data);
    const reportedStage = report.regions
      .find((region) => region.regionId === "balance_status_parity_region")
      ?.stages.find((stage) => stage.stageId === stageId);
    const progress = createStatusPressureProgress(data, {
      stageId,
      heroId
    });
    const actual = resolveStageBattle(data, {
      progress,
      stageId,
      maxDurationSeconds: 10,
      autoMedicinePreferences: {
        ...defaultAutoMedicinePreferences,
        enabled: false
      }
    });

    expect(reportedStage).toBeDefined();
    expect(actual.ok).toBe(true);
    if (reportedStage === undefined || !actual.ok) {
      return;
    }

    const actualStatusIds = getUniqueSorted(
      actual.battle.events.flatMap((event) =>
        event.type === "status_apply" ? [event.statusId] : []
      )
    );
    const actualTickDamage = actual.battle.events.reduce(
      (total, event) =>
        event.type === "status_tick" ? total + event.outerDamage : total,
      0
    );

    expect(reportedStage.statusMetrics.statusIds).toEqual([
      "poison",
      "qi_suppression"
    ]);
    expect(actualStatusIds).toEqual(reportedStage.statusMetrics.statusIds);
    expect(reportedStage.statusMetrics.applications).toBeGreaterThan(0);
    expect(reportedStage.statusMetrics.expectedDamage).toBeGreaterThan(0);
    expect(actualTickDamage).toBeGreaterThan(0);
  });

  it("flags Demon Cult boss clear time outside the acceptable tuning band", () => {
    const slowData: StaticGameData = {
      ...staticData,
      enemies: staticData.enemies.map((enemy) =>
        enemy.id === "demon_cult_overseer"
          ? {
              ...enemy,
              baseStats: {
                ...enemy.baseStats,
                maxOuterHp: enemy.baseStats.maxOuterHp * 1.4,
                outerAttack: enemy.baseStats.outerAttack * 0.4,
                innerAttack: enemy.baseStats.innerAttack * 0.4
              }
            }
          : enemy
      )
    };
    const report = buildBalanceReport(slowData);

    expect(report.demonCultBossGate?.pass).toBe(false);
    expect(report.demonCultBossGate?.failureReason).toContain(
      "combined clear time"
    );
  });

  it("fails loudly when required scenario presets are missing", () => {
    expect(() =>
      buildBalanceReport(staticData, {
        scenarios: defaultBalanceScenarioPresets.filter(
          (scenario) => scenario.id !== "combined"
        )
      })
    ).toThrow("Missing balance scenario combined");
  });

  it("formats readable CLI text and JSON-ready status summaries", () => {
    const report = buildBalanceReport(staticData);
    const text = formatBalanceReport(report);

    expect(text).toContain("Demon Cult Outpost");
    expect(text).toContain("Scenario Summary");
    expect(text).toContain("combined");
    expect(text).toContain("demon_cult_outpost_7");
    expect(text).toContain("highest weighted farm score");
    expect(report.totals.statusApplications).toBeGreaterThan(0);
    const json = JSON.parse(JSON.stringify(report));

    expect(json.scenarios[0]).toMatchObject({
      scenarioId: "baseline",
      totals: {
        stages: staticData.stages.length
      }
    });
    expect(json.totals).toMatchObject({
      stages: staticData.stages.length
    });
    expect(json.regions[0].farmRecommendation).toMatchObject({
      scoreBreakdown: {
        total: expect.any(Number)
      },
      reason: expect.any(String)
    });
  });
});

function getScenario(
  report: ReturnType<typeof buildBalanceReport>,
  scenarioId: string
) {
  const scenario = report.scenarios.find(
    (candidate) => candidate.scenarioId === scenarioId
  );

  if (scenario === undefined) {
    throw new Error(`Missing test scenario ${scenarioId}`);
  }

  return scenario;
}

function getDemonCultBoss(
  scenario: ReturnType<typeof buildBalanceReport>["scenarios"][number]
) {
  const boss = scenario.regions
    .find((region) => region.regionId === "demon_cult_outpost")
    ?.bossGate;

  if (boss == null) {
    throw new Error(`Missing Demon Cult boss for ${scenario.scenarioId}`);
  }

  return boss;
}
