import type { StaticGameData } from "../data";
import { isFormationSlot } from "../combat";
import {
  cloneProgress,
  getStageById,
  isStageUnlocked
} from "../progression";
import type {
  HeroProgress,
  MapProgress,
  PlayerProgress,
  ResourceState,
  SectProgress
} from "../progression";

export const SAVE_DATA_VERSION = 1 as const;

export type SaveData = {
  version: typeof SAVE_DATA_VERSION;
  progress: PlayerProgress;
  selectedOfflineFarmStageId: string | null;
  createdAtMs: number;
  updatedAtMs: number;
  lastOfflineRewardAtMs: number;
};

export type CreateSaveDataInput = {
  progress: PlayerProgress;
  selectedOfflineFarmStageId: string | null;
  nowMs: number;
  lastOfflineRewardAtMs?: number;
  previousSave?: Pick<SaveData, "createdAtMs" | "lastOfflineRewardAtMs"> | null;
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

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
  data: Pick<StaticGameData, "heroes" | "regions" | "stages" | "styles" | "skillUpgrades">,
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
  validateSkillUpgrades(data, value.skillUpgrades, errors);

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
    createdAtMs: input.previousSave?.createdAtMs ?? input.nowMs,
    updatedAtMs: input.nowMs,
    lastOfflineRewardAtMs:
      input.lastOfflineRewardAtMs ??
      input.previousSave?.lastOfflineRewardAtMs ??
      input.nowMs
  };
}

export function validateSaveData(
  data: Pick<StaticGameData, "heroes" | "regions" | "stages" | "styles" | "skillUpgrades">,
  raw: unknown
): string[] {
  const errors: string[] = [];

  if (!validateRecord(raw, "save", errors)) {
    return errors;
  }

  if (raw.version !== SAVE_DATA_VERSION) {
    errors.push(`version must be ${SAVE_DATA_VERSION}`);
  }

  validateProgress(data, raw.progress, errors);

  if (
    raw.selectedOfflineFarmStageId !== null &&
    typeof raw.selectedOfflineFarmStageId !== "string"
  ) {
    errors.push("selectedOfflineFarmStageId must be a string or null");
  }

  validateTimestamps(raw, errors);

  return errors;
}

export function parseSaveData(
  data: Pick<StaticGameData, "heroes" | "regions" | "stages" | "styles" | "skillUpgrades">,
  raw: unknown
): ParseSaveDataResult {
  const errors = validateSaveData(data, raw);

  if (errors.length > 0) {
    return {
      ok: false,
      reason: "invalid_save",
      errors
    };
  }

  return {
    ok: true,
    save: cloneSaveData(raw as SaveData)
  };
}
