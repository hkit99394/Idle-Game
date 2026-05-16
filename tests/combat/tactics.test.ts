import { describe, expect, it } from "vitest";
import {
  createInitialPlayerProgress,
  resolveStageBattle,
  simulateBattle
} from "../../core";
import type {
  BaseStats,
  BattleEvent,
  EnemyDefinition,
  HeroDefinition,
  SkillDefinition,
  StaticGameData
} from "../../core";
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

function createHero(
  id: string,
  skillIds: string[],
  stats: Partial<BaseStats> = {},
  combatRole: HeroDefinition["combatRole"] = "striker"
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
  type: EnemyDefinition["type"] = "normal",
  combatRole: EnemyDefinition["combatRole"] = "striker"
): EnemyDefinition {
  return {
    ...staticData.enemies[0],
    id,
    name: id,
    family: "scenario",
    type,
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

function firstPlayerAttack(events: BattleEvent[]) {
  const attack = events.find(
    (event) => event.type === "attack" && event.sourceId.startsWith("player_")
  );

  expect(attack).toBeDefined();

  return attack as Extract<BattleEvent, { type: "attack" }>;
}

describe("combat tactics", () => {
  it("resolves missing and unknown tactics to balanced without changing output", () => {
    const data = withScenarioData({
      skills: [
        {
          id: "scenario_balanced_hit",
          name: "Scenario Balanced Hit",
          cooldownSeconds: 2,
          outerMultiplier: 1,
          innerMultiplier: 0,
          targetRule: "first_living",
          effects: []
        }
      ],
      heroes: [
        createHero("scenario_balanced_attacker", ["scenario_balanced_hit"], {
          kineticAttack: 100,
          speed: 1000
        })
      ],
      enemies: [
        createEnemy("scenario_balanced_target", [], {
          maxBodyIntegrity: 1000
        })
      ]
    });
    const battleInput = {
      playerTeam: {
        id: "player" as const,
        combatants: [
          { kind: "hero" as const, definitionId: "scenario_balanced_attacker" }
        ]
      },
      enemyTeam: {
        id: "enemy" as const,
        combatants: [
          { kind: "enemy" as const, definitionId: "scenario_balanced_target" }
        ]
      },
      maxDurationSeconds: 0.6
    };

    const implicit = simulateBattle(data, battleInput);
    const balanced = simulateBattle(data, {
      ...battleInput,
      tacticId: "balanced_routine"
    });
    const unknown = simulateBattle(data, {
      ...battleInput,
      tacticId: "missing_tactic"
    });

    expect(implicit.playerTactic).toMatchObject({
      id: "balanced_routine",
      isDefault: true
    });
    expect(balanced.events).toEqual(implicit.events);
    expect(unknown.playerTactic.id).toBe("balanced_routine");
    expect(unknown.events).toEqual(implicit.events);
    expect(unknown.metrics).toEqual(implicit.metrics);
  });

  it("applies Outer pressure damage to normal encounters", () => {
    const data = withScenarioData({
      skills: [
        {
          id: "scenario_outer_hit",
          name: "Scenario Outer Hit",
          cooldownSeconds: 2,
          outerMultiplier: 1,
          innerMultiplier: 0,
          targetRule: "first_living",
          effects: []
        }
      ],
      heroes: [
        createHero("scenario_outer_attacker", ["scenario_outer_hit"], {
          kineticAttack: 100,
          speed: 1000
        })
      ],
      enemies: [createEnemy("scenario_normal_target", [])]
    });
    const battleInput = {
      playerTeam: {
        id: "player" as const,
        combatants: [
          { kind: "hero" as const, definitionId: "scenario_outer_attacker" }
        ]
      },
      enemyTeam: {
        id: "enemy" as const,
        combatants: [
          { kind: "enemy" as const, definitionId: "scenario_normal_target" }
        ]
      },
      maxDurationSeconds: 0.6
    };

    const balanced = simulateBattle(data, battleInput);
    const outerPressure = simulateBattle(data, {
      ...battleInput,
      tacticId: "kinetic_crush"
    });

    expect(outerPressure.playerTactic.id).toBe("kinetic_crush");
    expect(firstPlayerAttack(outerPressure.events).outerDamage).toBeCloseTo(
      firstPlayerAttack(balanced.events).outerDamage * 1.08
    );
  });

  it("uses boss burst targeting and damage against boss threats", () => {
    const data = withScenarioData({
      skills: [
        {
          id: "scenario_boss_hit",
          name: "Scenario Boss Hit",
          cooldownSeconds: 2,
          outerMultiplier: 1,
          innerMultiplier: 0,
          targetRule: "first_living",
          effects: []
        }
      ],
      heroes: [
        createHero("scenario_boss_attacker", ["scenario_boss_hit"], {
          kineticAttack: 100,
          speed: 1000
        })
      ],
      enemies: [
        createEnemy("scenario_front_normal", [], {
          maxBodyIntegrity: 1000
        }),
        createEnemy(
          "scenario_back_boss",
          [],
          {
            maxBodyIntegrity: 2000,
            maxContextStability: 1000,
            kineticAttack: 150
          },
          "boss"
        )
      ]
    });
    const battleInput = {
      playerTeam: {
        id: "player" as const,
        combatants: [
          { kind: "hero" as const, definitionId: "scenario_boss_attacker" }
        ]
      },
      enemyTeam: {
        id: "enemy" as const,
        combatants: [
          {
            kind: "enemy" as const,
            definitionId: "scenario_front_normal",
            instanceId: "front_normal"
          },
          {
            kind: "enemy" as const,
            definitionId: "scenario_back_boss",
            instanceId: "back_boss",
            formationSlot: "back" as const
          }
        ]
      },
      maxDurationSeconds: 0.6
    };

    const balanced = simulateBattle(data, battleInput);
    const bossBurst = simulateBattle(data, {
      ...battleInput,
      tacticId: "gatekeeper_burst"
    });

    expect(firstPlayerAttack(balanced.events).targetId).toBe("front_normal");
    const bossBurstAttack = firstPlayerAttack(bossBurst.events);

    expect(bossBurstAttack.targetId).toBe("back_boss");
    expect(bossBurstAttack.outerDamage).toBeCloseTo(110);
  });

  it("amplifies Inner pressure AI Overload bursts deterministically", () => {
    const data = withScenarioData({
      skills: [
        {
          id: "scenario_inner_hit",
          name: "Scenario Inner Hit",
          cooldownSeconds: 2,
          outerMultiplier: 0,
          innerMultiplier: 1,
          targetRule: "first_living",
          effects: []
        }
      ],
      heroes: [
        createHero("scenario_inner_attacker", ["scenario_inner_hit"], {
          cognitiveAttack: 60,
          breachPower: 0.1,
          speed: 1000
        })
      ],
      enemies: [
        createEnemy("scenario_elite_meridian", [], {
          maxBodyIntegrity: 1000,
          maxContextStability: 30
        }, "elite")
      ]
    });
    const battleInput = {
      playerTeam: {
        id: "player" as const,
        combatants: [
          { kind: "hero" as const, definitionId: "scenario_inner_attacker" }
        ]
      },
      enemyTeam: {
        id: "enemy" as const,
        combatants: [
          { kind: "enemy" as const, definitionId: "scenario_elite_meridian" }
        ]
      },
      maxDurationSeconds: 0.6
    };

    const balanced = simulateBattle(data, battleInput);
    const innerPressure = simulateBattle(data, {
      ...battleInput,
      tacticId: "context_break"
    });
    const balancedBreak = balanced.events.find((event) => event.type === "ai_overload");
    const tacticBreak = innerPressure.events.find((event) => event.type === "ai_overload");
    const repeat = simulateBattle(data, {
      ...battleInput,
      tacticId: "context_break"
    });

    expect(balancedBreak).toBeDefined();
    expect(tacticBreak).toBeDefined();
    expect(tacticBreak?.burstDamage).toBeGreaterThan(
      balancedBreak?.burstDamage ?? 0
    );
    expect(repeat.events).toEqual(innerPressure.events);
    expect(repeat.metrics).toEqual(innerPressure.metrics);
  });

  it("boosts guard support, Long Stabilization healing, and status resistance for players", () => {
    const defensiveData = withScenarioData({
      skills: [
        {
          id: "scenario_guard",
          name: "Scenario Guard",
          cooldownSeconds: 4,
          outerMultiplier: 0,
          innerMultiplier: 0,
          targetRule: "first_living",
          effects: [{ type: "guard", value: 0.5, durationSeconds: 4 }]
        },
        {
          id: "scenario_enemy_hit",
          name: "Scenario Enemy Hit",
          cooldownSeconds: 2,
          outerMultiplier: 1,
          innerMultiplier: 0,
          targetRule: "first_living",
          effects: []
        }
      ],
      heroes: [
        createHero("scenario_guardian", ["scenario_guard"], {
          maxBodyIntegrity: 1000,
          speed: 1000
        }, "tank")
      ],
      enemies: [
        createEnemy("scenario_guard_attacker", ["scenario_enemy_hit"], {
          kineticAttack: 100,
          speed: 100
        })
      ]
    });
    const defensiveInput = {
      playerTeam: {
        id: "player" as const,
        combatants: [{ kind: "hero" as const, definitionId: "scenario_guardian" }]
      },
      enemyTeam: {
        id: "enemy" as const,
        combatants: [
          { kind: "enemy" as const, definitionId: "scenario_guard_attacker" }
        ]
      },
      maxDurationSeconds: 1.1
    };

    const balancedDefense = simulateBattle(defensiveData, defensiveInput);
    const guardSupport = simulateBattle(defensiveData, {
      ...defensiveInput,
      tacticId: "guard_the_stabilizer"
    });
    const balancedAbsorb = balancedDefense.events.find(
      (event) => event.type === "guard_absorb"
    );
    const tacticAbsorb = guardSupport.events.find(
      (event) => event.type === "guard_absorb"
    );

    expect(tacticAbsorb).toMatchObject({
      type: "guard_absorb",
      reduction: 0.54
    });
    expect(tacticAbsorb?.outerDamagePrevented).toBeGreaterThan(
      balancedAbsorb?.outerDamagePrevented ?? 0
    );

    const recoveryData = withScenarioData({
      skills: [
        {
          id: "scenario_ally_heal",
          name: "Scenario Ally Heal",
          cooldownSeconds: 2,
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
        },
        {
          id: "scenario_recovery_hit",
          name: "Scenario Recovery Hit",
          cooldownSeconds: 2,
          outerMultiplier: 1,
          innerMultiplier: 0,
          targetRule: "first_living",
          effects: []
        }
      ],
      heroes: [
        createHero("scenario_recovery_tank", [], {
          maxBodyIntegrity: 240
        }, "tank"),
        createHero("scenario_healer", ["scenario_ally_heal"], {
          maxBodyIntegrity: 240
        }, "support")
      ],
      enemies: [
        createEnemy("scenario_recovery_attacker", ["scenario_recovery_hit"], {
          kineticAttack: 100,
          speed: 100
        })
      ]
    });
    const recoveryInput = {
      playerTeam: {
        id: "player" as const,
        combatants: [
          { kind: "hero" as const, definitionId: "scenario_recovery_tank" },
          {
            kind: "hero" as const,
            definitionId: "scenario_healer",
            formationSlot: "back" as const
          }
        ]
      },
      enemyTeam: {
        id: "enemy" as const,
        combatants: [
          { kind: "enemy" as const, definitionId: "scenario_recovery_attacker" }
        ]
      },
      maxDurationSeconds: 2
    };

    const balancedRecovery = simulateBattle(recoveryData, recoveryInput);
    const longStabilization = simulateBattle(recoveryData, {
      ...recoveryInput,
      tacticId: "long_stabilization"
    });
    const balancedHeal = balancedRecovery.events.find(
      (event) => event.type === "heal"
    );
    const longStabilizationHeal = longStabilization.events.find(
      (event) => event.type === "heal"
    );

    expect(longStabilization.finalPlayerTeam[0]?.stats.statusResistance).toBeCloseTo(0.08);
    expect(longStabilizationHeal?.outerHealing).toBeGreaterThan(
      balancedHeal?.outerHealing ?? 0
    );
  });

  it("threads tactic selection through stage battle resolution", () => {
    const progress = createInitialPlayerProgress(staticData);
    const result = resolveStageBattle(staticData, {
      progress,
      stageId: "greenline_approach_1",
      tacticId: "kinetic_crush",
      maxDurationSeconds: 1
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.battle.playerTactic.id).toBe("kinetic_crush");
  });
});
