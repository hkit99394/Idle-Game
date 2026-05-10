import { describe, expect, it } from "vitest";
import {
  canCombatantActAt,
  createTimedStatusEffect,
  defaultCombatFormulaConstants,
  getEffectiveActionSpeed,
  getInitialActionTime,
  getNextActionTime,
  scheduleNextAction
} from "../../core";
import type { CombatantState } from "../../core";
import { combatScenarioBaseStats } from "../helpers/combatScenarios";

function createScheduledCombatant(
  input: Partial<CombatantState> = {}
): CombatantState {
  const maxOuterHp = input.maxOuterHp ?? combatScenarioBaseStats.maxOuterHp;
  const maxInnerQi = input.maxInnerQi ?? combatScenarioBaseStats.maxInnerQi;

  return {
    instanceId: "scenario_scheduled_combatant",
    definitionId: "scenario_scheduled",
    kind: "hero",
    level: 1,
    formationSlot: "front",
    combatRole: "striker",
    name: "Scenario Scheduled",
    team: "player",
    outerHp: maxOuterHp,
    innerQi: maxInnerQi,
    maxOuterHp,
    maxInnerQi,
    stats: {
      ...combatScenarioBaseStats,
      speed: 100,
      ...input.stats
    },
    damageMultipliersByFamily: {},
    skillUpgradeLevels: {},
    skillIds: [],
    nextActionAt: 1,
    skillCooldowns: {},
    isQiBroken: false,
    qiBreakEndsAt: null,
    lastInnerDamageAt: null,
    guard: null,
    protection: null,
    armorBreak: null,
    wound: null,
    speedDown: null,
    innerDefenseDown: null,
    statusResistanceBonuses: [],
    activeStatuses: [],
    regeneration: null,
    defeatedAt: null,
    ...input
  };
}

describe("combat scheduler", () => {
  it("uses attack interval formulas for initial and next action times", () => {
    const combatant = createScheduledCombatant();

    expect(getInitialActionTime(100, defaultCombatFormulaConstants)).toBe(1);
    expect(
      getNextActionTime({
        combatant,
        time: 3,
        constants: defaultCombatFormulaConstants
      })
    ).toBe(4);

    scheduleNextAction({
      combatant,
      time: 3,
      constants: defaultCombatFormulaConstants
    });

    expect(combatant.nextActionAt).toBe(4);
  });

  it("only allows living combatants to act once their action time arrives", () => {
    const combatant = createScheduledCombatant({
      nextActionAt: 2
    });

    expect(canCombatantActAt(combatant, 1.9)).toBe(false);
    expect(canCombatantActAt(combatant, 2)).toBe(true);

    combatant.outerHp = 0;
    combatant.defeatedAt = 2;

    expect(canCombatantActAt(combatant, 2)).toBe(false);
  });

  it("applies active speed-down effects and clamps extreme reductions", () => {
    const combatant = createScheduledCombatant({
      speedDown: createTimedStatusEffect({
        id: "speed_down",
        value: 2,
        sourceId: "enemy_slow",
        targetId: "scenario_scheduled_combatant",
        skillId: "scenario_slow",
        appliedAt: 1,
        durationSeconds: 4
      })
    });

    expect(getEffectiveActionSpeed(combatant, 2)).toBeCloseTo(10);
    expect(
      getNextActionTime({
        combatant,
        time: 2,
        constants: defaultCombatFormulaConstants
      })
    ).toBeCloseTo(3.818181818);
    expect(getEffectiveActionSpeed(combatant, 6)).toBe(100);
  });
});
