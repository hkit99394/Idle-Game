import {
  createInitialPlayerProgress,
  createSaveData,
  getContentAliasIndexByKind,
  getLegacyRegionId,
  normalizeRegionId,
  normalizeRegionMapKeys,
  normalizeStageId,
  SAVE_DATA_VERSION,
  SUPPORTED_SAVE_DATA_VERSIONS
} from "../../core";
import type {
  ContentIdAliasKind,
  SaveData,
  SaveNormalization,
  StaticGameData,
  SupportedSaveDataVersion
} from "../../core";
import { stage12SaveFixture } from "./stage12Save";

export type SaveVersionFixture = {
  version: Exclude<SupportedSaveDataVersion, typeof SAVE_DATA_VERSION>;
  description: string;
  rawSave: unknown;
  expectedNormalizations: SaveNormalization[];
};

export function buildSaveVersionFixtures(
  data: StaticGameData
): SaveVersionFixture[] {
  const currentSave = createCurrentSaveFixture(data);

  return SUPPORTED_SAVE_DATA_VERSIONS.filter(
    (version): version is Exclude<SupportedSaveDataVersion, typeof SAVE_DATA_VERSION> =>
      version !== SAVE_DATA_VERSION
  ).map((version) => ({
    version,
    description: `version ${version}`,
    rawSave: createRawSaveForVersion(currentSave, version)
  })).map((fixture) => ({
    ...fixture,
    expectedNormalizations: getExpectedNormalizationsForRawSave(
      data,
      fixture.rawSave
    )
  }));
}

function createCurrentSaveFixture(data: StaticGameData): SaveData {
  const progress = createInitialPlayerProgress(data);
  progress.resources.credits = 100;
  progress.resources.resonance = 25;
  progress.districts = Object.fromEntries(
    Object.entries(progress.districts).map(([regionId, mapProgress]) => [
      getLegacyRegionId(regionId),
      mapProgress
    ])
  );
  progress.districts.bamboo_road.combatData = 12;
  progress.districts.bamboo_road.highestClearedRouteIndex = 1;
  progress.currentRouteId = "bamboo_road_2";

  return createSaveData({
    progress,
    selectedOfflineFarmRouteId: "bamboo_road_1",
    nowMs: 2000
  });
}

function createRawSaveForVersion(
  currentSave: SaveData,
  version: SaveVersionFixture["version"]
): unknown {
  if (version === 1) {
    return createMvpSaveFixture(version);
  }

  if (version === 4) {
    return stage12SaveFixture;
  }

  const save = cloneAsMutable(currentSave) as Record<string, any>;
  save.version = version;

  if (version <= 2) {
    delete save.autoMedicinePreferences;
    delete save.offlineFarmPreset;
    delete save.progress.selectedRoutineId;
    delete save.progress.resources.reagents;
    delete save.progress.activeHeroIds;
    delete save.progress.formation;
    delete save.progress.styleMastery;
    delete save.progress.styleBranches;
    delete save.progress.skillUpgrades;
    delete save.progress.equipment;
    delete save.progress.assignments;
    const heroes = save.progress.heroes as Record<string, { upgrades: unknown }>;
    save.progress.heroes = Object.fromEntries(
      Object.entries(heroes).map(([heroId, progress]) => [
        heroId,
        {
          upgrades: progress.upgrades
        }
      ])
    );
    save.progress.districts = {
      bamboo_road: save.progress.districts.bamboo_road
    };
  } else if (version <= 3) {
    delete save.progress.styleBranches;
    delete save.progress.equipment;
    delete save.progress.assignments;
  } else if (version <= 5) {
    delete save.progress.resources.reagents;
  } else if (version <= 6) {
    delete save.progress.equipment;
  } else if (version <= 7) {
    delete save.progress.assignments;
  } else if (version <= 8) {
    delete save.autoMedicinePreferences;
  }

  if (version <= 9) {
    delete save.progress.selectedRoutineId;
  }

  return save;
}

function getExpectedNormalizationsForRawSave(
  data: StaticGameData,
  rawSave: unknown
): SaveNormalization[] {
  const normalizations: SaveNormalization[] = [];
  const defaultProgress = createInitialPlayerProgress(data);
  const raw = isFixtureRecord(rawSave) ? rawSave : {};
  const shouldMigrateRegionStageIds =
    typeof raw.version === "number" && raw.version < SAVE_DATA_VERSION;
  const defaultDistricts = shouldMigrateRegionStageIds
    ? normalizeRegionMapKeys(defaultProgress.districts).map
    : defaultProgress.districts;
  const progress = isFixtureRecord(raw.progress) ? raw.progress : {};
  const resources = isFixtureRecord(progress.resources)
    ? progress.resources
    : {};
  const equipment = progress.equipment;
  const existingHeroes = isFixtureRecord(progress.heroes) ? progress.heroes : {};
  const existingDistricts = isFixtureRecord(progress.districts)
    ? progress.districts
    : isFixtureRecord(progress.maps)
      ? progress.maps
      : {};
  const normalizedHeroIds = new Set<string>();
  const normalizedDistrictIds = new Set<string>();

  normalizations.push(...getExpectedSaveFieldAliasNormalizations(raw));

  for (const [heroId, heroProgress] of Object.entries(existingHeroes)) {
    const normalizedHeroId = normalizeFixtureContentId(data, "initiate", heroId);
    normalizedHeroIds.add(normalizedHeroId);

    if (normalizedHeroId !== heroId) {
      normalizations.push(normalizedContentId(`progress.heroes.${heroId}`));
    }

    if (!isFixtureRecord(heroProgress)) {
      continue;
    }

    if (heroProgress.level === undefined) {
      normalizations.push(missingField(`progress.heroes.${normalizedHeroId}.level`));
    }

    if (heroProgress.upgrades === undefined) {
      normalizations.push(
        missingField(`progress.heroes.${normalizedHeroId}.upgrades`)
      );
    }
  }

  for (const [regionId, mapProgress] of Object.entries(existingDistricts)) {
    const normalizedRegionId = shouldMigrateRegionStageIds
      ? normalizeRegionId(regionId)
      : regionId;
    normalizedDistrictIds.add(normalizedRegionId);

    if (!isFixtureRecord(mapProgress)) {
      continue;
    }

    if (
      mapProgress.combatData === undefined &&
      mapProgress.combatExperience === undefined
    ) {
      normalizations.push(
        missingField(`progress.districts.${regionId}.combatData`)
      );
    }

    if (
      mapProgress.highestClearedRouteIndex === undefined &&
      mapProgress.highestClearedStageIndex === undefined
    ) {
      normalizations.push(
        missingField(`progress.districts.${regionId}.highestClearedRouteIndex`)
      );
    }
  }

  if (shouldMigrateRegionStageIds) {
    for (const regionId of Object.keys(existingDistricts)) {
      if (normalizeRegionId(regionId) !== regionId) {
        normalizations.push(migratedRegionId(`progress.districts.${regionId}`));
      }
    }
  }

  if (resources.reagents === undefined && resources.herbs === undefined) {
    normalizations.push(missingField("progress.resources.reagents"));
  }

  const equipmentNormalizations = getExpectedEquipmentNormalizations(
    data,
    equipment
  );
  normalizations.push(...equipmentNormalizations);

  const selectedRoutineId = progress.selectedRoutineId ?? progress.selectedTacticId;
  if (selectedRoutineId === undefined) {
    normalizations.push(missingField("progress.selectedRoutineId"));
  } else if (
    typeof selectedRoutineId === "string" &&
    normalizeFixtureContentId(data, "routine", selectedRoutineId) !==
      selectedRoutineId
  ) {
    normalizations.push(normalizedContentId("progress.selectedRoutineId"));
  }

  for (const heroId of Object.keys(defaultProgress.heroes)) {
    if (!normalizedHeroIds.has(heroId)) {
      normalizations.push(missingField(`progress.heroes.${heroId}`));
    }
  }

  for (const regionId of Object.keys(defaultDistricts)) {
    if (!normalizedDistrictIds.has(regionId)) {
      normalizations.push(missingField(`progress.districts.${regionId}`));
    }
  }

  for (const field of [
    "activeHeroIds",
    "formation",
    "styleMastery",
    "styleBranches",
    "skillUpgrades",
    "medicineInventory",
    "assignments"
  ] as const) {
    if (progress[field] === undefined) {
      normalizations.push(missingField(`progress.${field}`));
    }
  }

  if (
    shouldMigrateRegionStageIds &&
    typeof (progress.currentRouteId ?? progress.currentStageId) === "string" &&
    normalizeStageId((progress.currentRouteId ?? progress.currentStageId) as string) !==
      (progress.currentRouteId ?? progress.currentStageId)
  ) {
    normalizations.push(migratedStageId("progress.currentRouteId"));
  }

  normalizations.push(
    ...getExpectedProgressContentAliasNormalizations(data, progress)
  );
  normalizations.push(
    ...getExpectedAutoMedicinePreferenceNormalizations(raw.autoMedicinePreferences)
  );

  const selectedOfflineFarmRouteId =
    raw.selectedOfflineFarmRouteId ?? raw.selectedOfflineFarmStageId;

  if (selectedOfflineFarmRouteId === undefined) {
    normalizations.push(missingField("selectedOfflineFarmRouteId"));
  }

  if (raw.offlineFarmPreset === undefined) {
    normalizations.push(missingField("offlineFarmPreset"));
  }

  if (
    shouldMigrateRegionStageIds &&
    typeof selectedOfflineFarmRouteId === "string" &&
    normalizeStageId(selectedOfflineFarmRouteId) !==
      selectedOfflineFarmRouteId
  ) {
    normalizations.push(migratedStageId("selectedOfflineFarmRouteId"));
  }

  return normalizations;
}

function getExpectedSaveFieldAliasNormalizations(
  raw: Record<string, unknown>
): SaveNormalization[] {
  const normalizations: SaveNormalization[] = [];
  const progress = isFixtureRecord(raw.progress) ? raw.progress : {};
  const resources = isFixtureRecord(progress.resources)
    ? progress.resources
    : {};
  const maps = isFixtureRecord(progress.maps) ? progress.maps : {};

  if (resources.silver !== undefined) {
    normalizations.push(
      migratedSaveField(
        "progress.resources.silver",
        "progress.resources.credits"
      )
    );
  }

  if (resources.cultivation !== undefined) {
    normalizations.push(
      migratedSaveField(
        "progress.resources.cultivation",
        "progress.resources.resonance"
      )
    );
  }

  if (resources.herbs !== undefined) {
    normalizations.push(
      migratedSaveField(
        "progress.resources.herbs",
        "progress.resources.reagents"
      )
    );
  }

  for (const [regionId, mapProgress] of Object.entries(maps)) {
    if (!isFixtureRecord(mapProgress)) {
      continue;
    }

    if (mapProgress.combatExperience !== undefined) {
      normalizations.push(
        migratedSaveField(
          `progress.maps.${regionId}.combatExperience`,
          `progress.districts.${regionId}.combatData`
        )
      );
    }

    if (mapProgress.highestClearedStageIndex !== undefined) {
      normalizations.push(
        migratedSaveField(
          `progress.maps.${regionId}.highestClearedStageIndex`,
          `progress.districts.${regionId}.highestClearedRouteIndex`
        )
      );
    }
  }

  if (progress.maps !== undefined) {
    normalizations.push(migratedSaveField("progress.maps", "progress.districts"));
  }

  if (progress.currentStageId !== undefined) {
    normalizations.push(
      migratedSaveField("progress.currentStageId", "progress.currentRouteId")
    );
  }

  if (progress.selectedTacticId !== undefined) {
    normalizations.push(
      migratedSaveField("progress.selectedTacticId", "progress.selectedRoutineId")
    );
  }

  if (progress.sect !== undefined) {
    normalizations.push(migratedSaveField("progress.sect", "progress.technoSect"));
  }

  if (raw.selectedOfflineFarmStageId !== undefined) {
    normalizations.push(
      migratedSaveField(
        "selectedOfflineFarmStageId",
        "selectedOfflineFarmRouteId"
      )
    );
  }

  if (
    raw.offlineFarmPreset === "silver" ||
    raw.offlineFarmPreset === "cultivation" ||
    raw.offlineFarmPreset === "combatExperience"
  ) {
    normalizations.push({
      field: "offlineFarmPreset",
      reason: "normalized legacy offline farm preset value"
    });
  }

  return normalizations;
}

function getExpectedProgressContentAliasNormalizations(
  data: StaticGameData,
  progress: Record<string, unknown>
): SaveNormalization[] {
  const normalizations: SaveNormalization[] = [];

  if (Array.isArray(progress.activeHeroIds)) {
    normalizations.push(
      ...getExpectedContentIdArrayNormalizations(
        data,
        "initiate",
        progress.activeHeroIds,
        "progress.activeHeroIds"
      )
    );
  }

  if (isFixtureRecord(progress.formation)) {
    normalizations.push(
      ...getExpectedContentIdMapKeyNormalizations(
        data,
        "initiate",
        progress.formation,
        "progress.formation"
      )
    );
  }

  if (isFixtureRecord(progress.styleMastery)) {
    normalizations.push(
      ...getExpectedContentIdMapKeyNormalizations(
        data,
        "style",
        progress.styleMastery,
        "progress.styleMastery"
      )
    );
  }

  if (isFixtureRecord(progress.styleBranches)) {
    const normalizedStyleBranches = getNormalizedFixtureMapEntries(
      data,
      "style",
      progress.styleBranches,
      "progress.styleBranches",
      normalizations
    );

    for (const [styleId, branchId] of normalizedStyleBranches) {
      if (typeof branchId !== "string") {
        continue;
      }

      const normalizedBranchId = normalizeFixtureContentId(
        data,
        "style_branch",
        branchId
      );

      if (normalizedBranchId !== branchId) {
        normalizations.push(
          normalizedContentId(`progress.styleBranches.${styleId}`)
        );
      }
    }
  }

  if (isFixtureRecord(progress.skillUpgrades)) {
    normalizations.push(
      ...getExpectedContentIdMapKeyNormalizations(
        data,
        "skill_upgrade",
        progress.skillUpgrades,
        "progress.skillUpgrades"
      )
    );
  }

  if (isFixtureRecord(progress.medicineInventory)) {
    normalizations.push(
      ...getExpectedContentIdMapKeyNormalizations(
        data,
        "countermeasure",
        progress.medicineInventory,
        "progress.medicineInventory"
      )
    );
  }

  if (isFixtureRecord(progress.assignments)) {
    const normalizedAssignments = getNormalizedFixtureMapEntries(
      data,
      "operation",
      progress.assignments,
      "progress.assignments",
      normalizations
    );

    for (const [assignmentId, assignment] of normalizedAssignments) {
      if (!isFixtureRecord(assignment) || !Array.isArray(assignment.heroIds)) {
        continue;
      }

      normalizations.push(
        ...getExpectedContentIdArrayNormalizations(
          data,
          "initiate",
          assignment.heroIds,
          `progress.assignments.${assignmentId}.heroIds`
        )
      );
    }
  }

  return normalizations;
}

function getExpectedEquipmentNormalizations(
  data: StaticGameData,
  equipment: unknown
): SaveNormalization[] {
  if (equipment === undefined) {
    return [missingField("progress.equipment")];
  }

  if (!isFixtureRecord(equipment)) {
    return [];
  }

  const normalizations: SaveNormalization[] = [];

  if (isFixtureRecord(equipment.inventory)) {
    normalizations.push(
      ...getExpectedContentIdMapKeyNormalizations(
        data,
        "augment",
        equipment.inventory,
        "progress.equipment.inventory"
      )
    );
  }

  if (isFixtureRecord(equipment.equipped)) {
    for (const [heroId, slots] of Object.entries(equipment.equipped)) {
      if (!isFixtureRecord(slots)) {
        continue;
      }

      for (const [slot, equipmentId] of Object.entries(slots)) {
        if (typeof equipmentId !== "string") {
          continue;
        }

        const normalizedEquipmentId = normalizeFixtureContentId(
          data,
          "augment",
          equipmentId
        );

        if (normalizedEquipmentId !== equipmentId) {
          normalizations.push(
            normalizedContentId(
              `progress.equipment.equipped.${heroId}.${slot}`
            )
          );
        }
      }
    }

    normalizations.push(
      ...getExpectedContentIdMapKeyNormalizations(
        data,
        "initiate",
        equipment.equipped,
        "progress.equipment.equipped"
      )
    );
  }

  if (equipment.inventory === undefined) {
    normalizations.push(missingField("progress.equipment.inventory"));
  }

  if (equipment.equipped === undefined) {
    normalizations.push(missingField("progress.equipment.equipped"));
  }

  return normalizations;
}

function getExpectedContentIdArrayNormalizations(
  data: StaticGameData,
  kind: ContentIdAliasKind,
  value: unknown[],
  field: string
): SaveNormalization[] {
  return value.flatMap((entry, index) =>
    typeof entry === "string" &&
    normalizeFixtureContentId(data, kind, entry) !== entry
      ? [normalizedContentId(`${field}.${index}`)]
      : []
  );
}

function getExpectedContentIdMapKeyNormalizations(
  data: StaticGameData,
  kind: ContentIdAliasKind,
  value: Record<string, unknown>,
  field: string
): SaveNormalization[] {
  const normalizations: SaveNormalization[] = [];

  getNormalizedFixtureMapEntries(data, kind, value, field, normalizations);

  return normalizations;
}

function getNormalizedFixtureMapEntries(
  data: StaticGameData,
  kind: ContentIdAliasKind,
  value: Record<string, unknown>,
  field: string,
  normalizations: SaveNormalization[]
): Array<readonly [string, unknown]> {
  return Object.entries(value).map(([contentId, contentValue]) => {
    const normalizedId = normalizeFixtureContentId(data, kind, contentId);

    if (normalizedId !== contentId) {
      normalizations.push(normalizedContentId(`${field}.${contentId}`));
    }

    return [normalizedId, contentValue];
  });
}

function normalizeFixtureContentId(
  data: StaticGameData,
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

function getConfiguredContentIds(
  data: StaticGameData,
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

function getExpectedAutoMedicinePreferenceNormalizations(
  value: unknown
): SaveNormalization[] {
  if (!isFixtureRecord(value)) {
    return [missingField("autoMedicinePreferences")];
  }

  const normalizations: SaveNormalization[] = [];

  if (value.preBattleResistanceMode === undefined) {
    normalizations.push(
      missingField("autoMedicinePreferences.preBattleResistanceMode")
    );
  } else if (typeof value.preBattleResistanceMode !== "string") {
    normalizations.push(
      invalidField("autoMedicinePreferences.preBattleResistanceMode")
    );
  }

  if (value.disabledMedicineIds === undefined) {
    normalizations.push(
      missingField("autoMedicinePreferences.disabledMedicineIds")
    );
  } else if (!Array.isArray(value.disabledMedicineIds)) {
    normalizations.push(
      invalidField("autoMedicinePreferences.disabledMedicineIds")
    );
  } else {
    const stringMedicineIds = value.disabledMedicineIds.filter(
      (medicineId): medicineId is string => typeof medicineId === "string"
    );

    if (stringMedicineIds.length !== value.disabledMedicineIds.length) {
      normalizations.push({
        field: "autoMedicinePreferences.disabledMedicineIds",
        reason: "removed non-string entries"
      });
    }

    if (new Set(stringMedicineIds).size !== stringMedicineIds.length) {
      normalizations.push({
        field: "autoMedicinePreferences.disabledMedicineIds",
        reason: "deduplicated entries"
      });
    }
  }

  for (const field of [
    "enabled",
    "battleCleanseEnabled",
    "postBattleCleanseEnabled",
    "preBattleResistanceEnabled"
  ] as const) {
    if (value[field] === undefined) {
      normalizations.push(missingField(`autoMedicinePreferences.${field}`));
    } else if (typeof value[field] !== "boolean") {
      normalizations.push(invalidField(`autoMedicinePreferences.${field}`));
    }
  }

  return normalizations;
}

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

function normalizedContentId(field: string): SaveNormalization {
  return {
    field,
    reason: "normalized content id alias"
  };
}

function migratedSaveField(
  field: string,
  targetField: string
): SaveNormalization {
  return {
    field,
    reason: `migrated legacy save field to ${targetField}`
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

function isFixtureRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createMvpSaveFixture(version: 1 | 2): unknown {
  return {
    version,
    progress: {
      resources: {
        silver: 100,
        cultivation: 25
      },
      heroes: {
        iron_fist_disciple: {
          upgrades: {}
        }
      },
      sect: {
        upgrades: {}
      },
      maps: {
        bamboo_road: {
          combatExperience: 12,
          highestClearedStageIndex: 1
        }
      },
      currentStageId: "bamboo_road_2"
    },
    selectedOfflineFarmStageId: "bamboo_road_1",
    createdAtMs: 1000,
    updatedAtMs: 2000,
    lastOfflineRewardAtMs: 2000
  };
}

function cloneAsMutable<T>(value: T): T {
  return structuredClone(value);
}
