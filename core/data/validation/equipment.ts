import type { EquipmentDefinition, EquipmentEffect, EquipmentSetDefinition } from "../types";
import { BASE_STAT_KEYS, type StaticDataValidationContext } from "./shared";

const EQUIPMENT_SLOTS = ["weapon", "armor", "manual", "medicine"] as const;
const EQUIPMENT_RARITIES = ["common", "uncommon", "rare"] as const;
const EQUIPMENT_EFFECT_MODES = ["flat", "multiplier"] as const;

export function validateEquipment(
  equipment: EquipmentDefinition,
  context: Pick<StaticDataValidationContext, "styleIds" | "equipmentSetIds">
): string[] {
  const errors: string[] = [];

  if (!EQUIPMENT_SLOTS.includes(equipment.slot)) {
    errors.push(
      `Equipment ${equipment.id} slot must be one of ${EQUIPMENT_SLOTS.join(", ")}`
    );
  }

  if (!EQUIPMENT_RARITIES.includes(equipment.rarity)) {
    errors.push(
      `Equipment ${equipment.id} rarity must be one of ${EQUIPMENT_RARITIES.join(", ")}`
    );
  }

  if (equipment.allowedStyles.length === 0) {
    errors.push(`Equipment ${equipment.id} must allow at least one style`);
  }

  for (const styleId of equipment.allowedStyles) {
    if (!context.styleIds.has(styleId)) {
      errors.push(`Equipment ${equipment.id} references missing style ${styleId}`);
    }
  }

  if (equipment.setId && !context.equipmentSetIds.has(equipment.setId)) {
    errors.push(
      `Equipment ${equipment.id} references missing equipment set ${equipment.setId}`
    );
  }

  if (equipment.effects.length === 0) {
    errors.push(`Equipment ${equipment.id} must define at least one effect`);
  }

  for (const effect of equipment.effects) {
    errors.push(...validateEquipmentEffect(`Equipment ${equipment.id} effect`, effect));
  }

  const affixIds = new Set<string>();
  for (const affix of equipment.affixes ?? []) {
    if (typeof affix.id !== "string" || affix.id.length === 0) {
      errors.push(`Equipment ${equipment.id} affix id must be a non-empty string`);
    } else if (affixIds.has(affix.id)) {
      errors.push(`Equipment ${equipment.id} affix ${affix.id} is duplicated`);
    }
    affixIds.add(affix.id);

    if (typeof affix.name !== "string" || affix.name.length === 0) {
      errors.push(`Equipment ${equipment.id} affix ${affix.id} must define a name`);
    }

    if (affix.effects.length === 0) {
      errors.push(
        `Equipment ${equipment.id} affix ${affix.id} must define at least one effect`
      );
    }

    for (const effect of affix.effects) {
      errors.push(
        ...validateEquipmentEffect(
          `Equipment ${equipment.id} affix ${affix.id} effect`,
          effect
        )
      );
    }
  }

  return errors;
}

export function validateEquipmentEffect(
  ownerLabel: string,
  effect: EquipmentEffect
): string[] {
  const errors: string[] = [];

  if (!BASE_STAT_KEYS.includes(effect.stat)) {
    errors.push(
      `${ownerLabel} stat ${String(effect.stat)} must be a valid base stat`
    );
  }

  if (!EQUIPMENT_EFFECT_MODES.includes(effect.mode)) {
    errors.push(
      `${ownerLabel} mode must be one of ${EQUIPMENT_EFFECT_MODES.join(", ")}`
    );
  }

  if (typeof effect.value !== "number" || Number.isNaN(effect.value)) {
    errors.push(`${ownerLabel} value must be a number`);
  }

  return errors;
}

export function validateEquipmentSet(set: EquipmentSetDefinition): string[] {
  const errors: string[] = [];
  const bonusPieces = new Set<number>();

  if (typeof set.name !== "string" || set.name.length === 0) {
    errors.push(`Equipment set ${set.id} must define a name`);
  }

  if (set.bonuses.length === 0) {
    errors.push(`Equipment set ${set.id} must define at least one bonus`);
  }

  for (const bonus of set.bonuses) {
    if (!Number.isInteger(bonus.pieces) || bonus.pieces < 2) {
      errors.push(
        `Equipment set ${set.id} bonus pieces must be an integer >= 2`
      );
    } else if (bonusPieces.has(bonus.pieces)) {
      errors.push(
        `Equipment set ${set.id} bonus ${bonus.pieces} pieces is duplicated`
      );
    }
    bonusPieces.add(bonus.pieces);

    if (bonus.effects.length === 0) {
      errors.push(
        `Equipment set ${set.id} bonus ${bonus.pieces} must define at least one effect`
      );
    }

    for (const effect of bonus.effects) {
      errors.push(
        ...validateEquipmentEffect(
          `Equipment set ${set.id} bonus ${bonus.pieces} effect`,
          effect
        )
      );
    }
  }

  return errors;
}
