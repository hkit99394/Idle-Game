import { describe, expect, it } from "vitest";
import {
  applyStageClearRewards,
  buildPlayerTeamForStage,
  calculateCombatPower,
  createInitialPlayerProgress,
  equipHeroEquipment,
  getEquipmentInventoryCount
} from "../../core";
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
});
