import {
  defaultAutoMedicinePreferences,
  type AutoMedicinePreferences
} from "../combat";
import type { StaticGameData } from "../data";
import { calculateOfflineRewards } from "../offline";
import { getStageById, isStageFarmable } from "../progression";

export const SAVE_DATA_VERSION = 3 as const;
export const MIN_SUPPORTED_SAVE_DATA_VERSION = 1 as const;

export type SavedMapProgress = {
  highestClearedStageIndex: number;
  combatExperience: number;
};

export type SavedResources = {
  silver: number;
  cultivation: number;
};

export type PlayerSaveProgress = {
  resources: SavedResources;
  maps: Record<string, SavedMapProgress>;
  medicineInventory: Record<string, number>;
};

export type SaveData = {
  version: typeof SAVE_DATA_VERSION;
  progress: PlayerSaveProgress;
  autoMedicinePreferences: AutoMedicinePreferences;
  selectedOfflineFarmStageId: string | null;
  createdAtMs: number;
  updatedAtMs: number;
  lastOfflineRewardAtMs: number;
};

export type SaveMigrationResult =
  | {
      ok: true;
      save: SaveData;
      fromVersion: number;
      migrated: boolean;
    }
  | {
      ok: false;
      errors: string[];
    };

export type ParseSaveDataResult =
  | {
      ok: true;
      save: SaveData;
      migrated: boolean;
    }
  | {
      ok: false;
      reason: "invalid_save";
      errors: string[];
    };

export type OfflineSaveRewardSummary = {
  stageId: string;
  offlineSeconds: number;
  clears: number;
  silver: number;
  cultivation: number;
  combatExperience: number;
};

export type ApplyOfflineRewardsResult =
  | {
      ok: true;
      save: SaveData;
      summary: OfflineSaveRewardSummary;
    }
  | {
      ok: false;
      reason: "invalid_save" | "invalid_farm_target";
      errors: string[];
    };

type UnknownRecord = Record<string, unknown>;

export function createInitialSaveData(
  data: Pick<StaticGameData, "regions">,
  nowMs: number
): SaveData {
  return {
    version: SAVE_DATA_VERSION,
    progress: {
      resources: {
        silver: 0,
        cultivation: 0
      },
      maps: createDefaultMapProgress(data),
      medicineInventory: {}
    },
    autoMedicinePreferences: { ...defaultAutoMedicinePreferences },
    selectedOfflineFarmStageId: null,
    createdAtMs: nowMs,
    updatedAtMs: nowMs,
    lastOfflineRewardAtMs: nowMs
  };
}

export function migrateSaveData(
  data: Pick<StaticGameData, "regions">,
  value: unknown
): SaveMigrationResult {
  if (!isRecord(value)) {
    return {
      ok: false,
      errors: ["save must be an object"]
    };
  }

  if (
    typeof value.version !== "number" ||
    value.version < MIN_SUPPORTED_SAVE_DATA_VERSION ||
    value.version > SAVE_DATA_VERSION
  ) {
    return {
      ok: false,
      errors: [
        `version must be between ${MIN_SUPPORTED_SAVE_DATA_VERSION} and ${SAVE_DATA_VERSION}`
      ]
    };
  }

  if (!isRecord(value.progress)) {
    return {
      ok: false,
      errors: ["progress must be an object"]
    };
  }

  const fromVersion = value.version;
  const progress = value.progress;
  const migrated: SaveData = {
    version: SAVE_DATA_VERSION,
    progress: {
      resources: normalizeResources(progress.resources),
      maps: normalizeMapProgress(data, progress.maps),
      medicineInventory: normalizeMedicineInventory(progress.medicineInventory)
    },
    autoMedicinePreferences: normalizeAutoMedicinePreferences(
      value.autoMedicinePreferences
    ),
    selectedOfflineFarmStageId:
      typeof value.selectedOfflineFarmStageId === "string" ||
      value.selectedOfflineFarmStageId === null
        ? value.selectedOfflineFarmStageId
        : null,
    createdAtMs: typeof value.createdAtMs === "number" ? value.createdAtMs : 0,
    updatedAtMs: typeof value.updatedAtMs === "number" ? value.updatedAtMs : 0,
    lastOfflineRewardAtMs:
      typeof value.lastOfflineRewardAtMs === "number"
        ? value.lastOfflineRewardAtMs
        : typeof value.updatedAtMs === "number"
          ? value.updatedAtMs
          : 0
  };

  return {
    ok: true,
    save: migrated,
    fromVersion,
    migrated: fromVersion !== SAVE_DATA_VERSION
  };
}

export function validateSaveData(
  data: Pick<StaticGameData, "regions" | "stages" | "medicines">,
  value: unknown
): string[] {
  const migration = migrateSaveData(data, value);

  if (!migration.ok) {
    return migration.errors;
  }

  const save = migration.save;
  const errors: string[] = [];

  validateTimestamps(save, errors);
  validateResources(save.progress.resources, errors);
  validateMapProgress(data, save.progress.maps, errors);
  validateMedicineInventory(data, save.progress.medicineInventory, errors);
  validateAutoMedicinePreferences(data, save.autoMedicinePreferences, errors);

  if (save.selectedOfflineFarmStageId !== null) {
    errors.push(
      ...validateOfflineFarmTarget(
        data,
        save.progress.maps,
        save.selectedOfflineFarmStageId
      )
    );
  }

  return errors;
}

export function parseSaveData(
  data: Pick<StaticGameData, "regions" | "stages" | "medicines">,
  value: unknown
): ParseSaveDataResult {
  const migration = migrateSaveData(data, value);

  if (!migration.ok) {
    return {
      ok: false,
      reason: "invalid_save",
      errors: migration.errors
    };
  }

  const errors = validateSaveData(data, migration.save);

  if (errors.length > 0) {
    return {
      ok: false,
      reason: "invalid_save",
      errors
    };
  }

  return {
    ok: true,
    save: migration.save,
    migrated: migration.migrated
  };
}

export function diagnoseSaveData(
  data: Pick<StaticGameData, "regions" | "stages" | "medicines">,
  value: unknown
): string[] {
  return validateSaveData(data, value);
}

export function validateOfflineFarmTarget(
  data: Pick<StaticGameData, "stages">,
  maps: PlayerSaveProgress["maps"],
  stageId: string
): string[] {
  const errors: string[] = [];

  if (!isStageFarmable(data, maps, stageId)) {
    errors.push(
      `selectedOfflineFarmStageId ${stageId} must be cleared, non-boss, and farmable`
    );
  }

  return errors;
}

export function applyOfflineRewardsToSave(
  data: Pick<StaticGameData, "regions" | "stages" | "medicines">,
  value: unknown,
  nowMs: number,
  options: {
    estimatedClearTimeSeconds: number;
    minimumClearTimeSeconds: number;
    offlineCapSeconds: number;
    offlineEfficiency: number;
  }
): ApplyOfflineRewardsResult {
  const parseResult = parseSaveData(data, value);

  if (!parseResult.ok) {
    return {
      ok: false,
      reason: "invalid_save",
      errors: parseResult.errors
    };
  }

  const save = parseResult.save;

  if (save.selectedOfflineFarmStageId === null) {
    return {
      ok: false,
      reason: "invalid_farm_target",
      errors: ["selectedOfflineFarmStageId must be set"]
    };
  }

  const farmTargetErrors = validateOfflineFarmTarget(
    data,
    save.progress.maps,
    save.selectedOfflineFarmStageId
  );

  if (farmTargetErrors.length > 0) {
    return {
      ok: false,
      reason: "invalid_farm_target",
      errors: farmTargetErrors
    };
  }

  const stage = getStageById(data, save.selectedOfflineFarmStageId);

  if (stage === null) {
    return {
      ok: false,
      reason: "invalid_farm_target",
      errors: [`Missing stage ${save.selectedOfflineFarmStageId}`]
    };
  }

  const rewards = calculateOfflineRewards({
    lastSavedAtMs: save.lastOfflineRewardAtMs,
    currentTimeMs: nowMs,
    offlineCapSeconds: options.offlineCapSeconds,
    estimatedClearTimeSeconds: options.estimatedClearTimeSeconds,
    minimumClearTimeSeconds: options.minimumClearTimeSeconds,
    offlineEfficiency: options.offlineEfficiency,
    silverPerClear: stage.rewards.silver,
    cultivationPerClear: stage.rewards.cultivation,
    herbsPerClear: stage.rewards.herbs ?? 0,
    combatExperiencePerClear: stage.rewards.combatExperience
  });
  const nextSave: SaveData = {
    ...save,
    progress: {
      ...save.progress,
      resources: {
        silver: save.progress.resources.silver + rewards.silver,
        cultivation: save.progress.resources.cultivation + rewards.cultivation
      },
      maps: {
        ...save.progress.maps,
        [stage.regionId]: {
          ...save.progress.maps[stage.regionId],
          combatExperience:
            save.progress.maps[stage.regionId].combatExperience +
            rewards.combatExperience
        }
      }
    },
    updatedAtMs: nowMs,
    lastOfflineRewardAtMs: nowMs
  };

  return {
    ok: true,
    save: nextSave,
    summary: {
      stageId: stage.id,
      offlineSeconds: rewards.offlineSeconds,
      clears: rewards.clears,
      silver: rewards.silver,
      cultivation: rewards.cultivation,
      combatExperience: rewards.combatExperience
    }
  };
}

function createDefaultMapProgress(
  data: Pick<StaticGameData, "regions">
): PlayerSaveProgress["maps"] {
  return Object.fromEntries(
    data.regions.map((region) => [
      region.id,
      {
        highestClearedStageIndex: 0,
        combatExperience: 0
      }
    ])
  );
}

function normalizeMapProgress(
  data: Pick<StaticGameData, "regions">,
  value: unknown
): PlayerSaveProgress["maps"] {
  const defaults = createDefaultMapProgress(data);

  if (!isRecord(value)) {
    return defaults;
  }

  return {
    ...defaults,
    ...Object.fromEntries(
      Object.entries(value).map(([regionId, progress]) => [
        regionId,
        normalizeSingleMapProgress(progress)
      ])
    )
  };
}

function normalizeResources(value: unknown): SavedResources {
  if (!isRecord(value)) {
    return {
      silver: 0,
      cultivation: 0
    };
  }

  return {
    silver: typeof value.silver === "number" ? value.silver : 0,
    cultivation:
      typeof value.cultivation === "number" ? value.cultivation : 0
  };
}

function normalizeSingleMapProgress(value: unknown): SavedMapProgress {
  if (!isRecord(value)) {
    return {
      highestClearedStageIndex: 0,
      combatExperience: 0
    };
  }

  return {
    highestClearedStageIndex:
      typeof value.highestClearedStageIndex === "number"
        ? value.highestClearedStageIndex
        : 0,
    combatExperience:
      typeof value.combatExperience === "number" ? value.combatExperience : 0
  };
}

function normalizeMedicineInventory(value: unknown): Record<string, number> {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(([, count]) => typeof count === "number")
  ) as Record<string, number>;
}

function normalizeAutoMedicinePreferences(
  value: unknown
): AutoMedicinePreferences {
  if (!isRecord(value)) {
    return { ...defaultAutoMedicinePreferences };
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

function validateTimestamps(save: SaveData, errors: string[]): void {
  validateNonNegativeFinite(save.createdAtMs, "createdAtMs", errors);
  validateNonNegativeFinite(save.updatedAtMs, "updatedAtMs", errors);
  validateNonNegativeFinite(
    save.lastOfflineRewardAtMs,
    "lastOfflineRewardAtMs",
    errors
  );

  if (save.updatedAtMs < save.createdAtMs) {
    errors.push("updatedAtMs must be greater than or equal to createdAtMs");
  }

  if (save.lastOfflineRewardAtMs < save.createdAtMs) {
    errors.push(
      "lastOfflineRewardAtMs must be greater than or equal to createdAtMs"
    );
  }
}

function validateResources(resources: SavedResources, errors: string[]): void {
  validateNonNegativeFinite(
    resources.silver,
    "progress.resources.silver",
    errors
  );
  validateNonNegativeFinite(
    resources.cultivation,
    "progress.resources.cultivation",
    errors
  );
}

function validateMapProgress(
  data: Pick<StaticGameData, "regions">,
  maps: PlayerSaveProgress["maps"],
  errors: string[]
): void {
  const regionsById = new Map(data.regions.map((region) => [region.id, region]));

  for (const mapId of Object.keys(maps)) {
    if (!regionsById.has(mapId)) {
      errors.push(`progress.maps.${mapId} must reference an existing region`);
    }
  }

  for (const region of data.regions) {
    const progress = maps[region.id];

    if (progress === undefined) {
      errors.push(`progress.maps.${region.id} is required`);
      continue;
    }

    validateIntegerRange(
      progress.highestClearedStageIndex,
      `progress.maps.${region.id}.highestClearedStageIndex`,
      0,
      region.stageIds.length,
      errors
    );
    validateNonNegativeFinite(
      progress.combatExperience,
      `progress.maps.${region.id}.combatExperience`,
      errors
    );
  }
}

function validateAutoMedicinePreferences(
  data: Pick<StaticGameData, "medicines">,
  preferences: AutoMedicinePreferences,
  errors: string[]
): void {
  const medicineIds = new Set(data.medicines.map((medicine) => medicine.id));

  for (const [index, medicineId] of preferences.disabledMedicineIds.entries()) {
    if (!medicineIds.has(medicineId)) {
      errors.push(
        `autoMedicinePreferences.disabledMedicineIds.${index} must reference an existing medicine`
      );
    }
  }
}

function validateMedicineInventory(
  data: Pick<StaticGameData, "medicines">,
  inventory: Record<string, number>,
  errors: string[]
): void {
  const medicinesById = new Map(
    data.medicines.map((medicine) => [medicine.id, medicine])
  );

  for (const [medicineId, count] of Object.entries(inventory)) {
    const medicine = medicinesById.get(medicineId);

    if (medicine === undefined) {
      errors.push(
        `progress.medicineInventory.${medicineId} must reference an existing medicine`
      );
      continue;
    }

    validateIntegerRange(
      count,
      `progress.medicineInventory.${medicineId}`,
      0,
      medicine.maxCarry,
      errors
    );
  }
}

function validateNonNegativeFinite(
  value: unknown,
  path: string,
  errors: string[]
): value is number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    errors.push(`${path} must be a non-negative finite number`);
    return false;
  }

  return true;
}

function validateIntegerRange(
  value: unknown,
  path: string,
  min: number,
  max: number,
  errors: string[]
): value is number {
  if (!validateNonNegativeFinite(value, path, errors)) {
    return false;
  }

  if (!Number.isInteger(value) || value < min || value > max) {
    errors.push(`${path} must be an integer between ${min} and ${max}`);
    return false;
  }

  return true;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
