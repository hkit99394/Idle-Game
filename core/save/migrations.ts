import {
  getContentAliasIndexByKind,
  getLegacyRegionId,
  normalizeRegionId,
  normalizeRegionMapKeys,
  normalizeStageId,
  type ContentIdAliasKind
} from "../compatibility";
import {
  createInitialPlayerProgress,
  DEFAULT_OFFLINE_FARM_PRESET,
  normalizeSelectedTacticId
} from "../progression";
import type {
  EquipmentProgress,
  HeroProgress,
  MapProgress,
  ResourceState
} from "../progression";
import {
  MIN_SUPPORTED_SAVE_DATA_VERSION,
  SAVE_DATA_VERSION,
  type SaveMigrationData,
  type SaveMigrationResult,
  type SaveNormalization
} from "./saveTypes";
import { normalizeAutoMedicinePreferencesWithChanges } from "./autoMedicinePreferences";
import { normalizeSaveFieldAliasesForRuntime } from "./saveFieldAliases";
import { isRecord, isSupportedSaveDataVersion } from "./validationShared";

type NormalizationResult<T> = {
  value: T;
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

function migratedRegionId(field: string): SaveNormalization {
  return {
    field,
    reason: "migrated legacy region id"
  };
}

function migratedStageId(field: string): SaveNormalization {
  return {
    field,
    reason: "migrated legacy stage id"
  };
}

function normalizedContentId(field: string): SaveNormalization {
  return {
    field,
    reason: "normalized content id alias"
  };
}

function getConfiguredContentIds(
  data: SaveMigrationData,
  kind: ContentIdAliasKind
): ReadonlySet<string> {
  switch (kind) {
    case "initiate":
      return new Set(data.heroes.map((hero) => hero.id));

    case "style":
      return new Set(data.styles.map((style) => style.id));

    case "style_branch":
      return new Set(
        data.styles.flatMap((style) => style.branches.map((branch) => branch.id))
      );

    case "skill_upgrade":
      return new Set(data.skillUpgrades.map((upgrade) => upgrade.id));

    case "augment":
      return new Set(data.equipment.map((equipment) => equipment.id));

    case "countermeasure":
      return new Set(data.medicines.map((medicine) => medicine.id));

    case "operation":
      return new Set((data.assignments ?? []).map((assignment) => assignment.id));

    case "routine":
      return new Set(data.tactics.map((tactic) => tactic.id));

    default:
      return new Set();
  }
}

function normalizeContentIdForConfiguredData(
  data: SaveMigrationData,
  kind: ContentIdAliasKind,
  id: string
): string {
  const configuredIds = getConfiguredContentIds(data, kind);

  if (configuredIds.has(id)) {
    return id;
  }

  const index = getContentAliasIndexByKind(kind);
  const legacyAlias = index.getByLegacyId(id);

  if (legacyAlias && configuredIds.has(legacyAlias.targetId)) {
    return legacyAlias.targetId;
  }

  const targetAlias = index.getByTargetId(id);

  if (targetAlias && configuredIds.has(targetAlias.legacyId)) {
    return targetAlias.legacyId;
  }

  return id;
}

function normalizeContentIdValueForMigration(
  data: SaveMigrationData,
  kind: ContentIdAliasKind,
  value: unknown,
  field: string,
  normalizations: SaveNormalization[]
): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const normalized = normalizeContentIdForConfiguredData(data, kind, value);

  if (normalized !== value) {
    normalizations.push(normalizedContentId(field));
  }

  return normalized;
}

function normalizeContentIdArrayForMigration(
  data: SaveMigrationData,
  kind: ContentIdAliasKind,
  value: unknown,
  field: string,
  normalizations: SaveNormalization[]
): unknown {
  if (!Array.isArray(value)) {
    return value;
  }

  const normalizedEntries = value.map((entry, index) =>
    normalizeContentIdValueForMigration(
      data,
      kind,
      entry,
      `${field}.${index}`,
      normalizations
    )
  );
  const seenStringEntries = new Map<string, number>();
  const dedupedEntries: unknown[] = [];

  for (const [index, entry] of normalizedEntries.entries()) {
    if (typeof entry !== "string") {
      dedupedEntries.push(entry);
      continue;
    }

    const existingIndex = seenStringEntries.get(entry);

    if (existingIndex !== undefined && value[existingIndex] !== value[index]) {
      continue;
    }

    seenStringEntries.set(entry, index);
    dedupedEntries.push(entry);
  }

  return dedupedEntries;
}

function normalizeContentIdMapKeysForMigration(
  data: SaveMigrationData,
  kind: ContentIdAliasKind,
  value: Record<string, unknown>,
  field: string,
  normalizations: SaveNormalization[]
): Record<string, unknown> {
  const normalizedMap: Record<string, unknown> = {};
  const deferredAliasEntries: Array<readonly [string, string, unknown]> = [];

  for (const [contentId, contentValue] of Object.entries(value)) {
    const normalizedId = normalizeContentIdForConfiguredData(data, kind, contentId);

    if (normalizedId !== contentId) {
      normalizations.push(normalizedContentId(`${field}.${contentId}`));
      deferredAliasEntries.push([contentId, normalizedId, contentValue]);
      continue;
    }

    normalizedMap[contentId] = contentValue;
  }

  for (const [, normalizedId, contentValue] of deferredAliasEntries) {
    if (!Object.hasOwn(normalizedMap, normalizedId)) {
      normalizedMap[normalizedId] = contentValue;
    }
  }

  return normalizedMap;
}

export function normalizeHeroProgressForMigration(
  value: unknown,
  path = "progress.heroes.*"
): NormalizationResult<HeroProgress | unknown> {
  if (!isRecord(value)) {
    return {
      value,
      normalizations: []
    };
  }

  const normalizations: SaveNormalization[] = [];

  if (value.level === undefined) {
    normalizations.push(missingField(`${path}.level`));
  }

  if (value.upgrades === undefined) {
    normalizations.push(missingField(`${path}.upgrades`));
  }

  return {
    value: {
      ...value,
      level: value.level === undefined ? 1 : value.level,
      upgrades: value.upgrades === undefined ? {} : value.upgrades
    },
    normalizations
  };
}

export function normalizeMapProgressForMigration(
  value: unknown,
  path = "progress.maps.*"
): NormalizationResult<MapProgress | unknown> {
  if (!isRecord(value)) {
    return {
      value,
      normalizations: []
    };
  }

  const normalizations: SaveNormalization[] = [];

  if (value.combatExperience === undefined) {
    normalizations.push(missingField(`${path}.combatExperience`));
  }

  if (value.highestClearedStageIndex === undefined) {
    normalizations.push(missingField(`${path}.highestClearedStageIndex`));
  }

  return {
    value: {
      ...value,
      combatExperience:
        value.combatExperience === undefined ? 0 : value.combatExperience,
      highestClearedStageIndex:
        value.highestClearedStageIndex === undefined
          ? 0
          : value.highestClearedStageIndex
    },
    normalizations
  };
}

export function normalizeResourcesForMigration(
  value: unknown,
  path = "progress.resources"
): NormalizationResult<ResourceState | unknown> {
  if (!isRecord(value)) {
    return {
      value,
      normalizations: []
    };
  }

  const normalizations =
    value.herbs === undefined ? [missingField(`${path}.herbs`)] : [];

  return {
    value: {
      ...value,
      herbs: value.herbs === undefined ? 0 : value.herbs
    },
    normalizations
  };
}

export function normalizeEquipmentProgressForMigration(
  data: SaveMigrationData,
  value: unknown,
  path = "progress.equipment"
): NormalizationResult<EquipmentProgress | unknown> {
  if (value === undefined) {
    return {
      value: {
        inventory: {},
        equipped: {}
      },
      normalizations: [missingField(path)]
    };
  }

  if (!isRecord(value)) {
    return {
      value,
      normalizations: []
    };
  }

  const normalizations: SaveNormalization[] = [];
  const inventory = isRecord(value.inventory)
    ? normalizeContentIdMapKeysForMigration(
        data,
        "augment",
        value.inventory,
        `${path}.inventory`,
        normalizations
      )
    : value.inventory;
  const equipped = isRecord(value.equipped)
    ? normalizeContentIdMapKeysForMigration(
        data,
        "initiate",
        Object.fromEntries(
          Object.entries(value.equipped).map(([heroId, slots]) => [
            heroId,
            isRecord(slots)
              ? Object.fromEntries(
                  Object.entries(slots).map(([slot, equipmentId]) => [
                    slot,
                    normalizeContentIdValueForMigration(
                      data,
                      "augment",
                      equipmentId,
                      `${path}.equipped.${heroId}.${slot}`,
                      normalizations
                    )
                  ])
                )
              : slots
          ])
        ),
        `${path}.equipped`,
        normalizations
      )
    : value.equipped;

  if (value.inventory === undefined) {
    normalizations.push(missingField(`${path}.inventory`));
  }

  if (value.equipped === undefined) {
    normalizations.push(missingField(`${path}.equipped`));
  }

  return {
    value: {
      ...value,
      inventory: value.inventory === undefined ? {} : inventory,
      equipped: value.equipped === undefined ? {} : equipped
    },
    normalizations
  };
}

export function normalizeProgressForMigration(
  data: SaveMigrationData,
  value: unknown,
  options: { migrateRegionStageIds?: boolean } = {}
): NormalizationResult<unknown> {
  if (!isRecord(value)) {
    return {
      value,
      normalizations: []
    };
  }

  const defaultProgress = createInitialPlayerProgress(data);
  const existingMaps = isRecord(value.maps) ? value.maps : {};
  const shouldMigrateRegionStageIds = options.migrateRegionStageIds === true;
  const usesCanonicalRegionIds =
    shouldMigrateRegionStageIds ||
    Object.keys(existingMaps).some(
      (regionId) => getLegacyRegionId(regionId) !== regionId
    );
  const defaultMaps = usesCanonicalRegionIds
    ? normalizeRegionMapKeys(defaultProgress.maps).map
    : defaultProgress.maps;
  const normalizations: SaveNormalization[] = [];
  const resources = normalizeResourcesForMigration(value.resources);
  const rawHeroes = isRecord(value.heroes) ? value.heroes : {};
  const normalizedHeroEntries = normalizeContentIdMapKeysForMigration(
    data,
    "initiate",
    rawHeroes,
    "progress.heroes",
    normalizations
  );
  const equipment = normalizeEquipmentProgressForMigration(data, value.equipment);
  const heroes = Object.fromEntries(
    Object.entries(normalizedHeroEntries).map(([heroId, progress]) => {
      const normalized = normalizeHeroProgressForMigration(
        progress,
        `progress.heroes.${heroId}`
      );
      normalizations.push(...normalized.normalizations);

      return [heroId, normalized.value];
    })
  );
  const maps: Record<string, unknown> = {};
  const deferredLegacyMaps: Array<readonly [string, unknown]> = [];

  for (const [regionId, progress] of Object.entries(existingMaps)) {
    const normalized = normalizeMapProgressForMigration(
      progress,
      `progress.maps.${regionId}`
    );
    normalizations.push(...normalized.normalizations);

    if (
      shouldMigrateRegionStageIds &&
      normalizeRegionId(regionId) !== regionId
    ) {
      deferredLegacyMaps.push([regionId, normalized.value]);
      continue;
    }

    maps[regionId] = normalized.value;
  }

  for (const [legacyRegionId, progress] of deferredLegacyMaps) {
    const targetRegionId = normalizeRegionId(legacyRegionId);
    normalizations.push(migratedRegionId(`progress.maps.${legacyRegionId}`));

    if (!Object.hasOwn(maps, targetRegionId)) {
      maps[targetRegionId] = progress;
    }
  }

  normalizations.push(...resources.normalizations, ...equipment.normalizations);

  const normalizedSelectedTacticInput = normalizeContentIdValueForMigration(
    data,
    "routine",
    value.selectedTacticId,
    "progress.selectedTacticId",
    normalizations
  );
  const selectedTacticId = normalizeSelectedTacticId(
    data,
    normalizedSelectedTacticInput
  );

  if (value.selectedTacticId === undefined) {
    normalizations.push(missingField("progress.selectedTacticId"));
  } else if (normalizedSelectedTacticInput !== selectedTacticId) {
    normalizations.push(invalidField("progress.selectedTacticId"));
  }

  for (const heroId of Object.keys(defaultProgress.heroes)) {
    if (!(heroId in normalizedHeroEntries)) {
      normalizations.push(missingField(`progress.heroes.${heroId}`));
    }
  }

  for (const regionId of Object.keys(defaultMaps)) {
    if (!(regionId in maps)) {
      normalizations.push(missingField(`progress.maps.${regionId}`));
    }
  }

  const defaultedTopLevelFields = [
    "activeHeroIds",
    "formation",
    "styleMastery",
    "styleBranches",
    "skillUpgrades",
    "medicineInventory",
    "assignments"
  ] as const;

  for (const field of defaultedTopLevelFields) {
    if (value[field] === undefined) {
      normalizations.push(missingField(`progress.${field}`));
    }
  }

  const currentStageId =
    shouldMigrateRegionStageIds && typeof value.currentStageId === "string"
      ? normalizeStageId(value.currentStageId)
      : value.currentStageId;

  if (
    shouldMigrateRegionStageIds &&
    typeof value.currentStageId === "string" &&
    currentStageId !== value.currentStageId
  ) {
    normalizations.push(migratedStageId("progress.currentStageId"));
  }

  return {
    value: {
      ...value,
      resources: resources.value,
      heroes: {
        ...defaultProgress.heroes,
        ...heroes
      },
      sect: value.sect,
      maps: {
        ...defaultMaps,
        ...maps
      },
      selectedTacticId,
      activeHeroIds:
        normalizeContentIdArrayForMigration(
          data,
          "initiate",
          value.activeHeroIds,
          "progress.activeHeroIds",
          normalizations
        ) ?? defaultProgress.activeHeroIds,
      formation: isRecord(value.formation)
        ? normalizeContentIdMapKeysForMigration(
            data,
            "initiate",
            value.formation,
            "progress.formation",
            normalizations
          )
        : value.formation ?? defaultProgress.formation,
      styleMastery: isRecord(value.styleMastery)
        ? normalizeContentIdMapKeysForMigration(
            data,
            "style",
            value.styleMastery,
            "progress.styleMastery",
            normalizations
          )
        : value.styleMastery ?? {},
      styleBranches: isRecord(value.styleBranches)
        ? Object.fromEntries(
            Object.entries(
              normalizeContentIdMapKeysForMigration(
                data,
                "style",
                value.styleBranches,
                "progress.styleBranches",
                normalizations
              )
            ).map(([styleId, branchId]) => [
              styleId,
              normalizeContentIdValueForMigration(
                data,
                "style_branch",
                branchId,
                `progress.styleBranches.${styleId}`,
                normalizations
              )
            ])
          )
        : value.styleBranches ?? {},
      skillUpgrades: isRecord(value.skillUpgrades)
        ? normalizeContentIdMapKeysForMigration(
            data,
            "skill_upgrade",
            value.skillUpgrades,
            "progress.skillUpgrades",
            normalizations
          )
        : value.skillUpgrades ?? {},
      equipment: equipment.value,
      medicineInventory: isRecord(value.medicineInventory)
        ? normalizeContentIdMapKeysForMigration(
            data,
            "countermeasure",
            value.medicineInventory,
            "progress.medicineInventory",
            normalizations
          )
        : value.medicineInventory ?? {},
      assignments: isRecord(value.assignments)
        ? Object.fromEntries(
            Object.entries(
              normalizeContentIdMapKeysForMigration(
                data,
                "operation",
                value.assignments,
                "progress.assignments",
                normalizations
              )
            ).map(([assignmentId, assignment]) => [
              assignmentId,
              isRecord(assignment)
                ? {
                    ...assignment,
                    heroIds: normalizeContentIdArrayForMigration(
                      data,
                      "initiate",
                      assignment.heroIds,
                      `progress.assignments.${assignmentId}.heroIds`,
                      normalizations
                    )
                  }
                : assignment
            ])
          )
        : value.assignments ?? {},
      currentStageId
    },
    normalizations
  };
}

export function migrateSaveData(
  data: SaveMigrationData,
  raw: unknown
): SaveMigrationResult {
  const rawInput =
    isRecord(raw) && typeof raw.toJSON === "function" ? raw.toJSON() : raw;

  if (!isRecord(rawInput)) {
    return {
      ok: false,
      errors: ["save must be an object"]
    };
  }

  if (!isSupportedSaveDataVersion(rawInput.version)) {
    return {
      ok: false,
      errors: [
        `version must be a supported save version (${MIN_SUPPORTED_SAVE_DATA_VERSION}-${SAVE_DATA_VERSION})`
      ]
    };
  }

  const saveFieldAliases = normalizeSaveFieldAliasesForRuntime(rawInput);

  if (!saveFieldAliases.ok) {
    return {
      ok: false,
      errors: saveFieldAliases.errors
    };
  }

  const normalizedRaw = saveFieldAliases.save;

  const shouldNormalizeRegionStageIds = true;
  const progress = normalizeProgressForMigration(data, normalizedRaw.progress, {
    migrateRegionStageIds: shouldNormalizeRegionStageIds
  });
  const autoMedicinePreferences = normalizeAutoMedicinePreferencesWithChanges(
    normalizedRaw.autoMedicinePreferences
  );
  const normalizations: SaveNormalization[] = [...progress.normalizations];

  normalizations.unshift(...saveFieldAliases.normalizations);
  normalizations.push(...autoMedicinePreferences.normalizations);

  autoMedicinePreferences.value.disabledMedicineIds =
    normalizeContentIdArrayForMigration(
      data,
      "countermeasure",
      autoMedicinePreferences.value.disabledMedicineIds,
      "autoMedicinePreferences.disabledMedicineIds",
      normalizations
    ) as string[];

  if (normalizedRaw.selectedOfflineFarmStageId === undefined) {
    normalizations.push(missingField("selectedOfflineFarmStageId"));
  }

  if (normalizedRaw.offlineFarmPreset === undefined) {
    normalizations.push(missingField("offlineFarmPreset"));
  }

  const selectedOfflineFarmStageId =
    normalizedRaw.selectedOfflineFarmStageId === undefined
      ? null
      : normalizedRaw.selectedOfflineFarmStageId;
  const normalizedSelectedOfflineFarmStageId =
    shouldNormalizeRegionStageIds && typeof selectedOfflineFarmStageId === "string"
      ? normalizeStageId(selectedOfflineFarmStageId)
      : selectedOfflineFarmStageId;

  if (
    shouldNormalizeRegionStageIds &&
    typeof selectedOfflineFarmStageId === "string" &&
    normalizedSelectedOfflineFarmStageId !== selectedOfflineFarmStageId
  ) {
    normalizations.push(migratedStageId("selectedOfflineFarmStageId"));
  }

  const normalizedSave = {
    ...normalizedRaw,
    version: SAVE_DATA_VERSION,
    progress: progress.value,
    autoMedicinePreferences: autoMedicinePreferences.value,
    selectedOfflineFarmStageId: normalizedSelectedOfflineFarmStageId,
    offlineFarmPreset:
      normalizedRaw.offlineFarmPreset === undefined
        ? DEFAULT_OFFLINE_FARM_PRESET
        : normalizedRaw.offlineFarmPreset
  };

  return {
    ok: true,
    save: normalizedSave,
    fromVersion: rawInput.version,
    toVersion: SAVE_DATA_VERSION,
    migrated: rawInput.version !== SAVE_DATA_VERSION,
    normalized: normalizations.length > 0,
    normalizations
  };
}
