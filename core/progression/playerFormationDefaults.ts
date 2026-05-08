import { getDefaultFormationSlot } from "../combat";
import type { FormationSlot } from "../combat";

export const MVP_PLAYER_DEFAULT_FORMATION = {
  iron_fist_disciple: "front",
  azure_palm_monk: "middle",
  white_crane_swordsman: "back",
  mountain_staff_guardian: "front"
} as const satisfies Record<string, FormationSlot>;

const PLAYER_DEFAULT_FORMATION = {
  ...MVP_PLAYER_DEFAULT_FORMATION,
  lotus_mending_disciple: "back"
} as const satisfies Record<string, FormationSlot>;

export function getDefaultPlayerFormationSlot(
  heroId: string,
  heroIndex: number
): FormationSlot {
  const defaultFormation = PLAYER_DEFAULT_FORMATION as Partial<
    Record<string, FormationSlot>
  >;

  return defaultFormation[heroId] ?? getDefaultFormationSlot(heroIndex);
}

export function createDefaultPlayerFormation(
  heroIds: string[]
): Record<string, FormationSlot> {
  return Object.fromEntries(
    heroIds.map((heroId, index) => [
      heroId,
      getDefaultPlayerFormationSlot(heroId, index)
    ])
  );
}
