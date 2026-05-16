import {
  REGION_ALIAS_INDEX,
  STAGE_ALIAS_INDEX
} from "../compatibility";
import {
  normalizeStaticCombatSchemaAliases,
  validateStaticCombatSchemaAliases
} from "./combatSchemaAliases";
import type { StaticGameData, UnlockCondition } from "./types";
import {
  buildStaticDataIndexes,
  duplicateIds,
  isRecord,
  validateCombatRole,
  validateStats,
  validateUnlockCondition,
  type EntityWithId
} from "./validation/shared";
import {
  validateEnemy,
  validateEnemySkillRefs,
  validateEnemyStyleRefs,
  validateHeroSkillRefs,
  validateHeroStyleRefs,
  validateMedicine,
  validateSkill,
  validateStatusEffect,
  validateTacticPresets
} from "./validation/combat";
import {
  validateAssignment,
  validateMartialStyle,
  validateSkillUpgrade,
  validateUpgrade
} from "./validation/growth";
import { validateEquipment, validateEquipmentSet } from "./validation/equipment";
import {
  validateFormation,
  validateRegionBalanceTargets,
  validateRegionStageOwnership,
  validateRegionStageRefs,
  validateStage,
  validateStageEnemyRefs,
  validateStageEquipmentRefs,
  validateStageNextRefs,
  validateStageRegionRefs
} from "./validation/progression";

export function validateStaticGameData(data: StaticGameData): string[] {
  const errors: string[] = validateStaticCombatSchemaAliases(data);
  const normalizedData = normalizeStaticCombatSchemaAliases(data);
  const entityGroups: Array<[string, EntityWithId[]]> = [
    ["assignment", normalizedData.assignments ?? []],
    ["hero", normalizedData.heroes],
    ["skill", normalizedData.skills],
    ["tactic", normalizedData.tactics],
    ["enemy", normalizedData.enemies],
    ["equipment", normalizedData.equipment],
    ["equipment set", normalizedData.equipmentSets ?? []],
    ["region", normalizedData.regions],
    ["stage", normalizedData.stages],
    ["upgrade", normalizedData.upgrades],
    ["formation", normalizedData.formations],
    ["style", normalizedData.styles],
    ["skill upgrade", normalizedData.skillUpgrades],
    ["status", normalizedData.statusEffects],
    ["medicine", normalizedData.medicines]
  ];

  for (const [label, entities] of entityGroups) {
    for (const id of duplicateIds(entities)) {
      errors.push(`Duplicate ${label} id ${id}`);
    }
  }

  errors.push(...validateCanonicalRegionStageIds(normalizedData));

  const validationContext = buildStaticDataIndexes(normalizedData);

  errors.push(...validateHeroSkillRefs(normalizedData.heroes, validationContext));
  errors.push(...validateHeroStyleRefs(normalizedData.heroes, validationContext));
  errors.push(...validateEnemySkillRefs(normalizedData.enemies, validationContext));
  errors.push(...validateEnemyStyleRefs(normalizedData.enemies, validationContext));
  errors.push(...validateStageEnemyRefs(normalizedData.stages, validationContext));
  errors.push(...validateStageEquipmentRefs(normalizedData.stages, validationContext));
  errors.push(...validateStageRegionRefs(normalizedData.stages, validationContext));
  errors.push(...validateStageNextRefs(normalizedData.stages, validationContext));
  errors.push(...validateRegionStageRefs(normalizedData.regions, validationContext));
  errors.push(...validateRegionStageOwnership(normalizedData.regions, normalizedData.stages));
  for (const region of normalizedData.regions) {
    errors.push(
      ...validateRegionBalanceTargets(
        region,
        validationContext,
        normalizedData.stages,
        normalizedData.enemies,
        normalizedData.skills
      )
    );
    errors.push(
      ...validateUnlockCondition(
        `Region ${region.id}`,
        region.unlockCondition,
        validationContext
      )
    );
  }

  for (const hero of normalizedData.heroes) {
    errors.push(...validateStats(hero.id, hero.baseStats));
    errors.push(...validateCombatRole(`Hero ${hero.id}`, hero.combatRole));
    errors.push(...validateUnlockCondition(`Hero ${hero.id}`, hero.unlock, validationContext));
  }

  for (const enemy of normalizedData.enemies) {
    errors.push(...validateEnemy(enemy));
    errors.push(...validateCombatRole(`Enemy ${enemy.id}`, enemy.combatRole));
  }

  for (const skill of normalizedData.skills) {
    errors.push(...validateSkill(skill, validationContext));
  }

  errors.push(...validateTacticPresets(normalizedData.tactics));

  for (const status of normalizedData.statusEffects) {
    errors.push(...validateStatusEffect(status));
  }

  for (const medicine of normalizedData.medicines) {
    errors.push(...validateMedicine(medicine, validationContext));
  }

  for (const equipment of normalizedData.equipment) {
    errors.push(...validateEquipment(equipment, validationContext));
  }

  for (const set of normalizedData.equipmentSets ?? []) {
    errors.push(...validateEquipmentSet(set));
  }

  for (const assignment of normalizedData.assignments ?? []) {
    errors.push(...validateAssignment(assignment, validationContext));
  }

  for (const skillUpgrade of normalizedData.skillUpgrades) {
    errors.push(...validateSkillUpgrade(skillUpgrade, validationContext));
  }

  for (const stage of normalizedData.stages) {
    errors.push(...validateStage(stage));
  }

  for (const upgrade of normalizedData.upgrades) {
    errors.push(...validateUpgrade(upgrade));
  }

  for (const formation of normalizedData.formations) {
    errors.push(...validateFormation(formation));
  }

  for (const style of normalizedData.styles) {
    errors.push(...validateMartialStyle(style, validationContext));
  }

  const thresholds = normalizedData.mastery.thresholds;
  for (let index = 1; index < thresholds.length; index += 1) {
    if (thresholds[index].experience <= thresholds[index - 1].experience) {
      errors.push("Mastery thresholds must be sorted by increasing experience");
      break;
    }
  }

  return errors;
}

function validateCanonicalRegionStageIds(data: StaticGameData): string[] {
  const errors: string[] = [];

  for (const region of data.regions) {
    errors.push(...validateCanonicalRegionId(`Region ${region.id} id`, region.id));

    if (Array.isArray(region.stageIds)) {
      for (const [index, stageId] of region.stageIds.entries()) {
        errors.push(
          ...validateCanonicalStageId(
            `Region ${region.id} stageIds[${index}]`,
            stageId
          )
        );
      }
    }

    errors.push(
      ...validateCanonicalUnlockStageId(
        `Region ${region.id} unlockCondition.stageId`,
        region.unlockCondition
      )
    );

    const allowedRegressions =
      region.balanceTargets?.rewardCurve?.allowedRegressions;
    if (Array.isArray(allowedRegressions)) {
      for (const [index, allowance] of allowedRegressions.entries()) {
        if (!isRecord(allowance)) {
          continue;
        }

        errors.push(
          ...validateCanonicalStageId(
            `Region ${region.id} balanceTargets.rewardCurve.allowedRegressions[${index}].stageId`,
            allowance.stageId
          )
        );
      }
    }

    const budgetExceptions = region.balanceTargets?.budgetExceptions;
    if (Array.isArray(budgetExceptions)) {
      for (const [index, exception] of budgetExceptions.entries()) {
        if (!isRecord(exception)) {
          continue;
        }

        errors.push(
          ...validateCanonicalStageId(
            `Region ${region.id} balanceTargets.budgetExceptions[${index}].stageId`,
            exception.stageId
          )
        );
      }
    }
  }

  for (const stage of data.stages) {
    errors.push(...validateCanonicalStageId(`Stage ${stage.id} id`, stage.id));
    errors.push(
      ...validateCanonicalRegionId(`Stage ${stage.id} regionId`, stage.regionId)
    );

    if (stage.nextStageId !== null) {
      errors.push(
        ...validateCanonicalStageId(
          `Stage ${stage.id} nextStageId`,
          stage.nextStageId
        )
      );
    }
  }

  for (const hero of data.heroes) {
    errors.push(
      ...validateCanonicalUnlockStageId(`Hero ${hero.id} unlock.stageId`, hero.unlock)
    );
  }

  for (const medicine of data.medicines) {
    errors.push(
      ...validateCanonicalUnlockStageId(
        `Medicine ${medicine.id} unlock.stageId`,
        medicine.unlock
      )
    );
  }

  for (const assignment of data.assignments ?? []) {
    errors.push(
      ...validateCanonicalUnlockStageId(
        `Assignment ${assignment.id} unlockCondition.stageId`,
        assignment.unlockCondition
      )
    );
    errors.push(
      ...validateCanonicalRegionId(
        `Assignment ${assignment.id} rewardProfile.mapRegionId`,
        assignment.rewardProfile.mapRegionId
      )
    );
  }

  for (const style of data.styles) {
    for (const branch of style.branches) {
      errors.push(
        ...validateCanonicalUnlockStageId(
          `Style branch ${style.id}.${branch.id} unlock.stageId`,
          branch.unlock
        )
      );
    }
  }

  return errors;
}

function validateCanonicalUnlockStageId(
  ownerLabel: string,
  unlock: UnlockCondition
): string[] {
  return unlock.type === "stage_cleared"
    ? validateCanonicalStageId(ownerLabel, unlock.stageId)
    : [];
}

function validateCanonicalRegionId(ownerLabel: string, regionId: unknown): string[] {
  if (typeof regionId !== "string") {
    return [];
  }

  const alias = REGION_ALIAS_INDEX.getByLegacyId(regionId);
  return alias === null
    ? []
    : [
        `${ownerLabel} must use canonical region id ${alias.targetId} instead of legacy ${regionId}`
      ];
}

function validateCanonicalStageId(ownerLabel: string, stageId: unknown): string[] {
  if (typeof stageId !== "string") {
    return [];
  }

  const alias = STAGE_ALIAS_INDEX.getByLegacyId(stageId);
  return alias === null
    ? []
    : [
        `${ownerLabel} must use canonical stage id ${alias.targetId} instead of legacy ${stageId}`
      ];
}
