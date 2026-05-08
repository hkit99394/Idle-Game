import type { MedicineDefinition } from "../../data";
import type {
  ActiveStatusEffect,
  StatusDispelTag,
  StatusEffectDefinition
} from "../types";
import { isAutoMedicineUnlocked } from "./unlock";
import { getPreBattleResistancePolicyDecision } from "./policy";
import type {
  AutoMedicineCleanseInput,
  AutoMedicinePreBattleResistanceInput,
  CleanseCandidate,
  ResistanceCandidate
} from "./types";

export function selectAutoCleanseMedicine(
  input: Omit<AutoMedicineCleanseInput, "trigger">
): MedicineDefinition | null {
  if (!isAutoMedicineUnlocked(input)) {
    return null;
  }

  if (input.preferences !== undefined && !input.preferences.enabled) {
    return null;
  }

  const usedIds = new Set(input.alreadyUsedMedicineIds ?? []);
  const disabledIds = new Set(input.preferences?.disabledMedicineIds ?? []);
  const candidates = input.medicines
    .flatMap((medicine): CleanseCandidate[] => {
      const candidate = getCleanseCandidate({
        medicine,
        activeStatuses: input.activeStatuses,
        statusDefinitions: input.statusDefinitions
      });

      if (
        candidate === null ||
        (input.inventory[medicine.id] ?? 0) <= 0 ||
        usedIds.has(medicine.id) ||
        disabledIds.has(medicine.id)
      ) {
        return [];
      }

      return [candidate];
    })
    .sort(compareCleanseCandidates);

  return candidates[0]?.medicine ?? null;
}

export function selectAutoPreBattleResistanceMedicine(
  input: AutoMedicinePreBattleResistanceInput
): MedicineDefinition | null {
  if (!isAutoMedicineUnlocked(input)) {
    return null;
  }

  if (!getPreBattleResistancePolicyDecision(input).allowed) {
    return null;
  }

  const usedIds = new Set(input.alreadyUsedMedicineIds ?? []);
  const disabledIds = new Set(input.preferences?.disabledMedicineIds ?? []);
  const candidates = input.medicines
    .flatMap((medicine): ResistanceCandidate[] => {
      if (
        (input.inventory[medicine.id] ?? 0) <= 0 ||
        usedIds.has(medicine.id) ||
        disabledIds.has(medicine.id)
      ) {
        return [];
      }

      const candidate = getResistanceCandidate(medicine);

      return candidate === null ? [] : [candidate];
    })
    .sort(compareResistanceCandidates);

  return candidates[0]?.medicine ?? null;
}

function getCleanseCandidate(input: {
  medicine: MedicineDefinition;
  activeStatuses: ActiveStatusEffect[];
  statusDefinitions: Record<string, StatusEffectDefinition>;
}): CleanseCandidate | null {
  const matchingStatusIds = new Set<string>();
  const cleanseTags = new Set<StatusDispelTag>();
  let maxCleanseCount = 0;

  for (const effect of input.medicine.effects) {
    if (effect.type !== "cleanse_status") {
      continue;
    }

    for (const tag of effect.dispelTags) {
      cleanseTags.add(tag);
    }

    maxCleanseCount += effect.maxCount ?? Number.POSITIVE_INFINITY;

    for (const status of input.activeStatuses) {
      const definition = input.statusDefinitions[status.statusId];

      if (
        definition !== undefined &&
        canCleanseStatus(effect.dispelTags, definition)
      ) {
        matchingStatusIds.add(status.statusId);
      }
    }
  }

  if (matchingStatusIds.size === 0) {
    return null;
  }

  return {
    medicine: input.medicine,
    matchingStatusCount: matchingStatusIds.size,
    cleanseBreadth: getCleanseBreadth(cleanseTags),
    maxCleanseCount
  };
}

function getResistanceCandidate(
  medicine: MedicineDefinition
): ResistanceCandidate | null {
  let resistanceBonus = 0;
  let durationSeconds = 0;

  for (const effect of medicine.effects) {
    if (effect.type !== "status_resistance_bonus") {
      continue;
    }

    resistanceBonus += effect.value;
    durationSeconds = Math.max(durationSeconds, effect.durationSeconds);
  }

  if (resistanceBonus <= 0) {
    return null;
  }

  return {
    medicine,
    resistanceBonus,
    durationSeconds
  };
}

function canCleanseStatus(
  dispelTags: StatusDispelTag[],
  status: StatusEffectDefinition
): boolean {
  return dispelTags.some((tag) => status.dispelTags.includes(tag));
}

function getCleanseBreadth(tags: Set<StatusDispelTag>): number {
  return tags.has("debuff") ? 100 + tags.size : tags.size;
}

function compareCleanseCandidates(
  left: CleanseCandidate,
  right: CleanseCandidate
): number {
  return (
    left.cleanseBreadth - right.cleanseBreadth ||
    right.matchingStatusCount - left.matchingStatusCount ||
    right.maxCleanseCount - left.maxCleanseCount ||
    left.medicine.id.localeCompare(right.medicine.id)
  );
}

function compareResistanceCandidates(
  left: ResistanceCandidate,
  right: ResistanceCandidate
): number {
  return (
    right.resistanceBonus - left.resistanceBonus ||
    right.durationSeconds - left.durationSeconds ||
    left.medicine.id.localeCompare(right.medicine.id)
  );
}
