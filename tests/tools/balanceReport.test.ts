import { describe, expect, it } from "vitest";
import type { StaticGameData } from "../../core";
import {
  BAMBOO_ROAD_REGION_ID,
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

  it("formats a compact human-readable report", () => {
    const report = buildBambooRoadBalanceReport(staticData);
    const formatted = formatBalanceReport(report);

    expect(formatted).toContain("Bamboo Road Balance Report");
    expect(formatted).toContain("bamboo_road_10");
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
