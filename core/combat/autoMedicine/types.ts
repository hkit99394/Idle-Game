import type {
  EnemyDefinition,
  MedicineDefinition,
  SkillDefinition,
  StageDefinition,
  StaticGameData
} from "../../data";
import type { PlayerProgress, RegionProgress } from "../../progression";
import type { MedicineInventory } from "../medicine";
import type {
  ActiveStatusEffect,
  StatusDispelTag,
  StatusEffectDefinition
} from "../types";

export type AutoMedicineTrigger =
  | "battle_cleanse"
  | "post_battle_cleanse"
  | "pre_battle_resistance";

export type AutoMedicineSkippedReason =
  | "automation_locked"
  | "no_active_statuses"
  | "no_owned_match"
  | "no_status_pressure"
  | "policy_disabled"
  | "stage_below_policy_threshold";

export type AutoMedicineUseSummary = {
  trigger: AutoMedicineTrigger;
  medicineId: string;
  cleansedStatusIds: string[];
  statusResistanceBonus: number;
  statusResistanceDurationSeconds: number;
};

export type AutoMedicineResult = {
  inventory: MedicineInventory;
  statuses: ActiveStatusEffect[];
  usedMedicine: AutoMedicineUseSummary | null;
  skippedReason: AutoMedicineSkippedReason | null;
};

export type AutoMedicinePreferences = {
  enabled: boolean;
  battleCleanseEnabled: boolean;
  postBattleCleanseEnabled: boolean;
  preBattleResistanceEnabled: boolean;
  preBattleResistanceMode: PreBattleResistanceMode;
  disabledMedicineIds: string[];
};

export type PreBattleResistanceMode =
  | "off"
  | "boss_and_elite"
  | "status_heavy"
  | "always_when_recommended";

export const PRE_BATTLE_RESISTANCE_MODES: PreBattleResistanceMode[] = [
  "off",
  "boss_and_elite",
  "status_heavy",
  "always_when_recommended"
];

export const DEFAULT_PRE_BATTLE_RESISTANCE_MODE: PreBattleResistanceMode =
  "boss_and_elite";

export const PRE_BATTLE_RESISTANCE_MODE_LABELS: Record<
  PreBattleResistanceMode,
  string
> = {
  off: "Off",
  boss_and_elite: "Boss And Elite",
  status_heavy: "Status Heavy",
  always_when_recommended: "Always When Recommended"
};

export const STATUS_HEAVY_STATUS_SKILL_COUNT_THRESHOLD = 2;
export const STATUS_HEAVY_STATUS_CATEGORY_COUNT_THRESHOLD = 2;

export const defaultAutoMedicinePreferences: AutoMedicinePreferences = {
  enabled: true,
  battleCleanseEnabled: true,
  postBattleCleanseEnabled: true,
  preBattleResistanceEnabled: true,
  preBattleResistanceMode: DEFAULT_PRE_BATTLE_RESISTANCE_MODE,
  disabledMedicineIds: []
};

export const AUTO_MEDICINE_ON_LABEL = "Auto On" as const;
export const AUTO_MEDICINE_OFF_LABEL = "Auto Off" as const;

export type AutoMedicineToggleLabel =
  | typeof AUTO_MEDICINE_ON_LABEL
  | typeof AUTO_MEDICINE_OFF_LABEL;

export type AutoMedicineUnlockInput = {
  medicines: MedicineDefinition[];
  inventory: MedicineInventory;
  progress?: PlayerProgress | RegionProgress;
  stages?: StaticGameData["stages"];
  automationUnlocked?: boolean;
};

export type AutoMedicineCleanseInput = AutoMedicineUnlockInput & {
  activeStatuses: ActiveStatusEffect[];
  statusDefinitions: Record<string, StatusEffectDefinition>;
  trigger: Extract<AutoMedicineTrigger, "battle_cleanse" | "post_battle_cleanse">;
  alreadyUsedMedicineIds?: string[];
  preferences?: AutoMedicinePreferences;
};

export type AutoMedicinePreBattleResistanceInput = AutoMedicineUnlockInput & {
  stage: StageDefinition;
  enemies: EnemyDefinition[];
  skills: SkillDefinition[];
  statusDefinitions: Record<string, StatusEffectDefinition>;
  alreadyUsedMedicineIds?: string[];
  preferences?: AutoMedicinePreferences;
};

export type CleanseCandidate = {
  medicine: MedicineDefinition;
  matchingStatusCount: number;
  cleanseBreadth: number;
  maxCleanseCount: number;
};

export type ResistanceCandidate = {
  medicine: MedicineDefinition;
  resistanceBonus: number;
  durationSeconds: number;
};

export type StageStatusPressureProfile = {
  statusIds: string[];
  statusSkillCount: number;
  statusCategoryCount: number;
  isBossOrEliteStage: boolean;
  isStatusHeavy: boolean;
};

export type PreBattleResistancePolicyDecision = {
  allowed: boolean;
  skippedReason: Extract<
    AutoMedicineSkippedReason,
    "no_status_pressure" | "policy_disabled" | "stage_below_policy_threshold"
  > | null;
  mode: PreBattleResistanceMode;
  profile: StageStatusPressureProfile;
};
