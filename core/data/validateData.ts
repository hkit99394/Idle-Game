import type {
  AssignmentDefinition,
  EnemyDefinition,
  EquipmentDefinition,
  EquipmentEffect,
  EquipmentSetDefinition,
  FormationDefinition,
  HeroDefinition,
  MartialStyleDefinition,
  MedicineDefinition,
  RegionDefinition,
  SkillUpgradeDefinition,
  SkillDefinition,
  StatusEffectDefinition,
  StageDefinition,
  StaticGameData
} from "./types";
import {
  COMBAT_ROLES,
  FORMATION_SLOTS,
  MARTIAL_STYLE_IDS,
  TARGET_RULES,
  isCombatRole,
  isFormationSlot,
  isMartialStyleId,
  isTargetRule
} from "../combat";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateClearTimeTargetRange(
  ownerLabel: string,
  value: unknown
): string[] {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return [`${ownerLabel} must be an object`];
  }

  if (typeof value.min !== "number" || !Number.isFinite(value.min)) {
    errors.push(`${ownerLabel}.min must be a finite number`);
  }

  if (typeof value.max !== "number" || !Number.isFinite(value.max)) {
    errors.push(`${ownerLabel}.max must be a finite number`);
  }

  if (
    typeof value.min === "number" &&
    Number.isFinite(value.min) &&
    value.min < 0
  ) {
    errors.push(`${ownerLabel}.min must be non-negative`);
  }

  if (
    typeof value.max === "number" &&
    Number.isFinite(value.max) &&
    value.max <= 0
  ) {
    errors.push(`${ownerLabel}.max must be greater than zero`);
  }

  if (
    typeof value.min === "number" &&
    Number.isFinite(value.min) &&
    typeof value.max === "number" &&
    Number.isFinite(value.max) &&
    value.min > value.max
  ) {
    errors.push(`${ownerLabel}.min must be less than or equal to max`);
  }

  return errors;
}

function validateRegionBalanceTargets(region: RegionDefinition): string[] {
  const targets = region.balanceTargets;

  if (targets === undefined) {
    return [];
  }

  if (!isRecord(targets)) {
    return [`Region ${region.id} balanceTargets must be an object`];
  }

  if (!isRecord(targets.clearTimeSeconds)) {
    return [
      `Region ${region.id} balanceTargets.clearTimeSeconds must be an object`
    ];
  }

  const clearTimeSeconds = targets.clearTimeSeconds;
  const errors = [
    ...validateClearTimeTargetRange(
      `Region ${region.id} balanceTargets.clearTimeSeconds.normal`,
      clearTimeSeconds.normal
    ),
    ...validateClearTimeTargetRange(
      `Region ${region.id} balanceTargets.clearTimeSeconds.elite`,
      clearTimeSeconds.elite
    )
  ];

  if (clearTimeSeconds.boss !== undefined) {
    errors.push(
      ...validateClearTimeTargetRange(
        `Region ${region.id} balanceTargets.clearTimeSeconds.boss`,
        clearTimeSeconds.boss
      )
    );
  }

  return errors;
}

function validateStats(
  ownerId: string,
  stats: HeroDefinition["baseStats"] | EnemyDefinition["baseStats"]
): string[] {
  const errors: string[] = [];

  for (const stat of BASE_STAT_KEYS) {
    if (stats[stat] === undefined) {
      errors.push(`${ownerId} stat ${stat} is required`);
    }
  }

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

function validateHeroStyleRefs(
  heroes: HeroDefinition[],
  styleIds: Set<string>
): string[] {
  return heroes.flatMap((hero) =>
    styleIds.has(hero.style)
      ? []
      : [`Hero ${hero.id} references missing style ${hero.style}`]
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

function validateEnemyStyleRefs(
  enemies: EnemyDefinition[],
  styleIds: Set<string>
): string[] {
  return enemies.flatMap((enemy) =>
    styleIds.has(enemy.style)
      ? []
      : [`Enemy ${enemy.id} references missing style ${enemy.style}`]
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

function validateStageEquipmentRefs(
  stages: StageDefinition[],
  equipmentIds: Set<string>
): string[] {
  return stages.flatMap((stage) =>
    (stage.equipmentDrops ?? []).flatMap((drop) =>
      equipmentIds.has(drop.equipmentId)
        ? []
        : [`Stage ${stage.id} references missing equipment ${drop.equipmentId}`]
    )
  );
}

function validateStageRegionRefs(
  stages: StageDefinition[],
  regionIds: Set<string>
): string[] {
  return stages.flatMap((stage) =>
    regionIds.has(stage.regionId)
      ? []
      : [`Stage ${stage.id} references missing region ${stage.regionId}`]
  );
}

function validateStageNextRefs(
  stages: StageDefinition[],
  stageIds: Set<string>
): string[] {
  return stages.flatMap((stage) =>
    stage.nextStageId === null || stageIds.has(stage.nextStageId)
      ? []
      : [`Stage ${stage.id} references missing next stage ${stage.nextStageId}`]
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

function validateRegionStageOwnership(
  regions: RegionDefinition[],
  stages: StageDefinition[]
): string[] {
  const stagesById = new Map(stages.map((stage) => [stage.id, stage]));

  return regions.flatMap((region) =>
    region.stageIds.flatMap((stageId) => {
      const stage = stagesById.get(stageId);

      return stage && stage.regionId !== region.id
        ? [
            `Region ${region.id} includes stage ${stageId} from region ${stage.regionId}`
          ]
        : [];
    })
  );
}

function validateSkillEffect(
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

  if (!isTargetRule(skill.targetRule)) {
    errors.push(
      `Skill ${skill.id} targetRule must be one of ${TARGET_RULES.join(", ")}`
    );
  }

  for (const effect of skill.effects) {
    errors.push(...validateSkillEffect(`Skill ${skill.id}`, effect, statusEffectIds));
  }

  return errors;
}

const EQUIPMENT_SLOTS = ["weapon", "armor", "manual", "medicine"] as const;
const EQUIPMENT_RARITIES = ["common", "uncommon", "rare"] as const;
const EQUIPMENT_EFFECT_MODES = ["flat", "multiplier"] as const;
const ASSIGNMENT_TYPES = ["patrol", "training_ground"] as const;
const ASSIGNMENT_DURATION_BUCKETS = ["short", "medium", "long"] as const;
const SKILL_EFFECT_TYPES = [
  "outer_heal_percent",
  "inner_heal_percent",
  "outer_regeneration_percent",
  "inner_regeneration_percent",
  "wound",
  "cleanse",
  "speed_down",
  "inner_defense_down",
  "guard",
  "protect",
  "armor_break",
  "apply_status"
] as const;
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

const BASE_STAT_KEYS = [
  "maxOuterHp",
  "maxInnerQi",
  "outerAttack",
  "innerAttack",
  "outerDefense",
  "innerDefense",
  "speed",
  "critChance",
  "critDamage",
  "breakPower",
  "breakResist",
  "innerRecoveryRate",
  "statusAccuracy",
  "statusResistance"
] as const;

function validateEquipment(
  equipment: EquipmentDefinition,
  styleIds: Set<string>,
  equipmentSetIds: Set<string>
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
    if (!styleIds.has(styleId)) {
      errors.push(`Equipment ${equipment.id} references missing style ${styleId}`);
    }
  }

  if (equipment.setId && !equipmentSetIds.has(equipment.setId)) {
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

function validateEquipmentEffect(
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

function validateEquipmentSet(set: EquipmentSetDefinition): string[] {
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

function validateAssignment(
  assignment: AssignmentDefinition,
  ids: {
    heroIds: Set<string>;
    stageIds: Set<string>;
    styleIds: Set<string>;
    regionIds: Set<string>;
    equipmentIds: Set<string>;
  }
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
      ids
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
    if (!ids.styleIds.has(styleId)) {
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

  if (rewards.mapRegionId && !ids.regionIds.has(rewards.mapRegionId)) {
    errors.push(
      `Assignment ${assignment.id} references missing reward map ${rewards.mapRegionId}`
    );
  }

  for (const reward of rewards.equipmentRewardsPerHour ?? []) {
    if (!ids.equipmentIds.has(reward.equipmentId)) {
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

function validateSkillUpgrade(
  skillUpgrade: SkillUpgradeDefinition,
  skillIds: Set<string>,
  statusEffectIds: Set<string>
): string[] {
  const errors: string[] = [];

  if (!skillIds.has(skillUpgrade.skillId)) {
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
          statusEffectIds
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

  if (
    stage.rewards.silver < 0 ||
    stage.rewards.cultivation < 0 ||
    (stage.rewards.herbs ?? 0) < 0 ||
    stage.rewards.combatExperience < 0
  ) {
    errors.push(`Stage ${stage.id} rewards must be non-negative`);
  }

  for (const drop of stage.equipmentDrops ?? []) {
    if (!Number.isInteger(drop.quantity) || drop.quantity < 1) {
      errors.push(`Stage ${stage.id} equipment drop quantity must be an integer >= 1`);
    }
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

function validateUpgrade(upgrade: StaticGameData["upgrades"][number]): string[] {
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

function validateUnlockCondition(
  ownerLabel: string,
  unlock: StaticGameData["regions"][number]["unlockCondition"],
  ids: {
    heroIds: Set<string>;
    stageIds: Set<string>;
    styleIds: Set<string>;
  }
): string[] {
  const errors: string[] = [];

  switch (unlock.type) {
    case "always":
      return errors;

    case "stage_cleared":
      if (!ids.stageIds.has(unlock.stageId)) {
        errors.push(`${ownerLabel} references missing unlock stage ${unlock.stageId}`);
      }
      return errors;

    case "hero_level":
      if (!ids.heroIds.has(unlock.heroId)) {
        errors.push(`${ownerLabel} references missing unlock hero ${unlock.heroId}`);
      }
      if (!Number.isInteger(unlock.level) || unlock.level < 1) {
        errors.push(`${ownerLabel} hero_level unlock level must be an integer >= 1`);
      }
      return errors;

    case "style_mastery_level":
      if (!ids.styleIds.has(unlock.styleId)) {
        errors.push(`${ownerLabel} references missing unlock style ${unlock.styleId}`);
      }
      if (!Number.isInteger(unlock.level) || unlock.level < 1) {
        errors.push(
          `${ownerLabel} style_mastery_level unlock level must be an integer >= 1`
        );
      }
      return errors;
  }
}

function validateMartialStyle(
  style: MartialStyleDefinition,
  ids: {
    heroIds: Set<string>;
    stageIds: Set<string>;
    styleIds: Set<string>;
  }
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
        ids
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

function validateStatusEffect(status: StatusEffectDefinition): string[] {
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

function validateMedicine(
  medicine: MedicineDefinition,
  stageIds: Set<string>
): string[] {
  const errors: string[] = [];

  if (!Number.isInteger(medicine.maxCarry) || medicine.maxCarry <= 0) {
    errors.push(`Medicine ${medicine.id} maxCarry must be a positive integer`);
  }

  if (
    medicine.unlock.type === "stage_cleared" &&
    !stageIds.has(medicine.unlock.stageId)
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
