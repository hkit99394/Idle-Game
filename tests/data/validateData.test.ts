import { describe, expect, it } from "vitest";
import { validateStaticGameData } from "../../core";
import type { StaticGameData } from "../../core";
import { staticData } from "../helpers/staticData";

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

  it("rejects enemies without valid level data", () => {
    const invalidData: StaticGameData = {
      ...staticData,
      enemies: staticData.enemies.map((enemy) =>
        enemy.id === "bamboo_bandit" ? { ...enemy, level: 0 } : enemy
      )
    };

    expect(validateStaticGameData(invalidData)).toContain(
      "Enemy bamboo_bandit level must be an integer >= 1"
    );
  });

  it("rejects invalid combat roles and targeting rules", () => {
    const invalidData = {
      ...staticData,
      heroes: staticData.heroes.map((hero) =>
        hero.id === "iron_fist_disciple"
          ? { ...hero, combatRole: "duelist" }
          : hero
      ),
      enemies: staticData.enemies.map((enemy) =>
        enemy.id === "bamboo_bandit"
          ? { ...enemy, combatRole: "ambusher" }
          : enemy
      ),
      skills: staticData.skills.map((skill) =>
        skill.id === "iron_fist_combo"
          ? { ...skill, targetRule: "nearest" }
          : skill
      )
    } as StaticGameData;

    expect(validateStaticGameData(invalidData)).toEqual(
      expect.arrayContaining([
        "Hero iron_fist_disciple combatRole must be one of tank, breaker, striker, support",
        "Enemy bamboo_bandit combatRole must be one of tank, breaker, striker, support",
        "Skill iron_fist_combo targetRule must be one of first_living, weakest_hp, highest_cp, inner_broken"
      ])
    );
  });

  it("rejects missing style and skill upgrade references", () => {
    const invalidData: StaticGameData = {
      ...staticData,
      heroes: staticData.heroes.map((hero) =>
        hero.id === "iron_fist_disciple"
          ? {
              ...hero,
              style: "missing_style"
            }
          : hero
      ),
      skillUpgrades: staticData.skillUpgrades.map((upgrade) =>
        upgrade.id === "iron_fist_combo_refinement"
          ? {
              ...upgrade,
              skillId: "missing_skill"
            }
          : upgrade
      )
    } as StaticGameData;

    expect(validateStaticGameData(invalidData)).toEqual(
      expect.arrayContaining([
        "Hero iron_fist_disciple references missing style missing_style",
        "Skill upgrade iron_fist_combo_refinement references missing skill missing_skill"
      ])
    );
  });

  it("rejects invalid enemy formation slots", () => {
    const invalidData = {
      ...staticData,
      stages: staticData.stages.map((stage) =>
        stage.id === "bamboo_road_1"
          ? {
              ...stage,
              enemyTeam: {
                ...stage.enemyTeam,
                formation: {
                  flank: [0]
                }
              }
            }
          : stage
      )
    } as StaticGameData;

    expect(validateStaticGameData(invalidData)).toContain(
      "Stage bamboo_road_1 enemyTeam formation slot flank must be one of front, middle, back"
    );
  });

  it("rejects duplicate enemy formation combatant placement", () => {
    const invalidData: StaticGameData = {
      ...staticData,
      stages: staticData.stages.map((stage) =>
        stage.id === "bamboo_road_1"
          ? {
              ...stage,
              enemyTeam: {
                ...stage.enemyTeam,
                formation: {
                  front: [0],
                  middle: [0]
                }
              }
            }
          : stage
      )
    };

    expect(validateStaticGameData(invalidData)).toContain(
      "Stage bamboo_road_1 enemyTeam formation places combatant index 0 more than once"
    );
  });

  it("rejects out-of-range enemy formation combatant indexes", () => {
    const invalidData: StaticGameData = {
      ...staticData,
      stages: staticData.stages.map((stage) =>
        stage.id === "bamboo_road_1"
          ? {
              ...stage,
              enemyTeam: {
                ...stage.enemyTeam,
                formation: {
                  front: [99]
                }
              }
            }
          : stage
      )
    };

    expect(validateStaticGameData(invalidData)).toContain(
      "Stage bamboo_road_1 enemyTeam formation slot front has invalid combatant index 99"
    );
  });

  it("rejects invalid reusable formation slots", () => {
    const invalidData = {
      ...staticData,
      formations: staticData.formations.map((formation) =>
        formation.id === "mvp_line"
          ? {
              ...formation,
              slots: ["front", "flank"]
            }
          : formation
      )
    } as StaticGameData;

    expect(validateStaticGameData(invalidData)).toContain(
      "Formation mvp_line slot flank must be one of front, middle, back"
    );
  });
});
