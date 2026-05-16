import { describe, expect, it } from "vitest";
import { validateStaticGameData } from "../../core";
import type { StaticGameData } from "../../core";
import { staticData } from "../helpers/staticData";

type BaseStatsRecord = StaticGameData["heroes"][number]["baseStats"];

const legacyStatAliases: Record<string, string> = {
  breachPower: "breakPower",
  overloadResist: "breakResist",
  cognitiveAttack: "innerAttack",
  cognitiveDefense: "innerDefense",
  contextRebuildRate: "innerRecoveryRate",
  maxContextStability: "maxInnerQi",
  maxBodyIntegrity: "maxOuterHp",
  kineticAttack: "outerAttack",
  kineticDefense: "outerDefense"
};

function toLegacyBaseStats(stats: BaseStatsRecord): BaseStatsRecord {
  const legacyStats: Record<string, unknown> = { ...stats };

  for (const [targetStat, legacyStat] of Object.entries(legacyStatAliases)) {
    legacyStats[legacyStat] = legacyStats[targetStat];
    delete legacyStats[targetStat];
  }

  return legacyStats as unknown as BaseStatsRecord;
}

function toLegacyStat(stat: string): string {
  return legacyStatAliases[stat] ?? stat;
}

describe("static game data validation", () => {
  it("accepts the starter MVP data set", () => {
    expect(validateStaticGameData(staticData)).toEqual([]);
  });

  it("defines the Intrusion status and Azure Pulse Monk upgrade hook", () => {
    const intrusion = staticData.statusEffects.find(
      (status) => status.id === "cognitive_intrusion"
    );
    const contextShockUpgrade = staticData.skillUpgrades.find(
      (upgrade) => upgrade.id === "context_shock_refinement"
    );

    expect(intrusion).toEqual(
      expect.objectContaining({
        id: "cognitive_intrusion",
        name: "Intrusion",
        category: "control",
        durationSeconds: 6,
        maxStacks: 1,
        stackPolicy: "refresh",
        dispelTags: ["debuff"],
        effects: {
          cognitiveDamageTakenMultiplier: 1.12,
          contextRebuildMultiplier: 0.85
        }
      })
    );
    expect(contextShockUpgrade?.effects).toEqual(
      expect.arrayContaining([
        {
          type: "add_skill_effect",
          unlockLevel: 3,
          effect: {
            type: "apply_status",
            statusId: "cognitive_intrusion",
            chance: 0.7,
            durationSeconds: 6,
            stacks: 1,
            target: "target"
          }
        }
      ])
    );
  });

  it("accepts Cognitive damage taken status effect modifiers", () => {
    const data = {
      ...staticData,
      statusEffects: staticData.statusEffects.map((status) =>
        status.id === "exposed"
          ? {
              ...status,
              effects: {
                ...status.effects,
                cognitiveDamageTakenMultiplier: 1.12
              }
            }
          : status
      )
    } as StaticGameData;

    expect(validateStaticGameData(data)).toEqual([]);
  });

  it("rejects unsupported status effect modifier keys", () => {
    const data = {
      ...staticData,
      statusEffects: staticData.statusEffects.map((status) =>
        status.id === "exposed"
          ? {
              ...status,
              effects: {
                ...status.effects,
                intrusionBonus: 1.12
              }
            }
          : status
      )
    } as unknown as StaticGameData;

    expect(validateStaticGameData(data)).toEqual(
      expect.arrayContaining([
        "Status exposed effect intrusionBonus must be supported"
      ])
    );
  });

  it("accepts Stage 2.8 combat schema aliases during validation", () => {
    const aliasedData = {
      ...staticData,
      heroes: staticData.heroes.map((hero) =>
        hero.id === "iron_fist_initiate"
          ? { ...hero, baseStats: toLegacyBaseStats(hero.baseStats) }
          : hero
      ),
      enemies: staticData.enemies.map((enemy) =>
        enemy.id === "greenline_cutter"
          ? { ...enemy, baseStats: toLegacyBaseStats(enemy.baseStats) }
          : enemy
      ),
      skills: staticData.skills.map((skill) => {
        if (skill.id === "lotus_stabilizer_pulse") {
          return {
            ...skill,
            effects: skill.effects.map((effect) => {
              if (effect.type === "body_integrity_restore_percent") {
                return {
                  ...effect,
                  type: "outer_heal_percent",
                  target: "lowest_outer_hp_ally"
                };
              }

              if (effect.type === "context_stability_restore_percent") {
                return {
                  ...effect,
                  type: "inner_heal_percent",
                  target: "lowest_inner_qi_ally"
                };
              }

              return effect;
            })
          };
        }

        if (skill.id !== "cloud_context_press") {
          return skill;
        }

        const { kineticMultiplier, cognitiveMultiplier, ...rest } = skill;

        return {
          ...rest,
          outerMultiplier: kineticMultiplier,
          innerMultiplier: cognitiveMultiplier,
          targetRule: "inner_broken",
          effects: skill.effects.map((effect) =>
            effect.type === "inner_defense_down"
              ? { ...effect, type: "cognitive_defense_down" }
              : effect
          )
        };
      }),
      tactics: staticData.tactics.map((tactic) =>
        tactic.id === "context_break"
          ? {
              ...tactic,
              targetPriorities: ["inner_broken", "highest_cp"],
              modifiers: tactic.modifiers.map((modifier) => {
                if (modifier.type === "cognitive_damage_multiplier") {
                  return { ...modifier, type: "inner_damage_multiplier" };
                }

                if (modifier.type === "breach_power_multiplier") {
                  return { ...modifier, type: "break_power_multiplier" };
                }

                return modifier;
              })
            }
          : tactic
      ),
      equipment: staticData.equipment.map((equipment) =>
        equipment.id === "impact_training_wraps"
          ? {
              ...equipment,
              effects: equipment.effects.map((effect) => ({
                ...effect,
                stat: toLegacyStat(effect.stat)
              }))
            }
          : equipment
      ),
      equipmentSets: staticData.equipmentSets?.map((set) =>
        set.id === "ironwall_ward"
          ? {
              ...set,
              bonuses: set.bonuses.map((bonus) => ({
                ...bonus,
                effects: bonus.effects.map((effect) => ({
                  ...effect,
                  stat: toLegacyStat(effect.stat)
                }))
              }))
            }
          : set
      ),
      upgrades: staticData.upgrades.map((upgrade) =>
        upgrade.id === "sect_outer_training"
          ? {
              ...upgrade,
              effects: upgrade.effects.map((effect) => ({
                ...effect,
                stat: toLegacyStat(effect.stat)
              }))
            }
          : upgrade
      ),
      skillUpgrades: staticData.skillUpgrades.map((upgrade) =>
        upgrade.id === "impact_combo_refinement"
          ? {
              ...upgrade,
              effects: upgrade.effects.map((effect) =>
                effect.type === "kinetic_multiplier"
                  ? { ...effect, type: "outer_multiplier" }
                  : effect.type === "cognitive_multiplier"
                    ? { ...effect, type: "inner_multiplier" }
                  : effect
              )
            }
          : upgrade
      ),
      styles: staticData.styles.map((style) =>
        style.id === "impact"
          ? {
              ...style,
              bonuses: style.bonuses.map((bonus) => ({
                ...bonus,
                stat: toLegacyStat(bonus.stat)
              })),
              branches: style.branches.map((branch) => ({
                ...branch,
                effects: branch.effects.map((effect) => ({
                  ...effect,
                  stat: toLegacyStat(effect.stat)
                }))
              }))
            }
          : style
      ),
      statusEffects: staticData.statusEffects.map((status) => {
        if (status.id === "corruption") {
          return {
            ...status,
            effects: {
              outerDamagePerSecond: status.effects.bodyIntegrityDamagePerSecond
            }
          };
        }

        if (status.id === "context_suppression") {
          return {
            ...status,
            effects: {
              innerRecoveryMultiplier: status.effects.contextRebuildMultiplier
            }
          };
        }

        if (status.id === "exposed") {
          return {
            ...status,
            effects: {
              outerDamageTakenMultiplier: status.effects.kineticDamageTakenMultiplier
            }
          };
        }

        if (status.id === "burning_blood") {
          return {
            ...status,
            effects: {
              attackBacklashOuterHpPercent:
                status.effects.feedbackBodyIntegrityPercent
            }
          };
        }

        return status;
      }),
      regions: staticData.regions.map((region) =>
        region.id === "lotus_clinic"
          ? {
              ...region,
              balanceTargets: {
                ...region.balanceTargets,
                healingPressure:
                  region.balanceTargets?.healingPressure === undefined
                    ? undefined
                    : {
                        ...region.balanceTargets.healingPressure,
                        minOuterHealing:
                          region.balanceTargets.healingPressure
                            .minBodyIntegrityRestored
                      }
              }
            }
          : region
      )
    } as unknown as StaticGameData;

    expect(validateStaticGameData(aliasedData)).toEqual([]);
  });

  it("accepts equivalent legacy and Stage 2.8 combat schema aliases", () => {
    const aliasedData = {
      ...staticData,
      heroes: staticData.heroes.map((hero) =>
        hero.id === "iron_fist_initiate"
          ? {
              ...hero,
              baseStats: {
                ...hero.baseStats,
                maxOuterHp: hero.baseStats.maxBodyIntegrity
              }
            }
          : hero
      ),
      skills: staticData.skills.map((skill) =>
        skill.id === "impact_combo"
          ? {
              ...skill,
              outerMultiplier: skill.kineticMultiplier
            }
          : skill
      ),
      statusEffects: staticData.statusEffects.map((status) =>
        status.id === "corruption"
          ? {
              ...status,
              effects: {
                ...status.effects,
                outerDamagePerSecond: status.effects.bodyIntegrityDamagePerSecond
              }
            }
          : status
      ),
      regions: staticData.regions.map((region) =>
        region.id === "lotus_clinic"
          ? {
              ...region,
              balanceTargets: {
                ...region.balanceTargets,
                healingPressure:
                  region.balanceTargets?.healingPressure === undefined
                    ? undefined
                    : {
                        ...region.balanceTargets.healingPressure,
                        minOuterHealing:
                          region.balanceTargets.healingPressure
                            .minBodyIntegrityRestored
                      }
              }
            }
          : region
      )
    } as unknown as StaticGameData;

    expect(validateStaticGameData(aliasedData)).toEqual([]);
  });

  it("rejects conflicting Stage 2.8 combat schema aliases", () => {
    const invalidData = {
      ...staticData,
      heroes: staticData.heroes.map((hero) =>
        hero.id === "iron_fist_initiate"
          ? {
              ...hero,
              baseStats: {
                ...hero.baseStats,
                maxOuterHp: hero.baseStats.maxBodyIntegrity + 1
              }
            }
          : hero
      ),
      skills: staticData.skills.map((skill) =>
        skill.id === "impact_combo"
          ? {
              ...skill,
              outerMultiplier: skill.kineticMultiplier + 0.1
            }
          : skill
      ),
      statusEffects: staticData.statusEffects.map((status) =>
        status.id === "corruption"
          ? {
              ...status,
              effects: {
                ...status.effects,
                outerDamagePerSecond:
                  (status.effects.bodyIntegrityDamagePerSecond ?? 0) + 0.1
              }
            }
          : status
      ),
      regions: staticData.regions.map((region) =>
        region.id === "lotus_clinic"
          ? {
              ...region,
              balanceTargets: {
                ...region.balanceTargets,
                healingPressure:
                  region.balanceTargets?.healingPressure === undefined
                    ? undefined
                    : {
                        ...region.balanceTargets.healingPressure,
                        minOuterHealing:
                          (region.balanceTargets.healingPressure
                            .minBodyIntegrityRestored ?? 0) + 1
                      }
              }
            }
          : region
      )
    } as unknown as StaticGameData;

    expect(validateStaticGameData(invalidData)).toEqual(
      expect.arrayContaining([
        "conflicting combat schema aliases: Hero iron_fist_initiate baseStats.maxBodyIntegrity and Hero iron_fist_initiate baseStats.maxOuterHp",
        "conflicting combat schema aliases: Skill impact_combo.kineticMultiplier and Skill impact_combo.outerMultiplier",
        "conflicting combat schema aliases: Status corruption effects.bodyIntegrityDamagePerSecond and Status corruption effects.outerDamagePerSecond",
        "conflicting combat schema aliases: Region lotus_clinic balanceTargets.healingPressure.minBodyIntegrityRestored and Region lotus_clinic balanceTargets.healingPressure.minOuterHealing"
      ])
    );
  });

  it("rejects legacy route ids in canonical static data references", () => {
    const invalidData: StaticGameData = {
      ...staticData,
      regions: staticData.regions.map((region) => {
        if (region.id === "greenline_approach") {
          const balanceTargets = region.balanceTargets!;

          return {
            ...region,
            id: "bamboo_road",
            stageIds: ["bamboo_road_1", ...region.stageIds.slice(1)],
            balanceTargets: {
              ...balanceTargets,
              rewardCurve: {
                ...balanceTargets.rewardCurve,
                allowedRegressions: [
                  {
                    stageId: "bamboo_road_6",
                    metrics: ["farmScore"],
                    reason: "Legacy ids must be rejected."
                  }
                ]
              },
              budgetExceptions: [
                {
                  type: "boss_clear_time_target",
                  stageId: "bamboo_road_10",
                  reason: "Legacy ids must be rejected."
                }
              ]
            }
          };
        }

        if (region.id === "veil_district") {
          return {
            ...region,
            unlockCondition: {
              type: "stage_cleared",
              stageId: "bamboo_road_10"
            }
          };
        }

        return region;
      }),
      stages: staticData.stages.map((stage) =>
        stage.id === "greenline_approach_1"
          ? {
              ...stage,
              id: "bamboo_road_1",
              regionId: "bamboo_road",
              nextStageId: "bamboo_road_2"
            }
          : stage
      ),
      heroes: staticData.heroes.map((hero) =>
        hero.id === "lotus_stabilizer"
          ? {
              ...hero,
              unlock: { type: "stage_cleared", stageId: "lotus_monastery_3" }
            }
          : hero
      ),
      medicines: staticData.medicines.map((medicine) =>
        medicine.id === "clear_heart_countermeasure"
          ? {
              ...medicine,
              unlock: { type: "stage_cleared", stageId: "bamboo_road_10" }
            }
          : medicine
      ),
      assignments: staticData.assignments?.map((assignment) => {
        if (assignment.id === "greenline_sweep") {
          return {
            ...assignment,
            rewardProfile: {
              ...assignment.rewardProfile,
              mapRegionId: "bamboo_road"
            }
          };
        }

        if (assignment.id === "veil_district_calibration") {
          return {
            ...assignment,
            unlockCondition: {
              type: "stage_cleared",
              stageId: "bamboo_road_10"
            }
          };
        }

        return assignment;
      }),
      styles: staticData.styles.map((style) =>
        style.id === "vector"
          ? {
              ...style,
              branches: style.branches.map((branch) =>
                branch.id === "wind_step_vector"
                  ? {
                      ...branch,
                      unlock: {
                        type: "stage_cleared",
                        stageId: "bamboo_road_10"
                      }
                    }
                  : branch
              )
            }
          : style
      )
    };

    expect(validateStaticGameData(invalidData)).toEqual(
      expect.arrayContaining([
        "Region bamboo_road id must use canonical region id greenline_approach instead of legacy bamboo_road",
        "Region bamboo_road stageIds[0] must use canonical stage id greenline_approach_1 instead of legacy bamboo_road_1",
        "Region bamboo_road balanceTargets.rewardCurve.allowedRegressions[0].stageId must use canonical stage id greenline_approach_6 instead of legacy bamboo_road_6",
        "Region bamboo_road balanceTargets.budgetExceptions[0].stageId must use canonical stage id greenline_approach_10 instead of legacy bamboo_road_10",
        "Region veil_district unlockCondition.stageId must use canonical stage id greenline_approach_10 instead of legacy bamboo_road_10",
        "Stage bamboo_road_1 id must use canonical stage id greenline_approach_1 instead of legacy bamboo_road_1",
        "Stage bamboo_road_1 regionId must use canonical region id greenline_approach instead of legacy bamboo_road",
        "Stage bamboo_road_1 nextStageId must use canonical stage id greenline_approach_2 instead of legacy bamboo_road_2",
        "Hero lotus_stabilizer unlock.stageId must use canonical stage id lotus_clinic_3 instead of legacy lotus_monastery_3",
        "Medicine clear_heart_countermeasure unlock.stageId must use canonical stage id greenline_approach_10 instead of legacy bamboo_road_10",
        "Assignment greenline_sweep rewardProfile.mapRegionId must use canonical region id greenline_approach instead of legacy bamboo_road",
        "Assignment veil_district_calibration unlockCondition.stageId must use canonical stage id greenline_approach_10 instead of legacy bamboo_road_10",
        "Style branch vector.wind_step_vector unlock.stageId must use canonical stage id greenline_approach_10 instead of legacy bamboo_road_10"
      ])
    );
  });

  it("rejects boss stages marked as offline farm targets", () => {
    const invalidData: StaticGameData = {
      ...staticData,
      stages: staticData.stages.map((stage) =>
        stage.id === "greenline_approach_10" ? { ...stage, canFarmOffline: true } : stage
      )
    };

    expect(validateStaticGameData(invalidData)).toContain(
      "Boss stage greenline_approach_10 cannot be marked for offline farming"
    );
  });

  it("rejects negative herb rewards", () => {
    const invalidData: StaticGameData = {
      ...staticData,
      stages: staticData.stages.map((stage) =>
        stage.id === "lotus_clinic_1"
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
        assignment.id === "lotus_countermeasure_pavilion"
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
        "Stage lotus_clinic_1 rewards must be non-negative",
        "Assignment lotus_countermeasure_pavilion reward values must be non-negative numbers"
      ])
    );
  });

  it("rejects enemies without valid level data", () => {
    const invalidData: StaticGameData = {
      ...staticData,
      enemies: staticData.enemies.map((enemy) =>
        enemy.id === "greenline_cutter" ? { ...enemy, level: 0 } : enemy
      )
    };

    expect(validateStaticGameData(invalidData)).toContain(
      "Enemy greenline_cutter level must be an integer >= 1"
    );
  });

  it("rejects invalid combat roles and targeting rules", () => {
    const invalidData = {
      ...staticData,
      heroes: staticData.heroes.map((hero) =>
        hero.id === "iron_fist_initiate"
          ? { ...hero, combatRole: "duelist" }
          : hero
      ),
      enemies: staticData.enemies.map((enemy) =>
        enemy.id === "greenline_cutter"
          ? { ...enemy, combatRole: "ambusher" }
          : enemy
      ),
      skills: staticData.skills.map((skill) =>
        skill.id === "impact_combo"
          ? { ...skill, targetRule: "nearest" }
          : skill
      )
    } as StaticGameData;

    expect(validateStaticGameData(invalidData)).toEqual(
      expect.arrayContaining([
        "Hero iron_fist_initiate combatRole must be one of tank, breaker, striker, support",
        "Enemy greenline_cutter combatRole must be one of tank, breaker, striker, support",
        "Skill impact_combo targetRule must be one of first_living, weakest_hp, highest_cp, overloaded"
      ])
    );
  });

  it("rejects missing style and skill upgrade references", () => {
    const invalidData: StaticGameData = {
      ...staticData,
      heroes: staticData.heroes.map((hero) =>
        hero.id === "iron_fist_initiate"
          ? {
              ...hero,
              style: "missing_style"
            }
          : hero
      ),
      skillUpgrades: staticData.skillUpgrades.map((upgrade) =>
        upgrade.id === "impact_combo_refinement"
          ? {
              ...upgrade,
              skillId: "missing_skill"
            }
          : upgrade
      )
    } as StaticGameData;

    expect(validateStaticGameData(invalidData)).toEqual(
      expect.arrayContaining([
        "Hero iron_fist_initiate references missing style missing_style",
        "Skill upgrade impact_combo_refinement references missing skill missing_skill"
      ])
    );
  });

  it("rejects hero unlock conditions that reference missing data", () => {
    const invalidData: StaticGameData = {
      ...staticData,
      heroes: staticData.heroes.map((hero) =>
        hero.id === "lotus_stabilizer"
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
      "Hero lotus_stabilizer references missing unlock stage missing_stage"
    );
  });

  it("rejects invalid skill effects", () => {
    const invalidData = {
      ...staticData,
      skills: staticData.skills.map((skill) =>
        skill.id === "impact_combo"
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
        "Skill impact_combo effect unknown_effect must be one of body_integrity_restore_percent, context_stability_restore_percent, body_integrity_regeneration_percent, context_stability_regeneration_percent, wound, cleanse, speed_down, inner_defense_down, guard, protect, armor_break, apply_status",
        "Skill impact_combo effect unknown_effect value must be a number",
        "Skill impact_combo effect guard durationSeconds must be a positive number"
      ])
    );
  });

  it("rejects malformed data-driven skill effects", () => {
    const invalidData = {
      ...staticData,
      skills: staticData.skills.map((skill) =>
        skill.id === "impact_combo"
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
        "Skill impact_combo effect apply_status references missing status missing_status",
        "Skill impact_combo effect apply_status chance must be 0-1",
        "Skill impact_combo effect apply_status stacks must be positive",
        "Skill impact_combo effect apply_status target must be one of self, target, lowest_body_integrity_ally, lowest_context_stability_ally, wounded_or_armor_broken_ally",
        "Skill impact_combo effect apply_status durationSeconds must be a positive number"
      ])
    );
  });

  it("rejects invalid tactic preset defaults and fields", () => {
    const invalidData = {
      ...staticData,
      tactics: [
        ...staticData.tactics.map((tactic) =>
          tactic.id === "balanced_routine" ? { ...tactic, isDefault: false } : tactic
        ),
        {
          id: "broken_tactic",
          name: "",
          description: "",
          isDefault: "yes",
          behaviorFlags: ["targeting", "targeting", "burst"],
          targetPriorities: ["nearest", "weakest_hp", "weakest_hp"],
          modifiers: [
            {
              type: "kinetic_damage_multiplier",
              value: 2.5
            },
            {
              type: "status_resistance_bonus",
              value: 0.8
            },
            {
              type: "unknown_modifier",
              value: 1
            },
            {
              type: "healing_multiplier",
              value: Number.NaN
            }
          ]
        }
      ]
    } as StaticGameData;

    expect(validateStaticGameData(invalidData)).toEqual(
      expect.arrayContaining([
        "Tactics must define exactly one default preset",
        "Tactic balanced_routine must be marked as the default preset",
        "Tactic broken_tactic must define a name",
        "Tactic broken_tactic must define a description",
        "Tactic broken_tactic isDefault must be a boolean",
        "Tactic broken_tactic behaviorFlags duplicates targeting",
        "Tactic broken_tactic behaviorFlags includes unsupported flag burst",
        "Tactic broken_tactic targetPriorities includes unsupported target rule nearest",
        "Tactic broken_tactic targetPriorities duplicates weakest_hp",
        "Tactic broken_tactic modifier kinetic_damage_multiplier value must be between 0.5 and 1.5",
        "Tactic broken_tactic modifier kinetic_damage_multiplier requires behavior flag damage",
        "Tactic broken_tactic modifier status_resistance_bonus value must be between 0 and 0.5",
        "Tactic broken_tactic modifier status_resistance_bonus requires behavior flag medicine",
        "Tactic broken_tactic modifier unknown_modifier must be supported",
        "Tactic broken_tactic modifier healing_multiplier value must be a finite number",
        "Tactic broken_tactic modifier healing_multiplier requires behavior flag recovery"
      ])
    );
  });

  it("rejects contradictory tactic preset fields", () => {
    const invalidData = {
      ...staticData,
      tactics: staticData.tactics.map((tactic) =>
        tactic.id === "kinetic_crush"
          ? {
              ...tactic,
              behaviorFlags: ["damage"],
              targetPriorities: ["weakest_hp"],
              modifiers: []
            }
          : tactic.id === "balanced_routine"
            ? {
                ...tactic,
                behaviorFlags: ["targeting"],
                targetPriorities: ["first_living"],
                modifiers: [
                  {
                    type: "kinetic_damage_multiplier",
                    value: 1.05
                  }
                ]
              }
            : tactic
      )
    } as StaticGameData;

    expect(validateStaticGameData(invalidData)).toEqual(
      expect.arrayContaining([
        "Tactic balanced_routine is the default tactic and must not define behavior flags",
        "Tactic balanced_routine is the default tactic and must not define target priorities",
        "Tactic balanced_routine is the default tactic and must not define modifiers",
        "Tactic kinetic_crush targetPriorities requires behavior flag targeting",
        "Tactic kinetic_crush behavior flag damage requires at least one matching modifier"
      ])
    );
  });

  it("rejects invalid style branch effects", () => {
    const invalidData = {
      ...staticData,
      styles: staticData.styles.map((style) =>
        style.id === "impact"
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
        "Style branch impact.iron_body_impact hiddenInMvp must be a boolean",
        "Style branch impact.iron_body_impact effect type must be stat_multiplier",
        "Style branch impact.iron_body_impact effect stat luck must be a valid base stat",
        "Style branch impact.iron_body_impact effect value must be a number"
      ])
    );
  });

  it("rejects invalid enemy formation slots", () => {
    const invalidData = {
      ...staticData,
      stages: staticData.stages.map((stage) =>
        stage.id === "greenline_approach_1"
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
      "Stage greenline_approach_1 enemyTeam formation slot flank must be one of front, middle, back"
    );
  });

  it("rejects invalid multi-region stage references", () => {
    const invalidData: StaticGameData = {
      ...staticData,
      regions: staticData.regions.map((region) =>
        region.id === "veil_district"
          ? {
              ...region,
              stageIds: [...region.stageIds, "greenline_approach_1", "missing_stage"]
            }
          : region
      ),
      stages: staticData.stages.map((stage) =>
        stage.id === "veil_district_1"
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
        "Stage veil_district_1 references missing region missing_region",
        "Stage veil_district_1 references missing next stage missing_next_stage",
        "Region veil_district references missing stage missing_stage",
        "Region veil_district includes stage greenline_approach_1 from region greenline_approach"
      ])
    );
  });

  it("rejects invalid region balance target ranges", () => {
    const invalidData: StaticGameData = {
      ...staticData,
      regions: staticData.regions.map((region) =>
        region.id === "greenline_approach"
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
                  expectedStatusIds: ["corruption", 7]
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
        "Region greenline_approach balanceTargets.clearTimeSeconds.normal.min must be less than or equal to max",
        "Region greenline_approach balanceTargets.clearTimeSeconds.elite.min must be non-negative",
        "Region greenline_approach balanceTargets.clearTimeSeconds.boss.max must be a finite number",
        "Region greenline_approach balanceTargets.rewardCurve.requireBestFarmRecommendation must be a boolean",
        "Region greenline_approach balanceTargets.statusPressure.applications.min must be less than or equal to max",
        "Region greenline_approach balanceTargets.statusPressure.maxExpectedDamage must be non-negative",
        "Region greenline_approach balanceTargets.statusPressure.maxMedicineConsumed must be a finite number",
        "Region greenline_approach balanceTargets.statusPressure.expectedStatusIds must be an array of strings",
        "Region greenline_approach balanceTargets.defensePressure.minGuardAbsorbs must be non-negative",
        "Region greenline_approach balanceTargets.healingPressure.minHeals must be non-negative",
        "Region greenline_approach balanceTargets.bossGate.baselineResult must be one of player_clear, enemy_hold",
        "Region greenline_approach balanceTargets.bossGate.maxFarmClears must be non-negative",
        "Region greenline_approach balanceTargets.bossGate.clearTimeSeconds.min must be less than or equal to max"
      ])
    );
  });

  it("rejects missing required region budget guidance", () => {
    const invalidData = {
      ...staticData,
      regions: staticData.regions.map((region) =>
        region.id === "greenline_approach"
          ? {
              ...region,
              balanceTargets: {}
            }
          : region
      )
    } as StaticGameData;

    expect(validateStaticGameData(invalidData)).toEqual(
      expect.arrayContaining([
        "Region greenline_approach balanceTargets.clearTimeSeconds must be an object",
        "Region greenline_approach balanceTargets.rewardCurve.requireBestFarmRecommendation must be true because region has farmable stages",
        "Region greenline_approach balanceTargets.statusPressure is required because region enemies apply status effects",
        "Region greenline_approach balanceTargets.bossGate is required because region has boss stages"
      ])
    );
  });

  it("requires explicit budget exceptions for deferred boss clear-time targets", () => {
    const invalidData = {
      ...staticData,
      regions: staticData.regions.map((region) =>
        region.id === "black_iron_foundry"
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
      "Region black_iron_foundry boss stage black_iron_foundry_7 requires balanceTargets.bossGate.clearTimeSeconds, balanceTargets.clearTimeSeconds.boss, or a boss_clear_time_target budget exception because a boss result is expected to clear"
    );
  });

  it("rejects unsupported and contradictory region budget fields", () => {
    const invalidData = {
      ...staticData,
      regions: staticData.regions.map((region) =>
        region.id === "redline_outpost"
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
        "Region redline_outpost balanceTargets.extraBudget is not supported",
        "Region redline_outpost balanceTargets.clearTimeSeconds.quick is not supported",
        "Region redline_outpost balanceTargets.clearTimeSeconds.normal.average is not supported",
        "Region redline_outpost balanceTargets.rewardCurve.allowRegression is not supported",
        "Region redline_outpost balanceTargets.statusPressure must define at least one budget field",
        "Region redline_outpost balanceTargets.bossGate.maxFarmClears requires farmedResult",
        "Region redline_outpost balanceTargets.bossGate.clearTimeSeconds requires at least one player_clear boss result"
      ])
    );
  });

  it("rejects invalid region budget exceptions", () => {
    const invalidData = {
      ...staticData,
      regions: staticData.regions.map((region) =>
        region.id === "veil_district"
          ? {
              ...region,
              balanceTargets: {
                ...region.balanceTargets,
                budgetExceptions: [
                  {
                    type: "boss_clear_time_target",
                    stageId: "veil_district_6",
                    reason: "Already has a boss clear-time target."
                  },
                  {
                    type: "boss_clear_time_target",
                    stageId: "missing_stage",
                    reason: ""
                  },
                  {
                    type: "unknown_exception",
                    stageId: "veil_district_6",
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
        "Region veil_district balanceTargets.budgetExceptions[0] is redundant because a boss clear-time target is configured",
        "Region veil_district balanceTargets.budgetExceptions[1].reason must be a non-empty string",
        "Region veil_district balanceTargets.budgetExceptions[1].stageId missing_stage must reference a boss stage in region veil_district",
        "Region veil_district balanceTargets.budgetExceptions[2].type must be one of boss_clear_time_target"
      ])
    );
  });

  it("rejects farm recommendation gates when a region has no farmable stages", () => {
    const invalidData: StaticGameData = {
      ...staticData,
      stages: staticData.stages.map((stage) =>
        stage.regionId === "veil_district"
          ? {
              ...stage,
              canFarmOffline: false
            }
          : stage
      )
    };

    expect(validateStaticGameData(invalidData)).toContain(
      "Region veil_district balanceTargets.rewardCurve.requireBestFarmRecommendation cannot be true because region has no farmable stages"
    );
  });

  it("rejects unallowed farm reward curve regressions", () => {
    const invalidData = {
      ...staticData,
      regions: staticData.regions.map((region) =>
        region.id === "greenline_approach"
          ? {
              ...region,
              balanceTargets: {
                ...region.balanceTargets,
                rewardCurve: {
                  requireBestFarmRecommendation: true
                }
              }
            }
          : region
      )
    } as StaticGameData;

    expect(validateStaticGameData(invalidData)).toEqual(
      expect.arrayContaining([
        "Region greenline_approach rewardCurve stage greenline_approach_6 farm score 84.5 is below previous farm stage greenline_approach_5 value 136; add an allowedRegressions entry if intentional",
        "Region greenline_approach rewardCurve stage greenline_approach_6 combatExperience 8 is below previous farm stage greenline_approach_5 value 20; add an allowedRegressions entry if intentional",
        "Region greenline_approach rewardCurve stage greenline_approach_9 mastery 10 is below previous farm stage greenline_approach_8 value 20; add an allowedRegressions entry if intentional"
      ])
    );
  });

  it("rejects invalid farm reward regression allowances", () => {
    const invalidData = {
      ...staticData,
      regions: staticData.regions.map((region) =>
        region.id === "veil_district"
          ? {
              ...region,
              balanceTargets: {
                ...region.balanceTargets,
                rewardCurve: {
                  ...region.balanceTargets?.rewardCurve,
                  allowedRegressions: [
                    {
                      stageId: "veil_district_2",
                      metrics: ["farmScore", "farmScore", "prestige"],
                      reason: "",
                      extra: true
                    },
                    {
                      stageId: "veil_district_6",
                      metrics: ["silver"],
                      reason: "Bosses are not farmable."
                    }
                  ]
                }
              }
            }
          : region
      )
    } as StaticGameData;

    expect(validateStaticGameData(invalidData)).toEqual(
      expect.arrayContaining([
        "Region veil_district balanceTargets.rewardCurve.allowedRegressions[0].extra is not supported",
        "Region veil_district balanceTargets.rewardCurve.allowedRegressions[0].reason must be a non-empty string",
        "Region veil_district balanceTargets.rewardCurve.allowedRegressions[0] allows farm score regression for veil_district_2, but no such regression exists",
        "Region veil_district balanceTargets.rewardCurve.allowedRegressions[0].metrics duplicates farmScore",
        "Region veil_district balanceTargets.rewardCurve.allowedRegressions[0].metrics includes unsupported metric prestige",
        "Region veil_district balanceTargets.rewardCurve.allowedRegressions[1].stageId veil_district_6 must reference a farmable non-boss stage in region veil_district",
        "Region veil_district balanceTargets.rewardCurve.allowedRegressions[1] allows silver regression for veil_district_6, but no such regression exists"
      ])
    );
  });

  it("rejects unknown expected status ids in region balance targets", () => {
    const invalidData: StaticGameData = {
      ...staticData,
      regions: staticData.regions.map((region) =>
        region.id === "redline_outpost"
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
                  expectedStatusIds: ["corruption", "missing_status"]
                }
              }
            }
          : region
      )
    };

    expect(validateStaticGameData(invalidData)).toContain(
      "Region redline_outpost balanceTargets.statusPressure.expectedStatusIds includes unknown status missing_status"
    );
  });

  it("rejects invalid equipment definitions and drop references", () => {
    const invalidData = {
      ...staticData,
      equipment: staticData.equipment.map((equipment) =>
        equipment.id === "impact_training_wraps"
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
        stage.id === "greenline_approach_1"
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
        "Equipment impact_training_wraps slot must be one of weapon, armor, manual, medicine",
        "Equipment impact_training_wraps rarity must be one of common, uncommon, rare",
        "Equipment impact_training_wraps references missing style missing_style",
        "Equipment impact_training_wraps effect stat luck must be a valid base stat",
        "Equipment impact_training_wraps effect mode must be one of flat, multiplier",
        "Equipment impact_training_wraps effect value must be a number",
        "Stage greenline_approach_1 references missing equipment missing_equipment",
        "Stage greenline_approach_1 equipment drop quantity must be an integer >= 1"
      ])
    );
  });

  it("rejects invalid equipment affixes and set bonuses", () => {
    const invalidData = {
      ...staticData,
      equipment: staticData.equipment.map((equipment) =>
        equipment.id === "impact_training_wraps"
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
        "Equipment impact_training_wraps references missing equipment set missing_set",
        "Equipment impact_training_wraps affix cracked must define a name",
        "Equipment impact_training_wraps affix cracked effect stat luck must be a valid base stat",
        "Equipment impact_training_wraps affix cracked effect mode must be one of flat, multiplier",
        "Equipment impact_training_wraps affix cracked effect value must be a number",
        "Equipment impact_training_wraps affix cracked is duplicated",
        "Equipment impact_training_wraps affix cracked must define at least one effect",
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
        stage.id === "greenline_approach_1"
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
      "Stage greenline_approach_1 enemyTeam formation places combatant index 0 more than once"
    );
  });

  it("rejects out-of-range enemy formation combatant indexes", () => {
    const invalidData: StaticGameData = {
      ...staticData,
      stages: staticData.stages.map((stage) =>
        stage.id === "greenline_approach_1"
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
      "Stage greenline_approach_1 enemyTeam formation slot front has invalid combatant index 99"
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
