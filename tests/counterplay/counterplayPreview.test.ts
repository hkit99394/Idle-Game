import { describe, expect, it } from "vitest";
import {
  buildMedicineCounterplayViewModels,
  buildStageCounterplayPreview,
  defaultAutoMedicinePreferences
} from "../../core";
import type { StaticGameData } from "../../core";
import enemies from "../../data/enemies.json" with { type: "json" };
import formations from "../../data/formations.json" with { type: "json" };
import heroes from "../../data/heroes.json" with { type: "json" };
import mastery from "../../data/mastery.json" with { type: "json" };
import medicines from "../../data/medicines.json" with { type: "json" };
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

function getStage(stageId: string) {
  const stage = staticData.stages.find((entry) => entry.id === stageId);

  if (stage === undefined) {
    throw new Error(`Missing stage ${stageId}`);
  }

  return stage;
}

describe("counterplay preview", () => {
  it("groups medicine by unlock, ownership, and auto eligibility", () => {
    const rows = buildMedicineCounterplayViewModels({
      data: staticData,
      progress: {
        bamboo_road: {
          highestClearedStageIndex: 10
        },
        demon_cult_outpost: {
          highestClearedStageIndex: 2
        }
      },
      inventory: {
        clear_heart_pill: 3,
        quiet_meridian_powder: 1
      },
      preferences: {
        ...defaultAutoMedicinePreferences,
        disabledMedicineIds: ["quiet_meridian_powder"]
      }
    });

    expect(rows).toEqual([
      expect.objectContaining({
        id: "clear_heart_pill",
        count: 3,
        unlocked: true,
        owned: true,
        autoEligible: true,
        availability: "ready"
      }),
      expect.objectContaining({
        id: "quiet_meridian_powder",
        count: 1,
        unlocked: true,
        owned: true,
        autoEligible: false,
        availability: "disabled"
      }),
      expect.objectContaining({
        id: "purity_draught",
        count: 0,
        unlocked: false,
        owned: false,
        autoEligible: false,
        availability: "locked"
      })
    ]);
  });

  it("previews stage status pressure and recommended counterplay", () => {
    const preview = buildStageCounterplayPreview({
      data: staticData,
      stage: getStage("demon_cult_outpost_4"),
      inventory: {
        clear_heart_pill: 2,
        quiet_meridian_powder: 1,
        purity_draught: 1
      }
    });

    expect(preview.statusPressureIds).toEqual([
      "poison",
      "qi_suppression",
      "vulnerable",
      "wound"
    ]);
    expect(preview.statusCategories).toEqual([
      "damage",
      "control",
      "vulnerability",
      "recovery"
    ]);
    expect(preview.recommendedMedicineIds).toEqual([
      "quiet_meridian_powder",
      "clear_heart_pill",
      "purity_draught"
    ]);
    expect(preview.recommendationText).toBe(
      "Expected Poison, Qi Suppression, Vulnerable, Wound. Recommended auto medicine: Quiet Meridian Powder, Clear Heart Pill, Purity Draught."
    );
  });

  it("shows no recommendation for stages without status pressure", () => {
    expect(
      buildStageCounterplayPreview({
        data: staticData,
        stage: getStage("bamboo_road_1"),
        inventory: {
          clear_heart_pill: 2
        }
      })
    ).toMatchObject({
      statusPressureIds: [],
      statusCategories: [],
      recommendedMedicineIds: [],
      recommendationText: "No major status pressure expected."
    });
  });

  it("respects disabled medicine preferences in stage recommendations", () => {
    const preview = buildStageCounterplayPreview({
      data: staticData,
      stage: getStage("demon_cult_outpost_1"),
      inventory: {
        clear_heart_pill: 2,
        quiet_meridian_powder: 1
      },
      preferences: {
        ...defaultAutoMedicinePreferences,
        disabledMedicineIds: ["quiet_meridian_powder"]
      }
    });

    expect(preview.recommendedMedicineIds).toEqual(["clear_heart_pill"]);
  });
});
