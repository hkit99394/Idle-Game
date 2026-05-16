import type {
  StaticGameData,
  TacticModifierType,
  TacticPresetDefinition
} from "../data/types";
import type { BattleTacticSummary, CombatantState, TargetRule } from "./types";

export const DEFAULT_TACTIC_ID = "balanced_routine";

const FALLBACK_BALANCED_TACTIC: TacticPresetDefinition = {
  id: DEFAULT_TACTIC_ID,
  name: "Balanced Routine",
  description: "Default balanced routine.",
  isDefault: true,
  behaviorFlags: [],
  modifiers: []
};

export function resolvePlayerTactic(
  staticData: StaticGameData,
  tacticId?: string
): TacticPresetDefinition {
  const defaultTactic =
    staticData.tactics.find((tactic) => tactic.isDefault) ??
    staticData.tactics.find((tactic) => tactic.id === DEFAULT_TACTIC_ID) ??
    staticData.tactics[0] ??
    FALLBACK_BALANCED_TACTIC;

  if (!tacticId) {
    return defaultTactic;
  }

  return (
    staticData.tactics.find((tactic) => tactic.id === tacticId) ??
    defaultTactic
  );
}

export function createBattleTacticSummary(
  tactic: TacticPresetDefinition
): BattleTacticSummary {
  return {
    id: tactic.id,
    name: tactic.name,
    isDefault: tactic.isDefault === true
  };
}

export function getTacticModifierValue(
  tactic: TacticPresetDefinition | null | undefined,
  modifierType: TacticModifierType,
  fallbackValue: number
): number {
  return (
    tactic?.modifiers.find((modifier) => modifier.type === modifierType)?.value ??
    fallbackValue
  );
}

export function getPlayerTacticModifierValue(
  tactic: TacticPresetDefinition | null | undefined,
  source: Pick<CombatantState, "team">,
  modifierType: TacticModifierType,
  fallbackValue: number
): number {
  if (source.team !== "player") {
    return fallbackValue;
  }

  return getTacticModifierValue(tactic, modifierType, fallbackValue);
}

export function getTacticTargetRules(
  tactic: TacticPresetDefinition | null | undefined,
  source: Pick<CombatantState, "team">,
  fallbackRule: TargetRule
): TargetRule[] {
  if (source.team !== "player" || !tactic?.targetPriorities?.length) {
    return [fallbackRule];
  }

  return tactic.targetPriorities;
}
