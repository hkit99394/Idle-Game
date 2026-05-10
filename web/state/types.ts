import type {
  AutoMedicinePreferences,
  EquipHeroEquipmentInput,
  EquipHeroEquipmentResult,
  OfflineFarmPreset,
  PlayerProgress,
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
  SetAssignmentHeroesResult
} from "../../core";
import type { OfflineRewardSummary } from "./offlineRewardSummary";

export type { OfflineRewardSummary } from "./offlineRewardSummary";

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
