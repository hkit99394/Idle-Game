import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import {
  buildEnemyTeamForStage,
  buildPlayerTeamForStage,
  calculateCombatPower,
  calculateSkillUpgradeCost,
  calculateUpgradeCost,
  createInitialPlayerProgress,
  DEFAULT_OFFLINE_FARM_PRESET,
  deriveStats,
  equipHeroEquipment as equipCoreHeroEquipment,
  EQUIPMENT_SLOTS,
  getDefaultFormationSlot,
  getAvailableEquipmentCopyCount,
  getActiveMasterySummaryForStage,
  getActiveEquipmentSetBonuses,
  getHeroAssignmentId,
  getEquipmentInventoryCount,
  getOfflineFarmPresetPolicy,
  getRecommendedOfflineFarmStage,
  getStageById,
  getSkillUpgradeLevel,
  getStyleMasteryExperience,
  getStyleMasteryLevel,
  getUpgradeLevel,
  hasClearedStage,
  isOfflineFarmStageUnlocked,
  isAssignmentUnlocked,
  isHeroEligibleForAssignment,
  isStageUnlocked,
  isStyleBranchUnlocked,
  normalizeOfflineFarmPreset,
  OFFLINE_FARM_PRESET_POLICIES,
  previewOfflineRewards,
  purchaseSkillUpgrade as purchaseCoreSkillUpgrade,
  purchaseUpgrade as purchaseCoreUpgrade,
  resolveStageBattle,
  scaleStatsForLevel,
  selectStyleBranch as selectCoreStyleBranch,
  setAssignmentHeroes as setCoreAssignmentHeroes,
  setPlayerFormationSlot,
  setOfflineFarmStageTarget,
  STYLE_MASTERY_EXPERIENCE_PER_LEVEL
} from "../../core";
import type {
  ActiveMasterySummary,
  ApplyOfflineAssignmentRewardsResult,
  BattleEvent,
  BattleContribution,
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
  PlayerProgress,
  ApplyOfflineRewardsResult,
  PurchaseSkillUpgradeInput,
  PurchaseSkillUpgradeResult,
  PurchaseUpgradeInput,
  PurchaseUpgradeResult,
  ResolveStageBattleResult,
  SaveData,
  SelectStyleBranchInput,
  SelectStyleBranchResult,
  SetAssignmentHeroesInput,
  SetAssignmentHeroesResult,
  StaticGameData
} from "../../core";
import {
  getBrowserSaveStorage,
  exportSaveDataFromStorage,
  importSaveDataToStorage,
  loadSaveDataFromStorage,
  loadSaveDataWithOfflineRewardsFromStorage,
  resetSaveDataInStorage,
  saveWebGameStateToStorage,
  timeTravelOfflineSaveInStorage,
  WEB_SAVE_STORAGE_KEY,
  WEB_SAVE_AUTOSAVE_INTERVAL_MS
} from "./saveStorage";
import type { WebSaveStorage } from "./saveStorage";

export type WebGameState = {
  progress: PlayerProgress;
  selectedStageId: string;
  selectedOfflineFarmStageId: string | null;
  offlineFarmPreset: OfflineFarmPreset;
  offlineSummary: OfflineRewardSummary | null;
  lastBattle: ResolveStageBattleResult | null;
  lastBattleStageId: string | null;
  lastPurchase: PurchaseUpgradeResult | null;
  lastSkillPurchase: PurchaseSkillUpgradeResult | null;
  lastEquipmentAction: EquipHeroEquipmentResult | null;
  lastStyleBranchAction: SelectStyleBranchResult | null;
  lastAssignmentAction: SetAssignmentHeroesResult | null;
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
  isQiBroken: boolean;
  isDefeated: boolean;
};

export type BattleEventCategory =
  | "attack"
  | "armor_break"
  | "qi_break"
  | "qi_recover"
  | "backlash"
  | "guard"
  | "guard_absorb"
  | "protect"
  | "heal"
  | "defeat";

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

export type BattleEventView = {
  id: string;
  category: BattleEventCategory;
  timeSeconds: number;
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
  combatExperience: number;
  assignmentSilver: number;
  assignmentCultivation: number;
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

export const OFFLINE_TIME_TRAVEL_SECONDS = 60 * 60;

function getDefaultFarmStageId(
  data: StaticGameData,
  progress: PlayerProgress,
  preset: OfflineFarmPreset = DEFAULT_OFFLINE_FARM_PRESET
): string | null {
  return setOfflineFarmStageTarget(data, progress, null, preset);
}

function normalizeFarmStageId(
  data: StaticGameData,
  progress: PlayerProgress,
  selectedStageId: string | null,
  preset: OfflineFarmPreset
): string | null {
  return setOfflineFarmStageTarget(data, progress, selectedStageId, preset);
}

function normalizeSelectedStageId(
  data: StaticGameData,
  progress: PlayerProgress,
  selectedStageId: string
): string {
  const selectedStage = getStageById(data, selectedStageId);

  return selectedStage && isStageUnlocked(data, progress, selectedStage)
    ? selectedStage.id
    : progress.currentStageId;
}

function createOfflineRewardSummary(
  offlineRewards: ApplyOfflineRewardsResult | null,
  offlineAssignmentRewards: ApplyOfflineAssignmentRewardsResult | null
): OfflineRewardSummary | null {
  const assignmentRewards = offlineAssignmentRewards?.rewards ?? null;
  const hasFarmRewards = Boolean(
    offlineRewards?.ok && offlineRewards.rewards.clears > 0
  );
  const hasAssignmentRewards = Boolean(
    assignmentRewards && assignmentRewards.assignments.length > 0
  );

  if (!hasFarmRewards && !hasAssignmentRewards) {
    return null;
  }

  return {
    stageId: offlineRewards?.ok ? offlineRewards.stageId : null,
    offlineSeconds: Math.max(
      offlineRewards?.rewards.offlineSeconds ?? 0,
      assignmentRewards?.offlineSeconds ?? 0
    ),
    clears: offlineRewards?.ok ? offlineRewards.rewards.clears : 0,
    silver:
      (offlineRewards?.ok ? offlineRewards.rewards.silver : 0) +
      (assignmentRewards?.silver ?? 0),
    cultivation:
      (offlineRewards?.ok ? offlineRewards.rewards.cultivation : 0) +
      (assignmentRewards?.cultivation ?? 0),
    combatExperience:
      (offlineRewards?.ok ? offlineRewards.rewards.combatExperience : 0) +
      (assignmentRewards?.combatExperience ?? 0),
    assignmentSilver: assignmentRewards?.silver ?? 0,
    assignmentCultivation: assignmentRewards?.cultivation ?? 0,
    assignmentCombatExperience: assignmentRewards?.combatExperience ?? 0,
    assignmentStyleMasteryExperience:
      assignmentRewards?.styleMasteryExperience ?? 0,
    assignmentEquipmentRewards: assignmentRewards?.equipmentRewards ?? []
  };
}

export function createInitialWebGameState(data: StaticGameData): WebGameState {
  const progress = createInitialPlayerProgress(data);

  return {
    progress,
    selectedStageId: progress.currentStageId,
    selectedOfflineFarmStageId: getDefaultFarmStageId(
      data,
      progress,
      DEFAULT_OFFLINE_FARM_PRESET
    ),
    offlineFarmPreset: DEFAULT_OFFLINE_FARM_PRESET,
    offlineSummary: null,
    lastBattle: null,
    lastBattleStageId: null,
    lastPurchase: null,
    lastSkillPurchase: null,
    lastEquipmentAction: null,
    lastStyleBranchAction: null,
    lastAssignmentAction: null
  };
}

export function createWebGameStateFromSave(
  data: StaticGameData,
  save: SaveData,
  offlineSummary: OfflineRewardSummary | null = null
): WebGameState {
  const offlineFarmPreset = normalizeOfflineFarmPreset(save.offlineFarmPreset);

  return {
    progress: save.progress,
    selectedStageId: normalizeSelectedStageId(
      data,
      save.progress,
      save.progress.currentStageId
    ),
    selectedOfflineFarmStageId: normalizeFarmStageId(
      data,
      save.progress,
      save.selectedOfflineFarmStageId,
      offlineFarmPreset
    ),
    offlineFarmPreset,
    offlineSummary,
    lastBattle: null,
    lastBattleStageId: null,
    lastPurchase: null,
    lastSkillPurchase: null,
    lastEquipmentAction: null,
    lastStyleBranchAction: null,
    lastAssignmentAction: null
  };
}

export function createInitialWebGameStateFromStorage(
  data: StaticGameData,
  storage: WebSaveStorage | null = getBrowserSaveStorage(),
  nowMs = Date.now()
): WebGameState {
  if (!storage) {
    return createInitialWebGameState(data);
  }

  const loadResult = loadSaveDataWithOfflineRewardsFromStorage(
    data,
    storage,
    nowMs
  );

  return loadResult.ok
    ? createWebGameStateFromSave(
        data,
        loadResult.save,
        createOfflineRewardSummary(
          loadResult.offlineRewards,
          loadResult.offlineAssignmentRewards
        )
      )
    : createInitialWebGameState(data);
}

export function webGameStateReducer(
  data: StaticGameData,
  state: WebGameState,
  action: WebGameAction
): WebGameState {
  switch (action.type) {
    case "select_stage": {
      const selectedStageId = normalizeSelectedStageId(
        data,
        state.progress,
        action.stageId
      );

      return {
        ...state,
        selectedStageId,
        selectedOfflineFarmStageId: normalizeFarmStageId(
          data,
          state.progress,
          selectedStageId,
          state.offlineFarmPreset
        )
      };
    }

    case "select_offline_farm_stage":
      return {
        ...state,
        selectedOfflineFarmStageId: normalizeFarmStageId(
          data,
          state.progress,
          action.stageId,
          state.offlineFarmPreset
        )
      };

    case "set_offline_farm_preset": {
      const preset = normalizeOfflineFarmPreset(action.preset);

      return {
        ...state,
        offlineFarmPreset: preset,
        selectedOfflineFarmStageId: normalizeFarmStageId(
          data,
          state.progress,
          null,
          preset
        )
      };
    }

    case "set_hero_formation_slot": {
      const result = setPlayerFormationSlot(
        data,
        state.progress,
        action.heroId,
        action.slot
      );

      if (!result.ok) {
        return state;
      }

      return {
        ...state,
        progress: result.progress,
        lastBattle: null,
        lastBattleStageId: null,
        lastPurchase: null,
        lastSkillPurchase: null,
        lastEquipmentAction: null,
        lastStyleBranchAction: null,
        lastAssignmentAction: null
      };
    }

    case "style_branch_select_resolved": {
      const nextProgress = action.result.ok
        ? action.result.progress
        : state.progress;

      return {
        ...state,
        progress: nextProgress,
        lastStyleBranchAction: action.result,
        lastEquipmentAction: null,
        lastSkillPurchase: null,
        lastPurchase: null,
        lastBattle: null,
        lastBattleStageId: null,
        lastAssignmentAction: null
      };
    }

    case "assignment_update_resolved": {
      const nextProgress = action.result.ok
        ? action.result.progress
        : state.progress;

      return {
        ...state,
        progress: nextProgress,
        lastAssignmentAction: action.result,
        lastStyleBranchAction: null,
        lastEquipmentAction: null,
        lastSkillPurchase: null,
        lastPurchase: null,
        lastBattle: null,
        lastBattleStageId: null
      };
    }

    case "battle_resolved": {
      const nextProgress = action.result.ok
        ? action.result.progress
        : state.progress;
      const selectedStageId = state.selectedStageId;

      return {
        ...state,
        progress: nextProgress,
        selectedStageId: normalizeSelectedStageId(
          data,
          nextProgress,
          selectedStageId
        ),
        selectedOfflineFarmStageId: normalizeFarmStageId(
          data,
          nextProgress,
          selectedStageId,
          state.offlineFarmPreset
        ),
        lastBattle: action.result,
        lastBattleStageId: action.stageId,
        lastPurchase: null,
        lastSkillPurchase: null,
        lastEquipmentAction: null,
        lastStyleBranchAction: null,
        lastAssignmentAction: null
      };
    }

    case "purchase_resolved": {
      const nextProgress = action.result.ok
        ? action.result.progress
        : state.progress;

      return {
        ...state,
        progress: nextProgress,
        selectedOfflineFarmStageId: normalizeFarmStageId(
          data,
          nextProgress,
          state.selectedOfflineFarmStageId,
          state.offlineFarmPreset
        ),
        lastPurchase: action.result,
        lastSkillPurchase: null,
        lastEquipmentAction: null,
        lastStyleBranchAction: null,
        lastBattle: null,
        lastBattleStageId: null,
        lastAssignmentAction: null
      };
    }

    case "skill_purchase_resolved": {
      const nextProgress = action.result.ok
        ? action.result.progress
        : state.progress;

      return {
        ...state,
        progress: nextProgress,
        lastSkillPurchase: action.result,
        lastPurchase: null,
        lastEquipmentAction: null,
        lastStyleBranchAction: null,
        lastBattle: null,
        lastBattleStageId: null,
        lastAssignmentAction: null
      };
    }

    case "equipment_equip_resolved": {
      const nextProgress = action.result.ok
        ? action.result.progress
        : state.progress;

      return {
        ...state,
        progress: nextProgress,
        lastEquipmentAction: action.result,
        lastStyleBranchAction: null,
        lastSkillPurchase: null,
        lastPurchase: null,
        lastBattle: null,
        lastBattleStageId: null,
        lastAssignmentAction: null
      };
    }

    case "replace_progress":
      return {
        ...state,
        progress: action.progress,
        selectedStageId: normalizeSelectedStageId(
          data,
          action.progress,
          state.selectedStageId
        ),
        selectedOfflineFarmStageId: normalizeFarmStageId(
          data,
          action.progress,
          state.selectedOfflineFarmStageId,
          state.offlineFarmPreset
        ),
        lastBattle: null,
        lastBattleStageId: null,
        lastPurchase: null,
        lastSkillPurchase: null,
        lastEquipmentAction: null,
        lastStyleBranchAction: null,
        lastAssignmentAction: null
      };

    case "replace_state":
      return action.state;

    case "dismiss_offline_summary":
      return {
        ...state,
        offlineSummary: null
      };
  }
}

export function resolveSelectedStageBattle(
  data: StaticGameData,
  state: WebGameState
): WebGameState {
  const result = resolveStageBattle(data, {
    progress: state.progress,
    stageId: state.selectedStageId,
    maxDurationSeconds: 180
  });

  return webGameStateReducer(data, state, {
    type: "battle_resolved",
    stageId: state.selectedStageId,
    result
  });
}

export function purchaseGameUpgrade(
  data: StaticGameData,
  state: WebGameState,
  input: PurchaseGameUpgradeInput
): WebGameState {
  const result = purchaseCoreUpgrade(data.upgrades, {
    progress: state.progress,
    ...input
  });

  return webGameStateReducer(data, state, {
    type: "purchase_resolved",
    result
  });
}

export function purchaseGameSkillUpgrade(
  data: StaticGameData,
  state: WebGameState,
  input: PurchaseGameSkillUpgradeInput
): WebGameState {
  const result = purchaseCoreSkillUpgrade(data.skillUpgrades, {
    progress: state.progress,
    ...input
  });

  return webGameStateReducer(data, state, {
    type: "skill_purchase_resolved",
    result
  });
}

export function equipGameEquipment(
  data: StaticGameData,
  state: WebGameState,
  input: EquipGameEquipmentInput
): WebGameState {
  const result = equipCoreHeroEquipment(data, {
    progress: state.progress,
    ...input
  });

  return webGameStateReducer(data, state, {
    type: "equipment_equip_resolved",
    result
  });
}

export function selectGameStyleBranch(
  data: StaticGameData,
  state: WebGameState,
  input: SelectGameStyleBranchInput
): WebGameState {
  const result = selectCoreStyleBranch(data, {
    progress: state.progress,
    ...input
  });

  return webGameStateReducer(data, state, {
    type: "style_branch_select_resolved",
    result
  });
}

export function setGameAssignmentHeroes(
  data: StaticGameData,
  state: WebGameState,
  input: SetGameAssignmentHeroesInput
): WebGameState {
  const result = setCoreAssignmentHeroes(data, {
    progress: state.progress,
    ...input
  });

  return webGameStateReducer(data, state, {
    type: "assignment_update_resolved",
    result
  });
}

function getPreviewInstanceId(
  team: TeamId,
  instance: CombatantInstanceDefinition,
  nameId: string,
  index: number
): string {
  return instance.instanceId ?? `${team}_${nameId}_${index + 1}`;
}

function createCombatantView(
  input: {
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
    stats: DerivedStats;
  },
  finalState?: CombatantState
): BattleCombatantView {
  const stats = finalState?.stats ?? input.stats;

  return {
    instanceId: input.instanceId,
    definitionId: input.definitionId,
    team: input.team,
    kind: input.kind,
    name: input.name,
    style: input.style,
    role: input.role,
    combatRole: input.combatRole,
    formationSlot: finalState?.formationSlot ?? input.formationSlot,
    level: Math.max(finalState?.level ?? input.level, input.level),
    outerHp: finalState?.outerHp ?? input.stats.maxOuterHp,
    innerQi: finalState?.innerQi ?? input.stats.maxInnerQi,
    maxOuterHp: finalState?.maxOuterHp ?? input.stats.maxOuterHp,
    maxInnerQi: finalState?.maxInnerQi ?? input.stats.maxInnerQi,
    outerAttack: stats.outerAttack,
    innerAttack: stats.innerAttack,
    speed: stats.speed,
    combatPower: calculateCombatPower(stats),
    isQiBroken: finalState?.isQiBroken ?? false,
    isDefeated: finalState?.defeatedAt != null
  };
}

function getFinalCombatantById(
  finalCombatants: CombatantState[] | undefined,
  instanceId: string
): CombatantState | undefined {
  return finalCombatants?.find((combatant) => combatant.instanceId === instanceId);
}

function formatBattleNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
  }).format(Math.max(0, value));
}

function formatBattlePercent(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
    style: "percent"
  }).format(value);
}

function formatBattleSeconds(value: number): string {
  const maximumFractionDigits = value < 10 ? 1 : 0;

  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits
  }).format(value)}s`;
}

function buildCombatantNameLookup(
  battle: Extract<ResolveStageBattleResult, { ok: true }>["battle"]
): Map<string, string> {
  return new Map(
    [...battle.finalPlayerTeam, ...battle.finalEnemyTeam].map((combatant) => [
      combatant.instanceId,
      `${combatant.name} (${formatSlotLabel(combatant.formationSlot)})`
    ])
  );
}

function getName(lookup: Map<string, string>, instanceId: string): string {
  return lookup.get(instanceId) ?? instanceId;
}

function getSkillName(data: StaticGameData, skillId: string): string {
  return data.skills.find((skill) => skill.id === skillId)?.name ?? skillId;
}

function formatAttackDetail(
  data: StaticGameData,
  event: Extract<BattleEvent, { type: "attack" }>
): string {
  const detail = [
    getSkillName(data, event.skillId),
    `${formatBattleNumber(event.outerDamage)} Outer damage`,
    `${formatBattleNumber(event.innerDamage)} Inner Qi damage`
  ];

  if (event.intendedTargetId && event.intendedTargetId !== event.targetId) {
    detail.push("redirected by protection");
  }

  return detail.join(" · ");
}

function buildBattleEventDetail(
  data: StaticGameData,
  event: BattleEvent,
  names: Map<string, string>
): Pick<BattleEventView, "category" | "headline" | "detail" | "badges"> {
  switch (event.type) {
    case "attack": {
      const source = getName(names, event.sourceId);
      const target = getName(names, event.targetId);
      const skillName = getSkillName(data, event.skillId);
      const intendedTarget =
        event.intendedTargetId && event.intendedTargetId !== event.targetId
          ? getName(names, event.intendedTargetId)
          : null;

      return {
        category: "attack",
        headline: intendedTarget
          ? `${source} attacks ${intendedTarget}`
          : `${source} attacks ${target}`,
        detail: formatAttackDetail(data, event),
        badges: [
          {
            label: skillName,
            tone: "skill"
          },
          {
            label: `${formatBattleNumber(event.outerDamage)} Outer HP`,
            tone: "outer"
          },
          {
            label: `${formatBattleNumber(event.innerDamage)} Inner Qi`,
            tone: "inner"
          },
          ...(intendedTarget
            ? [
                {
                  label: `${target} intercepts`,
                  tone: "neutral" as const
                }
              ]
            : [])
        ]
      };
    }

    case "guard": {
      const target = getName(names, event.targetId);

      return {
        category: "guard",
        headline: `${target} raises guard`,
        detail:
          `${getSkillName(data, event.skillId)} reduces incoming Outer damage by ` +
          `${formatBattlePercent(event.reduction)} until ${formatBattleSeconds(event.endsAt)}`,
        badges: [
          {
            label: "Guard",
            tone: "neutral"
          },
          {
            label: `${formatBattlePercent(event.reduction)} reduction`,
            tone: "outer"
          }
        ]
      };
    }

    case "guard_absorb": {
      const target = getName(names, event.targetId);

      return {
        category: "guard_absorb",
        headline: `${target}'s guard absorbs the strike`,
        detail:
          `${getSkillName(data, event.skillId)} prevents ` +
          `${formatBattleNumber(event.outerDamagePrevented)} Outer damage`,
        badges: [
          {
            label: `${formatBattleNumber(event.outerDamagePrevented)} blocked`,
            tone: "outer"
          },
          {
            label: "Guard",
            tone: "neutral"
          }
        ]
      };
    }

    case "protect": {
      const protector = getName(names, event.sourceId);
      const protectedTarget = getName(names, event.protectedId);
      const attacker = getName(names, event.attackerId);
      const prevented = event.outerDamagePrevented + event.innerDamagePrevented;

      return {
        category: "protect",
        headline: `${protector} protects ${protectedTarget}`,
        detail:
          `${getSkillName(data, event.skillId)} intercepts ${attacker} and prevents ` +
          `${formatBattleNumber(prevented)} total damage`,
        badges: [
          {
            label: "Protection",
            tone: "neutral"
          },
          {
            label: `${formatBattleNumber(prevented)} prevented`,
            tone: "outer"
          }
        ]
      };
    }

    case "armor_break": {
      const source = getName(names, event.sourceId);
      const target = getName(names, event.targetId);

      return {
        category: "armor_break",
        headline: `${source} breaks ${target}'s armor`,
        detail:
          `${getSkillName(data, event.skillId)} reduces guard and Outer Defense by ` +
          `${formatBattlePercent(event.reduction)} until ${formatBattleSeconds(event.endsAt)}`,
        badges: [
          {
            label: "Armor Break",
            tone: "danger"
          },
          {
            label: `${formatBattlePercent(event.reduction)} defense`,
            tone: "outer"
          }
        ]
      };
    }

    case "qi_break": {
      const source = getName(names, event.sourceId);
      const target = getName(names, event.targetId);

      return {
        category: "qi_break",
        headline: `${target} suffers Qi Break`,
        detail:
          `${source} drops Inner Qi to zero, bursts ` +
          `${formatBattleNumber(event.burstDamage)} Outer damage ` +
          `(${formatBattlePercent(event.burstPercent)}), recovers at ` +
          `${formatBattleSeconds(event.endsAt)}`,
        badges: [
          {
            label: "Qi Break",
            tone: "danger"
          },
          {
            label: `${formatBattleNumber(event.burstDamage)} burst`,
            tone: "outer"
          },
          {
            label: `${formatBattleSeconds(event.endsAt)} recovery`,
            tone: "qi"
          }
        ]
      };
    }

    case "qi_recover": {
      const target = getName(names, event.targetId);

      return {
        category: "qi_recover",
        headline: `${target} restores Inner Qi`,
        detail: `Inner Qi returns to ${formatBattleNumber(event.innerQi)}`,
        badges: [
          {
            label: `${formatBattleNumber(event.innerQi)} Inner Qi`,
            tone: "inner"
          }
        ]
      };
    }

    case "backlash": {
      const source = getName(names, event.sourceId);

      return {
        category: "backlash",
        headline: `${source} suffers backlash`,
        detail: `${formatBattleNumber(event.damage)} Outer damage while Qi Broken`,
        badges: [
          {
            label: `${formatBattleNumber(event.damage)} backlash`,
            tone: "danger"
          },
          {
            label: "Qi Broken",
            tone: "qi"
          }
        ]
      };
    }

    case "heal": {
      const target = getName(names, event.targetId);

      return {
        category: "heal",
        headline: `${target} recovers Outer HP`,
        detail: `${formatBattleNumber(event.outerHealing)} Outer HP restored`,
        badges: [
          {
            label: `${formatBattleNumber(event.outerHealing)} healed`,
            tone: "outer"
          }
        ]
      };
    }

    case "defeat": {
      const target = getName(names, event.targetId);
      const defeatedSide = event.team === "player" ? "disciple" : "enemy";

      return {
        category: "defeat",
        headline: `${target} is defeated`,
        detail: `A ${defeatedSide} combatant falls`,
        badges: [
          {
            label: "Defeated",
            tone: "danger"
          },
          {
            label: defeatedSide,
            tone: "neutral"
          }
        ]
      };
    }
  }
}

function buildBattleEventViews(
  data: StaticGameData,
  lastBattle: ResolveStageBattleResult | null
): BattleEventView[] {
  if (!lastBattle?.ok) {
    return [];
  }

  const names = buildCombatantNameLookup(lastBattle.battle);

  return lastBattle.battle.events.map((event, index) => {
    const detail = buildBattleEventDetail(data, event, names);

    return {
      id: `${index}-${event.type}-${event.time}`,
      timeSeconds: event.time,
      timeLabel: formatBattleSeconds(event.time),
      ...detail
    };
  });
}

function formatWinner(winner: TeamId | "timeout"): string {
  switch (winner) {
    case "player":
      return "Victory";
    case "enemy":
      return "Defeat";
    case "timeout":
      return "Stalemate";
  }
}

function formatSlotLabel(slot: FormationSlot): string {
  return `${slot.charAt(0).toUpperCase()}${slot.slice(1)}`;
}

function formatRoleLabel(role: string): string {
  return role
    .replace(/[-_]+/g, " ")
    .replace(/^./, (match) => match.toUpperCase());
}

function getContributionDamage(contribution: BattleContribution): number {
  return (
    contribution.outerDamageDealt +
    contribution.innerDamageDealt +
    contribution.qiBreakBurstDamageDealt
  );
}

function formatContributionName(contribution: BattleContribution): string {
  return `${contribution.name} (${formatSlotLabel(
    contribution.formationSlot
  )} ${formatRoleLabel(contribution.combatRole)})`;
}

function getTopContribution(
  contributions: BattleContribution[],
  getScore: (contribution: BattleContribution) => number
): BattleContribution | null {
  let topContribution: BattleContribution | null = null;
  let topScore = 0;

  for (const contribution of contributions) {
    const score = getScore(contribution);

    if (score > topScore) {
      topContribution = contribution;
      topScore = score;
    }
  }

  return topContribution;
}

function buildContributionSummaryDetails(
  battle: Extract<ResolveStageBattleResult, { ok: true }>["battle"]
): string[] {
  const topDamageDealer = getTopContribution(
    battle.contributions,
    getContributionDamage
  );
  const topBreaker = getTopContribution(
    battle.contributions,
    (contribution) =>
      contribution.qiBreaksTriggered * 1000 +
      contribution.qiBreakBurstDamageDealt
  );
  const carryPool =
    battle.winner === "timeout"
      ? battle.contributions
      : battle.contributions.filter(
          (contribution) => contribution.team === battle.winner
        );
  const carry = getTopContribution(
    carryPool,
    (contribution) =>
      getContributionDamage(contribution) +
      contribution.qiBreaksTriggered * 100 +
      (contribution.survived ? 50 : 0)
  );
  const details: string[] = [];

  if (topDamageDealer) {
    details.push(
      `Top damage: ${formatContributionName(topDamageDealer)} dealt ${formatBattleNumber(
        getContributionDamage(topDamageDealer)
      )} total damage.`
    );
  }

  if (topBreaker && topBreaker.qiBreaksTriggered > 0) {
    details.push(
      `Qi breaker: ${formatContributionName(topBreaker)} triggered ${
        topBreaker.qiBreaksTriggered
      } break${topBreaker.qiBreaksTriggered === 1 ? "" : "s"}.`
    );
  } else {
    details.push("Qi breaker: none.");
  }

  if (carry) {
    details.push(
      `Carry: ${formatContributionName(carry)} ${
        carry.survived ? "survived" : "fell"
      } with ${formatBattleNumber(getContributionDamage(carry))} damage.`
    );
  }

  return details;
}

function buildBattleSummary(
  lastBattle: ResolveStageBattleResult | null,
  stageName: string | null
): BattleSummaryView | null {
  if (!lastBattle) {
    return null;
  }

  if (!lastBattle.ok) {
    return {
      title: "Battle could not start",
      details: [`Reason: ${lastBattle.reason.replaceAll("_", " ")}`]
    };
  }

  const battle = lastBattle.battle;
  const stageLabel = stageName ?? "stage";
  const result = formatWinner(battle.winner);
  const rewardText = lastBattle.rewards
    ? `Rewards: ${formatBattleNumber(lastBattle.rewards.silver)} silver, ` +
      `${formatBattleNumber(lastBattle.rewards.cultivation)} cultivation, ` +
      `${formatBattleNumber(lastBattle.rewards.combatExperience)} Combat XP.`
    : "No rewards earned.";

  return {
    title: `${result} at ${stageLabel} in ${formatBattleSeconds(
      battle.durationSeconds
    )}`,
    details: [
      `Disciples dealt ${formatBattleNumber(
        battle.metrics.playerOuterDamage
      )} Outer, ${formatBattleNumber(
        battle.metrics.playerInnerDamage
      )} Inner Qi, and ${formatBattleNumber(
        battle.metrics.playerQiBreakBurstDamage
      )} Qi Break burst damage.`,
      `Enemy dealt ${formatBattleNumber(
        battle.metrics.enemyOuterDamage
      )} Outer, ${formatBattleNumber(
        battle.metrics.enemyInnerDamage
      )} Inner Qi, and ${formatBattleNumber(
        battle.metrics.enemyQiBreakBurstDamage
      )} Qi Break burst damage.`,
      `Qi Breaks: ${battle.metrics.qiBreaksTriggeredByPlayer} by disciples, ${battle.metrics.qiBreaksTriggeredByEnemy} by enemy.`,
      ...buildContributionSummaryDetails(battle),
      rewardText
    ]
  };
}

function formatStatName(stat: string): string {
  return stat.replace(/[A-Z]/g, (match) => ` ${match}`).replace(/^./, (match) =>
    match.toUpperCase()
  );
}

function formatPerLevelEffect(stat: string, value: number): string {
  return `${formatMasteryPercent(value)} ${formatStatName(stat)} per level`;
}

function formatEquipmentSlot(slot: EquipmentSlot): string {
  return slot.charAt(0).toUpperCase() + slot.slice(1);
}

function formatEquipmentEffect(
  effect: StaticGameData["equipment"][number]["effects"][number]
): string {
  if (effect.mode === "multiplier") {
    return `${formatMasteryPercent(effect.value)} ${formatStatName(effect.stat)}`;
  }

  if (
    effect.stat === "critChance" ||
    effect.stat === "critDamage" ||
    effect.stat === "breakPower" ||
    effect.stat === "breakResist" ||
    effect.stat === "innerRecoveryRate"
  ) {
    return `${formatMasteryPercent(effect.value)} ${formatStatName(effect.stat)}`;
  }

  return `${effect.value >= 0 ? "+" : ""}${effect.value} ${formatStatName(
    effect.stat
  )}`;
}

function formatEquipmentSetBonus(
  set: NonNullable<StaticGameData["equipmentSets"]>[number],
  bonus: NonNullable<StaticGameData["equipmentSets"]>[number]["bonuses"][number]
): string {
  return `${set.name} ${bonus.pieces}-piece: ${bonus.effects
    .map(formatEquipmentEffect)
    .join(", ")}`;
}

function buildEquipmentInventoryViews(
  data: StaticGameData,
  progress: PlayerProgress
): EquipmentInventoryItemView[] {
  const styleNames = new Map(data.styles.map((style) => [style.id, style.name]));
  const equipmentSetById = new Map(
    (data.equipmentSets ?? []).map((set) => [set.id, set])
  );

  return data.equipment.flatMap((equipment) => {
    const count = getEquipmentInventoryCount(progress, equipment.id);
    const set = equipment.setId
      ? equipmentSetById.get(equipment.setId) ?? null
      : null;

    if (count <= 0) {
      return [];
    }

    return [
      {
        equipmentId: equipment.id,
        name: equipment.name,
        slot: equipment.slot,
        rarity: equipment.rarity,
        count,
        availableCount: getAvailableEquipmentCopyCount(progress, equipment.id),
        allowedStyles: equipment.allowedStyles.map(
          (styleId) => styleNames.get(styleId) ?? styleId
        ),
        effects: equipment.effects.map(formatEquipmentEffect),
        affixes: (equipment.affixes ?? []).map(
          (affix) =>
            `${affix.name}: ${affix.effects.map(formatEquipmentEffect).join(", ")}`
        ),
        setName: set?.name ?? null,
        setBonuses: set?.bonuses.map((bonus) =>
          formatEquipmentSetBonus(set, bonus)
        ) ?? [],
        compatibleHeroIds: data.heroes
          .filter(
            (hero) =>
              equipment.allowedStyles.includes(hero.style) &&
              getAvailableEquipmentCopyCount(
                progress,
                equipment.id,
                hero.id,
                equipment.slot
              ) > 0
          )
          .map((hero) => hero.id)
      }
    ];
  });
}

function buildHeroEquipmentViews(
  data: StaticGameData,
  progress: PlayerProgress
): HeroEquipmentView[] {
  const equipped = progress.equipment?.equipped ?? {};
  const equipmentById = new Map(
    data.equipment.map((equipment) => [equipment.id, equipment])
  );
  const equipmentSetById = new Map(
    (data.equipmentSets ?? []).map((set) => [set.id, set])
  );

  return data.heroes.map((hero) => ({
    heroId: hero.id,
    name: hero.name,
    style: hero.style,
    slots: EQUIPMENT_SLOTS.map((slot) => {
      const equipmentId = equipped[hero.id]?.[slot] ?? null;
      const equipment = equipmentId ? equipmentById.get(equipmentId) : null;

      return {
        slot,
        label: formatEquipmentSlot(slot),
        equipmentId,
        name: equipment?.name ?? null,
        rarity: equipment?.rarity ?? null,
        setName: equipment?.setId
          ? equipmentSetById.get(equipment.setId)?.name ?? null
          : null
      };
    }),
    activeSetBonuses: getActiveEquipmentSetBonuses(
      data.equipment,
      data.equipmentSets,
      progress.equipment,
      hero.id
    ).map(
      (bonus) =>
        `${bonus.name} ${bonus.requiredPieces}-piece: ${bonus.effects
          .map(formatEquipmentEffect)
          .join(", ")}`
    )
  }));
}

function buildUpgradeViews(
  data: StaticGameData,
  progress: PlayerProgress
): UpgradeView[] {
  const buildUpgradeView = (
    upgrade: StaticGameData["upgrades"][number],
    level: number,
    cost: number,
    missingSilver: number,
    key: string,
    targetName: string,
    heroId?: string
  ): UpgradeView => ({
    key,
    upgradeId: upgrade.id,
    name: upgrade.name,
    scope: upgrade.scope,
    art: upgrade.art,
    heroId,
    targetName,
    effects: upgrade.effects.map((effect) =>
      formatPerLevelEffect(effect.stat, effect.effectPerLevel)
    ),
    level,
    cost,
    affordable: missingSilver === 0,
    missingSilver
  });

  return data.upgrades.flatMap<UpgradeView>((upgrade) => {
    if (upgrade.scope === "sect") {
      const level = getUpgradeLevel(progress, upgrade);
      const cost = calculateUpgradeCost(upgrade, level);
      const missingSilver = Math.max(0, cost - progress.resources.silver);

      return [
        buildUpgradeView(
          upgrade,
          level,
          cost,
          missingSilver,
          `sect:${upgrade.id}`,
          "Sect"
        )
      ];
    }

    return data.heroes.map((hero) => {
      const level = getUpgradeLevel(progress, upgrade, hero.id);
      const cost = calculateUpgradeCost(upgrade, level);
      const missingSilver = Math.max(0, cost - progress.resources.silver);

      return buildUpgradeView(
        upgrade,
        level,
        cost,
        missingSilver,
        `${hero.id}:${upgrade.id}`,
        hero.name,
        hero.id
      );
    });
  });
}

function formatSkillUpgradeEffect(
  effect: StaticGameData["skillUpgrades"][number]["effects"][number]
): string {
  switch (effect.type) {
    case "cooldown_seconds":
      return `${effect.valuePerLevel < 0 ? "" : "+"}${effect.valuePerLevel.toFixed(
        2
      )}s cooldown per level`;
    case "outer_multiplier":
      return `${formatMasteryPercent(effect.valuePerLevel)} Outer ratio per level`;
    case "inner_multiplier":
      return `${formatMasteryPercent(effect.valuePerLevel)} Inner ratio per level`;
    case "add_skill_effect":
      return `Adds ${effect.effect.type.replaceAll("_", " ")} at level ${effect.unlockLevel}`;
  }
}

function buildSkillUpgradeViews(
  data: StaticGameData,
  progress: PlayerProgress
): SkillUpgradeView[] {
  return data.skillUpgrades.map((upgrade) => {
    const skill = data.skills.find((candidate) => candidate.id === upgrade.skillId);
    const level = getSkillUpgradeLevel(progress, upgrade.id);
    const isMaxLevel = level >= upgrade.maxLevel;
    const cost = isMaxLevel ? 0 : calculateSkillUpgradeCost(upgrade, level);
    const missingCultivation = Math.max(
      0,
      cost - progress.resources.cultivation
    );

    return {
      key: upgrade.id,
      skillUpgradeId: upgrade.id,
      skillId: upgrade.skillId,
      name: upgrade.name,
      skillName: skill?.name ?? upgrade.skillId,
      level,
      maxLevel: upgrade.maxLevel,
      cost,
      affordable: !isMaxLevel && missingCultivation === 0,
      missingCultivation,
      effects: upgrade.effects.map(formatSkillUpgradeEffect)
    };
  });
}

function buildStageOptions(
  data: StaticGameData,
  progress: PlayerProgress,
  selectedStageId: string,
  selectedOfflineFarmStageId: string | null
): StageOptionView[] {
  const seenStageIds = new Set<string>();
  const orderedStages = data.regions.flatMap((region) =>
    region.stageIds.flatMap((stageId) => {
      const stage = getStageById(data, stageId);

      if (!stage) {
        return [];
      }

      seenStageIds.add(stage.id);

      return [
        {
          stage,
          regionName: region.name
        }
      ];
    })
  );
  const unlistedStages = data.stages
    .filter((stage) => !seenStageIds.has(stage.id))
    .map((stage) => ({
      stage,
      regionName:
        data.regions.find((region) => region.id === stage.regionId)?.name ??
        stage.regionId
    }));

  return [...orderedStages, ...unlistedStages].map(({ stage, regionName }) => {
    const isUnlocked = isStageUnlocked(data, progress, stage);
    const isCleared = hasClearedStage(progress, stage);
    const canSelectOfflineFarm = isOfflineFarmStageUnlocked(
      data,
      progress,
      stage.id
    );

    return {
      id: stage.id,
      regionId: stage.regionId,
      regionName,
      name: stage.name,
      index: stage.index,
      isBoss: stage.isBoss,
      isUnlocked,
      isCleared,
      isSelectedStage: stage.id === selectedStageId,
      isSelectedOfflineFarmStage: stage.id === selectedOfflineFarmStageId,
      canSelectStage: isUnlocked,
      canSelectOfflineFarm,
      rewards: stage.rewards
    };
  });
}

function formatMasteryPercent(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    signDisplay: "always",
    style: "percent"
  }).format(value);
}

function formatMasteryBonus(bonus: MasteryBonus): string {
  switch (bonus.type) {
    case "map_outer_and_inner_attack_multiplier":
      return `${formatMasteryPercent(bonus.value)} Outer and Inner attack`;
    case "map_reward_multiplier":
      return `${formatMasteryPercent(bonus.value)} stage rewards`;
    case "enemy_family_damage_multiplier":
      return `${formatMasteryPercent(bonus.value)} damage to enemy family`;
  }
}

function getMasteryRankTone(rank: string): MasteryRankTone {
  switch (rank) {
    case "familiar":
      return "familiar";
    case "trained":
      return "trained";
    case "mastered":
      return "mastered";
    default:
      return "unfamiliar";
  }
}

function formatMasteryRankLabel(rank: string): string {
  const words = rank
    .replace(/[-_]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "Unfamiliar";
  }

  return words
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function buildMasteryRankView(rank: string): MasteryRankView {
  return {
    rank,
    label: formatMasteryRankLabel(rank),
    tone: getMasteryRankTone(rank)
  };
}

function buildMasteryPanel(
  data: StaticGameData,
  summary: ActiveMasterySummary | null
): MasteryPanelView | null {
  if (!summary) {
    return null;
  }

  const region = data.regions.find(
    (candidate) => candidate.id === summary.regionId
  );
  const nextThreshold = summary.nextThreshold
    ? {
        experience: summary.nextThreshold.experience,
        rank: summary.nextThreshold.rank,
        remainingExperience: Math.max(
          0,
          summary.nextThreshold.experience - summary.combatExperience
        )
      }
    : null;
  const progressTargetExperience =
    nextThreshold?.experience ??
    data.mastery.thresholds.at(-1)?.experience ??
    summary.combatExperience;

  return {
    regionId: summary.regionId,
    regionName: region?.name ?? summary.regionId,
    combatExperience: summary.combatExperience,
    reachedRanks: summary.reachedRanks.map(buildMasteryRankView),
    nextThreshold,
    activeBonuses: summary.activeBonuses.map((bonus, index) => ({
      key: `${bonus.type}-${bonus.value}-${index}`,
      label: formatMasteryBonus(bonus)
    })),
    progressPercent:
      progressTargetExperience > 0
        ? Math.min(summary.combatExperience / progressTargetExperience, 1)
        : 0
  };
}

function formatStyleBranchRequirement(
  data: StaticGameData,
  branch: StaticGameData["styles"][number]["branches"][number]
): string {
  const unlock = branch.unlock;

  switch (unlock.type) {
    case "always":
      return "Available";
    case "stage_cleared":
      return `Clear ${
        getStageById(data, unlock.stageId)?.name ?? unlock.stageId
      }`;
    case "hero_level":
      return `${
        data.heroes.find((hero) => hero.id === unlock.heroId)?.name ??
        unlock.heroId
      } level ${unlock.level}`;
    case "style_mastery_level":
      return `${
        data.styles.find((style) => style.id === unlock.styleId)?.name ??
        unlock.styleId
      } mastery ${unlock.level}`;
  }
}

function formatStyleBranchEffect(
  effect: StaticGameData["styles"][number]["branches"][number]["effects"][number]
): string {
  switch (effect.type) {
    case "stat_multiplier":
      return `${formatMasteryPercent(effect.value)} ${formatStatName(effect.stat)}`;
  }
}

function formatAssignmentRequirement(
  data: StaticGameData,
  assignment: NonNullable<StaticGameData["assignments"]>[number]
): string {
  const unlock = assignment.unlockCondition;

  switch (unlock.type) {
    case "always":
      return "Available";
    case "stage_cleared":
      return `Clear ${
        getStageById(data, unlock.stageId)?.name ?? unlock.stageId
      }`;
    case "hero_level":
      return `${
        data.heroes.find((hero) => hero.id === unlock.heroId)?.name ??
        unlock.heroId
      } level ${unlock.level}`;
    case "style_mastery_level":
      return `${
        data.styles.find((style) => style.id === unlock.styleId)?.name ??
        unlock.styleId
      } mastery ${unlock.level}`;
  }
}

function buildAssignmentRewardSummary(
  data: StaticGameData,
  assignment: NonNullable<StaticGameData["assignments"]>[number]
): string[] {
  const rewards = assignment.rewardProfile;
  const equipmentNames = new Map(
    data.equipment.map((equipment) => [equipment.id, equipment.name])
  );
  const details: string[] = [];

  if (rewards.silverPerHour) {
    details.push(`${formatBattleNumber(rewards.silverPerHour)} silver/hour`);
  }

  if (rewards.cultivationPerHour) {
    details.push(
      `${formatBattleNumber(rewards.cultivationPerHour)} cultivation/hour`
    );
  }

  if (rewards.combatExperiencePerHour) {
    details.push(
      `${formatBattleNumber(rewards.combatExperiencePerHour)} Combat XP/hour`
    );
  }

  if (rewards.styleMasteryExperiencePerHour) {
    details.push(
      `${formatBattleNumber(
        rewards.styleMasteryExperiencePerHour
      )} style mastery/hour`
    );
  }

  for (const reward of rewards.equipmentRewardsPerHour ?? []) {
    details.push(
      `${reward.quantityPerHour}/hour ${
        equipmentNames.get(reward.equipmentId) ?? reward.equipmentId
      }`
    );
  }

  return details;
}

function buildAssignmentViews(
  data: StaticGameData,
  progress: PlayerProgress
): AssignmentView[] {
  const assignmentNameById = new Map(
    (data.assignments ?? []).map((assignment) => [assignment.id, assignment.name])
  );

  return (data.assignments ?? []).map((assignment) => {
    const unlocked = isAssignmentUnlocked(data, progress, assignment);
    const assignedHeroIds =
      progress.assignments?.[assignment.id]?.heroIds ?? [];

    return {
      assignmentId: assignment.id,
      name: assignment.name,
      type: assignment.type,
      durationBucket: assignment.durationBucket,
      unlocked,
      lockReason: unlocked
        ? null
        : formatAssignmentRequirement(data, assignment),
      assignedHeroIds,
      rewardSummary: buildAssignmentRewardSummary(data, assignment),
      heroOptions: data.heroes.map((hero) => {
        const assignedAssignmentId = getHeroAssignmentId(progress, hero.id);

        return {
          heroId: hero.id,
          name: hero.name,
          style: hero.style,
          role: hero.combatRole,
          eligible: isHeroEligibleForAssignment(assignment, hero),
          assignedHere: assignedAssignmentId === assignment.id,
          assignedAssignmentName: assignedAssignmentId
            ? assignmentNameById.get(assignedAssignmentId) ?? assignedAssignmentId
            : null
        };
      })
    };
  });
}

function buildStyleMasteryViews(
  data: StaticGameData,
  progress: PlayerProgress
): StyleMasteryView[] {
  return data.styles.map((style) => {
    const experience = getStyleMasteryExperience(progress, style.id);
    const level = getStyleMasteryLevel(progress, style.id);
    const currentLevelExperience = level * STYLE_MASTERY_EXPERIENCE_PER_LEVEL;
    const nextLevelExperience = (level + 1) * STYLE_MASTERY_EXPERIENCE_PER_LEVEL;
    const progressPercent = Math.min(
      Math.max(
        (experience - currentLevelExperience) /
          (nextLevelExperience - currentLevelExperience),
        0
      ),
      1
    );

    return {
      styleId: style.id,
      name: style.name,
      level,
      experience,
      nextLevelExperience,
      progressPercent,
      bonuses: style.bonuses.map((bonus) =>
        formatPerLevelEffect(bonus.stat, bonus.effectPerLevel)
      ),
      branches: style.branches.map((branch) => {
        const isUnlocked = isStyleBranchUnlocked(data, progress, branch);
        const isSelected = progress.styleBranches?.[style.id] === branch.id;

        return {
          id: branch.id,
          name: branch.name,
          isUnlocked,
          isSelected,
          canSelect: isUnlocked && !isSelected,
          hiddenInMvp: branch.hiddenInMvp,
          requirement: formatStyleBranchRequirement(data, branch),
          effects: branch.effects.map(formatStyleBranchEffect)
        };
      })
    };
  });
}

function buildOfflineRewardSummaryView(
  data: StaticGameData,
  summary: OfflineRewardSummary | null
): OfflineRewardSummaryView | null {
  if (!summary) {
    return null;
  }

  const stage = summary.stageId ? getStageById(data, summary.stageId) : null;
  const region = data.regions.find((candidate) => candidate.id === stage?.regionId);

  return {
    ...summary,
    stageName: stage?.name ?? "Assignments",
    regionName: region?.name ?? stage?.regionId ?? "Idle routes"
  };
}

function getRegionNameForStage(
  data: StaticGameData,
  stage: ReturnType<typeof getStageById> | null
): string {
  return (
    data.regions.find((candidate) => candidate.id === stage?.regionId)?.name ??
    stage?.regionId ??
    "Unknown map"
  );
}

function formatOfflineFarmPriority(priority: string): string {
  switch (priority) {
    case "combatExperience":
      return "Combat XP";
    case "mastery":
      return "Mastery";
    default:
      return formatStatName(priority);
  }
}

function buildOfflineFarmPresetViews(
  selectedPreset: OfflineFarmPreset
): OfflineFarmPresetView[] {
  return OFFLINE_FARM_PRESET_POLICIES.map((policy) => ({
    id: policy.id,
    label: policy.label,
    description: policy.description,
    rewardPriority: policy.rewardPriority.map(formatOfflineFarmPriority),
    isSelected: policy.id === selectedPreset
  }));
}

function buildOfflineFarmRecommendationView(
  data: StaticGameData,
  progress: PlayerProgress,
  selectedOfflineFarmStageId: string | null,
  preset: OfflineFarmPreset
): OfflineFarmRecommendationView {
  const policy = getOfflineFarmPresetPolicy(preset);
  const recommendedStage = getRecommendedOfflineFarmStage(data, progress, preset);

  if (!recommendedStage) {
    return {
      stageId: null,
      stageName: "No cleared farm stage",
      regionName: "No map",
      presetLabel: policy.label,
      description: policy.description,
      rewardPriority: policy.rewardPriority.map(formatOfflineFarmPriority),
      isSelected: false
    };
  }

  return {
    stageId: recommendedStage.id,
    stageName: recommendedStage.name,
    regionName: getRegionNameForStage(data, recommendedStage),
    presetLabel: policy.label,
    description: policy.description,
    rewardPriority: policy.rewardPriority.map(formatOfflineFarmPriority),
    isSelected: recommendedStage.id === selectedOfflineFarmStageId
  };
}

function formatOfflinePreviewReason(reason: string): string {
  switch (reason) {
    case "missing_farm_stage":
      return "Select a cleared farm stage";
    case "invalid_farm_stage":
      return "Selected farm stage is unavailable";
    default:
      return "Offline preview unavailable";
  }
}

function buildOfflineRewardPreviewView(
  data: StaticGameData,
  progress: PlayerProgress,
  selectedOfflineFarmStageId: string | null
): OfflineRewardPreviewView {
  const stage = selectedOfflineFarmStageId
    ? getStageById(data, selectedOfflineFarmStageId)
    : null;
  const preview = previewOfflineRewards({
    data,
    progress,
    selectedOfflineFarmStageId,
    previewSeconds: OFFLINE_TIME_TRAVEL_SECONDS
  });

  if (!preview.ok) {
    return {
      ok: false,
      reason: formatOfflinePreviewReason(preview.reason),
      stageName: stage?.name ?? "No farm target",
      regionName: getRegionNameForStage(data, stage),
      previewSeconds: OFFLINE_TIME_TRAVEL_SECONDS,
      clears: 0,
      silver: 0,
      cultivation: 0,
      combatExperience: 0,
      masteryExperienceGain: 0
    };
  }

  const previewStage = getStageById(data, preview.stageId);

  return {
    ok: true,
    reason: null,
    stageName: previewStage?.name ?? preview.stageId,
    regionName: getRegionNameForStage(data, previewStage),
    previewSeconds: OFFLINE_TIME_TRAVEL_SECONDS,
    clears: preview.rewards.clears,
    silver: preview.rewards.silver,
    cultivation: preview.rewards.cultivation,
    combatExperience: preview.rewards.combatExperience,
    masteryExperienceGain: preview.masteryExperienceGain
  };
}

function getSaveToolErrorMessage(reason: string): string {
  switch (reason) {
    case "empty_import":
      return "Import text is empty";
    case "invalid_json":
      return "Save JSON is invalid";
    case "invalid_save":
      return "Save data is invalid";
    case "invalid_duration":
      return "Offline time travel duration is invalid";
    case "missing_save":
      return "No save found";
    case "storage_error":
      return "Save storage failed";
    default:
      return "Save tool failed";
  }
}

function getCurrentRegionHighestClearedStageIndex(
  data: StaticGameData,
  progress: PlayerProgress
): number {
  const currentStage = getStageById(data, progress.currentStageId);

  return currentStage
    ? progress.maps[currentStage.regionId]?.highestClearedStageIndex ?? 0
    : 0;
}

function buildSaveDiagnostics(
  data: StaticGameData,
  state: WebGameState
): SaveDiagnosticsView {
  const storage = getBrowserSaveStorage();

  if (!storage) {
    return {
      storageAvailable: false,
      storageKey: WEB_SAVE_STORAGE_KEY,
      status: "storage_unavailable",
      saveVersion: null,
      saveSizeCharacters: 0,
      createdAtMs: null,
      updatedAtMs: null,
      lastOfflineRewardAtMs: null,
      currentStageId: state.progress.currentStageId,
      selectedOfflineFarmStageId: state.selectedOfflineFarmStageId,
      offlineFarmPreset: state.offlineFarmPreset,
      highestClearedStageIndex: getCurrentRegionHighestClearedStageIndex(
        data,
        state.progress
      ),
      autosaveIntervalMs: WEB_SAVE_AUTOSAVE_INTERVAL_MS,
      errors: ["Browser save storage is unavailable"]
    };
  }

  let rawSave: string | null = null;

  try {
    rawSave = storage.getItem(WEB_SAVE_STORAGE_KEY);
  } catch (error) {
    return {
      storageAvailable: true,
      storageKey: WEB_SAVE_STORAGE_KEY,
      status: "storage_error",
      saveVersion: null,
      saveSizeCharacters: 0,
      createdAtMs: null,
      updatedAtMs: null,
      lastOfflineRewardAtMs: null,
      currentStageId: state.progress.currentStageId,
      selectedOfflineFarmStageId: state.selectedOfflineFarmStageId,
      offlineFarmPreset: state.offlineFarmPreset,
      highestClearedStageIndex: getCurrentRegionHighestClearedStageIndex(
        data,
        state.progress
      ),
      autosaveIntervalMs: WEB_SAVE_AUTOSAVE_INTERVAL_MS,
      errors: [error instanceof Error ? error.message : "Unable to read save"]
    };
  }

  const loadResult = loadSaveDataFromStorage(data, storage);

  if (!loadResult.ok) {
    return {
      storageAvailable: true,
      storageKey: WEB_SAVE_STORAGE_KEY,
      status: loadResult.reason,
      saveVersion: null,
      saveSizeCharacters: rawSave?.length ?? 0,
      createdAtMs: null,
      updatedAtMs: null,
      lastOfflineRewardAtMs: null,
      currentStageId: state.progress.currentStageId,
      selectedOfflineFarmStageId: state.selectedOfflineFarmStageId,
      offlineFarmPreset: state.offlineFarmPreset,
      highestClearedStageIndex: getCurrentRegionHighestClearedStageIndex(
        data,
        state.progress
      ),
      autosaveIntervalMs: WEB_SAVE_AUTOSAVE_INTERVAL_MS,
      errors: loadResult.errors
    };
  }

  const save = loadResult.save;

  return {
    storageAvailable: true,
    storageKey: WEB_SAVE_STORAGE_KEY,
    status: "ready",
    saveVersion: save.version,
    saveSizeCharacters: rawSave?.length ?? 0,
    createdAtMs: save.createdAtMs,
    updatedAtMs: save.updatedAtMs,
    lastOfflineRewardAtMs: save.lastOfflineRewardAtMs,
    currentStageId: save.progress.currentStageId,
    selectedOfflineFarmStageId: save.selectedOfflineFarmStageId,
    offlineFarmPreset: save.offlineFarmPreset,
    highestClearedStageIndex: getCurrentRegionHighestClearedStageIndex(
      data,
      save.progress
    ),
    autosaveIntervalMs: WEB_SAVE_AUTOSAVE_INTERVAL_MS,
    errors: []
  };
}

function buildPlayerCombatantViews(
  data: StaticGameData,
  progress: PlayerProgress,
  stageId: string,
  finalCombatants?: CombatantState[]
): BattleCombatantView[] {
  const teamResult = buildPlayerTeamForStage(data, progress, stageId);

  if (!teamResult.ok) {
    return [];
  }

  return teamResult.team.combatants.flatMap((instance, index) => {
    const hero = data.heroes.find(
      (candidate) => candidate.id === instance.definitionId
    );

    if (!hero) {
      return [];
    }

    const stats = deriveStats(instance.statsOverride ?? hero.baseStats);
    const level = instance.level ?? progress.heroes[hero.id]?.level ?? 1;
    const formationSlot = instance.formationSlot ?? getDefaultFormationSlot(index);
    const instanceId = getPreviewInstanceId(
      teamResult.team.id,
      instance,
      hero.id,
      index
    );

    return createCombatantView(
      {
        instanceId,
        definitionId: hero.id,
        team: teamResult.team.id,
        kind: "hero",
        name: hero.name,
        style: hero.style,
        role: hero.role,
        combatRole: hero.combatRole,
        formationSlot,
        level,
        stats
      },
      getFinalCombatantById(finalCombatants, instanceId)
    );
  });
}

function buildPlayerFormationViews(
  playerCombatants: BattleCombatantView[]
): PlayerFormationHeroView[] {
  return playerCombatants.map((combatant) => ({
    heroId: combatant.definitionId,
    name: combatant.name,
    style: combatant.style,
    role: combatant.role,
    combatRole: combatant.combatRole,
    formationSlot: combatant.formationSlot
  }));
}

function buildEnemyCombatantViews(
  data: StaticGameData,
  stageId: string,
  finalCombatants?: CombatantState[]
): BattleCombatantView[] {
  const teamResult = buildEnemyTeamForStage(data, stageId);

  if (!teamResult.ok) {
    return [];
  }

  return teamResult.team.combatants.flatMap((instance, index) => {
    const enemy = data.enemies.find(
      (candidate) => candidate.id === instance.definitionId
    );

    if (!enemy) {
      return [];
    }

    const level = instance.level ?? enemy.level;
    const formationSlot = instance.formationSlot ?? getDefaultFormationSlot(index);
    const stats = deriveStats(
      instance.statsOverride ?? scaleStatsForLevel(enemy.baseStats, level)
    );
    const instanceId = getPreviewInstanceId(
      teamResult.team.id,
      instance,
      enemy.id,
      index
    );

    return createCombatantView(
      {
        instanceId,
        definitionId: enemy.id,
        team: teamResult.team.id,
        kind: "enemy",
        name: enemy.name,
        style: enemy.style,
        role: enemy.type,
        combatRole: enemy.combatRole,
        formationSlot,
        level,
        stats
      },
      getFinalCombatantById(finalCombatants, instanceId)
    );
  });
}

function buildEnemyTeamLabel(
  data: StaticGameData,
  stage: ReturnType<typeof getStageById> | null
): string {
  if (!stage || stage.enemyTeam.combatantIds.length === 0) {
    return "Unknown Enemy Team";
  }

  const enemyNames = new Map(
    data.enemies.map((enemy) => [enemy.id, enemy.name])
  );
  const nameCounts = new Map<string, number>();

  for (const enemyId of stage.enemyTeam.combatantIds) {
    const enemyName = enemyNames.get(enemyId) ?? enemyId;
    nameCounts.set(enemyName, (nameCounts.get(enemyName) ?? 0) + 1);
  }

  return [...nameCounts.entries()]
    .map(([enemyName, count]) =>
      count > 1 ? `${enemyName} x${count}` : enemyName
    )
    .join(" / ");
}

export function getWebGameViewModel(
  data: StaticGameData,
  state: WebGameState
) {
  const selectedStage = getStageById(data, state.selectedStageId);
  const selectedStageRegion = data.regions.find(
    (region) => region.id === selectedStage?.regionId
  );
  const enemyTeamLabel = buildEnemyTeamLabel(data, selectedStage);
  const selectedOfflineFarmStage = state.selectedOfflineFarmStageId
    ? getStageById(data, state.selectedOfflineFarmStageId)
    : null;
  const lastBattleStage = state.lastBattleStageId
    ? getStageById(data, state.lastBattleStageId)
    : null;
  const masterySummary = getActiveMasterySummaryForStage(
    data,
    state.progress,
    state.selectedStageId
  );
  const activeMasterySummary = masterySummary.ok ? masterySummary.summary : null;
  const successfulLastBattle = state.lastBattle?.ok ? state.lastBattle : null;
  const showFinalCombatants =
    successfulLastBattle !== null &&
    state.lastBattleStageId === state.selectedStageId;
  const finalPlayerTeam = showFinalCombatants
    ? successfulLastBattle.battle.finalPlayerTeam
    : undefined;
  const finalEnemyTeam = showFinalCombatants
    ? successfulLastBattle.battle.finalEnemyTeam
    : undefined;
  const playerCombatants = selectedStage
    ? buildPlayerCombatantViews(
        data,
        state.progress,
        selectedStage.id,
        finalPlayerTeam
      )
    : [];
  const enemyCombatants = selectedStage
    ? buildEnemyCombatantViews(data, selectedStage.id, finalEnemyTeam)
    : [];

  return {
    progress: state.progress,
    selectedStage,
    selectedStageRegionName:
      selectedStageRegion?.name ?? selectedStage?.regionId ?? "Unknown map",
    selectedOfflineFarmStage,
    offlineFarmPreset: state.offlineFarmPreset,
    offlineFarmPresets: buildOfflineFarmPresetViews(state.offlineFarmPreset),
    offlineFarmRecommendation: buildOfflineFarmRecommendationView(
      data,
      state.progress,
      state.selectedOfflineFarmStageId,
      state.offlineFarmPreset
    ),
    offlineRewardPreview: buildOfflineRewardPreviewView(
      data,
      state.progress,
      state.selectedOfflineFarmStageId
    ),
    stageOptions: buildStageOptions(
      data,
      state.progress,
      state.selectedStageId,
      state.selectedOfflineFarmStageId
    ),
    equipmentInventory: buildEquipmentInventoryViews(data, state.progress),
    heroEquipment: buildHeroEquipmentViews(data, state.progress),
    assignments: buildAssignmentViews(data, state.progress),
    upgrades: buildUpgradeViews(data, state.progress),
    skillUpgrades: buildSkillUpgradeViews(data, state.progress),
    styleMastery: buildStyleMasteryViews(data, state.progress),
    playerFormation: buildPlayerFormationViews(playerCombatants),
    playerCombatants,
    enemyCombatants,
    enemyTeamLabel,
    masterySummary: activeMasterySummary,
    masteryPanel: buildMasteryPanel(data, activeMasterySummary),
    offlineSummary: buildOfflineRewardSummaryView(data, state.offlineSummary),
    lastBattle: state.lastBattle,
    lastBattleStage,
    battleEvents: buildBattleEventViews(data, state.lastBattle),
    battleSummary: buildBattleSummary(state.lastBattle, lastBattleStage?.name ?? null),
    lastPurchase: state.lastPurchase,
    lastSkillPurchase: state.lastSkillPurchase,
    lastEquipmentAction: state.lastEquipmentAction,
    lastStyleBranchAction: state.lastStyleBranchAction,
    lastAssignmentAction: state.lastAssignmentAction
  };
}

export function useWebGameState(data: StaticGameData) {
  const [state, dispatch] = useReducer(
    (currentState: WebGameState, action: WebGameAction) =>
      webGameStateReducer(data, currentState, action),
    data,
    createInitialWebGameStateFromStorage
  );
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const persistState = useCallback(
    (stateToSave: WebGameState) => {
      const storage = getBrowserSaveStorage();

      if (!storage) {
        return;
      }

      saveWebGameStateToStorage(data, stateToSave, storage);
    },
    [data]
  );

  const dispatchAndPersist = useCallback(
    (action: WebGameAction) => {
      const nextState = webGameStateReducer(data, state, action);

      dispatch(action);
      persistState(nextState);
    },
    [data, persistState, state]
  );

  useEffect(() => {
    const storage = getBrowserSaveStorage();

    if (!storage) {
      return;
    }

    const timer = window.setInterval(() => {
      saveWebGameStateToStorage(data, stateRef.current, storage);
    }, WEB_SAVE_AUTOSAVE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [data]);

  const battleSelectedStage = useCallback(() => {
    dispatchAndPersist({
      type: "battle_resolved",
      stageId: state.selectedStageId,
      result: resolveStageBattle(data, {
        progress: state.progress,
        stageId: state.selectedStageId,
        maxDurationSeconds: 180
      })
    });
  }, [data, dispatchAndPersist, state.progress, state.selectedStageId]);

  const purchaseUpgrade = useCallback(
    (input: PurchaseGameUpgradeInput) => {
      dispatchAndPersist({
        type: "purchase_resolved",
        result: purchaseCoreUpgrade(data.upgrades, {
          progress: state.progress,
          ...input
        })
      });
    },
    [data, dispatchAndPersist, state.progress]
  );

  const purchaseSkillUpgrade = useCallback(
    (input: PurchaseGameSkillUpgradeInput) => {
      dispatchAndPersist({
        type: "skill_purchase_resolved",
        result: purchaseCoreSkillUpgrade(data.skillUpgrades, {
          progress: state.progress,
          ...input
        })
      });
    },
    [data, dispatchAndPersist, state.progress]
  );

  const equipEquipment = useCallback(
    (input: EquipGameEquipmentInput) => {
      dispatchAndPersist({
        type: "equipment_equip_resolved",
        result: equipCoreHeroEquipment(data, {
          progress: state.progress,
          ...input
        })
      });
    },
    [data, dispatchAndPersist, state.progress]
  );

  const selectStage = useCallback((stageId: string) => {
    dispatchAndPersist({
      type: "select_stage",
      stageId
    });
  }, [dispatchAndPersist]);

  const setOfflineFarmPreset = useCallback((preset: OfflineFarmPreset) => {
    dispatchAndPersist({
      type: "set_offline_farm_preset",
      preset
    });
  }, [dispatchAndPersist]);

  const setHeroFormation = useCallback((heroId: string, slot: FormationSlot) => {
    dispatchAndPersist({
      type: "set_hero_formation_slot",
      heroId,
      slot
    });
  }, [dispatchAndPersist]);

  const selectStyleBranch = useCallback(
    (input: SelectGameStyleBranchInput) => {
      dispatchAndPersist({
        type: "style_branch_select_resolved",
        result: selectCoreStyleBranch(data, {
          progress: state.progress,
          ...input
        })
      });
    },
    [data, dispatchAndPersist, state.progress]
  );

  const setAssignmentHeroes = useCallback(
    (input: SetGameAssignmentHeroesInput) => {
      dispatchAndPersist({
        type: "assignment_update_resolved",
        result: setCoreAssignmentHeroes(data, {
          progress: state.progress,
          ...input
        })
      });
    },
    [data, dispatchAndPersist, state.progress]
  );

  const dismissOfflineSummary = useCallback(() => {
    dispatch({
      type: "dismiss_offline_summary"
    });
  }, []);

  const viewModel = useMemo(
    () => getWebGameViewModel(data, state),
    [data, state]
  );
  const saveDiagnostics = useMemo(
    () => buildSaveDiagnostics(data, state),
    [data, state]
  );

  const exportSave = useCallback((): SaveToolResult => {
    const storage = getBrowserSaveStorage();

    if (!storage) {
      return {
        ok: false,
        message: "Browser save storage is unavailable",
        errors: ["Browser save storage is unavailable"]
      };
    }

    const result = exportSaveDataFromStorage(data, storage);

    if (!result.ok) {
      return {
        ok: false,
        message: getSaveToolErrorMessage(result.reason),
        errors: result.errors
      };
    }

    return {
      ok: true,
      message: "Save exported",
      json: result.json
    };
  }, [data]);

  const importSave = useCallback((rawSaveText: string): SaveToolResult => {
    const storage = getBrowserSaveStorage();

    if (!storage) {
      return {
        ok: false,
        message: "Browser save storage is unavailable",
        errors: ["Browser save storage is unavailable"]
      };
    }

    const result = importSaveDataToStorage(data, storage, rawSaveText);

    if (!result.ok) {
      return {
        ok: false,
        message: getSaveToolErrorMessage(result.reason),
        errors: result.errors
      };
    }

    dispatch({
      type: "replace_state",
      state: createWebGameStateFromSave(data, result.save)
    });

    return {
      ok: true,
      message: "Save imported"
    };
  }, [data]);

  const resetNewGame = useCallback((): SaveToolResult => {
    const storage = getBrowserSaveStorage();

    if (!storage) {
      dispatch({
        type: "replace_state",
        state: createInitialWebGameState(data)
      });

      return {
        ok: false,
        message: "Browser save storage is unavailable",
        errors: ["New game was reset for this session only"]
      };
    }

    const result = resetSaveDataInStorage(data, storage);

    if (!result.ok) {
      return {
        ok: false,
        message: getSaveToolErrorMessage(result.reason),
        errors: result.errors
      };
    }

    dispatch({
      type: "replace_state",
      state: createWebGameStateFromSave(data, result.save)
    });

    return {
      ok: true,
      message: "New game save created"
    };
  }, [data]);

  const timeTravelOfflineFarm = useCallback(
    (
      offlineSeconds = OFFLINE_TIME_TRAVEL_SECONDS
    ): SaveToolResult => {
      const storage = getBrowserSaveStorage();

      if (!state.selectedOfflineFarmStageId) {
        return {
          ok: false,
          message: "Select an offline farm stage first",
          errors: []
        };
      }

      if (!storage) {
        return {
          ok: false,
          message: "Browser save storage is unavailable",
          errors: ["Browser save storage is unavailable"]
        };
      }

      const nowMs = Date.now();
      const saveResult = saveWebGameStateToStorage(data, state, storage, nowMs);

      if (!saveResult.ok) {
        return {
          ok: false,
          message: getSaveToolErrorMessage(saveResult.reason),
          errors: saveResult.errors
        };
      }

      const travelResult = timeTravelOfflineSaveInStorage(
        data,
        storage,
        offlineSeconds,
        nowMs
      );

      if (!travelResult.ok) {
        return {
          ok: false,
          message: getSaveToolErrorMessage(travelResult.reason),
          errors: travelResult.errors
        };
      }

      const loadResult = loadSaveDataWithOfflineRewardsFromStorage(
        data,
        storage,
        nowMs
      );

      if (!loadResult.ok) {
        return {
          ok: false,
          message: getSaveToolErrorMessage(loadResult.reason),
          errors: loadResult.errors
        };
      }

      const offlineSummary = createOfflineRewardSummary(
        loadResult.offlineRewards,
        loadResult.offlineAssignmentRewards
      );

      dispatch({
        type: "replace_state",
        state: createWebGameStateFromSave(data, loadResult.save, offlineSummary)
      });

      return {
        ok: true,
        message: offlineSummary
          ? "Offline time travel rewards applied"
          : "Offline time travel applied with no rewards"
      };
    },
    [data, state]
  );

  return {
    state,
    viewModel,
    saveDiagnostics,
    dispatch,
    battleSelectedStage,
    purchaseUpgrade,
    purchaseSkillUpgrade,
    equipEquipment,
    selectStage,
    setOfflineFarmPreset,
    setHeroFormation,
    selectStyleBranch,
    setAssignmentHeroes,
    dismissOfflineSummary,
    exportSave,
    importSave,
    resetNewGame,
    timeTravelOfflineFarm
  };
}
