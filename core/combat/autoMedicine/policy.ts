import {
  defaultAutoMedicinePreferences,
  DEFAULT_PRE_BATTLE_RESISTANCE_MODE
} from "./types";
import type {
  AutoMedicinePreBattleResistanceInput,
  PreBattleResistancePolicyDecision
} from "./types";
import { isAutoMedicineTriggerEnabled, isPreBattleResistanceMode } from "./preferences";
import { getStageStatusPressureProfile } from "./pressureProfile";

export function getPreBattleResistancePolicyDecision(
  input: AutoMedicinePreBattleResistanceInput
): PreBattleResistancePolicyDecision {
  const preferences = input.preferences ?? defaultAutoMedicinePreferences;
  const mode = isPreBattleResistanceMode(preferences.preBattleResistanceMode)
    ? preferences.preBattleResistanceMode
    : DEFAULT_PRE_BATTLE_RESISTANCE_MODE;
  const profile = getStageStatusPressureProfile(input);

  if (
    !isAutoMedicineTriggerEnabled(preferences, "pre_battle_resistance") ||
    mode === "off"
  ) {
    return {
      allowed: false,
      skippedReason: "policy_disabled",
      mode,
      profile
    };
  }

  if (profile.statusIds.length === 0) {
    return {
      allowed: false,
      skippedReason: "no_status_pressure",
      mode,
      profile
    };
  }

  if (
    mode === "always_when_recommended" ||
    (mode === "boss_and_elite" && profile.isBossOrEliteStage) ||
    (mode === "status_heavy" && profile.isStatusHeavy)
  ) {
    return {
      allowed: true,
      skippedReason: null,
      mode,
      profile
    };
  }

  return {
    allowed: false,
    skippedReason: "stage_below_policy_threshold",
    mode,
    profile
  };
}
