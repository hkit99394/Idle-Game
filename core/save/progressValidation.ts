import type { StaticGameData } from "../data";
import { getRegionIdAliases } from "../compatibility";
import { isFormationSlot } from "../combat";
import type { MedicineInventory } from "../combat";
import {
  ACTIVE_TEAM_SIZE,
  EQUIPMENT_SLOTS,
  STYLE_MASTERY_EXPERIENCE_PER_LEVEL,
  getStageById,
  isAssignmentUnlocked,
  isHeroEligibleForAssignment,
  isHeroUnlocked,
  isStageUnlocked,
  isKnownTacticId
} from "../progression";
import type {
  AssignmentProgress,
  EquipmentProgress,
  HeroProgress,
  MapProgress,
  PlayerProgress,
  ResourceState,
  SectProgress
} from "../progression";
import type { SaveValidationData, UnknownRecord } from "./saveTypes";
import {
  isRecord,
  validateIntegerRange,
  validateNumber,
  validateNumberMap,
  validateRecord
} from "./validationShared";

export function validateResources(
  value: unknown,
  errors: string[]
): value is ResourceState {
  if (!validateRecord(value, "progress.resources", errors)) {
    return false;
  }

  validateNumber(value.silver, "progress.resources.silver", errors);
  validateNumber(value.cultivation, "progress.resources.cultivation", errors);
  validateNumber(value.herbs, "progress.resources.herbs", errors);

  return true;
}

export function validateHeroProgress(
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

export function validateHeroes(
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

  const heroIds = new Set(data.heroes.map((hero) => hero.id));

  for (const heroId of Object.keys(value)) {
    if (!heroIds.has(heroId)) {
      errors.push(`progress.heroes.${heroId} must reference an existing hero`);
    }
  }

  return true;
}

export function validateSect(value: unknown, errors: string[]): value is SectProgress {
  if (!validateRecord(value, "progress.sect", errors)) {
    return false;
  }

  validateNumberMap(value.upgrades, "progress.sect.upgrades", errors);

  return true;
}

export function validateMapProgress(
  value: unknown,
  path: string,
  maxClearedStageIndex: number,
  errors: string[]
): value is MapProgress {
  if (!validateRecord(value, path, errors)) {
    return false;
  }

  validateNumber(value.combatExperience, `${path}.combatExperience`, errors);
  validateIntegerRange(
    value.highestClearedStageIndex,
    `${path}.highestClearedStageIndex`,
    0,
    maxClearedStageIndex,
    errors
  );

  return true;
}

function getUnknownRegionMapProgress(
  maps: UnknownRecord,
  regionId: string
): unknown {
  for (const alias of getRegionIdAliases(regionId)) {
    if (Object.hasOwn(maps, alias)) {
      return maps[alias];
    }
  }

  return undefined;
}

export function validateMaps(
  data: Pick<StaticGameData, "regions">,
  value: unknown,
  errors: string[]
): value is Record<string, MapProgress> {
  if (!validateRecord(value, "progress.maps", errors)) {
    return false;
  }

  const regionById = new Map(
    data.regions.flatMap((region) =>
      getRegionIdAliases(region.id).map(
        (regionId) => [regionId, region] as const
      )
    )
  );

  for (const mapId of Object.keys(value)) {
    const region = regionById.get(mapId);

    if (!region) {
      errors.push(`progress.maps.${mapId} must reference an existing region`);
      continue;
    }

    validateMapProgress(
      value[mapId],
      `progress.maps.${mapId}`,
      region.stageIds.length,
      errors
    );
  }

  return true;
}

export function validateStyleMastery(
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

export function isUnlockConditionMetForSave(
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
      const mapProgress = stage
        ? getUnknownRegionMapProgress(maps, stage.regionId)
        : undefined;

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

export function validateStyleBranches(
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

export function validateSkillUpgrades(
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

export function validateEquipmentProgress(
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

export function validateMedicineInventory(
  data: Pick<StaticGameData, "medicines">,
  value: unknown,
  errors: string[]
): value is MedicineInventory | undefined {
  if (value === undefined) {
    return true;
  }

  if (!validateRecord(value, "progress.medicineInventory", errors)) {
    return false;
  }

  const medicineIds = new Set(data.medicines.map((medicine) => medicine.id));

  for (const [medicineId, count] of Object.entries(value)) {
    if (!medicineIds.has(medicineId)) {
      errors.push(
        `progress.medicineInventory.${medicineId} must reference an existing medicine`
      );
    }

    if (
      validateNumber(count, `progress.medicineInventory.${medicineId}`, errors) &&
      (!Number.isInteger(count) || count < 0)
    ) {
      errors.push(
        `progress.medicineInventory.${medicineId} must be an integer >= 0`
      );
    }
  }

  return true;
}

export function validateAssignmentProgress(
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

export function validatePlayerFormation(
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

export function validateActiveHeroIds(
  data: Pick<StaticGameData, "heroes" | "stages" | "styles">,
  progress: PlayerProgress,
  value: unknown,
  errors: string[]
): value is PlayerProgress["activeHeroIds"] {
  if (value === undefined) {
    return true;
  }

  if (!Array.isArray(value)) {
    errors.push("progress.activeHeroIds must be an array");
    return false;
  }

  if (value.length < 1 || value.length > ACTIVE_TEAM_SIZE) {
    errors.push(
      `progress.activeHeroIds must contain 1-${ACTIVE_TEAM_SIZE} heroes`
    );
  }

  const heroIds = new Set(data.heroes.map((hero) => hero.id));
  const seenHeroIds = new Set<string>();

  for (const heroId of value) {
    if (typeof heroId !== "string") {
      errors.push("progress.activeHeroIds must contain hero ids");
      continue;
    }

    if (seenHeroIds.has(heroId)) {
      errors.push(`progress.activeHeroIds.${heroId} is duplicated`);
      continue;
    }
    seenHeroIds.add(heroId);

    if (!heroIds.has(heroId)) {
      errors.push(
        `progress.activeHeroIds.${heroId} must reference an existing hero`
      );
      continue;
    }

    if (!isHeroUnlocked(data, progress, heroId)) {
      errors.push(
        `progress.activeHeroIds.${heroId} must be unlocked by saved progress`
      );
    }
  }

  return true;
}

export function validateSelectedTacticId(
  data: Pick<StaticGameData, "tactics">,
  value: unknown,
  errors: string[]
): value is PlayerProgress["selectedTacticId"] {
  if (value === undefined) {
    return true;
  }

  if (!isKnownTacticId(data, value)) {
    errors.push("progress.selectedTacticId must reference an existing tactic");
    return false;
  }

  return true;
}

export function validateCurrentStage(
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

export function validateProgress(
  data: SaveValidationData,
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
  validateSelectedTacticId(data, value.selectedTacticId, errors);
  validateActiveHeroIds(data, value as PlayerProgress, value.activeHeroIds, errors);
  validatePlayerFormation(data, value.formation, errors);
  validateStyleMastery(data, value.styleMastery, errors);
  validateStyleBranches(data, value, value.styleBranches, errors);
  validateSkillUpgrades(data, value.skillUpgrades, errors);
  validateEquipmentProgress(data, value.equipment, errors);
  validateMedicineInventory(data, value.medicineInventory, errors);
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
