import { describe, expect, it } from "vitest";
import {
  staticGameData,
  staticGameDataParts
} from "../../data/staticGameData";
import {
  buildStaticGameData,
  staticGameDataPartKeys,
  validateStaticGameData
} from "../../core";
import type { StaticGameData } from "../../core";
import { staticData as toolStaticData } from "../../tools/staticData";
import { staticData as webStaticData } from "../../web/gameData";
import { staticData as testStaticData } from "../helpers/staticData";

function getFixtureCounts(data: StaticGameData) {
  return Object.fromEntries(
    staticGameDataPartKeys.map((key) => {
      const value = data[key];

      return [
        key,
        Array.isArray(value) ? value.length : Object.keys(value ?? {}).length
      ];
    })
  ) as Record<(typeof staticGameDataPartKeys)[number], number>;
}

function toTargetBaseStats(
  stats: StaticGameData["heroes"][number]["baseStats"]
): StaticGameData["heroes"][number]["baseStats"] {
  const {
    maxOuterHp,
    maxInnerQi,
    outerAttack,
    innerAttack,
    outerDefense,
    innerDefense,
    breakPower,
    breakResist,
    innerRecoveryRate,
    ...rest
  } = stats;

  return {
    ...rest,
    maxBodyIntegrity: maxOuterHp,
    maxContextStability: maxInnerQi,
    kineticAttack: outerAttack,
    cognitiveAttack: innerAttack,
    kineticDefense: outerDefense,
    cognitiveDefense: innerDefense,
    breachPower: breakPower,
    overloadResist: breakResist,
    contextRebuildRate: innerRecoveryRate
  } as unknown as StaticGameData["heroes"][number]["baseStats"];
}

describe("static data builder", () => {
  it("uses one canonical bundle across web, tools, and tests", () => {
    const expectedCounts = getFixtureCounts(staticGameData);

    expect(webStaticData).toBe(staticGameData);
    expect(toolStaticData).toBe(staticGameData);
    expect(testStaticData).toBe(staticGameData);
    expect(getFixtureCounts(webStaticData)).toEqual(expectedCounts);
    expect(getFixtureCounts(toolStaticData)).toEqual(expectedCounts);
    expect(getFixtureCounts(testStaticData)).toEqual(expectedCounts);
    expect(Object.keys(expectedCounts).sort()).toEqual(
      [...staticGameDataPartKeys].sort()
    );
  });

  it("keeps the configured JSON parts aligned with the builder keys", () => {
    expect(Object.keys(staticGameDataParts).sort()).toEqual(
      [...staticGameDataPartKeys].sort()
    );
  });

  it("validates the canonical bundle without errors", () => {
    expect(validateStaticGameData(staticGameData)).toEqual([]);
  });

  it("normalizes Stage 2.8 combat schema aliases for runtime consumers", () => {
    const sourceHero = staticGameData.heroes.find(
      (hero) => hero.id === "iron_fist_initiate"
    )!;
    const data = buildStaticGameData({
      ...staticGameDataParts,
      heroes: staticGameData.heroes.map((hero) =>
        hero.id === sourceHero.id
          ? {
              ...hero,
              baseStats: toTargetBaseStats(hero.baseStats)
            }
          : hero
      )
    });
    const normalizedHero = data.heroes.find((hero) => hero.id === sourceHero.id)!;
    const normalizedStats = normalizedHero.baseStats as unknown as Record<
      string,
      unknown
    >;

    expect(normalizedHero.baseStats.maxOuterHp).toBe(sourceHero.baseStats.maxOuterHp);
    expect(normalizedHero.baseStats.maxInnerQi).toBe(
      sourceHero.baseStats.maxInnerQi
    );
    expect(normalizedHero.baseStats.outerAttack).toBe(
      sourceHero.baseStats.outerAttack
    );
    expect(normalizedStats.maxBodyIntegrity).toBeUndefined();
    expect(normalizedStats.maxContextStability).toBeUndefined();
    expect(normalizedStats.kineticAttack).toBeUndefined();
  });

  it("surfaces representative missing references through static data validation", () => {
    const invalidData: StaticGameData = {
      ...staticGameData,
      stages: staticGameData.stages.map((stage) =>
        stage.id === "greenline_approach_1"
          ? {
              ...stage,
              nextStageId: "missing_stage"
            }
          : stage
      )
    };

    expect(validateStaticGameData(invalidData)).toContain(
      "Stage greenline_approach_1 references missing next stage missing_stage"
    );
  });
});
