import { calculateAttackInterval, clamp } from "./formulas";
import { getActiveStatusEffectValue } from "./statusEffects";
import { isLiving } from "./targeting";
import type { CombatFormulaConstants, CombatantState } from "./types";

export function getInitialActionTime(
  speed: number,
  constants: CombatFormulaConstants
): number {
  return calculateAttackInterval(speed, constants);
}

export function getEffectiveActionSpeed(
  combatant: CombatantState,
  time: number
): number {
  const speedReduction = getActiveStatusEffectValue(
    combatant,
    "speed_down",
    time,
    (value) => clamp(value, 0, 0.9)
  );

  return combatant.stats.speed * (1 - speedReduction);
}

export function canCombatantActAt(
  combatant: CombatantState,
  time: number
): boolean {
  return isLiving(combatant) && time >= combatant.nextActionAt;
}

export function getNextActionTime(input: {
  combatant: CombatantState;
  time: number;
  constants: CombatFormulaConstants;
}): number {
  return (
    input.time +
    calculateAttackInterval(
      getEffectiveActionSpeed(input.combatant, input.time),
      input.constants
    )
  );
}

export function scheduleNextAction(input: {
  combatant: CombatantState;
  time: number;
  constants: CombatFormulaConstants;
}): void {
  input.combatant.nextActionAt = getNextActionTime(input);
}
