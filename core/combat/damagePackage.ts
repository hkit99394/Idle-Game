import type { SkillDefinition, TacticPresetDefinition } from "../data/types";
import {
  calculateQiBreakBacklashDamage,
  calculateQiBreakBurst,
  calculateInnerDamage,
  calculateOuterDamage
} from "./formulas";
import {
  recordBacklash,
  recordDamage,
  recordQiBreak
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
  outerDamageTakenMultiplier: number;
};

export type QiBreakDamagePackage = {
  kind: "qi_break";
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
  | QiBreakDamagePackage
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
      "outer_damage_multiplier",
      1
    ) * bossDamageMultiplier;
  const innerTacticMultiplier =
    getPlayerTacticModifierValue(
      input.tactic,
      input.attacker,
      "inner_damage_multiplier",
      1
    ) * bossDamageMultiplier;
  const outerDamage =
    calculateOuterDamage(
      {
        attacker: input.attacker.stats,
        target: effectiveTargetStats,
        skillMultiplier: input.skill.outerMultiplier,
        targetIsQiBroken: target.isQiBroken
      },
      input.constants
    ) *
    familyMultiplier *
    outerTacticMultiplier *
    targetStatusModifiers.outerDamageTakenMultiplier;
  const innerDamage =
    calculateInnerDamage(
      {
        attacker: input.attacker.stats,
        target: effectiveTargetStats,
        skillMultiplier: input.skill.innerMultiplier,
        targetIsQiBroken: target.isQiBroken
      },
      input.constants
    ) *
    familyMultiplier *
    innerTacticMultiplier;

  return {
    kind: "attack",
    sourceId: input.attacker.instanceId,
    targetId: target.instanceId,
    intendedTargetId: getIntendedTargetId(input.targets),
    skillId: input.skill.id,
    outerDamage,
    innerDamage,
    familyMultiplier,
    outerDamageTakenMultiplier: targetStatusModifiers.outerDamageTakenMultiplier
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

  target.outerHp = Math.max(
    0,
    target.outerHp - input.damagePackage.outerDamage
  );
  target.innerQi = Math.max(
    0,
    target.innerQi - input.damagePackage.innerDamage
  );

  if (input.damagePackage.innerDamage > 0) {
    target.lastInnerDamageAt = input.time;
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

export function createQiBreakDamagePackage(input: {
  attacker: CombatantState;
  target: CombatantState;
  time: number;
  constants: CombatFormulaConstants;
  tactic?: TacticPresetDefinition | null;
}): QiBreakDamagePackage {
  const attackerBreakPower =
    input.attacker.stats.breakPower *
    getPlayerTacticModifierValue(
      input.tactic,
      input.attacker,
      "break_power_multiplier",
      1
    );
  const burst = calculateQiBreakBurst(
    {
      targetMaxOuterHp: input.target.maxOuterHp,
      attackerBreakPower,
      targetBreakResist: input.target.stats.breakResist
    },
    input.constants
  );

  return {
    kind: "qi_break",
    sourceId: input.attacker.instanceId,
    targetId: input.target.instanceId,
    outerDamage: burst.damage,
    innerDamage: 0,
    burstPercent: burst.percent,
    endsAt: input.time + input.constants.qiBreakDurationSeconds
  };
}

export function commitQiBreakDamagePackage(input: {
  damagePackage: QiBreakDamagePackage;
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
      `Qi Break package source ${input.damagePackage.sourceId} does not match attacking source ${input.attacker.instanceId}`
    );
  }

  input.target.innerQi = 0;
  input.target.isQiBroken = true;
  input.target.qiBreakEndsAt = input.damagePackage.endsAt;
  input.target.outerHp = Math.max(
    0,
    input.target.outerHp - input.damagePackage.outerDamage
  );

  recordQiBreak(
    input.metrics,
    input.contributions,
    input.attacker,
    input.target,
    input.damagePackage.outerDamage
  );
  input.events.push({
    type: "qi_break",
    time: input.time,
    sourceId: input.attacker.instanceId,
    targetId: input.target.instanceId,
    burstDamage: input.damagePackage.outerDamage,
    burstPercent: input.damagePackage.burstPercent,
    endsAt: input.damagePackage.endsAt
  });
}

export function createQiBreakBacklashDamagePackage(input: {
  target: CombatantState;
  constants: CombatFormulaConstants;
}): BacklashDamagePackage {
  return createBacklashDamagePackage({
    target: input.target,
    outerDamage: calculateQiBreakBacklashDamage(input.target.maxOuterHp, input.constants)
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

  input.target.outerHp = Math.max(
    0,
    input.target.outerHp - input.damagePackage.outerDamage
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
