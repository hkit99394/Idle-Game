import {
  AUTO_MEDICINE_OFF_LABEL,
  AUTO_MEDICINE_ON_LABEL,
  defaultAutoMedicinePreferences,
  DEFAULT_PRE_BATTLE_RESISTANCE_MODE,
  PRE_BATTLE_RESISTANCE_MODE_LABELS,
  PRE_BATTLE_RESISTANCE_MODES
} from "./types";
import type {
  AutoMedicinePreferences,
  AutoMedicineToggleLabel,
  AutoMedicineTrigger,
  PreBattleResistanceMode
} from "./types";

export function isMedicineAutoUseEnabled(
  preferences: AutoMedicinePreferences | undefined,
  medicineId: string
): boolean {
  const resolved = preferences ?? defaultAutoMedicinePreferences;

  return (
    resolved.enabled &&
    !resolved.disabledMedicineIds.includes(medicineId)
  );
}

export function getMedicineAutoUseLabel(
  preferences: AutoMedicinePreferences | undefined,
  medicineId: string
): AutoMedicineToggleLabel {
  return isMedicineAutoUseEnabled(preferences, medicineId)
    ? AUTO_MEDICINE_ON_LABEL
    : AUTO_MEDICINE_OFF_LABEL;
}

export function setMedicineAutoUsePreference(
  preferences: AutoMedicinePreferences | undefined,
  medicineId: string,
  enabled: boolean
): AutoMedicinePreferences {
  const resolved = preferences ?? defaultAutoMedicinePreferences;
  const disabledMedicineIds = new Set(resolved.disabledMedicineIds);

  if (enabled) {
    disabledMedicineIds.delete(medicineId);
  } else {
    disabledMedicineIds.add(medicineId);
  }

  return {
    ...resolved,
    disabledMedicineIds: [...disabledMedicineIds].sort()
  };
}

export function isPreBattleResistanceMode(
  value: unknown
): value is PreBattleResistanceMode {
  return PRE_BATTLE_RESISTANCE_MODES.includes(
    value as PreBattleResistanceMode
  );
}

export function getPreBattleResistanceModeLabel(
  mode: PreBattleResistanceMode
): string {
  return PRE_BATTLE_RESISTANCE_MODE_LABELS[mode];
}

export function isAutoMedicineTriggerEnabled(
  preferences: AutoMedicinePreferences | undefined,
  trigger: AutoMedicineTrigger
): boolean {
  const resolved = preferences ?? defaultAutoMedicinePreferences;

  if (!resolved.enabled) {
    return false;
  }

  if (trigger === "battle_cleanse") {
    return resolved.battleCleanseEnabled;
  }

  if (trigger === "post_battle_cleanse") {
    return resolved.postBattleCleanseEnabled;
  }

  return resolved.preBattleResistanceEnabled;
}
