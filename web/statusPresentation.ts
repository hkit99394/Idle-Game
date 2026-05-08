import type {
  ActiveStatusEffect,
  StatusAdvanceEvent,
  StatusCategory,
  StatusEffectDefinition
} from "../core";

export type StatusSeverity = "low" | "medium" | "high";

export type StatusChipViewModel = {
  statusId: string;
  label: string;
  category: StatusCategory;
  severity: StatusSeverity;
  toneClassName: string;
  remainingLabel: string;
  stacksLabel: string | null;
};

export type StatusSummaryInput = {
  tickEvents: Array<
    Extract<StatusAdvanceEvent, { type: "status_tick" }> & {
      targetName: string;
    }
  >;
  cleanses: Array<{
    combatantName: string;
    statusId: string;
  }>;
  statusDefinitions: Record<string, StatusEffectDefinition>;
};

export type StatusSummaryViewModel = {
  callouts: string[];
  rows: Array<{
    label: string;
    value: string;
  }>;
};

const categoryToneClassNames: Record<StatusCategory, string> = {
  damage: "tone-damage",
  control: "tone-control",
  vulnerability: "tone-vulnerability",
  recovery: "tone-recovery",
  backlash: "tone-backlash"
};

export function buildStatusChipViewModels(
  activeStatuses: ActiveStatusEffect[],
  definitions: Record<string, StatusEffectDefinition>
): StatusChipViewModel[] {
  return activeStatuses
    .flatMap((status): StatusChipViewModel[] => {
      const definition = definitions[status.statusId];

      if (definition === undefined) {
        return [];
      }

      const severity = getStatusSeverity(status, definition);

      return [
        {
          statusId: status.statusId,
          label: definition.name,
          category: definition.category,
          severity,
          toneClassName: categoryToneClassNames[definition.category],
          remainingLabel: `${Math.ceil(status.remainingSeconds)}s`,
          stacksLabel: status.stacks > 1 ? `x${status.stacks}` : null
        }
      ];
    })
    .sort((left, right) => {
      const severitySort =
        severityRank[right.severity] - severityRank[left.severity];

      if (severitySort !== 0) {
        return severitySort;
      }

      return left.label.localeCompare(right.label);
    });
}

export function buildStatusSummaryViewModel(
  input: StatusSummaryInput
): StatusSummaryViewModel {
  const damageByTarget = new Map<string, number>();
  const cleansesByCombatant = new Map<string, number>();

  for (const event of input.tickEvents) {
    damageByTarget.set(
      event.targetName,
      (damageByTarget.get(event.targetName) ?? 0) + event.outerDamage
    );
  }

  for (const cleanse of input.cleanses) {
    cleansesByCombatant.set(
      cleanse.combatantName,
      (cleansesByCombatant.get(cleanse.combatantName) ?? 0) + 1
    );
  }

  const mostStatusDamage = getTopEntry(damageByTarget);
  const mostCleanses = getTopEntry(cleansesByCombatant);
  const callouts: string[] = [];

  if (mostStatusDamage !== null) {
    callouts.push(
      `${mostStatusDamage.key} took ${formatWholeNumber(mostStatusDamage.value)} status damage`
    );
  }

  if (mostCleanses !== null) {
    callouts.push(
      `${mostCleanses.key} cleansed ${formatWholeNumber(mostCleanses.value)} status`
    );
  }

  const rows = [
    {
      label: "Status Damage",
      value:
        mostStatusDamage === null
          ? "0"
          : `${formatWholeNumber(mostStatusDamage.value)} to ${mostStatusDamage.key}`
    },
    {
      label: "Cleanses",
      value:
        mostCleanses === null
          ? "0"
          : `${formatWholeNumber(mostCleanses.value)} by ${mostCleanses.key}`
    },
    {
      label: "Debuffs",
      value: formatDebuffList(input.cleanses, input.statusDefinitions)
    }
  ];

  return { callouts, rows };
}

const severityRank: Record<StatusSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3
};

function getStatusSeverity(
  status: ActiveStatusEffect,
  definition: StatusEffectDefinition
): StatusSeverity {
  if (
    status.stacks >= definition.maxStacks ||
    status.remainingSeconds >= definition.durationSeconds * 0.75
  ) {
    return "high";
  }

  if (status.stacks > 1 || status.remainingSeconds >= definition.durationSeconds * 0.4) {
    return "medium";
  }

  return "low";
}

function getTopEntry(
  entries: Map<string, number>
): { key: string; value: number } | null {
  let topEntry: { key: string; value: number } | null = null;

  for (const [key, value] of entries) {
    if (topEntry === null || value > topEntry.value) {
      topEntry = { key, value };
    }
  }

  return topEntry;
}

function formatDebuffList(
  cleanses: StatusSummaryInput["cleanses"],
  definitions: Record<string, StatusEffectDefinition>
): string {
  const names = [
    ...new Set(
      cleanses.map((cleanse) => definitions[cleanse.statusId]?.name ?? cleanse.statusId)
    )
  ];

  return names.length === 0 ? "0" : names.join(", ");
}

function formatWholeNumber(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}
