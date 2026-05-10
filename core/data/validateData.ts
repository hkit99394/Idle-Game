import type { StaticGameData } from "./types";
import {
  buildStaticDataIndexes,
  duplicateIds,
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
  validateStatusEffect
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
