import type { AssignmentDefinition, MartialStyleDefinition, SkillUpgradeDefinition, StaticGameData } from "../types";
import { COMBAT_ROLES, MARTIAL_STYLE_IDS, isCombatRole, isMartialStyleId } from "../../combat";
import {
  BASE_STAT_KEYS,
  validateUnlockCondition,
  type StaticDataValidationContext
} from "./shared";
import { validateSkillEffect } from "./combat";

const ASSIGNMENT_TYPES = ["patrol", "training_ground"] as const;
const ASSIGNMENT_DURATION_BUCKETS = ["short", "medium", "long"] as const;

export function validateAssignment(
  assignment: AssignmentDefinition,
  context: Pick<
    StaticDataValidationContext,
    "heroIds" | "stageIds" | "styleIds" | "regionIds" | "equipmentIds"
  >
): string[] {
  const errors: string[] = [];

  if (!ASSIGNMENT_TYPES.includes(assignment.type)) {
    errors.push(
      `Assignment ${assignment.id} type must be one of ${ASSIGNMENT_TYPES.join(", ")}`
    );
  }

  if (!ASSIGNMENT_DURATION_BUCKETS.includes(assignment.durationBucket)) {
    errors.push(
      `Assignment ${assignment.id} durationBucket must be one of ${ASSIGNMENT_DURATION_BUCKETS.join(", ")}`
    );
  }

  errors.push(
    ...validateUnlockCondition(
      `Assignment ${assignment.id}`,
      assignment.unlockCondition,
      context
    )
  );

  if (assignment.allowedRoles.length === 0) {
    errors.push(`Assignment ${assignment.id} must allow at least one role`);
  }

  for (const role of assignment.allowedRoles) {
    if (!isCombatRole(role)) {
      errors.push(
        `Assignment ${assignment.id} role ${String(role)} must be one of ${COMBAT_ROLES.join(", ")}`
      );
    }
  }

  if (assignment.allowedStyles.length === 0) {
    errors.push(`Assignment ${assignment.id} must allow at least one style`);
  }

  for (const styleId of assignment.allowedStyles) {
    if (!context.styleIds.has(styleId)) {
      errors.push(`Assignment ${assignment.id} references missing style ${styleId}`);
    }
  }

  const rewards = assignment.rewardProfile;
  const rewardValues = [
    rewards.silverPerHour,
    rewards.cultivationPerHour,
    rewards.herbsPerHour,
    rewards.combatExperiencePerHour,
    rewards.styleMasteryExperiencePerHour
  ].filter((value): value is number => value !== undefined);

  for (const value of rewardValues) {
    if (typeof value !== "number" || Number.isNaN(value) || value < 0) {
      errors.push(`Assignment ${assignment.id} reward values must be non-negative numbers`);
      break;
    }
  }

  if (rewards.mapRegionId && !context.regionIds.has(rewards.mapRegionId)) {
    errors.push(
      `Assignment ${assignment.id} references missing reward map ${rewards.mapRegionId}`
    );
  }

  for (const reward of rewards.equipmentRewardsPerHour ?? []) {
    if (!context.equipmentIds.has(reward.equipmentId)) {
      errors.push(
        `Assignment ${assignment.id} references missing reward equipment ${reward.equipmentId}`
      );
    }

    if (
      typeof reward.quantityPerHour !== "number" ||
      Number.isNaN(reward.quantityPerHour) ||
      reward.quantityPerHour < 0
    ) {
      errors.push(
        `Assignment ${assignment.id} equipment reward quantityPerHour must be a non-negative number`
      );
    }
  }

  if (
    rewardValues.length === 0 &&
    (rewards.equipmentRewardsPerHour ?? []).length === 0
  ) {
    errors.push(`Assignment ${assignment.id} must define at least one reward`);
  }

  return errors;
}

export function validateSkillUpgrade(
  skillUpgrade: SkillUpgradeDefinition,
  context: Pick<StaticDataValidationContext, "skillIds" | "statusEffectIds">
): string[] {
  const errors: string[] = [];

  if (!context.skillIds.has(skillUpgrade.skillId)) {
    errors.push(
      `Skill upgrade ${skillUpgrade.id} references missing skill ${skillUpgrade.skillId}`
    );
  }

  if (skillUpgrade.costResource !== "cultivation") {
    errors.push(`Skill upgrade ${skillUpgrade.id} costResource must be cultivation`);
  }

  if (skillUpgrade.baseCost < 0 || skillUpgrade.costGrowth < 1) {
    errors.push(
      `Skill upgrade ${skillUpgrade.id} costs must be non-negative with growth >= 1`
    );
  }

  if (!Number.isInteger(skillUpgrade.maxLevel) || skillUpgrade.maxLevel < 1) {
    errors.push(`Skill upgrade ${skillUpgrade.id} maxLevel must be an integer >= 1`);
  }

  for (const effect of skillUpgrade.effects) {
    if (effect.type === "add_skill_effect") {
      if (!Number.isInteger(effect.unlockLevel) || effect.unlockLevel < 1) {
        errors.push(
          `Skill upgrade ${skillUpgrade.id} add_skill_effect unlockLevel must be an integer >= 1`
        );
      }
      errors.push(
        ...validateSkillEffect(
          `Skill upgrade ${skillUpgrade.id} add_skill_effect`,
          effect.effect,
          context.statusEffectIds
        )
      );
      continue;
    }

    if (
      typeof effect.valuePerLevel !== "number" ||
      Number.isNaN(effect.valuePerLevel)
    ) {
      errors.push(
        `Skill upgrade ${skillUpgrade.id} effect ${effect.type} valuePerLevel must be a number`
      );
    }
  }

  return errors;
}

export function validateUpgrade(upgrade: StaticGameData["upgrades"][number]): string[] {
  const errors: string[] = [];

  if (upgrade.art !== "outer" && upgrade.art !== "inner") {
    errors.push(`Upgrade ${upgrade.id} art must be outer or inner`);
  }

  if (upgrade.baseCost < 0 || upgrade.costGrowth < 1) {
    errors.push(`Upgrade ${upgrade.id} costs must be non-negative with growth >= 1`);
  }

  if (upgrade.effects.length === 0) {
    errors.push(`Upgrade ${upgrade.id} must define at least one effect`);
  }

  for (const effect of upgrade.effects) {
    if (!BASE_STAT_KEYS.includes(effect.stat)) {
      errors.push(
        `Upgrade ${upgrade.id} effect stat ${String(effect.stat)} must be a valid base stat`
      );
    }

    if (
      effect.mode !== undefined &&
      effect.mode !== "multiplier" &&
      effect.mode !== "flat"
    ) {
      errors.push(`Upgrade ${upgrade.id} effect ${effect.stat} mode must be multiplier or flat`);
    }

    if (effect.mode === "flat" && effect.stat !== "statusResistance") {
      errors.push(`Upgrade ${upgrade.id} flat effects are only supported for statusResistance`);
    }

    if (
      typeof effect.effectPerLevel !== "number" ||
      Number.isNaN(effect.effectPerLevel)
    ) {
      errors.push(
        `Upgrade ${upgrade.id} effect ${effect.stat} effectPerLevel must be a number`
      );
    }
  }

  return errors;
}

export function validateMartialStyle(
  style: MartialStyleDefinition,
  context: Pick<StaticDataValidationContext, "heroIds" | "stageIds" | "styleIds">
): string[] {
  const errors: string[] = [];

  if (!isMartialStyleId(style.id)) {
    errors.push(
      `Style ${style.id} id must be one of ${MARTIAL_STYLE_IDS.join(", ")}`
    );
  }

  for (const bonus of style.bonuses) {
    if (
      typeof bonus.effectPerLevel !== "number" ||
      Number.isNaN(bonus.effectPerLevel)
    ) {
      errors.push(
        `Style ${style.id} bonus ${bonus.stat} effectPerLevel must be a number`
      );
    }
  }

  for (const branch of style.branches) {
    errors.push(
      ...validateUnlockCondition(
        `Style branch ${style.id}.${branch.id}`,
        branch.unlock,
        context
      )
    );

    if (typeof branch.hiddenInMvp !== "boolean") {
      errors.push(`Style branch ${style.id}.${branch.id} hiddenInMvp must be a boolean`);
    }

    if (branch.effects.length === 0) {
      errors.push(`Style branch ${style.id}.${branch.id} must define at least one effect`);
    }

    for (const effect of branch.effects) {
      if (effect.type !== "stat_multiplier") {
        errors.push(
          `Style branch ${style.id}.${branch.id} effect type must be stat_multiplier`
        );
      }

      if (!BASE_STAT_KEYS.includes(effect.stat)) {
        errors.push(
          `Style branch ${style.id}.${branch.id} effect stat ${String(effect.stat)} must be a valid base stat`
        );
      }

      if (typeof effect.value !== "number" || Number.isNaN(effect.value)) {
        errors.push(
          `Style branch ${style.id}.${branch.id} effect value must be a number`
        );
      }
    }
  }

  return errors;
}
