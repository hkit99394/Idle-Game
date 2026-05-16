import type { SkillDefinition, TacticPresetDefinition } from "../data/types";
import {
  calculateAiOverloadBurst,
  calculateAiOverloadFeedbackDamage,
  calculateInnerDamage,
  calculateOuterDamage
} from "./formulas";
import {
  recordBacklash,
  recordDamage,
  recordAiOverload
} from "./battleRecorder";
import {
  applyGuardReduction,
  applyProtectionReduction,
  findProtector,
  getEffectiveTargetStats
} from "./defensivePipeline";
import { getStatusCombatModifiers } from "./statusEffects";
import { selectTargetByPriorityRules } from "./targeting";
import {
  getPlayerTacticModifierValue,
  getTacticTargetRules
} from "./tactics";
import type {
  BattleContribution,
  BattleEvent,
  BattleMetrics,
  CombatFormulaConstants,
  CombatantState,
  StatusEffectDefinition
} from "./types";

export type AttackDamagePackage = {
  kind: "attack";
  sourceId: string;
  targetId: string;
  intendedTargetId?: string;
  skillId: string;
  outerDamage: number;
  innerDamage: number;
  familyMultiplier: number;
  kineticDamageTakenMultiplier: number;
  cognitiveDamageTakenMultiplier: number;
};

export type AiOverloadDamagePackage = {
  kind: "ai_overload";
  sourceId: string;
  targetId: string;
  outerDamage: number;
  innerDamage: 0;
  burstPercent: number;
  endsAt: number;
};

export type BacklashDamagePackage = {
  kind: "backlash";
  sourceId: string;
  targetId: string;
  outerDamage: number;
  innerDamage: 0;
};

export type DamagePackage =
  | AttackDamagePackage
  | AiOverloadDamagePackage
  | BacklashDamagePackage;

export type AttackDamageTargetContext = {
  intendedTarget: CombatantState;
  damageTarget: CombatantState;
  protector: CombatantState | null;
};

export function resolveAttackDamageTargets(input: {
  combatants: CombatantState[];
  attacker: CombatantState;
  skill: SkillDefinition;
  time: number;
  tactic?: TacticPresetDefinition | null;
}): AttackDamageTargetContext | null {
  const targetRules = getTacticTargetRules(
    input.tactic,
    input.attacker,
    input.skill.targetRule
  );
  const intendedTarget = selectTargetByPriorityRules(
    input.combatants,
    input.attacker.team,
    targetRules,
    input.skill.targetRule
  );

  if (!intendedTarget) {
    return null;
  }

  const protector = findProtector(input.combatants, intendedTarget, input.time);

  return {
    intendedTarget,
    damageTarget: protector ?? intendedTarget,
    protector
  };
}

function assertDamagePackageTarget(
  damagePackage: Pick<DamagePackage, "targetId">,
  target: CombatantState
): void {
  if (damagePackage.targetId !== target.instanceId) {
    throw new Error(
      `Damage package target ${damagePackage.targetId} does not match committed target ${target.instanceId}`
    );
  }
}

function getIntendedTargetId(
  targets: Pick<AttackDamageTargetContext, "damageTarget" | "intendedTarget">
): string | undefined {
  return targets.damageTarget.instanceId === targets.intendedTarget.instanceId
    ? undefined
    : targets.intendedTarget.instanceId;
}

function assertDamagePackageContext(
  damagePackage: AttackDamagePackage,
  attacker: CombatantState,
  targets: Pick<AttackDamageTargetContext, "damageTarget" | "intendedTarget">
): void {
  assertDamagePackageTarget(damagePackage, targets.damageTarget);

  if (damagePackage.sourceId !== attacker.instanceId) {
    throw new Error(
      `Damage package source ${damagePackage.sourceId} does not match attacking source ${attacker.instanceId}`
    );
  }

  const intendedTargetId = getIntendedTargetId(targets);

  if (damagePackage.intendedTargetId !== intendedTargetId) {
    throw new Error(
      `Damage package intended target ${damagePackage.intendedTargetId ?? "none"} does not match resolved intended target ${intendedTargetId ?? "none"}`
    );
  }
}

export function createAttackDamagePackage(input: {
  attacker: CombatantState;
  targets: AttackDamageTargetContext;
  skill: SkillDefinition;
  time: number;
  constants: CombatFormulaConstants;
  statusDefinitions: Record<string, StatusEffectDefinition>;
  tactic?: TacticPresetDefinition | null;
}): AttackDamagePackage {
  const target = input.targets.damageTarget;
  const effectiveTargetStats = getEffectiveTargetStats(target, input.time);
  const targetStatusModifiers = getStatusCombatModifiers(
    target.activeStatuses,
    input.statusDefinitions
  );
  const familyMultiplier =
    1 +
    (target.family
      ? input.attacker.damageMultipliersByFamily[target.family] ?? 0
      : 0);
  const bossDamageMultiplier =
    target.enemyType === "boss"
      ? getPlayerTacticModifierValue(
          input.tactic,
          input.attacker,
          "boss_damage_multiplier",
          1
        )
      : 1;
  const outerTacticMultiplier =
    getPlayerTacticModifierValue(
      input.tactic,
      input.attacker,
      "kinetic_damage_multiplier",
      1
    ) * bossDamageMultiplier;
  const innerTacticMultiplier =
    getPlayerTacticModifierValue(
      input.tactic,
      input.attacker,
      "cognitive_damage_multiplier",
      1
    ) * bossDamageMultiplier;
  const outerDamage =
    calculateOuterDamage(
      {
        attacker: input.attacker.stats,
        target: effectiveTargetStats,
        skillMultiplier: input.skill.kineticMultiplier,
        targetIsOverloaded: target.isOverloaded
      },
      input.constants
    ) *
    familyMultiplier *
    outerTacticMultiplier *
    targetStatusModifiers.kineticDamageTakenMultiplier;
  const innerDamage =
    calculateInnerDamage(
      {
        attacker: input.attacker.stats,
        target: effectiveTargetStats,
        skillMultiplier: input.skill.cognitiveMultiplier,
        targetIsOverloaded: target.isOverloaded
      },
      input.constants
    ) *
    familyMultiplier *
    innerTacticMultiplier;
  const modifiedInnerDamage =
    innerDamage * targetStatusModifiers.cognitiveDamageTakenMultiplier;

  return {
    kind: "attack",
    sourceId: input.attacker.instanceId,
    targetId: target.instanceId,
    intendedTargetId: getIntendedTargetId(input.targets),
    skillId: input.skill.id,
    outerDamage,
    innerDamage: modifiedInnerDamage,
    familyMultiplier,
    kineticDamageTakenMultiplier: targetStatusModifiers.kineticDamageTakenMultiplier,
    cognitiveDamageTakenMultiplier: targetStatusModifiers.cognitiveDamageTakenMultiplier
  };
}

export function applyDamagePackageMitigation(input: {
  damagePackage: AttackDamagePackage;
  attacker: CombatantState;
  targets: AttackDamageTargetContext;
  time: number;
  metrics: BattleMetrics;
  contributions: Map<string, BattleContribution>;
  events: BattleEvent[];
}): AttackDamagePackage {
  assertDamagePackageContext(
    input.damagePackage,
    input.attacker,
    input.targets
  );

  const guardedOuterDamage = applyGuardReduction(
    input.targets.damageTarget,
    input.damagePackage.outerDamage,
    input.time,
    input.metrics,
    input.contributions,
    input.events
  );
  const protectedDamage = applyProtectionReduction(
    input.targets.protector,
    input.targets.intendedTarget,
    input.attacker,
    guardedOuterDamage,
    input.damagePackage.innerDamage,
    input.time,
    input.metrics,
    input.contributions,
    input.events
  );

  return {
    ...input.damagePackage,
    outerDamage: protectedDamage.outerDamage,
    innerDamage: protectedDamage.innerDamage
  };
}

export function commitDamagePackage(input: {
  damagePackage: AttackDamagePackage;
  attacker: CombatantState;
  targets: Pick<AttackDamageTargetContext, "damageTarget" | "intendedTarget">;
  time: number;
  metrics: BattleMetrics;
  contributions: Map<string, BattleContribution>;
  events: BattleEvent[];
}): void {
  assertDamagePackageContext(
    input.damagePackage,
    input.attacker,
    input.targets
  );

  const target = input.targets.damageTarget;

  target.bodyIntegrity = Math.max(
    0,
    target.bodyIntegrity - input.damagePackage.outerDamage
  );
  target.contextStability = Math.max(
    0,
    target.contextStability - input.damagePackage.innerDamage
  );

  if (input.damagePackage.innerDamage > 0) {
    target.lastCognitiveDamageAt = input.time;
  }

  recordDamage(
    input.metrics,
    input.contributions,
    input.attacker,
    target,
    input.damagePackage.outerDamage,
    input.damagePackage.innerDamage
  );
  input.events.push({
    type: "attack",
    time: input.time,
    sourceId: input.attacker.instanceId,
    targetId: target.instanceId,
    skillId: input.damagePackage.skillId,
    outerDamage: input.damagePackage.outerDamage,
    innerDamage: input.damagePackage.innerDamage,
    intendedTargetId: getIntendedTargetId(input.targets)
  });
}

export function createAiOverloadDamagePackage(input: {
  attacker: CombatantState;
  target: CombatantState;
  time: number;
  constants: CombatFormulaConstants;
  tactic?: TacticPresetDefinition | null;
}): AiOverloadDamagePackage {
  const attackerBreachPower =
    input.attacker.stats.breachPower *
    getPlayerTacticModifierValue(
      input.tactic,
      input.attacker,
      "breach_power_multiplier",
      1
    );
  const burst = calculateAiOverloadBurst(
    {
      targetMaxBodyIntegrity: input.target.maxBodyIntegrity,
      attackerBreachPower,
      targetOverloadResist: input.target.stats.overloadResist
    },
    input.constants
  );

  return {
    kind: "ai_overload",
    sourceId: input.attacker.instanceId,
    targetId: input.target.instanceId,
    outerDamage: burst.damage,
    innerDamage: 0,
    burstPercent: burst.percent,
    endsAt: input.time + input.constants.aiOverloadDurationSeconds
  };
}

export function commitAiOverloadDamagePackage(input: {
  damagePackage: AiOverloadDamagePackage;
  attacker: CombatantState;
  target: CombatantState;
  time: number;
  metrics: BattleMetrics;
  contributions: Map<string, BattleContribution>;
  events: BattleEvent[];
}): void {
  assertDamagePackageTarget(input.damagePackage, input.target);

  if (input.damagePackage.sourceId !== input.attacker.instanceId) {
    throw new Error(
      `AI Overload package source ${input.damagePackage.sourceId} does not match attacking source ${input.attacker.instanceId}`
    );
  }

  input.target.contextStability = 0;
  input.target.isOverloaded = true;
  input.target.overloadEndsAt = input.damagePackage.endsAt;
  input.target.bodyIntegrity = Math.max(
    0,
    input.target.bodyIntegrity - input.damagePackage.outerDamage
  );

  recordAiOverload(
    input.metrics,
    input.contributions,
    input.attacker,
    input.target,
    input.damagePackage.outerDamage
  );
  input.events.push({
    type: "ai_overload",
    time: input.time,
    sourceId: input.attacker.instanceId,
    targetId: input.target.instanceId,
    burstDamage: input.damagePackage.outerDamage,
    burstPercent: input.damagePackage.burstPercent,
    endsAt: input.damagePackage.endsAt
  });
}

export function createAiOverloadFeedbackDamagePackage(input: {
  target: CombatantState;
  constants: CombatFormulaConstants;
}): BacklashDamagePackage {
  return createBacklashDamagePackage({
    target: input.target,
    outerDamage: calculateAiOverloadFeedbackDamage(input.target.maxBodyIntegrity, input.constants)
  });
}

export function createBacklashDamagePackage(input: {
  target: CombatantState;
  outerDamage: number;
}): BacklashDamagePackage {
  return {
    kind: "backlash",
    sourceId: input.target.instanceId,
    targetId: input.target.instanceId,
    outerDamage: input.outerDamage,
    innerDamage: 0
  };
}

export function commitBacklashDamagePackage(input: {
  damagePackage: BacklashDamagePackage;
  target: CombatantState;
  time: number;
  metrics: BattleMetrics;
  contributions: Map<string, BattleContribution>;
  events: BattleEvent[];
}): void {
  assertDamagePackageTarget(input.damagePackage, input.target);

  if (input.damagePackage.sourceId !== input.target.instanceId) {
    throw new Error(
      `Backlash package source ${input.damagePackage.sourceId} does not match damaged target ${input.target.instanceId}`
    );
  }

  input.target.bodyIntegrity = Math.max(
    0,
    input.target.bodyIntegrity - input.damagePackage.outerDamage
  );
  recordBacklash(
    input.metrics,
    input.contributions,
    input.target,
    input.damagePackage.outerDamage
  );
  input.events.push({
    type: "backlash",
    time: input.time,
    sourceId: input.target.instanceId,
    damage: input.damagePackage.outerDamage
  });
}
