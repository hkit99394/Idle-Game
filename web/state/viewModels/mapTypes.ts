export type RouteAttentionWarningView = {
  label: string;
  body: string;
  supportText: string;
};

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
  attentionWarning: RouteAttentionWarningView | null;
  rewards: {
    silver: number;
    cultivation: number;
    herbs?: number;
    combatExperience: number;
  };
};
