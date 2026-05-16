import type { OfflineFarmPreset, SaveNormalization } from "../../../core";
import type { StartupSavePersistence, StartupSaveWriteReason } from "../types";

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
  activeStorageKey: string | null;
  legacyStorageKey: string;
  legacySavePresent: boolean;
  status: SaveStatus;
  saveVersion: number | null;
  migrationFromVersion: number | null;
  migrationToVersion: number | null;
  migrationMigrated: boolean;
  migrationNormalized: boolean;
  normalizations: SaveNormalization[];
  startupCommitStatus: StartupSavePersistence["commitStatus"] | null;
  startupWriteReasons: StartupSaveWriteReason[];
  saveSizeCharacters: number;
  createdAtMs: number | null;
  updatedAtMs: number | null;
  lastOfflineRewardAtMs: number | null;
  currentRouteId: string;
  selectedOfflineFarmRouteId: string | null;
  offlineFarmPreset: OfflineFarmPreset;
  highestClearedRouteIndex: number;
  autosaveIntervalMs: number;
  errors: string[];
};
