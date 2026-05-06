import type { StaticGameData } from "../data";
import { isFormationSlot } from "../combat";
import {
  createInitialPlayerProgress,
  cloneProgress,
  EQUIPMENT_SLOTS,
  getStageById,
  DEFAULT_OFFLINE_FARM_PRESET,
  normalizeOfflineFarmPreset,
  isOfflineFarmPreset,
  isStageUnlocked,
  isAssignmentUnlocked,
  isHeroEligibleForAssignment,
  STYLE_MASTERY_EXPERIENCE_PER_LEVEL
} from "../progression";
import type {
  AssignmentProgress,
  HeroProgress,
  MapProgress,
  PlayerProgress,
  ResourceState,
  EquipmentProgress,
  SectProgress,
  OfflineFarmPreset
} from "../progression";

export const SAVE_DATA_VERSION = 4 as const;
export const MIN_SUPPORTED_SAVE_DATA_VERSION = 1 as const;
export const SUPPORTED_SAVE_DATA_VERSIONS = [
  1,
  2,
  3,
  SAVE_DATA_VERSION
] as const;
export type SupportedSaveDataVersion =
  (typeof SUPPORTED_SAVE_DATA_VERSIONS)[number];

export type SaveData = {
  version: typeof SAVE_DATA_VERSION;
  progress: PlayerProgress;
  selectedOfflineFarmStageId: string | null;
  offlineFarmPreset: OfflineFarmPreset;
  createdAtMs: number;
  updatedAtMs: number;
  lastOfflineRewardAtMs: number;
};

export type CreateSaveDataInput = {
  progress: PlayerProgress;
  selectedOfflineFarmStageId: string | null;
  offlineFarmPreset?: OfflineFarmPreset;
  nowMs: number;
  lastOfflineRewardAtMs?: number;
  previousSave?: Pick<SaveData, "createdAtMs" | "lastOfflineRewardAtMs"> &
    Partial<Pick<SaveData, "offlineFarmPreset">> | null;
};

export type ParseSaveDataResult =
  | {
      ok: true;
      save: SaveData;
    }
  | {
      ok: false;
      reason: "invalid_save";
      errors: string[];
    };

export type SaveMigrationResult =
  | {
      ok: true;
      save: unknown;
      fromVersion: SupportedSaveDataVersion;
      toVersion: typeof SAVE_DATA_VERSION;
      migrated: boolean;
    }
  | {
      ok: false;
      errors: string[];
    };

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSupportedSaveDataVersion(
  value: unknown
): value is SupportedSaveDataVersion {
  return SUPPORTED_SAVE_DATA_VERSIONS.includes(
    value as SupportedSaveDataVersion
  );
}

function isFiniteNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function validateNumber(
  value: unknown,
  path: string,
  errors: string[]
): value is number {
  if (!isFiniteNonNegativeNumber(value)) {
    errors.push(`${path} must be a non-negative finite number`);
    return false;
  }

  return true;
}

function validateRecord(
  value: unknown,
  path: string,
  errors: string[]
): value is UnknownRecord {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return false;
  }

  return true;
}

function validateNumberMap(
  value: unknown,
  path: string,
  errors: string[]
): value is Record<string, number> {
  if (!validateRecord(value, path, errors)) {
    return false;
  }

  for (const [key, entry] of Object.entries(value)) {
    validateNumber(entry, `${path}.${key}`, errors);
  }

  return true;
}

function validateResources(
  value: unknown,
  errors: string[]
): value is ResourceState {
  if (!validateRecord(value, "progress.resources", errors)) {
    return false;
  }

  validateNumber(value.silver, "progress.resources.silver", errors);
  validateNumber(value.cultivation, "progress.resources.cultivation", errors);

  return true;
}

function validateHeroProgress(
  value: unknown,
  path: string,
  errors: string[]
): value is HeroProgress {
  if (!validateRecord(value, path, errors)) {
    return false;
  }

  if (
    validateNumber(value.level, `${path}.level`, errors) &&
    (!Number.isInteger(value.level) || value.level < 1)
  ) {
    errors.push(`${path}.level must be an integer >= 1`);
  }
  validateNumberMap(value.upgrades, `${path}.upgrades`, errors);

  return true;
}

function validateHeroes(
  data: Pick<StaticGameData, "heroes">,
  value: unknown,
  errors: string[]
): value is Record<string, HeroProgress> {
  if (!validateRecord(value, "progress.heroes", errors)) {
    return false;
  }

  for (const hero of data.heroes) {
    if (!validateHeroProgress(value[hero.id], `progress.heroes.${hero.id}`, errors)) {
      continue;
    }
  }

  return true;
}

function validateSect(value: unknown, errors: string[]): value is SectProgress {
  if (!validateRecord(value, "progress.sect", errors)) {
    return false;
  }

  validateNumberMap(value.upgrades, "progress.sect.upgrades", errors);

  return true;
}

function validateMapProgress(
  value: unknown,
  path: string,
  errors: string[]
): value is MapProgress {
  if (!validateRecord(value, path, errors)) {
    return false;
  }

  validateNumber(value.combatExperience, `${path}.combatExperience`, errors);
  validateNumber(
    value.highestClearedStageIndex,
    `${path}.highestClearedStageIndex`,
    errors
  );

  return true;
}

function validateMaps(
  data: Pick<StaticGameData, "regions">,
  value: unknown,
  errors: string[]
): value is Record<string, MapProgress> {
  if (!validateRecord(value, "progress.maps", errors)) {
    return false;
  }

  for (const region of data.regions) {
    if (value[region.id] === undefined) {
      continue;
    }

    validateMapProgress(value[region.id], `progress.maps.${region.id}`, errors);
  }

  return true;
}

function validateStyleMastery(
  data: Pick<StaticGameData, "styles">,
  value: unknown,
  errors: string[]
): value is PlayerProgress["styleMastery"] {
  if (value === undefined) {
    return true;
  }

  if (!validateRecord(value, "progress.styleMastery", errors)) {
    return false;
  }

  const styleIds = new Set<string>(data.styles.map((style) => style.id));

  for (const [styleId, mastery] of Object.entries(value)) {
    if (!styleIds.has(styleId)) {
      errors.push(`progress.styleMastery.${styleId} must reference an existing style`);
    }

    if (!validateRecord(mastery, `progress.styleMastery.${styleId}`, errors)) {
      continue;
    }

    validateNumber(
      mastery.experience,
      `progress.styleMastery.${styleId}.experience`,
      errors
    );
  }

  return true;
}

function isUnlockConditionMetForSave(
  data: Pick<StaticGameData, "heroes" | "stages" | "styles">,
  progress: UnknownRecord,
  unlock: StaticGameData["styles"][number]["branches"][number]["unlock"]
): boolean {
  switch (unlock.type) {
    case "always":
      return true;

    case "stage_cleared": {
      const stage = getStageById(data, unlock.stageId);
      const maps = isRecord(progress.maps) ? progress.maps : {};
      const mapProgress = stage ? maps[stage.regionId] : undefined;

      return (
        !!stage &&
        isRecord(mapProgress) &&
        typeof mapProgress.highestClearedStageIndex === "number" &&
        mapProgress.highestClearedStageIndex >= stage.index
      );
    }

    case "hero_level": {
      const heroes = isRecord(progress.heroes) ? progress.heroes : {};
      const heroProgress = heroes[unlock.heroId];

      return (
        isRecord(heroProgress) &&
        typeof heroProgress.level === "number" &&
        heroProgress.level >= unlock.level
      );
    }

    case "style_mastery_level": {
      const styleMastery = isRecord(progress.styleMastery)
        ? progress.styleMastery
        : {};
      const mastery = styleMastery[unlock.styleId];
      const experience =
        isRecord(mastery) && typeof mastery.experience === "number"
          ? mastery.experience
          : 0;

      return (
        Math.floor(Math.max(0, experience) / STYLE_MASTERY_EXPERIENCE_PER_LEVEL) >=
        unlock.level
      );
    }
  }
}

function validateStyleBranches(
  data: Pick<StaticGameData, "heroes" | "stages" | "styles">,
  progress: UnknownRecord,
  value: unknown,
  errors: string[]
): value is PlayerProgress["styleBranches"] {
  if (value === undefined) {
    return true;
  }

  if (!validateRecord(value, "progress.styleBranches", errors)) {
    return false;
  }

  const styleIds = new Set<string>(data.styles.map((style) => style.id));
  const branchStyleById = new Map<string, string>();

  for (const style of data.styles) {
    for (const branch of style.branches) {
      branchStyleById.set(branch.id, style.id);
    }
  }

  for (const [styleId, branchId] of Object.entries(value)) {
    const style = data.styles.find((candidate) => candidate.id === styleId);

    if (!styleIds.has(styleId) || !style) {
      errors.push(`progress.styleBranches.${styleId} must reference an existing style`);
      continue;
    }

    if (typeof branchId !== "string") {
      errors.push(`progress.styleBranches.${styleId} must be a branch id string`);
      continue;
    }

    const branch = style.branches.find((candidate) => candidate.id === branchId);

    if (!branch) {
      const expectedStyleId = branchStyleById.get(branchId);

      errors.push(
        expectedStyleId
          ? `progress.styleBranches.${styleId} must select a branch from style ${styleId}`
          : `progress.styleBranches.${styleId} must reference an existing style branch`
      );
      continue;
    }

    if (!isUnlockConditionMetForSave(data, progress, branch.unlock)) {
      errors.push(`progress.styleBranches.${styleId} must be unlocked by saved progress`);
    }
  }

  return true;
}

function validateSkillUpgrades(
  data: Pick<StaticGameData, "skillUpgrades">,
  value: unknown,
  errors: string[]
): value is PlayerProgress["skillUpgrades"] {
  if (value === undefined) {
    return true;
  }

  if (!validateRecord(value, "progress.skillUpgrades", errors)) {
    return false;
  }

  const skillUpgradeIds = new Set(data.skillUpgrades.map((upgrade) => upgrade.id));

  for (const [upgradeId, level] of Object.entries(value)) {
    if (!skillUpgradeIds.has(upgradeId)) {
      errors.push(`progress.skillUpgrades.${upgradeId} must reference an existing skill upgrade`);
    }

    if (
      validateNumber(level, `progress.skillUpgrades.${upgradeId}`, errors) &&
      (!Number.isInteger(level) || level < 0)
    ) {
      errors.push(`progress.skillUpgrades.${upgradeId} must be an integer >= 0`);
    }
  }

  return true;
}

function validateEquipmentProgress(
  data: Pick<StaticGameData, "equipment" | "heroes">,
  value: unknown,
  errors: string[]
): value is EquipmentProgress | undefined {
  if (value === undefined) {
    return true;
  }

  if (!validateRecord(value, "progress.equipment", errors)) {
    return false;
  }

  const equipmentIds = new Set(data.equipment.map((equipment) => equipment.id));
  const equipmentById = new Map(data.equipment.map((equipment) => [equipment.id, equipment]));
  const heroIds = new Set(data.heroes.map((hero) => hero.id));
  const heroById = new Map(data.heroes.map((hero) => [hero.id, hero]));

  if (validateRecord(value.inventory, "progress.equipment.inventory", errors)) {
    for (const [equipmentId, count] of Object.entries(value.inventory)) {
      if (!equipmentIds.has(equipmentId)) {
        errors.push(
          `progress.equipment.inventory.${equipmentId} must reference an existing equipment item`
        );
      }

      if (
        validateNumber(count, `progress.equipment.inventory.${equipmentId}`, errors) &&
        (!Number.isInteger(count) || count < 0)
      ) {
        errors.push(
          `progress.equipment.inventory.${equipmentId} must be an integer >= 0`
        );
      }
    }
  }

  if (validateRecord(value.equipped, "progress.equipment.equipped", errors)) {
    for (const [heroId, slots] of Object.entries(value.equipped)) {
      if (!heroIds.has(heroId)) {
        errors.push(
          `progress.equipment.equipped.${heroId} must reference an existing hero`
        );
      }

      if (!validateRecord(slots, `progress.equipment.equipped.${heroId}`, errors)) {
        continue;
      }

      for (const [slot, equipmentId] of Object.entries(slots)) {
        const equipment = typeof equipmentId === "string"
          ? equipmentById.get(equipmentId)
          : undefined;
        const hero = heroById.get(heroId);
        const isValidSlot = EQUIPMENT_SLOTS.includes(
          slot as (typeof EQUIPMENT_SLOTS)[number]
        );

        if (!isValidSlot) {
          errors.push(
            `progress.equipment.equipped.${heroId}.${slot} must be weapon, armor, manual, or medicine`
          );
        }

        if (!equipment) {
          errors.push(
            `progress.equipment.equipped.${heroId}.${slot} must reference an existing equipment item`
          );
          continue;
        }

        if (isValidSlot && equipment.slot !== slot) {
          errors.push(
            `progress.equipment.equipped.${heroId}.${slot} must match equipment slot ${equipment.slot}`
          );
        }

        if (hero && !equipment.allowedStyles.includes(hero.style)) {
          errors.push(
            `progress.equipment.equipped.${heroId}.${slot} is incompatible with hero style ${hero.style}`
          );
        }
      }
    }
  }

  return true;
}

function validateAssignmentProgress(
  data: Pick<StaticGameData, "assignments" | "heroes" | "stages">,
  progressValue: UnknownRecord,
  value: unknown,
  errors: string[]
): value is AssignmentProgress | undefined {
  if (value === undefined) {
    return true;
  }

  if (!validateRecord(value, "progress.assignments", errors)) {
    return false;
  }

  const assignmentsById = new Map(
    (data.assignments ?? []).map((assignment) => [assignment.id, assignment])
  );
  const heroesById = new Map(data.heroes.map((hero) => [hero.id, hero]));
  const assignedHeroIds = new Set<string>();

  for (const [assignmentId, assignmentValue] of Object.entries(value)) {
    const path = `progress.assignments.${assignmentId}`;
    const assignment = assignmentsById.get(assignmentId);

    if (!assignment) {
      errors.push(`${path} must reference an existing assignment`);
    }

    if (!validateRecord(assignmentValue, path, errors)) {
      continue;
    }

    if (!Array.isArray(assignmentValue.heroIds)) {
      errors.push(`${path}.heroIds must be an array`);
      continue;
    }

    for (const heroId of assignmentValue.heroIds) {
      if (typeof heroId !== "string") {
        errors.push(`${path}.heroIds must contain hero ids`);
        continue;
      }

      const hero = heroesById.get(heroId);

      if (!hero) {
        errors.push(`${path}.heroIds.${heroId} must reference an existing hero`);
        continue;
      }

      if (assignment && assignedHeroIds.has(heroId)) {
        errors.push(`${path}.heroIds.${heroId} is already assigned`);
      }

      if (assignment) {
        assignedHeroIds.add(heroId);
      }

      if (assignment && !isHeroEligibleForAssignment(assignment, hero)) {
        errors.push(`${path}.heroIds.${heroId} is not eligible`);
      }
    }

    if (
      assignment &&
      !isAssignmentUnlocked(data, progressValue as PlayerProgress, assignment)
    ) {
      errors.push(`${path} must be unlocked by saved progress`);
    }
  }

  return true;
}

function normalizeHeroProgressForMigration(value: unknown): HeroProgress | unknown {
  if (!isRecord(value)) {
    return value;
  }

  return {
    ...value,
    level: value.level === undefined ? 1 : value.level,
    upgrades: value.upgrades === undefined ? {} : value.upgrades
  };
}

function normalizeMapProgressForMigration(value: unknown): MapProgress | unknown {
  if (!isRecord(value)) {
    return value;
  }

  return {
    ...value,
    combatExperience:
      value.combatExperience === undefined ? 0 : value.combatExperience,
    highestClearedStageIndex:
      value.highestClearedStageIndex === undefined
        ? 0
        : value.highestClearedStageIndex
  };
}

function normalizeEquipmentProgressForMigration(
  value: unknown
): EquipmentProgress | unknown {
  if (value === undefined) {
    return {
      inventory: {},
      equipped: {}
    };
  }

  if (!isRecord(value)) {
    return value;
  }

  return {
    ...value,
    inventory: value.inventory === undefined ? {} : value.inventory,
    equipped: value.equipped === undefined ? {} : value.equipped
  };
}

function normalizeProgressForMigration(
  data: Pick<StaticGameData, "heroes" | "regions" | "stages">,
  value: unknown
): unknown {
  if (!isRecord(value)) {
    return value;
  }

  const defaultProgress = createInitialPlayerProgress(data);
  const existingHeroes = isRecord(value.heroes) ? value.heroes : {};
  const existingMaps = isRecord(value.maps) ? value.maps : {};

  return {
    ...value,
    resources: value.resources,
    heroes: {
      ...defaultProgress.heroes,
      ...Object.fromEntries(
        Object.entries(existingHeroes).map(([heroId, progress]) => [
          heroId,
          normalizeHeroProgressForMigration(progress)
        ])
      )
    },
    sect: value.sect,
    maps: {
      ...defaultProgress.maps,
      ...Object.fromEntries(
        Object.entries(existingMaps).map(([regionId, progress]) => [
          regionId,
          normalizeMapProgressForMigration(progress)
        ])
      )
    },
    formation: value.formation ?? defaultProgress.formation,
    styleMastery: value.styleMastery ?? {},
    styleBranches: value.styleBranches ?? {},
    skillUpgrades: value.skillUpgrades ?? {},
    equipment: normalizeEquipmentProgressForMigration(value.equipment),
    assignments: value.assignments ?? {},
    currentStageId: value.currentStageId
  };
}

function validatePlayerFormation(
  data: Pick<StaticGameData, "heroes">,
  value: unknown,
  errors: string[]
): value is PlayerProgress["formation"] {
  if (value === undefined) {
    return true;
  }

  if (!validateRecord(value, "progress.formation", errors)) {
    return false;
  }

  const heroIds = new Set(data.heroes.map((hero) => hero.id));

  for (const [heroId, slot] of Object.entries(value)) {
    if (!heroIds.has(heroId)) {
      errors.push(`progress.formation.${heroId} must reference an existing hero`);
    }

    if (!isFormationSlot(slot)) {
      errors.push(
        `progress.formation.${heroId} must be front, middle, or back`
      );
    }
  }

  return true;
}

function validateCurrentStage(
  data: Pick<StaticGameData, "regions" | "stages">,
  progress: PlayerProgress,
  errors: string[]
): void {
  const stage = getStageById(data, progress.currentStageId);

  if (!stage) {
    errors.push("progress.currentStageId must reference an existing stage");
    return;
  }

  if (!isStageUnlocked(data, progress, stage)) {
    errors.push("progress.currentStageId must be unlocked by saved progress");
  }
}

function validateProgress(
  data: Pick<StaticGameData, "heroes" | "regions" | "stages" | "styles" | "skillUpgrades" | "equipment" | "assignments">,
  value: unknown,
  errors: string[]
): value is PlayerProgress {
  const progressErrorStart = errors.length;

  if (!validateRecord(value, "progress", errors)) {
    return false;
  }

  validateResources(value.resources, errors);
  validateHeroes(data, value.heroes, errors);
  validateSect(value.sect, errors);
  validateMaps(data, value.maps, errors);
  validatePlayerFormation(data, value.formation, errors);
  validateStyleMastery(data, value.styleMastery, errors);
  validateStyleBranches(data, value, value.styleBranches, errors);
  validateSkillUpgrades(data, value.skillUpgrades, errors);
  validateEquipmentProgress(data, value.equipment, errors);
  validateAssignmentProgress(data, value, value.assignments, errors);

  if (typeof value.currentStageId !== "string" || value.currentStageId.length === 0) {
    errors.push("progress.currentStageId must be a non-empty string");
    return false;
  }

  if (errors.length === progressErrorStart) {
    validateCurrentStage(data, value as PlayerProgress, errors);
  }

  return errors.length === progressErrorStart;
}

function validateTimestamps(raw: UnknownRecord, errors: string[]): void {
  validateNumber(raw.createdAtMs, "createdAtMs", errors);
  validateNumber(raw.updatedAtMs, "updatedAtMs", errors);
  validateNumber(raw.lastOfflineRewardAtMs, "lastOfflineRewardAtMs", errors);

  if (
    isFiniteNonNegativeNumber(raw.createdAtMs) &&
    isFiniteNonNegativeNumber(raw.updatedAtMs) &&
    raw.updatedAtMs < raw.createdAtMs
  ) {
    errors.push("updatedAtMs must be greater than or equal to createdAtMs");
  }

  if (
    isFiniteNonNegativeNumber(raw.createdAtMs) &&
    isFiniteNonNegativeNumber(raw.lastOfflineRewardAtMs) &&
    raw.lastOfflineRewardAtMs < raw.createdAtMs
  ) {
    errors.push("lastOfflineRewardAtMs must be greater than or equal to createdAtMs");
  }
}

export function cloneSaveData(save: SaveData): SaveData {
  return {
    version: SAVE_DATA_VERSION,
    progress: cloneProgress(save.progress),
    selectedOfflineFarmStageId: save.selectedOfflineFarmStageId,
    offlineFarmPreset: normalizeOfflineFarmPreset(save.offlineFarmPreset),
    createdAtMs: save.createdAtMs,
    updatedAtMs: save.updatedAtMs,
    lastOfflineRewardAtMs: save.lastOfflineRewardAtMs
  };
}

export function createSaveData(input: CreateSaveDataInput): SaveData {
  return {
    version: SAVE_DATA_VERSION,
    progress: cloneProgress(input.progress),
    selectedOfflineFarmStageId: input.selectedOfflineFarmStageId,
    offlineFarmPreset:
      input.offlineFarmPreset ??
      input.previousSave?.offlineFarmPreset ??
      normalizeOfflineFarmPreset(undefined),
    createdAtMs: input.previousSave?.createdAtMs ?? input.nowMs,
    updatedAtMs: input.nowMs,
    lastOfflineRewardAtMs:
      input.lastOfflineRewardAtMs ??
      input.previousSave?.lastOfflineRewardAtMs ??
      input.nowMs
  };
}

export function migrateSaveData(
  data: Pick<StaticGameData, "heroes" | "regions" | "stages">,
  raw: unknown
): SaveMigrationResult {
  if (!isRecord(raw)) {
    return {
      ok: false,
      errors: ["save must be an object"]
    };
  }

  if (!isSupportedSaveDataVersion(raw.version)) {
    return {
      ok: false,
      errors: [
        `version must be a supported save version (${MIN_SUPPORTED_SAVE_DATA_VERSION}-${SAVE_DATA_VERSION})`
      ]
    };
  }

  const normalizedSave = {
    ...raw,
    version: SAVE_DATA_VERSION,
    progress: normalizeProgressForMigration(data, raw.progress),
    selectedOfflineFarmStageId:
      raw.selectedOfflineFarmStageId === undefined
        ? null
        : raw.selectedOfflineFarmStageId,
    offlineFarmPreset:
      raw.offlineFarmPreset === undefined
        ? DEFAULT_OFFLINE_FARM_PRESET
        : raw.offlineFarmPreset
  };

  return {
    ok: true,
    save: normalizedSave,
    fromVersion: raw.version,
    toVersion: SAVE_DATA_VERSION,
    migrated: raw.version !== SAVE_DATA_VERSION
  };
}

export function validateSaveData(
  data: Pick<StaticGameData, "heroes" | "regions" | "stages" | "styles" | "skillUpgrades" | "equipment" | "assignments">,
  raw: unknown
): string[] {
  const errors: string[] = [];
  const migration = migrateSaveData(data, raw);

  if (!migration.ok) {
    errors.push(...migration.errors);

    if (!isRecord(raw)) {
      return errors;
    }
  }

  const migratedRaw = migration.ok ? migration.save : raw;

  if (!validateRecord(migratedRaw, "save", errors)) {
    return errors;
  }

  validateProgress(data, migratedRaw.progress, errors);

  if (
    migratedRaw.selectedOfflineFarmStageId !== null &&
    typeof migratedRaw.selectedOfflineFarmStageId !== "string"
  ) {
    errors.push("selectedOfflineFarmStageId must be a string or null");
  }

  if (
    migratedRaw.offlineFarmPreset !== undefined &&
    !isOfflineFarmPreset(migratedRaw.offlineFarmPreset)
  ) {
    errors.push("offlineFarmPreset must be a supported offline farm preset");
  }

  validateTimestamps(migratedRaw, errors);

  return errors;
}

export function parseSaveData(
  data: Pick<StaticGameData, "heroes" | "regions" | "stages" | "styles" | "skillUpgrades" | "equipment" | "assignments">,
  raw: unknown
): ParseSaveDataResult {
  const migration = migrateSaveData(data, raw);
  const errors = validateSaveData(data, raw);

  if (errors.length > 0) {
    return {
      ok: false,
      reason: "invalid_save",
      errors
    };
  }

  if (!migration.ok) {
    return {
      ok: false,
      reason: "invalid_save",
      errors: migration.errors
    };
  }

  return {
    ok: true,
    save: cloneSaveData(migration.save as SaveData)
  };
}
