import type { EnemyDefinition, HeroDefinition, MedicineDefinition, SkillDefinition, StatusEffectDefinition } from "../types";
import { SKILL_EFFECT_TYPES } from "../types";
import { TARGET_RULES, isTargetRule } from "../../combat";
import { validateStats, type StaticDataValidationContext } from "./shared";

const statusCategories = new Set([
  "damage",
  "control",
  "vulnerability",
  "recovery",
  "backlash"
]);
const statusStackPolicies = new Set(["refresh", "stack_intensity"]);
const statusDispelTags = new Set([
  "poison",
  "wound",
  "inner",
  "vulnerability",
  "backlash",
  "debuff"
]);
const statusEffectKeys = new Set([
  "outerDamagePerSecond",
  "healingReceivedMultiplier",
  "innerRecoveryMultiplier",
  "outerDamageTakenMultiplier",
  "attackBacklashOuterHpPercent"
]);
const medicineEffectTypes = new Set([
  "cleanse_status",
  "status_resistance_bonus"
]);

const SKILL_EFFECT_TARGETS = [
  "self",
  "target",
  "lowest_outer_hp_ally",
  "lowest_inner_qi_ally",
  "wounded_or_armor_broken_ally"
] as const;
const TIMED_SKILL_EFFECT_TYPES = [
  "outer_regeneration_percent",
  "inner_regeneration_percent",
  "wound",
  "speed_down",
  "inner_defense_down",
  "guard",
  "protect",
  "armor_break"
] as const;

export function validateHeroSkillRefs(
  heroes: HeroDefinition[],
  context: Pick<StaticDataValidationContext, "skillIds">
): string[] {
  return heroes.flatMap((hero) =>
    hero.skillIds
      .filter((skillId) => !context.skillIds.has(skillId))
      .map((skillId) => `Hero ${hero.id} references missing skill ${skillId}`)
  );
}

export function validateHeroStyleRefs(
  heroes: HeroDefinition[],
  context: Pick<StaticDataValidationContext, "styleIds">
): string[] {
  return heroes.flatMap((hero) =>
    context.styleIds.has(hero.style)
      ? []
      : [`Hero ${hero.id} references missing style ${hero.style}`]
  );
}

export function validateEnemySkillRefs(
  enemies: EnemyDefinition[],
  context: Pick<StaticDataValidationContext, "skillIds">
): string[] {
  return enemies.flatMap((enemy) =>
    enemy.skillIds
      .filter((skillId) => !context.skillIds.has(skillId))
      .map((skillId) => `Enemy ${enemy.id} references missing skill ${skillId}`)
  );
}

export function validateEnemyStyleRefs(
  enemies: EnemyDefinition[],
  context: Pick<StaticDataValidationContext, "styleIds">
): string[] {
  return enemies.flatMap((enemy) =>
    context.styleIds.has(enemy.style)
      ? []
      : [`Enemy ${enemy.id} references missing style ${enemy.style}`]
  );
}

export function validateEnemy(enemy: EnemyDefinition): string[] {
  const errors = validateStats(enemy.id, enemy.baseStats);

  if (
    typeof enemy.level !== "number" ||
    !Number.isFinite(enemy.level) ||
    !Number.isInteger(enemy.level) ||
    enemy.level < 1
  ) {
    errors.push(`Enemy ${enemy.id} level must be an integer >= 1`);
  }

  return errors;
}

export function validateSkillEffect(
  ownerLabel: string,
  effect: SkillDefinition["effects"][number],
  statusEffectIds: Set<string>
): string[] {
  const errors: string[] = [];

  if (!SKILL_EFFECT_TYPES.includes(effect.type)) {
    errors.push(
      `${ownerLabel} effect ${String(effect.type)} must be one of ${SKILL_EFFECT_TYPES.join(", ")}`
    );
  }

  if (effect.type === "apply_status") {
    if (!statusEffectIds.has(effect.statusId)) {
      errors.push(
        `${ownerLabel} effect apply_status references missing status ${effect.statusId}`
      );
    }

    if (
      typeof effect.chance !== "number" ||
      Number.isNaN(effect.chance) ||
      effect.chance < 0 ||
      effect.chance > 1
    ) {
      errors.push(`${ownerLabel} effect apply_status chance must be 0-1`);
    }

    if (
      effect.stacks !== undefined &&
      (!Number.isInteger(effect.stacks) || effect.stacks <= 0)
    ) {
      errors.push(`${ownerLabel} effect apply_status stacks must be positive`);
    }
  } else if (typeof effect.value !== "number" || Number.isNaN(effect.value)) {
    errors.push(
      `${ownerLabel} effect ${String(effect.type)} value must be a number`
    );
  }

  if (
    effect.target !== undefined &&
    !SKILL_EFFECT_TARGETS.includes(effect.target)
  ) {
    errors.push(
      `${ownerLabel} effect ${String(effect.type)} target must be one of ${SKILL_EFFECT_TARGETS.join(", ")}`
    );
  }

  if (
    (TIMED_SKILL_EFFECT_TYPES.includes(
      effect.type as (typeof TIMED_SKILL_EFFECT_TYPES)[number]
    ) ||
      effect.type === "apply_status") &&
    (typeof effect.durationSeconds !== "number" ||
      effect.durationSeconds <= 0 ||
      Number.isNaN(effect.durationSeconds))
  ) {
    errors.push(
      `${ownerLabel} effect ${effect.type} durationSeconds must be a positive number`
    );
  }

  return errors;
}

export function validateSkill(
  skill: SkillDefinition,
  context: Pick<StaticDataValidationContext, "statusEffectIds">
): string[] {
  const errors: string[] = [];

  if (skill.cooldownSeconds < 0) {
    errors.push(`Skill ${skill.id} cooldownSeconds must be non-negative`);
  }

  if (skill.outerMultiplier < 0 || skill.innerMultiplier < 0) {
    errors.push(`Skill ${skill.id} damage multipliers must be non-negative`);
  }

  if (!isTargetRule(skill.targetRule)) {
    errors.push(
      `Skill ${skill.id} targetRule must be one of ${TARGET_RULES.join(", ")}`
    );
  }

  for (const effect of skill.effects) {
    errors.push(
      ...validateSkillEffect(
        `Skill ${skill.id}`,
        effect,
        context.statusEffectIds
      )
    );
  }

  return errors;
}

export function validateStatusEffect(status: StatusEffectDefinition): string[] {
  const errors: string[] = [];

  if (!statusCategories.has(status.category)) {
    errors.push(`Status ${status.id} category must be supported`);
  }

  if (
    typeof status.durationSeconds !== "number" ||
    status.durationSeconds <= 0 ||
    Number.isNaN(status.durationSeconds)
  ) {
    errors.push(`Status ${status.id} durationSeconds must be positive`);
  }

  if (!Number.isInteger(status.maxStacks) || status.maxStacks <= 0) {
    errors.push(`Status ${status.id} maxStacks must be a positive integer`);
  }

  if (!statusStackPolicies.has(status.stackPolicy)) {
    errors.push(`Status ${status.id} stackPolicy must be supported`);
  }

  if (!Array.isArray(status.dispelTags) || status.dispelTags.length === 0) {
    errors.push(`Status ${status.id} must define at least one dispel tag`);
  } else {
    for (const tag of status.dispelTags) {
      if (!statusDispelTags.has(tag)) {
        errors.push(`Status ${status.id} dispel tag ${tag} must be supported`);
      }
    }
  }

  if (
    status.tickIntervalSeconds !== undefined &&
    (typeof status.tickIntervalSeconds !== "number" ||
      status.tickIntervalSeconds <= 0 ||
      Number.isNaN(status.tickIntervalSeconds))
  ) {
    errors.push(`Status ${status.id} tickIntervalSeconds must be positive`);
  }

  for (const [effectKey, value] of Object.entries(status.effects)) {
    if (!statusEffectKeys.has(effectKey)) {
      errors.push(`Status ${status.id} effect ${effectKey} must be supported`);
      continue;
    }

    if (typeof value !== "number" || Number.isNaN(value)) {
      errors.push(`Status ${status.id} effect ${effectKey} must be a number`);
    }
  }

  return errors;
}

export function validateMedicine(
  medicine: MedicineDefinition,
  context: Pick<StaticDataValidationContext, "stageIds">
): string[] {
  const errors: string[] = [];

  if (!Number.isInteger(medicine.maxCarry) || medicine.maxCarry <= 0) {
    errors.push(`Medicine ${medicine.id} maxCarry must be a positive integer`);
  }

  if (
    medicine.unlock.type === "stage_cleared" &&
    !context.stageIds.has(medicine.unlock.stageId)
  ) {
    errors.push(
      `Medicine ${medicine.id} references missing unlock stage ${medicine.unlock.stageId}`
    );
  }

  if (medicine.effects.length === 0) {
    errors.push(`Medicine ${medicine.id} must have at least one effect`);
  }

  for (const effect of medicine.effects) {
    if (!medicineEffectTypes.has(effect.type)) {
      errors.push(
        `Medicine ${medicine.id} effect ${effect.type} must be supported`
      );
      continue;
    }

    if (effect.type === "cleanse_status") {
      if (!Array.isArray(effect.dispelTags) || effect.dispelTags.length === 0) {
        errors.push(
          `Medicine ${medicine.id} cleanse effect must have at least one dispel tag`
        );
      } else {
        for (const tag of effect.dispelTags) {
          if (!statusDispelTags.has(tag)) {
            errors.push(
              `Medicine ${medicine.id} dispel tag ${tag} must be supported`
            );
          }
        }
      }

      if (
        effect.maxCount !== undefined &&
        (!Number.isInteger(effect.maxCount) || effect.maxCount <= 0)
      ) {
        errors.push(
          `Medicine ${medicine.id} cleanse maxCount must be a positive integer`
        );
      }

      continue;
    }

    if (effect.type === "status_resistance_bonus") {
      if (effect.value <= 0) {
        errors.push(
          `Medicine ${medicine.id} status resistance value must be positive`
        );
      }

      if (effect.durationSeconds <= 0) {
        errors.push(
          `Medicine ${medicine.id} status resistance durationSeconds must be positive`
        );
      }
    }
  }

  return errors;
}
