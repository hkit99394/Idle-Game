import type {
  EnemyDefinition,
  HeroDefinition,
  MedicineDefinition,
  SkillDefinition,
  StatusEffectDefinition,
  TacticBehaviorFlag,
  TacticModifierType,
  TacticPresetDefinition
} from "../types";
import {
  SKILL_EFFECT_TYPES,
  TACTIC_BEHAVIOR_FLAGS,
  TACTIC_MODIFIER_TYPES
} from "../types";
import { DEFAULT_TACTIC_ID, TARGET_RULES, isTargetRule } from "../../combat";
import {
  isRecord,
  validateStats,
  type StaticDataValidationContext
} from "./shared";

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
  "bodyIntegrityDamagePerSecond",
  "healingReceivedMultiplier",
  "contextRebuildMultiplier",
  "kineticDamageTakenMultiplier",
  "feedbackBodyIntegrityPercent"
]);
const medicineEffectTypes = new Set([
  "cleanse_status",
  "status_resistance_bonus"
]);
const tacticBehaviorFlags = new Set(TACTIC_BEHAVIOR_FLAGS);
const tacticModifierTypes = new Set(TACTIC_MODIFIER_TYPES);
const tacticMultiplierModifierTypes = new Set<TacticModifierType>([
  "kinetic_damage_multiplier",
  "cognitive_damage_multiplier",
  "breach_power_multiplier",
  "boss_damage_multiplier",
  "guard_multiplier",
  "protection_multiplier",
  "healing_multiplier"
]);
const tacticModifierBehaviorFlags = {
  kinetic_damage_multiplier: "damage",
  cognitive_damage_multiplier: "damage",
  breach_power_multiplier: "damage",
  boss_damage_multiplier: "damage",
  guard_multiplier: "defense",
  protection_multiplier: "defense",
  healing_multiplier: "recovery",
  status_resistance_bonus: "medicine"
} as const satisfies Record<TacticModifierType, TacticBehaviorFlag>;

const SKILL_EFFECT_TARGETS = [
  "self",
  "target",
  "lowest_body_integrity_ally",
  "lowest_context_stability_ally",
  "wounded_or_armor_broken_ally"
] as const;
const TIMED_SKILL_EFFECT_TYPES = [
  "body_integrity_regeneration_percent",
  "context_stability_regeneration_percent",
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

  if (skill.kineticMultiplier < 0 || skill.cognitiveMultiplier < 0) {
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

function tacticLabel(tactic: TacticPresetDefinition): string {
  return typeof tactic.id === "string" && tactic.id.length > 0
    ? `Tactic ${tactic.id}`
    : "Tactic";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateTacticBehaviorFlags(
  tactic: TacticPresetDefinition
): {
  errors: string[];
  flags: Set<TacticBehaviorFlag>;
  rawCount: number;
} {
  const label = tacticLabel(tactic);
  const errors: string[] = [];
  const flags = new Set<TacticBehaviorFlag>();
  const seen = new Set<string>();

  if (!Array.isArray(tactic.behaviorFlags)) {
    return {
      errors: [`${label} behaviorFlags must be an array`],
      flags,
      rawCount: 0
    };
  }

  for (const flag of tactic.behaviorFlags) {
    if (typeof flag !== "string" || !tacticBehaviorFlags.has(flag as TacticBehaviorFlag)) {
      errors.push(`${label} behaviorFlags includes unsupported flag ${String(flag)}`);
      continue;
    }

    if (seen.has(flag)) {
      errors.push(`${label} behaviorFlags duplicates ${flag}`);
    }

    seen.add(flag);
    flags.add(flag as TacticBehaviorFlag);
  }

  return {
    errors,
    flags,
    rawCount: tactic.behaviorFlags.length
  };
}

function validateTacticTargetPriorities(
  tactic: TacticPresetDefinition
): {
  errors: string[];
  count: number;
} {
  const label = tacticLabel(tactic);
  const errors: string[] = [];
  const priorities = tactic.targetPriorities;
  const seen = new Set<string>();

  if (priorities === undefined) {
    return { errors, count: 0 };
  }

  if (!Array.isArray(priorities)) {
    return {
      errors: [`${label} targetPriorities must be an array`],
      count: 0
    };
  }

  if (priorities.length === 0) {
    errors.push(`${label} targetPriorities must define at least one target rule when present`);
  }

  for (const targetRule of priorities) {
    if (!isTargetRule(targetRule)) {
      errors.push(
        `${label} targetPriorities includes unsupported target rule ${String(targetRule)}`
      );
      continue;
    }

    if (seen.has(targetRule)) {
      errors.push(`${label} targetPriorities duplicates ${targetRule}`);
    }

    seen.add(targetRule);
  }

  return {
    errors,
    count: priorities.length
  };
}

function validateTacticModifierValue(
  label: string,
  type: TacticModifierType,
  value: unknown
): string[] {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return [`${label} modifier ${type} value must be a finite number`];
  }

  if (tacticMultiplierModifierTypes.has(type) && (value < 0.5 || value > 1.5)) {
    return [`${label} modifier ${type} value must be between 0.5 and 1.5`];
  }

  if (type === "status_resistance_bonus" && (value < 0 || value > 0.5)) {
    return [`${label} modifier ${type} value must be between 0 and 0.5`];
  }

  return [];
}

function validateTacticModifiers(
  tactic: TacticPresetDefinition,
  flags: Set<TacticBehaviorFlag>
): {
  errors: string[];
  count: number;
  modifierFlags: Set<TacticBehaviorFlag>;
} {
  const label = tacticLabel(tactic);
  const errors: string[] = [];
  const modifierFlags = new Set<TacticBehaviorFlag>();
  const seen = new Set<string>();

  if (!Array.isArray(tactic.modifiers)) {
    return {
      errors: [`${label} modifiers must be an array`],
      count: 0,
      modifierFlags
    };
  }

  for (const [index, modifier] of tactic.modifiers.entries()) {
    if (!isRecord(modifier)) {
      errors.push(`${label} modifiers[${index}] must be an object`);
      continue;
    }

    const type = modifier.type;

    if (
      typeof type !== "string" ||
      !tacticModifierTypes.has(type as TacticModifierType)
    ) {
      errors.push(`${label} modifier ${String(type)} must be supported`);
      continue;
    }

    const modifierType = type as TacticModifierType;
    const requiredFlag = tacticModifierBehaviorFlags[modifierType];

    if (seen.has(modifierType)) {
      errors.push(`${label} modifiers duplicates ${modifierType}`);
    }

    seen.add(modifierType);
    modifierFlags.add(requiredFlag);
    errors.push(...validateTacticModifierValue(label, modifierType, modifier.value));

    if (!flags.has(requiredFlag)) {
      errors.push(
        `${label} modifier ${modifierType} requires behavior flag ${requiredFlag}`
      );
    }
  }

  return {
    errors,
    count: tactic.modifiers.length,
    modifierFlags
  };
}

export function validateTacticPreset(tactic: TacticPresetDefinition): string[] {
  const label = tacticLabel(tactic);
  const errors: string[] = [];

  if (!isNonEmptyString(tactic.id)) {
    errors.push(`${label} id must be a non-empty string`);
  }

  if (!isNonEmptyString(tactic.name)) {
    errors.push(`${label} must define a name`);
  }

  if (!isNonEmptyString(tactic.description)) {
    errors.push(`${label} must define a description`);
  }

  if (tactic.isDefault !== undefined && typeof tactic.isDefault !== "boolean") {
    errors.push(`${label} isDefault must be a boolean`);
  }

  const behavior = validateTacticBehaviorFlags(tactic);
  const targeting = validateTacticTargetPriorities(tactic);
  const modifiers = validateTacticModifiers(tactic, behavior.flags);

  errors.push(...behavior.errors, ...targeting.errors, ...modifiers.errors);

  const isDefault = tactic.isDefault === true;

  if (isDefault) {
    if (behavior.rawCount > 0) {
      errors.push(`${label} is the default tactic and must not define behavior flags`);
    }

    if (targeting.count > 0) {
      errors.push(`${label} is the default tactic and must not define target priorities`);
    }

    if (modifiers.count > 0) {
      errors.push(`${label} is the default tactic and must not define modifiers`);
    }

    return errors;
  }

  if (Array.isArray(tactic.behaviorFlags) && behavior.flags.size === 0) {
    errors.push(`${label} must define at least one behavior flag`);
  }

  if (targeting.count > 0 && !behavior.flags.has("targeting")) {
    errors.push(`${label} targetPriorities requires behavior flag targeting`);
  }

  if (behavior.flags.has("targeting") && targeting.count === 0) {
    errors.push(`${label} behavior flag targeting requires targetPriorities`);
  }

  for (const flag of behavior.flags) {
    if (flag === "targeting") {
      continue;
    }

    if (!modifiers.modifierFlags.has(flag)) {
      errors.push(`${label} behavior flag ${flag} requires at least one matching modifier`);
    }
  }

  if (targeting.count === 0 && modifiers.count === 0) {
    errors.push(`${label} must define target priorities or modifiers`);
  }

  return errors;
}

export function validateTacticPresets(tactics: TacticPresetDefinition[]): string[] {
  const errors: string[] = [];
  const defaultTactics = tactics.filter((tactic) => tactic.isDefault === true);
  const balanced = tactics.find((tactic) => tactic.id === DEFAULT_TACTIC_ID);

  if (defaultTactics.length !== 1) {
    errors.push("Tactics must define exactly one default preset");
  } else if (defaultTactics[0].id !== DEFAULT_TACTIC_ID) {
    errors.push("Default tactic must be balanced_routine");
  }

  if (balanced === undefined) {
    errors.push("Tactics must include balanced_routine default preset");
  } else if (balanced.isDefault !== true) {
    errors.push("Tactic balanced_routine must be marked as the default preset");
  }

  for (const tactic of tactics) {
    errors.push(...validateTacticPreset(tactic));
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
