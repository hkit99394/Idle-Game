import { describe, expect, it } from "vitest";
import { staticData } from "../helpers/staticData";

describe("Redline Outpost content", () => {
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

  it("uses at least three status patterns across Redline enemy skills", () => {
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
