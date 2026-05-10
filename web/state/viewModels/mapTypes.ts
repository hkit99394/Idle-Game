export type StageOptionView = {
  id: string;
  regionId: string;
  regionName: string;
  name: string;
  index: number;
  isBoss: boolean;
  isUnlocked: boolean;
  isCleared: boolean;
  isSelectedStage: boolean;
  isSelectedOfflineFarmStage: boolean;
  canSelectStage: boolean;
  canSelectOfflineFarm: boolean;
  rewards: {
    silver: number;
    cultivation: number;
    herbs?: number;
    combatExperience: number;
  };
};
