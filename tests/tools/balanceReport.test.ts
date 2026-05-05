import { describe, expect, it } from "vitest";
import type { StaticGameData } from "../../core";
import {
  BAMBOO_ROAD_REGION_ID,
  MIST_VALLEY_REGION_ID,
  buildBambooRoadBalanceReport,
  formatBalanceReport
} from "../../tools/balanceReport";
import { staticData } from "../helpers/staticData";

describe("balance report", () => {
  it("builds Bamboo Road results from region stage order", () => {
    const report = buildBambooRoadBalanceReport(staticData);
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
    const report = buildBambooRoadBalanceReport(staticData);
    const mistValley = staticData.regions.find(
      (region) => region.id === MIST_VALLEY_REGION_ID
    );

    expect(mistValley).toBeDefined();
    if (!mistValley) {
      return;
    }

    expect(report.mistValleyBalance.regionName).toBe("Mist Valley");
    expect(
      report.mistValleyBalance.stageResults.map((stage) => stage.stageId)
    ).toEqual(mistValley.stageIds);
    expect(report.mistValleyBalance.stageResults[0]).toMatchObject({
      ok: true,
      winner: "player",
      stageCleared: true,
      enemyTypes: ["normal", "normal"],
      enemyFormationSlots: ["front", "middle"]
    });
    expect(report.mistValleyBalance.stageResults.at(-1)).toMatchObject({
      stageId: "mist_valley_6"
    });
    expect(report.mistValleyBalance.farmRecommendation).toMatchObject({
      stageId: "mist_valley_5"
    });
    expect(report.mistValleyBalance.bossGate.baseline).toMatchObject({
      stageId: "mist_valley_6",
      ok: true,
      winner: "player"
    });
  });

  it("runs every configured region in region order with summary metrics", () => {
    const report = buildBambooRoadBalanceReport(staticData);

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
    const report = buildBambooRoadBalanceReport(staticData);
    const formatted = formatBalanceReport(report);

    expect(formatted).toContain("Bamboo Road Balance Report");
    expect(formatted).toContain("Mist Valley Balance Report");
    expect(formatted).toContain("mist_valley_6");
    expect(formatted).toContain("bamboo_road_10");
    expect(formatted).toContain("Region Farm Recommendations");
    expect(formatted).toContain("Region Mastery Milestones");
    expect(formatted).toContain("Region Boss Gates");
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

    expect(() => buildBambooRoadBalanceReport(badData)).toThrow(
      "Missing stage missing_stage"
    );
  });
});
