import type { StaticGameData } from "./types";
import {
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

  const skillIds = new Set(data.skills.map((skill) => skill.id));
  const heroIds = new Set(data.heroes.map((hero) => hero.id));
  const enemyIds = new Set(data.enemies.map((enemy) => enemy.id));
  const equipmentIds = new Set(data.equipment.map((equipment) => equipment.id));
  const equipmentSetIds = new Set(
    (data.equipmentSets ?? []).map((set) => set.id)
  );
  const stageIds = new Set(data.stages.map((stage) => stage.id));
  const styleIds = new Set(data.styles.map((style) => style.id));
  const regionIds = new Set(data.regions.map((region) => region.id));
  const statusEffectIds = new Set(data.statusEffects.map((status) => status.id));
  const validationIds = {
    heroIds,
    stageIds,
    styleIds,
    regionIds,
    equipmentIds
  };

  errors.push(...validateHeroSkillRefs(data.heroes, skillIds));
  errors.push(...validateHeroStyleRefs(data.heroes, styleIds));
  errors.push(...validateEnemySkillRefs(data.enemies, skillIds));
  errors.push(...validateEnemyStyleRefs(data.enemies, styleIds));
  errors.push(...validateStageEnemyRefs(data.stages, enemyIds));
  errors.push(...validateStageEquipmentRefs(data.stages, equipmentIds));
  errors.push(...validateStageRegionRefs(data.stages, regionIds));
  errors.push(...validateStageNextRefs(data.stages, stageIds));
  errors.push(...validateRegionStageRefs(data.regions, stageIds));
  errors.push(...validateRegionStageOwnership(data.regions, data.stages));
  for (const region of data.regions) {
    errors.push(...validateRegionBalanceTargets(region));
    errors.push(
      ...validateUnlockCondition(
        `Region ${region.id}`,
        region.unlockCondition,
        validationIds
      )
    );
  }

  for (const hero of data.heroes) {
    errors.push(...validateStats(hero.id, hero.baseStats));
    errors.push(...validateCombatRole(`Hero ${hero.id}`, hero.combatRole));
    errors.push(...validateUnlockCondition(`Hero ${hero.id}`, hero.unlock, validationIds));
  }

  for (const enemy of data.enemies) {
    errors.push(...validateEnemy(enemy));
    errors.push(...validateCombatRole(`Enemy ${enemy.id}`, enemy.combatRole));
  }

  for (const skill of data.skills) {
    errors.push(...validateSkill(skill, statusEffectIds));
  }

  for (const status of data.statusEffects) {
    errors.push(...validateStatusEffect(status));
  }

  for (const medicine of data.medicines) {
    errors.push(...validateMedicine(medicine, stageIds));
  }

  for (const equipment of data.equipment) {
    errors.push(...validateEquipment(equipment, styleIds, equipmentSetIds));
  }

  for (const set of data.equipmentSets ?? []) {
    errors.push(...validateEquipmentSet(set));
  }

  for (const assignment of data.assignments ?? []) {
    errors.push(...validateAssignment(assignment, validationIds));
  }

  for (const skillUpgrade of data.skillUpgrades) {
    errors.push(...validateSkillUpgrade(skillUpgrade, skillIds, statusEffectIds));
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
    errors.push(...validateMartialStyle(style, validationIds));
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
