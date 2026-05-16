import type { CombatantState, TeamId, TargetRule } from "./types";
import { calculateCombatPower } from "./formulas";
import { FORMATION_SLOTS } from "./formations";

export const TARGET_RULES = [
  "first_living",
  "weakest_hp",
  "highest_cp",
  "inner_broken"
] as const satisfies TargetRule[];

const FORMATION_SLOT_ORDER = new Map(
  FORMATION_SLOTS.map((slot, index) => [slot, index])
);

export function isTargetRule(value: unknown): value is TargetRule {
  return (
    typeof value === "string" &&
    TARGET_RULES.includes(value as TargetRule)
  );
}

export function isLiving(combatant: CombatantState): boolean {
  return combatant.bodyIntegrity > 0 && combatant.defeatedAt === null;
}

function getFormationSlotOrder(combatant: CombatantState): number {
  return FORMATION_SLOT_ORDER.get(combatant.formationSlot) ?? FORMATION_SLOTS.length;
}

function getLivingOpponents(
  combatants: CombatantState[],
  attackerTeam: TeamId
): Array<{ combatant: CombatantState; encounterOrder: number }> {
  return combatants.flatMap((combatant, encounterOrder) =>
    combatant.team !== attackerTeam && isLiving(combatant)
      ? [{ combatant, encounterOrder }]
      : []
  );
}

function compareFormationPriority(
  first: { combatant: CombatantState; encounterOrder: number },
  second: { combatant: CombatantState; encounterOrder: number }
): number {
  const slotDifference =
    getFormationSlotOrder(first.combatant) -
    getFormationSlotOrder(second.combatant);

  return slotDifference || first.encounterOrder - second.encounterOrder;
}

type TargetCandidate = { combatant: CombatantState; encounterOrder: number };

function selectFirstLivingByFormation(
  candidates: Array<{ combatant: CombatantState; encounterOrder: number }>
): CombatantState | null {
  return [...candidates].sort(compareFormationPriority)[0]?.combatant ?? null;
}

function selectTargetFromCandidates(
  candidates: TargetCandidate[],
  targetRule: TargetRule,
  fallbackToFirstLiving: boolean
): CombatantState | null {
  switch (targetRule) {
    case "first_living":
      return selectFirstLivingByFormation(candidates);

    case "weakest_hp":
      return [...candidates].sort((first, second) => {
        const firstHpPercent = first.combatant.bodyIntegrity / first.combatant.maxBodyIntegrity;
        const secondHpPercent = second.combatant.bodyIntegrity / second.combatant.maxBodyIntegrity;

        return (
          firstHpPercent - secondHpPercent ||
          compareFormationPriority(first, second)
        );
      })[0].combatant;

    case "highest_cp":
      return [...candidates].sort((first, second) => {
        const firstCombatPower = calculateCombatPower(first.combatant.stats);
        const secondCombatPower = calculateCombatPower(second.combatant.stats);

        return (
          secondCombatPower - firstCombatPower ||
          compareFormationPriority(first, second)
        );
      })[0].combatant;

    case "inner_broken": {
      const brokenTarget = candidates
        .filter((candidate) => candidate.combatant.isOverloaded)
        .sort(compareFormationPriority)[0]?.combatant;

      return brokenTarget ?? (
        fallbackToFirstLiving ? selectFirstLivingByFormation(candidates) : null
      );
    }
  }
}

export function selectTarget(
  combatants: CombatantState[],
  attackerTeam: TeamId,
  targetRule: TargetRule
): CombatantState | null {
  const candidates = getLivingOpponents(combatants, attackerTeam);

  if (candidates.length === 0) {
    return null;
  }

  return selectTargetFromCandidates(candidates, targetRule, true);
}

export function selectTargetByPriorityRules(
  combatants: CombatantState[],
  attackerTeam: TeamId,
  targetRules: TargetRule[],
  fallbackRule: TargetRule
): CombatantState | null {
  const candidates = getLivingOpponents(combatants, attackerTeam);

  if (candidates.length === 0) {
    return null;
  }

  for (const targetRule of targetRules) {
    const target = selectTargetFromCandidates(candidates, targetRule, false);

    if (target) {
      return target;
    }
  }

  return selectTargetFromCandidates(candidates, fallbackRule, true);
}

export function hasLivingTeamMember(
  combatants: CombatantState[],
  team: TeamId
): boolean {
  return combatants.some(
    (combatant) => combatant.team === team && isLiving(combatant)
  );
}
