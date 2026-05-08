import {
  useMedicineCounterplay,
  type MedicineInventory,
  type MedicineUseSuccess
} from "../medicine";
import type { ActiveStatusEffect } from "../types";
import { isAutoMedicineUnlocked } from "./unlock";
import { isAutoMedicineTriggerEnabled } from "./preferences";
import { getPreBattleResistancePolicyDecision } from "./policy";
import { selectAutoCleanseMedicine, selectAutoPreBattleResistanceMedicine } from "./selection";
import type {
  AutoMedicineCleanseInput,
  AutoMedicinePreBattleResistanceInput,
  AutoMedicineResult,
  AutoMedicineSkippedReason,
  AutoMedicineTrigger,
  AutoMedicineUseSummary
} from "./types";

export function applyAutoCleanseMedicine(
  input: AutoMedicineCleanseInput
): AutoMedicineResult {
  if (!isAutoMedicineUnlocked(input)) {
    return skipAutoMedicine(
      input.inventory,
      input.activeStatuses,
      "automation_locked"
    );
  }

  if (!isAutoMedicineTriggerEnabled(input.preferences, input.trigger)) {
    return skipAutoMedicine(
      input.inventory,
      input.activeStatuses,
      "no_owned_match"
    );
  }

  if (input.activeStatuses.length === 0) {
    return skipAutoMedicine(
      input.inventory,
      input.activeStatuses,
      "no_active_statuses"
    );
  }

  const medicine = selectAutoCleanseMedicine(input);

  if (medicine === null) {
    return skipAutoMedicine(
      input.inventory,
      input.activeStatuses,
      "no_owned_match"
    );
  }

  const result = useMedicineCounterplay({
    medicine,
    inventory: input.inventory,
    activeStatuses: input.activeStatuses,
    statusDefinitions: input.statusDefinitions
  });

  if (!result.ok) {
    return skipAutoMedicine(
      input.inventory,
      input.activeStatuses,
      "no_owned_match"
    );
  }

  return {
    inventory: result.inventory,
    statuses: result.statuses,
    usedMedicine: buildUseSummary(input.trigger, result),
    skippedReason: null
  };
}

export function applyAutoPreBattleResistanceMedicine(
  input: AutoMedicinePreBattleResistanceInput
): AutoMedicineResult {
  if (!isAutoMedicineUnlocked(input)) {
    return skipAutoMedicine(input.inventory, [], "automation_locked");
  }

  const policyDecision = getPreBattleResistancePolicyDecision(input);

  if (!policyDecision.allowed) {
    return skipAutoMedicine(
      input.inventory,
      [],
      policyDecision.skippedReason ?? "stage_below_policy_threshold"
    );
  }

  const medicine = selectAutoPreBattleResistanceMedicine(input);

  if (medicine === null) {
    return skipAutoMedicine(input.inventory, [], "no_owned_match");
  }

  const result = useMedicineCounterplay({
    medicine,
    inventory: input.inventory,
    activeStatuses: [],
    statusDefinitions: input.statusDefinitions
  });

  if (!result.ok) {
    return skipAutoMedicine(input.inventory, [], "no_owned_match");
  }

  return {
    inventory: result.inventory,
    statuses: result.statuses,
    usedMedicine: buildUseSummary("pre_battle_resistance", result),
    skippedReason: null
  };
}

function buildUseSummary(
  trigger: AutoMedicineTrigger,
  result: MedicineUseSuccess
): AutoMedicineUseSummary {
  return {
    trigger,
    medicineId: result.consumedMedicineId,
    cleansedStatusIds: result.cleansed.map((status) => status.statusId),
    statusResistanceBonus: result.statusResistanceBonus,
    statusResistanceDurationSeconds: result.statusResistanceDurationSeconds
  };
}

function skipAutoMedicine(
  inventory: MedicineInventory,
  statuses: ActiveStatusEffect[],
  skippedReason: AutoMedicineSkippedReason
): AutoMedicineResult {
  return {
    inventory,
    statuses,
    usedMedicine: null,
    skippedReason
  };
}
