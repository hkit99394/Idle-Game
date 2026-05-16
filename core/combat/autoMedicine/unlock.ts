import type { MedicineDefinition, StaticGameData } from "../../data";
import { isStageCleared, type RegionProgress } from "../../progression/stages";
import type { PlayerProgress } from "../../progression/types";
import type { MedicineInventory } from "../medicine";
import type { AutoMedicineUnlockInput } from "./types";

export function isAutoMedicineUnlocked(input: AutoMedicineUnlockInput): boolean {
  if (input.automationUnlocked !== undefined) {
    return input.automationUnlocked;
  }

  if (hasOwnedMedicine(input.medicines, input.inventory)) {
    return true;
  }

  if (input.progress === undefined || input.stages === undefined) {
    return false;
  }

  return input.medicines.some((medicine) =>
    isMedicineUnlockConditionMet(input.progress, input.stages, medicine)
  );
}

function hasOwnedMedicine(
  medicines: MedicineDefinition[],
  inventory: MedicineInventory
): boolean {
  const medicineIds = new Set(medicines.map((medicine) => medicine.id));

  return Object.entries(inventory).some(
    ([medicineId, count]) => medicineIds.has(medicineId) && (count ?? 0) > 0
  );
}

function isMedicineUnlockConditionMet(
  progress: PlayerProgress | RegionProgress | undefined,
  stages: StaticGameData["stages"] | undefined,
  medicine: MedicineDefinition
): boolean {
  if (medicine.unlock.type === "always") {
    return true;
  }

  if (progress === undefined || stages === undefined) {
    return false;
  }

  if (medicine.unlock.type !== "stage_cleared") {
    return false;
  }

  return isStageCleared({ stages }, progress, medicine.unlock.stageId);
}
