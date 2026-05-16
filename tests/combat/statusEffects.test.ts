import { describe, expect, it } from "vitest";
import {
  applyStatusEffect,
  cleanseCombatantStatuses,
  clearCleanseableStatusEffects,
  createBattleEventRecord,
  createStatusDictionary,
  createTimedStatusEffect,
  expireStatusEffects,
  getActiveStatusEffect,
  getStatusCombatModifiers,
  setStatusEffect
} from "../../core";
import type {
  BattleEvent,
  CombatantState,
  StatusEffectDefinition,
  TeamId
} from "../../core";
import statusEffects from "../../data/statusEffects.json" with { type: "json" };

const statusDefinitions = createStatusDictionary(
  statusEffects as StatusEffectDefinition[]
);

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

const cognitiveIntrusionDefinition: StatusEffectDefinition = {
  id: "scenario_intrusion",
  name: "Scenario Intrusion",
  category: "control",
  durationSeconds: 6,
  maxStacks: 2,
  stackPolicy: "stack_intensity",
  dispelTags: ["debuff"],
  effects: {
    cognitiveDamageTakenMultiplier: 1.12,
    contextRebuildMultiplier: 0.85
  }
};

function combatant(input: {
  id: string;
  team?: TeamId;
  bodyIntegrity?: number;
}): CombatantState {
  return {
    instanceId: input.id,
    definitionId: input.id,
    kind: input.team === "enemy" ? "enemy" : "hero",
    level: 1,
    formationSlot: "front",
    combatRole: "striker",
    name: input.id,
    team: input.team ?? "player",
    bodyIntegrity: input.bodyIntegrity ?? baseStats.maxBodyIntegrity,
    contextStability: baseStats.maxContextStability,
    maxBodyIntegrity: baseStats.maxBodyIntegrity,
    maxContextStability: baseStats.maxContextStability,
    stats: baseStats,
    damageMultipliersByFamily: {},
    skillUpgradeLevels: {},
    skillIds: [],
    nextActionAt: 0,
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
    defeatedAt: null
  };
}

describe("status effects", () => {
  it("aggregates data-driven combat modifiers with cognitive vulnerability", () => {
    const modifiers = getStatusCombatModifiers(
      [
        {
          statusId: "scenario_intrusion",
          remainingSeconds: 6,
          stacks: 2
        },
        {
          statusId: "exposed",
          remainingSeconds: 5,
          stacks: 2
        }
      ],
      {
        scenario_intrusion: cognitiveIntrusionDefinition,
        exposed: statusDefinitions.exposed
      }
    );

    expect(modifiers.healingReceivedMultiplier).toBe(1);
    expect(modifiers.contextRebuildMultiplier).toBeCloseTo(0.85 ** 2);
    expect(modifiers.kineticDamageTakenMultiplier).toBeCloseTo(1.15 ** 2);
    expect(modifiers.cognitiveDamageTakenMultiplier).toBeCloseTo(1.12 ** 2);
    expect(modifiers.feedbackBodyIntegrityPercent).toBe(0);
  });

  it("stores normalized status identity and deterministic duration", () => {
    const target = combatant({ id: "hero" });

    setStatusEffect(
      target,
      createTimedStatusEffect({
        id: "guard",
        value: 0.35,
        sourceId: "hero",
        targetId: "hero",
        skillId: "iron_body",
        appliedAt: 4,
        durationSeconds: 3.5
      })
    );

    expect(target.guard).toMatchObject({
      id: "guard",
      value: 0.35,
      sourceId: "hero",
      targetId: "hero",
      skillId: "iron_body",
      appliedAt: 4,
      durationSeconds: 3.5,
      expiresAt: 7.5,
      stackBehavior: "refresh"
    });
    expect(getActiveStatusEffect(target, "guard", 7.499)).toBe(target.guard);

    expireStatusEffects([target], 7.5);

    expect(target.guard).toBeNull();
  });

  it("refreshes an existing status without additive stacking", () => {
    const target = combatant({ id: "hero" });

    setStatusEffect(
      target,
      createTimedStatusEffect({
        id: "guard",
        value: 0.2,
        sourceId: "first_source",
        targetId: "hero",
        skillId: "first_guard",
        appliedAt: 0,
        durationSeconds: 2
      })
    );
    setStatusEffect(
      target,
      createTimedStatusEffect({
        id: "guard",
        value: 0.4,
        sourceId: "second_source",
        targetId: "hero",
        skillId: "second_guard",
        appliedAt: 1,
        durationSeconds: 4
      })
    );

    expect(target.guard).toMatchObject({
      value: 0.4,
      sourceId: "second_source",
      skillId: "second_guard",
      expiresAt: 5,
      stackBehavior: "refresh"
    });
  });

  it("cleanses negative statuses without removing positive statuses", () => {
    const target = combatant({ id: "hero" });

    setStatusEffect(
      target,
      createTimedStatusEffect({
        id: "wound",
        value: 0.3,
        sourceId: "enemy",
        targetId: "hero",
        skillId: "blood_seal",
        appliedAt: 0,
        durationSeconds: 10
      })
    );
    setStatusEffect(
      target,
      createTimedStatusEffect({
        id: "armor_break",
        value: 0.4,
        sourceId: "enemy",
        targetId: "hero",
        skillId: "iron_split",
        appliedAt: 0,
        durationSeconds: 10
      })
    );
    setStatusEffect(
      target,
      createTimedStatusEffect({
        id: "guard",
        value: 0.25,
        sourceId: "hero",
        targetId: "hero",
        skillId: "iron_body",
        appliedAt: 0,
        durationSeconds: 10
      })
    );

    const statusesRemoved = clearCleanseableStatusEffects(target, 2, 2);

    expect(statusesRemoved).toEqual(["wound", "armor_break"]);
    expect(target.wound).toBeNull();
    expect(target.armorBreak).toBeNull();
    expect(target.guard).toMatchObject({ id: "guard" });
  });

  it("records shared status ids for noisy event grouping", () => {
    const guardAbsorb: BattleEvent = {
      type: "guard_absorb",
      time: 1,
      targetId: "hero",
      skillId: "iron_body",
      statusId: "guard",
      outerDamagePrevented: 12,
      reduction: 0.3
    };
    const cleanse: BattleEvent = {
      type: "cleanse",
      time: 2,
      sourceId: "healer",
      targetId: "hero",
      skillId: "lotus_cleanse",
      statusesRemoved: ["wound", "armor_break"]
    };
    const attack: BattleEvent = {
      type: "attack",
      time: 3,
      sourceId: "enemy",
      targetId: "hero",
      skillId: "baseline_strike",
      outerDamage: 10,
      innerDamage: 0
    };

    expect(createBattleEventRecord(guardAbsorb, 0).statusId).toBe("guard");
    expect(createBattleEventRecord(cleanse, 1).statusId).toBe("wound");
    expect(createBattleEventRecord(attack, 2).statusId).toBeNull();
  });

  it("uses one cleanse priority across mixed timed and data-driven statuses", () => {
    const target = combatant({ id: "hero" });

    setStatusEffect(
      target,
      createTimedStatusEffect({
        id: "armor_break",
        value: 0.4,
        sourceId: "enemy",
        targetId: "hero",
        skillId: "iron_split",
        appliedAt: 0,
        durationSeconds: 8
      })
    );
    setStatusEffect(
      target,
      createTimedStatusEffect({
        id: "wound",
        value: 0.3,
        sourceId: "enemy",
        targetId: "hero",
        skillId: "blood_seal",
        appliedAt: 0,
        durationSeconds: 5
      })
    );
    target.activeStatuses = [
      applyStatusEffect({
        activeStatuses: [],
        definition: statusDefinitions.corruption
      }).applied,
      applyStatusEffect({
        activeStatuses: [],
        definition: statusDefinitions.context_suppression
      }).applied
    ];

    const cleanse = cleanseCombatantStatuses({
      combatant: target,
      time: 1,
      statusDefinitions,
      dispelTags: ["debuff"],
      maxCount: 3
    });

    expect(cleanse.cleansedStatusIds).toEqual([
      "wound",
      "armor_break",
      "corruption"
    ]);
    expect(cleanse.descriptors.map((status) => status.label)).toEqual([
      "Trauma",
      "Armor Break",
      "Corruption"
    ]);
    expect(target.wound).toBeNull();
    expect(target.armorBreak).toBeNull();
    expect(target.activeStatuses.map((status) => status.statusId)).toEqual([
      "context_suppression"
    ]);
  });
});
