import { describe, expect, it } from "vitest";
import {
  createInitialPlayerProgress,
  getActiveMasterySummaryForStage,
  getStageEnemyFamilies
} from "../../core";
import { staticData } from "../helpers/staticData";

describe("active mastery summary", () => {
  it("returns a clear missing-stage result", () => {
    const progress = createInitialPlayerProgress(staticData);
    const result = getActiveMasterySummaryForStage(
      staticData,
      progress,
      "missing_stage"
    );

    expect(result).toEqual({
      ok: false,
      reason: "missing_stage"
    });
  });

  it("summarizes locked bonuses and next threshold before mastery starts", () => {
    const progress = createInitialPlayerProgress(staticData);
    const result = getActiveMasterySummaryForStage(
      staticData,
      progress,
      "bamboo_road_1"
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.summary).toMatchObject({
      stageId: "bamboo_road_1",
      regionId: "bamboo_road",
      combatExperience: 0,
      reachedRanks: [],
      activeBonuses: [],
      mapAttackMultiplier: 0,
      mapRewardMultiplier: 0,
      enemyFamilyDamageMultiplier: 0,
      damageMultipliersByFamily: {}
    });
    expect(result.summary.nextThreshold?.rank).toBe("familiar");
  });

  it("exposes map attack mastery for a familiar map", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.maps.bamboo_road.combatExperience = 100;

    const result = getActiveMasterySummaryForStage(
      staticData,
      progress,
      "bamboo_road_1"
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.summary.reachedRanks).toEqual(["familiar"]);
    expect(result.summary.nextThreshold?.rank).toBe("trained");
    expect(result.summary.mapAttackMultiplier).toBeCloseTo(0.01);
    expect(result.summary.activeBonuses).toContainEqual({
      type: "map_outer_and_inner_attack_multiplier",
      value: 0.01
    });
  });

  it("exposes map reward mastery for a trained map", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.maps.bamboo_road.combatExperience = 500;

    const result = getActiveMasterySummaryForStage(
      staticData,
      progress,
      "bamboo_road_1"
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.summary.reachedRanks).toEqual(["familiar", "trained"]);
    expect(result.summary.nextThreshold?.rank).toBe("mastered");
    expect(result.summary.mapAttackMultiplier).toBeCloseTo(0.01);
    expect(result.summary.mapRewardMultiplier).toBeCloseTo(0.02);
    expect(result.summary.activeBonuses).toContainEqual({
      type: "map_reward_multiplier",
      value: 0.02
    });
  });

  it("maps mastered enemy-family bonuses to the current stage families", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.maps.bamboo_road.combatExperience = 3000;

    const normalResult = getActiveMasterySummaryForStage(
      staticData,
      progress,
      "bamboo_road_1"
    );
    const bossResult = getActiveMasterySummaryForStage(
      staticData,
      progress,
      "bamboo_road_10"
    );

    expect(getStageEnemyFamilies(staticData, "bamboo_road_1")).toEqual(["bandit"]);
    expect(getStageEnemyFamilies(staticData, "bamboo_road_10")).toEqual([
      "iron_fort",
      "bandit"
    ]);
    expect(normalResult.ok).toBe(true);
    expect(bossResult.ok).toBe(true);
    if (!normalResult.ok || !bossResult.ok) {
      return;
    }

    expect(normalResult.summary.reachedRanks).toEqual([
      "familiar",
      "trained",
      "mastered"
    ]);
    expect(normalResult.summary.nextThreshold).toBeNull();
    expect(normalResult.summary.enemyFamilyDamageMultiplier).toBeCloseTo(0.03);
    expect(normalResult.summary.damageMultipliersByFamily).toEqual({
      bandit: 0.03
    });
    expect(bossResult.summary.damageMultipliersByFamily).toEqual({
      bandit: 0.03,
      iron_fort: 0.03
    });
    expect(normalResult.summary.activeBonuses).toContainEqual({
      type: "enemy_family_damage_multiplier",
      value: 0.03
    });
  });
});
