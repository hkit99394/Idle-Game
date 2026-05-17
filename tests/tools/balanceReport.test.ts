import { describe, expect, it } from "vitest";
import {
  DISTRICT_HEAT_REPORT_WINDOW_SECONDS,
  buildBalanceReport,
  projectDistrictHeat,
  type StaticGameData
} from "../../core";
import {
  BALANCE_EXPORT_SCHEMA_VERSION,
  BALANCE_STAGE_EXPORT_CSV_HEADERS,
  BAMBOO_ROAD_REGION_ID,
  BLACK_IRON_FORT_REGION_ID,
  LOTUS_MONASTERY_REGION_ID,
  MIST_VALLEY_REGION_ID,
  TACTIC_COMPARISON_EXPORT_SCHEMA_VERSION,
  TACTIC_COMPARISON_CSV_HEADERS,
  buildBalanceAuthoringExport,
  buildGameBalanceReport,
  buildTacticComparisonExport,
  buildTacticComparisonReport,
  formatBalanceStageExportCsv,
  formatBalanceReport,
  formatTacticComparisonCsv
} from "../../tools/balanceReport";
import { findDistrictAttentionBoundaryTokens } from "../helpers/districtAttentionBoundary";
import { staticData } from "../helpers/staticData";

describe("balance report", () => {
  it("builds Greenline Approach results from region stage order", () => {
    const report = buildGameBalanceReport(staticData);
    const bambooRoad = staticData.regions.find(
      (region) => region.id === BAMBOO_ROAD_REGION_ID
    );

    expect(bambooRoad).toBeDefined();
    if (!bambooRoad) {
      return;
    }

    expect(
      report.bambooRoadBalance.stageResults.map((stage) => stage.stageId)
    ).toEqual(bambooRoad.stageIds);
    expect(report.bambooRoadBalance.farmRecommendation).toMatchObject({
      stageId: "greenline_approach_8",
      score: 157,
      scoreBreakdown: {
        combatExperience: 80,
        silver: 44,
        cultivation: 33,
        herbs: 0,
        total: 157
      },
      rewardPriority: ["combatExperience", "silver", "cultivation"],
      reason: expect.stringContaining("weighted score 157")
    });
    expect(report.bambooRoadBalance.masteryMilestone).toMatchObject({
      threshold: 100,
      farmStageId: "greenline_approach_8"
    });
    expect(
      report.bambooRoadBalance.bossGate.economy.trainingEconomy
    ).toMatchObject({
      ok: true,
      farmStageId: "greenline_approach_8"
    });
    expect(report.bambooRoadBalance.bossGate.trained).toMatchObject({
      ok: true,
      winner: "player",
      stageCleared: true
    });
    expect(report.bambooRoadBalance.stageResults[0]).toMatchObject({
      enemyFormationSlots: ["front", "middle"]
    });
    expect(report.bambooRoadBalance.formationScenarios).toEqual({
      firstLivingFrontlineTargetId: "front_cutter",
      highestCpBacklineTargetId: "back_threat"
    });
  });

  it("includes Veil District results from the region stage order", () => {
    const report = buildGameBalanceReport(staticData);
    const mistValley = staticData.regions.find(
      (region) => region.id === MIST_VALLEY_REGION_ID
    );

    expect(mistValley).toBeDefined();
    if (!mistValley) {
      return;
    }

    const mistValleyBalance = report.regionBalances.find(
      (region) => region.regionId === MIST_VALLEY_REGION_ID
    );

    expect(mistValleyBalance).toBeDefined();
    if (!mistValleyBalance) {
      return;
    }

    expect(mistValleyBalance.regionName).toBe("Veil District");
    expect(
      mistValleyBalance.stageResults.map((stage) => stage.stageId)
    ).toEqual(mistValley.stageIds);
    expect(mistValleyBalance.stageResults[0]).toMatchObject({
      ok: true,
      winner: "player",
      stageCleared: true,
      enemyTypes: ["normal", "normal"],
      enemyFormationSlots: ["front", "middle"]
    });
    expect(mistValleyBalance.stageResults.at(-1)).toMatchObject({
      stageId: "veil_district_6"
    });
    expect(mistValleyBalance.farmRecommendation).toMatchObject({
      stageId: "veil_district_5",
      reason: expect.stringContaining("combatExperience")
    });
    expect(mistValleyBalance.bossGate.baseline).toMatchObject({
      stageId: "veil_district_6",
      ok: true,
      winner: "player"
    });
  });

  it("excludes boss and non-farmable stages from farm recommendations", () => {
    const data = {
      ...staticData,
      stages: staticData.stages.map((stage) => {
        if (stage.id === "greenline_approach_8") {
          return {
            ...stage,
            canFarmOffline: false
          };
        }

        if (stage.id === "greenline_approach_10") {
          return {
            ...stage,
            canFarmOffline: true,
            rewards: {
              silver: 9999,
              cultivation: 9999,
              combatExperience: 9999
            }
          };
        }

        return stage;
      })
    } as StaticGameData;
    const report = buildGameBalanceReport(data);

    expect(report.bambooRoadBalance.farmRecommendation).toMatchObject({
      stageId: "greenline_approach_5"
    });
  });

  it("includes Black Iron Foundry as a defensive post-Mist region", () => {
    const report = buildGameBalanceReport(staticData);
    const blackIronFort = staticData.regions.find(
      (region) => region.id === BLACK_IRON_FORT_REGION_ID
    );

    expect(blackIronFort).toBeDefined();
    if (!blackIronFort) {
      return;
    }

    const blackIronBalance = report.regionBalances.find(
      (region) => region.regionId === BLACK_IRON_FORT_REGION_ID
    );

    expect(blackIronBalance).toBeDefined();
    if (!blackIronBalance) {
      return;
    }

    expect(blackIronBalance.regionName).toBe("Black Iron Foundry");
    expect(
      blackIronBalance.stageResults.map((stage) => stage.stageId)
    ).toEqual(blackIronFort.stageIds);
    expect(blackIronBalance.stageResults[0]).toMatchObject({
      ok: true,
      winner: "player",
      stageCleared: true,
      enemyTypes: ["normal", "normal"],
      enemyFormationSlots: ["middle", "front"]
    });
    expect(blackIronBalance.stageResults.at(-1)).toMatchObject({
      stageId: "black_iron_foundry_7"
    });
    expect(blackIronBalance.farmRecommendation).toMatchObject({
      stageId: "black_iron_foundry_6"
    });
    expect(blackIronBalance.defensiveEvents).toMatchObject({
      guardAbsorbs: expect.any(Number),
      protections: expect.any(Number),
      armorBreaks: expect.any(Number),
      defensiveDamagePrevented: expect.any(Number)
    });
    expect(blackIronBalance.defensiveEvents.guardAbsorbs).toBeGreaterThan(0);
    expect(blackIronBalance.defensiveEvents.armorBreaks).toBeGreaterThan(0);
    expect(
      blackIronBalance.stageResults.some((stage) => {
        if (!stage.ok) {
          return false;
        }

        const defensiveStage = stage as typeof stage & {
          guardAbsorbs: number;
          armorBreaks: number;
        };

        return defensiveStage.guardAbsorbs > 0 && defensiveStage.armorBreaks > 0;
      })
    ).toBe(true);
    expect(blackIronBalance.bossGate.baseline).toMatchObject({
      stageId: "black_iron_foundry_7",
      ok: true,
      winner: "enemy"
    });
    expect(blackIronBalance.bossGate.farmed).toMatchObject({
      stageId: "black_iron_foundry_7",
      ok: true,
      winner: "player",
      stageCleared: true,
      farmStageId: "black_iron_foundry_6"
    });
  });

  it("includes Lotus Clinic as a Long Stabilization post-Fort region", () => {
    const report = buildGameBalanceReport(staticData);
    const lotusMonastery = staticData.regions.find(
      (region) => region.id === LOTUS_MONASTERY_REGION_ID
    );

    expect(lotusMonastery).toBeDefined();
    if (!lotusMonastery) {
      return;
    }

    const lotusBalance = report.regionBalances.find(
      (region) => region.regionId === LOTUS_MONASTERY_REGION_ID
    );

    expect(lotusBalance).toBeDefined();
    if (!lotusBalance) {
      return;
    }

    expect(lotusBalance.regionName).toBe("Lotus Clinic");
    expect(lotusBalance.stageResults.map((stage) => stage.stageId)).toEqual(
      lotusMonastery.stageIds
    );
    expect(lotusBalance.stageResults[0]).toMatchObject({
      ok: true,
      winner: "player",
      stageCleared: true,
      enemyTypes: ["normal", "normal", "normal"],
      enemyFormationSlots: ["front", "middle", "back"]
    });
    expect(
      lotusBalance.stageResults
        .filter((stage) => stage.ok && stage.targetSeconds)
        .every((stage) => stage.ok && stage.targetMet)
    ).toBe(true);
    expect(lotusBalance.stageResults.at(-1)).toMatchObject({
      stageId: "lotus_clinic_7"
    });
    expect(lotusBalance.farmRecommendation).toMatchObject({
      stageId: "lotus_clinic_6"
    });
    expect(lotusBalance.recoveryEvents).toMatchObject({
      heals: expect.any(Number),
      regenerations: expect.any(Number),
      wounds: expect.any(Number),
      woundUptimeSeconds: expect.any(Number),
      cleanses: expect.any(Number),
      bodyIntegrityRestored: expect.any(Number),
      contextStabilityRestored: expect.any(Number),
      overhealing: expect.any(Number),
      recoveryPrevented: expect.any(Number)
    });
    expect(lotusBalance.recoveryEvents.heals).toBeGreaterThan(0);
    expect(lotusBalance.recoveryEvents.bodyIntegrityRestored).toBeGreaterThan(0);
    expect(lotusBalance.recoveryEvents.woundUptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(lotusBalance.bossGate.baseline).toMatchObject({
      stageId: "lotus_clinic_7",
      ok: true
    });
  });

  it("does not require a hard-coded Veil District region to build later regions", () => {
    const renamedRegionId = "renamed_valley";
    const renamedData: StaticGameData = {
      ...staticData,
      regions: staticData.regions.map((region) =>
        region.id === MIST_VALLEY_REGION_ID
          ? {
              ...region,
              id: renamedRegionId,
              name: "Renamed Valley"
            }
          : region
      ),
      stages: staticData.stages.map((stage) =>
        stage.regionId === MIST_VALLEY_REGION_ID
          ? {
              ...stage,
              regionId: renamedRegionId
            }
          : stage
      )
    };

    const report = buildGameBalanceReport(renamedData);

    expect(report.regionBalances.map((region) => region.regionId)).toEqual(
      renamedData.regions.map((region) => region.id)
    );
    const renamedRegionBalance = report.regionBalances.find(
      (region) => region.regionId === renamedRegionId
    );

    expect(renamedRegionBalance).toMatchObject({
      regionId: renamedRegionId,
      regionName: "Renamed Valley"
    });
    expect(renamedRegionBalance?.stageResults[0]).toMatchObject({
      ok: true,
      stageCleared: true,
      targetSeconds: [5, 18]
    });
    expect(
      report.regionBalances.some(
        (region) => region.regionId === MIST_VALLEY_REGION_ID
      )
    ).toBe(false);
  });

  it("runs every configured region in region order with summary metrics", () => {
    const report = buildGameBalanceReport(staticData);

    expect(report.regionBalances.map((region) => region.regionId)).toEqual(
      staticData.regions.map((region) => region.id)
    );
    expect(
      report.regionBalances.map((region) =>
        region.stageResults.map((stage) => stage.stageId)
      )
    ).toEqual(staticData.regions.map((region) => region.stageIds));
    expect(
      report.regionBalances.every((region) => region.bossGate.baseline.ok)
    ).toBe(true);
    expect(
      report.regionBalances.every((region) => region.masteryMilestone !== null)
    ).toBe(true);
    expect(
      report.regionBalances.every((region) => region.budgetChecks.length > 0)
    ).toBe(true);

    for (const region of report.regionBalances) {
      for (const stage of region.stageResults) {
        if (!stage.ok) {
          continue;
        }

        expect(stage.currentRouteId.length).toBeGreaterThan(0);
        expect(stage.highestClearedRouteIndex).toBeGreaterThanOrEqual(0);
        expect(Object.hasOwn(stage, "currentStageId")).toBe(false);
        expect(Object.hasOwn(stage, "highestClearedStageIndex")).toBe(false);
      }
    }
  });

  it("reports configured budget gates with actionable miss reasons", () => {
    const report = buildGameBalanceReport(staticData);
    const bamboo = getRegionReport(report, BAMBOO_ROAD_REGION_ID);
    const blackIron = getRegionReport(report, BLACK_IRON_FORT_REGION_ID);
    const lotus = getRegionReport(report, LOTUS_MONASTERY_REGION_ID);
    const demonCult = getRegionReport(report, "redline_outpost");

    expect(getBudgetCheck(bamboo, "reward_curve")).toMatchObject({
      status: "pass",
      reason: expect.stringContaining("greenline_approach_8")
    });
    expect(getBudgetCheck(bamboo, "boss_gate")).toMatchObject({
      status: "pass"
    });
    expect(getBudgetCheck(blackIron, "defense_pressure")).toMatchObject({
      status: "pass",
      reason: expect.stringContaining("damage prevented")
    });
    expect(getBudgetCheck(blackIron, "clear_time")).toMatchObject({
      status: "pass",
      reason: expect.stringContaining("6 configured stages")
    });
    expect(getBudgetCheck(lotus, "healing_pressure")).toMatchObject({
      status: "pass",
      reason: expect.stringContaining("heals")
    });
    expect(getBudgetCheck(demonCult, "status_pressure")).toMatchObject({
      status: "pass",
      reason: expect.stringContaining("within status budget")
    });
  });

  it("summarizes difficulty curve issues and boss gate assumptions", () => {
    const report = buildGameBalanceReport(staticData);
    const bamboo = getRegionReport(report, BAMBOO_ROAD_REGION_ID);
    const blackIron = getRegionReport(report, BLACK_IRON_FORT_REGION_ID);
    const lotus = getRegionReport(report, LOTUS_MONASTERY_REGION_ID);
    const demonCult = getRegionReport(report, "redline_outpost");

    expect(blackIron.difficultyCurve.issues).toEqual([]);
    expect(demonCult.difficultyCurve.issues).toEqual([]);
    expect(demonCult.difficultyCurve.spikes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stageId: "redline_outpost_3",
          previousStageId: "redline_outpost_2",
          status: "watch",
          reason: expect.stringContaining("clear time")
        }),
        expect.objectContaining({
          stageId: "redline_outpost_5",
          previousStageId: "redline_outpost_4",
          status: "watch",
          reason: expect.stringContaining("clear time")
        })
      ])
    );
    expect(lotus.difficultyCurve.spikes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stageId: "lotus_clinic_3",
          status: "watch"
        })
      ])
    );
    expect(
      bamboo.bossGateAssumptions.find(
        (assumption) => assumption.scenario === "trained"
      )
    ).toMatchObject({
      ok: true,
      result: "player_clear",
      farmStageId: "greenline_approach_8",
      farmClears: expect.any(Number),
      trainingCost: expect.any(Number),
      medicineConsumed: expect.any(Number),
      statusDamage: expect.any(Number),
      reason: expect.stringContaining("training")
    });
    expect(
      blackIron.bossGateAssumptions.find(
        (assumption) => assumption.scenario === "farmed"
      )
    ).toMatchObject({
      ok: true,
      result: "player_clear",
      farmStageId: "black_iron_foundry_6",
      trainingCost: expect.any(Number),
      reason: expect.stringContaining("status damage")
    });
    expect(
      demonCult.bossGateAssumptions.find(
        (assumption) => assumption.scenario === "baseline"
      )
    ).toMatchObject({
      ok: true,
      result: "player_clear",
      statusDamage: expect.any(Number),
      reason: expect.stringContaining("medicine")
    });
  });

  it("builds stable authoring exports for JSON and CSV review", () => {
    const report = buildGameBalanceReport(staticData);
    const exportReport = buildBalanceAuthoringExport(report);
    const blackIronStage = exportReport.stages.find(
      (stage) => stage.stageId === "black_iron_foundry_4"
    );
    const demonCultSpike = exportReport.stages.find(
      (stage) => stage.stageId === "redline_outpost_3"
    );
    const blackIronFarm = exportReport.stages.find(
      (stage) => stage.stageId === "black_iron_foundry_6"
    );
    const blackIronBossGate = exportReport.bossGateAssumptions.find(
      (assumption) =>
        assumption.regionId === BLACK_IRON_FORT_REGION_ID &&
        assumption.scenario === "farmed"
    );
    const demonCultStatusCheck = exportReport.budgetChecks.find(
      (check) =>
        check.regionId === "redline_outpost" &&
        check.checkId === "status_pressure"
    );
    const csv = formatBalanceStageExportCsv(report);
    const csvLines = csv.split("\n");

    expect(exportReport.schemaVersion).toBe(BALANCE_EXPORT_SCHEMA_VERSION);
    expect(exportReport.regions[0]).toMatchObject({
      regionId: "greenline_approach",
      legacyRegionId: "bamboo_road"
    });
    expect(exportReport.regions.map((region) => region.regionId)).toEqual(
      staticData.regions.map((region) => region.id)
    );
    expect(exportReport.stages.map((stage) => stage.stageId)).toEqual(
      staticData.regions.flatMap((region) => region.stageIds)
    );
    expect(blackIronStage).toMatchObject({
      regionId: BLACK_IRON_FORT_REGION_ID,
      legacyRegionId: "black_iron_fort",
      legacyStageId: "black_iron_fort_4",
      enemyIds: ["ironwall_saber", "shieldwall_guard", "ironwall_sentry"],
      legacyEnemyIds: [
        "black_iron_saber",
        "shieldwall_guard",
        "iron_fort_sentry"
      ],
      targetStatus: "pass",
      difficultyIssue: null,
      pressure: {
        armorBreaks: expect.any(Number)
      }
    });
    expect(demonCultSpike).toMatchObject({
      targetStatus: "pass",
      difficultySpikeStatus: "watch",
      difficultySpikeReason: expect.stringContaining("clear time"),
      statusIds: expect.arrayContaining(["corruption", "trauma"]),
      legacyStatusIds: expect.arrayContaining(["poison", "wound"])
    });
    expect(blackIronFarm).toMatchObject({
      farmRecommendation: true,
      farmScore: 940,
      farmReason: expect.stringContaining("weighted score")
    });
    expect(blackIronBossGate).toMatchObject({
      legacyRegionId: "black_iron_fort",
      legacyStageId: "black_iron_fort_7",
      result: "player_clear",
      farmStageId: "black_iron_foundry_6",
      legacyFarmStageId: "black_iron_fort_6",
      farmClears: expect.any(Number),
      trainingCost: expect.any(Number)
    });
    expect(demonCultStatusCheck).toMatchObject({
      legacyRegionId: "demon_cult_outpost",
      status: "pass",
      reason: expect.stringContaining("within status budget")
    });
    expect(csvLines[0]).toBe(BALANCE_STAGE_EXPORT_CSV_HEADERS.join(","));
    expect(csvLines).toHaveLength(staticData.stages.length + 1);
    expect(csv).toContain("redline_outpost_3");
    expect(csv).toContain("demon_cult_outpost_3");
    expect(csv).toContain("legacy_enemy_ids");
    expect(csv).toContain("black_iron_saber");
    expect(csv).toContain("status_ids");
    expect(csv).toContain("legacy_status_ids");
    expect(csv).toContain("corruption");
    expect(csv).toContain("poison");
    expect(csv).toContain("difficulty_spike_status");
    expect(csv).toContain("black_iron_foundry_6");
    expect(csv).toContain("black_iron_fort_6");
  });

  it("adds report-only District Heat projections without changing compact exports", () => {
    const report = buildGameBalanceReport(staticData);
    const bamboo = getRegionReport(report, BAMBOO_ROAD_REGION_ID);
    const blackIron = getRegionReport(report, BLACK_IRON_FORT_REGION_ID);
    const demonCult = getRegionReport(report, "redline_outpost");
    const bambooFarmStage = bamboo.stageResults.find(
      (stage) => stage.stageId === "greenline_approach_8"
    );
    const exportReport = buildBalanceAuthoringExport(report);
    const csv = formatBalanceStageExportCsv(report);

    expect(bambooFarmStage?.ok).toBe(true);
    if (!bambooFarmStage?.ok) {
      return;
    }

    expect(bamboo.districtHeatProjection).toMatchObject({
      affectedDistrictId: BAMBOO_ROAD_REGION_ID,
      affectedRouteId: "greenline_approach_8",
      activityType: "offline_farm",
      activityCount: Math.floor(
        DISTRICT_HEAT_REPORT_WINDOW_SECONDS / bambooFarmStage.durationSeconds
      ),
      elapsedSeconds: DISTRICT_HEAT_REPORT_WINDOW_SECONDS,
      heatBand: "lockdown",
      projectedHeat: 100,
      gainReason: "offline_farm_repetition",
      decayReason: "no_decay_active_window"
    });
    expect(blackIron.districtHeatProjection).toMatchObject({
      affectedRouteId: "black_iron_foundry_6",
      heatBand: "hot",
      projectedHeat: 71.25
    });
    expect(demonCult.districtHeatProjection).toMatchObject({
      affectedRouteId: "redline_outpost_6",
      heatBand: "lockdown",
      projectedHeat: 100
    });
    expect(report.districtHeatPromotionDecision).toMatchObject({
      posture: "report_only",
      summary: expect.stringContaining("promotion gates now pass"),
      nextAction: expect.stringContaining(
        "route-card warning prototype slice"
      ),
      boundaries: {
        save: "no_persistence",
        cloud: "no_heat_fields",
        webUi: "no_player_facing_heat",
        compactExport: "no_heat_fields",
        tacticExport: "no_heat_fields",
        liveRewards: "unchanged"
      }
    });
    expect(report.districtHeatPromotionDecision.gates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "report_projection",
          status: "pass",
          affectedStageIds: []
        }),
        expect.objectContaining({
          id: "offline_parity",
          status: "pass",
          affectedStageIds: []
        }),
        expect.objectContaining({
          id: "redline_budget",
          status: "pass"
        }),
        expect.objectContaining({
          id: "known_debt",
          status: "pass",
          affectedStageIds: []
        })
      ])
    );
    expect(exportReport.schemaVersion).toBe(BALANCE_EXPORT_SCHEMA_VERSION);
    expect(Object.hasOwn(exportReport, "districtHeatPromotionDecision")).toBe(
      false
    );
    expect(Object.hasOwn(exportReport.regions[0], "districtHeatProjection")).toBe(
      false
    );
    expect(Object.hasOwn(exportReport.stages[0], "districtHeatProjection")).toBe(
      false
    );
    expect(findDistrictAttentionBoundaryTokens(exportReport)).toEqual([]);
    expect(findDistrictAttentionBoundaryTokens(csv)).toEqual([]);
    expect(BALANCE_STAGE_EXPORT_CSV_HEADERS.some((header) => header.includes("heat"))).toBe(
      false
    );
    expect(csv.split("\n")[0]).not.toContain("heat");
  });

  it("adds report-only offline parity without changing compact exports", () => {
    const report = buildGameBalanceReport(staticData);
    const bamboo = getRegionReport(report, BAMBOO_ROAD_REGION_ID);
    const mist = getRegionReport(report, MIST_VALLEY_REGION_ID);
    const blackIron = getRegionReport(report, BLACK_IRON_FORT_REGION_ID);
    const lotus = getRegionReport(report, LOTUS_MONASTERY_REGION_ID);
    const demonCult = getRegionReport(report, "redline_outpost");
    const exportReport = buildBalanceAuthoringExport(report);
    const csv = formatBalanceStageExportCsv(report);

    expect(bamboo.offlineParity).toMatchObject({
      stageId: "greenline_approach_8",
      activeClearTimeSeconds: 25.2,
      offlineEstimatedClearTimeSeconds: 30,
      offlineMinimumClearTimeSeconds: 5,
      offlineEffectiveClearTimeSeconds: 30,
      offlineEfficiency: 0.6,
      activeClearsPerHour: 142.86,
      offlineClearsPerHour: 72,
      offlineToActiveRatio: 0.5,
      status: "active_faster",
      classification: "acceptable",
      activeRewardsPerHour: {
        farmScore: 22428.57,
        silver: 6285.71,
        cultivation: 3142.86,
        combatExperience: 2857.14
      },
      offlineRewardsPerHour: {
        farmScore: 11304,
        silver: 3168,
        cultivation: 1584,
        combatExperience: 1440
      }
    });
    expect(mist.offlineParity).toMatchObject({
      stageId: "veil_district_5",
      offlineEstimatedClearTimeSeconds: 17.5,
      offlineToActiveRatio: 0.56,
      status: "active_faster",
      classification: "acceptable"
    });
    expect(blackIron.offlineParity).toMatchObject({
      stageId: "black_iron_foundry_6",
      offlineEstimatedClearTimeSeconds: 45,
      offlineToActiveRatio: 0.6,
      status: "active_faster",
      classification: "acceptable"
    });
    expect(lotus.offlineParity).toMatchObject({
      stageId: "lotus_clinic_6",
      offlineEstimatedClearTimeSeconds: 57.5,
      offlineToActiveRatio: 0.43,
      status: "active_faster",
      classification: "acceptable"
    });
    expect(demonCult.offlineParity).toMatchObject({
      stageId: "redline_outpost_6",
      offlineEstimatedClearTimeSeconds: 29.5,
      offlineToActiveRatio: 0.65,
      status: "active_faster",
      classification: "acceptable"
    });
    expect(exportReport.schemaVersion).toBe(BALANCE_EXPORT_SCHEMA_VERSION);
    expect(Object.hasOwn(exportReport.regions[0], "offlineParity")).toBe(false);
    expect(Object.hasOwn(exportReport.stages[0], "offlineParity")).toBe(false);
    expect(
      BALANCE_STAGE_EXPORT_CSV_HEADERS.some((header) =>
        header.toLowerCase().includes("offline")
      )
    ).toBe(false);
    expect(csv.split("\n")[0]).not.toContain("offline");
  });

  it("projects District Heat gain, repetition, decay, and bands deterministically", () => {
    expect(
      projectDistrictHeat({
        affectedDistrictId: "test_district",
        affectedRouteId: "test_route",
        activityType: "offline_farm",
        activityCount: 40,
        elapsedSeconds: 1800,
        clearTimeSeconds: 45
      })
    ).toMatchObject({
      projectedHeat: 33.75,
      heatBand: "watched",
      gainReason: "offline_farm_repetition",
      decayReason: "no_decay_active_window"
    });
    expect(
      projectDistrictHeat({
        affectedDistrictId: "test_district",
        activityType: "boss_attempt",
        activityCount: 10,
        elapsedSeconds: 3600,
        inactiveSeconds: 3600
      })
    ).toMatchObject({
      projectedHeat: 20,
      heatBand: "watched",
      gainReason: "boss_attempt",
      decayReason: "inactive_decay"
    });
  });

  it("builds opt-in tactic comparison exports with retained legacy damage aliases", () => {
    const report = buildTacticComparisonReport(staticData);
    const exportReport = buildTacticComparisonExport(report);
    const csv = formatTacticComparisonCsv(report);
    const csvLines = csv.split("\n");
    const balancedBamboo = exportReport.rows.find(
      (row) =>
        row.stageId === "greenline_approach_1" && row.tacticId === "balanced_routine"
    );
    const outerBamboo = exportReport.rows.find(
      (row) =>
        row.stageId === "greenline_approach_1" && row.tacticId === "kinetic_crush"
    );
    const innerDemonCult = exportReport.rows.find(
      (row) =>
        row.stageId === "redline_outpost_3" &&
        row.tacticId === "context_break"
    );
    const sustainDemonBoss = exportReport.rows.find(
      (row) =>
        row.stageId === "redline_outpost_7" && row.tacticId === "long_stabilization"
    );
    const bossBurstDemonBoss = exportReport.rows.find(
      (row) =>
        row.stageId === "redline_outpost_7" &&
        row.tacticId === "gatekeeper_burst"
    );

    expect(exportReport.schemaVersion).toBe(
      TACTIC_COMPARISON_EXPORT_SCHEMA_VERSION
    );
    expect(exportReport.defaultTacticId).toBe("balanced_routine");
    expect(exportReport.legacyDefaultTacticId).toBe("balanced");
    expect(exportReport.tactics.map((tactic) => tactic.tacticId)).toEqual(
      staticData.tactics.map((tactic) => tactic.id)
    );
    expect(exportReport.tactics.map((tactic) => tactic.legacyTacticId)).toEqual([
      "balanced",
      "outer_pressure",
      "inner_pressure",
      "guard_support",
      "sustain",
      "boss_burst"
    ]);
    expect(exportReport.regions.map((region) => region.regionId)).toEqual(
      staticData.regions.map((region) => region.id)
    );
    expect(exportReport.rows).toHaveLength(
      staticData.stages.length * staticData.tactics.length
    );
    expect(balancedBamboo).toMatchObject({
      legacyRegionId: "bamboo_road",
      legacyStageId: "bamboo_road_1",
      legacyTacticId: "balanced",
      isDefaultTactic: true,
      baselineTacticId: "balanced_routine",
      legacyBaselineTacticId: "balanced",
      durationDeltaSeconds: 0,
      pressureDeltas: {
        statusDamage: 0
      },
      contributionDeltas: {
        playerKineticDamage: 0,
        playerCognitiveDamage: 0,
        playerOuterDamage: 0,
        playerInnerDamage: 0
      }
    });
    expect(outerBamboo).toMatchObject({
      legacyTacticId: "outer_pressure",
      baselineTacticId: "balanced_routine",
      legacyBaselineTacticId: "balanced",
      result: "player_clear",
      baselineResult: "player_clear",
      durationDeltaSeconds: -1,
      targetStatus: "pass",
      contributionDeltas: {
        playerEffectiveDps: expect.any(Number)
      }
    });
    expect(innerDemonCult).toMatchObject({
      legacyRegionId: "demon_cult_outpost",
      legacyStageId: "demon_cult_outpost_3",
      legacyTacticId: "inner_pressure",
      baselineTargetStatus: "pass",
      targetStatus: "pass",
      targetStatusChange: "same",
      budgetShift: "unchanged",
      pressureDeltas: {
        statusDamage: expect.any(Number)
      }
    });
    expect(sustainDemonBoss).toMatchObject({
      legacyTacticId: "sustain",
      result: "player_clear",
      pressureDeltas: {
        statusDamage: expect.any(Number)
      }
    });
    expect(sustainDemonBoss?.pressureDeltas.statusDamage ?? 0).toBeLessThan(0);
    expect(bossBurstDemonBoss).toMatchObject({
      baselineResult: "player_clear",
      result: "enemy_hold",
      resultChanged: true,
      budgetShift: "new_miss"
    });
    expect(csvLines[0]).toBe(TACTIC_COMPARISON_CSV_HEADERS.join(","));
    expect(csvLines[0]).toContain("player_kinetic_damage");
    expect(csvLines[0]).toContain("player_cognitive_damage");
    expect(csvLines[0]).toContain("player_outer_damage");
    expect(csvLines[0]).toContain("player_inner_damage");
    expect(csvLines[0]).not.toContain("intrusion");
    expect(csvLines[0]).not.toContain("cognitive_damage_taken");
    expect(csvLines[0]).not.toContain("heat");
    expect(Object.hasOwn(exportReport, "districtHeatPromotionDecision")).toBe(
      false
    );
    expect(findDistrictAttentionBoundaryTokens(exportReport)).toEqual([]);
    expect(findDistrictAttentionBoundaryTokens(csv)).toEqual([]);
    expect(csvLines).toHaveLength(exportReport.rows.length + 1);
    expect(csv).toContain("kinetic_crush");
    expect(csv).toContain("outer_pressure");
    expect(csv).toContain("baseline_tactic_id");
    expect(csv).toContain("legacy_baseline_tactic_id");
    expect(csv).toContain("bamboo_road_1");
    expect(csv).toContain("demon_cult_outpost_7");
    expect(csv).toContain("new_miss");
  });

  it("keeps Redline post-tune tactic safety visible in tactic rows", () => {
    const report = buildTacticComparisonReport(staticData);
    const exportReport = buildTacticComparisonExport(report);
    const redlineRows = exportReport.rows.filter(
      (row) => row.regionId === "redline_outpost"
    );
    const getRow = (stageId: string, tacticId: string) => {
      const row = redlineRows.find(
        (candidate) =>
          candidate.stageId === stageId && candidate.tacticId === tacticId
      );

      if (!row) {
        throw new Error(`Missing ${stageId} ${tacticId} tactic row`);
      }

      return row;
    };
    const totalStatusDamage = (tacticId: string) =>
      Number(
        redlineRows
          .filter((row) => row.tacticId === tacticId)
          .reduce((total, row) => total + row.pressure.statusDamage, 0)
          .toFixed(2)
      );

    expect(getRow("redline_outpost_1", "long_stabilization")).toMatchObject({
      durationSeconds: 19.8,
      targetStatus: "pass",
      budgetShift: "unchanged",
      pressureDeltas: {
        statusDamage: -67.47
      }
    });
    expect(getRow("redline_outpost_2", "kinetic_crush")).toMatchObject({
      durationSeconds: 19.8,
      targetStatus: "pass",
      budgetShift: "unchanged"
    });
    expect(getRow("redline_outpost_3", "balanced_routine")).toMatchObject({
      durationSeconds: 40,
      targetStatus: "pass",
      budgetShift: "unchanged"
    });
    expect(getRow("redline_outpost_3", "context_break")).toMatchObject({
      durationSeconds: 36,
      targetStatus: "pass",
      targetStatusChange: "same",
      budgetShift: "unchanged"
    });
    expect(getRow("redline_outpost_3", "gatekeeper_burst")).toMatchObject({
      durationSeconds: 36,
      targetStatus: "pass",
      budgetShift: "unchanged"
    });
    expect(getRow("redline_outpost_4", "balanced_routine")).toMatchObject({
      durationSeconds: 22,
      targetStatus: "pass",
      budgetShift: "unchanged"
    });
    expect(getRow("redline_outpost_5", "balanced_routine")).toMatchObject({
      durationSeconds: 40,
      targetStatus: "pass",
      budgetShift: "unchanged"
    });
    expect(getRow("redline_outpost_7", "context_break")).toMatchObject({
      baselineResult: "player_clear",
      result: "enemy_hold",
      budgetShift: "new_miss"
    });
    expect(getRow("redline_outpost_7", "gatekeeper_burst")).toMatchObject({
      baselineResult: "player_clear",
      result: "enemy_hold",
      budgetShift: "new_miss"
    });
    expect(totalStatusDamage("balanced_routine")).toBe(785.81);
    expect(totalStatusDamage("long_stabilization")).toBe(583.77);
    expect(
      redlineRows.filter(
        (row) =>
          (row.tacticId === "long_stabilization" ||
            row.tacticId === "kinetic_crush") &&
          row.budgetShift === "new_miss"
      )
    ).toHaveLength(0);
  });

  it("drives budget gates from the real simulated report adapter", () => {
    const gatedData: StaticGameData = {
      ...staticData,
      regions: staticData.regions.map((region) =>
        region.id === BLACK_IRON_FORT_REGION_ID
          ? {
              ...region,
              balanceTargets: {
                ...region.balanceTargets,
                clearTimeSeconds: region.balanceTargets?.clearTimeSeconds ?? {
                  normal: { min: 0, max: 30 },
                  elite: { min: 0, max: 30 }
                },
                defensePressure: {
                  minGuardAbsorbs: 999
                }
              }
            }
          : region
      )
    };
    const report = buildGameBalanceReport(gatedData);
    const blackIron = getRegionReport(report, BLACK_IRON_FORT_REGION_ID);

    expect(blackIron.defensiveEvents.guardAbsorbs).toBeGreaterThan(0);
    expect(getBudgetCheck(blackIron, "defense_pressure")).toMatchObject({
      status: "fail",
      reason: expect.stringContaining("guard absorbs")
    });
  });

  it("keeps Redline simulated status pressure aligned with balance estimates", () => {
    const simulatedReport = buildGameBalanceReport(staticData);
    const estimatedReport = buildBalanceReport(staticData);
    const simulatedDemonCult = getRegionReport(
      simulatedReport,
      "redline_outpost"
    );
    const estimatedDemonCult = estimatedReport.regions.find(
      (region) => region.regionId === "redline_outpost"
    );

    expect(estimatedDemonCult).toBeDefined();
    if (!estimatedDemonCult) {
      return;
    }

    const simulatedStatusIds = [
      ...new Set(
        simulatedDemonCult.stageResults.flatMap((stage) =>
          stage.ok ? stage.statusIds : []
        )
      )
    ].sort();
    const estimatedStatusIds = [
      ...new Set(
        estimatedDemonCult.stages.flatMap(
          (stage) => stage.statusMetrics.statusIds
        )
      )
    ].sort();

    expect(simulatedStatusIds.length).toBeGreaterThan(0);
    expect(estimatedStatusIds).toEqual(
      expect.arrayContaining(simulatedStatusIds)
    );
    expect(getBudgetCheck(simulatedDemonCult, "status_pressure")).toMatchObject({
      status: "pass",
      reason: expect.stringContaining("within status budget")
    });
  });

  it("formats a compact human-readable report", () => {
    const report = buildGameBalanceReport(staticData);
    const formatted = formatBalanceReport(report);

    expect(formatted).toContain("Greenline Approach Balance Report");
    expect(formatted).toContain("Veil District Balance Report");
    expect(formatted).toContain("Black Iron Foundry Balance Report");
    expect(formatted).toContain("Lotus Clinic Balance Report");
    expect(formatted).toContain("lotus_clinic_7");
    expect(formatted).toContain("black_iron_foundry_7");
    expect(formatted).toContain("veil_district_6");
    expect(formatted).toContain("greenline_approach_10");
    expect(formatted).toContain("Region Farm Recommendations");
    expect(formatted).toContain("score 157");
    expect(formatted).toContain("best cleared farm by combatExperience > silver > cultivation priority");
    expect(formatted).toContain("Offline Parity Report");
    expect(formatted).toContain("offline 0.5x active");
    expect(formatted).toContain("estimate 30s @ 60%");
    expect(formatted).toContain("acceptable; active_faster");
    expect(formatted).toContain("District Heat Projection");
    expect(formatted).toContain("offline_farm_repetition");
    expect(formatted).toContain("no_decay_active_window");
    expect(formatted).toContain("District Heat Promotion Decision");
    expect(formatted).toContain("posture: report_only");
    expect(formatted).toContain("promotion gates now pass");
    expect(formatted).toContain("route-card warning prototype slice");
    expect(formatted).toContain("offline_parity pass");
    expect(formatted).toContain("Region Mastery Milestones");
    expect(formatted).toContain("Region Difficulty Curve");
    expect(formatted).toContain("spikes watch redline_outpost_3");
    expect(formatted).toContain("Region Boss Gates");
    expect(formatted).toContain("Region Boss Gate Assumptions");
    expect(formatted).toContain("trained player_clear");
    expect(formatted).toContain("medicine");
    expect(formatted).toContain("status damage");
    expect(formatted).toContain("training");
    expect(formatted).toContain("Region Budget Gates");
    expect(formatted).toContain("Black Iron Foundry: pass (4 checks)");
    expect(formatted).toContain("Redline Outpost: pass (4 checks)");
    expect(formatted).toContain("Region Defensive Events");
    expect(formatted).toContain("Region Recovery Events");
    expect(formatted).toContain("defense");
    expect(formatted).toContain("g0/p0/a");
    expect(formatted).toContain("heals");
    expect(formatted).toContain("recovery denied");
    expect(formatted).toContain("wound uptime");
    expect(formatted).toContain("Training economy:");
    expect(formatted).toContain("Formation Targeting");
    expect(formatted).toContain("npm run simulate -- --json");
    expect(formatted).toContain("--export-json");
    expect(formatted).toContain("--csv");
  });

  it("fails loudly when the Greenline Approach region references a missing stage", () => {
    const badData: StaticGameData = {
      ...staticData,
      regions: staticData.regions.map((region) =>
        region.id === BAMBOO_ROAD_REGION_ID
          ? {
              ...region,
              stageIds: [...region.stageIds, "missing_stage"]
            }
          : region
      )
    };

    expect(() => buildGameBalanceReport(badData)).toThrow(
      "Missing stage missing_stage"
    );
  });

  it("fails loudly when a later configured region references a missing stage", () => {
    const badData: StaticGameData = {
      ...staticData,
      regions: staticData.regions.map((region) =>
        region.id === LOTUS_MONASTERY_REGION_ID
          ? {
              ...region,
              stageIds: [...region.stageIds, "missing_lotus_stage"]
            }
          : region
      )
    };

    expect(() => buildGameBalanceReport(badData)).toThrow(
      "Missing stage missing_lotus_stage"
    );
  });
});

function getRegionReport(
  report: ReturnType<typeof buildGameBalanceReport>,
  regionId: string
) {
  const region = report.regionBalances.find(
    (candidate) => candidate.regionId === regionId
  );

  if (!region) {
    throw new Error(`Missing region ${regionId}`);
  }

  return region;
}

function getBudgetCheck(
  region: ReturnType<typeof getRegionReport>,
  checkId: string
) {
  const check = region.budgetChecks.find((candidate) => candidate.id === checkId);

  if (!check) {
    throw new Error(`Missing budget check ${checkId}`);
  }

  return check;
}
