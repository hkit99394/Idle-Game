import type { BattleContribution, BattleEvent, BattleMetrics, CombatantState } from "./types";
import { clamp } from "./formulas";
import { getActiveStatusEffect, getActiveStatusEffectValue } from "./statusEffects";
import { isLiving } from "./targeting";

const DEFENSIVE_EFFECT_MAX_VALUE = 0.9;
const RECOVERY_EFFECT_MAX_VALUE = 1;
const FORMATION_SLOT_ORDER = {
  front: 0,
  middle: 1,
  back: 2
} as const;

function getFormationSlotOrder(combatant: CombatantState): number {
  return FORMATION_SLOT_ORDER[combatant.formationSlot];
}

export function clampDefensiveEffectValue(value: number): number {
  return clamp(value, 0, DEFENSIVE_EFFECT_MAX_VALUE);
}

export function clampRecoveryEffectValue(value: number): number {
  return clamp(value, 0, RECOVERY_EFFECT_MAX_VALUE);
}

export function getEffectiveTargetStats(
  target: CombatantState,
  time: number
): CombatantState["stats"] {
  const armorBreak = getActiveStatusEffectValue(
    target,
    "armor_break",
    time,
    clampDefensiveEffectValue
  );
  const innerDefenseDown = getActiveStatusEffectValue(
    target,
    "inner_defense_down",
    time,
    clampDefensiveEffectValue
  );

  if (armorBreak <= 0 && innerDefenseDown <= 0) {
    return target.stats;
  }

  return {
    ...target.stats,
    outerDefense: target.stats.outerDefense * (1 - armorBreak),
    innerDefense: target.stats.innerDefense * (1 - innerDefenseDown)
  };
}

export function findProtector(
  combatants: CombatantState[],
  target: CombatantState,
  time: number
): CombatantState | null {
  const targetSlotOrder = getFormationSlotOrder(target);

  return combatants
    .flatMap((combatant, encounterOrder) =>
      combatant.team === target.team &&
      combatant.instanceId !== target.instanceId &&
      isLiving(combatant) &&
      getActiveStatusEffectValue(
        combatant,
        "protection",
        time,
        clampDefensiveEffectValue
      ) > 0 &&
      getFormationSlotOrder(combatant) < targetSlotOrder
        ? [{ combatant, encounterOrder }]
        : []
    )
    .sort((first, second) => {
      const slotDifference =
        getFormationSlotOrder(second.combatant) -
        getFormationSlotOrder(first.combatant);

      return slotDifference || first.encounterOrder - second.encounterOrder;
    })[0]?.combatant ?? null;
}

export function applyGuardReduction(
  target: CombatantState,
  outerDamage: number,
  time: number,
  metrics: BattleMetrics,
  contributions: Map<string, BattleContribution>,
  events: BattleEvent[]
): number {
  const guard = getActiveStatusEffect(target, "guard", time);

  if (!guard) {
    return outerDamage;
  }

  const armorBreak = getActiveStatusEffectValue(
    target,
    "armor_break",
    time,
    clampDefensiveEffectValue
  );
  const reduction = Math.max(0, clampDefensiveEffectValue(guard.value) - armorBreak);

  if (reduction <= 0) {
    return outerDamage;
  }

  const outerDamagePrevented = outerDamage * reduction;

  if (target.team === "player") {
    metrics.guardDamagePreventedByPlayer += outerDamagePrevented;
  } else {
    metrics.guardDamagePreventedByEnemy += outerDamagePrevented;
  }

  const targetContribution = contributions.get(target.instanceId);

  if (targetContribution) {
    targetContribution.guardDamagePrevented += outerDamagePrevented;
  }

  events.push({
    type: "guard_absorb",
    time,
    targetId: target.instanceId,
    skillId: guard.skillId,
    statusId: "guard",
    outerDamagePrevented,
    reduction
  });

  return outerDamage - outerDamagePrevented;
}

function recordProtection(
  protector: CombatantState,
  protectedTarget: CombatantState,
  attacker: CombatantState,
  outerDamagePrevented: number,
  innerDamagePrevented: number,
  reduction: number,
  time: number,
  metrics: BattleMetrics,
  contributions: Map<string, BattleContribution>,
  events: BattleEvent[]
): void {
  const protection = getActiveStatusEffect(protector, "protection", time);

  if (!protection) {
    return;
  }

  const totalPrevented = outerDamagePrevented + innerDamagePrevented;

  if (protector.team === "player") {
    metrics.protectionDamagePreventedByPlayer += totalPrevented;
  } else {
    metrics.protectionDamagePreventedByEnemy += totalPrevented;
  }

  const protectorContribution = contributions.get(protector.instanceId);

  if (protectorContribution) {
    protectorContribution.protectionDamagePrevented += totalPrevented;
    protectorContribution.protectionTriggers += 1;
  }

  events.push({
    type: "protect",
    time,
    sourceId: protector.instanceId,
    protectedId: protectedTarget.instanceId,
    attackerId: attacker.instanceId,
    skillId: protection.skillId,
    statusId: "protection",
    outerDamagePrevented,
    innerDamagePrevented,
    reduction
  });
}

export function applyProtectionReduction(
  protector: CombatantState | null,
  protectedTarget: CombatantState,
  attacker: CombatantState,
  outerDamage: number,
  innerDamage: number,
  time: number,
  metrics: BattleMetrics,
  contributions: Map<string, BattleContribution>,
  events: BattleEvent[]
): { outerDamage: number; innerDamage: number } {
  if (!protector) {
    return { outerDamage, innerDamage };
  }

  const protection = getActiveStatusEffect(protector, "protection", time);

  if (!protection) {
    return { outerDamage, innerDamage };
  }

  const reduction = clampDefensiveEffectValue(protection.value);

  if (reduction <= 0) {
    return { outerDamage, innerDamage };
  }

  const outerDamagePrevented = outerDamage * reduction;
  const innerDamagePrevented = innerDamage * reduction;

  recordProtection(
    protector,
    protectedTarget,
    attacker,
    outerDamagePrevented,
    innerDamagePrevented,
    reduction,
    time,
    metrics,
    contributions,
    events
  );

  return {
    outerDamage: outerDamage - outerDamagePrevented,
    innerDamage: innerDamage - innerDamagePrevented
  };
}
