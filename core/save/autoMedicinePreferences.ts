import { defaultAutoMedicinePreferences, isPreBattleResistanceMode, type AutoMedicinePreferences } from "../combat";
import type { StaticGameData } from "../data";
import type { SaveNormalization } from "./saveTypes";
import { isRecord, validateRecord } from "./validationShared";

export type AutoMedicinePreferencesNormalizationResult = {
  value: AutoMedicinePreferences;
  normalizations: SaveNormalization[];
};

function missingField(field: string): SaveNormalization {
  return {
    field,
    reason: "defaulted missing field"
  };
}

function invalidField(field: string): SaveNormalization {
  return {
    field,
    reason: "defaulted invalid field"
  };
}

function normalizedField(field: string, reason: string): SaveNormalization {
  return {
    field,
    reason
  };
}

function normalizeBooleanPreference(
  value: Record<string, unknown>,
  key: keyof Pick<
    AutoMedicinePreferences,
    | "enabled"
    | "battleCleanseEnabled"
    | "postBattleCleanseEnabled"
    | "preBattleResistanceEnabled"
  >,
  normalizations: SaveNormalization[]
): boolean {
  const field = `autoMedicinePreferences.${key}`;

  if (value[key] === undefined) {
    normalizations.push(missingField(field));
    return defaultAutoMedicinePreferences[key];
  }

  if (typeof value[key] !== "boolean") {
    normalizations.push(invalidField(field));
    return defaultAutoMedicinePreferences[key];
  }

  return value[key];
}

export function normalizeAutoMedicinePreferencesWithChanges(
  value: unknown
): AutoMedicinePreferencesNormalizationResult {
  if (!isRecord(value)) {
    return {
      value: {
        ...defaultAutoMedicinePreferences,
        disabledMedicineIds: [
          ...defaultAutoMedicinePreferences.disabledMedicineIds
        ]
      },
      normalizations: [missingField("autoMedicinePreferences")]
    };
  }

  const normalizations: SaveNormalization[] = [];
  let preBattleResistanceMode =
    defaultAutoMedicinePreferences.preBattleResistanceMode;

  if (value.preBattleResistanceMode === undefined) {
    normalizations.push(
      missingField("autoMedicinePreferences.preBattleResistanceMode")
    );
  } else if (typeof value.preBattleResistanceMode !== "string") {
    normalizations.push(
      invalidField("autoMedicinePreferences.preBattleResistanceMode")
    );
  } else {
    preBattleResistanceMode = value.preBattleResistanceMode as AutoMedicinePreferences[
      "preBattleResistanceMode"
    ];
  }

  let disabledMedicineIds: string[];

  if (value.disabledMedicineIds === undefined) {
    normalizations.push(
      missingField("autoMedicinePreferences.disabledMedicineIds")
    );
    disabledMedicineIds = [
      ...defaultAutoMedicinePreferences.disabledMedicineIds
    ];
  } else if (!Array.isArray(value.disabledMedicineIds)) {
    normalizations.push(
      invalidField("autoMedicinePreferences.disabledMedicineIds")
    );
    disabledMedicineIds = [
      ...defaultAutoMedicinePreferences.disabledMedicineIds
    ];
  } else {
    const stringMedicineIds = value.disabledMedicineIds.filter(
      (medicineId): medicineId is string => typeof medicineId === "string"
    );

    if (stringMedicineIds.length !== value.disabledMedicineIds.length) {
      normalizations.push(
        normalizedField(
          "autoMedicinePreferences.disabledMedicineIds",
          "removed non-string entries"
        )
      );
    }

    disabledMedicineIds = [...new Set(stringMedicineIds)];

    if (disabledMedicineIds.length !== stringMedicineIds.length) {
      normalizations.push(
        normalizedField(
          "autoMedicinePreferences.disabledMedicineIds",
          "deduplicated entries"
        )
      );
    }
  }

  return {
    value: {
      enabled: normalizeBooleanPreference(value, "enabled", normalizations),
      battleCleanseEnabled: normalizeBooleanPreference(
        value,
        "battleCleanseEnabled",
        normalizations
      ),
      postBattleCleanseEnabled: normalizeBooleanPreference(
        value,
        "postBattleCleanseEnabled",
        normalizations
      ),
      preBattleResistanceEnabled: normalizeBooleanPreference(
        value,
        "preBattleResistanceEnabled",
        normalizations
      ),
      preBattleResistanceMode,
      disabledMedicineIds
    },
    normalizations
  };
}

export function normalizeAutoMedicinePreferences(
  value: unknown
): AutoMedicinePreferences {
  return normalizeAutoMedicinePreferencesWithChanges(value).value;
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
