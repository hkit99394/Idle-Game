export const COMBAT_ROLES = ["tank", "breaker", "striker", "support"] as const;

export type CombatRole = (typeof COMBAT_ROLES)[number];

export function isCombatRole(value: unknown): value is CombatRole {
  return (
    typeof value === "string" &&
    COMBAT_ROLES.includes(value as CombatRole)
  );
}
