import { describe, expect, it } from "vitest";
import {
  REGION_ALIASES,
  REGION_ALIAS_INDEX,
  REGION_STAGE_ALIASES,
  REGION_STAGE_ALIAS_INDEX,
  STAGE_ALIASES,
  STAGE_ALIAS_INDEX,
  areStageIdsEquivalent,
  getLegacyRegionId,
  getLegacyStageId,
  getRegionIdAliases,
  getStageIdAliases,
  normalizeRegionId,
  normalizeRegionMapKeys,
  normalizeStageId
} from "../../core/compatibility";
import { staticData } from "../helpers/staticData";

const regionTargetIds = {
  bamboo_road: "greenline_approach",
  mist_valley: "veil_district",
  black_iron_fort: "black_iron_foundry",
  lotus_monastery: "lotus_clinic",
  demon_cult_outpost: "redline_outpost"
} as const;

function expectedStageTargetId(stageId: string): string {
  const [legacyRegionId, suffix] = Object.entries(regionTargetIds)
    .map(([legacyPrefix, targetPrefix]) =>
      stageId.startsWith(`${legacyPrefix}_`)
        ? [targetPrefix, stageId.slice(legacyPrefix.length + 1)]
        : null
    )
    .find((entry): entry is [string, string] => entry !== null) ?? [
    stageId,
    ""
  ];

  return suffix.length > 0 ? `${legacyRegionId}_${suffix}` : legacyRegionId;
}

describe("region and stage compatibility aliases", () => {
  it("defines one region alias for every configured region", () => {
    expect(REGION_ALIASES.map((alias) => alias.targetId)).toEqual(
      staticData.regions.map((region) => region.id)
    );
    expect(
      REGION_ALIASES.map(({ legacyId, targetId, phase, kind }) => ({
        legacyId,
        targetId,
        phase,
        kind
      }))
    ).toEqual(
      Object.entries(regionTargetIds).map(([legacyId, targetId]) => ({
        legacyId,
        targetId,
        phase: "region_stage_ids",
        kind: "region"
      }))
    );
  });

  it("defines one stage alias for every configured stage", () => {
    expect(STAGE_ALIASES.map((alias) => alias.targetId)).toEqual(
      staticData.stages.map((stage) => stage.id)
    );
    expect(
      STAGE_ALIASES.map(({ legacyId, targetId, phase, kind }) => ({
        legacyId,
        targetId,
        phase,
        kind
      }))
    ).toEqual(
      STAGE_ALIASES.map((alias) => ({
        legacyId: alias.legacyId,
        targetId: expectedStageTargetId(alias.legacyId),
        phase: "region_stage_ids",
        kind: "stage"
      }))
    );
  });

  it("looks up aliases by legacy id, target id, and phase", () => {
    expect(REGION_ALIAS_INDEX.getByLegacyId("bamboo_road")).toMatchObject({
      targetId: "greenline_approach",
      displayName: "Greenline Approach"
    });
    expect(STAGE_ALIAS_INDEX.getByLegacyId("demon_cult_outpost_7")).toMatchObject(
      {
        targetId: "redline_outpost_7",
        kind: "stage"
      }
    );
    expect(
      REGION_STAGE_ALIAS_INDEX.getByTargetId("black_iron_foundry_7")
    ).toMatchObject({
      legacyId: "black_iron_fort_7",
      kind: "stage"
    });
    expect(
      REGION_STAGE_ALIAS_INDEX.getByPhase("region_stage_ids")
    ).toHaveLength(REGION_STAGE_ALIASES.length);
  });

  it("normalizes legacy ids while leaving canonical and unknown ids stable", () => {
    expect(normalizeRegionId("lotus_monastery")).toBe("lotus_clinic");
    expect(normalizeRegionId("lotus_clinic")).toBe("lotus_clinic");
    expect(normalizeRegionId("missing_region")).toBe("missing_region");

    expect(normalizeStageId("mist_valley_6")).toBe("veil_district_6");
    expect(normalizeStageId("veil_district_6")).toBe("veil_district_6");
    expect(normalizeStageId("missing_stage")).toBe("missing_stage");
  });

  it("resolves reverse aliases and equivalent id sets", () => {
    expect(getLegacyRegionId("greenline_approach")).toBe("bamboo_road");
    expect(getLegacyRegionId("bamboo_road")).toBe("bamboo_road");
    expect(getRegionIdAliases("greenline_approach")).toEqual([
      "greenline_approach",
      "bamboo_road"
    ]);

    expect(getLegacyStageId("redline_outpost_7")).toBe(
      "demon_cult_outpost_7"
    );
    expect(getStageIdAliases("demon_cult_outpost_7")).toEqual([
      "redline_outpost_7",
      "demon_cult_outpost_7"
    ]);
    expect(areStageIdsEquivalent("lotus_monastery_7", "lotus_clinic_7")).toBe(
      true
    );
    expect(areStageIdsEquivalent("lotus_monastery_7", "lotus_clinic_6")).toBe(
      false
    );
  });

  it("normalizes region-keyed maps and reports collisions", () => {
    const canonicalValue = { highestClearedStageIndex: 4 };
    const legacyValue = { highestClearedStageIndex: 1 };

    expect(
      normalizeRegionMapKeys({
        bamboo_road: legacyValue,
        mist_valley: { highestClearedStageIndex: 2 },
        unknown_region: { highestClearedStageIndex: 3 }
      })
    ).toEqual({
      map: {
        greenline_approach: legacyValue,
        veil_district: { highestClearedStageIndex: 2 },
        unknown_region: { highestClearedStageIndex: 3 }
      },
      normalized: true,
      collisions: []
    });

    expect(
      normalizeRegionMapKeys({
        greenline_approach: canonicalValue,
        bamboo_road: legacyValue
      })
    ).toEqual({
      map: {
        greenline_approach: canonicalValue
      },
      normalized: true,
      collisions: [
        {
          legacyId: "bamboo_road",
          targetId: "greenline_approach"
        }
      ]
    });
  });
});
