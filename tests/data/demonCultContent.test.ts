import { describe, expect, it } from "vitest";
import type { StaticGameData } from "../../core";
import assignments from "../../data/assignments.json" with { type: "json" };
import enemies from "../../data/enemies.json" with { type: "json" };
import equipment from "../../data/equipment.json" with { type: "json" };
import equipmentSets from "../../data/equipmentSets.json" with { type: "json" };
import formations from "../../data/formations.json" with { type: "json" };
import heroes from "../../data/heroes.json" with { type: "json" };
import medicines from "../../data/medicines.json" with { type: "json" };
import mastery from "../../data/mastery.json" with { type: "json" };
import regions from "../../data/regions.json" with { type: "json" };
import skillUpgrades from "../../data/skillUpgrades.json" with { type: "json" };
import skills from "../../data/skills.json" with { type: "json" };
import stages from "../../data/stages.json" with { type: "json" };
import statusEffects from "../../data/statusEffects.json" with { type: "json" };
import styles from "../../data/styles.json" with { type: "json" };
import upgrades from "../../data/upgrades.json" with { type: "json" };

const staticData: StaticGameData = {
  assignments: assignments as StaticGameData["assignments"],
  heroes: heroes as StaticGameData["heroes"],
  skills: skills as StaticGameData["skills"],
  enemies: enemies as StaticGameData["enemies"],
  equipment: equipment as StaticGameData["equipment"],
  equipmentSets: equipmentSets as StaticGameData["equipmentSets"],
  regions: regions as StaticGameData["regions"],
  stages: stages as StaticGameData["stages"],
  upgrades: upgrades as StaticGameData["upgrades"],
  skillUpgrades: skillUpgrades as StaticGameData["skillUpgrades"],
  mastery: mastery as StaticGameData["mastery"],
  formations: formations as StaticGameData["formations"],
  styles: styles as StaticGameData["styles"],
  statusEffects: statusEffects as StaticGameData["statusEffects"],
  medicines: medicines as StaticGameData["medicines"]
};

describe("Demon Cult Outpost content", () => {
  it("connects after the Lotus boss as a seven-stage region", () => {
    const lotusBoss = staticData.stages.find(
      (stage) => stage.id === "lotus_monastery_7"
    );
    const demonRegion = staticData.regions.find(
      (region) => region.id === "demon_cult_outpost"
    );
    const demonStages = staticData.stages.filter(
      (stage) => stage.regionId === "demon_cult_outpost"
    );

    expect(lotusBoss?.nextStageId).toBe("demon_cult_outpost_1");
    expect(demonRegion).toMatchObject({
      unlockCondition: {
        type: "stage_cleared",
        stageId: "lotus_monastery_7"
      }
    });
    expect(demonRegion?.stageIds).toHaveLength(7);
    expect(demonStages.map((stage) => stage.index)).toEqual([
      1, 2, 3, 4, 5, 6, 7
    ]);
    expect(demonStages.slice(0, -1).every((stage) => stage.canFarmOffline)).toBe(
      true
    );
    expect(demonStages.at(-1)).toMatchObject({
      id: "demon_cult_outpost_7",
      isBoss: true,
      canFarmOffline: false
    });
  });

  it("uses at least three status patterns across Demon Cult enemy skills", () => {
    const skillById = new Map(
      staticData.skills.map((skill) => [skill.id, skill])
    );
    const demonEnemyIds = new Set(
      staticData.stages
        .filter((stage) => stage.regionId === "demon_cult_outpost")
        .flatMap((stage) => stage.enemyTeam.combatantIds)
    );
    const demonEnemies = staticData.enemies.filter((enemy) =>
      demonEnemyIds.has(enemy.id)
    );
    const statusIds = new Set(
      demonEnemies.flatMap((enemy) =>
        enemy.skillIds.flatMap((skillId) =>
          (skillById.get(skillId)?.effects ?? [])
            .filter((effect) => effect.type === "apply_status")
            .map((effect) => effect.statusId)
        )
      )
    );

    expect(statusIds).toEqual(
      new Set([
        "poison",
        "vulnerable",
        "qi_suppression",
        "wound",
        "burning_blood"
      ])
    );
  });
});
