export const stage12SaveFixture = {
  version: 4,
  progress: {
    resources: {
      silver: 2400,
      cultivation: 950
    },
    heroes: {
      iron_fist_disciple: {
        level: 7,
        upgrades: {
          hero_outer_training: 5,
          hero_inner_training: 3
        }
      },
      azure_palm_monk: {
        level: 7,
        upgrades: {
          hero_outer_training: 4,
          hero_inner_training: 4
        }
      },
      white_crane_swordsman: {
        level: 7,
        upgrades: {
          hero_outer_training: 5,
          hero_inner_training: 2
        }
      },
      mountain_staff_guardian: {
        level: 7,
        upgrades: {
          hero_outer_training: 4,
          hero_inner_training: 3
        }
      }
    },
    sect: {
      upgrades: {
        sect_outer_training: 4,
        sect_inner_training: 3
      }
    },
    maps: {
      bamboo_road: {
        combatExperience: 188,
        highestClearedStageIndex: 10
      },
      mist_valley: {
        combatExperience: 152,
        highestClearedStageIndex: 6
      },
      black_iron_fort: {
        combatExperience: 378,
        highestClearedStageIndex: 6
      }
    },
    activeHeroIds: [
      "iron_fist_disciple",
      "azure_palm_monk",
      "white_crane_swordsman",
      "mountain_staff_guardian"
    ],
    formation: {
      iron_fist_disciple: "front",
      azure_palm_monk: "middle",
      white_crane_swordsman: "back",
      mountain_staff_guardian: "front"
    },
    styleMastery: {
      fist: {
        experience: 220
      },
      palm: {
        experience: 520
      }
    },
    styleBranches: {
      palm: "cloud_meridian_palm"
    },
    skillUpgrades: {
      iron_fist_combo_refinement: 1,
      white_crane_slash_refinement: 1
    },
    equipment: {
      inventory: {
        training_wraps: 1,
        willow_palm_manual: 1,
        iron_thread_armor: 1,
        tempered_meridian_pill: 1
      },
      equipped: {
        iron_fist_disciple: {
          weapon: "training_wraps"
        },
        azure_palm_monk: {
          manual: "willow_palm_manual"
        },
        mountain_staff_guardian: {
          armor: "iron_thread_armor",
          medicine: "tempered_meridian_pill"
        }
      }
    },
    assignments: {
      bamboo_road_patrol: {
        heroIds: ["iron_fist_disciple"]
      }
    },
    currentStageId: "black_iron_fort_7"
  },
  selectedOfflineFarmStageId: "black_iron_fort_6",
  offlineFarmPreset: "balanced",
  createdAtMs: 1000,
  updatedAtMs: 2000,
  lastOfflineRewardAtMs: 2000
} as const;
