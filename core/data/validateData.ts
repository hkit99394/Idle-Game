import {
  REGION_ALIAS_INDEX,
  STAGE_ALIAS_INDEX
} from "../compatibility";
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
  const errors: string[] = [];
  const entityGroups: Array<[string, EntityWithId[]]> = [
    ["assignment", data.assignments ?? []],
    ["hero", data.heroes],
    ["skill", data.skills],
    ["tactic", data.tactics],
    ["enemy", data.enemies],
    ["equipment", data.equipment],
    ["equipment set", data.equipmentSets ?? []],
    ["region", data.regions],
    ["stage", data.stages],
    ["upgrade", data.upgrades],
    ["formation", data.formations],
    ["style", data.styles],
    ["skill upgrade", data.skillUpgrades],
    ["status", data.statusEffects],
    ["medicine", data.medicines]
  ];

  for (const [label, entities] of entityGroups) {
    for (const id of duplicateIds(entities)) {
      errors.push(`Duplicate ${label} id ${id}`);
    }
  }

  errors.push(...validateCanonicalRegionStageIds(data));

  const validationContext = buildStaticDataIndexes(data);

  errors.push(...validateHeroSkillRefs(data.heroes, validationContext));
  errors.push(...validateHeroStyleRefs(data.heroes, validationContext));
  errors.push(...validateEnemySkillRefs(data.enemies, validationContext));
  errors.push(...validateEnemyStyleRefs(data.enemies, validationContext));
  errors.push(...validateStageEnemyRefs(data.stages, validationContext));
  errors.push(...validateStageEquipmentRefs(data.stages, validationContext));
  errors.push(...validateStageRegionRefs(data.stages, validationContext));
  errors.push(...validateStageNextRefs(data.stages, validationContext));
  errors.push(...validateRegionStageRefs(data.regions, validationContext));
  errors.push(...validateRegionStageOwnership(data.regions, data.stages));
  for (const region of data.regions) {
    errors.push(
      ...validateRegionBalanceTargets(
        region,
        validationContext,
        data.stages,
        data.enemies,
        data.skills
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

  for (const hero of data.heroes) {
    errors.push(...validateStats(hero.id, hero.baseStats));
    errors.push(...validateCombatRole(`Hero ${hero.id}`, hero.combatRole));
    errors.push(...validateUnlockCondition(`Hero ${hero.id}`, hero.unlock, validationContext));
  }

  for (const enemy of data.enemies) {
    errors.push(...validateEnemy(enemy));
    errors.push(...validateCombatRole(`Enemy ${enemy.id}`, enemy.combatRole));
  }

  for (const skill of data.skills) {
    errors.push(...validateSkill(skill, validationContext));
  }

  errors.push(...validateTacticPresets(data.tactics));

  for (const status of data.statusEffects) {
    errors.push(...validateStatusEffect(status));
  }

  for (const medicine of data.medicines) {
    errors.push(...validateMedicine(medicine, validationContext));
  }

  for (const equipment of data.equipment) {
    errors.push(...validateEquipment(equipment, validationContext));
  }

  for (const set of data.equipmentSets ?? []) {
    errors.push(...validateEquipmentSet(set));
  }

  for (const assignment of data.assignments ?? []) {
    errors.push(...validateAssignment(assignment, validationContext));
  }

  for (const skillUpgrade of data.skillUpgrades) {
    errors.push(...validateSkillUpgrade(skillUpgrade, validationContext));
  }

  for (const stage of data.stages) {
    errors.push(...validateStage(stage));
  }

  for (const upgrade of data.upgrades) {
    errors.push(...validateUpgrade(upgrade));
  }

  for (const formation of data.formations) {
    errors.push(...validateFormation(formation));
  }

  for (const style of data.styles) {
    errors.push(...validateMartialStyle(style, validationContext));
  }

  const thresholds = data.mastery.thresholds;
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
