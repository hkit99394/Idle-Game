export const MARTIAL_STYLE_IDS = [
  "fist",
  "palm",
  "leg",
  "sword",
  "blade",
  "staff",
  "hidden_weapons"
] as const;

export type MartialStyleId = (typeof MARTIAL_STYLE_IDS)[number];

export function isMartialStyleId(value: unknown): value is MartialStyleId {
  return (
    typeof value === "string" &&
    MARTIAL_STYLE_IDS.includes(value as MartialStyleId)
  );
}
