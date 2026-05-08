import { describe, expect, it } from "vitest";
import {
  buildBalanceReport,
  defaultBalanceScenarioPresets,
  formatBalanceReport
} from "../../core";
import type { StaticGameData } from "../../core";
import enemies from "../../data/enemies.json" with { type: "json" };
import formations from "../../data/formations.json" with { type: "json" };
import heroes from "../../data/heroes.json" with { type: "json" };
import mastery from "../../data/mastery.json" with { type: "json" };
import medicines from "../../data/medicines.json" with { type: "json" };
import regions from "../../data/regions.json" with { type: "json" };
import skills from "../../data/skills.json" with { type: "json" };
import stages from "../../data/stages.json" with { type: "json" };
import statusEffects from "../../data/statusEffects.json" with { type: "json" };
import upgrades from "../../data/upgrades.json" with { type: "json" };

const staticData: StaticGameData = {
  heroes: heroes as StaticGameData["heroes"],
  skills: skills as StaticGameData["skills"],
  enemies: enemies as StaticGameData["enemies"],
  regions: regions as StaticGameData["regions"],
  stages: stages as StaticGameData["stages"],
  upgrades: upgrades as StaticGameData["upgrades"],
  mastery: mastery as StaticGameData["mastery"],
  formations: formations as StaticGameData["formations"],
  statusEffects: statusEffects as StaticGameData["statusEffects"],
  medicines: medicines as StaticGameData["medicines"]
};

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
    expect(combinedDemonBoss.survivalRatio).toBeGreaterThan(
      baselineDemonBoss.survivalRatio
    );
    expect(report.demonCultBossGate).toMatchObject({
      stageId: "demon_cult_outpost_7",
      baselineScenarioId: "baseline",
      intendedScenarioId: "combined",
      pass: true
    });
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
