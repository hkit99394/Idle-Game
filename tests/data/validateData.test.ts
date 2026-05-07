import { describe, expect, it } from "vitest";
import { validateStaticGameData } from "../../core";
import type { StaticGameData } from "../../core";
import enemies from "../../data/enemies.json" with { type: "json" };
import formations from "../../data/formations.json" with { type: "json" };
import heroes from "../../data/heroes.json" with { type: "json" };
import mastery from "../../data/mastery.json" with { type: "json" };
import regions from "../../data/regions.json" with { type: "json" };
import skills from "../../data/skills.json" with { type: "json" };
import stages from "../../data/stages.json" with { type: "json" };
import statusEffects from "../../data/statusEffects.json" with { type: "json" };
import upgrades from "../../data/upgrades.json" with { type: "json" };

const staticData: StaticGameData = {
  heroes: heroes as StaticGameData["heroes"],
  skills: skills as StaticGameData["skills"],
  enemies: enemies as StaticGameData["enemies"],
  regions: regions as StaticGameData["regions"],
  stages: stages as StaticGameData["stages"],
  upgrades: upgrades as StaticGameData["upgrades"],
  mastery: mastery as StaticGameData["mastery"],
  formations: formations as StaticGameData["formations"],
  statusEffects: statusEffects as StaticGameData["statusEffects"]
};

describe("static game data validation", () => {
  it("accepts the starter MVP data set", () => {
    expect(validateStaticGameData(staticData)).toEqual([]);
  });

  it("rejects boss stages marked as offline farm targets", () => {
    const invalidData: StaticGameData = {
      ...staticData,
      stages: staticData.stages.map((stage) =>
        stage.id === "bamboo_road_10" ? { ...stage, canFarmOffline: true } : stage
      )
    };

    expect(validateStaticGameData(invalidData)).toContain(
      "Boss stage bamboo_road_10 cannot be marked for offline farming"
    );
  });

  it("rejects skills that reference missing statuses", () => {
    const invalidData: StaticGameData = {
      ...staticData,
      skills: staticData.skills.map((skill) =>
        skill.id === "meridian_shock"
          ? {
              ...skill,
              effects: [
                {
                  type: "apply_status",
                  statusId: "missing_status",
                  chance: 0.5
                }
              ]
            }
          : skill
      )
    };

    expect(validateStaticGameData(invalidData)).toContain(
      "Skill meridian_shock references missing status missing_status"
    );
  });

  it("rejects malformed status definitions", () => {
    const invalidData: StaticGameData = {
      ...staticData,
      statusEffects: staticData.statusEffects.map((status) =>
        status.id === "poison"
          ? {
              ...status,
              category: "curse",
              dispelTags: ["unknown_tag"],
              tickIntervalSeconds: 2,
              effects: {}
            }
          : status
      ) as StaticGameData["statusEffects"]
    };

    expect(validateStaticGameData(invalidData)).toEqual(
      expect.arrayContaining([
        "Status poison category must be supported",
        "Status poison dispel tag unknown_tag must be supported",
        "Status poison tickIntervalSeconds requires outerDamagePerSecond"
      ])
    );
  });
});
