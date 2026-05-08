import type {
  BattleEvent,
  CleanseableStatusEffectId,
  CombatantState,
  StatusDispelTag,
  StatusEffectDefinition,
  StatusEffectId
} from "./types";

export type TimedStatusMetadata = {
  id: StatusEffectId;
  label: string;
  field: keyof CombatantState;
  dispelTags: StatusDispelTag[];
  cleansePriority: number | null;
};

export const TIMED_STATUS_METADATA = {
  guard: {
    id: "guard",
    label: "Guard",
    field: "guard",
    dispelTags: [],
    cleansePriority: null
  },
  protection: {
    id: "protection",
    label: "Protection",
    field: "protection",
    dispelTags: [],
    cleansePriority: null
  },
  armor_break: {
    id: "armor_break",
    label: "Armor Break",
    field: "armorBreak",
    dispelTags: ["vulnerability", "debuff"],
    cleansePriority: 20
  },
  wound: {
    id: "wound",
    label: "Wound",
    field: "wound",
    dispelTags: ["wound", "debuff"],
    cleansePriority: 10
  },
  speed_down: {
    id: "speed_down",
    label: "Speed Down",
    field: "speedDown",
    dispelTags: ["debuff"],
    cleansePriority: 30
  },
  inner_defense_down: {
    id: "inner_defense_down",
    label: "Inner Defense Down",
    field: "innerDefenseDown",
    dispelTags: ["inner", "vulnerability", "debuff"],
    cleansePriority: 40
  },
  regeneration: {
    id: "regeneration",
    label: "Regeneration",
    field: "regeneration",
    dispelTags: [],
    cleansePriority: null
  }
} as const satisfies Record<StatusEffectId, TimedStatusMetadata>;

export const STATUS_EFFECT_IDS = Object.keys(
  TIMED_STATUS_METADATA
) as StatusEffectId[];

export const CLEANSEABLE_STATUS_EFFECT_IDS = STATUS_EFFECT_IDS.filter(
  (statusId): statusId is CleanseableStatusEffectId =>
    TIMED_STATUS_METADATA[statusId].cleansePriority !== null
).sort(
  (left, right) =>
    (TIMED_STATUS_METADATA[left].cleansePriority ?? 0) -
    (TIMED_STATUS_METADATA[right].cleansePriority ?? 0)
);

export function getTimedStatusMetadata(
  statusId: StatusEffectId
): TimedStatusMetadata {
  return TIMED_STATUS_METADATA[statusId];
}

export function getStatusEffectFieldName(statusId: StatusEffectId): string {
  return TIMED_STATUS_METADATA[statusId].field;
}

export function getStatusDisplayName(
  statusId: string,
  definitions?: Record<string, StatusEffectDefinition>
): string {
  if (isTimedStatusEffectId(statusId)) {
    return TIMED_STATUS_METADATA[statusId].label;
  }

  return definitions?.[statusId]?.name ?? statusId;
}

export function isTimedStatusEffectId(
  statusId: string
): statusId is StatusEffectId {
  return Object.hasOwn(TIMED_STATUS_METADATA, statusId);
}

export function getBattleEventStatusId(event: BattleEvent): string | null {
  switch (event.type) {
    case "guard":
    case "guard_absorb":
    case "protect":
    case "armor_break":
    case "wound":
    case "speed_down":
    case "inner_defense_down":
    case "regeneration":
    case "regeneration_tick":
    case "status_apply":
    case "status_tick":
    case "status_expire":
      return event.statusId;
    case "cleanse":
      return event.statusesRemoved[0] ?? null;
    case "auto_medicine":
      return event.cleansedStatusIds[0] ?? null;
    default:
      return null;
  }
}
