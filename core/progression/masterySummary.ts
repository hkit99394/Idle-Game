import type { MasteryBonus, MasteryThreshold, StaticGameData } from "../data";
import type { PlayerProgress } from "./types";
import {
  getEnemyFamilyDamageMultiplier,
  getMapAttackMultiplier,
  getMapRewardMultiplier,
  getNextMasteryThreshold,
  getReachedMasteryBonuses,
  getReachedMasteryRanks
} from "./mastery";
import { getRegionMapProgress, getStageById } from "./stages";

export type ActiveMasterySummary = {
  stageId: string;
  regionId: string;
  combatExperience: number;
  reachedRanks: string[];
  nextThreshold: MasteryThreshold | null;
  activeBonuses: MasteryBonus[];
  mapAttackMultiplier: number;
  mapRewardMultiplier: number;
  enemyFamilyDamageMultiplier: number;
  damageMultipliersByFamily: Record<string, number>;
};

export type ActiveMasterySummaryResult =
  | {
      ok: true;
      summary: ActiveMasterySummary;
    }
  | {
      ok: false;
      reason: "missing_stage";
    };

export function getStageEnemyFamilies(
  data: StaticGameData,
  stageId: string
): string[] {
  const stage = getStageById(data, stageId);

  if (!stage) {
    return [];
  }

  return [
    ...new Set(
      stage.enemyTeam.combatantIds
        .map((enemyId) => data.enemies.find((enemy) => enemy.id === enemyId)?.family)
        .filter((family): family is string => Boolean(family))
    )
  ];
}

export function getActiveMasterySummaryForStage(
  data: StaticGameData,
  progress: PlayerProgress,
  stageId: string
): ActiveMasterySummaryResult {
  const stage = getStageById(data, stageId);

  if (!stage) {
    return {
      ok: false,
      reason: "missing_stage"
    };
  }

  const combatExperience =
    getRegionMapProgress(progress.districts, stage.regionId)?.combatData ?? 0;
  const enemyFamilyDamageMultiplier = getEnemyFamilyDamageMultiplier(
    combatExperience,
    data.mastery.thresholds
  );
  const damageMultipliersByFamily =
    enemyFamilyDamageMultiplier > 0
      ? Object.fromEntries(
          getStageEnemyFamilies(data, stageId).map((family) => [
            family,
            enemyFamilyDamageMultiplier
          ])
        )
      : {};

  return {
    ok: true,
    summary: {
      stageId,
      regionId: stage.regionId,
      combatExperience,
      reachedRanks: getReachedMasteryRanks(
        combatExperience,
        data.mastery.thresholds
      ),
      nextThreshold: getNextMasteryThreshold(
        combatExperience,
        data.mastery.thresholds
      ),
      activeBonuses: getReachedMasteryBonuses(
        combatExperience,
        data.mastery.thresholds
      ),
      mapAttackMultiplier: getMapAttackMultiplier(
        combatExperience,
        data.mastery.thresholds
      ),
      mapRewardMultiplier: getMapRewardMultiplier(
        combatExperience,
        data.mastery.thresholds
      ),
      enemyFamilyDamageMultiplier,
      damageMultipliersByFamily
    }
  };
}
