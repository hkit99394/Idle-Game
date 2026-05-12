import { createInitialPlayerProgress, validateStaticGameData } from "../../core";
import type {
  BaseStats,
  EnemyDefinition,
  MedicineDefinition,
  PlayerProgress,
  RegionDefinition,
  SkillDefinition,
  StageDefinition,
  StaticGameData
} from "../../core";
import { staticData } from "./staticData";

export const autoMedicineCorruptionScenarioIds = {
  stageId: "scenario_auto_medicine_stage",
  heroId: "scenario_auto_medicine_patient",
  enemyId: "scenario_auto_medicine_poisoner",
  skillId: "scenario_actual_battle_poison",
  targetId: "player_scenario_auto_medicine_patient_1"
} as const;

const statusScenarioStats: BaseStats = {
  maxOuterHp: 1000,
  maxInnerQi: 500,
  outerAttack: 0,
  innerAttack: 0,
  outerDefense: 0,
  innerDefense: 0,
  speed: 0,
  critChance: 0,
  critDamage: 1,
  breakPower: 0,
  breakResist: 0,
  innerRecoveryRate: 0,
  statusAccuracy: 0,
  statusResistance: 0
};

export type StatusScenarioStatusEffectInput = {
  statusId: string;
  chance?: number;
  durationSeconds?: number;
  stacks?: number;
};

export type StatusScenarioStageOverrides = Partial<
  Pick<
    StageDefinition,
    "isBoss" | "canFarmOffline" | "rewards" | "equipmentDrops" | "nextStageId"
  >
>;

export type CreateStatusPressureScenarioDataInput = {
  baseData?: StaticGameData;
  stageId: string;
  heroId: string;
  enemyId: string;
  skillId: string;
  heroName?: string;
  enemyName?: string;
  stageName?: string;
  skillName?: string;
  enemyFamily?: EnemyDefinition["family"];
  enemyType?: EnemyDefinition["type"];
  enemyCombatRole?: EnemyDefinition["combatRole"];
  stageRegionId?: string;
  heroStats?: Partial<BaseStats>;
  enemyStats?: Partial<BaseStats>;
  skillCooldownSeconds?: number;
  skillEffects?: SkillDefinition["effects"];
  statusEffects?: StatusScenarioStatusEffectInput[];
  medicine?: MedicineDefinition;
  stage?: StatusScenarioStageOverrides;
  region?: Partial<
    Pick<RegionDefinition, "name" | "unlockCondition" | "balanceTargets">
  >;
};

export function createStatusPressureScenarioData(
  input: CreateStatusPressureScenarioDataInput
): StaticGameData {
  const baseData = input.baseData ?? staticData;
  const statusEffects = input.statusEffects ?? [
    {
      statusId: "poison",
      chance: 0.85,
      durationSeconds: 4,
      stacks: 1
    }
  ];
  const medicine = input.medicine;
  const stageRegionId = input.stageRegionId ?? "bamboo_road";
  const regions = baseData.regions.some((region) => region.id === stageRegionId)
    ? baseData.regions.map((region) =>
        region.id === stageRegionId
          ? {
              ...region,
              ...input.region,
              stageIds: region.stageIds.includes(input.stageId)
                ? region.stageIds
                : [...region.stageIds, input.stageId]
            }
          : region
      )
    : [
        ...baseData.regions,
        {
          id: stageRegionId,
          name: input.region?.name ?? "Scenario Status Region",
          stageIds: [input.stageId],
          unlockCondition: input.region?.unlockCondition ?? { type: "always" },
          ...(input.region?.balanceTargets === undefined
            ? {}
            : { balanceTargets: input.region.balanceTargets })
        }
      ];

  const scenarioData: StaticGameData = {
    ...baseData,
    regions,
    heroes: [
      ...baseData.heroes,
      {
        ...baseData.heroes[0],
        id: input.heroId,
        name: input.heroName ?? "Scenario Patient",
        skillIds: [],
        baseStats: {
          ...statusScenarioStats,
          ...input.heroStats
        }
      }
    ],
    enemies: [
      ...baseData.enemies,
      {
        ...baseData.enemies[0],
        id: input.enemyId,
        name: input.enemyName ?? "Scenario Status Enemy",
        family: input.enemyFamily ?? baseData.enemies[0].family,
        type: input.enemyType ?? baseData.enemies[0].type,
        combatRole: input.enemyCombatRole ?? baseData.enemies[0].combatRole,
        level: 1,
        skillIds: [input.skillId],
        baseStats: {
          ...statusScenarioStats,
          speed: 100,
          statusAccuracy: 1,
          ...input.enemyStats
        }
      }
    ],
    skills: [
      ...baseData.skills,
      {
        id: input.skillId,
        name: input.skillName ?? "Scenario Status Pressure",
        cooldownSeconds: input.skillCooldownSeconds ?? 1,
        outerMultiplier: 0,
        innerMultiplier: 0,
        targetRule: "first_living",
        effects:
          input.skillEffects ??
          statusEffects.map((effect) => ({
            type: "apply_status" as const,
            statusId: effect.statusId,
            chance: effect.chance ?? 1,
            durationSeconds: effect.durationSeconds ?? 6,
            stacks: effect.stacks ?? 1
          }))
      }
    ],
    medicines:
      medicine === undefined
        ? baseData.medicines
        : [
            ...baseData.medicines.filter(
              (candidate) => candidate.id !== medicine.id
            ),
            medicine
          ],
    stages: [
      ...baseData.stages,
      {
        id: input.stageId,
        regionId: stageRegionId,
        index: 1,
        name: input.stageName ?? "Scenario Status Pressure Stage",
        enemyTeam: {
          combatantIds: [input.enemyId]
        },
        isBoss: false,
        canFarmOffline: false,
        rewards: {
          silver: 0,
          cultivation: 0,
          combatExperience: 0
        },
        nextStageId: null,
        ...input.stage
      }
    ]
  };

  const validationErrors = validateStaticGameData(scenarioData);

  if (validationErrors.length > 0) {
    throw new Error(
      `Invalid status pressure scenario data: ${validationErrors.join("; ")}`
    );
  }

  return scenarioData;
}

export function createStatusPressureProgress(
  data: StaticGameData,
  input: {
    stageId: string;
    heroId: string;
    medicineInventory?: PlayerProgress["medicineInventory"];
  }
): PlayerProgress {
  const progress = createInitialPlayerProgress(data);

  progress.currentStageId = input.stageId;
  progress.activeHeroIds = [input.heroId];
  progress.formation = { [input.heroId]: "front" };
  progress.medicineInventory = { ...(input.medicineInventory ?? {}) };

  return progress;
}

export function createAutoMedicineCorruptionScenarioData(
  baseData: StaticGameData = staticData
): StaticGameData {
  const ids = autoMedicineCorruptionScenarioIds;

  return createStatusPressureScenarioData({
    baseData,
    stageId: ids.stageId,
    heroId: ids.heroId,
    enemyId: ids.enemyId,
    skillId: ids.skillId,
    enemyName: "Scenario Corruptor",
    skillName: "Scenario Actual Battle Corruption",
    skillCooldownSeconds: 20,
    enemyStats: {
      statusAccuracy: 0.5
    },
    statusEffects: [
      {
        statusId: "poison",
        chance: 1,
        durationSeconds: 6,
        stacks: 1
      }
    ],
    stageName: "Scenario Auto Medicine Stage"
  });
}

export function createAutoMedicineCorruptionProgress(
  data: StaticGameData,
  medicineInventory: PlayerProgress["medicineInventory"] = {
    clear_heart_pill: 1
  }
): PlayerProgress {
  const ids = autoMedicineCorruptionScenarioIds;

  return createStatusPressureProgress(data, {
    stageId: ids.stageId,
    heroId: ids.heroId,
    medicineInventory
  });
}
