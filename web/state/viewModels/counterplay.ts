import {
  buildMedicineCounterplayViewModels,
  buildStageCounterplayPreview,
  defaultAutoMedicinePreferences,
  getMedicineAutoUseLabel,
  getPreBattleResistanceModeLabel,
  getStageById,
  isAutoMedicineUnlocked,
  isPreBattleResistanceMode,
  PRE_BATTLE_RESISTANCE_MODES
} from "../../../core";
import type { StaticGameData } from "../../../core";
import type { CounterplaySettingsView, WebGameState } from "../types";

function getEmptyMedicineInventory(): Record<string, number> {
  return {};
}

export function buildCounterplaySettingsView(
  data: StaticGameData,
  state: WebGameState,
  selectedStage: ReturnType<typeof getStageById> | null
): CounterplaySettingsView {
  const inventory = getEmptyMedicineInventory();
  const preferences = state.autoMedicinePreferences;
  const unlocked = isAutoMedicineUnlocked({
    medicines: data.medicines,
    inventory,
    progress: state.progress,
    stages: data.stages
  });
  const resistanceMode = isPreBattleResistanceMode(
    preferences.preBattleResistanceMode
  )
    ? preferences.preBattleResistanceMode
    : defaultAutoMedicinePreferences.preBattleResistanceMode;

  return {
    unlocked,
    lockedReason: unlocked
      ? null
      : "Unlocks when the first medicine becomes available.",
    globalEnabled: preferences.enabled,
    globalLabel: preferences.enabled ? "Auto On" : "Auto Off",
    medicineRows: buildMedicineCounterplayViewModels({
      data,
      progress: state.progress.maps,
      inventory,
      preferences
    }).map((medicine) => ({
      ...medicine,
      autoUseLabel: getMedicineAutoUseLabel(preferences, medicine.id),
      canToggle: unlocked
    })),
    resistanceMode,
    resistanceModeLabel: getPreBattleResistanceModeLabel(resistanceMode),
    resistanceModeOptions: PRE_BATTLE_RESISTANCE_MODES.map((mode) => ({
      id: mode,
      label: getPreBattleResistanceModeLabel(mode),
      isSelected: mode === resistanceMode
    })),
    stagePreview: selectedStage
      ? buildStageCounterplayPreview({
          data,
          stage: selectedStage,
          inventory,
          progress: state.progress,
          preferences
        })
      : null
  };
}
