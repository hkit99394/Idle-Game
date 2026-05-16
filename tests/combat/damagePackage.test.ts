import { describe, expect, it } from "vitest";
import {
  applyDamagePackageMitigation,
  commitBacklashDamagePackage,
  commitDamagePackage,
  commitAiOverloadDamagePackage,
  createAttackDamagePackage,
  createBacklashDamagePackage,
  createAiOverloadFeedbackDamagePackage,
  createAiOverloadDamagePackage,
  resolveAttackDamageTargets
} from "../../core/combat/damagePackage";
import type {
  AttackDamagePackage,
  AttackDamageTargetContext
} from "../../core/combat/damagePackage";
import {
  createTimedStatusEffect,
  defaultCombatFormulaConstants
} from "../../core";
import type {
  BattleEvent,
  CombatantState,
  StatusEffectDefinition
} from "../../core";
import {
  createInitialContributions,
  createInitialMetrics
} from "../../core/combat/battleRecorder";
import {
  combatScenarioBaseStats,
  createScenarioSkill
} from "../helpers/combatScenarios";

type CombatantInput = Omit<Partial<CombatantState>, "stats"> & {
  stats?: Partial<CombatantState["stats"]>;
};

function createDamageCombatant(input: CombatantInput = {}): CombatantState {
  const maxBodyIntegrity = input.maxBodyIntegrity ?? combatScenarioBaseStats.maxBodyIntegrity;
  const maxContextStability = input.maxContextStability ?? combatScenarioBaseStats.maxContextStability;
  const { stats, ...stateOverrides } = input;

  return {
    instanceId: "scenario_damage_combatant",
    definitionId: "scenario_damage",
    kind: "hero",
    level: 1,
    formationSlot: "front",
    combatRole: "striker",
    name: "Scenario Damage",
    team: "player",
    bodyIntegrity: maxBodyIntegrity,
    contextStability: maxContextStability,
    maxBodyIntegrity,
    maxContextStability,
    stats: {
      ...combatScenarioBaseStats,
      ...stats
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
    ...stateOverrides
  };
}

const vulnerabilityDefinition: StatusEffectDefinition = {
  id: "scenario_vulnerable",
  name: "Scenario Exposed",
  category: "vulnerability",
  durationSeconds: 5,
  maxStacks: 1,
  stackPolicy: "refresh",
  dispelTags: ["vulnerability"],
  effects: {
    kineticDamageTakenMultiplier: 1.5
  }
};

function createTargetContext(
  target: CombatantState
): AttackDamageTargetContext {
  return {
    intendedTarget: target,
    damageTarget: target,
    protector: null
  };
}

describe("damage package", () => {
  it("creates attack packages with family, vulnerability, and armor-break modifiers", () => {
    const skill = createScenarioSkill({
      id: "scenario_damage",
      kineticMultiplier: 1,
      cognitiveMultiplier: 1
    });
    const attacker = createDamageCombatant({
      instanceId: "scenario_attacker",
      damageMultipliersByFamily: {
        scenario: 0.2
      },
      stats: {
        kineticAttack: 200,
        cognitiveAttack: 100
      }
    });
    const target = createDamageCombatant({
      instanceId: "scenario_target",
      definitionId: "scenario_enemy",
      kind: "enemy",
      team: "enemy",
      family: "scenario",
      stats: {
        kineticDefense: 100,
        cognitiveDefense: 100
      },
      armorBreak: createTimedStatusEffect({
        id: "armor_break",
        value: 0.5,
        sourceId: "scenario_attacker",
        targetId: "scenario_target",
        skillId: "scenario_armor_break",
        appliedAt: 1,
        durationSeconds: 5
      }),
      activeStatuses: [
        {
          statusId: "scenario_vulnerable",
          remainingSeconds: 5,
          stacks: 1
        }
      ]
    });

    const damagePackage = createAttackDamagePackage({
      attacker,
      targets: createTargetContext(target),
      skill,
      time: 2,
      constants: defaultCombatFormulaConstants,
      statusDefinitions: {
        scenario_vulnerable: vulnerabilityDefinition
      }
    });

    expect(damagePackage.familyMultiplier).toBeCloseTo(1.2);
    expect(damagePackage.kineticDamageTakenMultiplier).toBe(1.5);
    expect(damagePackage.outerDamage).toBeCloseTo(240);
    expect(damagePackage.innerDamage).toBeCloseTo(60);
    expect(damagePackage.intendedTargetId).toBeUndefined();
  });

  it("keeps Qi-broken damage scaling inside the attack package", () => {
    const skill = createScenarioSkill({
      id: "scenario_qi_damage",
      kineticMultiplier: 1,
      cognitiveMultiplier: 1
    });
    const attacker = createDamageCombatant({
      instanceId: "scenario_attacker",
      stats: {
        kineticAttack: 100,
        cognitiveAttack: 80
      }
    });
    const target = createDamageCombatant({
      instanceId: "scenario_qi_broken",
      team: "enemy",
      kind: "enemy",
      isOverloaded: true
    });

    const damagePackage = createAttackDamagePackage({
      attacker,
      targets: createTargetContext(target),
      skill,
      time: 3,
      constants: defaultCombatFormulaConstants,
      statusDefinitions: {}
    });

    expect(damagePackage.outerDamage).toBeCloseTo(125);
    expect(damagePackage.innerDamage).toBeCloseTo(40);
  });

  it("resolves protectors as the damage recipient before package creation", () => {
    const skill = createScenarioSkill({
      id: "scenario_protected_damage",
      kineticMultiplier: 1,
      targetRule: "weakest_hp"
    });
    const attacker = createDamageCombatant({
      instanceId: "scenario_attacker",
      team: "player"
    });
    const protectedTarget = createDamageCombatant({
      instanceId: "scenario_protected",
      kind: "enemy",
      team: "enemy",
      formationSlot: "back",
      bodyIntegrity: 300
    });
    const protector = createDamageCombatant({
      instanceId: "scenario_protector",
      kind: "enemy",
      team: "enemy",
      formationSlot: "front",
      protection: createTimedStatusEffect({
        id: "protection",
        value: 0.5,
        sourceId: "scenario_protector",
        targetId: "scenario_protected",
        skillId: "scenario_protect",
        appliedAt: 1,
        durationSeconds: 5
      })
    });

    const targets = resolveAttackDamageTargets({
      combatants: [attacker, protectedTarget, protector],
      attacker,
      skill,
      time: 2
    });

    expect(targets).toMatchObject({
      intendedTarget: protectedTarget,
      damageTarget: protector,
      protector
    });

    const damagePackage = createAttackDamagePackage({
      attacker,
      targets: targets!,
      skill,
      time: 2,
      constants: defaultCombatFormulaConstants,
      statusDefinitions: {}
    });

    expect(damagePackage.targetId).toBe(protector.instanceId);
    expect(damagePackage.intendedTargetId).toBe(protectedTarget.instanceId);
  });

  it("applies guard and protection before committing damage and attribution", () => {
    const attacker = createDamageCombatant({
      instanceId: "scenario_attacker",
      name: "Scenario Attacker",
      team: "player"
    });
    const protectedTarget = createDamageCombatant({
      instanceId: "scenario_protected",
      definitionId: "scenario_protected",
      name: "Scenario Protected",
      kind: "enemy",
      team: "enemy",
      formationSlot: "back"
    });
    const protector = createDamageCombatant({
      instanceId: "scenario_protector",
      definitionId: "scenario_protector",
      name: "Scenario Protector",
      kind: "enemy",
      team: "enemy",
      maxBodyIntegrity: 100,
      maxContextStability: 100,
      guard: createTimedStatusEffect({
        id: "guard",
        value: 0.25,
        sourceId: "scenario_protector",
        targetId: "scenario_protector",
        skillId: "scenario_guard",
        appliedAt: 1,
        durationSeconds: 5
      }),
      protection: createTimedStatusEffect({
        id: "protection",
        value: 0.5,
        sourceId: "scenario_protector",
        targetId: "scenario_protected",
        skillId: "scenario_protect",
        appliedAt: 1,
        durationSeconds: 5
      })
    });
    const metrics = createInitialMetrics();
    const contributions = createInitialContributions([
      attacker,
      protector,
      protectedTarget
    ]);
    const events: BattleEvent[] = [];
    const damagePackage: AttackDamagePackage = {
      kind: "attack",
      sourceId: attacker.instanceId,
      targetId: protector.instanceId,
      intendedTargetId: protectedTarget.instanceId,
      skillId: "scenario_damage",
      outerDamage: 120,
      innerDamage: 80,
      familyMultiplier: 1,
      kineticDamageTakenMultiplier: 1
    };
    const targets: AttackDamageTargetContext = {
      intendedTarget: protectedTarget,
      damageTarget: protector,
      protector
    };

    const mitigatedDamagePackage = applyDamagePackageMitigation({
      damagePackage,
      attacker,
      targets,
      time: 2,
      metrics,
      contributions,
      events
    });

    expect(mitigatedDamagePackage.outerDamage).toBe(45);
    expect(mitigatedDamagePackage.innerDamage).toBe(40);
    expect(metrics.guardDamagePreventedByEnemy).toBe(30);
    expect(metrics.protectionDamagePreventedByEnemy).toBe(85);
    expect(events.map((event) => event.type)).toEqual(["guard_absorb", "protect"]);

    commitDamagePackage({
      damagePackage: mitigatedDamagePackage,
      attacker,
      targets,
      time: 2,
      metrics,
      contributions,
      events
    });

    expect(protector.bodyIntegrity).toBe(55);
    expect(protector.contextStability).toBe(60);
    expect(protector.lastCognitiveDamageAt).toBe(2);
    expect(metrics.playerOuterDamage).toBe(45);
    expect(metrics.playerInnerDamage).toBe(40);
    expect(contributions.get(attacker.instanceId)).toMatchObject({
      outerDamageDealt: 45,
      innerDamageDealt: 40
    });
    expect(contributions.get(protector.instanceId)).toMatchObject({
      outerDamageTaken: 45,
      innerDamageTaken: 40,
      guardDamagePrevented: 30,
      protectionDamagePrevented: 85,
      protectionTriggers: 1
    });
    expect(events[2]).toMatchObject({
      type: "attack",
      sourceId: attacker.instanceId,
      targetId: protector.instanceId,
      intendedTargetId: protectedTarget.instanceId,
      outerDamage: 45,
      innerDamage: 40
    });
  });

  it("rejects committing a package to a different target", () => {
    const attacker = createDamageCombatant({
      instanceId: "scenario_attacker"
    });
    const target = createDamageCombatant({
      instanceId: "scenario_target",
      kind: "enemy",
      team: "enemy"
    });
    const damagePackage: AttackDamagePackage = {
      kind: "attack",
      sourceId: attacker.instanceId,
      targetId: "scenario_other_target",
      skillId: "scenario_damage",
      outerDamage: 10,
      innerDamage: 0,
      familyMultiplier: 1,
      kineticDamageTakenMultiplier: 1
    };

    expect(() =>
      commitDamagePackage({
        damagePackage,
        attacker,
        targets: createTargetContext(target),
        time: 1,
        metrics: createInitialMetrics(),
        contributions: createInitialContributions([attacker, target]),
        events: []
      })
    ).toThrow(/does not match committed target/);
    expect(target.bodyIntegrity).toBe(target.maxBodyIntegrity);
  });

  it("rejects committing a package with a different source or intended target", () => {
    const attacker = createDamageCombatant({
      instanceId: "scenario_attacker"
    });
    const target = createDamageCombatant({
      instanceId: "scenario_target",
      kind: "enemy",
      team: "enemy"
    });
    const sourceMismatchPackage: AttackDamagePackage = {
      kind: "attack",
      sourceId: "scenario_other_attacker",
      targetId: target.instanceId,
      skillId: "scenario_damage",
      outerDamage: 10,
      innerDamage: 0,
      familyMultiplier: 1,
      kineticDamageTakenMultiplier: 1
    };
    const intendedMismatchPackage: AttackDamagePackage = {
      ...sourceMismatchPackage,
      sourceId: attacker.instanceId,
      intendedTargetId: "scenario_other_target"
    };
    const context = createTargetContext(target);

    expect(() =>
      commitDamagePackage({
        damagePackage: sourceMismatchPackage,
        attacker,
        targets: context,
        time: 1,
        metrics: createInitialMetrics(),
        contributions: createInitialContributions([attacker, target]),
        events: []
      })
    ).toThrow(/source/);
    expect(() =>
      applyDamagePackageMitigation({
        damagePackage: intendedMismatchPackage,
        attacker,
        targets: context,
        time: 1,
        metrics: createInitialMetrics(),
        contributions: createInitialContributions([attacker, target]),
        events: []
      })
    ).toThrow(/intended target/);
  });

  it("commits AI Overload burst damage through package recording", () => {
    const attacker = createDamageCombatant({
      instanceId: "scenario_breaker",
      team: "player",
      stats: {
        breachPower: 0.05
      }
    });
    const target = createDamageCombatant({
      instanceId: "scenario_qi_target",
      kind: "enemy",
      team: "enemy",
      maxBodyIntegrity: 1000,
      maxContextStability: 100,
      contextStability: 0
    });
    const metrics = createInitialMetrics();
    const contributions = createInitialContributions([attacker, target]);
    const events: BattleEvent[] = [];

    const damagePackage = createAiOverloadDamagePackage({
      attacker,
      target,
      time: 4,
      constants: defaultCombatFormulaConstants
    });

    expect(damagePackage).toMatchObject({
      kind: "ai_overload",
      sourceId: attacker.instanceId,
      targetId: target.instanceId,
      innerDamage: 0,
      endsAt: 10
    });
    expect(damagePackage.outerDamage).toBeCloseTo(150);
    expect(damagePackage.burstPercent).toBeCloseTo(0.15);

    commitAiOverloadDamagePackage({
      damagePackage,
      attacker,
      target,
      time: 4,
      metrics,
      contributions,
      events
    });

    expect(target).toMatchObject({
      bodyIntegrity: 850,
      contextStability: 0,
      isOverloaded: true,
      overloadEndsAt: 10
    });
    expect(metrics.aiOverloadsTriggeredByPlayer).toBe(1);
    expect(metrics.playerAiOverloadBurstDamage).toBeCloseTo(150);
    expect(contributions.get(attacker.instanceId)).toMatchObject({
      aiOverloadsTriggered: 1
    });
    expect(
      contributions.get(attacker.instanceId)?.aiOverloadBurstDamageDealt
    ).toBeCloseTo(150);
    expect(contributions.get(target.instanceId)?.outerDamageTaken).toBeCloseTo(150);
    expect(events[0]).toMatchObject({
      type: "ai_overload",
      time: 4,
      sourceId: attacker.instanceId,
      targetId: target.instanceId,
      endsAt: 10
    });
    expect(events[0].type === "ai_overload" ? events[0].burstDamage : 0).toBeCloseTo(150);
    expect(events[0].type === "ai_overload" ? events[0].burstPercent : 0).toBeCloseTo(0.15);
  });

  it("commits backlash damage through package recording", () => {
    const target = createDamageCombatant({
      instanceId: "scenario_backlash_target",
      team: "player",
      maxBodyIntegrity: 1000
    });
    const metrics = createInitialMetrics();
    const contributions = createInitialContributions([target]);
    const events: BattleEvent[] = [];

    const aiOverloadFeedbackPackage = createAiOverloadFeedbackDamagePackage({
      target,
      constants: defaultCombatFormulaConstants
    });

    expect(aiOverloadFeedbackPackage).toMatchObject({
      kind: "backlash",
      sourceId: target.instanceId,
      targetId: target.instanceId,
      outerDamage: 30,
      innerDamage: 0
    });

    const statusBacklashPackage = createBacklashDamagePackage({
      target,
      outerDamage: 25
    });

    commitBacklashDamagePackage({
      damagePackage: aiOverloadFeedbackPackage,
      target,
      time: 5,
      metrics,
      contributions,
      events
    });
    commitBacklashDamagePackage({
      damagePackage: statusBacklashPackage,
      target,
      time: 6,
      metrics,
      contributions,
      events
    });

    expect(target.bodyIntegrity).toBe(945);
    expect(metrics.backlashDamageToPlayers).toBe(55);
    expect(contributions.get(target.instanceId)).toMatchObject({
      outerDamageTaken: 55,
      backlashDamageTaken: 55
    });
    expect(events).toEqual([
      {
        type: "backlash",
        time: 5,
        sourceId: target.instanceId,
        damage: 30
      },
      {
        type: "backlash",
        time: 6,
        sourceId: target.instanceId,
        damage: 25
      }
    ]);
  });
});
