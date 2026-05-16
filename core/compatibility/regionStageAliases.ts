import {
  buildCompatibilityAliasIndex,
  type CompatibilityAliasEntry
} from "./aliasMap";

export type RegionStageAliasPhase = "region_stage_ids";
export type RegionStageAliasKind = "region" | "stage";

export type RegionStageAliasEntry = CompatibilityAliasEntry<RegionStageAliasPhase> &
  Readonly<{
    kind: RegionStageAliasKind;
  }>;

export type RegionMapKeyCollision = Readonly<{
  legacyId: string;
  targetId: string;
}>;

export type NormalizeRegionMapKeysResult<Value> = Readonly<{
  map: Record<string, Value>;
  normalized: boolean;
  collisions: readonly RegionMapKeyCollision[];
}>;

const REGION_REFERENCE_FIELDS = [
  "data/regions.json:id",
  "data/stages.json:regionId",
  "core/progression/types.ts:progress.districts",
  "core/balance:regionId"
] as const;

const STAGE_REFERENCE_FIELDS = [
  "data/regions.json:stageIds",
  "data/stages.json:id",
  "data/stages.json:nextStageId",
  "core/data/types.ts:UnlockCondition.stageId",
  "core/progression/types.ts:currentRouteId",
  "core/save/saveTypes.ts:selectedOfflineFarmRouteId",
  "core/balance:stageId"
] as const;

const REGION_ALIAS_DEFINITIONS = [
  {
    legacyId: "bamboo_road",
    targetId: "greenline_approach",
    displayName: "Greenline Approach"
  },
  {
    legacyId: "mist_valley",
    targetId: "veil_district",
    displayName: "Veil District"
  },
  {
    legacyId: "black_iron_fort",
    targetId: "black_iron_foundry",
    displayName: "Black Iron Foundry"
  },
  {
    legacyId: "lotus_monastery",
    targetId: "lotus_clinic",
    displayName: "Lotus Clinic"
  },
  {
    legacyId: "demon_cult_outpost",
    targetId: "redline_outpost",
    displayName: "Redline Outpost"
  }
] as const;

const STAGE_ALIAS_TARGET_PREFIXES = {
  bamboo_road: "greenline_approach",
  mist_valley: "veil_district",
  black_iron_fort: "black_iron_foundry",
  lotus_monastery: "lotus_clinic",
  demon_cult_outpost: "redline_outpost"
} as const;

const STAGE_ALIAS_SUFFIXES = {
  bamboo_road: 10,
  mist_valley: 6,
  black_iron_fort: 7,
  lotus_monastery: 7,
  demon_cult_outpost: 7
} as const;

function buildStageAliases(): RegionStageAliasEntry[] {
  return Object.entries(STAGE_ALIAS_SUFFIXES).flatMap(([legacyPrefix, count]) =>
    Array.from({ length: count }, (_, index) => {
      const suffix = index + 1;
      const targetPrefix =
        STAGE_ALIAS_TARGET_PREFIXES[
          legacyPrefix as keyof typeof STAGE_ALIAS_TARGET_PREFIXES
        ];

      return {
        kind: "stage",
        legacyId: `${legacyPrefix}_${suffix}`,
        targetId: `${targetPrefix}_${suffix}`,
        displayName: `${targetPrefix}_${suffix}`,
        referenceFields: STAGE_REFERENCE_FIELDS,
        phase: "region_stage_ids"
      };
    })
  );
}

export const REGION_ALIASES = REGION_ALIAS_DEFINITIONS.map(
  (entry): RegionStageAliasEntry => ({
    ...entry,
    kind: "region",
    referenceFields: REGION_REFERENCE_FIELDS,
    phase: "region_stage_ids"
  })
);

export const STAGE_ALIASES = buildStageAliases();

export const REGION_STAGE_ALIASES = [
  ...REGION_ALIASES,
  ...STAGE_ALIASES
] as const satisfies readonly RegionStageAliasEntry[];

export const REGION_ALIAS_INDEX = buildCompatibilityAliasIndex(REGION_ALIASES);
export const STAGE_ALIAS_INDEX = buildCompatibilityAliasIndex(STAGE_ALIASES);
export const REGION_STAGE_ALIAS_INDEX =
  buildCompatibilityAliasIndex(REGION_STAGE_ALIASES);

function normalizeAliasId(
  index: ReturnType<typeof buildCompatibilityAliasIndex<RegionStageAliasEntry>>,
  id: string
): string {
  return index.getByLegacyId(id)?.targetId ?? id;
}

function getLegacyAliasId(
  index: ReturnType<typeof buildCompatibilityAliasIndex<RegionStageAliasEntry>>,
  id: string
): string {
  return index.getByTargetId(id)?.legacyId ?? id;
}

export function normalizeRegionId(regionId: string): string {
  return normalizeAliasId(REGION_ALIAS_INDEX, regionId);
}

export function getLegacyRegionId(regionId: string): string {
  return getLegacyAliasId(REGION_ALIAS_INDEX, regionId);
}

export function getRegionIdAliases(regionId: string): readonly string[] {
  const legacyEntry = REGION_ALIAS_INDEX.getByLegacyId(regionId);
  const targetEntry = REGION_ALIAS_INDEX.getByTargetId(regionId);

  if (legacyEntry) {
    return [legacyEntry.targetId, legacyEntry.legacyId];
  }

  if (targetEntry) {
    return [targetEntry.targetId, targetEntry.legacyId];
  }

  return [regionId];
}

export function normalizeStageId(stageId: string): string {
  return normalizeAliasId(STAGE_ALIAS_INDEX, stageId);
}

export function getLegacyStageId(stageId: string): string {
  return getLegacyAliasId(STAGE_ALIAS_INDEX, stageId);
}

export function getStageIdAliases(stageId: string): readonly string[] {
  const legacyEntry = STAGE_ALIAS_INDEX.getByLegacyId(stageId);
  const targetEntry = STAGE_ALIAS_INDEX.getByTargetId(stageId);

  if (legacyEntry) {
    return [legacyEntry.targetId, legacyEntry.legacyId];
  }

  if (targetEntry) {
    return [targetEntry.targetId, targetEntry.legacyId];
  }

  return [stageId];
}

export function areStageIdsEquivalent(
  leftStageId: string,
  rightStageId: string
): boolean {
  return normalizeStageId(leftStageId) === normalizeStageId(rightStageId);
}

export function normalizeRegionMapKeys<Value>(
  map: Readonly<Record<string, Value>>
): NormalizeRegionMapKeysResult<Value> {
  const normalizedMap: Record<string, Value> = {};
  const deferredLegacyEntries: Array<readonly [string, Value]> = [];
  const collisions: RegionMapKeyCollision[] = [];

  for (const [regionId, value] of Object.entries(map)) {
    if (REGION_ALIAS_INDEX.getByLegacyId(regionId)) {
      deferredLegacyEntries.push([regionId, value]);
      continue;
    }

    normalizedMap[regionId] = value;
  }

  for (const [legacyId, value] of deferredLegacyEntries) {
    const targetId = normalizeRegionId(legacyId);

    if (Object.hasOwn(normalizedMap, targetId)) {
      collisions.push({ legacyId, targetId });
      continue;
    }

    normalizedMap[targetId] = value;
  }

  return {
    map: normalizedMap,
    normalized:
      collisions.length > 0 ||
      deferredLegacyEntries.length > 0 ||
      Object.keys(map).some((regionId) => normalizeRegionId(regionId) !== regionId),
    collisions
  };
}
