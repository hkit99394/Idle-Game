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
    progress.maps.bamboo_road.highestClearedStageIndex = 1;

    const firstClear = applyStageClearRewards(staticData, {
      progress,
      stageId: "bamboo_road_2"
    });

    expect(firstClear.ok).toBe(true);
    if (!firstClear.ok) {
      return;
    }

    expect(firstClear.equipmentRewards).toEqual([
      {
        equipmentId: "training_wraps",
        quantity: 1
      }
    ]);
    expect(
      getEquipmentInventoryCount(firstClear.progress, "training_wraps")
    ).toBe(1);

    const secondClear = applyStageClearRewards(staticData, {
      progress: firstClear.progress,
      stageId: "bamboo_road_2"
    });

    expect(secondClear.ok).toBe(true);
    if (!secondClear.ok) {
      return;
    }

    expect(
      getEquipmentInventoryCount(secondClear.progress, "training_wraps")
    ).toBe(2);
  });

  it("equips compatible gear and increases hero CP through derived stats", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.equipment = {
      inventory: {
        training_wraps: 1
      },
      equipped: {}
    };
    const beforeTeam = buildPlayerTeamForStage(
      staticData,
      progress,
      "bamboo_road_1"
    );

    expect(beforeTeam.ok).toBe(true);
    if (!beforeTeam.ok) {
      return;
    }

    const beforeHero = beforeTeam.team.combatants.find(
      (combatant) => combatant.definitionId === "iron_fist_disciple"
    );
    const beforeCp = calculateCombatPower(beforeHero?.statsOverride ?? staticData.heroes[0].baseStats);
    const equipResult = equipHeroEquipment(staticData, {
      progress,
      heroId: "iron_fist_disciple",
      equipmentId: "training_wraps"
    });

    expect(equipResult.ok).toBe(true);
    if (!equipResult.ok) {
      return;
    }

    const afterTeam = buildPlayerTeamForStage(
      staticData,
      equipResult.progress,
      "bamboo_road_1"
    );

    expect(afterTeam.ok).toBe(true);
    if (!afterTeam.ok) {
      return;
    }

    const afterHero = afterTeam.team.combatants.find(
      (combatant) => combatant.definitionId === "iron_fist_disciple"
    );
    const afterCp = calculateCombatPower(afterHero?.statsOverride ?? staticData.heroes[0].baseStats);

    expect(
      equipResult.progress.equipment?.equipped.iron_fist_disciple?.weapon
    ).toBe("training_wraps");
    expect(afterCp).toBeGreaterThan(beforeCp);
  });

  it("rejects incompatible gear and unavailable duplicate copies", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.equipment = {
      inventory: {
        training_wraps: 1,
        woven_travel_robe: 1
      },
      equipped: {}
    };

    expect(
      equipHeroEquipment(staticData, {
        progress,
        heroId: "azure_palm_monk",
        equipmentId: "training_wraps"
      })
    ).toMatchObject({
      ok: false,
      reason: "incompatible_style"
    });

    const firstEquip = equipHeroEquipment(staticData, {
      progress,
      heroId: "iron_fist_disciple",
      equipmentId: "woven_travel_robe"
    });

    expect(firstEquip.ok).toBe(true);
    if (!firstEquip.ok) {
      return;
    }

    expect(
      equipHeroEquipment(staticData, {
        progress: firstEquip.progress,
        heroId: "azure_palm_monk",
        equipmentId: "woven_travel_robe"
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
        iron_thread_armor: 1
      },
      equipped: {}
    };
    const equipResult = equipHeroEquipment(staticData, {
      progress,
      heroId: "iron_fist_disciple",
      equipmentId: "iron_thread_armor"
    });

    expect(equipResult.ok).toBe(true);
    if (!equipResult.ok) {
      return;
    }

    const withoutAffixData: StaticGameData = {
      ...staticData,
      equipment: staticData.equipment.map((equipment) =>
        equipment.id === "iron_thread_armor"
          ? { ...equipment, affixes: [] }
          : equipment
      )
    };
    const withoutAffixTeam = buildPlayerTeamForStage(
      withoutAffixData,
      equipResult.progress,
      "bamboo_road_1"
    );
    const withAffixTeam = buildPlayerTeamForStage(
      staticData,
      equipResult.progress,
      "bamboo_road_1"
    );

    expect(withoutAffixTeam.ok).toBe(true);
    expect(withAffixTeam.ok).toBe(true);
    if (!withoutAffixTeam.ok || !withAffixTeam.ok) {
      return;
    }

    const withoutAffixHero = withoutAffixTeam.team.combatants.find(
      (combatant) => combatant.definitionId === "iron_fist_disciple"
    );
    const withAffixHero = withAffixTeam.team.combatants.find(
      (combatant) => combatant.definitionId === "iron_fist_disciple"
    );
    const withoutAffixStats = withoutAffixHero?.statsOverride ?? staticData.heroes[0].baseStats;
    const withAffixStats = withAffixHero?.statsOverride ?? staticData.heroes[0].baseStats;

    expect(withAffixStats.outerDefense).toBeGreaterThan(
      withoutAffixStats.outerDefense
    );
    expect(calculateCombatPower(withAffixStats)).toBeGreaterThan(
      calculateCombatPower(withoutAffixStats)
    );
  });

  it("applies equipment set bonuses after enough pieces are equipped", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.equipment = {
      inventory: {
        iron_thread_armor: 1,
        fortress_guard_manual: 1
      },
      equipped: {}
    };
    const armorResult = equipHeroEquipment(staticData, {
      progress,
      heroId: "iron_fist_disciple",
      equipmentId: "iron_thread_armor"
    });

    expect(armorResult.ok).toBe(true);
    if (!armorResult.ok) {
      return;
    }

    const manualResult = equipHeroEquipment(staticData, {
      progress: armorResult.progress,
      heroId: "iron_fist_disciple",
      equipmentId: "fortress_guard_manual"
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
      "bamboo_road_1"
    );
    const withSetTeam = buildPlayerTeamForStage(
      staticData,
      manualResult.progress,
      "bamboo_road_1"
    );

    expect(withoutSetTeam.ok).toBe(true);
    expect(withSetTeam.ok).toBe(true);
    if (!withoutSetTeam.ok || !withSetTeam.ok) {
      return;
    }

    const withoutSetHero = withoutSetTeam.team.combatants.find(
      (combatant) => combatant.definitionId === "iron_fist_disciple"
    );
    const withSetHero = withSetTeam.team.combatants.find(
      (combatant) => combatant.definitionId === "iron_fist_disciple"
    );
    const withoutSetStats = withoutSetHero?.statsOverride ?? staticData.heroes[0].baseStats;
    const withSetStats = withSetHero?.statsOverride ?? staticData.heroes[0].baseStats;

    expect(withSetStats.outerDefense).toBeGreaterThan(
      withoutSetStats.outerDefense
    );
    expect(withSetStats.breakResist).toBeGreaterThan(
      withoutSetStats.breakResist
    );
    expect(calculateCombatPower(withSetStats)).toBeGreaterThan(
      calculateCombatPower(withoutSetStats)
    );
  });
});
