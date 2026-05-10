import type { OfflineFarmPreset } from "../../../core";

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
