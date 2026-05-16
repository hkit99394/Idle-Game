import {
  buildCompatibilityAliasIndex,
  type CompatibilityAliasEntry,
  type CompatibilityAliasIndex
} from "./aliasMap";

export type ContentIdAliasPhase =
  | "hostile_ids"
  | "initiate_ids"
  | "protocol_ids"
  | "style_ids"
  | "augment_ids"
  | "countermeasure_ids"
  | "status_ids"
  | "operation_ids"
  | "routine_ids";

export type ContentIdAliasKind =
  | "hostile_family"
  | "hostile"
  | "initiate"
  | "protocol"
  | "skill_upgrade"
  | "style"
  | "style_branch"
  | "augment"
  | "augment_set"
  | "countermeasure"
  | "status"
  | "operation"
  | "routine";

export type ContentIdAliasEntry = CompatibilityAliasEntry<ContentIdAliasPhase> &
  Readonly<{
    kind: ContentIdAliasKind;
  }>;

export type ContentIdMapKeyCollision = Readonly<{
  kind: ContentIdAliasKind;
  legacyId: string;
  targetId: string;
}>;

export type NormalizeContentIdMapKeysResult<Value> = Readonly<{
  map: Record<string, Value>;
  normalized: boolean;
  collisions: readonly ContentIdMapKeyCollision[];
}>;

type ContentIdAliasDefinition = Readonly<{
  legacyId: string;
  targetId: string;
  displayName: string;
}>;

const HOSTILE_FAMILY_REFERENCE_FIELDS = [
  "data/enemies.json:family",
  "core/data/types.ts:MasteryBonus.enemy_family_damage_multiplier",
  "core/balance:enemyFamily"
] as const;

const HOSTILE_REFERENCE_FIELDS = [
  "data/enemies.json:id",
  "data/stages.json:enemyTeam.combatantIds",
  "core/combat:combatant.definitionId",
  "core/balance:enemyId",
  "tools:enemyId",
  "tests:enemy fixtures"
] as const;

const INITIATE_REFERENCE_FIELDS = [
  "data/heroes.json:id",
  "data/styles.json:branches[].unlock.heroId",
  "core/progression/types.ts:progress.heroes",
  "core/progression/types.ts:activeHeroIds",
  "core/progression/types.ts:formation",
  "core/progression/types.ts:equipment.equipped",
  "core/progression/types.ts:assignments[].heroIds"
] as const;

const PROTOCOL_REFERENCE_FIELDS = [
  "data/skills.json:id",
  "data/heroes.json:skillIds",
  "data/enemies.json:skillIds",
  "core/combat:BattleEvent.skillId",
  "core/balance:skillId",
  "tools:skillId"
] as const;

const SKILL_UPGRADE_REFERENCE_FIELDS = [
  "data/skillUpgrades.json:id",
  "core/progression/types.ts:progress.skillUpgrades"
] as const;

const STYLE_REFERENCE_FIELDS = [
  "data/styles.json:id",
  "data/heroes.json:style",
  "data/enemies.json:style",
  "data/equipment.json:allowedStyles",
  "data/assignments.json:allowedStyles",
  "data/styles.json:branches[].unlock.styleId",
  "core/progression/types.ts:progress.styleMastery",
  "core/progression/types.ts:progress.styleBranches"
] as const;

const STYLE_BRANCH_REFERENCE_FIELDS = [
  "data/styles.json:branches[].id",
  "core/progression/types.ts:progress.styleBranches"
] as const;

const AUGMENT_REFERENCE_FIELDS = [
  "data/equipment.json:id",
  "data/stages.json:equipmentDrops[].equipmentId",
  "data/assignments.json:rewardProfile.equipmentRewardsPerHour[].equipmentId",
  "core/progression/types.ts:equipment.inventory",
  "core/progression/types.ts:equipment.equipped"
] as const;

const AUGMENT_SET_REFERENCE_FIELDS = [
  "data/equipmentSets.json:id",
  "data/equipment.json:setId",
  "core/progression/equipment.ts:setId"
] as const;

const COUNTERMEASURE_REFERENCE_FIELDS = [
  "data/medicines.json:id",
  "core/progression/types.ts:medicineInventory",
  "core/combat/autoMedicine/types.ts:disabledMedicineIds",
  "core/combat/autoMedicine:medicineId"
] as const;

const STATUS_REFERENCE_FIELDS = [
  "data/statusEffects.json:id",
  "data/skills.json:effects[].statusId",
  "core/balance:expectedStatusIds",
  "core/combat:BattleEvent.statusId",
  "web/statusPresentation.ts:statusId",
  "tools:statusId"
] as const;

const OPERATION_REFERENCE_FIELDS = [
  "data/assignments.json:id",
  "core/progression/types.ts:assignments",
  "core/offline:assignmentId",
  "web/state/viewModels:assignmentId"
] as const;

const ROUTINE_REFERENCE_FIELDS = [
  "data/tactics.json:id",
  "core/progression/types.ts:selectedRoutineId",
  "core/progression/types.ts:ResolveStageBattleInput.tacticId",
  "core/combat:playerTactic",
  "tools:tacticId"
] as const;

function defineAliases(
  kind: ContentIdAliasKind,
  phase: ContentIdAliasPhase,
  referenceFields: readonly string[],
  definitions: readonly ContentIdAliasDefinition[]
): readonly ContentIdAliasEntry[] {
  return definitions.map((definition) => ({
    ...definition,
    kind,
    referenceFields,
    phase
  }));
}

export const HOSTILE_FAMILY_ALIASES = defineAliases(
  "hostile_family",
  "hostile_ids",
  HOSTILE_FAMILY_REFERENCE_FIELDS,
  [
    {
      legacyId: "bandit",
      targetId: "greenline",
      displayName: "Greenline"
    },
    {
      legacyId: "mist_valley",
      targetId: "veil_district",
      displayName: "Veil District"
    },
    {
      legacyId: "iron_fort",
      targetId: "ironwall",
      displayName: "Ironwall"
    },
    {
      legacyId: "lotus_monastery",
      targetId: "lotus_clinic",
      displayName: "Lotus Clinic"
    },
    {
      legacyId: "demon_cult",
      targetId: "redline",
      displayName: "Redline"
    }
  ]
);

export const HOSTILE_ALIASES = defineAliases(
  "hostile",
  "hostile_ids",
  HOSTILE_REFERENCE_FIELDS,
  [
    {
      legacyId: "bamboo_bandit",
      targetId: "greenline_cutter",
      displayName: "Greenline Cutter"
    },
    {
      legacyId: "mist_palm_thug",
      targetId: "veil_pulse_bruiser",
      displayName: "Veil Pulse Bruiser"
    },
    {
      legacyId: "black_iron_guard",
      targetId: "ironwall_guard",
      displayName: "Ironwall Guard"
    },
    {
      legacyId: "mist_valley_acolyte",
      targetId: "veil_district_acolyte",
      displayName: "Veil District Acolyte"
    },
    {
      legacyId: "fog_staff_ward",
      targetId: "fogline_brace_ward",
      displayName: "Fogline Brace Ward"
    },
    {
      legacyId: "mist_palm_adept",
      targetId: "veil_pulse_adept",
      displayName: "Veil Pulse Adept"
    },
    {
      legacyId: "mist_valley_elder",
      targetId: "veil_district_elder",
      displayName: "Veil District Elder"
    },
    {
      legacyId: "iron_fort_sentry",
      targetId: "ironwall_sentry",
      displayName: "Ironwall Sentry"
    },
    {
      legacyId: "black_iron_saber",
      targetId: "ironwall_saber",
      displayName: "Ironwall Saber"
    },
    {
      legacyId: "iron_armor_captain",
      targetId: "iron_plating_captain",
      displayName: "Iron Plating Captain"
    },
    {
      legacyId: "black_fort_commander",
      targetId: "black_foundry_commander",
      displayName: "Black Foundry Commander"
    },
    {
      legacyId: "lotus_outer_disciple",
      targetId: "lotus_kinetic_initiate",
      displayName: "Lotus Kinetic Initiate"
    },
    {
      legacyId: "lotus_mender",
      targetId: "lotus_clinic_stabilizer",
      displayName: "Lotus Clinic Stabilizer"
    },
    {
      legacyId: "lotus_staff_keeper",
      targetId: "lotus_brace_keeper",
      displayName: "Lotus Brace Keeper"
    },
    {
      legacyId: "jade_needle_sister",
      targetId: "jade_needle_operator",
      displayName: "Jade Needle Operator"
    },
    {
      legacyId: "lotus_sword_warden",
      targetId: "lotus_edge_warden",
      displayName: "Lotus Edge Warden"
    },
    {
      legacyId: "lotus_abbot",
      targetId: "lotus_clinic_director",
      displayName: "Lotus Clinic Director"
    },
    {
      legacyId: "miasma_palm_apprentice",
      targetId: "miasma_pulse_apprentice",
      displayName: "Miasma Pulse Apprentice"
    },
    {
      legacyId: "demon_cult_ritualist",
      targetId: "redline_ritualist",
      displayName: "Redline Ritualist"
    },
    {
      legacyId: "demon_cult_overseer",
      targetId: "redline_overseer",
      displayName: "Redline Overseer"
    }
  ]
);

export const INITIATE_ALIASES = defineAliases(
  "initiate",
  "initiate_ids",
  INITIATE_REFERENCE_FIELDS,
  [
    {
      legacyId: "iron_fist_disciple",
      targetId: "iron_fist_initiate",
      displayName: "Iron Fist Initiate"
    },
    {
      legacyId: "azure_palm_monk",
      targetId: "azure_pulse_monk",
      displayName: "Azure Pulse Monk"
    },
    {
      legacyId: "white_crane_swordsman",
      targetId: "white_crane_edge_runner",
      displayName: "White Crane Edge Runner"
    },
    {
      legacyId: "mountain_staff_guardian",
      targetId: "mountain_brace_guardian",
      displayName: "Mountain Brace Guardian"
    },
    {
      legacyId: "lotus_mending_disciple",
      targetId: "lotus_stabilizer",
      displayName: "Lotus Stabilizer"
    }
  ]
);

export const PROTOCOL_ALIASES = defineAliases(
  "protocol",
  "protocol_ids",
  PROTOCOL_REFERENCE_FIELDS,
  [
    {
      legacyId: "basic_strike",
      targetId: "baseline_strike",
      displayName: "Baseline Strike"
    },
    {
      legacyId: "iron_fist_combo",
      targetId: "impact_combo",
      displayName: "Impact Combo"
    },
    {
      legacyId: "meridian_shock",
      targetId: "context_shock",
      displayName: "Context Shock"
    },
    {
      legacyId: "white_crane_slash",
      targetId: "white_crane_edge",
      displayName: "White Crane Edge"
    },
    {
      legacyId: "sweeping_staff",
      targetId: "brace_sweep",
      displayName: "Brace Sweep"
    },
    {
      legacyId: "bandit_cut",
      targetId: "cutter_strike",
      displayName: "Cutter Strike"
    },
    {
      legacyId: "mist_palm_jab",
      targetId: "veil_pulse_jab",
      displayName: "Veil Pulse Jab"
    },
    {
      legacyId: "fog_staff_guard",
      targetId: "fogline_brace_guard",
      displayName: "Fogline Brace Guard"
    },
    {
      legacyId: "cloud_meridian_press",
      targetId: "cloud_context_press",
      displayName: "Cloud Context Press"
    },
    {
      legacyId: "valley_heart_seal",
      targetId: "valley_context_seal",
      displayName: "Valley Context Seal"
    },
    {
      legacyId: "fortress_staff_lock",
      targetId: "fortress_brace_lock",
      displayName: "Fortress Brace Lock"
    },
    {
      legacyId: "black_fort_edict",
      targetId: "black_foundry_edict",
      displayName: "Black Foundry Edict"
    },
    {
      legacyId: "lotus_recovery_palm",
      targetId: "lotus_stabilizer_pulse",
      displayName: "Lotus Stabilizer Pulse"
    },
    {
      legacyId: "lotus_staff_shelter",
      targetId: "lotus_brace_shelter",
      displayName: "Lotus Brace Shelter"
    },
    {
      legacyId: "abbot_lotus_vow",
      targetId: "director_lotus_vow",
      displayName: "Director Lotus Vow"
    },
    {
      legacyId: "lotus_mending_vow",
      targetId: "lotus_stabilizer_vow",
      displayName: "Lotus Stabilizer Vow"
    },
    {
      legacyId: "miasma_palm",
      targetId: "miasma_pulse",
      displayName: "Miasma Pulse"
    }
  ]
);

export const SKILL_UPGRADE_ALIASES = defineAliases(
  "skill_upgrade",
  "protocol_ids",
  SKILL_UPGRADE_REFERENCE_FIELDS,
  [
    {
      legacyId: "iron_fist_combo_refinement",
      targetId: "impact_combo_refinement",
      displayName: "Impact Combo Refinement"
    },
    {
      legacyId: "meridian_shock_refinement",
      targetId: "context_shock_refinement",
      displayName: "Context Shock Refinement"
    },
    {
      legacyId: "white_crane_slash_refinement",
      targetId: "white_crane_edge_refinement",
      displayName: "White Crane Edge Refinement"
    },
    {
      legacyId: "sweeping_staff_refinement",
      targetId: "brace_sweep_refinement",
      displayName: "Brace Sweep Refinement"
    },
    {
      legacyId: "lotus_mending_vow_refinement",
      targetId: "lotus_stabilizer_vow_refinement",
      displayName: "Lotus Stabilizer Vow Refinement"
    }
  ]
);

export const STYLE_ALIASES = defineAliases(
  "style",
  "style_ids",
  STYLE_REFERENCE_FIELDS,
  [
    {
      legacyId: "fist",
      targetId: "impact",
      displayName: "Impact Style"
    },
    {
      legacyId: "palm",
      targetId: "pulse",
      displayName: "Pulse Style"
    },
    {
      legacyId: "leg",
      targetId: "vector",
      displayName: "Vector Style"
    },
    {
      legacyId: "sword",
      targetId: "edge",
      displayName: "Edge Style"
    },
    {
      legacyId: "blade",
      targetId: "rend",
      displayName: "Rend Style"
    },
    {
      legacyId: "staff",
      targetId: "brace",
      displayName: "Brace Style"
    },
    {
      legacyId: "hidden_weapons",
      targetId: "ghostware",
      displayName: "Ghostware Style"
    }
  ]
);

export const STYLE_BRANCH_ALIASES = defineAliases(
  "style_branch",
  "style_ids",
  STYLE_BRANCH_REFERENCE_FIELDS,
  [
    {
      legacyId: "iron_body_fist",
      targetId: "iron_body_impact",
      displayName: "Iron Body Impact"
    },
    {
      legacyId: "cloud_meridian_palm",
      targetId: "cloud_context_pulse",
      displayName: "Cloud Context Pulse"
    },
    {
      legacyId: "wind_step_leg",
      targetId: "wind_step_vector",
      displayName: "Wind Step Vector"
    },
    {
      legacyId: "white_crane_sword",
      targetId: "white_crane_edge_branch",
      displayName: "White Crane Edge Branch"
    },
    {
      legacyId: "black_iron_blade",
      targetId: "black_iron_rend",
      displayName: "Black Iron Rend"
    },
    {
      legacyId: "mountain_guard_staff",
      targetId: "mountain_guard_brace",
      displayName: "Mountain Guard Brace"
    },
    {
      legacyId: "rain_needle_art",
      targetId: "rain_needle_ghostware",
      displayName: "Rain Needle Ghostware"
    }
  ]
);

export const AUGMENT_ALIASES = defineAliases(
  "augment",
  "augment_ids",
  AUGMENT_REFERENCE_FIELDS,
  [
    {
      legacyId: "training_wraps",
      targetId: "impact_training_wraps",
      displayName: "Impact Training Wraps"
    },
    {
      legacyId: "willow_palm_manual",
      targetId: "willow_pulse_protocol",
      displayName: "Willow Pulse Protocol"
    },
    {
      legacyId: "crane_edge_sword",
      targetId: "crane_edge_cutter",
      displayName: "Crane Edge Cutter"
    },
    {
      legacyId: "guardian_staff",
      targetId: "guardian_brace_staff",
      displayName: "Guardian Brace Staff"
    },
    {
      legacyId: "woven_travel_robe",
      targetId: "woven_travel_plating",
      displayName: "Woven Travel Plating"
    },
    {
      legacyId: "calming_breath_pill",
      targetId: "calming_context_stim",
      displayName: "Calming Context Stim"
    },
    {
      legacyId: "mist_needle_case",
      targetId: "veil_needle_case",
      displayName: "Veil Needle Case"
    },
    {
      legacyId: "veil_palm_manual",
      targetId: "veil_pulse_protocol",
      displayName: "Veil Pulse Protocol"
    },
    {
      legacyId: "iron_thread_armor",
      targetId: "iron_thread_plating",
      displayName: "Iron Thread Plating"
    },
    {
      legacyId: "black_iron_saber_blade",
      targetId: "black_iron_saber",
      displayName: "Black Iron Saber"
    },
    {
      legacyId: "fortress_guard_manual",
      targetId: "fortress_guard_protocol",
      displayName: "Fortress Guard Protocol"
    },
    {
      legacyId: "tempered_meridian_pill",
      targetId: "tempered_context_stim",
      displayName: "Tempered Context Stim"
    },
    {
      legacyId: "lotus_dew_pill",
      targetId: "lotus_dew_countermeasure",
      displayName: "Lotus Dew Countermeasure"
    },
    {
      legacyId: "mending_poultice",
      targetId: "mending_patch",
      displayName: "Mending Patch"
    }
  ]
);

export const AUGMENT_SET_ALIASES = defineAliases(
  "augment_set",
  "augment_ids",
  AUGMENT_SET_REFERENCE_FIELDS,
  [
    {
      legacyId: "black_iron_ward",
      targetId: "ironwall_ward",
      displayName: "Ironwall Ward"
    }
  ]
);

export const COUNTERMEASURE_ALIASES = defineAliases(
  "countermeasure",
  "countermeasure_ids",
  COUNTERMEASURE_REFERENCE_FIELDS,
  [
    {
      legacyId: "clear_heart_pill",
      targetId: "clear_heart_countermeasure",
      displayName: "Clear Heart Countermeasure"
    },
    {
      legacyId: "quiet_meridian_powder",
      targetId: "quiet_context_powder",
      displayName: "Quiet Context Powder"
    },
    {
      legacyId: "purity_draught",
      targetId: "purity_countermeasure",
      displayName: "Purity Countermeasure"
    }
  ]
);

export const STATUS_ALIASES = defineAliases(
  "status",
  "status_ids",
  STATUS_REFERENCE_FIELDS,
  [
    {
      legacyId: "poison",
      targetId: "corruption",
      displayName: "Corruption"
    },
    {
      legacyId: "wound",
      targetId: "trauma",
      displayName: "Trauma"
    },
    {
      legacyId: "qi_suppression",
      targetId: "context_suppression",
      displayName: "Context Suppression"
    },
    {
      legacyId: "vulnerable",
      targetId: "exposed",
      displayName: "Exposed"
    }
  ]
);

export const OPERATION_ALIASES = defineAliases(
  "operation",
  "operation_ids",
  OPERATION_REFERENCE_FIELDS,
  [
    {
      legacyId: "bamboo_road_patrol",
      targetId: "greenline_sweep",
      displayName: "Greenline Sweep"
    },
    {
      legacyId: "mist_valley_meditation",
      targetId: "veil_district_calibration",
      displayName: "Veil District Calibration"
    },
    {
      legacyId: "black_iron_drill_yard",
      targetId: "black_foundry_calibration_yard",
      displayName: "Black Foundry Calibration Yard"
    },
    {
      legacyId: "lotus_medicine_pavilion",
      targetId: "lotus_countermeasure_pavilion",
      displayName: "Lotus Countermeasure Pavilion"
    }
  ]
);

export const ROUTINE_ALIASES = defineAliases(
  "routine",
  "routine_ids",
  ROUTINE_REFERENCE_FIELDS,
  [
    {
      legacyId: "balanced",
      targetId: "balanced_routine",
      displayName: "Balanced Routine"
    },
    {
      legacyId: "outer_pressure",
      targetId: "kinetic_crush",
      displayName: "Kinetic Crush"
    },
    {
      legacyId: "inner_pressure",
      targetId: "context_break",
      displayName: "Context Break"
    },
    {
      legacyId: "guard_support",
      targetId: "guard_the_stabilizer",
      displayName: "Guard The Stabilizer"
    },
    {
      legacyId: "sustain",
      targetId: "long_stabilization",
      displayName: "Long Stabilization"
    },
    {
      legacyId: "boss_burst",
      targetId: "gatekeeper_burst",
      displayName: "Gatekeeper Burst"
    }
  ]
);

export const CONTENT_ID_ALIASES_BY_KIND = {
  hostile_family: HOSTILE_FAMILY_ALIASES,
  hostile: HOSTILE_ALIASES,
  initiate: INITIATE_ALIASES,
  protocol: PROTOCOL_ALIASES,
  skill_upgrade: SKILL_UPGRADE_ALIASES,
  style: STYLE_ALIASES,
  style_branch: STYLE_BRANCH_ALIASES,
  augment: AUGMENT_ALIASES,
  augment_set: AUGMENT_SET_ALIASES,
  countermeasure: COUNTERMEASURE_ALIASES,
  status: STATUS_ALIASES,
  operation: OPERATION_ALIASES,
  routine: ROUTINE_ALIASES
} as const satisfies Record<ContentIdAliasKind, readonly ContentIdAliasEntry[]>;

export const CONTENT_ID_ALIASES = [
  ...HOSTILE_FAMILY_ALIASES,
  ...HOSTILE_ALIASES,
  ...INITIATE_ALIASES,
  ...PROTOCOL_ALIASES,
  ...SKILL_UPGRADE_ALIASES,
  ...STYLE_ALIASES,
  ...STYLE_BRANCH_ALIASES,
  ...AUGMENT_ALIASES,
  ...AUGMENT_SET_ALIASES,
  ...COUNTERMEASURE_ALIASES,
  ...STATUS_ALIASES,
  ...OPERATION_ALIASES,
  ...ROUTINE_ALIASES
] as const satisfies readonly ContentIdAliasEntry[];

export const CONTENT_ID_ALIAS_INDEX =
  buildCompatibilityAliasIndex(CONTENT_ID_ALIASES);

const CONTENT_ID_ALIAS_INDEX_BY_KIND = Object.fromEntries(
  Object.entries(CONTENT_ID_ALIASES_BY_KIND).map(([kind, aliases]) => [
    kind,
    buildCompatibilityAliasIndex(aliases)
  ])
) as Record<ContentIdAliasKind, CompatibilityAliasIndex<ContentIdAliasEntry>>;

export function getContentAliasesByKind(
  kind: ContentIdAliasKind
): readonly ContentIdAliasEntry[] {
  return CONTENT_ID_ALIASES_BY_KIND[kind];
}

export function getContentAliasIndexByKind(
  kind: ContentIdAliasKind
): CompatibilityAliasIndex<ContentIdAliasEntry> {
  return CONTENT_ID_ALIAS_INDEX_BY_KIND[kind];
}

// Some target ids are legacy ids in another category, so normalization must be kind-scoped.
export function normalizeContentId(
  kind: ContentIdAliasKind,
  id: string
): string {
  return getContentAliasIndexByKind(kind).getByLegacyId(id)?.targetId ?? id;
}

export function getLegacyContentId(
  kind: ContentIdAliasKind,
  id: string
): string {
  return getContentAliasIndexByKind(kind).getByTargetId(id)?.legacyId ?? id;
}

export function getContentIdAliases(
  kind: ContentIdAliasKind,
  id: string
): readonly string[] {
  const index = getContentAliasIndexByKind(kind);
  const legacyEntry = index.getByLegacyId(id);
  const targetEntry = index.getByTargetId(id);

  if (legacyEntry) {
    return [legacyEntry.targetId, legacyEntry.legacyId];
  }

  if (targetEntry) {
    return [targetEntry.targetId, targetEntry.legacyId];
  }

  return [id];
}

export function areContentIdsEquivalent(
  kind: ContentIdAliasKind,
  leftId: string,
  rightId: string
): boolean {
  return normalizeContentId(kind, leftId) === normalizeContentId(kind, rightId);
}

export function normalizeContentIdMapKeys<Value>(
  kind: ContentIdAliasKind,
  map: Readonly<Record<string, Value>>
): NormalizeContentIdMapKeysResult<Value> {
  const normalizedMap: Record<string, Value> = {};
  const deferredLegacyEntries: Array<readonly [string, Value]> = [];
  const collisions: ContentIdMapKeyCollision[] = [];
  const index = getContentAliasIndexByKind(kind);

  for (const [contentId, value] of Object.entries(map)) {
    if (index.getByLegacyId(contentId)) {
      deferredLegacyEntries.push([contentId, value]);
      continue;
    }

    normalizedMap[contentId] = value;
  }

  for (const [legacyId, value] of deferredLegacyEntries) {
    const targetId = normalizeContentId(kind, legacyId);

    if (Object.hasOwn(normalizedMap, targetId)) {
      collisions.push({ kind, legacyId, targetId });
      continue;
    }

    normalizedMap[targetId] = value;
  }

  return {
    map: normalizedMap,
    normalized:
      collisions.length > 0 ||
      deferredLegacyEntries.length > 0 ||
      Object.keys(map).some(
        (contentId) => normalizeContentId(kind, contentId) !== contentId
      ),
    collisions
  };
}
