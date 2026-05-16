import { describe, expect, it } from "vitest";
import {
  buildPlayerTeamForStage,
  createInitialPlayerProgress,
  isHeroUnlocked,
  MVP_PLAYER_HERO_IDS,
  setActiveHeroTeam,
  setPlayerFormationSlot,
  simulateBattle
} from "../../core";
import { staticData } from "../helpers/staticData";

describe("progress-based player team builder", () => {
  it("builds the fixed MVP hero roster in order", () => {
    const progress = createInitialPlayerProgress(staticData);
    const result = buildPlayerTeamForStage(staticData, progress, "greenline_approach_1");

    expect(progress.activeHeroIds).toEqual([...MVP_PLAYER_HERO_IDS]);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.team.combatants.map((combatant) => combatant.definitionId)).toEqual([
      ...MVP_PLAYER_HERO_IDS
    ]);
    expect(result.team.combatants.map((combatant) => combatant.formationSlot)).toEqual([
      "front",
      "middle",
      "back",
      "front"
    ]);
  });

  it("keeps locked roster heroes out of active team selection", () => {
    const progress = createInitialPlayerProgress(staticData);

    expect(isHeroUnlocked(staticData, progress, "lotus_stabilizer")).toBe(
      false
    );

    const lockedResult = setActiveHeroTeam(staticData, {
      progress,
      heroIds: [
        "iron_fist_initiate",
        "azure_pulse_monk",
        "white_crane_edge_runner",
        "lotus_stabilizer"
      ]
    });

    expect(lockedResult).toMatchObject({
      ok: false,
      reason: "locked_hero"
    });

    const teamResult = buildPlayerTeamForStage(
      staticData,
      progress,
      "greenline_approach_1"
    );

    expect(teamResult.ok).toBe(true);
    if (!teamResult.ok) {
      return;
    }
    expect(
      teamResult.team.combatants.map((combatant) => combatant.definitionId)
    ).not.toContain("lotus_stabilizer");
  });

  it("allows the Lotus support hero after the unlock stage is cleared", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.districts.greenline_approach.highestClearedRouteIndex = 10;
    progress.districts.veil_district.highestClearedRouteIndex = 10;
    progress.districts.black_iron_foundry.highestClearedRouteIndex = 10;
    progress.districts.lotus_clinic.highestClearedRouteIndex = 3;
    progress.currentRouteId = "lotus_clinic_4";

    expect(isHeroUnlocked(staticData, progress, "lotus_stabilizer")).toBe(
      true
    );

    const activeResult = setActiveHeroTeam(staticData, {
      progress,
      heroIds: [
        "iron_fist_initiate",
        "azure_pulse_monk",
        "white_crane_edge_runner",
        "lotus_stabilizer"
      ]
    });

    expect(activeResult.ok).toBe(true);
    if (!activeResult.ok) {
      return;
    }

    const teamResult = buildPlayerTeamForStage(
      staticData,
      activeResult.progress,
      "lotus_clinic_4"
    );

    expect(teamResult.ok).toBe(true);
    if (!teamResult.ok) {
      return;
    }
    expect(teamResult.team.combatants.map((combatant) => combatant.definitionId)).toEqual([
      "iron_fist_initiate",
      "azure_pulse_monk",
      "white_crane_edge_runner",
      "lotus_stabilizer"
    ]);
    expect(
      teamResult.team.combatants.find(
        (combatant) => combatant.definitionId === "lotus_stabilizer"
      )?.formationSlot
    ).toBe("back");
  });

  it("applies hero upgrades, sect upgrades, and map attack mastery", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.heroes.iron_fist_initiate.upgrades.hero_outer_training = 2;
    progress.technoSect.upgrades.sect_outer_training = 1;
    progress.technoSect.upgrades.sect_inner_training = 1;
    progress.districts.greenline_approach.combatData = 100;

    const result = buildPlayerTeamForStage(staticData, progress, "greenline_approach_1");

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const ironFist = result.team.combatants.find(
      (combatant) => combatant.definitionId === "iron_fist_initiate"
    );
    const baseIronFist = staticData.heroes.find(
      (hero) => hero.id === "iron_fist_initiate"
    );

    expect(ironFist?.statsOverride).toBeDefined();
    expect(baseIronFist).toBeDefined();
    if (!ironFist?.statsOverride || !baseIronFist) {
      return;
    }

    expect(ironFist.level).toBe(2);
    expect(ironFist.statsOverride.kineticAttack).toBeCloseTo(
      baseIronFist.baseStats.kineticAttack * 1.06 * 1.2 * 1.05 * 1.01
    );
    expect(ironFist.statsOverride.cognitiveAttack).toBeCloseTo(
      baseIronFist.baseStats.cognitiveAttack * 1.06 * 1.05 * 1.01
    );
  });

  it("applies saved player formation slots to battle setup", () => {
    const progress = createInitialPlayerProgress(staticData);
    const formationResult = setPlayerFormationSlot(
      staticData,
      progress,
      "azure_pulse_monk",
      "front"
    );

    expect(formationResult.ok).toBe(true);
    if (!formationResult.ok) {
      return;
    }

    const teamResult = buildPlayerTeamForStage(
      staticData,
      formationResult.progress,
      "greenline_approach_1"
    );

    expect(teamResult.ok).toBe(true);
    if (!teamResult.ok) {
      return;
    }

    expect(
      teamResult.team.combatants.find(
        (combatant) => combatant.definitionId === "azure_pulse_monk"
      )?.formationSlot
    ).toBe("front");
    expect(formationResult.progress.formation?.azure_pulse_monk).toBe("front");
  });

  it("adds enemy-family mastery damage multipliers for the current stage enemy family", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.districts.greenline_approach.combatData = 3000;

    const normalResult = buildPlayerTeamForStage(staticData, progress, "greenline_approach_1");
    const bossResult = buildPlayerTeamForStage(staticData, progress, "greenline_approach_10");

    expect(normalResult.ok).toBe(true);
    expect(bossResult.ok).toBe(true);
    if (!normalResult.ok || !bossResult.ok) {
      return;
    }

    expect(normalResult.team.combatants[0].damageMultipliersByFamily).toEqual({
      greenline: 0.03
    });
    expect(bossResult.team.combatants[0].damageMultipliersByFamily).toEqual({
      greenline: 0.03,
      ironwall: 0.03
    });
  });

  it("enemy-family mastery changes simulator damage output", () => {
    const baseProgress = createInitialPlayerProgress(staticData);
    const masteredProgress = createInitialPlayerProgress(staticData);
    masteredProgress.districts.greenline_approach.combatData = 3000;

    const baseTeam = buildPlayerTeamForStage(staticData, baseProgress, "greenline_approach_1");
    const masteredTeam = buildPlayerTeamForStage(staticData, masteredProgress, "greenline_approach_1");

    expect(baseTeam.ok).toBe(true);
    expect(masteredTeam.ok).toBe(true);
    if (!baseTeam.ok || !masteredTeam.ok) {
      return;
    }

    const enemyTeam = {
      id: "enemy" as const,
      combatants: [{ kind: "enemy" as const, definitionId: "greenline_cutter" }]
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
    masteredProgress.districts.greenline_approach.combatData = 100;

    const baseTeam = buildPlayerTeamForStage(staticData, baseProgress, "greenline_approach_1");
    const masteredTeam = buildPlayerTeamForStage(staticData, masteredProgress, "greenline_approach_1");

    expect(baseTeam.ok).toBe(true);
    expect(masteredTeam.ok).toBe(true);
    if (!baseTeam.ok || !masteredTeam.ok) {
      return;
    }

    const enemyTeam = {
      id: "enemy" as const,
      combatants: [{ kind: "enemy" as const, definitionId: "greenline_cutter" }]
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
