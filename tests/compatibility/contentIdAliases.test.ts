import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CONTENT_ID_ALIASES,
  CONTENT_ID_ALIAS_INDEX,
  CONTENT_ID_ALIASES_BY_KIND,
  buildCompatibilityAliasIndex,
  areContentIdsEquivalent,
  getContentAliasIndexByKind,
  getContentAliasesByKind,
  getContentIdAliases,
  getLegacyContentId,
  normalizeContentId,
  normalizeContentIdMapKeys,
  type ContentIdAliasKind,
  type ContentIdAliasPhase
} from "../../core/compatibility";
import { staticData } from "../helpers/staticData";

type PreflightDecision = "Migrate" | "Keep";

type PreflightRow = Readonly<{
  currentId: string;
  targetId: string;
  decision: PreflightDecision;
}>;

const preflightSource = readFileSync(
  new URL("../../docs/stage-2.6-content-id-preflight.md", import.meta.url),
  "utf8"
);

const expectedPhaseCounts = {
  hostile_ids: 25,
  initiate_ids: 5,
  protocol_ids: 22,
  style_ids: 14,
  augment_ids: 15,
  countermeasure_ids: 3,
  status_ids: 4,
  operation_ids: 4,
  routine_ids: 6
} as const satisfies Record<ContentIdAliasPhase, number>;

const expectedKindCounts = {
  hostile_family: 5,
  hostile: 20,
  initiate: 5,
  protocol: 17,
  skill_upgrade: 5,
  style: 7,
  style_branch: 7,
  augment: 14,
  augment_set: 1,
  countermeasure: 3,
  status: 4,
  operation: 4,
  routine: 6
} as const satisfies Record<ContentIdAliasKind, number>;

function parsePreflightRows(): PreflightRow[] {
  return [...preflightSource.matchAll(/^\| `([^`]+)` \| `([^`]+)` \| (Migrate|Keep) \|/gm)]
    .map((match) => ({
      currentId: match[1],
      targetId: match[2],
      decision: match[3] as PreflightDecision
    }));
}

function pairKey(currentId: string, targetId: string): string {
  return `${currentId}->${targetId}`;
}

function configuredContentIds(): string[] {
  return [
    ...new Set(staticData.enemies.map((enemy) => enemy.family)),
    ...staticData.enemies.map((enemy) => enemy.id),
    ...staticData.heroes.map((hero) => hero.id),
    ...staticData.skills.map((skill) => skill.id),
    ...staticData.skillUpgrades.map((upgrade) => upgrade.id),
    ...staticData.styles.flatMap((style) => [
      style.id,
      ...style.branches.map((branch) => branch.id)
    ]),
    ...staticData.equipment.map((equipment) => equipment.id),
    ...(staticData.equipmentSets ?? []).map((set) => set.id),
    ...staticData.medicines.map((medicine) => medicine.id),
    ...staticData.statusEffects.map((status) => status.id),
    ...(staticData.assignments ?? []).map((assignment) => assignment.id),
    ...staticData.tactics.map((tactic) => tactic.id)
  ];
}

describe("content id compatibility aliases", () => {
  it("defines the Stage 2.6 content alias counts by phase and kind", () => {
    expect(CONTENT_ID_ALIASES).toHaveLength(98);

    for (const [phase, count] of Object.entries(expectedPhaseCounts)) {
      expect(
        CONTENT_ID_ALIAS_INDEX.getByPhase(phase as ContentIdAliasPhase)
      ).toHaveLength(count);
    }

    for (const [kind, count] of Object.entries(expectedKindCounts)) {
      expect(getContentAliasesByKind(kind as ContentIdAliasKind)).toHaveLength(
        count
      );
    }
  });

  it("looks up aliases by legacy id, target id, phase, and kind", () => {
    expect(
      getContentAliasIndexByKind("hostile").getByLegacyId("bamboo_bandit")
    ).toMatchObject({
      kind: "hostile",
      phase: "hostile_ids",
      targetId: "greenline_cutter",
      displayName: "Greenline Cutter"
    });

    expect(
      getContentAliasIndexByKind("augment").getByTargetId("black_iron_saber")
    ).toMatchObject({
      kind: "augment",
      legacyId: "black_iron_saber_blade",
      displayName: "Black Iron Saber"
    });

    expect(CONTENT_ID_ALIAS_INDEX.getByPhase("protocol_ids")).toHaveLength(22);
    expect(CONTENT_ID_ALIASES_BY_KIND.status.map((alias) => alias.targetId))
      .toEqual([
        "corruption",
        "trauma",
        "context_suppression",
        "exposed"
      ]);
  });

  it("normalizes ids by kind without crossing category boundaries", () => {
    expect(normalizeContentId("hostile", "black_iron_saber")).toBe(
      "ironwall_saber"
    );
    expect(normalizeContentId("augment", "black_iron_saber_blade")).toBe(
      "black_iron_saber"
    );
    expect(normalizeContentId("augment", "black_iron_saber")).toBe(
      "black_iron_saber"
    );
    expect(normalizeContentId("hostile", "ironwall_saber")).toBe(
      "ironwall_saber"
    );
    expect(normalizeContentId("routine", "missing_routine")).toBe(
      "missing_routine"
    );
  });

  it("resolves reverse aliases, alias sets, equivalence, and missing ids", () => {
    expect(getLegacyContentId("routine", "kinetic_crush")).toBe(
      "outer_pressure"
    );
    expect(getLegacyContentId("routine", "outer_pressure")).toBe(
      "outer_pressure"
    );
    expect(getLegacyContentId("routine", "missing_routine")).toBe(
      "missing_routine"
    );
    expect(getContentIdAliases("status", "context_suppression")).toEqual([
      "context_suppression",
      "qi_suppression"
    ]);
    expect(getContentIdAliases("status", "qi_suppression")).toEqual([
      "context_suppression",
      "qi_suppression"
    ]);
    expect(getContentIdAliases("status", "burning_blood")).toEqual([
      "burning_blood"
    ]);
    expect(areContentIdsEquivalent("style", "palm", "pulse")).toBe(true);
    expect(areContentIdsEquivalent("style", "palm", "impact")).toBe(false);
  });

  it("normalizes content-id map keys and reports collisions", () => {
    const legacyValue = { level: 2 };
    const canonicalValue = { level: 4 };

    expect(
      normalizeContentIdMapKeys("initiate", {
        iron_fist_disciple: legacyValue,
        unknown_initiate: { level: 1 }
      })
    ).toEqual({
      map: {
        iron_fist_initiate: legacyValue,
        unknown_initiate: { level: 1 }
      },
      normalized: true,
      collisions: []
    });

    expect(
      normalizeContentIdMapKeys("initiate", {
        lotus_stabilizer: canonicalValue,
        lotus_mending_disciple: legacyValue
      })
    ).toEqual({
      map: {
        lotus_stabilizer: canonicalValue
      },
      normalized: true,
      collisions: [
        {
          kind: "initiate",
          legacyId: "lotus_mending_disciple",
          targetId: "lotus_stabilizer"
        }
      ]
    });
  });

  it("rejects duplicate legacy and target ids", () => {
    expect(() =>
      buildCompatibilityAliasIndex([
        CONTENT_ID_ALIASES[0],
        {
          ...CONTENT_ID_ALIASES[0],
          targetId: "duplicate_target"
        }
      ])
    ).toThrow("Duplicate legacyId alias: bandit");

    expect(() =>
      buildCompatibilityAliasIndex([
        CONTENT_ID_ALIASES[0],
        {
          ...CONTENT_ID_ALIASES[0],
          legacyId: "duplicate_legacy"
        }
      ])
    ).toThrow("Duplicate targetId alias: greenline");
  });

  it("matches the 91.1 preflight migrate and keep decisions", () => {
    const preflightRows = parsePreflightRows();
    const configuredIds = configuredContentIds();

    expect(preflightRows).toHaveLength(116);
    expect(new Set(preflightRows.map((row) => row.currentId))).toEqual(
      new Set(configuredIds)
    );

    const migratePairs = new Set(
      preflightRows
        .filter((row) => row.decision === "Migrate")
        .map((row) => pairKey(row.currentId, row.targetId))
    );
    const keepIds = preflightRows
      .filter((row) => row.decision === "Keep")
      .map((row) => row.currentId);
    const aliasPairs = new Set(
      CONTENT_ID_ALIASES.map((alias) =>
        pairKey(alias.legacyId, alias.targetId)
      )
    );

    expect(aliasPairs).toEqual(migratePairs);
    expect(keepIds).toHaveLength(18);
    expect(keepIds).toEqual(
      expect.arrayContaining([
        "veilstep_needler",
        "shieldwall_guard",
        "forge_chain_hook",
        "blood_brand_duelist",
        "marrow_lock_supplicant",
        "burning_blood_captain",
        "burning_blood_edict",
        "burning_blood"
      ])
    );
    for (const keepId of keepIds) {
      expect(CONTENT_ID_ALIAS_INDEX.getByLegacyId(keepId)).toBeNull();
    }
  });

  it("keeps canonical static data unchanged until static rename slices land", () => {
    expect(staticData.enemies.map((enemy) => enemy.id)).toContain(
      "bamboo_bandit"
    );
    expect(staticData.heroes.map((hero) => hero.id)).toContain(
      "iron_fist_disciple"
    );
    expect(staticData.tactics.map((tactic) => tactic.id)).toContain(
      "outer_pressure"
    );

    expect(normalizeContentId("hostile", "bamboo_bandit")).toBe(
      "greenline_cutter"
    );
    expect(normalizeContentId("initiate", "iron_fist_disciple")).toBe(
      "iron_fist_initiate"
    );
    expect(normalizeContentId("routine", "outer_pressure")).toBe(
      "kinetic_crush"
    );
  });
});
