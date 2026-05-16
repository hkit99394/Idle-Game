import {
  validateStaticGameData,
  type BaseStats,
  type EnemyDefinition,
  type HeroDefinition,
  type SkillDefinition,
  type StaticGameData,
  type TeamInstance
} from "../../core";
import { staticData } from "./staticData";

export const combatScenarioBaseStats: BaseStats = {
  maxBodyIntegrity: 600,
  maxContextStability: 300,
  kineticAttack: 0,
  cognitiveAttack: 0,
  kineticDefense: 0,
  cognitiveDefense: 0,
  speed: 100,
  critChance: 0,
  critDamage: 1,
  breachPower: 0,
  overloadResist: 0,
  contextRebuildRate: 0,
  statusAccuracy: 0,
  statusResistance: 0
};

export function createScenarioSkill(
  skill: Partial<SkillDefinition> & Pick<SkillDefinition, "id">
): SkillDefinition {
  return {
    name: skill.id,
    cooldownSeconds: 1,
    outerMultiplier: 0,
    innerMultiplier: 0,
    targetRule: "first_living",
    effects: [],
    ...skill
  };
}

export function createScenarioHero(
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
      ...combatScenarioBaseStats,
      ...stats
    }
  };
}

export function createScenarioEnemy(
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
      ...combatScenarioBaseStats,
      ...stats
    }
  };
}

export function withCombatScenarioData(input: {
  baseData?: StaticGameData;
  skills?: SkillDefinition[];
  heroes?: HeroDefinition[];
  enemies?: EnemyDefinition[];
}): StaticGameData {
  const baseData = input.baseData ?? staticData;
  const data = {
    ...baseData,
    skills: [...baseData.skills, ...(input.skills ?? [])],
    heroes: [...baseData.heroes, ...(input.heroes ?? [])],
    enemies: [...baseData.enemies, ...(input.enemies ?? [])]
  };
  const errors = validateStaticGameData(data);

  if (errors.length > 0) {
    throw new Error(`Invalid combat scenario data: ${errors.join("; ")}`);
  }

  return data;
}

export type CombatBaselineFixture = {
  data: StaticGameData;
  playerTeam: TeamInstance;
  enemyTeam: TeamInstance;
};

export function createCombatBaselineFixture(): CombatBaselineFixture {
  const data = withCombatScenarioData({
    skills: [
      createScenarioSkill({
        id: "scenario_outer_combo",
        name: "Scenario Outer Combo",
        outerMultiplier: 1
      }),
      createScenarioSkill({
        id: "scenario_inner_break",
        name: "Scenario Inner Break",
        innerMultiplier: 1
      }),
      createScenarioSkill({
        id: "scenario_guard",
        name: "Scenario Guard",
        effects: [{ type: "guard", value: 0.5, durationSeconds: 3 }]
      }),
      createScenarioSkill({
        id: "scenario_protect",
        name: "Scenario Protect",
        effects: [{ type: "protect", value: 0.5, durationSeconds: 3 }]
      }),
      createScenarioSkill({
        id: "scenario_heal",
        name: "Scenario Heal",
        effects: [
          {
            type: "outer_heal_percent",
            value: 0.25,
            target: "lowest_outer_hp_ally"
          }
        ]
      }),
      createScenarioSkill({
        id: "scenario_poison_touch",
        name: "Scenario Corruption Touch",
        effects: [
          {
            type: "apply_status",
            statusId: "corruption",
            chance: 1,
            durationSeconds: 6,
            stacks: 1
          }
        ]
      })
    ],
    heroes: [
      createScenarioHero("scenario_trace_striker", ["scenario_outer_combo"], {
        kineticAttack: 120,
        speed: 100
      }),
      createScenarioHero("scenario_trace_breaker", ["scenario_inner_break"], {
        cognitiveAttack: 90,
        breachPower: 30,
        speed: 100
      }, "breaker"),
      createScenarioHero("scenario_trace_support", ["scenario_heal"], {
        speed: 100
      }, "support")
    ],
    enemies: [
      createScenarioEnemy("scenario_trace_guardian", ["scenario_guard"], {
        maxBodyIntegrity: 900,
        maxContextStability: 120,
        speed: 100
      }, "tank"),
      createScenarioEnemy("scenario_trace_protector", ["scenario_protect"], {
        maxBodyIntegrity: 900,
        maxContextStability: 180,
        speed: 100
      }, "tank"),
      createScenarioEnemy("scenario_trace_poisoner", ["scenario_poison_touch"], {
        kineticAttack: 80,
        speed: 100,
        statusAccuracy: 1
      })
    ]
  });

  return {
    data,
    playerTeam: {
      id: "player",
      combatants: [
        { kind: "hero", definitionId: "scenario_trace_striker", formationSlot: "front" },
        { kind: "hero", definitionId: "scenario_trace_breaker", formationSlot: "middle" },
        { kind: "hero", definitionId: "scenario_trace_support", formationSlot: "back" }
      ]
    },
    enemyTeam: {
      id: "enemy",
      combatants: [
        { kind: "enemy", definitionId: "scenario_trace_guardian", formationSlot: "front" },
        { kind: "enemy", definitionId: "scenario_trace_protector", formationSlot: "middle" },
        { kind: "enemy", definitionId: "scenario_trace_poisoner", formationSlot: "back" }
      ]
    }
  };
}
