import { createInitialPlayerProgress } from "../../core";
import type { BaseStats, PlayerProgress, StaticGameData } from "../../core";
import { staticData } from "./staticData";

export const autoMedicinePoisonScenarioIds = {
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

export function createAutoMedicinePoisonScenarioData(
  baseData: StaticGameData = staticData
): StaticGameData {
  const ids = autoMedicinePoisonScenarioIds;

  return {
    ...baseData,
    heroes: [
      ...baseData.heroes,
      {
        ...baseData.heroes[0],
        id: ids.heroId,
        name: "Scenario Patient",
        skillIds: [],
        baseStats: statusScenarioStats
      }
    ],
    enemies: [
      ...baseData.enemies,
      {
        ...baseData.enemies[0],
        id: ids.enemyId,
        name: "Scenario Poisoner",
        level: 1,
        skillIds: [ids.skillId],
        baseStats: {
          ...statusScenarioStats,
          speed: 100,
          statusAccuracy: 0.5
        }
      }
    ],
    skills: [
      ...baseData.skills,
      {
        id: ids.skillId,
        name: "Scenario Actual Battle Poison",
        cooldownSeconds: 20,
        outerMultiplier: 0,
        innerMultiplier: 0,
        targetRule: "first_living",
        effects: [
          {
            type: "apply_status",
            statusId: "poison",
            chance: 1,
            durationSeconds: 6,
            stacks: 1
          }
        ]
      }
    ],
    stages: [
      ...baseData.stages,
      {
        id: ids.stageId,
        regionId: "bamboo_road",
        index: 1,
        name: "Scenario Auto Medicine Stage",
        enemyTeam: {
          combatantIds: [ids.enemyId]
        },
        isBoss: false,
        canFarmOffline: false,
        rewards: {
          silver: 0,
          cultivation: 0,
          combatExperience: 0
        },
        nextStageId: null
      }
    ]
  };
}

export function createAutoMedicinePoisonProgress(
  data: StaticGameData,
  medicineInventory: PlayerProgress["medicineInventory"] = {
    clear_heart_pill: 1
  }
): PlayerProgress {
  const progress = createInitialPlayerProgress(data);
  const ids = autoMedicinePoisonScenarioIds;

  progress.currentStageId = ids.stageId;
  progress.activeHeroIds = [ids.heroId];
  progress.formation = { [ids.heroId]: "front" };
  progress.medicineInventory = { ...(medicineInventory ?? {}) };

  return progress;
}
