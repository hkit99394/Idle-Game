import type { MedicineDefinition } from "../data";
import {
  calculateEffectiveStatusResistance
} from "./statusEffects";
import {
  cleanseCombatantStatuses,
  cleanseDataStatusEffects
} from "./cleansePolicy";
import type {
  ActiveStatusEffect,
  CombatantState,
  StatusDispelTag,
  StatusEffectDefinition
} from "./types";

export type MedicineInventory = Record<string, number | undefined>;

export type MedicineUseInput = {
  medicine: MedicineDefinition;
  inventory: MedicineInventory;
  activeStatuses: ActiveStatusEffect[];
  combatant?: CombatantState;
  timeSeconds?: number;
  statusDefinitions: Record<string, StatusEffectDefinition>;
};

export type MedicineUseSuccess = {
  ok: true;
  inventory: MedicineInventory;
  statuses: ActiveStatusEffect[];
  consumedMedicineId: string;
  cleansed: ActiveStatusEffect[];
  cleansedStatusIds: string[];
  statusResistanceBonus: number;
  statusResistanceDurationSeconds: number;
};

export type MedicineUseFailure = {
  ok: false;
  reason: "not_owned" | "no_effect";
};

export type MedicineUseResult = MedicineUseSuccess | MedicineUseFailure;

export function useMedicineCounterplay(input: MedicineUseInput): MedicineUseResult {
  const ownedCount = input.inventory[input.medicine.id] ?? 0;

  if (ownedCount <= 0) {
    return {
      ok: false,
      reason: "not_owned"
    };
  }

  let statuses = input.combatant?.activeStatuses ?? input.activeStatuses;
  let cleansed: ActiveStatusEffect[] = [];
  let cleansedStatusIds: string[] = [];
  let statusResistanceBonus = 0;
  let statusResistanceDurationSeconds = 0;

  for (const effect of input.medicine.effects) {
    if (effect.type === "cleanse_status") {
      const cleanse = cleanseMedicineStatuses({
        combatant: input.combatant,
        timeSeconds: input.timeSeconds,
        activeStatuses: statuses,
        statusDefinitions: input.statusDefinitions,
        dispelTags: effect.dispelTags,
        maxCount: effect.maxCount
      });

      statuses = cleanse.statuses;
      cleansed = [...cleansed, ...cleanse.cleansed];
      cleansedStatusIds = appendUnique(cleansedStatusIds, cleanse.cleansedStatusIds);
      continue;
    }

    if (effect.type === "status_resistance_bonus") {
      statusResistanceBonus += effect.value;
      statusResistanceDurationSeconds = Math.max(
        statusResistanceDurationSeconds,
        effect.durationSeconds
      );
    }
  }

  if (cleansedStatusIds.length === 0 && statusResistanceBonus === 0) {
    return {
      ok: false,
      reason: "no_effect"
    };
  }

  return {
    ok: true,
    inventory: decrementMedicine(input.inventory, input.medicine.id),
    statuses,
    consumedMedicineId: input.medicine.id,
    cleansed,
    cleansedStatusIds,
    statusResistanceBonus,
    statusResistanceDurationSeconds
  };
}

export function applyMedicineResistanceBonus(
  baseStatusResistance: number,
  medicineUse: Pick<MedicineUseSuccess, "statusResistanceBonus">
): number {
  return calculateEffectiveStatusResistance(
    baseStatusResistance,
    medicineUse.statusResistanceBonus
  );
}

function decrementMedicine(
  inventory: MedicineInventory,
  medicineId: string
): MedicineInventory {
  const nextInventory = { ...inventory };
  const nextCount = Math.max(0, (nextInventory[medicineId] ?? 0) - 1);

  if (nextCount === 0) {
    delete nextInventory[medicineId];
  } else {
    nextInventory[medicineId] = nextCount;
  }

  return nextInventory;
}

function cleanseMedicineStatuses(input: {
  combatant?: CombatantState;
  timeSeconds?: number;
  activeStatuses: ActiveStatusEffect[];
  statusDefinitions: Record<string, StatusEffectDefinition>;
  dispelTags: StatusDispelTag[];
  maxCount?: number;
}): {
  statuses: ActiveStatusEffect[];
  cleansed: ActiveStatusEffect[];
  cleansedStatusIds: string[];
} {
  if (input.combatant) {
    input.combatant.activeStatuses = input.activeStatuses;
    const cleanse = cleanseCombatantStatuses({
      combatant: input.combatant,
      time: input.timeSeconds ?? 0,
      statusDefinitions: input.statusDefinitions,
      dispelTags: input.dispelTags,
      maxCount: input.maxCount
    });

    return {
      statuses: cleanse.statuses,
      cleansed: cleanse.cleansed,
      cleansedStatusIds: cleanse.cleansedStatusIds
    };
  }

  const cleanse = cleanseDataStatusEffects({
    activeStatuses: input.activeStatuses,
    definitions: input.statusDefinitions,
    dispelTags: input.dispelTags,
    maxCount: input.maxCount
  });

  return {
    statuses: cleanse.statuses,
    cleansed: cleanse.cleansed,
    cleansedStatusIds: cleanse.cleansed.map((status) => status.statusId)
  };
}

function appendUnique(values: string[], nextValues: string[]): string[] {
  const seen = new Set(values);
  const next = [...values];

  for (const value of nextValues) {
    if (!seen.has(value)) {
      seen.add(value);
      next.push(value);
    }
  }

  return next;
}
