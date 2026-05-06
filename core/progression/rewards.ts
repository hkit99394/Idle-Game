import type { StaticGameData } from "../data";
import { addEquipmentDropsToInventory } from "./equipment";
import { syncHeroLevelsWithCombatExperience } from "./levels";
import { cloneProgress } from "./progress";
import {
  getMapRewardMultiplier,
  getReachedMasteryRanks
} from "./mastery";
import {
  getStageById,
  isStageUnlocked
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
  const mapProgress = nextProgress.maps[stage.regionId] ?? {
    combatExperience: 0,
    highestClearedStageIndex: 0
  };
  const masteryRanksBefore = getReachedMasteryRanks(
    mapProgress.combatExperience,
    data.mastery.thresholds
  );
  const rewardMultiplier = 1 + getMapRewardMultiplier(
    mapProgress.combatExperience,
    data.mastery.thresholds
  );
  const silver = stage.rewards.silver * rewardMultiplier;
  const cultivation = stage.rewards.cultivation * rewardMultiplier;
  const herbs = (stage.rewards.herbs ?? 0) * rewardMultiplier;
  const combatExperience = stage.rewards.combatExperience;

  nextProgress.resources.silver += silver;
  nextProgress.resources.cultivation += cultivation;
  nextProgress.resources.herbs += herbs;
  const equipmentRewards = addEquipmentDropsToInventory(
    nextProgress,
    stage.equipmentDrops
  );

  const updatedMapProgress = {
    combatExperience: mapProgress.combatExperience + combatExperience,
    highestClearedStageIndex: Math.max(
      mapProgress.highestClearedStageIndex,
      stage.index
    )
  };
  nextProgress.maps[stage.regionId] = updatedMapProgress;
  addStyleMasteryExperience(
    nextProgress,
    data.heroes.map((hero) => hero.style),
    combatExperience
  );
  syncHeroLevelsWithCombatExperience(nextProgress);

  const masteryRanksAfter = getReachedMasteryRanks(
    updatedMapProgress.combatExperience,
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
