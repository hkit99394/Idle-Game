import { describe, expect, it } from "vitest";
import {
  applyDamagePackageMitigation,
  commitBacklashDamagePackage,
  commitDamagePackage,
  commitQiBreakDamagePackage,
  createAttackDamagePackage,
  createBacklashDamagePackage,
  createQiBreakBacklashDamagePackage,
  createQiBreakDamagePackage,
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
  const maxOuterHp = input.maxOuterHp ?? combatScenarioBaseStats.maxOuterHp;
  const maxInnerQi = input.maxInnerQi ?? combatScenarioBaseStats.maxInnerQi;
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
    outerHp: maxOuterHp,
    innerQi: maxInnerQi,
    maxOuterHp,
    maxInnerQi,
    stats: {
      ...combatScenarioBaseStats,
      ...stats
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
    outerDamageTakenMultiplier: 1.5
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
      outerMultiplier: 1,
      innerMultiplier: 1
    });
    const attacker = createDamageCombatant({
      instanceId: "scenario_attacker",
      damageMultipliersByFamily: {
        scenario: 0.2
      },
      stats: {
        outerAttack: 200,
        innerAttack: 100
      }
    });
    const target = createDamageCombatant({
      instanceId: "scenario_target",
      definitionId: "scenario_enemy",
      kind: "enemy",
      team: "enemy",
      family: "scenario",
      stats: {
        outerDefense: 100,
        innerDefense: 100
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
    expect(damagePackage.outerDamageTakenMultiplier).toBe(1.5);
    expect(damagePackage.outerDamage).toBeCloseTo(240);
    expect(damagePackage.innerDamage).toBeCloseTo(60);
    expect(damagePackage.intendedTargetId).toBeUndefined();
  });

  it("keeps Qi-broken damage scaling inside the attack package", () => {
    const skill = createScenarioSkill({
      id: "scenario_qi_damage",
      outerMultiplier: 1,
      innerMultiplier: 1
    });
    const attacker = createDamageCombatant({
      instanceId: "scenario_attacker",
      stats: {
        outerAttack: 100,
        innerAttack: 80
      }
    });
    const target = createDamageCombatant({
      instanceId: "scenario_qi_broken",
      team: "enemy",
      kind: "enemy",
      isQiBroken: true
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
      outerMultiplier: 1,
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
      outerHp: 300
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
      maxOuterHp: 100,
      maxInnerQi: 100,
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
      outerDamageTakenMultiplier: 1
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

    expect(protector.outerHp).toBe(55);
    expect(protector.innerQi).toBe(60);
    expect(protector.lastInnerDamageAt).toBe(2);
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
      outerDamageTakenMultiplier: 1
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
    expect(target.outerHp).toBe(target.maxOuterHp);
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
      outerDamageTakenMultiplier: 1
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

  it("commits Qi Break burst damage through package recording", () => {
    const attacker = createDamageCombatant({
      instanceId: "scenario_breaker",
      team: "player",
      stats: {
        breakPower: 0.05
      }
    });
    const target = createDamageCombatant({
      instanceId: "scenario_qi_target",
      kind: "enemy",
      team: "enemy",
      maxOuterHp: 1000,
      maxInnerQi: 100,
      innerQi: 0
    });
    const metrics = createInitialMetrics();
    const contributions = createInitialContributions([attacker, target]);
    const events: BattleEvent[] = [];

    const damagePackage = createQiBreakDamagePackage({
      attacker,
      target,
      time: 4,
      constants: defaultCombatFormulaConstants
    });

    expect(damagePackage).toMatchObject({
      kind: "qi_break",
      sourceId: attacker.instanceId,
      targetId: target.instanceId,
      innerDamage: 0,
      endsAt: 10
    });
    expect(damagePackage.outerDamage).toBeCloseTo(150);
    expect(damagePackage.burstPercent).toBeCloseTo(0.15);

    commitQiBreakDamagePackage({
      damagePackage,
      attacker,
      target,
      time: 4,
      metrics,
      contributions,
      events
    });

    expect(target).toMatchObject({
      outerHp: 850,
      innerQi: 0,
      isQiBroken: true,
      qiBreakEndsAt: 10
    });
    expect(metrics.qiBreaksTriggeredByPlayer).toBe(1);
    expect(metrics.playerQiBreakBurstDamage).toBeCloseTo(150);
    expect(contributions.get(attacker.instanceId)).toMatchObject({
      qiBreaksTriggered: 1
    });
    expect(
      contributions.get(attacker.instanceId)?.qiBreakBurstDamageDealt
    ).toBeCloseTo(150);
    expect(contributions.get(target.instanceId)?.outerDamageTaken).toBeCloseTo(150);
    expect(events[0]).toMatchObject({
      type: "qi_break",
      time: 4,
      sourceId: attacker.instanceId,
      targetId: target.instanceId,
      endsAt: 10
    });
    expect(events[0].type === "qi_break" ? events[0].burstDamage : 0).toBeCloseTo(150);
    expect(events[0].type === "qi_break" ? events[0].burstPercent : 0).toBeCloseTo(0.15);
  });

  it("commits backlash damage through package recording", () => {
    const target = createDamageCombatant({
      instanceId: "scenario_backlash_target",
      team: "player",
      maxOuterHp: 1000
    });
    const metrics = createInitialMetrics();
    const contributions = createInitialContributions([target]);
    const events: BattleEvent[] = [];

    const qiBreakBacklashPackage = createQiBreakBacklashDamagePackage({
      target,
      constants: defaultCombatFormulaConstants
    });

    expect(qiBreakBacklashPackage).toMatchObject({
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
      damagePackage: qiBreakBacklashPackage,
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

    expect(target.outerHp).toBe(945);
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
