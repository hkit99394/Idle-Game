export const MARTIAL_STYLE_IDS = [
  "impact",
  "pulse",
  "vector",
  "edge",
  "rend",
  "brace",
  "ghostware"
] as const;

export type MartialStyleId = (typeof MARTIAL_STYLE_IDS)[number];

export function isMartialStyleId(value: unknown): value is MartialStyleId {
  return (
    typeof value === "string" &&
    MARTIAL_STYLE_IDS.includes(value as MartialStyleId)
  );
}
