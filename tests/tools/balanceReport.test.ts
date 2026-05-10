import { describe, expect, it } from "vitest";
import type { StaticGameData } from "../../core";
import {
  BAMBOO_ROAD_REGION_ID,
  BLACK_IRON_FORT_REGION_ID,
  LOTUS_MONASTERY_REGION_ID,
  MIST_VALLEY_REGION_ID,
  buildGameBalanceReport,
  formatBalanceReport
} from "../../tools/balanceReport";
import { staticData } from "../helpers/staticData";

describe("balance report", () => {
  it("builds Bamboo Road results from region stage order", () => {
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
      stageId: "bamboo_road_8"
    });
    expect(report.bambooRoadBalance.masteryMilestone).toMatchObject({
      threshold: 100,
      farmStageId: "bamboo_road_8"
    });
    expect(
      report.bambooRoadBalance.bossGate.economy.trainingEconomy
    ).toMatchObject({
      ok: true,
      farmStageId: "bamboo_road_8"
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
      firstLivingFrontlineTargetId: "front_bandit",
      highestCpBacklineTargetId: "back_threat"
    });
  });

  it("includes Mist Valley results from the region stage order", () => {
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

    expect(mistValleyBalance.regionName).toBe("Mist Valley");
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
      stageId: "mist_valley_6"
    });
    expect(mistValleyBalance.farmRecommendation).toMatchObject({
      stageId: "mist_valley_5"
    });
    expect(mistValleyBalance.bossGate.baseline).toMatchObject({
      stageId: "mist_valley_6",
      ok: true,
      winner: "player"
    });
  });

  it("includes Black Iron Fort as a defensive post-Mist region", () => {
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

    expect(blackIronBalance.regionName).toBe("Black Iron Fort");
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
      stageId: "black_iron_fort_7"
    });
    expect(blackIronBalance.farmRecommendation).toMatchObject({
      stageId: "black_iron_fort_6"
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
      stageId: "black_iron_fort_7",
      ok: true,
      winner: "enemy"
    });
    expect(blackIronBalance.bossGate.farmed).toMatchObject({
      stageId: "black_iron_fort_7",
      ok: true,
      winner: "player",
      stageCleared: true,
      farmStageId: "black_iron_fort_6"
    });
  });

  it("includes Lotus Monastery as a sustain post-Fort region", () => {
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

    expect(lotusBalance.regionName).toBe("Lotus Monastery");
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
      stageId: "lotus_monastery_7"
    });
    expect(lotusBalance.farmRecommendation).toMatchObject({
      stageId: "lotus_monastery_6"
    });
    expect(lotusBalance.recoveryEvents).toMatchObject({
      heals: expect.any(Number),
      regenerations: expect.any(Number),
      wounds: expect.any(Number),
      woundUptimeSeconds: expect.any(Number),
      cleanses: expect.any(Number),
      outerHealing: expect.any(Number),
      innerQiRestored: expect.any(Number),
      overhealing: expect.any(Number),
      recoveryPrevented: expect.any(Number)
    });
    expect(lotusBalance.recoveryEvents.heals).toBeGreaterThan(0);
    expect(lotusBalance.recoveryEvents.outerHealing).toBeGreaterThan(0);
    expect(lotusBalance.recoveryEvents.woundUptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(lotusBalance.bossGate.baseline).toMatchObject({
      stageId: "lotus_monastery_7",
      ok: true
    });
  });

  it("does not require a hard-coded Mist Valley region to build later regions", () => {
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
  });

  it("formats a compact human-readable report", () => {
    const report = buildGameBalanceReport(staticData);
    const formatted = formatBalanceReport(report);

    expect(formatted).toContain("Bamboo Road Balance Report");
    expect(formatted).toContain("Mist Valley Balance Report");
    expect(formatted).toContain("Black Iron Fort Balance Report");
    expect(formatted).toContain("Lotus Monastery Balance Report");
    expect(formatted).toContain("lotus_monastery_7");
    expect(formatted).toContain("black_iron_fort_7");
    expect(formatted).toContain("mist_valley_6");
    expect(formatted).toContain("bamboo_road_10");
    expect(formatted).toContain("Region Farm Recommendations");
    expect(formatted).toContain("Region Mastery Milestones");
    expect(formatted).toContain("Region Boss Gates");
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
  });

  it("fails loudly when the Bamboo Road region references a missing stage", () => {
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
