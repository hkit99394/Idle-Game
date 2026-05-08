import type { StaticGameData } from "../data";
import type { AutoMedicinePreferences } from "../combat";
import type {
  ApplyOfflineAssignmentRewardsResult,
  ApplyOfflineRewardsResult
} from "../offline";
import type {
  OfflineFarmPreset,
  PlayerProgress
} from "../progression";

export const SAVE_DATA_VERSION = 9 as const;
export const MIN_SUPPORTED_SAVE_DATA_VERSION = 1 as const;
export const SUPPORTED_SAVE_DATA_VERSIONS = [
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  SAVE_DATA_VERSION
] as const;
export type SupportedSaveDataVersion =
  (typeof SUPPORTED_SAVE_DATA_VERSIONS)[number];

export type SaveData = {
  version: typeof SAVE_DATA_VERSION;
  progress: PlayerProgress;
  autoMedicinePreferences: AutoMedicinePreferences;
  selectedOfflineFarmStageId: string | null;
  offlineFarmPreset: OfflineFarmPreset;
  createdAtMs: number;
  updatedAtMs: number;
  lastOfflineRewardAtMs: number;
};

export type CreateSaveDataInput = {
  progress: PlayerProgress;
  selectedOfflineFarmStageId: string | null;
  offlineFarmPreset?: OfflineFarmPreset;
  nowMs: number;
  lastOfflineRewardAtMs?: number;
  autoMedicinePreferences?: AutoMedicinePreferences;
  previousSave?: Pick<SaveData, "createdAtMs" | "lastOfflineRewardAtMs"> &
    Partial<Pick<SaveData, "offlineFarmPreset" | "autoMedicinePreferences">> | null;
};

export type ParseSaveDataResult =
  | {
      ok: true;
      save: SaveData;
    }
  | {
      ok: false;
      reason: "invalid_save";
      errors: string[];
    };

export type SaveLoadTransactionSuccess = {
  ok: true;
  save: SaveData;
  previousSave: SaveData;
  changed: boolean;
  offlineRewards: ApplyOfflineRewardsResult | null;
  offlineAssignmentRewards: ApplyOfflineAssignmentRewardsResult | null;
};

export type LoadSaveTransactionResult =
  | SaveLoadTransactionSuccess
  | Extract<ParseSaveDataResult, { ok: false }>;

export type SaveMigrationResult =
  | {
      ok: true;
      save: unknown;
      fromVersion: SupportedSaveDataVersion;
      toVersion: typeof SAVE_DATA_VERSION;
      migrated: boolean;
    }
  | {
      ok: false;
      errors: string[];
    };

export type UnknownRecord = Record<string, unknown>;
export type SaveMigrationData = Pick<StaticGameData, "heroes" | "regions" | "stages">;
export type SaveValidationData = Pick<
  StaticGameData,
  | "heroes"
  | "regions"
  | "stages"
  | "styles"
  | "skillUpgrades"
  | "equipment"
  | "assignments"
  | "medicines"
>;
export type SaveLoadTransactionData = SaveValidationData &
  Pick<StaticGameData, "mastery">;
