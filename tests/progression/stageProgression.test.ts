import { describe, expect, it } from "vitest";
import {
  createInitialPlayerProgress,
  getCurrentStage,
  getNextCurrentStageId,
  getRecommendedOfflineFarmStage,
  getStageById,
  getUnlockedOfflineFarmStages,
  hasClearedStage,
  isOfflineFarmStageUnlocked,
  isRegionUnlocked,
  isStageUnlocked,
  resolveStageBattle
} from "../../core";
import type { StaticGameData } from "../../core";
import { staticData } from "../helpers/staticData";

function createTwoRegionData(): StaticGameData {
  return {
    ...staticData,
    regions: [
      ...staticData.regions,
      {
        id: "mist_valley",
        name: "Mist Valley",
        stageIds: ["mist_valley_1"],
        unlockCondition: {
          type: "stage_cleared",
          stageId: "bamboo_road_10"
        }
      }
    ],
    stages: [
      ...staticData.stages.map((stage) =>
        stage.id === "bamboo_road_10"
          ? {
              ...stage,
              enemyTeam: {
                combatantIds: ["bamboo_bandit"]
              }
            }
          : stage
      ),
      {
        id: "mist_valley_1",
        regionId: "mist_valley",
        index: 1,
        name: "Mist Valley 1",
        enemyTeam: {
          combatantIds: ["mist_palm_thug"]
        },
        isBoss: false,
        canFarmOffline: true,
        rewards: {
          silver: 30,
          cultivation: 15,
          combatExperience: 12
        },
        nextStageId: null
      }
    ]
  };
}

describe("stage progression helpers", () => {
  it("starts new progress at Bamboo Road stage 1", () => {
    const progress = createInitialPlayerProgress(staticData);

    expect(progress.currentStageId).toBe("bamboo_road_1");
    expect(getCurrentStage(staticData, progress)?.id).toBe("bamboo_road_1");
  });

  it("uses highest cleared stage to gate stage unlocks", () => {
    const progress = createInitialPlayerProgress(staticData);
    const stage1 = getStageById(staticData, "bamboo_road_1");
    const stage2 = getStageById(staticData, "bamboo_road_2");
    const stage3 = getStageById(staticData, "bamboo_road_3");

    expect(stage1).toBeDefined();
    expect(stage2).toBeDefined();
    expect(stage3).toBeDefined();
    if (!stage1 || !stage2 || !stage3) {
      return;
    }

    expect(isStageUnlocked(staticData, progress, stage1)).toBe(true);
    expect(isStageUnlocked(staticData, progress, stage2)).toBe(false);
    expect(hasClearedStage(progress, stage1)).toBe(false);

    progress.maps.bamboo_road.highestClearedStageIndex = 1;

    expect(hasClearedStage(progress, stage1)).toBe(true);
    expect(isStageUnlocked(staticData, progress, stage2)).toBe(true);
    expect(isStageUnlocked(staticData, progress, stage3)).toBe(false);
  });

  it("advances current stage to a newly unlocked region after a boss victory", () => {
    const data = createTwoRegionData();
    const progress = createInitialPlayerProgress(data);
    progress.maps.bamboo_road.highestClearedStageIndex = 9;
    progress.currentStageId = "bamboo_road_10";

    const mistValleyStage = getStageById(data, "mist_valley_1");

    expect(mistValleyStage).toBeDefined();
    if (!mistValleyStage) {
      return;
    }

    expect(isRegionUnlocked(data, progress, "mist_valley")).toBe(false);
    expect(isStageUnlocked(data, progress, mistValleyStage)).toBe(false);

    const result = resolveStageBattle(data, {
      progress,
      stageId: "bamboo_road_10",
      maxDurationSeconds: 60
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.stageCleared).toBe(true);
    expect(result.progress.currentStageId).toBe("mist_valley_1");
    expect(result.progress.maps.bamboo_road.highestClearedStageIndex).toBe(10);
    expect(isRegionUnlocked(data, result.progress, "mist_valley")).toBe(true);
    expect(isStageUnlocked(data, result.progress, mistValleyStage)).toBe(true);
  });

  it("keeps current stage unchanged after a final boss with no next region", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.maps.bamboo_road.highestClearedStageIndex = 10;
    progress.currentStageId = "bamboo_road_10";
    const stage = getStageById(staticData, "bamboo_road_10");

    expect(stage).toBeDefined();
    if (!stage) {
      return;
    }

    expect(getNextCurrentStageId(staticData, stage, progress.currentStageId, progress)).toBe(
      "bamboo_road_10"
    );
  });

  it("uses cleared non-boss stages as valid offline farming targets", () => {
    const progress = createInitialPlayerProgress(staticData);

    expect(getUnlockedOfflineFarmStages(staticData, progress)).toEqual([]);
    expect(isOfflineFarmStageUnlocked(staticData, progress, "bamboo_road_1")).toBe(
      false
    );

    progress.maps.bamboo_road.highestClearedStageIndex = 2;

    expect(
      getUnlockedOfflineFarmStages(staticData, progress).map((stage) => stage.id)
    ).toEqual(["bamboo_road_1", "bamboo_road_2"]);
    expect(isOfflineFarmStageUnlocked(staticData, progress, "bamboo_road_2")).toBe(
      true
    );
    expect(getRecommendedOfflineFarmStage(staticData, progress)?.id).toBe(
      "bamboo_road_2"
    );
    expect(isOfflineFarmStageUnlocked(staticData, progress, "bamboo_road_3")).toBe(
      false
    );

    progress.maps.bamboo_road.highestClearedStageIndex = 10;

    expect(getRecommendedOfflineFarmStage(staticData, progress)?.id).toBe(
      "bamboo_road_9"
    );
    expect(isOfflineFarmStageUnlocked(staticData, progress, "bamboo_road_10")).toBe(
      false
    );
  });

  it("recommends the highest farmable stage by progression order", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.maps.bamboo_road.highestClearedStageIndex = 9;

    const unsortedData: StaticGameData = {
      ...staticData,
      stages: [
        ...staticData.stages.slice().reverse()
      ]
    };

    expect(
      getUnlockedOfflineFarmStages(unsortedData, progress).map((stage) => stage.id)
    ).toEqual([
      "bamboo_road_1",
      "bamboo_road_2",
      "bamboo_road_3",
      "bamboo_road_4",
      "bamboo_road_5",
      "bamboo_road_6",
      "bamboo_road_7",
      "bamboo_road_8",
      "bamboo_road_9"
    ]);
    expect(getRecommendedOfflineFarmStage(unsortedData, progress)?.id).toBe(
      "bamboo_road_9"
    );
  });
});
