import type {
  EnemyDefinition,
  HeroDefinition,
  RegionDefinition,
  SkillDefinition,
  StageDefinition,
  StaticGameData
} from "./types";
import type { StatusEffectDefinition } from "../combat";

type EntityWithId = { id: string };

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

function validateUnlockConditionRefs(
  regions: RegionDefinition[],
  stageIds: Set<string>
): string[] {
  return regions.flatMap((region) =>
    region.unlockCondition.type === "stage_cleared" &&
    !stageIds.has(region.unlockCondition.stageId)
      ? [
          `Region ${region.id} references missing unlock stage ${region.unlockCondition.stageId}`
        ]
      : []
  );
}

function validateStageNextStageRefs(
  stages: StageDefinition[],
  stageIds: Set<string>
): string[] {
  return stages.flatMap((stage) =>
    stage.nextStageId !== null && !stageIds.has(stage.nextStageId)
      ? [`Stage ${stage.id} references missing next stage ${stage.nextStageId}`]
      : []
  );
}

function validateRegionStageMembership(
  regions: RegionDefinition[],
  stagesById: Map<string, StageDefinition>
): string[] {
  return regions.flatMap((region) =>
    region.stageIds.flatMap((stageId, index) => {
      const stage = stagesById.get(stageId);

      if (stage === undefined) {
        return [];
      }

      const errors: string[] = [];

      if (stage.regionId !== region.id) {
        errors.push(
          `Region ${region.id} includes stage ${stage.id} from ${stage.regionId}`
        );
      }

      if (stage.index !== index + 1) {
        errors.push(`Stage ${stage.id} index must match its region order`);
      }

      return errors;
    })
  );
}

function validateSkill(
  skill: SkillDefinition,
  statusEffectIds: Set<string>
): string[] {
  const errors: string[] = [];

  if (skill.cooldownSeconds < 0) {
    errors.push(`Skill ${skill.id} cooldownSeconds must be non-negative`);
  }

  if (skill.outerMultiplier < 0 || skill.innerMultiplier < 0) {
    errors.push(`Skill ${skill.id} damage multipliers must be non-negative`);
  }

  for (const effect of skill.effects) {
    if (effect.type === "apply_status") {
      if (
        effect.statusId === undefined ||
        !statusEffectIds.has(effect.statusId)
      ) {
        errors.push(`Skill ${skill.id} references missing status ${effect.statusId}`);
      }

      if (
        typeof effect.chance !== "number" ||
        effect.chance < 0 ||
        effect.chance > 1
      ) {
        errors.push(`Skill ${skill.id} status chance must be between 0 and 1`);
      }

      if (
        effect.durationSeconds !== undefined &&
        effect.durationSeconds <= 0
      ) {
        errors.push(
          `Skill ${skill.id} status durationSeconds must be greater than zero`
        );
      }

      if (
        effect.stacks !== undefined &&
        (!Number.isInteger(effect.stacks) || effect.stacks <= 0)
      ) {
        errors.push(`Skill ${skill.id} status stacks must be a positive integer`);
      }

      continue;
    }

    if (typeof effect.value !== "number" || Number.isNaN(effect.value)) {
      errors.push(
        `Skill ${skill.id} effect ${effect.type} value must be a number`
      );
    }
  }

  return errors;
}

function validateStatusEffect(status: StatusEffectDefinition): string[] {
  const errors: string[] = [];

  if (!statusCategories.has(status.category)) {
    errors.push(`Status ${status.id} category must be supported`);
  }

  if (!statusStackPolicies.has(status.stackPolicy)) {
    errors.push(`Status ${status.id} stackPolicy must be supported`);
  }

  if (status.durationSeconds <= 0) {
    errors.push(`Status ${status.id} durationSeconds must be greater than zero`);
  }

  if (!Number.isInteger(status.maxStacks) || status.maxStacks <= 0) {
    errors.push(`Status ${status.id} maxStacks must be a positive integer`);
  }

  if (
    status.tickIntervalSeconds !== undefined &&
    status.tickIntervalSeconds <= 0
  ) {
    errors.push(
      `Status ${status.id} tickIntervalSeconds must be greater than zero`
    );
  }

  if (!Array.isArray(status.dispelTags) || status.dispelTags.length === 0) {
    errors.push(`Status ${status.id} must have at least one dispel tag`);
  } else {
    for (const tag of status.dispelTags) {
      if (!statusDispelTags.has(tag)) {
        errors.push(`Status ${status.id} dispel tag ${tag} must be supported`);
      }
    }
  }

  if (
    typeof status.effects !== "object" ||
    status.effects === null ||
    Array.isArray(status.effects)
  ) {
    errors.push(`Status ${status.id} effects must be an object`);
    return errors;
  }

  if (
    status.tickIntervalSeconds !== undefined &&
    status.effects.outerDamagePerSecond === undefined
  ) {
    errors.push(
      `Status ${status.id} tickIntervalSeconds requires outerDamagePerSecond`
    );
  }

  for (const [effect, value] of Object.entries(status.effects)) {
    if (typeof value !== "number" || Number.isNaN(value)) {
      errors.push(`Status ${status.id} effect ${effect} must be a number`);
      continue;
    }

    if (value < 0) {
      errors.push(`Status ${status.id} effect ${effect} must be non-negative`);
    }
  }

  return errors;
}

function validateStage(stage: StageDefinition): string[] {
  const errors: string[] = [];

  if (stage.isBoss && stage.canFarmOffline) {
    errors.push(`Boss stage ${stage.id} cannot be marked for offline farming`);
  }

  if (
    stage.rewards.silver < 0 ||
    stage.rewards.cultivation < 0 ||
    stage.rewards.combatExperience < 0
  ) {
    errors.push(`Stage ${stage.id} rewards must be non-negative`);
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
    ["formation", data.formations],
    ["status effect", data.statusEffects]
  ];

  for (const [label, entities] of entityGroups) {
    for (const id of duplicateIds(entities)) {
      errors.push(`Duplicate ${label} id ${id}`);
    }
  }

  const skillIds = new Set(data.skills.map((skill) => skill.id));
  const enemyIds = new Set(data.enemies.map((enemy) => enemy.id));
  const stageIds = new Set(data.stages.map((stage) => stage.id));
  const stagesById = new Map(data.stages.map((stage) => [stage.id, stage]));
  const statusEffectIds = new Set(
    data.statusEffects.map((status) => status.id)
  );

  errors.push(...validateHeroSkillRefs(data.heroes, skillIds));
  errors.push(...validateEnemySkillRefs(data.enemies, skillIds));
  errors.push(...validateStageEnemyRefs(data.stages, enemyIds));
  errors.push(...validateRegionStageRefs(data.regions, stageIds));
  errors.push(...validateUnlockConditionRefs(data.regions, stageIds));
  errors.push(...validateStageNextStageRefs(data.stages, stageIds));
  errors.push(...validateRegionStageMembership(data.regions, stagesById));

  for (const hero of data.heroes) {
    errors.push(...validateStats(hero.id, hero.baseStats));
  }

  for (const enemy of data.enemies) {
    errors.push(...validateStats(enemy.id, enemy.baseStats));
  }

  for (const skill of data.skills) {
    errors.push(...validateSkill(skill, statusEffectIds));
  }

  for (const status of data.statusEffects) {
    errors.push(...validateStatusEffect(status));
  }

  for (const stage of data.stages) {
    errors.push(...validateStage(stage));
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
