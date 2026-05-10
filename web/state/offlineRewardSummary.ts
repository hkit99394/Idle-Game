export type OfflineRewardSummary = {
  stageId: string | null;
  offlineSeconds: number;
  clears: number;
  silver: number;
  cultivation: number;
  herbs: number;
  combatExperience: number;
  assignmentSilver: number;
  assignmentCultivation: number;
  assignmentHerbs: number;
  assignmentCombatExperience: number;
  assignmentStyleMasteryExperience: number;
  assignmentEquipmentRewards: Array<{ equipmentId: string; quantity: number }>;
};
