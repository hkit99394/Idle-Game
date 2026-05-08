import type { EnemyDefinition, HeroDefinition, StaticGameData } from "../types";
import { COMBAT_ROLES, isCombatRole } from "../../combat";

export type EntityWithId = { id: string };

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
  ids: {
    heroIds: Set<string>;
    stageIds: Set<string>;
    styleIds: Set<string>;
  }
): string[] {
  const errors: string[] = [];

  switch (unlock.type) {
    case "always":
      return errors;

    case "stage_cleared":
      if (!ids.stageIds.has(unlock.stageId)) {
        errors.push(`${ownerLabel} references missing unlock stage ${unlock.stageId}`);
      }
      return errors;

    case "hero_level":
      if (!ids.heroIds.has(unlock.heroId)) {
        errors.push(`${ownerLabel} references missing unlock hero ${unlock.heroId}`);
      }
      if (!Number.isInteger(unlock.level) || unlock.level < 1) {
        errors.push(`${ownerLabel} hero_level unlock level must be an integer >= 1`);
      }
      return errors;

    case "style_mastery_level":
      if (!ids.styleIds.has(unlock.styleId)) {
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
