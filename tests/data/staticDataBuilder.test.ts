import { describe, expect, it } from "vitest";
import {
  staticGameData,
  staticGameDataParts
} from "../../data/staticGameData";
import {
  staticGameDataPartKeys,
  validateStaticGameData
} from "../../core";
import type { StaticGameData } from "../../core";
import { staticData as toolStaticData } from "../../tools/staticData";
import { staticData as webStaticData } from "../../web/gameData";
import { staticData as testStaticData } from "../helpers/staticData";

const countKeys = ["regions", "stages", "medicines", "skills"] as const;

function getFixtureCounts(data: StaticGameData) {
  return Object.fromEntries(
    countKeys.map((key) => [key, data[key].length])
  ) as Record<(typeof countKeys)[number], number>;
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
  });

  it("keeps the configured JSON parts aligned with the builder keys", () => {
    expect(Object.keys(staticGameDataParts).sort()).toEqual(
      [...staticGameDataPartKeys].sort()
    );
  });

  it("validates the canonical bundle without errors", () => {
    expect(validateStaticGameData(staticGameData)).toEqual([]);
  });

  it("surfaces representative missing references through static data validation", () => {
    const invalidData: StaticGameData = {
      ...staticGameData,
      stages: staticGameData.stages.map((stage) =>
        stage.id === "bamboo_road_1"
          ? {
              ...stage,
              nextStageId: "missing_stage"
            }
          : stage
      )
    };

    expect(validateStaticGameData(invalidData)).toContain(
      "Stage bamboo_road_1 references missing next stage missing_stage"
    );
  });
});
