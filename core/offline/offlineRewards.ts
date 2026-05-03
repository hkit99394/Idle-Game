export type OfflineRewardInput = {
  lastSavedAtMs: number;
  currentTimeMs: number;
  offlineCapSeconds: number;
  estimatedClearTimeSeconds: number;
  minimumClearTimeSeconds: number;
  offlineEfficiency: number;
  silverPerClear: number;
  cultivationPerClear: number;
  combatExperiencePerClear: number;
};

export type OfflineRewardResult = {
  offlineSeconds: number;
  clears: number;
  silver: number;
  cultivation: number;
  combatExperience: number;
};

export function calculateOfflineRewards(input: OfflineRewardInput): OfflineRewardResult {
  const rawOfflineSeconds = Math.max(0, (input.currentTimeMs - input.lastSavedAtMs) / 1000);
  const offlineSeconds = Math.min(rawOfflineSeconds, input.offlineCapSeconds);
  const clearTime = Math.max(input.estimatedClearTimeSeconds, input.minimumClearTimeSeconds);
  const clears = Math.floor(offlineSeconds / clearTime);
  const efficiency = Math.max(0, input.offlineEfficiency);

  return {
    offlineSeconds,
    clears,
    silver: input.silverPerClear * clears * efficiency,
    cultivation: input.cultivationPerClear * clears * efficiency,
    combatExperience: input.combatExperiencePerClear * clears * efficiency
  };
}
