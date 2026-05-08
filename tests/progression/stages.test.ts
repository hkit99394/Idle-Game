import { describe, expect, it } from "vitest";
import {
  isRegionUnlocked,
  isStageCleared,
  isStageFarmable,
  isStageUnlocked
} from "../../core";
import type { RegionProgress, StaticGameData } from "../../core";
import enemies from "../../data/enemies.json" with { type: "json" };
import formations from "../../data/formations.json" with { type: "json" };
import heroes from "../../data/heroes.json" with { type: "json" };
import medicines from "../../data/medicines.json" with { type: "json" };
import mastery from "../../data/mastery.json" with { type: "json" };
import regions from "../../data/regions.json" with { type: "json" };
import skills from "../../data/skills.json" with { type: "json" };
import stages from "../../data/stages.json" with { type: "json" };
import statusEffects from "../../data/statusEffects.json" with { type: "json" };
import upgrades from "../../data/upgrades.json" with { type: "json" };

const staticData: StaticGameData = {
  heroes: heroes as StaticGameData["heroes"],
  skills: skills as StaticGameData["skills"],
  enemies: enemies as StaticGameData["enemies"],
  regions: regions as StaticGameData["regions"],
  stages: stages as StaticGameData["stages"],
  upgrades: upgrades as StaticGameData["upgrades"],
  mastery: mastery as StaticGameData["mastery"],
  formations: formations as StaticGameData["formations"],
  statusEffects: statusEffects as StaticGameData["statusEffects"],
  medicines: medicines as StaticGameData["medicines"]
};

describe("stage progression", () => {
  it("unlocks Demon Cult Outpost only after the Bamboo Road boss is cleared", () => {
    const beforeBoss: RegionProgress = {
      bamboo_road: { highestClearedStageIndex: 9 }
    };
    const afterBoss: RegionProgress = {
      bamboo_road: { highestClearedStageIndex: 10 }
    };

    expect(
      isRegionUnlocked(staticData, beforeBoss, "demon_cult_outpost")
    ).toBe(false);
    expect(
      isStageUnlocked(staticData, beforeBoss, "demon_cult_outpost_1")
    ).toBe(false);
    expect(isRegionUnlocked(staticData, afterBoss, "demon_cult_outpost")).toBe(
      true
    );
    expect(isStageUnlocked(staticData, afterBoss, "demon_cult_outpost_1")).toBe(
      true
    );
  });

  it("gates later Demon Cult stages by highest cleared stage index", () => {
    const entryProgress: RegionProgress = {
      bamboo_road: { highestClearedStageIndex: 10 },
      demon_cult_outpost: { highestClearedStageIndex: 0 }
    };
    const stageOneClearedProgress: RegionProgress = {
      bamboo_road: { highestClearedStageIndex: 10 },
      demon_cult_outpost: { highestClearedStageIndex: 1 }
    };

    expect(
      isStageUnlocked(staticData, entryProgress, "demon_cult_outpost_2")
    ).toBe(false);
    expect(
      isStageUnlocked(staticData, stageOneClearedProgress, "demon_cult_outpost_2")
    ).toBe(true);
  });

  it("allows offline farming only for cleared non-boss farm stages", () => {
    const progress: RegionProgress = {
      bamboo_road: { highestClearedStageIndex: 10 },
      demon_cult_outpost: { highestClearedStageIndex: 6 }
    };

    expect(isStageCleared(staticData, progress, "demon_cult_outpost_6")).toBe(
      true
    );
    expect(isStageFarmable(staticData, progress, "demon_cult_outpost_6")).toBe(
      true
    );
    expect(isStageFarmable(staticData, progress, "demon_cult_outpost_7")).toBe(
      false
    );
  });
});
