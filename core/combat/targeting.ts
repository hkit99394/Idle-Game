import type { CombatantState, TeamId, TargetRule } from "./types";

export function isLiving(combatant: CombatantState): boolean {
  return combatant.outerHp > 0 && combatant.defeatedAt === null;
}

export function selectTarget(
  combatants: CombatantState[],
  attackerTeam: TeamId,
  targetRule: TargetRule
): CombatantState | null {
  if (targetRule !== "first_living") {
    return null;
  }

  return combatants.find(
    (combatant) => combatant.team !== attackerTeam && isLiving(combatant)
  ) ?? null;
}

export function hasLivingTeamMember(
  combatants: CombatantState[],
  team: TeamId
): boolean {
  return combatants.some(
    (combatant) => combatant.team === team && isLiving(combatant)
  );
}
