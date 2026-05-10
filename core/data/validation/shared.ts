import type { EnemyDefinition, HeroDefinition, StaticGameData } from "../types";
import { COMBAT_ROLES, isCombatRole } from "../../combat";

export type EntityWithId = { id: string };

export type StaticDataValidationContext = {
  heroIds: Set<string>;
  skillIds: Set<string>;
  enemyIds: Set<string>;
  equipmentIds: Set<string>;
  equipmentSetIds: Set<string>;
  stageIds: Set<string>;
  styleIds: Set<string>;
  regionIds: Set<string>;
  statusEffectIds: Set<string>;
};

export function buildStaticDataIndexes(
  data: StaticGameData
): StaticDataValidationContext {
  return {
    heroIds: new Set(data.heroes.map((hero) => hero.id)),
    skillIds: new Set(data.skills.map((skill) => skill.id)),
    enemyIds: new Set(data.enemies.map((enemy) => enemy.id)),
    equipmentIds: new Set(data.equipment.map((equipment) => equipment.id)),
    equipmentSetIds: new Set((data.equipmentSets ?? []).map((set) => set.id)),
    stageIds: new Set(data.stages.map((stage) => stage.id)),
    styleIds: new Set(data.styles.map((style) => style.id)),
    regionIds: new Set(data.regions.map((region) => region.id)),
    statusEffectIds: new Set(data.statusEffects.map((status) => status.id))
  };
}

export const BASE_STAT_KEYS = [
  "maxOuterHp",
  "maxInnerQi",
  "outerAttack",
  "innerAttack",
  "outerDefense",
  "innerDefense",
  "speed",
  "critChance",
  "critDamage",
  "breakPower",
  "breakResist",
  "innerRecoveryRate",
  "statusAccuracy",
  "statusResistance"
] as const;

export function duplicateIds(entities: EntityWithId[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const entity of entities) {
    if (seen.has(entity.id)) {
      duplicates.add(entity.id);
    }
    seen.add(entity.id);
  }

  return [...duplicates];
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateStats(
  ownerId: string,
  stats: HeroDefinition["baseStats"] | EnemyDefinition["baseStats"]
): string[] {
  const errors: string[] = [];

  for (const stat of BASE_STAT_KEYS) {
    if (stats[stat] === undefined) {
      errors.push(`${ownerId} stat ${stat} is required`);
    }
  }

  for (const [stat, value] of Object.entries(stats)) {
    if (typeof value !== "number" || Number.isNaN(value)) {
      errors.push(`${ownerId} stat ${stat} must be a number`);
      continue;
    }

    if (stat !== "breakPower" && stat !== "breakResist" && value < 0) {
      errors.push(`${ownerId} stat ${stat} must be non-negative`);
    }
  }

  if (stats.maxOuterHp <= 0) {
    errors.push(`${ownerId} maxOuterHp must be greater than zero`);
  }

  if (stats.maxInnerQi <= 0) {
    errors.push(`${ownerId} maxInnerQi must be greater than zero`);
  }

  return errors;
}

export function validateCombatRole(ownerLabel: string, role: unknown): string[] {
  return isCombatRole(role)
    ? []
    : [`${ownerLabel} combatRole must be one of ${COMBAT_ROLES.join(", ")}`];
}

export function validateUnlockCondition(
  ownerLabel: string,
  unlock: StaticGameData["regions"][number]["unlockCondition"],
  context: Pick<StaticDataValidationContext, "heroIds" | "stageIds" | "styleIds">
): string[] {
  const errors: string[] = [];

  switch (unlock.type) {
    case "always":
      return errors;

    case "stage_cleared":
      if (!context.stageIds.has(unlock.stageId)) {
        errors.push(`${ownerLabel} references missing unlock stage ${unlock.stageId}`);
      }
      return errors;

    case "hero_level":
      if (!context.heroIds.has(unlock.heroId)) {
        errors.push(`${ownerLabel} references missing unlock hero ${unlock.heroId}`);
      }
      if (!Number.isInteger(unlock.level) || unlock.level < 1) {
        errors.push(`${ownerLabel} hero_level unlock level must be an integer >= 1`);
      }
      return errors;

    case "style_mastery_level":
      if (!context.styleIds.has(unlock.styleId)) {
        errors.push(`${ownerLabel} references missing unlock style ${unlock.styleId}`);
      }
      if (!Number.isInteger(unlock.level) || unlock.level < 1) {
        errors.push(
          `${ownerLabel} style_mastery_level unlock level must be an integer >= 1`
        );
      }
      return errors;
  }
}
