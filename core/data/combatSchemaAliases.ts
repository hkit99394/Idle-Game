import type {
  EquipmentDefinition,
  EquipmentSetDefinition,
  HeroDefinition,
  MartialStyleDefinition,
  SkillDefinition,
  SkillUpgradeDefinition,
  StaticGameData,
  StatusEffectDefinition,
  TacticPresetDefinition,
  UpgradeDefinition
} from "./types";

type UnknownRecord = Record<string, unknown>;

type FieldAlias = {
  legacy: string;
  target: string;
};

const BASE_STAT_FIELD_ALIASES = [
  { legacy: "maxOuterHp", target: "maxBodyIntegrity" },
  { legacy: "maxInnerQi", target: "maxContextStability" },
  { legacy: "outerAttack", target: "kineticAttack" },
  { legacy: "innerAttack", target: "cognitiveAttack" },
  { legacy: "outerDefense", target: "kineticDefense" },
  { legacy: "innerDefense", target: "cognitiveDefense" },
  { legacy: "breakPower", target: "breachPower" },
  { legacy: "breakResist", target: "overloadResist" },
  { legacy: "innerRecoveryRate", target: "contextRebuildRate" }
] as const satisfies readonly FieldAlias[];

const SKILL_DAMAGE_FIELD_ALIASES = [
  { legacy: "outerMultiplier", target: "kineticMultiplier" },
  { legacy: "innerMultiplier", target: "cognitiveMultiplier" }
] as const satisfies readonly FieldAlias[];

const STATUS_EFFECT_FIELD_ALIASES = [
  { legacy: "innerRecoveryMultiplier", target: "contextRebuildMultiplier" },
  { legacy: "outerDamagePerSecond", target: "bodyIntegrityDamagePerSecond" },
  { legacy: "outerDamageTakenMultiplier", target: "kineticDamageTakenMultiplier" },
  { legacy: "attackBacklashOuterHpPercent", target: "feedbackBodyIntegrityPercent" }
] as const satisfies readonly FieldAlias[];

const BASE_STAT_VALUE_ALIASES: Record<string, string> = {
  breakPower: "breachPower",
  breakResist: "overloadResist",
  innerAttack: "cognitiveAttack",
  innerDefense: "cognitiveDefense",
  innerRecoveryRate: "contextRebuildRate",
  maxInnerQi: "maxContextStability",
  maxOuterHp: "maxBodyIntegrity",
  outerAttack: "kineticAttack",
  outerDefense: "kineticDefense"
};

const SKILL_EFFECT_TYPE_ALIASES: Record<string, string> = {
  body_integrity_regeneration_percent: "outer_regeneration_percent",
  body_integrity_restore_percent: "outer_heal_percent",
  cognitive_defense_down: "inner_defense_down",
  context_stability_regeneration_percent: "inner_regeneration_percent",
  context_stability_restore_percent: "inner_heal_percent"
};

const SKILL_EFFECT_TARGET_ALIASES: Record<string, string> = {
  lowest_body_integrity_ally: "lowest_outer_hp_ally",
  lowest_context_stability_ally: "lowest_inner_qi_ally"
};

const TARGET_RULE_ALIASES: Record<string, string> = {
  inner_broken: "overloaded"
};

const TACTIC_MODIFIER_TYPE_ALIASES: Record<string, string> = {
  breach_power_multiplier: "break_power_multiplier",
  cognitive_damage_multiplier: "inner_damage_multiplier",
  kinetic_damage_multiplier: "outer_damage_multiplier"
};

const SKILL_UPGRADE_EFFECT_TYPE_ALIASES: Record<string, string> = {
  cognitive_multiplier: "inner_multiplier",
  kinetic_multiplier: "outer_multiplier"
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function valuesAreEquivalent(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => valuesAreEquivalent(value, right[index]))
    );
  }

  if (isRecord(left) || isRecord(right)) {
    if (!isRecord(left) || !isRecord(right)) {
      return false;
    }

    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);

    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every(
        (key) => Object.hasOwn(right, key) && valuesAreEquivalent(left[key], right[key])
      )
    );
  }

  return false;
}

function addConflict(
  errors: string[] | undefined,
  ownerLabel: string,
  legacyField: string,
  targetField: string
): void {
  errors?.push(
    `conflicting combat schema aliases: ${ownerLabel}.${targetField} and ${ownerLabel}.${legacyField}`
  );
}

type AliasOutput = "legacy" | "target";

function normalizeFieldAliases<T extends UnknownRecord>(
  value: T,
  ownerLabel: string,
  aliases: readonly FieldAlias[],
  output: AliasOutput,
  errors?: string[]
): T {
  const normalized: UnknownRecord = { ...value };

  for (const alias of aliases) {
    const sourceField = output === "target" ? alias.legacy : alias.target;
    const outputField = output === "target" ? alias.target : alias.legacy;
    const hasSource = Object.hasOwn(value, sourceField);
    const hasOutput = Object.hasOwn(value, outputField);

    if (!hasSource) {
      continue;
    }

    if (
      hasOutput &&
      !valuesAreEquivalent(value[outputField], value[sourceField])
    ) {
      addConflict(errors, ownerLabel, alias.legacy, alias.target);
    }

    if (!hasOutput) {
      normalized[outputField] = value[sourceField];
    }

    delete normalized[sourceField];
  }

  return normalized as T;
}

function normalizeStringAlias(value: unknown, aliases: Record<string, string>): unknown {
  return typeof value === "string" ? aliases[value] ?? value : value;
}

function normalizeStringAliasField<T extends UnknownRecord>(
  value: T,
  field: string,
  aliases: Record<string, string>
): T {
  if (!Object.hasOwn(value, field)) {
    return value;
  }

  return {
    ...value,
    [field]: normalizeStringAlias(value[field], aliases)
  };
}

function normalizeStringAliasArray(
  value: unknown,
  aliases: Record<string, string>
): unknown {
  return Array.isArray(value)
    ? value.map((entry) => normalizeStringAlias(entry, aliases))
    : value;
}

function normalizeBaseStats(value: unknown, ownerLabel: string, errors?: string[]): unknown {
  return isRecord(value)
    ? normalizeFieldAliases(value, ownerLabel, BASE_STAT_FIELD_ALIASES, "target", errors)
    : value;
}

function normalizeStatEffect<T extends UnknownRecord>(effect: T): T {
  return normalizeStringAliasField(effect, "stat", BASE_STAT_VALUE_ALIASES);
}

function normalizeSkillEffect(value: unknown): unknown {
  if (!isRecord(value)) {
    return value;
  }

  return normalizeStringAliasField(
    normalizeStringAliasField(value, "type", SKILL_EFFECT_TYPE_ALIASES),
    "target",
    SKILL_EFFECT_TARGET_ALIASES
  );
}

function normalizeSkill(skill: SkillDefinition, errors?: string[]): SkillDefinition {
  const record = normalizeStringAliasField(
    normalizeFieldAliases(
      skill as unknown as UnknownRecord,
      `Skill ${skill.id}`,
      SKILL_DAMAGE_FIELD_ALIASES,
      "legacy",
      errors
    ),
    "targetRule",
    TARGET_RULE_ALIASES
  );

  return {
    ...record,
    effects: Array.isArray(record.effects)
      ? record.effects.map(normalizeSkillEffect)
      : record.effects
  } as SkillDefinition;
}

function normalizeSkillUpgradeEffect(value: unknown): unknown {
  if (!isRecord(value)) {
    return value;
  }

  const record = normalizeStringAliasField(
    value,
    "type",
    SKILL_UPGRADE_EFFECT_TYPE_ALIASES
  );

  if (record.type !== "add_skill_effect" || !Object.hasOwn(record, "effect")) {
    return record;
  }

  return {
    ...record,
    effect: normalizeSkillEffect(record.effect)
  };
}

function normalizeSkillUpgrade(
  upgrade: SkillUpgradeDefinition
): SkillUpgradeDefinition {
  return {
    ...upgrade,
    effects: Array.isArray(upgrade.effects)
      ? upgrade.effects.map(normalizeSkillUpgradeEffect)
      : upgrade.effects
  } as SkillUpgradeDefinition;
}

function normalizeTactic(tactic: TacticPresetDefinition): TacticPresetDefinition {
  return {
    ...tactic,
    targetPriorities: normalizeStringAliasArray(
      tactic.targetPriorities,
      TARGET_RULE_ALIASES
    ) as TacticPresetDefinition["targetPriorities"],
    modifiers: Array.isArray(tactic.modifiers)
      ? tactic.modifiers.map((modifier) =>
          isRecord(modifier)
            ? normalizeStringAliasField(
                modifier,
                "type",
                TACTIC_MODIFIER_TYPE_ALIASES
              )
            : modifier
        )
      : tactic.modifiers
  } as TacticPresetDefinition;
}

function normalizeStatusEffect(
  status: StatusEffectDefinition,
  errors?: string[]
): StatusEffectDefinition {
  return {
    ...status,
    effects: isRecord(status.effects)
      ? normalizeFieldAliases(
          status.effects,
          `Status ${status.id} effects`,
          STATUS_EFFECT_FIELD_ALIASES,
          "target",
          errors
        )
      : status.effects
  } as StatusEffectDefinition;
}

function normalizeEquipment(equipment: EquipmentDefinition): EquipmentDefinition {
  return {
    ...equipment,
    effects: Array.isArray(equipment.effects)
      ? equipment.effects.map((effect) => normalizeStatEffect(effect as UnknownRecord))
      : equipment.effects,
    affixes: Array.isArray(equipment.affixes)
      ? equipment.affixes.map((affix) => ({
          ...affix,
          effects: Array.isArray(affix.effects)
            ? affix.effects.map((effect) => normalizeStatEffect(effect as UnknownRecord))
            : affix.effects
        }))
      : equipment.affixes
  } as EquipmentDefinition;
}

function normalizeEquipmentSet(set: EquipmentSetDefinition): EquipmentSetDefinition {
  return {
    ...set,
    bonuses: Array.isArray(set.bonuses)
      ? set.bonuses.map((bonus) => ({
          ...bonus,
          effects: Array.isArray(bonus.effects)
            ? bonus.effects.map((effect) => normalizeStatEffect(effect as UnknownRecord))
            : bonus.effects
        }))
      : set.bonuses
  } as EquipmentSetDefinition;
}

function normalizeUpgrade(upgrade: UpgradeDefinition): UpgradeDefinition {
  return {
    ...upgrade,
    effects: Array.isArray(upgrade.effects)
      ? upgrade.effects.map((effect) => normalizeStatEffect(effect as UnknownRecord))
      : upgrade.effects
  } as UpgradeDefinition;
}

function normalizeStyle(style: MartialStyleDefinition): MartialStyleDefinition {
  return {
    ...style,
    bonuses: Array.isArray(style.bonuses)
      ? style.bonuses.map((bonus) => normalizeStatEffect(bonus as UnknownRecord))
      : style.bonuses,
    branches: Array.isArray(style.branches)
      ? style.branches.map((branch) => ({
          ...branch,
          effects: Array.isArray(branch.effects)
            ? branch.effects.map((effect) => normalizeStatEffect(effect as UnknownRecord))
            : branch.effects
        }))
      : style.branches
  } as MartialStyleDefinition;
}

function normalizeHero(hero: HeroDefinition, errors?: string[]): HeroDefinition {
  return {
    ...hero,
    baseStats: normalizeBaseStats(
      hero.baseStats,
      `Hero ${hero.id} baseStats`,
      errors
    ) as HeroDefinition["baseStats"]
  };
}

function normalizeEnemy(enemy: StaticGameData["enemies"][number], errors?: string[]) {
  return {
    ...enemy,
    baseStats: normalizeBaseStats(
      enemy.baseStats,
      `Enemy ${enemy.id} baseStats`,
      errors
    ) as typeof enemy.baseStats
  };
}

function normalizeArray<Item>(
  value: Item[],
  mapper: (item: Item, index: number) => Item
): Item[] {
  return Array.isArray(value) ? value.map(mapper) : value;
}

function normalizeStaticCombatSchemaAliasesInternal(
  data: StaticGameData,
  errors?: string[]
): StaticGameData {
  return {
    ...data,
    heroes: normalizeArray(data.heroes, (hero) => normalizeHero(hero, errors)),
    skills: normalizeArray(data.skills, (skill) => normalizeSkill(skill, errors)),
    tactics: normalizeArray(data.tactics, normalizeTactic),
    enemies: normalizeArray(data.enemies, (enemy) => normalizeEnemy(enemy, errors)),
    equipment: normalizeArray(data.equipment, normalizeEquipment),
    equipmentSets: Array.isArray(data.equipmentSets)
      ? data.equipmentSets.map(normalizeEquipmentSet)
      : data.equipmentSets,
    upgrades: normalizeArray(data.upgrades, normalizeUpgrade),
    skillUpgrades: normalizeArray(data.skillUpgrades, normalizeSkillUpgrade),
    styles: normalizeArray(data.styles, normalizeStyle),
    statusEffects: normalizeArray(data.statusEffects, (status) =>
      normalizeStatusEffect(status, errors)
    )
  };
}

export function normalizeStaticCombatSchemaAliases(
  data: StaticGameData
): StaticGameData {
  return normalizeStaticCombatSchemaAliasesInternal(data);
}

export function validateStaticCombatSchemaAliases(data: StaticGameData): string[] {
  const errors: string[] = [];
  normalizeStaticCombatSchemaAliasesInternal(data, errors);
  return errors;
}
