import { describe, expect, it } from "vitest";
import {
  buildPlayerTeamForStage,
  createInitialPlayerProgress,
  MVP_PLAYER_HERO_IDS,
  simulateBattle
} from "../../core";
import { staticData } from "../helpers/staticData";

describe("progress-based player team builder", () => {
  it("builds the fixed MVP hero roster in order", () => {
    const progress = createInitialPlayerProgress(staticData);
    const result = buildPlayerTeamForStage(staticData, progress, "bamboo_road_1");

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.team.combatants.map((combatant) => combatant.definitionId)).toEqual([
      ...MVP_PLAYER_HERO_IDS
    ]);
  });

  it("applies hero upgrades, sect upgrades, and map attack mastery", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.heroes.iron_fist_disciple.upgrades.hero_outer_training = 2;
    progress.sect.upgrades.sect_outer_training = 1;
    progress.sect.upgrades.sect_inner_training = 1;
    progress.maps.bamboo_road.combatExperience = 100;

    const result = buildPlayerTeamForStage(staticData, progress, "bamboo_road_1");

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const ironFist = result.team.combatants.find(
      (combatant) => combatant.definitionId === "iron_fist_disciple"
    );
    const baseIronFist = staticData.heroes.find(
      (hero) => hero.id === "iron_fist_disciple"
    );

    expect(ironFist?.statsOverride).toBeDefined();
    expect(baseIronFist).toBeDefined();
    if (!ironFist?.statsOverride || !baseIronFist) {
      return;
    }

    expect(ironFist.statsOverride.outerAttack).toBeCloseTo(
      baseIronFist.baseStats.outerAttack * 1.2 * 1.05 * 1.01
    );
    expect(ironFist.statsOverride.innerAttack).toBeCloseTo(
      baseIronFist.baseStats.innerAttack * 1.05 * 1.01
    );
  });

  it("adds enemy-family mastery damage multipliers for the current stage enemy family", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.maps.bamboo_road.combatExperience = 3000;

    const normalResult = buildPlayerTeamForStage(staticData, progress, "bamboo_road_1");
    const bossResult = buildPlayerTeamForStage(staticData, progress, "bamboo_road_10");

    expect(normalResult.ok).toBe(true);
    expect(bossResult.ok).toBe(true);
    if (!normalResult.ok || !bossResult.ok) {
      return;
    }

    expect(normalResult.team.combatants[0].damageMultipliersByFamily).toEqual({
      bandit: 0.03
    });
    expect(bossResult.team.combatants[0].damageMultipliersByFamily).toEqual({
      iron_fort: 0.03
    });
  });

  it("enemy-family mastery changes simulator damage output", () => {
    const baseProgress = createInitialPlayerProgress(staticData);
    const masteredProgress = createInitialPlayerProgress(staticData);
    masteredProgress.maps.bamboo_road.combatExperience = 3000;

    const baseTeam = buildPlayerTeamForStage(staticData, baseProgress, "bamboo_road_1");
    const masteredTeam = buildPlayerTeamForStage(staticData, masteredProgress, "bamboo_road_1");

    expect(baseTeam.ok).toBe(true);
    expect(masteredTeam.ok).toBe(true);
    if (!baseTeam.ok || !masteredTeam.ok) {
      return;
    }

    const enemyTeam = {
      id: "enemy" as const,
      combatants: [{ kind: "enemy" as const, definitionId: "bamboo_bandit" }]
    };
    const baseBattle = simulateBattle(staticData, {
      playerTeam: baseTeam.team,
      enemyTeam,
      maxDurationSeconds: 2
    });
    const masteredBattle = simulateBattle(staticData, {
      playerTeam: masteredTeam.team,
      enemyTeam,
      maxDurationSeconds: 2
    });

    expect(masteredBattle.metrics.playerOuterDamage).toBeGreaterThan(
      baseBattle.metrics.playerOuterDamage
    );
    expect(masteredBattle.metrics.playerInnerDamage).toBeGreaterThan(
      baseBattle.metrics.playerInnerDamage
    );
  });

  it("map attack mastery changes simulator damage output", () => {
    const baseProgress = createInitialPlayerProgress(staticData);
    const masteredProgress = createInitialPlayerProgress(staticData);
    masteredProgress.maps.bamboo_road.combatExperience = 100;

    const baseTeam = buildPlayerTeamForStage(staticData, baseProgress, "bamboo_road_1");
    const masteredTeam = buildPlayerTeamForStage(staticData, masteredProgress, "bamboo_road_1");

    expect(baseTeam.ok).toBe(true);
    expect(masteredTeam.ok).toBe(true);
    if (!baseTeam.ok || !masteredTeam.ok) {
      return;
    }

    const enemyTeam = {
      id: "enemy" as const,
      combatants: [{ kind: "enemy" as const, definitionId: "bamboo_bandit" }]
    };
    const baseBattle = simulateBattle(staticData, {
      playerTeam: baseTeam.team,
      enemyTeam,
      maxDurationSeconds: 2
    });
    const masteredBattle = simulateBattle(staticData, {
      playerTeam: masteredTeam.team,
      enemyTeam,
      maxDurationSeconds: 2
    });

    expect(masteredBattle.metrics.playerOuterDamage).toBeGreaterThan(
      baseBattle.metrics.playerOuterDamage
    );
    expect(masteredBattle.metrics.playerInnerDamage).toBeGreaterThan(
      baseBattle.metrics.playerInnerDamage
    );
  });
});
