import type { MedicineDefinition } from "../data";
import { cleanseStatusEffects } from "./statusEffects";
import type {
  ActiveStatusEffect,
  StatusEffectDefinition
} from "./types";

export type MedicineInventory = Record<string, number | undefined>;

export type MedicineUseInput = {
  medicine: MedicineDefinition;
  inventory: MedicineInventory;
  activeStatuses: ActiveStatusEffect[];
  statusDefinitions: Record<string, StatusEffectDefinition>;
};

export type MedicineUseSuccess = {
  ok: true;
  inventory: MedicineInventory;
  statuses: ActiveStatusEffect[];
  consumedMedicineId: string;
  cleansed: ActiveStatusEffect[];
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

  let statuses = input.activeStatuses;
  let cleansed: ActiveStatusEffect[] = [];
  let statusResistanceBonus = 0;
  let statusResistanceDurationSeconds = 0;

  for (const effect of input.medicine.effects) {
    if (effect.type === "cleanse_status") {
      const cleanse = cleanseStatusEffects({
        activeStatuses: statuses,
        definitions: input.statusDefinitions,
        dispelTags: effect.dispelTags,
        maxCount: effect.maxCount
      });

      statuses = cleanse.statuses;
      cleansed = [...cleansed, ...cleanse.cleansed];
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

  if (cleansed.length === 0 && statusResistanceBonus === 0) {
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
    statusResistanceBonus,
    statusResistanceDurationSeconds
  };
}

export function applyMedicineResistanceBonus(
  baseStatusResistance: number,
  medicineUse: Pick<MedicineUseSuccess, "statusResistanceBonus">
): number {
  return baseStatusResistance + medicineUse.statusResistanceBonus;
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
