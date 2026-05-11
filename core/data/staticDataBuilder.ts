import type { StaticGameData } from "./types";

export const staticGameDataPartKeys = [
  "assignments",
  "heroes",
  "skills",
  "tactics",
  "enemies",
  "equipment",
  "equipmentSets",
  "regions",
  "stages",
  "upgrades",
  "skillUpgrades",
  "mastery",
  "formations",
  "styles",
  "statusEffects",
  "medicines"
] as const satisfies readonly (keyof StaticGameData)[];

export type StaticGameDataPartKey = (typeof staticGameDataPartKeys)[number];

export type StaticGameDataParts = {
  [Key in StaticGameDataPartKey]: unknown;
};

export function buildStaticGameData(parts: StaticGameDataParts): StaticGameData {
  return Object.fromEntries(
    staticGameDataPartKeys.map((key) => [key, parts[key]])
  ) as StaticGameData;
}
