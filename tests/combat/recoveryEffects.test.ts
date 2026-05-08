import { describe, expect, it } from "vitest";
import { simulateBattle } from "../../core";
import type {
  BaseStats,
  EnemyDefinition,
  HeroDefinition,
  SkillDefinition,
  StaticGameData
} from "../../core";
import { staticData } from "../helpers/staticData";

const baseStats: BaseStats = {
  maxOuterHp: 240,
  maxInnerQi: 180,
  outerAttack: 0,
  innerAttack: 0,
  outerDefense: 0,
  innerDefense: 0,
  speed: 100,
  critChance: 0,
  critDamage: 1,
  breakPower: 0,
  breakResist: 0,
  innerRecoveryRate: 0,
  statusAccuracy: 0,
  statusResistance: 0
};

function createHero(
  id: string,
  skillIds: string[],
  stats: Partial<BaseStats> = {},
  combatRole: HeroDefinition["combatRole"] = "support"
): HeroDefinition {
  return {
    ...staticData.heroes[0],
    id,
    name: id,
    combatRole,
    skillIds,
    baseStats: {
      ...baseStats,
      ...stats
    }
  };
}

function createEnemy(
  id: string,
  skillIds: string[],
  stats: Partial<BaseStats> = {},
  combatRole: EnemyDefinition["combatRole"] = "striker"
): EnemyDefinition {
  return {
    ...staticData.enemies[0],
    id,
    name: id,
    family: "scenario",
    type: "normal",
    combatRole,
    level: 1,
    skillIds,
    baseStats: {
      ...baseStats,
      ...stats
    }
  };
}

function withScenarioData(input: {
  skills: SkillDefinition[];
  heroes: HeroDefinition[];
  enemies: EnemyDefinition[];
}): StaticGameData {
  return {
    ...staticData,
    skills: [...staticData.skills, ...input.skills],
    heroes: [...staticData.heroes, ...input.heroes],
    enemies: [...staticData.enemies, ...input.enemies]
  };
}

describe("recovery and wound effects", () => {
  it("heals the damaged ally selected by lowest Outer HP", () => {
    const data = withScenarioData({
      skills: [
        {
          id: "scenario_ally_heal",
          name: "Scenario Ally Heal",
          cooldownSeconds: 1,
          outerMultiplier: 0,
          innerMultiplier: 0,
          targetRule: "first_living",
          effects: [
            {
              type: "outer_heal_percent",
              value: 0.25,
              target: "lowest_outer_hp_ally"
            }
          ]
        }
      ],
      heroes: [
        createHero("scenario_recovery_tank", [], {
          maxOuterHp: 240,
          speed: 0
        }, "tank"),
        createHero("scenario_ally_healer", ["scenario_ally_heal"])
      ],
      enemies: [
        createEnemy("scenario_outer_attacker", [], {
          outerAttack: 70,
          speed: 300
        })
      ]
    });

    const result = simulateBattle(data, {
      playerTeam: {
        id: "player",
        combatants: [
          { kind: "hero", definitionId: "scenario_recovery_tank" },
          {
            kind: "hero",
            definitionId: "scenario_ally_healer",
            formationSlot: "back"
          }
        ]
      },
      enemyTeam: {
        id: "enemy",
        combatants: [{ kind: "enemy", definitionId: "scenario_outer_attacker" }]
      },
      maxDurationSeconds: 2
    });

    const heal = result.events.find((event) => event.type === "heal");

    expect(heal).toMatchObject({
      type: "heal",
      sourceId: "player_scenario_ally_healer_2",
      targetId: "player_scenario_recovery_tank_1"
    });
    expect(heal?.outerHealing).toBeGreaterThan(0);
    expect(result.metrics.playerOuterHealing).toBeGreaterThan(0);
  });

  it("records overheal when a full HP recovery has no effective healing", () => {
    const data = withScenarioData({
      skills: [
        {
          id: "scenario_full_heal",
          name: "Scenario Full Heal",
          cooldownSeconds: 1,
          outerMultiplier: 0,
          innerMultiplier: 0,
          targetRule: "first_living",
          effects: [{ type: "outer_heal_percent", value: 0.2 }]
        }
      ],
      heroes: [
        createHero("scenario_full_healer", ["scenario_full_heal"], {
          speed: 300
        })
      ],
      enemies: [createEnemy("scenario_passive_enemy", [], { speed: 0 })]
    });

    const result = simulateBattle(data, {
      playerTeam: {
        id: "player",
        combatants: [{ kind: "hero", definitionId: "scenario_full_healer" }]
      },
      enemyTeam: {
        id: "enemy",
        combatants: [{ kind: "enemy", definitionId: "scenario_passive_enemy" }]
      },
      maxDurationSeconds: 0.6
    });
    const heal = result.events.find((event) => event.type === "heal");

    expect(heal).toMatchObject({
      type: "heal",
      outerHealing: 0
    });
    expect(heal?.overhealing).toBeGreaterThan(0);
    expect(result.metrics.playerOverhealing).toBeGreaterThan(0);
  });

  it("restores damaged Inner Qi without exceeding the max bar", () => {
    const data = withScenarioData({
      skills: [
        {
          id: "scenario_inner_heal",
          name: "Scenario Inner Heal",
          cooldownSeconds: 1,
          outerMultiplier: 0,
          innerMultiplier: 0,
          targetRule: "first_living",
          effects: [
            {
              type: "inner_heal_percent",
              value: 0.3,
              target: "lowest_inner_qi_ally"
            }
          ]
        },
        {
          id: "scenario_inner_hit",
          name: "Scenario Inner Hit",
          cooldownSeconds: 1,
          outerMultiplier: 0,
          innerMultiplier: 1,
          targetRule: "first_living",
          effects: []
        }
      ],
      heroes: [
        createHero("scenario_inner_tank", [], {
          maxInnerQi: 180,
          speed: 0
        }, "tank"),
        createHero("scenario_inner_healer", ["scenario_inner_heal"])
      ],
      enemies: [
        createEnemy("scenario_inner_attacker", ["scenario_inner_hit"], {
          innerAttack: 70,
          speed: 300
        })
      ]
    });

    const result = simulateBattle(data, {
      playerTeam: {
        id: "player",
        combatants: [
          { kind: "hero", definitionId: "scenario_inner_tank" },
          {
            kind: "hero",
            definitionId: "scenario_inner_healer",
            formationSlot: "back"
          }
        ]
      },
      enemyTeam: {
        id: "enemy",
        combatants: [{ kind: "enemy", definitionId: "scenario_inner_attacker" }]
      },
      maxDurationSeconds: 2
    });
    const heal = result.events
      .filter((event) => event.type === "heal")
      .find((event) => event.innerQiRestored > 0);

    expect(heal).toMatchObject({
      type: "heal",
      targetId: "player_scenario_inner_tank_1"
    });
    expect(heal?.innerQiRestored).toBeGreaterThan(0);
    expect(result.finalPlayerTeam[0].innerQi).toBeLessThanOrEqual(
      result.finalPlayerTeam[0].maxInnerQi
    );
  });

  it("ticks regeneration deterministically over its duration", () => {
    const data = withScenarioData({
      skills: [
        {
          id: "scenario_regenerate",
          name: "Scenario Regenerate",
          cooldownSeconds: 10,
          outerMultiplier: 0,
          innerMultiplier: 0,
          targetRule: "first_living",
          effects: [
            {
              type: "outer_regeneration_percent",
              value: 0.1,
              durationSeconds: 3
            }
          ]
        }
      ],
      heroes: [
        createHero("scenario_regenerator", ["scenario_regenerate"], {
          speed: 100
        })
      ],
      enemies: [
        createEnemy("scenario_regen_attacker", [], {
          outerAttack: 45,
          speed: 300
        })
      ]
    });

    const result = simulateBattle(data, {
      playerTeam: {
        id: "player",
        combatants: [{ kind: "hero", definitionId: "scenario_regenerator" }]
      },
      enemyTeam: {
        id: "enemy",
        combatants: [{ kind: "enemy", definitionId: "scenario_regen_attacker" }]
      },
      maxDurationSeconds: 3.2
    });
    const ticks = result.events.filter(
      (event) => event.type === "regeneration_tick"
    );

    expect(result.events.some((event) => event.type === "regeneration")).toBe(true);
    expect(ticks.map((event) => event.time)).toEqual([2, 3]);
    expect(ticks.every((event) => event.outerHealing > 0)).toBe(true);
  });

  it("uses wound to reduce recovery and improve clear time against a healer", () => {
    const data = withScenarioData({
      skills: [
        {
          id: "scenario_plain_strike",
          name: "Scenario Plain Strike",
          cooldownSeconds: 1,
          outerMultiplier: 1,
          innerMultiplier: 0,
          targetRule: "first_living",
          effects: []
        },
        {
          id: "scenario_wounding_strike",
          name: "Scenario Wounding Strike",
          cooldownSeconds: 1,
          outerMultiplier: 1,
          innerMultiplier: 0,
          targetRule: "first_living",
          effects: [
            {
              type: "wound",
              value: 0.75,
              durationSeconds: 4,
              target: "target"
            }
          ]
        },
        {
          id: "scenario_enemy_heal",
          name: "Scenario Enemy Heal",
          cooldownSeconds: 1,
          outerMultiplier: 0,
          innerMultiplier: 0,
          targetRule: "first_living",
          effects: [{ type: "outer_heal_percent", value: 0.2 }]
        }
      ],
      heroes: [
        createHero("scenario_plain_recovery_counter", ["scenario_plain_strike"], {
          outerAttack: 70,
          speed: 100
        }, "striker"),
        createHero("scenario_wound_recovery_counter", ["scenario_wounding_strike"], {
          outerAttack: 70,
          speed: 100
        }, "striker")
      ],
      enemies: [
        createEnemy("scenario_healing_enemy", ["scenario_enemy_heal"], {
          maxOuterHp: 520,
          speed: 100
        }, "support")
      ]
    });

    const plain = simulateBattle(data, {
      playerTeam: {
        id: "player",
        combatants: [
          { kind: "hero", definitionId: "scenario_plain_recovery_counter" }
        ]
      },
      enemyTeam: {
        id: "enemy",
        combatants: [{ kind: "enemy", definitionId: "scenario_healing_enemy" }]
      },
      maxDurationSeconds: 30
    });
    const wounded = simulateBattle(data, {
      playerTeam: {
        id: "player",
        combatants: [
          { kind: "hero", definitionId: "scenario_wound_recovery_counter" }
        ]
      },
      enemyTeam: {
        id: "enemy",
        combatants: [{ kind: "enemy", definitionId: "scenario_healing_enemy" }]
      },
      maxDurationSeconds: 30
    });

    expect(wounded.events.some((event) => event.type === "wound")).toBe(true);
    expect(wounded.metrics.recoveryPreventedByPlayer).toBeGreaterThan(0);
    expect(wounded.durationSeconds).toBeLessThan(plain.durationSeconds);
  });

  it("unlocks a player wound path through White Crane Slash refinement", () => {
    const result = simulateBattle(staticData, {
      playerTeam: {
        id: "player",
        combatants: [
          {
            kind: "hero",
            definitionId: "white_crane_swordsman",
            skillUpgradeLevels: {
              white_crane_slash_refinement: 3
            }
          }
        ]
      },
      enemyTeam: {
        id: "enemy",
        combatants: [{ kind: "enemy", definitionId: "lotus_mender" }]
      },
      maxDurationSeconds: 6
    });

    expect(
      result.events.some(
        (event) =>
          event.type === "wound" &&
          event.sourceId === "player_white_crane_swordsman_1"
      )
    ).toBe(true);
    expect(result.metrics.woundsTriggeredByPlayer).toBeGreaterThan(0);
  });

  it("cleanses wound and armor break without removing positive guard", () => {
    const data = withScenarioData({
      skills: [
        {
          id: "scenario_status_cut",
          name: "Scenario Status Cut",
          cooldownSeconds: 1,
          outerMultiplier: 0,
          innerMultiplier: 0,
          targetRule: "first_living",
          effects: [
            { type: "armor_break", value: 0.4, durationSeconds: 5 },
            { type: "wound", value: 0.4, durationSeconds: 5, target: "target" }
          ]
        },
        {
          id: "scenario_enemy_guard",
          name: "Scenario Enemy Guard",
          cooldownSeconds: 1,
          outerMultiplier: 0,
          innerMultiplier: 0,
          targetRule: "first_living",
          effects: [{ type: "guard", value: 0.3, durationSeconds: 5 }]
        },
        {
          id: "scenario_cleanse",
          name: "Scenario Cleanse",
          cooldownSeconds: 1,
          outerMultiplier: 0,
          innerMultiplier: 0,
          targetRule: "first_living",
          effects: [
            {
              type: "cleanse",
              value: 2,
              target: "wounded_or_armor_broken_ally"
            }
          ]
        }
      ],
      heroes: [
        createHero("scenario_status_applier", ["scenario_status_cut"], {
          speed: 100
        })
      ],
      enemies: [
        createEnemy("scenario_guarded_ally", ["scenario_enemy_guard"], {
          speed: 100
        }, "tank"),
        createEnemy("scenario_cleanser", ["scenario_cleanse"], {
          speed: 100
        }, "support")
      ]
    });

    const result = simulateBattle(data, {
      playerTeam: {
        id: "player",
        combatants: [{ kind: "hero", definitionId: "scenario_status_applier" }]
      },
      enemyTeam: {
        id: "enemy",
        combatants: [
          { kind: "enemy", definitionId: "scenario_guarded_ally" },
          {
            kind: "enemy",
            definitionId: "scenario_cleanser",
            formationSlot: "back"
          }
        ]
      },
      maxDurationSeconds: 1.1
    });
    const cleanse = result.events.find((event) => event.type === "cleanse");
    const guardedAlly = result.finalEnemyTeam.find(
      (combatant) => combatant.definitionId === "scenario_guarded_ally"
    );

    expect(cleanse).toMatchObject({
      type: "cleanse",
      targetId: "enemy_scenario_guarded_ally_1",
      statusesRemoved: ["wound", "armor_break"]
    });
    expect(guardedAlly?.guard).not.toBeNull();
    expect(guardedAlly?.wound).toBeNull();
    expect(guardedAlly?.armorBreak).toBeNull();
  });
});
