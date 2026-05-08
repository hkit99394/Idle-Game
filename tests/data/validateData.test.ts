import { describe, expect, it } from "vitest";
import { validateStaticGameData } from "../../core";
import type { StaticGameData } from "../../core";
import enemies from "../../data/enemies.json" with { type: "json" };
import formations from "../../data/formations.json" with { type: "json" };
import heroes from "../../data/heroes.json" with { type: "json" };
import medicines from "../../data/medicines.json" with { type: "json" };
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
  statusEffects: statusEffects as StaticGameData["statusEffects"],
  medicines: medicines as StaticGameData["medicines"]
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

  it("rejects broken stage progression references", () => {
    const invalidData: StaticGameData = {
      ...staticData,
      stages: staticData.stages.map((stage) =>
        stage.id === "bamboo_road_10"
          ? { ...stage, nextStageId: "missing_stage" }
          : stage
      )
    };

    expect(validateStaticGameData(invalidData)).toContain(
      "Stage bamboo_road_10 references missing next stage missing_stage"
    );
  });

  it("rejects region stage order mismatches", () => {
    const invalidData: StaticGameData = {
      ...staticData,
      stages: staticData.stages.map((stage) =>
        stage.id === "demon_cult_outpost_1" ? { ...stage, index: 2 } : stage
      )
    };

    expect(validateStaticGameData(invalidData)).toContain(
      "Stage demon_cult_outpost_1 index must match its region order"
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
              effects: {
                typoDamagePerSecond: 0.1
              }
            }
          : status
      ) as StaticGameData["statusEffects"]
    };

    expect(validateStaticGameData(invalidData)).toEqual(
      expect.arrayContaining([
        "Status poison category must be supported",
        "Status poison dispel tag unknown_tag must be supported",
        "Status poison tickIntervalSeconds requires outerDamagePerSecond",
        "Status poison effect typoDamagePerSecond must be supported"
      ])
    );
  });

  it("rejects malformed medicine definitions", () => {
    const invalidData: StaticGameData = {
      ...staticData,
      medicines: staticData.medicines.map((medicine) =>
        medicine.id === "clear_heart_pill"
          ? {
              ...medicine,
              maxCarry: 0,
              effects: [
                {
                  type: "cleanse_status",
                  dispelTags: ["bad_tag"],
                  maxCount: 0
                },
                {
                  type: "unknown_effect",
                  value: 1
                }
              ]
            }
          : medicine
      ) as StaticGameData["medicines"]
    };

    expect(validateStaticGameData(invalidData)).toEqual(
      expect.arrayContaining([
        "Medicine clear_heart_pill maxCarry must be a positive integer",
        "Medicine clear_heart_pill dispel tag bad_tag must be supported",
        "Medicine clear_heart_pill cleanse maxCount must be a positive integer",
        "Medicine clear_heart_pill effect unknown_effect must be supported"
      ])
    );
  });
});
