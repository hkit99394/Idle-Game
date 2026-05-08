import { defaultAutoMedicinePreferences, isPreBattleResistanceMode, type AutoMedicinePreferences } from "../combat";
import type { StaticGameData } from "../data";
import { isRecord, validateRecord } from "./validationShared";

export function normalizeAutoMedicinePreferences(
  value: unknown
): AutoMedicinePreferences {
  if (!isRecord(value)) {
    return {
      ...defaultAutoMedicinePreferences,
      disabledMedicineIds: [...defaultAutoMedicinePreferences.disabledMedicineIds]
    };
  }

  return {
    enabled:
      typeof value.enabled === "boolean"
        ? value.enabled
        : defaultAutoMedicinePreferences.enabled,
    battleCleanseEnabled:
      typeof value.battleCleanseEnabled === "boolean"
        ? value.battleCleanseEnabled
        : defaultAutoMedicinePreferences.battleCleanseEnabled,
    postBattleCleanseEnabled:
      typeof value.postBattleCleanseEnabled === "boolean"
        ? value.postBattleCleanseEnabled
        : defaultAutoMedicinePreferences.postBattleCleanseEnabled,
    preBattleResistanceEnabled:
      typeof value.preBattleResistanceEnabled === "boolean"
        ? value.preBattleResistanceEnabled
        : defaultAutoMedicinePreferences.preBattleResistanceEnabled,
    preBattleResistanceMode:
      typeof value.preBattleResistanceMode === "string"
        ? (value.preBattleResistanceMode as AutoMedicinePreferences[
            "preBattleResistanceMode"
          ])
        : defaultAutoMedicinePreferences.preBattleResistanceMode,
    disabledMedicineIds: Array.isArray(value.disabledMedicineIds)
      ? [
          ...new Set(
            value.disabledMedicineIds.filter(
              (medicineId): medicineId is string =>
                typeof medicineId === "string"
            )
          )
        ]
      : []
  };
}

export function validateAutoMedicinePreferences(
  data: Pick<StaticGameData, "medicines">,
  value: unknown,
  errors: string[]
): value is AutoMedicinePreferences {
  if (!validateRecord(value, "autoMedicinePreferences", errors)) {
    return false;
  }

  for (const key of [
    "enabled",
    "battleCleanseEnabled",
    "postBattleCleanseEnabled",
    "preBattleResistanceEnabled"
  ] as const) {
    if (typeof value[key] !== "boolean") {
      errors.push(`autoMedicinePreferences.${key} must be a boolean`);
    }
  }

  if (!isPreBattleResistanceMode(value.preBattleResistanceMode)) {
    errors.push(
      "autoMedicinePreferences.preBattleResistanceMode must be a supported mode"
    );
  }

  if (!Array.isArray(value.disabledMedicineIds)) {
    errors.push("autoMedicinePreferences.disabledMedicineIds must be an array");
    return false;
  }

  const medicineIds = new Set(data.medicines.map((medicine) => medicine.id));

  for (const [index, medicineId] of value.disabledMedicineIds.entries()) {
    if (typeof medicineId !== "string") {
      errors.push(
        `autoMedicinePreferences.disabledMedicineIds.${index} must be a medicine id`
      );
      continue;
    }

    if (!medicineIds.has(medicineId)) {
      errors.push(
        `autoMedicinePreferences.disabledMedicineIds.${index} must reference an existing medicine`
      );
    }
  }

  return true;
}
