export const FORMATION_SLOTS = ["front", "middle", "back"] as const;

export type FormationSlot = (typeof FORMATION_SLOTS)[number];

export function isFormationSlot(value: unknown): value is FormationSlot {
  return (
    typeof value === "string" &&
    FORMATION_SLOTS.includes(value as FormationSlot)
  );
}

export function getDefaultFormationSlot(index: number): FormationSlot {
  if (index <= 0) {
    return "front";
  }

  if (index === 1) {
    return "middle";
  }

  return "back";
}
