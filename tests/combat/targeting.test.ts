import { describe, expect, it } from "vitest";
import { selectTarget } from "../../core";
import type { CombatantState, FormationSlot, TeamId } from "../../core";

const baseStats = {
  maxOuterHp: 100,
  maxInnerQi: 100,
  outerAttack: 10,
  innerAttack: 5,
  outerDefense: 0,
  innerDefense: 0,
  speed: 0,
  critChance: 0,
  critDamage: 1,
  breakPower: 0,
  breakResist: 0,
  innerRecoveryRate: 0,
  statusAccuracy: 0,
  statusResistance: 0
};

function combatant(input: {
  id: string;
  team: TeamId;
  formationSlot: FormationSlot;
  outerHp?: number;
  maxOuterHp?: number;
  outerAttack?: number;
  isQiBroken?: boolean;
}): CombatantState {
  const stats = {
    ...baseStats,
    maxOuterHp: input.maxOuterHp ?? baseStats.maxOuterHp,
    outerAttack: input.outerAttack ?? baseStats.outerAttack
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
    outerHp: input.outerHp ?? stats.maxOuterHp,
    innerQi: stats.maxInnerQi,
    maxOuterHp: stats.maxOuterHp,
    maxInnerQi: stats.maxInnerQi,
    stats,
    damageMultipliersByFamily: {},
    skillUpgradeLevels: {},
    skillIds: [],
    nextActionAt: 0,
    skillCooldowns: {},
    isQiBroken: input.isQiBroken ?? false,
    qiBreakEndsAt: input.isQiBroken ? 6 : null,
    lastInnerDamageAt: null,
    guard: null,
    protection: null,
    armorBreak: null,
    wound: null,
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
          outerHp: 90
        }),
        combatant({
          id: "back_enemy",
          team: "enemy",
          formationSlot: "back",
          outerHp: 10
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
          outerAttack: 50
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
        isQiBroken: true
      })
    ];

    expect(
      selectTarget(combatants, "player", "inner_broken")?.instanceId
    ).toBe("back_broken_enemy");

    combatants[2].isQiBroken = false;

    expect(
      selectTarget(combatants, "player", "inner_broken")?.instanceId
    ).toBe("front_enemy");
  });
});
