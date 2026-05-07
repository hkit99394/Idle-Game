import { describe, expect, it } from "vitest";
import {
  advanceStatusEffects,
  applyStatusEffect,
  calculateStatusApplicationChance,
  calculateStatusDuration,
  cleanseStatusEffects,
  createStatusDictionary,
  getStatusCombatModifiers
} from "../../core";
import type { StatusEffectDefinition } from "../../core";
import statusEffects from "../../data/statusEffects.json" with { type: "json" };

const definitions = createStatusDictionary(
  statusEffects as StatusEffectDefinition[]
);

describe("status effects", () => {
  it("applies and stacks status effects with clamped intensity", () => {
    const firstApply = applyStatusEffect({
      activeStatuses: [],
      definition: definitions.poison,
      sourceTeamId: "enemy",
      sourceCombatantId: "ash_vial_rogue"
    });
    const secondApply = applyStatusEffect({
      activeStatuses: firstApply.statuses,
      definition: definitions.poison,
      stacks: 5
    });

    expect(firstApply.refreshed).toBe(false);
    expect(secondApply.refreshed).toBe(true);
    expect(secondApply.applied).toMatchObject({
      statusId: "poison",
      remainingSeconds: 8,
      stacks: 3,
      sourceTeamId: "enemy",
      sourceCombatantId: "ash_vial_rogue"
    });
  });

  it("ticks poison deterministically and expires after its duration", () => {
    const applied = applyStatusEffect({
      activeStatuses: [],
      definition: definitions.poison,
      stacks: 2
    });

    const advanced = advanceStatusEffects({
      activeStatuses: applied.statuses,
      definitions,
      deltaSeconds: 8,
      targetMaxOuterHp: 1000
    });

    expect(advanced.statuses).toEqual([]);
    expect(advanced.events).toEqual([
      {
        type: "status_tick",
        statusId: "poison",
        stacks: 2,
        outerDamage: 24
      },
      {
        type: "status_tick",
        statusId: "poison",
        stacks: 2,
        outerDamage: 24
      },
      {
        type: "status_tick",
        statusId: "poison",
        stacks: 2,
        outerDamage: 24
      },
      {
        type: "status_tick",
        statusId: "poison",
        stacks: 2,
        outerDamage: 24
      },
      {
        type: "status_expire",
        statusId: "poison"
      }
    ]);
  });

  it("combines wound, Qi Suppression, Vulnerable, and Burning Blood modifiers", () => {
    const statuses = [
      applyStatusEffect({
        activeStatuses: [],
        definition: definitions.wound,
        stacks: 2
      }).applied,
      applyStatusEffect({
        activeStatuses: [],
        definition: definitions.qi_suppression
      }).applied,
      applyStatusEffect({
        activeStatuses: [],
        definition: definitions.vulnerable,
        stacks: 2
      }).applied,
      applyStatusEffect({
        activeStatuses: [],
        definition: definitions.burning_blood
      }).applied
    ];

    const modifiers = getStatusCombatModifiers(statuses, definitions);

    expect(modifiers.healingReceivedMultiplier).toBeCloseTo(0.5625);
    expect(modifiers.innerRecoveryMultiplier).toBeCloseTo(0.7);
    expect(modifiers.outerDamageTakenMultiplier).toBeCloseTo(1.3225);
    expect(modifiers.attackBacklashOuterHpPercent).toBeCloseTo(0.01);
  });

  it("cleanses only matching dispel tags and respects max count", () => {
    const poisoned = applyStatusEffect({
      activeStatuses: [],
      definition: definitions.poison
    }).applied;
    const wounded = applyStatusEffect({
      activeStatuses: [],
      definition: definitions.wound
    }).applied;
    const suppressed = applyStatusEffect({
      activeStatuses: [],
      definition: definitions.qi_suppression
    }).applied;

    const result = cleanseStatusEffects({
      activeStatuses: [poisoned, wounded, suppressed],
      definitions,
      dispelTags: ["debuff"],
      maxCount: 2
    });

    expect(result.cleansed.map((status) => status.statusId)).toEqual([
      "poison",
      "wound"
    ]);
    expect(result.statuses.map((status) => status.statusId)).toEqual([
      "qi_suppression"
    ]);
  });

  it("calculates status chance and duration with resistance caps", () => {
    expect(
      calculateStatusApplicationChance({
        baseChance: 0.7,
        attackerStatusAccuracy: 0.1,
        targetStatusResistance: 0.25
      })
    ).toBeCloseTo(0.55);
    expect(
      calculateStatusApplicationChance({
        baseChance: 1,
        attackerStatusAccuracy: 1
      })
    ).toBeCloseTo(0.95);
    expect(calculateStatusDuration(10, 0.25)).toBeCloseTo(7.5);
    expect(calculateStatusDuration(10, 1)).toBeCloseTo(2);
  });
});
