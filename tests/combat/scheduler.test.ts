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
  const maxBodyIntegrity = input.maxBodyIntegrity ?? combatScenarioBaseStats.maxBodyIntegrity;
  const maxContextStability = input.maxContextStability ?? combatScenarioBaseStats.maxContextStability;

  return {
    instanceId: "scenario_scheduled_combatant",
    definitionId: "scenario_scheduled",
    kind: "hero",
    level: 1,
    formationSlot: "front",
    combatRole: "striker",
    name: "Scenario Scheduled",
    team: "player",
    bodyIntegrity: maxBodyIntegrity,
    contextStability: maxContextStability,
    maxBodyIntegrity,
    maxContextStability,
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
    isOverloaded: false,
    overloadEndsAt: null,
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

    combatant.bodyIntegrity = 0;
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
