import { describe, expect, it } from "vitest";
import {
  calculateCombatPower,
  calculateEffectiveStatusResistance,
  calculateUpgradeCost,
  calculateSkillUpgradeCost,
  createInitialPlayerProgress,
  deriveHeroStatsFromProgress,
  isStyleBranchUnlocked,
  purchaseSkillUpgrade,
  purchaseUpgrade,
  selectStyleBranch
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
      .filter((stage) => stage.regionId === "greenline_approach" && !stage.isBoss)
      .slice(0, 3)
      .reduce((silver, stage) => silver + stage.rewards.silver, 0);

    expect(silverAfterThreeClears).toBeGreaterThanOrEqual(firstUpgradeCost);
  });

  it("does not let mastery experience or cultivation pay silver upgrade costs", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.resources.cultivation = 999;
    progress.maps.greenline_approach.combatExperience = 3000;

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
    expect(stats.maxOuterHp).toBeCloseTo(hero.baseStats.maxOuterHp * 1.08 * 1.02);
    expect(stats.maxInnerQi).toBeCloseTo(hero.baseStats.maxInnerQi * 1.02);
  });

  it("applies hero level scaling before upgrade multipliers", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.heroes.iron_fist_disciple.level = 2;
    progress.heroes.iron_fist_disciple.upgrades.hero_outer_training = 1;
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
      )
    });

    expect(stats.outerAttack).toBeCloseTo(hero.baseStats.outerAttack * 1.06 * 1.1);
    expect(stats.maxOuterHp).toBeCloseTo(hero.baseStats.maxOuterHp * 1.06 * 1.04);
  });

  it("applies Lotus purge training as capped team resistance with CP value", () => {
    const progress = createInitialPlayerProgress(staticData);
    const guardian = staticData.heroes.find(
      (candidate) => candidate.id === "mountain_staff_guardian"
    );

    expect(guardian).toBeDefined();
    if (!guardian) {
      return;
    }

    const commonInput = {
      baseStats: guardian.baseStats,
      heroProgress: progress.heroes.mountain_staff_guardian,
      sectProgress: progress.sect,
      heroUpgradeDefinitions: staticData.upgrades.filter(
        (upgrade) => upgrade.scope === "hero"
      ),
      sectUpgradeDefinitions: staticData.upgrades.filter(
        (upgrade) => upgrade.scope === "sect"
      )
    };
    const before = deriveHeroStatsFromProgress(commonInput);

    progress.sect.upgrades.lotus_purity_training = 2;
    const after = deriveHeroStatsFromProgress({
      ...commonInput,
      sectProgress: progress.sect
    });

    expect(after.statusResistance).toBeCloseTo(
      calculateEffectiveStatusResistance(guardian.baseStats.statusResistance, 0.08)
    );
    expect(calculateCombatPower(after)).toBeGreaterThan(
      calculateCombatPower(before)
    );

    progress.sect.upgrades.lotus_purity_training = 30;
    const capped = deriveHeroStatsFromProgress({
      ...commonInput,
      sectProgress: progress.sect
    });

    expect(capped.statusResistance).toBe(0.8);
  });

  it("applies style mastery only to matching hero styles", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.styleMastery = {
      fist: {
        experience: 200
      }
    };
    const ironFist = staticData.heroes.find(
      (candidate) => candidate.id === "iron_fist_disciple"
    );
    const palmMonk = staticData.heroes.find(
      (candidate) => candidate.id === "azure_palm_monk"
    );

    expect(ironFist).toBeDefined();
    expect(palmMonk).toBeDefined();
    if (!ironFist || !palmMonk) {
      return;
    }

    const fistStats = deriveHeroStatsFromProgress({
      baseStats: ironFist.baseStats,
      style: ironFist.style,
      heroProgress: progress.heroes.iron_fist_disciple,
      sectProgress: progress.sect,
      heroUpgradeDefinitions: staticData.upgrades.filter(
        (upgrade) => upgrade.scope === "hero"
      ),
      sectUpgradeDefinitions: staticData.upgrades.filter(
        (upgrade) => upgrade.scope === "sect"
      ),
      styleDefinitions: staticData.styles,
      styleMastery: progress.styleMastery
    });
    const palmStats = deriveHeroStatsFromProgress({
      baseStats: palmMonk.baseStats,
      style: palmMonk.style,
      heroProgress: progress.heroes.azure_palm_monk,
      sectProgress: progress.sect,
      heroUpgradeDefinitions: staticData.upgrades.filter(
        (upgrade) => upgrade.scope === "hero"
      ),
      sectUpgradeDefinitions: staticData.upgrades.filter(
        (upgrade) => upgrade.scope === "sect"
      ),
      styleDefinitions: staticData.styles,
      styleMastery: progress.styleMastery
    });

    expect(fistStats.outerAttack).toBeCloseTo(ironFist.baseStats.outerAttack * 1.02);
    expect(palmStats.innerAttack).toBeCloseTo(palmMonk.baseStats.innerAttack);
  });

  it("purchases skill upgrades with cultivation", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.resources.cultivation = 20;
    const upgrade = staticData.skillUpgrades.find(
      (candidate) => candidate.id === "iron_fist_combo_refinement"
    );

    expect(upgrade).toBeDefined();
    if (!upgrade) {
      return;
    }

    expect(calculateSkillUpgradeCost(upgrade, 0)).toBe(8);

    const result = purchaseSkillUpgrade(staticData.skillUpgrades, {
      progress,
      skillUpgradeId: upgrade.id
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.cost).toBe(8);
    expect(result.progress.resources.cultivation).toBe(12);
    expect(result.progress.skillUpgrades?.iron_fist_combo_refinement).toBe(1);
  });

  it("selects unlocked style branches and applies effects only to matching styles", () => {
    const progress = createInitialPlayerProgress(staticData);
    const fistStyle = staticData.styles.find((style) => style.id === "fist");
    const ironFist = staticData.heroes.find(
      (hero) => hero.id === "iron_fist_disciple"
    );
    const palmMonk = staticData.heroes.find(
      (hero) => hero.id === "azure_palm_monk"
    );

    expect(fistStyle).toBeDefined();
    expect(ironFist).toBeDefined();
    expect(palmMonk).toBeDefined();
    if (!fistStyle || !ironFist || !palmMonk) {
      return;
    }

    const branch = fistStyle.branches[0];

    expect(branch.hiddenInMvp).toBe(false);
    expect(isStyleBranchUnlocked(staticData, progress, branch)).toBe(false);

    const lockedResult = selectStyleBranch(staticData, {
      progress,
      styleId: "fist",
      branchId: branch.id
    });

    expect(lockedResult).toMatchObject({
      ok: false,
      reason: "locked_branch"
    });

    progress.heroes.iron_fist_disciple.level = 3;

    expect(isStyleBranchUnlocked(staticData, progress, branch)).toBe(true);

    const selectedResult = selectStyleBranch(staticData, {
      progress,
      styleId: "fist",
      branchId: branch.id
    });

    expect(selectedResult.ok).toBe(true);
    if (!selectedResult.ok) {
      return;
    }

    expect(selectedResult.progress.styleBranches?.fist).toBe("iron_body_fist");

    const fistStats = deriveHeroStatsFromProgress({
      baseStats: ironFist.baseStats,
      style: ironFist.style,
      heroProgress: selectedResult.progress.heroes.iron_fist_disciple,
      sectProgress: selectedResult.progress.sect,
      heroUpgradeDefinitions: staticData.upgrades.filter(
        (upgrade) => upgrade.scope === "hero"
      ),
      sectUpgradeDefinitions: staticData.upgrades.filter(
        (upgrade) => upgrade.scope === "sect"
      ),
      styleDefinitions: staticData.styles,
      styleBranches: selectedResult.progress.styleBranches
    });
    const palmStats = deriveHeroStatsFromProgress({
      baseStats: palmMonk.baseStats,
      style: palmMonk.style,
      heroProgress: selectedResult.progress.heroes.azure_palm_monk,
      sectProgress: selectedResult.progress.sect,
      heroUpgradeDefinitions: staticData.upgrades.filter(
        (upgrade) => upgrade.scope === "hero"
      ),
      sectUpgradeDefinitions: staticData.upgrades.filter(
        (upgrade) => upgrade.scope === "sect"
      ),
      styleDefinitions: staticData.styles,
      styleBranches: selectedResult.progress.styleBranches
    });

    expect(fistStats.maxOuterHp).toBeCloseTo(
      ironFist.baseStats.maxOuterHp * 1.06 ** 2 * 1.06
    );
    expect(fistStats.outerDefense).toBeCloseTo(
      ironFist.baseStats.outerDefense * 1.06 ** 2 * 1.05
    );
    expect(palmStats.maxOuterHp).toBeCloseTo(palmMonk.baseStats.maxOuterHp);
  });
});
