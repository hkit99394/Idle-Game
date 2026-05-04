import type {
  EnemyDefinition,
  FormationDefinition,
  HeroDefinition,
  RegionDefinition,
  SkillDefinition,
  StageDefinition,
  StaticGameData
} from "./types";
import {
  COMBAT_ROLES,
  FORMATION_SLOTS,
  TARGET_RULES,
  isCombatRole,
  isFormationSlot,
  isTargetRule
} from "../combat";

type EntityWithId = { id: string };

function duplicateIds(entities: EntityWithId[]): string[] {
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

function validateStats(
  ownerId: string,
  stats: HeroDefinition["baseStats"] | EnemyDefinition["baseStats"]
): string[] {
  const errors: string[] = [];

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

function validateHeroSkillRefs(
  heroes: HeroDefinition[],
  skillIds: Set<string>
): string[] {
  return heroes.flatMap((hero) =>
    hero.skillIds
      .filter((skillId) => !skillIds.has(skillId))
      .map((skillId) => `Hero ${hero.id} references missing skill ${skillId}`)
  );
}

function validateEnemySkillRefs(
  enemies: EnemyDefinition[],
  skillIds: Set<string>
): string[] {
  return enemies.flatMap((enemy) =>
    enemy.skillIds
      .filter((skillId) => !skillIds.has(skillId))
      .map((skillId) => `Enemy ${enemy.id} references missing skill ${skillId}`)
  );
}

function validateEnemy(enemy: EnemyDefinition): string[] {
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

function validateCombatRole(ownerLabel: string, role: unknown): string[] {
  return isCombatRole(role)
    ? []
    : [`${ownerLabel} combatRole must be one of ${COMBAT_ROLES.join(", ")}`];
}

function validateStageEnemyRefs(
  stages: StageDefinition[],
  enemyIds: Set<string>
): string[] {
  return stages.flatMap((stage) =>
    stage.enemyTeam.combatantIds
      .filter((enemyId) => !enemyIds.has(enemyId))
      .map((enemyId) => `Stage ${stage.id} references missing enemy ${enemyId}`)
  );
}

function validateRegionStageRefs(
  regions: RegionDefinition[],
  stageIds: Set<string>
): string[] {
  return regions.flatMap((region) =>
    region.stageIds
      .filter((stageId) => !stageIds.has(stageId))
      .map((stageId) => `Region ${region.id} references missing stage ${stageId}`)
  );
}

function validateSkill(skill: SkillDefinition): string[] {
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

  return errors;
}

function validateFormation(formation: FormationDefinition): string[] {
  const errors: string[] = [];
  const seenSlots = new Set<string>();

  for (const slot of formation.slots) {
    if (!isFormationSlot(slot)) {
      errors.push(
        `Formation ${formation.id} slot ${String(slot)} must be one of ${FORMATION_SLOTS.join(", ")}`
      );
      continue;
    }

    if (seenSlots.has(slot)) {
      errors.push(`Formation ${formation.id} slot ${slot} is duplicated`);
    }

    seenSlots.add(slot);
  }

  return errors;
}

function validateStage(stage: StageDefinition): string[] {
  const errors: string[] = [];

  if (stage.isBoss && stage.canFarmOffline) {
    errors.push(`Boss stage ${stage.id} cannot be marked for offline farming`);
  }

  if (stage.rewards.silver < 0 || stage.rewards.cultivation < 0 || stage.rewards.combatExperience < 0) {
    errors.push(`Stage ${stage.id} rewards must be non-negative`);
  }

  const placedCombatantIndexes = new Set<number>();

  for (const [slot, combatantIndexes] of Object.entries(
    stage.enemyTeam.formation ?? {}
  )) {
    if (!isFormationSlot(slot)) {
      errors.push(
        `Stage ${stage.id} enemyTeam formation slot ${slot} must be one of ${FORMATION_SLOTS.join(", ")}`
      );
      continue;
    }

    if (!Array.isArray(combatantIndexes)) {
      errors.push(`Stage ${stage.id} enemyTeam formation slot ${slot} must be an array`);
      continue;
    }

    for (const combatantIndex of combatantIndexes) {
      if (
        typeof combatantIndex !== "number" ||
        !Number.isInteger(combatantIndex) ||
        combatantIndex < 0 ||
        combatantIndex >= stage.enemyTeam.combatantIds.length
      ) {
        errors.push(
          `Stage ${stage.id} enemyTeam formation slot ${slot} has invalid combatant index ${String(combatantIndex)}`
        );
        continue;
      }

      if (placedCombatantIndexes.has(combatantIndex)) {
        errors.push(
          `Stage ${stage.id} enemyTeam formation places combatant index ${combatantIndex} more than once`
        );
      }

      placedCombatantIndexes.add(combatantIndex);
    }
  }

  return errors;
}

export function validateStaticGameData(data: StaticGameData): string[] {
  const errors: string[] = [];
  const entityGroups: Array<[string, EntityWithId[]]> = [
    ["hero", data.heroes],
    ["skill", data.skills],
    ["enemy", data.enemies],
    ["region", data.regions],
    ["stage", data.stages],
    ["upgrade", data.upgrades],
    ["formation", data.formations]
  ];

  for (const [label, entities] of entityGroups) {
    for (const id of duplicateIds(entities)) {
      errors.push(`Duplicate ${label} id ${id}`);
    }
  }

  const skillIds = new Set(data.skills.map((skill) => skill.id));
  const enemyIds = new Set(data.enemies.map((enemy) => enemy.id));
  const stageIds = new Set(data.stages.map((stage) => stage.id));

  errors.push(...validateHeroSkillRefs(data.heroes, skillIds));
  errors.push(...validateEnemySkillRefs(data.enemies, skillIds));
  errors.push(...validateStageEnemyRefs(data.stages, enemyIds));
  errors.push(...validateRegionStageRefs(data.regions, stageIds));

  for (const hero of data.heroes) {
    errors.push(...validateStats(hero.id, hero.baseStats));
    errors.push(...validateCombatRole(`Hero ${hero.id}`, hero.combatRole));
  }

  for (const enemy of data.enemies) {
    errors.push(...validateEnemy(enemy));
    errors.push(...validateCombatRole(`Enemy ${enemy.id}`, enemy.combatRole));
  }

  for (const skill of data.skills) {
    errors.push(...validateSkill(skill));
  }

  for (const stage of data.stages) {
    errors.push(...validateStage(stage));
  }

  for (const formation of data.formations) {
    errors.push(...validateFormation(formation));
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
