import { describe, expect, it } from "vitest";
import { simulateBattle, SKILL_EFFECT_TYPES } from "../../core";
import type {
  BaseStats,
  EnemyDefinition,
  HeroDefinition,
  SkillDefinition,
  StaticGameData
} from "../../core";
import {
  COMBAT_SKILL_EFFECT_HANDLERS,
  NON_COMBAT_SKILL_EFFECT_TYPES
} from "../../core/combat/effectPipeline";
import { staticData } from "../helpers/staticData";

const baseStats: BaseStats = {
  maxOuterHp: 1000,
  maxInnerQi: 500,
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
  stats: Partial<BaseStats> = {}
): HeroDefinition {
  return {
    ...staticData.heroes[0],
    id,
    name: id,
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
  stats: Partial<BaseStats> = {}
): EnemyDefinition {
  return {
    ...staticData.enemies[0],
    id,
    name: id,
    family: "scenario",
    type: "normal",
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

describe("skill effect combat coverage", () => {
  it("covers every validated skill effect as combat-handled or intentionally non-combat", () => {
    const coveredEffectTypes = new Set([
      ...Object.keys(COMBAT_SKILL_EFFECT_HANDLERS),
      ...NON_COMBAT_SKILL_EFFECT_TYPES
    ]);

    expect([...coveredEffectTypes].sort()).toEqual([...SKILL_EFFECT_TYPES].sort());
  });

  it("speed_down reduces the target's future action count", () => {
    const data = withScenarioData({
      skills: [
        {
          id: "scenario_slow",
          name: "Scenario Slow",
          cooldownSeconds: 20,
          outerMultiplier: 0,
          innerMultiplier: 0,
          targetRule: "first_living",
          effects: [{ type: "speed_down", value: 0.5, durationSeconds: 10 }]
        },
        {
          id: "scenario_empty",
          name: "Scenario Empty",
          cooldownSeconds: 20,
          outerMultiplier: 0,
          innerMultiplier: 0,
          targetRule: "first_living",
          effects: []
        },
        {
          id: "scenario_enemy_hit",
          name: "Scenario Enemy Hit",
          cooldownSeconds: 0.1,
          outerMultiplier: 1,
          innerMultiplier: 0,
          targetRule: "first_living",
          effects: []
        }
      ],
      heroes: [
        createHero("scenario_slow_user", ["scenario_slow"]),
        createHero("scenario_plain_user", ["scenario_empty"])
      ],
      enemies: [
        createEnemy("scenario_speed_target", ["scenario_enemy_hit"], {
          outerAttack: 20
        })
      ]
    });
    const enemyTeam = {
      id: "enemy" as const,
      combatants: [{ kind: "enemy" as const, definitionId: "scenario_speed_target" }]
    };
    const slowed = simulateBattle(data, {
      playerTeam: {
        id: "player",
        combatants: [{ kind: "hero", definitionId: "scenario_slow_user" }]
      },
      enemyTeam,
      maxDurationSeconds: 5
    });
    const plain = simulateBattle(data, {
      playerTeam: {
        id: "player",
        combatants: [{ kind: "hero", definitionId: "scenario_plain_user" }]
      },
      enemyTeam,
      maxDurationSeconds: 5
    });
    const slowedEnemyAttacks = slowed.events.filter(
      (event) => event.type === "attack" && event.sourceId.startsWith("enemy_")
    );
    const plainEnemyAttacks = plain.events.filter(
      (event) => event.type === "attack" && event.sourceId.startsWith("enemy_")
    );

    expect(slowed.events.some((event) => event.type === "speed_down")).toBe(true);
    expect(slowedEnemyAttacks.length).toBeLessThan(plainEnemyAttacks.length);
  });

  it("inner_defense_down increases later Inner damage against the target", () => {
    const data = withScenarioData({
      skills: [
        {
          id: "scenario_inner_break",
          name: "Scenario Inner Break",
          cooldownSeconds: 0.1,
          outerMultiplier: 0,
          innerMultiplier: 1,
          targetRule: "first_living",
          effects: [
            { type: "inner_defense_down", value: 0.5, durationSeconds: 10 }
          ]
        }
      ],
      heroes: [
        createHero("scenario_inner_breaker", ["scenario_inner_break"], {
          innerAttack: 100
        })
      ],
      enemies: [
        createEnemy("scenario_inner_defender", [], {
          maxInnerQi: 1000,
          innerDefense: 100,
          speed: 0
        })
      ]
    });

    const result = simulateBattle(data, {
      playerTeam: {
        id: "player",
        combatants: [{ kind: "hero", definitionId: "scenario_inner_breaker" }]
      },
      enemyTeam: {
        id: "enemy",
        combatants: [{ kind: "enemy", definitionId: "scenario_inner_defender" }]
      },
      maxDurationSeconds: 2.2
    });
    const playerAttacks = result.events.filter(
      (event) => event.type === "attack" && event.sourceId.startsWith("player_")
    ) as Array<Extract<(typeof result.events)[number], { type: "attack" }>>;

    expect(result.events.some((event) => event.type === "inner_defense_down")).toBe(
      true
    );
    expect(playerAttacks[1]?.innerDamage).toBeGreaterThan(
      playerAttacks[0]?.innerDamage ?? 0
    );
  });

  it("apply_status stores active statuses and advances their combat effects", () => {
    const data = withScenarioData({
      skills: [
        {
          id: "scenario_poison",
          name: "Scenario Poison",
          cooldownSeconds: 20,
          outerMultiplier: 0,
          innerMultiplier: 0,
          targetRule: "first_living",
          effects: [
            {
              type: "apply_status",
              statusId: "poison",
              chance: 1,
              durationSeconds: 4,
              stacks: 1
            }
          ]
        }
      ],
      heroes: [createHero("scenario_poisoner", ["scenario_poison"])],
      enemies: [
        createEnemy("scenario_poison_target", [], {
          maxOuterHp: 1000,
          speed: 0
        })
      ]
    });

    const result = simulateBattle(data, {
      playerTeam: {
        id: "player",
        combatants: [{ kind: "hero", definitionId: "scenario_poisoner" }]
      },
      enemyTeam: {
        id: "enemy",
        combatants: [{ kind: "enemy", definitionId: "scenario_poison_target" }]
      },
      maxDurationSeconds: 4.5
    });
    const target = result.finalEnemyTeam[0];

    expect(result.events.some((event) => event.type === "status_apply")).toBe(true);
    expect(result.events.some((event) => event.type === "status_tick")).toBe(true);
    expect(target.activeStatuses.map((status) => status.statusId)).toContain(
      "poison"
    );
    expect(target.outerHp).toBeLessThan(target.maxOuterHp);
  });

  it("apply_status respects deterministic application chance", () => {
    const data = withScenarioData({
      skills: [
        {
          id: "scenario_low_chance",
          name: "Scenario Low Chance",
          cooldownSeconds: 20,
          outerMultiplier: 0,
          innerMultiplier: 0,
          targetRule: "first_living",
          effects: [
            {
              type: "apply_status",
              statusId: "poison",
              chance: 0.01,
              durationSeconds: 4,
              stacks: 1
            }
          ]
        }
      ],
      heroes: [createHero("scenario_low_chance_user", ["scenario_low_chance"])],
      enemies: [
        createEnemy("scenario_low_chance_target", [], {
          maxOuterHp: 1000,
          speed: 0
        })
      ]
    });

    const result = simulateBattle(data, {
      playerTeam: {
        id: "player",
        combatants: [{ kind: "hero", definitionId: "scenario_low_chance_user" }]
      },
      enemyTeam: {
        id: "enemy",
        combatants: [{ kind: "enemy", definitionId: "scenario_low_chance_target" }]
      },
      maxDurationSeconds: 2
    });
    const target = result.finalEnemyTeam[0];

    expect(result.events.some((event) => event.type === "status_apply")).toBe(false);
    expect(target.activeStatuses).toEqual([]);
    expect(target.outerHp).toBe(target.maxOuterHp);
  });

  it("cleanse removes data-driven debuffs applied through skill effects", () => {
    const data = withScenarioData({
      skills: [
        {
          id: "scenario_poison",
          name: "Scenario Poison",
          cooldownSeconds: 20,
          outerMultiplier: 0,
          innerMultiplier: 0,
          targetRule: "first_living",
          effects: [
            {
              type: "apply_status",
              statusId: "poison",
              chance: 1,
              durationSeconds: 4,
              stacks: 1
            }
          ]
        },
        {
          id: "scenario_cleanse_ally",
          name: "Scenario Cleanse Ally",
          cooldownSeconds: 20,
          outerMultiplier: 0,
          innerMultiplier: 0,
          targetRule: "first_living",
          effects: [
            {
              type: "cleanse",
              value: 1,
              target: "wounded_or_armor_broken_ally"
            }
          ]
        }
      ],
      heroes: [
        createHero("scenario_poisoned_ally", ["basic_strike"], {
          speed: 0
        }),
        createHero("scenario_cleanser", ["scenario_cleanse_ally"], {
          speed: 0
        })
      ],
      enemies: [
        createEnemy("scenario_poisoner", ["scenario_poison"], {
          speed: 100
        })
      ]
    });

    const result = simulateBattle(data, {
      playerTeam: {
        id: "player",
        combatants: [
          { kind: "hero", definitionId: "scenario_poisoned_ally" },
          { kind: "hero", definitionId: "scenario_cleanser" }
        ]
      },
      enemyTeam: {
        id: "enemy",
        combatants: [{ kind: "enemy", definitionId: "scenario_poisoner" }]
      },
      maxDurationSeconds: 2.1
    });
    const cleanse = result.events.find((event) => event.type === "cleanse");

    expect(result.events.some((event) => event.type === "status_apply")).toBe(true);
    expect(cleanse).toMatchObject({
      type: "cleanse",
      targetId: "player_scenario_poisoned_ally_1",
      statusesRemoved: ["poison"]
    });
    expect(result.finalPlayerTeam[0]?.activeStatuses).toEqual([]);
  });
});
