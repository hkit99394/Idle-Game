import { describe, expect, it } from "vitest";
import {
  applyStageClearRewards,
  buildPlayerTeamForStage,
  calculateCombatPower,
  createInitialPlayerProgress,
  equipHeroEquipment,
  getEquipmentInventoryCount
} from "../../core";
import type { StaticGameData } from "../../core";
import { staticData } from "../helpers/staticData";

describe("equipment progression", () => {
  it("adds deterministic equipment drops to inventory and stacks duplicates", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.districts.greenline_approach.highestClearedRouteIndex = 1;

    const firstClear = applyStageClearRewards(staticData, {
      progress,
      stageId: "greenline_approach_2"
    });

    expect(firstClear.ok).toBe(true);
    if (!firstClear.ok) {
      return;
    }

    expect(firstClear.equipmentRewards).toEqual([
      {
        equipmentId: "impact_training_wraps",
        quantity: 1
      }
    ]);
    expect(
      getEquipmentInventoryCount(firstClear.progress, "impact_training_wraps")
    ).toBe(1);

    const secondClear = applyStageClearRewards(staticData, {
      progress: firstClear.progress,
      stageId: "greenline_approach_2"
    });

    expect(secondClear.ok).toBe(true);
    if (!secondClear.ok) {
      return;
    }

    expect(
      getEquipmentInventoryCount(secondClear.progress, "impact_training_wraps")
    ).toBe(2);
  });

  it("equips compatible gear and increases hero CP through derived stats", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.equipment = {
      inventory: {
        impact_training_wraps: 1
      },
      equipped: {}
    };
    const beforeTeam = buildPlayerTeamForStage(
      staticData,
      progress,
      "greenline_approach_1"
    );

    expect(beforeTeam.ok).toBe(true);
    if (!beforeTeam.ok) {
      return;
    }

    const beforeHero = beforeTeam.team.combatants.find(
      (combatant) => combatant.definitionId === "iron_fist_initiate"
    );
    const beforeCp = calculateCombatPower(beforeHero?.statsOverride ?? staticData.heroes[0].baseStats);
    const equipResult = equipHeroEquipment(staticData, {
      progress,
      heroId: "iron_fist_initiate",
      equipmentId: "impact_training_wraps"
    });

    expect(equipResult.ok).toBe(true);
    if (!equipResult.ok) {
      return;
    }

    const afterTeam = buildPlayerTeamForStage(
      staticData,
      equipResult.progress,
      "greenline_approach_1"
    );

    expect(afterTeam.ok).toBe(true);
    if (!afterTeam.ok) {
      return;
    }

    const afterHero = afterTeam.team.combatants.find(
      (combatant) => combatant.definitionId === "iron_fist_initiate"
    );
    const afterCp = calculateCombatPower(afterHero?.statsOverride ?? staticData.heroes[0].baseStats);

    expect(
      equipResult.progress.equipment?.equipped.iron_fist_initiate?.weapon
    ).toBe("impact_training_wraps");
    expect(afterCp).toBeGreaterThan(beforeCp);
  });

  it("equips medicine items through the shared stat and CP path", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.equipment = {
      inventory: {
        lotus_dew_countermeasure: 1
      },
      equipped: {}
    };
    const beforeTeam = buildPlayerTeamForStage(
      staticData,
      progress,
      "greenline_approach_1"
    );

    expect(beforeTeam.ok).toBe(true);
    if (!beforeTeam.ok) {
      return;
    }

    const beforeHero = beforeTeam.team.combatants.find(
      (combatant) => combatant.definitionId === "azure_pulse_monk"
    );
    const equipResult = equipHeroEquipment(staticData, {
      progress,
      heroId: "azure_pulse_monk",
      equipmentId: "lotus_dew_countermeasure"
    });

    expect(equipResult.ok).toBe(true);
    if (!equipResult.ok) {
      return;
    }

    const afterTeam = buildPlayerTeamForStage(
      staticData,
      equipResult.progress,
      "greenline_approach_1"
    );

    expect(afterTeam.ok).toBe(true);
    if (!afterTeam.ok) {
      return;
    }

    const afterHero = afterTeam.team.combatants.find(
      (combatant) => combatant.definitionId === "azure_pulse_monk"
    );

    expect(equipResult.progress.equipment?.equipped.azure_pulse_monk?.medicine)
      .toBe("lotus_dew_countermeasure");
    expect(afterHero?.statsOverride?.maxContextStability).toBeGreaterThan(
      beforeHero?.statsOverride?.maxContextStability ?? 0
    );
    expect(afterHero?.statsOverride?.contextRebuildRate).toBeGreaterThan(
      beforeHero?.statsOverride?.contextRebuildRate ?? 0
    );
    expect(calculateCombatPower(afterHero?.statsOverride ?? staticData.heroes[1].baseStats))
      .toBeGreaterThan(
        calculateCombatPower(beforeHero?.statsOverride ?? staticData.heroes[1].baseStats)
      );
  });

  it("rejects incompatible gear and unavailable duplicate copies", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.equipment = {
      inventory: {
        impact_training_wraps: 1,
        woven_travel_plating: 1
      },
      equipped: {}
    };

    expect(
      equipHeroEquipment(staticData, {
        progress,
        heroId: "azure_pulse_monk",
        equipmentId: "impact_training_wraps"
      })
    ).toMatchObject({
      ok: false,
      reason: "incompatible_style"
    });

    const firstEquip = equipHeroEquipment(staticData, {
      progress,
      heroId: "iron_fist_initiate",
      equipmentId: "woven_travel_plating"
    });

    expect(firstEquip.ok).toBe(true);
    if (!firstEquip.ok) {
      return;
    }

    expect(
      equipHeroEquipment(staticData, {
        progress: firstEquip.progress,
        heroId: "azure_pulse_monk",
        equipmentId: "woven_travel_plating"
      })
    ).toMatchObject({
      ok: false,
      reason: "not_enough_copies"
    });
  });

  it("applies deterministic affixes to derived stats and CP", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.equipment = {
      inventory: {
        iron_thread_plating: 1
      },
      equipped: {}
    };
    const equipResult = equipHeroEquipment(staticData, {
      progress,
      heroId: "iron_fist_initiate",
      equipmentId: "iron_thread_plating"
    });

    expect(equipResult.ok).toBe(true);
    if (!equipResult.ok) {
      return;
    }

    const withoutAffixData: StaticGameData = {
      ...staticData,
      equipment: staticData.equipment.map((equipment) =>
        equipment.id === "iron_thread_plating"
          ? { ...equipment, affixes: [] }
          : equipment
      )
    };
    const withoutAffixTeam = buildPlayerTeamForStage(
      withoutAffixData,
      equipResult.progress,
      "greenline_approach_1"
    );
    const withAffixTeam = buildPlayerTeamForStage(
      staticData,
      equipResult.progress,
      "greenline_approach_1"
    );

    expect(withoutAffixTeam.ok).toBe(true);
    expect(withAffixTeam.ok).toBe(true);
    if (!withoutAffixTeam.ok || !withAffixTeam.ok) {
      return;
    }

    const withoutAffixHero = withoutAffixTeam.team.combatants.find(
      (combatant) => combatant.definitionId === "iron_fist_initiate"
    );
    const withAffixHero = withAffixTeam.team.combatants.find(
      (combatant) => combatant.definitionId === "iron_fist_initiate"
    );
    const withoutAffixStats = withoutAffixHero?.statsOverride ?? staticData.heroes[0].baseStats;
    const withAffixStats = withAffixHero?.statsOverride ?? staticData.heroes[0].baseStats;

    expect(withAffixStats.kineticDefense).toBeGreaterThan(
      withoutAffixStats.kineticDefense
    );
    expect(calculateCombatPower(withAffixStats)).toBeGreaterThan(
      calculateCombatPower(withoutAffixStats)
    );
  });

  it("applies equipment set bonuses after enough pieces are equipped", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.equipment = {
      inventory: {
        iron_thread_plating: 1,
        fortress_guard_protocol: 1
      },
      equipped: {}
    };
    const armorResult = equipHeroEquipment(staticData, {
      progress,
      heroId: "iron_fist_initiate",
      equipmentId: "iron_thread_plating"
    });

    expect(armorResult.ok).toBe(true);
    if (!armorResult.ok) {
      return;
    }

    const manualResult = equipHeroEquipment(staticData, {
      progress: armorResult.progress,
      heroId: "iron_fist_initiate",
      equipmentId: "fortress_guard_protocol"
    });

    expect(manualResult.ok).toBe(true);
    if (!manualResult.ok) {
      return;
    }

    const withoutSetData: StaticGameData = {
      ...staticData,
      equipmentSets: []
    };
    const withoutSetTeam = buildPlayerTeamForStage(
      withoutSetData,
      manualResult.progress,
      "greenline_approach_1"
    );
    const withSetTeam = buildPlayerTeamForStage(
      staticData,
      manualResult.progress,
      "greenline_approach_1"
    );

    expect(withoutSetTeam.ok).toBe(true);
    expect(withSetTeam.ok).toBe(true);
    if (!withoutSetTeam.ok || !withSetTeam.ok) {
      return;
    }

    const withoutSetHero = withoutSetTeam.team.combatants.find(
      (combatant) => combatant.definitionId === "iron_fist_initiate"
    );
    const withSetHero = withSetTeam.team.combatants.find(
      (combatant) => combatant.definitionId === "iron_fist_initiate"
    );
    const withoutSetStats = withoutSetHero?.statsOverride ?? staticData.heroes[0].baseStats;
    const withSetStats = withSetHero?.statsOverride ?? staticData.heroes[0].baseStats;

    expect(withSetStats.kineticDefense).toBeGreaterThan(
      withoutSetStats.kineticDefense
    );
    expect(withSetStats.overloadResist).toBeGreaterThan(
      withoutSetStats.overloadResist
    );
    expect(calculateCombatPower(withSetStats)).toBeGreaterThan(
      calculateCombatPower(withoutSetStats)
    );
  });
});
