import type { MedicineDefinition } from "../../data";
import type {
  ActiveStatusEffect,
  StatusDispelTag,
  StatusEffectDefinition
} from "../types";
import { getActiveStatusCandidates } from "../cleansePolicy";
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
        combatant: input.combatant,
        timeSeconds: input.timeSeconds,
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
  combatant?: AutoMedicineCleanseInput["combatant"];
  timeSeconds?: number;
  statusDefinitions: Record<string, StatusEffectDefinition>;
}): CleanseCandidate | null {
  const matchingStatusIds = new Set<string>();
  const cleanseTags = new Set<StatusDispelTag>();
  let maxCleanseCount = 0;
  const cleanseTargets = getCleanseTargets(input);

  for (const effect of input.medicine.effects) {
    if (effect.type !== "cleanse_status") {
      continue;
    }

    for (const tag of effect.dispelTags) {
      cleanseTags.add(tag);
    }

    maxCleanseCount += effect.maxCount ?? Number.POSITIVE_INFINITY;

    for (const target of cleanseTargets) {
      if (canCleanseTags(effect.dispelTags, target.dispelTags)) {
        matchingStatusIds.add(target.id);
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

function getCleanseTargets(input: {
  activeStatuses: ActiveStatusEffect[];
  combatant?: AutoMedicineCleanseInput["combatant"];
  timeSeconds?: number;
  statusDefinitions: Record<string, StatusEffectDefinition>;
}): Array<{ id: string; dispelTags: StatusDispelTag[] }> {
  if (input.combatant) {
    return getActiveStatusCandidates({
      combatant: input.combatant,
      time: input.timeSeconds ?? 0,
      statusDefinitions: input.statusDefinitions
    }).map((candidate) => ({
      id: candidate.id,
      dispelTags: candidate.dispelTags
    }));
  }

  return input.activeStatuses.flatMap((status) => {
    const definition = input.statusDefinitions[status.statusId];

    return definition === undefined
      ? []
      : [
          {
            id: status.statusId,
            dispelTags: definition.dispelTags
          }
        ];
  });
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

function canCleanseTags(
  dispelTags: StatusDispelTag[],
  statusDispelTags: StatusDispelTag[]
): boolean {
  return dispelTags.some((tag) => statusDispelTags.includes(tag));
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
