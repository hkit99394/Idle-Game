import { describe, expect, it } from "vitest";
import { simulateBattle } from "../../core";
import type { BaseStats, StaticGameData } from "../../core";
import { staticData } from "../helpers/staticData";

const baseStats: BaseStats = {
  maxBodyIntegrity: 1000,
  maxContextStability: 500,
  kineticAttack: 0,
  cognitiveAttack: 0,
  kineticDefense: 0,
  cognitiveDefense: 0,
  speed: 0,
  critChance: 0,
  critDamage: 1,
  breachPower: 0,
  overloadResist: 0,
  contextRebuildRate: 0,
  statusAccuracy: 0,
  statusResistance: 0
};

function createHero(id: string, skillIds: string[], stats: Partial<BaseStats> = {}) {
  return {
    id,
    name: id,
    style: "impact" as const,
    role: "Scenario",
    combatRole: "striker" as const,
    baseStats: {
      ...baseStats,
      ...stats
    },
    skillIds,
    passiveIds: [],
    unlock: { type: "always" as const }
  };
}

function createEnemy(id: string, skillIds: string[], stats: Partial<BaseStats> = {}) {
  return {
    id,
    name: id,
    family: "scenario",
    type: "normal" as const,
    style: "rend" as const,
    combatRole: "striker" as const,
    level: 1,
    baseStats: {
      ...baseStats,
      ...stats
    },
    skillIds,
    traitIds: []
  };
}

function createDefensiveData(): StaticGameData {
  return {
    ...staticData,
    skills: [
      ...staticData.skills,
      {
        id: "scenario_guard_stance",
        name: "Scenario Guard Stance",
        cooldownSeconds: 4,
        outerMultiplier: 0,
        innerMultiplier: 0,
        targetRule: "first_living",
        effects: [{ type: "guard", value: 0.5, durationSeconds: 4 }]
      },
      {
        id: "scenario_protect_stance",
        name: "Scenario Protect Stance",
        cooldownSeconds: 4,
        outerMultiplier: 0,
        innerMultiplier: 0,
        targetRule: "first_living",
        effects: [{ type: "protect", value: 0.5, durationSeconds: 4 }]
      },
      {
        id: "scenario_heavy_strike",
        name: "Scenario Heavy Strike",
        cooldownSeconds: 2,
        outerMultiplier: 1,
        innerMultiplier: 0,
        targetRule: "first_living",
        effects: []
      },
      {
        id: "scenario_highest_cp_strike",
        name: "Scenario Highest CP Strike",
        cooldownSeconds: 2,
        outerMultiplier: 1,
        innerMultiplier: 0,
        targetRule: "highest_cp",
        effects: []
      },
      {
        id: "scenario_armor_break_hit",
        name: "Scenario Armor Break Hit",
        cooldownSeconds: 2,
        outerMultiplier: 1,
        innerMultiplier: 0,
        targetRule: "first_living",
        effects: [{ type: "armor_break", value: 0.5, durationSeconds: 5 }]
      },
      {
        id: "scenario_plain_hit",
        name: "Scenario Plain Hit",
        cooldownSeconds: 2,
        outerMultiplier: 1,
        innerMultiplier: 0,
        targetRule: "first_living",
        effects: []
      }
    ],
    heroes: [
      ...staticData.heroes,
      createHero("scenario_striker", ["scenario_heavy_strike"], {
        kineticAttack: 100
      }),
      createHero("scenario_breaker", ["scenario_armor_break_hit"], {
        kineticAttack: 140
      }),
      createHero("scenario_plain_striker", ["scenario_plain_hit"], {
        kineticAttack: 140
      }),
      createHero("scenario_front_protector", ["scenario_protect_stance"], {
        speed: 100,
        maxBodyIntegrity: 2000
      }),
      createHero("scenario_middle_protector", ["scenario_protect_stance"], {
        speed: 100,
        maxBodyIntegrity: 2000
      }),
      createHero("scenario_front_target", ["baseline_strike"], {
        maxBodyIntegrity: 2000
      }),
      createHero("scenario_middle_target", ["baseline_strike"], {
        maxBodyIntegrity: 2000,
        kineticAttack: 80
      }),
      createHero("scenario_back_target", ["baseline_strike"], {
        maxBodyIntegrity: 2000,
        kineticAttack: 100
      })
    ],
    enemies: [
      ...staticData.enemies,
      createEnemy("scenario_guardian", ["scenario_guard_stance"], {
        speed: 100,
        maxBodyIntegrity: 1000
      }),
      createEnemy("scenario_attacker", ["scenario_highest_cp_strike"], {
        kineticAttack: 100,
        maxBodyIntegrity: 4000
      }),
      createEnemy("scenario_front_attacker", ["scenario_heavy_strike"], {
        kineticAttack: 100,
        speed: 100,
        maxBodyIntegrity: 4000
      }),
      createEnemy("scenario_defender", ["scenario_guard_stance"], {
        speed: 100,
        maxBodyIntegrity: 1200,
        kineticDefense: 80
      })
    ]
  };
}

describe("defensive combat effects", () => {
  it("reduces incoming Outer damage with guard events", () => {
    const data = createDefensiveData();
    const result = simulateBattle(data, {
      playerTeam: {
        id: "player",
        combatants: [{ kind: "hero", definitionId: "scenario_striker" }]
      },
      enemyTeam: {
        id: "enemy",
        combatants: [{ kind: "enemy", definitionId: "scenario_guardian" }]
      },
      maxDurationSeconds: 2.1
    });
    const attack = result.events.find(
      (event) => event.type === "attack" && event.sourceId.startsWith("player_")
    );
    const guardAbsorb = result.events.find((event) => event.type === "guard_absorb");

    expect(attack).toMatchObject({
      type: "attack",
      outerDamage: 50
    });
    expect(guardAbsorb).toMatchObject({
      type: "guard_absorb",
      outerDamagePrevented: 50,
      reduction: 0.5
    });
    expect(result.metrics.guardDamagePreventedByEnemy).toBeCloseTo(50);
  });

  it("protects middle and back allies but not front targets", () => {
    const data = createDefensiveData();
    const frontTargetResult = simulateBattle(data, {
      playerTeam: {
        id: "player",
        combatants: [
          {
            kind: "hero",
            definitionId: "scenario_front_target",
            formationSlot: "front"
          },
          {
            kind: "hero",
            definitionId: "scenario_middle_protector",
            formationSlot: "middle"
          }
        ]
      },
      enemyTeam: {
        id: "enemy",
        combatants: [{ kind: "enemy", definitionId: "scenario_front_attacker" }]
      },
      maxDurationSeconds: 4
    });
    const middleTargetResult = simulateBattle(data, {
      playerTeam: {
        id: "player",
        combatants: [
          {
            kind: "hero",
            definitionId: "scenario_front_protector",
            formationSlot: "front"
          },
          {
            kind: "hero",
            definitionId: "scenario_middle_target",
            formationSlot: "middle"
          }
        ]
      },
      enemyTeam: {
        id: "enemy",
        combatants: [{ kind: "enemy", definitionId: "scenario_attacker" }]
      },
      maxDurationSeconds: 4
    });
    const backTargetResult = simulateBattle(data, {
      playerTeam: {
        id: "player",
        combatants: [
          {
            kind: "hero",
            definitionId: "scenario_front_target",
            formationSlot: "front"
          },
          {
            kind: "hero",
            definitionId: "scenario_middle_protector",
            formationSlot: "middle"
          },
          {
            kind: "hero",
            definitionId: "scenario_back_target",
            formationSlot: "back"
          }
        ]
      },
      enemyTeam: {
        id: "enemy",
        combatants: [{ kind: "enemy", definitionId: "scenario_attacker" }]
      },
      maxDurationSeconds: 4
    });

    expect(frontTargetResult.events.some((event) => event.type === "protect")).toBe(
      false
    );
    expect(middleTargetResult.events.find((event) => event.type === "protect")).toMatchObject({
      sourceId: "player_scenario_front_protector_1",
      protectedId: "player_scenario_middle_target_2",
      reduction: 0.5
    });
    expect(backTargetResult.events.find((event) => event.type === "protect")).toMatchObject({
      sourceId: "player_scenario_middle_protector_2",
      protectedId: "player_scenario_back_target_3",
      reduction: 0.5
    });
  });

  it("does not protect allies after the protector is defeated", () => {
    const data = createDefensiveData();
    const result = simulateBattle(data, {
      playerTeam: {
        id: "player",
        combatants: [
          {
            kind: "hero",
            definitionId: "scenario_front_protector",
            formationSlot: "front",
            statsOverride: {
              ...baseStats,
              maxBodyIntegrity: 40,
              maxContextStability: 500,
              speed: 100
            }
          },
          {
            kind: "hero",
            definitionId: "scenario_middle_target",
            formationSlot: "middle"
          }
        ]
      },
      enemyTeam: {
        id: "enemy",
        combatants: [
          { kind: "enemy", definitionId: "scenario_front_attacker" },
          { kind: "enemy", definitionId: "scenario_attacker" }
        ]
      },
      maxDurationSeconds: 4
    });

    expect(
      result.events.some(
        (event) =>
          event.type === "defeat" &&
          event.targetId === "player_scenario_front_protector_1"
      )
    ).toBe(true);
    expect(result.events.some((event) => event.type === "protect")).toBe(false);
  });

  it("uses armor break as distinct counterplay against a guarded defender", () => {
    const data = createDefensiveData();
    const plainResult = simulateBattle(data, {
      playerTeam: {
        id: "player",
        combatants: [{ kind: "hero", definitionId: "scenario_plain_striker" }]
      },
      enemyTeam: {
        id: "enemy",
        combatants: [{ kind: "enemy", definitionId: "scenario_defender" }]
      },
      maxDurationSeconds: 40
    });
    const armorBreakResult = simulateBattle(data, {
      playerTeam: {
        id: "player",
        combatants: [{ kind: "hero", definitionId: "scenario_breaker" }]
      },
      enemyTeam: {
        id: "enemy",
        combatants: [{ kind: "enemy", definitionId: "scenario_defender" }]
      },
      maxDurationSeconds: 40
    });

    expect(armorBreakResult.events.some((event) => event.type === "armor_break")).toBe(
      true
    );
    expect(armorBreakResult.events.some((event) => event.type === "ai_overload")).toBe(
      false
    );
    expect(armorBreakResult.durationSeconds).toBeLessThan(
      plainResult.durationSeconds
    );
    expect(armorBreakResult.metrics.armorBreaksTriggeredByPlayer).toBeGreaterThan(0);
  });
});
