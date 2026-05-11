import {
  getSelectedTacticId,
  type StaticGameData,
  type TacticModifier,
  type TacticModifierType
} from "../../../core";
import type { PlayerProgress } from "../../../core";
import type { TacticPresetView } from "./tacticsTypes";

const tacticModifierLabels: Record<TacticModifierType, string> = {
  outer_damage_multiplier: "Outer damage",
  inner_damage_multiplier: "Inner damage",
  break_power_multiplier: "Break power",
  boss_damage_multiplier: "Boss damage",
  guard_multiplier: "Guard",
  protection_multiplier: "Protection",
  healing_multiplier: "Healing",
  status_resistance_bonus: "Status resistance"
};

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatModifier(modifier: TacticModifier): string {
  const label = tacticModifierLabels[modifier.type];

  if (modifier.type === "status_resistance_bonus") {
    return `+${formatPercent(modifier.value)} ${label}`;
  }

  return `+${formatPercent(modifier.value - 1)} ${label}`;
}

function formatTargetPriority(targetRule: string): string {
  return targetRule.replaceAll("_", " ");
}

export function buildTacticPresetViews(
  data: Pick<StaticGameData, "tactics">,
  progress: Pick<PlayerProgress, "selectedTacticId">
): TacticPresetView[] {
  const selectedTacticId = getSelectedTacticId(data, progress);

  return data.tactics.map((tactic) => ({
    tacticId: tactic.id,
    name: tactic.name,
    description: tactic.description,
    selected: tactic.id === selectedTacticId,
    behaviorTags: tactic.behaviorFlags.map((flag) => flag.replaceAll("_", " ")),
    modifierSummary: [
      ...(tactic.targetPriorities?.length
        ? [
            `Targets ${tactic.targetPriorities
              .map(formatTargetPriority)
              .join(", ")}`
          ]
        : []),
      ...tactic.modifiers.map(formatModifier)
    ]
  }));
}
