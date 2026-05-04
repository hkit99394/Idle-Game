import { describe, expect, it } from "vitest";
import {
  calculateUpgradeCost,
  createInitialPlayerProgress,
  deriveHeroStatsFromProgress,
  purchaseUpgrade
} from "../../core";
import { staticData } from "../helpers/staticData";

describe("upgrades", () => {
  it("calculates exponential upgrade costs", () => {
    const upgrade = staticData.upgrades.find(
      (candidate) => candidate.id === "hero_outer_training"
    );

    expect(upgrade).toBeDefined();
    if (!upgrade) {
      return;
    }

    expect(calculateUpgradeCost(upgrade, 0)).toBe(12);
    expect(calculateUpgradeCost(upgrade, 1)).toBe(13);
  });

  it("purchases hero and sect upgrades with silver", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.resources.silver = 200;

    const heroPurchase = purchaseUpgrade(staticData.upgrades, {
      progress,
      upgradeId: "hero_outer_training",
      heroId: "iron_fist_disciple"
    });

    expect(heroPurchase.ok).toBe(true);
    if (!heroPurchase.ok) {
      return;
    }

    expect(heroPurchase.cost).toBe(12);
    expect(heroPurchase.progress.resources.silver).toBe(188);
    expect(
      heroPurchase.progress.heroes.iron_fist_disciple.upgrades.hero_outer_training
    ).toBe(1);

    const sectPurchase = purchaseUpgrade(staticData.upgrades, {
      progress: heroPurchase.progress,
      upgradeId: "sect_inner_training"
    });

    expect(sectPurchase.ok).toBe(true);
    if (!sectPurchase.ok) {
      return;
    }

    expect(sectPurchase.cost).toBe(48);
    expect(sectPurchase.progress.resources.silver).toBe(140);
    expect(sectPurchase.progress.sect.upgrades.sect_inner_training).toBe(1);
  });

  it("rejects upgrades without enough silver", () => {
    const progress = createInitialPlayerProgress(staticData);

    const result = purchaseUpgrade(staticData.upgrades, {
      progress,
      upgradeId: "hero_outer_training",
      heroId: "iron_fist_disciple"
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("not_enough_silver");
      expect(result.cost).toBe(12);
    }
  });

  it("keeps early upgrade pacing within the first three clears", () => {
    const upgrade = staticData.upgrades.find(
      (candidate) => candidate.id === "hero_outer_training"
    );

    expect(upgrade).toBeDefined();
    if (!upgrade) {
      return;
    }

    const firstUpgradeCost = calculateUpgradeCost(upgrade, 0);
    const silverAfterThreeClears = staticData.stages
      .filter((stage) => stage.regionId === "bamboo_road" && !stage.isBoss)
      .slice(0, 3)
      .reduce((silver, stage) => silver + stage.rewards.silver, 0);

    expect(silverAfterThreeClears).toBeGreaterThanOrEqual(firstUpgradeCost);
  });

  it("does not let mastery experience or cultivation pay silver upgrade costs", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.resources.cultivation = 999;
    progress.maps.bamboo_road.combatExperience = 3000;

    const result = purchaseUpgrade(staticData.upgrades, {
      progress,
      upgradeId: "hero_outer_training",
      heroId: "iron_fist_disciple"
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("not_enough_silver");
      expect(result.cost).toBe(12);
    }
  });

  it("derives hero stats from hero, sect, and map upgrades", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.heroes.iron_fist_disciple.upgrades.hero_outer_training = 2;
    progress.sect.upgrades.sect_outer_training = 1;
    progress.sect.upgrades.sect_inner_training = 1;

    const hero = staticData.heroes.find(
      (candidate) => candidate.id === "iron_fist_disciple"
    );

    expect(hero).toBeDefined();
    if (!hero) {
      return;
    }

    const stats = deriveHeroStatsFromProgress({
      baseStats: hero.baseStats,
      heroProgress: progress.heroes.iron_fist_disciple,
      sectProgress: progress.sect,
      heroUpgradeDefinitions: staticData.upgrades.filter(
        (upgrade) => upgrade.scope === "hero"
      ),
      sectUpgradeDefinitions: staticData.upgrades.filter(
        (upgrade) => upgrade.scope === "sect"
      ),
      mapAttackMultiplier: 0.01
    });

    expect(stats.outerAttack).toBeCloseTo(
      hero.baseStats.outerAttack * 1.2 * 1.05 * 1.01
    );
    expect(stats.innerAttack).toBeCloseTo(hero.baseStats.innerAttack * 1.05 * 1.01);
  });
});
