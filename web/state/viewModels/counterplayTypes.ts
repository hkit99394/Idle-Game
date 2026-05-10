import type {
  MedicineCounterplayViewModel,
  PreBattleResistanceMode,
  StageCounterplayPreview
} from "../../../core";

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
