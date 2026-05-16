import { describe, expect, it } from "vitest";
import { selectTarget } from "../../core";
import type { CombatantState, FormationSlot, TeamId } from "../../core";

const baseStats = {
  maxBodyIntegrity: 100,
  maxContextStability: 100,
  kineticAttack: 10,
  cognitiveAttack: 5,
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

function combatant(input: {
  id: string;
  team: TeamId;
  formationSlot: FormationSlot;
  bodyIntegrity?: number;
  maxBodyIntegrity?: number;
  kineticAttack?: number;
  isOverloaded?: boolean;
}): CombatantState {
  const stats = {
    ...baseStats,
    maxBodyIntegrity: input.maxBodyIntegrity ?? baseStats.maxBodyIntegrity,
    kineticAttack: input.kineticAttack ?? baseStats.kineticAttack
  };

  return {
    instanceId: input.id,
    definitionId: input.id,
    kind: input.team === "player" ? "hero" : "enemy",
    level: 1,
    formationSlot: input.formationSlot,
    combatRole: "striker",
    name: input.id,
    team: input.team,
    bodyIntegrity: input.bodyIntegrity ?? stats.maxBodyIntegrity,
    contextStability: stats.maxContextStability,
    maxBodyIntegrity: stats.maxBodyIntegrity,
    maxContextStability: stats.maxContextStability,
    stats,
    damageMultipliersByFamily: {},
    skillUpgradeLevels: {},
    skillIds: [],
    nextActionAt: 0,
    skillCooldowns: {},
    isOverloaded: input.isOverloaded ?? false,
    overloadEndsAt: input.isOverloaded ? 6 : null,
    lastCognitiveDamageAt: null,
    guard: null,
    protection: null,
    armorBreak: null,
    wound: null,
    speedDown: null,
    innerDefenseDown: null,
    statusResistanceBonuses: [],
    activeStatuses: [],
    regeneration: null,
    defeatedAt: null
  };
}

describe("targeting", () => {
  it("targets first living enemies by formation order", () => {
    const target = selectTarget(
      [
        combatant({ id: "hero", team: "player", formationSlot: "front" }),
        combatant({ id: "back_enemy", team: "enemy", formationSlot: "back" }),
        combatant({ id: "front_enemy", team: "enemy", formationSlot: "front" })
      ],
      "player",
      "first_living"
    );

    expect(target?.instanceId).toBe("front_enemy");
  });

  it("targets the weakest living HP percent", () => {
    const target = selectTarget(
      [
        combatant({ id: "hero", team: "player", formationSlot: "front" }),
        combatant({
          id: "front_enemy",
          team: "enemy",
          formationSlot: "front",
          bodyIntegrity: 90
        }),
        combatant({
          id: "back_enemy",
          team: "enemy",
          formationSlot: "back",
          bodyIntegrity: 10
        })
      ],
      "player",
      "weakest_hp"
    );

    expect(target?.instanceId).toBe("back_enemy");
  });

  it("targets the highest combat power enemy", () => {
    const target = selectTarget(
      [
        combatant({ id: "hero", team: "player", formationSlot: "front" }),
        combatant({ id: "front_enemy", team: "enemy", formationSlot: "front" }),
        combatant({
          id: "middle_enemy",
          team: "enemy",
          formationSlot: "middle",
          kineticAttack: 50
        })
      ],
      "player",
      "highest_cp"
    );

    expect(target?.instanceId).toBe("middle_enemy");
  });

  it("prefers Qi Broken enemies and falls back to formation order", () => {
    const combatants = [
      combatant({ id: "hero", team: "player", formationSlot: "front" }),
      combatant({ id: "front_enemy", team: "enemy", formationSlot: "front" }),
      combatant({
        id: "back_broken_enemy",
        team: "enemy",
        formationSlot: "back",
        isOverloaded: true
      })
    ];

    expect(
      selectTarget(combatants, "player", "inner_broken")?.instanceId
    ).toBe("back_broken_enemy");

    combatants[2].isOverloaded = false;

    expect(
      selectTarget(combatants, "player", "inner_broken")?.instanceId
    ).toBe("front_enemy");
  });
});
