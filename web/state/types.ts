import type {
  ActiveMasterySummary,
  ApplyOfflineAssignmentRewardsResult,
  AutoMedicinePreferences,
  BattleContribution,
  BattleEventRecord,
  CombatantInstanceDefinition,
  CombatantState,
  CombatRole,
  DerivedStats,
  FormationSlot,
  EquipHeroEquipmentInput,
  EquipHeroEquipmentResult,
  EquipmentRarity,
  EquipmentSlot,
  MasteryBonus,
  OfflineFarmPreset,
  TeamId,
  MedicineCounterplayViewModel,
  PlayerProgress,
  PreBattleResistanceMode,
  ApplyOfflineRewardsResult,
  PurchaseSkillUpgradeInput,
  PurchaseSkillUpgradeResult,
  PurchaseUpgradeInput,
  PurchaseUpgradeResult,
  ResolveStageBattleResult,
  SaveData,
  SaveLoadWriteReason,
  SelectStyleBranchInput,
  SelectStyleBranchResult,
  SetActiveHeroTeamInput,
  SetActiveHeroTeamResult,
  SetAssignmentHeroesInput,
  SetAssignmentHeroesResult,
  StageCounterplayPreview,
  StaticGameData
} from "../../core";

export type WebGameState = {
  progress: PlayerProgress;
  autoMedicinePreferences: AutoMedicinePreferences;
  selectedStageId: string;
  selectedOfflineFarmStageId: string | null;
  offlineFarmPreset: OfflineFarmPreset;
  offlineSummary: OfflineRewardSummary | null;
  startupSaveDiagnostics: string[];
  startupSavePersistence: StartupSavePersistence | null;
  lastBattle: ResolveStageBattleResult | null;
  lastBattleStageId: string | null;
  lastPurchase: PurchaseUpgradeResult | null;
  lastSkillPurchase: PurchaseSkillUpgradeResult | null;
  lastEquipmentAction: EquipHeroEquipmentResult | null;
  lastStyleBranchAction: SelectStyleBranchResult | null;
  lastActiveTeamAction: SetActiveHeroTeamResult | null;
  lastAssignmentAction: SetAssignmentHeroesResult | null;
};

export type StartupSavePersistence = {
  persistedSave: SaveData | null;
  offlineRewardBaselineSave?: SaveData | null;
  commitStatus: "not_needed" | "written" | "failed";
  attemptedWriteReasons: SaveLoadWriteReason[];
};

export type WebGameAction =
  | {
      type: "select_stage";
      stageId: string;
    }
  | {
      type: "select_offline_farm_stage";
      stageId: string | null;
    }
  | {
      type: "set_offline_farm_preset";
      preset: OfflineFarmPreset;
    }
  | {
      type: "set_auto_medicine_enabled";
      enabled: boolean;
    }
  | {
      type: "set_medicine_auto_use";
      medicineId: string;
      enabled: boolean;
    }
  | {
      type: "set_pre_battle_resistance_mode";
      mode: PreBattleResistanceMode;
    }
  | {
      type: "set_hero_formation_slot";
      heroId: string;
      slot: FormationSlot;
    }
  | {
      type: "style_branch_select_resolved";
      result: SelectStyleBranchResult;
    }
  | {
      type: "assignment_update_resolved";
      result: SetAssignmentHeroesResult;
    }
  | {
      type: "active_team_update_resolved";
      result: SetActiveHeroTeamResult;
    }
  | {
      type: "battle_resolved";
      stageId: string;
      result: ResolveStageBattleResult;
    }
  | {
      type: "purchase_resolved";
      result: PurchaseUpgradeResult;
    }
  | {
      type: "skill_purchase_resolved";
      result: PurchaseSkillUpgradeResult;
    }
  | {
      type: "equipment_equip_resolved";
      result: EquipHeroEquipmentResult;
    }
  | {
      type: "replace_progress";
      progress: PlayerProgress;
    }
  | {
      type: "replace_state";
      state: WebGameState;
    }
  | {
      type: "dismiss_offline_summary";
    };

export type PurchaseGameUpgradeInput = Omit<PurchaseUpgradeInput, "progress">;
export type PurchaseGameSkillUpgradeInput = Omit<
  PurchaseSkillUpgradeInput,
  "progress"
>;
export type EquipGameEquipmentInput = Omit<EquipHeroEquipmentInput, "progress">;
export type SelectGameStyleBranchInput = Omit<
  SelectStyleBranchInput,
  "progress"
>;
export type SetGameAssignmentHeroesInput = Omit<
  SetAssignmentHeroesInput,
  "progress"
>;
export type SetGameActiveHeroTeamInput = Omit<
  SetActiveHeroTeamInput,
  "progress"
>;

export type BattleCombatantView = {
  instanceId: string;
  definitionId: string;
  team: TeamId;
  kind: "hero" | "enemy";
  name: string;
  style: string;
  role: string;
  combatRole: CombatRole;
  formationSlot: FormationSlot;
  level: number;
  outerHp: number;
  innerQi: number;
  maxOuterHp: number;
  maxInnerQi: number;
  outerAttack: number;
  innerAttack: number;
  speed: number;
  combatPower: number;
  contributionDamage: number;
  contributionRecovery: number;
  contributionProtection: number;
  contributionRecoveryPrevented: number;
  isQiBroken: boolean;
  isDefeated: boolean;
};

export type BattleEventCategory = BattleEventRecord["category"];

export type BattleEventBadgeTone =
  | "skill"
  | "outer"
  | "inner"
  | "qi"
  | "danger"
  | "neutral";

export type BattleEventBadgeView = {
  label: string;
  tone: BattleEventBadgeTone;
};

type BattleEventRecordView = Pick<
  BattleEventRecord,
  "id" | "category" | "statusId" | "timeSeconds"
>;

export type BattleEventView = BattleEventRecordView & {
  timeLabel: string;
  headline: string;
  detail: string;
  badges: BattleEventBadgeView[];
};

export type BattleSummaryView = {
  title: string;
  details: string[];
};

export type UpgradeView = {
  key: string;
  upgradeId: string;
  name: string;
  scope: "hero" | "sect";
  art: "outer" | "inner";
  heroId?: string;
  targetName: string;
  effects: string[];
  level: number;
  cost: number;
  affordable: boolean;
  missingSilver: number;
};

export type SkillUpgradeView = {
  key: string;
  skillUpgradeId: string;
  skillId: string;
  name: string;
  skillName: string;
  level: number;
  maxLevel: number;
  cost: number;
  affordable: boolean;
  missingCultivation: number;
  effects: string[];
};

export type EquipmentInventoryItemView = {
  equipmentId: string;
  name: string;
  slot: EquipmentSlot;
  rarity: EquipmentRarity;
  count: number;
  availableCount: number;
  allowedStyles: string[];
  effects: string[];
  affixes: string[];
  setName: string | null;
  setBonuses: string[];
  compatibleHeroIds: string[];
};

export type HeroEquipmentSlotView = {
  slot: EquipmentSlot;
  label: string;
  equipmentId: string | null;
  name: string | null;
  rarity: EquipmentRarity | null;
  setName: string | null;
};

export type HeroEquipmentView = {
  heroId: string;
  name: string;
  style: string;
  slots: HeroEquipmentSlotView[];
  activeSetBonuses: string[];
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
  rewards: {
    silver: number;
    cultivation: number;
    herbs?: number;
    combatExperience: number;
  };
};

export type MasteryBonusView = {
  key: string;
  label: string;
};

export type MasteryRankTone = "unfamiliar" | "familiar" | "trained" | "mastered";

export type MasteryRankView = {
  rank: string;
  label: string;
  tone: MasteryRankTone;
};

export type MasteryPanelView = {
  regionId: string;
  regionName: string;
  combatExperience: number;
  reachedRanks: MasteryRankView[];
  nextThreshold: {
    experience: number;
    rank: string;
    remainingExperience: number;
  } | null;
  activeBonuses: MasteryBonusView[];
  progressPercent: number;
};

export type PlayerFormationHeroView = {
  heroId: string;
  name: string;
  style: string;
  role: string;
  combatRole: CombatRole;
  formationSlot: FormationSlot;
};

export type RosterHeroView = {
  heroId: string;
  name: string;
  style: string;
  role: string;
  combatRole: CombatRole;
  level: number;
  combatPower: number;
  unlocked: boolean;
  active: boolean;
  canActivate: boolean;
  canDeactivate: boolean;
  lockReason: string | null;
  assignedAssignmentName: string | null;
};

export type StyleBranchView = {
  id: string;
  name: string;
  isUnlocked: boolean;
  isSelected: boolean;
  canSelect: boolean;
  hiddenInMvp: boolean;
  requirement: string;
  effects: string[];
};

export type StyleMasteryView = {
  styleId: string;
  name: string;
  level: number;
  experience: number;
  nextLevelExperience: number;
  progressPercent: number;
  bonuses: string[];
  branches: StyleBranchView[];
};

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

export type OfflineRewardSummaryView = OfflineRewardSummary & {
  stageName: string;
  regionName: string;
};

export type OfflineFarmPresetView = {
  id: OfflineFarmPreset;
  label: string;
  description: string;
  rewardPriority: string[];
  isSelected: boolean;
};

export type OfflineFarmRecommendationView = {
  stageId: string | null;
  stageName: string;
  regionName: string;
  presetLabel: string;
  description: string;
  rewardPriority: string[];
  herbsPerClear: number;
  isSelected: boolean;
};

export type OfflineRewardPreviewView = {
  ok: boolean;
  reason: string | null;
  stageName: string;
  regionName: string;
  previewSeconds: number;
  clears: number;
  silver: number;
  cultivation: number;
  herbs: number;
  combatExperience: number;
  masteryExperienceGain: number;
};

export type AssignmentHeroOptionView = {
  heroId: string;
  name: string;
  style: string;
  role: string;
  eligible: boolean;
  assignedHere: boolean;
  assignedAssignmentName: string | null;
};

export type AssignmentView = {
  assignmentId: string;
  name: string;
  type: "patrol" | "training_ground";
  durationBucket: string;
  unlocked: boolean;
  lockReason: string | null;
  assignedHeroIds: string[];
  rewardSummary: string[];
  heroOptions: AssignmentHeroOptionView[];
};

export type SaveStatus =
  | "ready"
  | "missing_save"
  | "invalid_json"
  | "invalid_save"
  | "storage_error"
  | "storage_unavailable";

export type SaveDiagnosticsView = {
  storageAvailable: boolean;
  storageKey: string;
  status: SaveStatus;
  saveVersion: number | null;
  saveSizeCharacters: number;
  createdAtMs: number | null;
  updatedAtMs: number | null;
  lastOfflineRewardAtMs: number | null;
  currentStageId: string;
  selectedOfflineFarmStageId: string | null;
  offlineFarmPreset: OfflineFarmPreset;
  highestClearedStageIndex: number;
  autosaveIntervalMs: number;
  errors: string[];
};

export type CounterplayMedicineSettingView = MedicineCounterplayViewModel & {
  canToggle: boolean;
};

export type PreBattleResistanceModeOptionView = {
  id: PreBattleResistanceMode;
  label: string;
  isSelected: boolean;
};

export type CounterplaySettingsView = {
  unlocked: boolean;
  lockedReason: string | null;
  globalEnabled: boolean;
  globalLabel: string;
  medicineRows: CounterplayMedicineSettingView[];
  resistanceMode: PreBattleResistanceMode;
  resistanceModeLabel: string;
  resistanceModeOptions: PreBattleResistanceModeOptionView[];
  stagePreview: StageCounterplayPreview | null;
};

export type SaveToolResult =
  | {
      ok: true;
      message: string;
      json?: string;
    }
  | {
      ok: false;
      message: string;
      errors: string[];
    };
