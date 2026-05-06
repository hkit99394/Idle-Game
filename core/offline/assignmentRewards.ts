import type { StaticGameData } from "../data";
import {
  addStyleMasteryExperience,
  cloneProgress,
  getAssignmentProgress,
  isAssignmentUnlocked,
  isHeroEligibleForAssignment,
  syncHeroLevelsWithCombatExperience
} from "../progression";
import type { PlayerProgress } from "../progression";
import type { OfflineRewardConfig } from "./offlineRewards";
import { DEFAULT_OFFLINE_REWARD_CONFIG } from "./offlineRewards";

export type OfflineAssignmentEquipmentReward = {
  equipmentId: string;
  quantity: number;
};

export type OfflineAssignmentRewardEntry = {
  assignmentId: string;
  heroIds: string[];
  silver: number;
  cultivation: number;
  combatExperience: number;
  styleMasteryExperience: number;
  equipmentRewards: OfflineAssignmentEquipmentReward[];
};

export type OfflineAssignmentRewardResult = {
  offlineSeconds: number;
  assignments: OfflineAssignmentRewardEntry[];
  silver: number;
  cultivation: number;
  combatExperience: number;
  styleMasteryExperience: number;
  equipmentRewards: OfflineAssignmentEquipmentReward[];
};

export type ApplyOfflineAssignmentRewardsInput = {
  data: Pick<StaticGameData, "assignments" | "heroes" | "stages">;
  progress: PlayerProgress;
  lastSavedAtMs: number;
  currentTimeMs: number;
  config?: OfflineRewardConfig;
};

export type ApplyOfflineAssignmentRewardsResult = {
  ok: true;
  progress: PlayerProgress;
  rewards: OfflineAssignmentRewardResult;
};

export function createEmptyOfflineAssignmentRewards(
  offlineSeconds = 0
): OfflineAssignmentRewardResult {
  return {
    offlineSeconds,
    assignments: [],
    silver: 0,
    cultivation: 0,
    combatExperience: 0,
    styleMasteryExperience: 0,
    equipmentRewards: []
  };
}

function mergeEquipmentReward(
  rewards: OfflineAssignmentEquipmentReward[],
  equipmentId: string,
  quantity: number
): void {
  if (quantity <= 0) {
    return;
  }

  const existing = rewards.find((reward) => reward.equipmentId === equipmentId);

  if (existing) {
    existing.quantity += quantity;
    return;
  }

  rewards.push({ equipmentId, quantity });
}

function addEquipmentRewardsToProgress(
  progress: PlayerProgress,
  rewards: OfflineAssignmentEquipmentReward[]
): void {
  if (rewards.length === 0) {
    return;
  }

  progress.equipment ??= {
    inventory: {},
    equipped: {}
  };

  for (const reward of rewards) {
    progress.equipment.inventory[reward.equipmentId] =
      (progress.equipment.inventory[reward.equipmentId] ?? 0) + reward.quantity;
  }
}

export function applyOfflineAssignmentRewards(
  input: ApplyOfflineAssignmentRewardsInput
): ApplyOfflineAssignmentRewardsResult {
  const config = input.config ?? DEFAULT_OFFLINE_REWARD_CONFIG;
  const rawOfflineSeconds = Math.max(
    0,
    (input.currentTimeMs - input.lastSavedAtMs) / 1000
  );
  const offlineSeconds = Math.min(rawOfflineSeconds, config.offlineCapSeconds);
  const rewardHours = (offlineSeconds / 3600) * Math.max(0, config.offlineEfficiency);

  if (rewardHours <= 0 || (input.data.assignments ?? []).length === 0) {
    return {
      ok: true,
      progress: cloneProgress(input.progress),
      rewards: createEmptyOfflineAssignmentRewards(offlineSeconds)
    };
  }

  const nextProgress = cloneProgress(input.progress);
  const heroesById = new Map(input.data.heroes.map((hero) => [hero.id, hero]));
  const assignmentProgress = getAssignmentProgress(input.progress);
  const entries: OfflineAssignmentRewardEntry[] = [];
  const equipmentRewards: OfflineAssignmentEquipmentReward[] = [];
  let silver = 0;
  let cultivation = 0;
  let combatExperience = 0;
  let styleMasteryExperience = 0;

  for (const assignment of input.data.assignments ?? []) {
    const savedAssignment = assignmentProgress[assignment.id];
    const heroIds = savedAssignment?.heroIds ?? [];

    if (
      heroIds.length === 0 ||
      !isAssignmentUnlocked(input.data, input.progress, assignment)
    ) {
      continue;
    }

    const eligibleHeroIds = heroIds.filter((heroId) => {
      const hero = heroesById.get(heroId);

      return hero ? isHeroEligibleForAssignment(assignment, hero) : false;
    });

    if (eligibleHeroIds.length === 0) {
      continue;
    }

    const heroMultiplier = eligibleHeroIds.length;
    const rewardProfile = assignment.rewardProfile;
    const assignmentSilver =
      (rewardProfile.silverPerHour ?? 0) * rewardHours * heroMultiplier;
    const assignmentCultivation =
      (rewardProfile.cultivationPerHour ?? 0) * rewardHours * heroMultiplier;
    const assignmentCombatExperience =
      (rewardProfile.combatExperiencePerHour ?? 0) * rewardHours * heroMultiplier;
    const assignmentStyleMasteryExperience =
      (rewardProfile.styleMasteryExperiencePerHour ?? 0) *
      rewardHours *
      heroMultiplier;
    const assignmentEquipmentRewards: OfflineAssignmentEquipmentReward[] = [];

    for (const reward of rewardProfile.equipmentRewardsPerHour ?? []) {
      const quantity = Math.floor(
        reward.quantityPerHour * rewardHours * heroMultiplier
      );

      mergeEquipmentReward(
        assignmentEquipmentRewards,
        reward.equipmentId,
        quantity
      );
      mergeEquipmentReward(equipmentRewards, reward.equipmentId, quantity);
    }

    silver += assignmentSilver;
    cultivation += assignmentCultivation;
    combatExperience += assignmentCombatExperience;
    styleMasteryExperience += assignmentStyleMasteryExperience;
    entries.push({
      assignmentId: assignment.id,
      heroIds: eligibleHeroIds,
      silver: assignmentSilver,
      cultivation: assignmentCultivation,
      combatExperience: assignmentCombatExperience,
      styleMasteryExperience: assignmentStyleMasteryExperience,
      equipmentRewards: assignmentEquipmentRewards
    });

    if (assignmentCombatExperience > 0 && rewardProfile.mapRegionId) {
      const mapProgress = nextProgress.maps[rewardProfile.mapRegionId] ?? {
        combatExperience: 0,
        highestClearedStageIndex: 0
      };
      nextProgress.maps[rewardProfile.mapRegionId] = {
        ...mapProgress,
        combatExperience:
          mapProgress.combatExperience + assignmentCombatExperience
      };
    }

    if (assignmentStyleMasteryExperience > 0) {
      addStyleMasteryExperience(
        nextProgress,
        eligibleHeroIds.flatMap((heroId) => {
          const hero = heroesById.get(heroId);

          return hero ? [hero.style] : [];
        }),
        assignmentStyleMasteryExperience
      );
    }
  }

  nextProgress.resources.silver += silver;
  nextProgress.resources.cultivation += cultivation;
  addEquipmentRewardsToProgress(nextProgress, equipmentRewards);
  syncHeroLevelsWithCombatExperience(nextProgress);

  return {
    ok: true,
    progress: nextProgress,
    rewards: {
      offlineSeconds,
      assignments: entries,
      silver,
      cultivation,
      combatExperience,
      styleMasteryExperience,
      equipmentRewards
    }
  };
}
