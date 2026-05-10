import { describe, expect, it } from "vitest";
import { validateStaticGameData } from "../../core";
import type { StaticGameData } from "../../core";
import { staticData } from "../helpers/staticData";

describe("static game data validation", () => {
  it("accepts the starter MVP data set", () => {
    expect(validateStaticGameData(staticData)).toEqual([]);
  });

  it("rejects boss stages marked as offline farm targets", () => {
    const invalidData: StaticGameData = {
      ...staticData,
      stages: staticData.stages.map((stage) =>
        stage.id === "bamboo_road_10" ? { ...stage, canFarmOffline: true } : stage
      )
    };

    expect(validateStaticGameData(invalidData)).toContain(
      "Boss stage bamboo_road_10 cannot be marked for offline farming"
    );
  });

  it("rejects negative herb rewards", () => {
    const invalidData: StaticGameData = {
      ...staticData,
      stages: staticData.stages.map((stage) =>
        stage.id === "lotus_monastery_1"
          ? {
              ...stage,
              rewards: {
                ...stage.rewards,
                herbs: -1
              }
            }
          : stage
      ),
      assignments: staticData.assignments?.map((assignment) =>
        assignment.id === "lotus_medicine_pavilion"
          ? {
              ...assignment,
              rewardProfile: {
                ...assignment.rewardProfile,
                herbsPerHour: -1
              }
            }
          : assignment
      )
    };

    expect(validateStaticGameData(invalidData)).toEqual(
      expect.arrayContaining([
        "Stage lotus_monastery_1 rewards must be non-negative",
        "Assignment lotus_medicine_pavilion reward values must be non-negative numbers"
      ])
    );
  });

  it("rejects enemies without valid level data", () => {
    const invalidData: StaticGameData = {
      ...staticData,
      enemies: staticData.enemies.map((enemy) =>
        enemy.id === "bamboo_bandit" ? { ...enemy, level: 0 } : enemy
      )
    };

    expect(validateStaticGameData(invalidData)).toContain(
      "Enemy bamboo_bandit level must be an integer >= 1"
    );
  });

  it("rejects invalid combat roles and targeting rules", () => {
    const invalidData = {
      ...staticData,
      heroes: staticData.heroes.map((hero) =>
        hero.id === "iron_fist_disciple"
          ? { ...hero, combatRole: "duelist" }
          : hero
      ),
      enemies: staticData.enemies.map((enemy) =>
        enemy.id === "bamboo_bandit"
          ? { ...enemy, combatRole: "ambusher" }
          : enemy
      ),
      skills: staticData.skills.map((skill) =>
        skill.id === "iron_fist_combo"
          ? { ...skill, targetRule: "nearest" }
          : skill
      )
    } as StaticGameData;

    expect(validateStaticGameData(invalidData)).toEqual(
      expect.arrayContaining([
        "Hero iron_fist_disciple combatRole must be one of tank, breaker, striker, support",
        "Enemy bamboo_bandit combatRole must be one of tank, breaker, striker, support",
        "Skill iron_fist_combo targetRule must be one of first_living, weakest_hp, highest_cp, inner_broken"
      ])
    );
  });

  it("rejects missing style and skill upgrade references", () => {
    const invalidData: StaticGameData = {
      ...staticData,
      heroes: staticData.heroes.map((hero) =>
        hero.id === "iron_fist_disciple"
          ? {
              ...hero,
              style: "missing_style"
            }
          : hero
      ),
      skillUpgrades: staticData.skillUpgrades.map((upgrade) =>
        upgrade.id === "iron_fist_combo_refinement"
          ? {
              ...upgrade,
              skillId: "missing_skill"
            }
          : upgrade
      )
    } as StaticGameData;

    expect(validateStaticGameData(invalidData)).toEqual(
      expect.arrayContaining([
        "Hero iron_fist_disciple references missing style missing_style",
        "Skill upgrade iron_fist_combo_refinement references missing skill missing_skill"
      ])
    );
  });

  it("rejects hero unlock conditions that reference missing data", () => {
    const invalidData: StaticGameData = {
      ...staticData,
      heroes: staticData.heroes.map((hero) =>
        hero.id === "lotus_mending_disciple"
          ? {
              ...hero,
              unlock: {
                type: "stage_cleared",
                stageId: "missing_stage"
              }
            }
          : hero
      )
    };

    expect(validateStaticGameData(invalidData)).toContain(
      "Hero lotus_mending_disciple references missing unlock stage missing_stage"
    );
  });

  it("rejects invalid skill effects", () => {
    const invalidData = {
      ...staticData,
      skills: staticData.skills.map((skill) =>
        skill.id === "iron_fist_combo"
          ? {
              ...skill,
              effects: [
                {
                  type: "unknown_effect",
                  value: Number.NaN
                },
                {
                  type: "guard",
                  value: 0.2
                }
              ]
            }
          : skill
      )
    } as StaticGameData;

    expect(validateStaticGameData(invalidData)).toEqual(
      expect.arrayContaining([
        "Skill iron_fist_combo effect unknown_effect must be one of outer_heal_percent, inner_heal_percent, outer_regeneration_percent, inner_regeneration_percent, wound, cleanse, speed_down, inner_defense_down, guard, protect, armor_break, apply_status",
        "Skill iron_fist_combo effect unknown_effect value must be a number",
        "Skill iron_fist_combo effect guard durationSeconds must be a positive number"
      ])
    );
  });

  it("rejects malformed data-driven skill effects", () => {
    const invalidData = {
      ...staticData,
      skills: staticData.skills.map((skill) =>
        skill.id === "iron_fist_combo"
          ? {
              ...skill,
              effects: [
                {
                  type: "apply_status",
                  statusId: "missing_status",
                  chance: 2,
                  durationSeconds: 0,
                  stacks: 0,
                  target: "lowest_hp"
                }
              ]
            }
          : skill
      )
    } as StaticGameData;

    expect(validateStaticGameData(invalidData)).toEqual(
      expect.arrayContaining([
        "Skill iron_fist_combo effect apply_status references missing status missing_status",
        "Skill iron_fist_combo effect apply_status chance must be 0-1",
        "Skill iron_fist_combo effect apply_status stacks must be positive",
        "Skill iron_fist_combo effect apply_status target must be one of self, target, lowest_outer_hp_ally, lowest_inner_qi_ally, wounded_or_armor_broken_ally",
        "Skill iron_fist_combo effect apply_status durationSeconds must be a positive number"
      ])
    );
  });

  it("rejects invalid style branch effects", () => {
    const invalidData = {
      ...staticData,
      styles: staticData.styles.map((style) =>
        style.id === "fist"
          ? {
              ...style,
              branches: style.branches.map((branch) => ({
                ...branch,
                hiddenInMvp: "no",
                effects: [
                  {
                    type: "unknown",
                    stat: "luck",
                    value: Number.NaN
                  }
                ]
              }))
            }
          : style
      )
    } as StaticGameData;

    expect(validateStaticGameData(invalidData)).toEqual(
      expect.arrayContaining([
        "Style branch fist.iron_body_fist hiddenInMvp must be a boolean",
        "Style branch fist.iron_body_fist effect type must be stat_multiplier",
        "Style branch fist.iron_body_fist effect stat luck must be a valid base stat",
        "Style branch fist.iron_body_fist effect value must be a number"
      ])
    );
  });

  it("rejects invalid enemy formation slots", () => {
    const invalidData = {
      ...staticData,
      stages: staticData.stages.map((stage) =>
        stage.id === "bamboo_road_1"
          ? {
              ...stage,
              enemyTeam: {
                ...stage.enemyTeam,
                formation: {
                  flank: [0]
                }
              }
            }
          : stage
      )
    } as StaticGameData;

    expect(validateStaticGameData(invalidData)).toContain(
      "Stage bamboo_road_1 enemyTeam formation slot flank must be one of front, middle, back"
    );
  });

  it("rejects invalid multi-region stage references", () => {
    const invalidData: StaticGameData = {
      ...staticData,
      regions: staticData.regions.map((region) =>
        region.id === "mist_valley"
          ? {
              ...region,
              stageIds: [...region.stageIds, "bamboo_road_1", "missing_stage"]
            }
          : region
      ),
      stages: staticData.stages.map((stage) =>
        stage.id === "mist_valley_1"
          ? {
              ...stage,
              regionId: "missing_region",
              nextStageId: "missing_next_stage"
            }
          : stage
      )
    };

    expect(validateStaticGameData(invalidData)).toEqual(
      expect.arrayContaining([
        "Stage mist_valley_1 references missing region missing_region",
        "Stage mist_valley_1 references missing next stage missing_next_stage",
        "Region mist_valley references missing stage missing_stage",
        "Region mist_valley includes stage bamboo_road_1 from region bamboo_road"
      ])
    );
  });

  it("rejects invalid region balance target ranges", () => {
    const invalidData: StaticGameData = {
      ...staticData,
      regions: staticData.regions.map((region) =>
        region.id === "bamboo_road"
          ? {
              ...region,
              balanceTargets: {
                clearTimeSeconds: {
                  normal: { min: 20, max: 10 },
                  elite: { min: -1, max: 40 },
                  boss: { min: 0, max: "fast" }
                },
                rewardCurve: {
                  requireBestFarmRecommendation: "yes"
                },
                statusPressure: {
                  minApplications: 3,
                  maxApplications: 2,
                  maxExpectedDamage: -1,
                  maxMedicineConsumed: "none",
                  expectedStatusIds: ["poison", 7]
                },
                defensePressure: {
                  minGuardAbsorbs: -1
                },
                healingPressure: {
                  minHeals: -1
                },
                bossGate: {
                  baselineResult: "sometimes",
                  maxFarmClears: -1,
                  clearTimeSeconds: { min: 90, max: 80 }
                }
              }
            }
          : region
      )
    } as StaticGameData;

    expect(validateStaticGameData(invalidData)).toEqual(
      expect.arrayContaining([
        "Region bamboo_road balanceTargets.clearTimeSeconds.normal.min must be less than or equal to max",
        "Region bamboo_road balanceTargets.clearTimeSeconds.elite.min must be non-negative",
        "Region bamboo_road balanceTargets.clearTimeSeconds.boss.max must be a finite number",
        "Region bamboo_road balanceTargets.rewardCurve.requireBestFarmRecommendation must be a boolean",
        "Region bamboo_road balanceTargets.statusPressure.applications.min must be less than or equal to max",
        "Region bamboo_road balanceTargets.statusPressure.maxExpectedDamage must be non-negative",
        "Region bamboo_road balanceTargets.statusPressure.maxMedicineConsumed must be a finite number",
        "Region bamboo_road balanceTargets.statusPressure.expectedStatusIds must be an array of strings",
        "Region bamboo_road balanceTargets.defensePressure.minGuardAbsorbs must be non-negative",
        "Region bamboo_road balanceTargets.healingPressure.minHeals must be non-negative",
        "Region bamboo_road balanceTargets.bossGate.baselineResult must be one of player_clear, enemy_hold",
        "Region bamboo_road balanceTargets.bossGate.maxFarmClears must be non-negative",
        "Region bamboo_road balanceTargets.bossGate.clearTimeSeconds.min must be less than or equal to max"
      ])
    );
  });

  it("rejects missing required region budget guidance", () => {
    const invalidData = {
      ...staticData,
      regions: staticData.regions.map((region) =>
        region.id === "bamboo_road"
          ? {
              ...region,
              balanceTargets: {}
            }
          : region
      )
    } as StaticGameData;

    expect(validateStaticGameData(invalidData)).toEqual(
      expect.arrayContaining([
        "Region bamboo_road balanceTargets.clearTimeSeconds must be an object",
        "Region bamboo_road balanceTargets.rewardCurve.requireBestFarmRecommendation must be true because region has farmable stages",
        "Region bamboo_road balanceTargets.statusPressure is required because region enemies apply status effects",
        "Region bamboo_road balanceTargets.bossGate is required because region has boss stages"
      ])
    );
  });

  it("requires explicit budget exceptions for deferred boss clear-time targets", () => {
    const invalidData = {
      ...staticData,
      regions: staticData.regions.map((region) =>
        region.id === "black_iron_fort"
          ? {
              ...region,
              balanceTargets: {
                ...region.balanceTargets,
                budgetExceptions: []
              }
            }
          : region
      )
    } as StaticGameData;

    expect(validateStaticGameData(invalidData)).toContain(
      "Region black_iron_fort boss stage black_iron_fort_7 requires balanceTargets.bossGate.clearTimeSeconds, balanceTargets.clearTimeSeconds.boss, or a boss_clear_time_target budget exception because a boss result is expected to clear"
    );
  });

  it("rejects unsupported and contradictory region budget fields", () => {
    const invalidData = {
      ...staticData,
      regions: staticData.regions.map((region) =>
        region.id === "demon_cult_outpost"
          ? {
              ...region,
              balanceTargets: {
                ...region.balanceTargets,
                extraBudget: true,
                clearTimeSeconds: {
                  ...region.balanceTargets?.clearTimeSeconds,
                  normal: {
                    ...region.balanceTargets?.clearTimeSeconds.normal,
                    average: 9
                  },
                  quick: { min: 1, max: 3 }
                },
                rewardCurve: {
                  ...region.balanceTargets?.rewardCurve,
                  allowRegression: true
                },
                statusPressure: {},
                bossGate: {
                  baselineResult: "enemy_hold",
                  maxFarmClears: 5,
                  clearTimeSeconds: { min: 80, max: 140 }
                }
              }
            }
          : region
      )
    } as StaticGameData;

    expect(validateStaticGameData(invalidData)).toEqual(
      expect.arrayContaining([
        "Region demon_cult_outpost balanceTargets.extraBudget is not supported",
        "Region demon_cult_outpost balanceTargets.clearTimeSeconds.quick is not supported",
        "Region demon_cult_outpost balanceTargets.clearTimeSeconds.normal.average is not supported",
        "Region demon_cult_outpost balanceTargets.rewardCurve.allowRegression is not supported",
        "Region demon_cult_outpost balanceTargets.statusPressure must define at least one budget field",
        "Region demon_cult_outpost balanceTargets.bossGate.maxFarmClears requires farmedResult",
        "Region demon_cult_outpost balanceTargets.bossGate.clearTimeSeconds requires at least one player_clear boss result"
      ])
    );
  });

  it("rejects invalid region budget exceptions", () => {
    const invalidData = {
      ...staticData,
      regions: staticData.regions.map((region) =>
        region.id === "mist_valley"
          ? {
              ...region,
              balanceTargets: {
                ...region.balanceTargets,
                budgetExceptions: [
                  {
                    type: "boss_clear_time_target",
                    stageId: "mist_valley_6",
                    reason: "Already has a boss clear-time target."
                  },
                  {
                    type: "boss_clear_time_target",
                    stageId: "missing_stage",
                    reason: ""
                  },
                  {
                    type: "unknown_exception",
                    stageId: "mist_valley_6",
                    reason: "Unsupported exception type."
                  }
                ]
              }
            }
          : region
      )
    } as StaticGameData;

    expect(validateStaticGameData(invalidData)).toEqual(
      expect.arrayContaining([
        "Region mist_valley balanceTargets.budgetExceptions[0] is redundant because a boss clear-time target is configured",
        "Region mist_valley balanceTargets.budgetExceptions[1].reason must be a non-empty string",
        "Region mist_valley balanceTargets.budgetExceptions[1].stageId missing_stage must reference a boss stage in region mist_valley",
        "Region mist_valley balanceTargets.budgetExceptions[2].type must be one of boss_clear_time_target"
      ])
    );
  });

  it("rejects farm recommendation gates when a region has no farmable stages", () => {
    const invalidData: StaticGameData = {
      ...staticData,
      stages: staticData.stages.map((stage) =>
        stage.regionId === "mist_valley"
          ? {
              ...stage,
              canFarmOffline: false
            }
          : stage
      )
    };

    expect(validateStaticGameData(invalidData)).toContain(
      "Region mist_valley balanceTargets.rewardCurve.requireBestFarmRecommendation cannot be true because region has no farmable stages"
    );
  });

  it("rejects unknown expected status ids in region balance targets", () => {
    const invalidData: StaticGameData = {
      ...staticData,
      regions: staticData.regions.map((region) =>
        region.id === "demon_cult_outpost"
          ? {
              ...region,
              balanceTargets: {
                clearTimeSeconds: region.balanceTargets!.clearTimeSeconds,
                rewardCurve: region.balanceTargets?.rewardCurve,
                defensePressure: region.balanceTargets?.defensePressure,
                healingPressure: region.balanceTargets?.healingPressure,
                bossGate: region.balanceTargets?.bossGate,
                statusPressure: {
                  ...region.balanceTargets?.statusPressure,
                  expectedStatusIds: ["poison", "missing_status"]
                }
              }
            }
          : region
      )
    };

    expect(validateStaticGameData(invalidData)).toContain(
      "Region demon_cult_outpost balanceTargets.statusPressure.expectedStatusIds includes unknown status missing_status"
    );
  });

  it("rejects invalid equipment definitions and drop references", () => {
    const invalidData = {
      ...staticData,
      equipment: staticData.equipment.map((equipment) =>
        equipment.id === "training_wraps"
          ? {
              ...equipment,
              slot: "trinket",
              rarity: "mythic",
              allowedStyles: ["missing_style"],
              effects: [
                {
                  stat: "luck",
                  mode: "bonus",
                  value: Number.NaN
                }
              ]
            }
          : equipment
      ),
      stages: staticData.stages.map((stage) =>
        stage.id === "bamboo_road_1"
          ? {
              ...stage,
              equipmentDrops: [
                {
                  equipmentId: "missing_equipment",
                  quantity: 0
                }
              ]
            }
          : stage
      )
    } as StaticGameData;

    expect(validateStaticGameData(invalidData)).toEqual(
      expect.arrayContaining([
        "Equipment training_wraps slot must be one of weapon, armor, manual, medicine",
        "Equipment training_wraps rarity must be one of common, uncommon, rare",
        "Equipment training_wraps references missing style missing_style",
        "Equipment training_wraps effect stat luck must be a valid base stat",
        "Equipment training_wraps effect mode must be one of flat, multiplier",
        "Equipment training_wraps effect value must be a number",
        "Stage bamboo_road_1 references missing equipment missing_equipment",
        "Stage bamboo_road_1 equipment drop quantity must be an integer >= 1"
      ])
    );
  });

  it("rejects invalid equipment affixes and set bonuses", () => {
    const invalidData = {
      ...staticData,
      equipment: staticData.equipment.map((equipment) =>
        equipment.id === "training_wraps"
          ? {
              ...equipment,
              setId: "missing_set",
              affixes: [
                {
                  id: "cracked",
                  name: "",
                  effects: [
                    {
                      stat: "luck",
                      mode: "bonus",
                      value: Number.NaN
                    }
                  ]
                },
                {
                  id: "cracked",
                  name: "Duplicate Cracked",
                  effects: []
                }
              ]
            }
          : equipment
      ),
      equipmentSets: [
        ...(staticData.equipmentSets ?? []),
        {
          id: "broken_set",
          name: "",
          bonuses: [
            {
              pieces: 1,
              effects: [
                {
                  stat: "luck",
                  mode: "bonus",
                  value: Number.NaN
                }
              ]
            },
            {
              pieces: 2,
              effects: []
            }
          ]
        }
      ]
    } as StaticGameData;

    expect(validateStaticGameData(invalidData)).toEqual(
      expect.arrayContaining([
        "Equipment training_wraps references missing equipment set missing_set",
        "Equipment training_wraps affix cracked must define a name",
        "Equipment training_wraps affix cracked effect stat luck must be a valid base stat",
        "Equipment training_wraps affix cracked effect mode must be one of flat, multiplier",
        "Equipment training_wraps affix cracked effect value must be a number",
        "Equipment training_wraps affix cracked is duplicated",
        "Equipment training_wraps affix cracked must define at least one effect",
        "Equipment set broken_set must define a name",
        "Equipment set broken_set bonus pieces must be an integer >= 2",
        "Equipment set broken_set bonus 1 effect stat luck must be a valid base stat",
        "Equipment set broken_set bonus 1 effect mode must be one of flat, multiplier",
        "Equipment set broken_set bonus 1 effect value must be a number",
        "Equipment set broken_set bonus 2 must define at least one effect"
      ])
    );
  });

  it("rejects invalid assignment definitions", () => {
    const invalidData = {
      ...staticData,
      assignments: [
        ...(staticData.assignments ?? []),
        {
          id: "broken_assignment",
          name: "Broken Assignment",
          type: "errand",
          unlockCondition: {
            type: "stage_cleared",
            stageId: "missing_stage"
          },
          durationBucket: "forever",
          allowedRoles: ["duelist"],
          allowedStyles: ["missing_style"],
          rewardProfile: {
            silverPerHour: -1,
            mapRegionId: "missing_region",
            equipmentRewardsPerHour: [
              {
                equipmentId: "missing_equipment",
                quantityPerHour: -0.5
              }
            ]
          }
        }
      ]
    } as StaticGameData;

    expect(validateStaticGameData(invalidData)).toEqual(
      expect.arrayContaining([
        "Assignment broken_assignment type must be one of patrol, training_ground",
        "Assignment broken_assignment durationBucket must be one of short, medium, long",
        "Assignment broken_assignment references missing unlock stage missing_stage",
        "Assignment broken_assignment role duelist must be one of tank, breaker, striker, support",
        "Assignment broken_assignment references missing style missing_style",
        "Assignment broken_assignment reward values must be non-negative numbers",
        "Assignment broken_assignment references missing reward map missing_region",
        "Assignment broken_assignment references missing reward equipment missing_equipment",
        "Assignment broken_assignment equipment reward quantityPerHour must be a non-negative number"
      ])
    );
  });

  it("rejects duplicate enemy formation combatant placement", () => {
    const invalidData: StaticGameData = {
      ...staticData,
      stages: staticData.stages.map((stage) =>
        stage.id === "bamboo_road_1"
          ? {
              ...stage,
              enemyTeam: {
                ...stage.enemyTeam,
                formation: {
                  front: [0],
                  middle: [0]
                }
              }
            }
          : stage
      )
    };

    expect(validateStaticGameData(invalidData)).toContain(
      "Stage bamboo_road_1 enemyTeam formation places combatant index 0 more than once"
    );
  });

  it("rejects out-of-range enemy formation combatant indexes", () => {
    const invalidData: StaticGameData = {
      ...staticData,
      stages: staticData.stages.map((stage) =>
        stage.id === "bamboo_road_1"
          ? {
              ...stage,
              enemyTeam: {
                ...stage.enemyTeam,
                formation: {
                  front: [99]
                }
              }
            }
          : stage
      )
    };

    expect(validateStaticGameData(invalidData)).toContain(
      "Stage bamboo_road_1 enemyTeam formation slot front has invalid combatant index 99"
    );
  });

  it("rejects invalid reusable formation slots", () => {
    const invalidData = {
      ...staticData,
      formations: staticData.formations.map((formation) =>
        formation.id === "mvp_line"
          ? {
              ...formation,
              slots: ["front", "flank"]
            }
          : formation
      )
    } as StaticGameData;

    expect(validateStaticGameData(invalidData)).toContain(
      "Formation mvp_line slot flank must be one of front, middle, back"
    );
  });
});
