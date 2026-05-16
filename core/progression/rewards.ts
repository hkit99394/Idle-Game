import type { StaticGameData } from "../data";
import { addEquipmentDropsToInventory } from "./equipment";
import { syncHeroLevelsWithCombatExperience } from "./levels";
import { cloneProgress } from "./progress";
import {
  getMapRewardMultiplier,
  getReachedMasteryRanks
} from "./mastery";
import {
  getRegionMapProgress,
  getStageById,
  isStageUnlocked,
  setRegionMapProgress
} from "./stages";
import {
  addStyleMasteryExperience
} from "./styleMastery";
import type { ApplyStageClearInput, ApplyStageClearResult } from "./types";

export function applyStageClearRewards(
  data: StaticGameData,
  input: ApplyStageClearInput
): ApplyStageClearResult {
  const stage = getStageById(data, input.stageId);

  if (!stage) {
    return {
      ok: false,
      reason: "missing_stage",
      progress: input.progress
    };
  }

  if (!isStageUnlocked(data, input.progress, stage)) {
    return {
      ok: false,
      reason: "locked_stage",
      progress: input.progress
    };
  }

  const nextProgress = cloneProgress(input.progress);
  const districtProgress = getRegionMapProgress(
    nextProgress.districts,
    stage.regionId
  ) ?? {
    combatData: 0,
    highestClearedRouteIndex: 0
  };
  const mapCombatExperience = districtProgress.combatData ?? 0;
  const masteryRanksBefore = getReachedMasteryRanks(
    mapCombatExperience,
    data.mastery.thresholds
  );
  const rewardMultiplier = 1 + getMapRewardMultiplier(
    mapCombatExperience,
    data.mastery.thresholds
  );
  const silver = stage.rewards.silver * rewardMultiplier;
  const cultivation = stage.rewards.cultivation * rewardMultiplier;
  const herbs = (stage.rewards.herbs ?? 0) * rewardMultiplier;
  const combatExperience = stage.rewards.combatExperience;

  nextProgress.resources.credits += silver;
  nextProgress.resources.resonance += cultivation;
  nextProgress.resources.reagents += herbs;
  const equipmentRewards = addEquipmentDropsToInventory(
    nextProgress,
    stage.equipmentDrops
  );

  const updatedMapProgress = {
    combatData: mapCombatExperience + combatExperience,
    highestClearedRouteIndex: Math.max(
      districtProgress.highestClearedRouteIndex,
      stage.index
    )
  };
  setRegionMapProgress(nextProgress, stage.regionId, updatedMapProgress);
  addStyleMasteryExperience(
    nextProgress,
    data.heroes.map((hero) => hero.style),
    combatExperience
  );
  syncHeroLevelsWithCombatExperience(nextProgress);

  const masteryRanksAfter = getReachedMasteryRanks(
    updatedMapProgress.combatData,
    data.mastery.thresholds
  );
  const newlyReachedMasteryRanks = masteryRanksAfter.filter(
    (rank) => !masteryRanksBefore.includes(rank)
  );

  return {
    ok: true,
    progress: nextProgress,
    rewards: {
      silver,
      cultivation,
      herbs,
      combatExperience
    },
    masteryRanksBefore,
    masteryRanksAfter,
    newlyReachedMasteryRanks,
    equipmentRewards
  };
}
