import type {
  ActiveStatusEffect,
  ResolveStageBattleResult,
  StatusAdvanceEvent,
  StatusCategory,
  StatusEffectDefinition
} from "../core";

export type StatusSeverity = "low" | "medium" | "high";

export type StatusToneRole = StatusCategory | "cleanse";

export type StatusToneDefinition = {
  role: StatusToneRole;
  label: string;
  className: string;
};

export type StatusChipViewModel = {
  statusId: string;
  label: string;
  category: StatusCategory;
  categoryLabel: string;
  severity: StatusSeverity;
  severityLabel: string;
  toneClassName: string;
  remainingLabel: string;
  stacksLabel: string | null;
  ariaLabel: string;
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
  callouts: Array<{
    id: string;
    label: string;
    toneClassName: string;
    ariaLabel: string;
  }>;
  rows: Array<{
    label: string;
    value: string;
    toneClassName: string;
  }>;
};

export const statusToneDefinitions: Record<
  StatusToneRole,
  StatusToneDefinition
> = {
  damage: {
    role: "damage",
    label: "Damage",
    className: "tone-damage"
  },
  control: {
    role: "control",
    label: "Control",
    className: "tone-control"
  },
  vulnerability: {
    role: "vulnerability",
    label: "Vulnerability",
    className: "tone-vulnerability"
  },
  recovery: {
    role: "recovery",
    label: "Recovery",
    className: "tone-recovery"
  },
  backlash: {
    role: "backlash",
    label: "Backlash",
    className: "tone-backlash"
  },
  cleanse: {
    role: "cleanse",
    label: "Cleanse",
    className: "tone-cleanse"
  }
};

export function getStatusTone(role: StatusToneRole): StatusToneDefinition {
  return statusToneDefinitions[role];
}

export function getBattleResultText(
  lastBattle: ResolveStageBattleResult | null,
  stageName: string
): string {
  if (!lastBattle) {
    return "Ready";
  }

  if (!lastBattle.ok) {
    switch (lastBattle.reason) {
      case "locked_stage":
        return `${stageName} is locked`;
      case "missing_enemy":
        return "Enemy data missing";
      case "missing_stage":
        return "Stage data missing";
    }
  }

  if (lastBattle.stageCleared) {
    return `Victory - ${stageName} cleared`;
  }

  return lastBattle.battle.winner === "timeout"
    ? `Stalemate - ${stageName} held`
    : `Defeat - ${stageName} held`;
}

export function getBattleResultClass(
  lastBattle: ResolveStageBattleResult | null
): string {
  if (!lastBattle) {
    return "";
  }

  if (!lastBattle.ok) {
    return "blocked";
  }

  if (lastBattle.stageCleared) {
    return "victory";
  }

  return lastBattle.battle.winner === "timeout" ? "stalemate" : "defeat";
}

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
      const severityLabel = formatSeverityLabel(severity);
      const tone = getStatusTone(definition.category);

      return [
        {
          statusId: status.statusId,
          label: definition.name,
          category: definition.category,
          categoryLabel: tone.label,
          severity,
          severityLabel,
          toneClassName: tone.className,
          remainingLabel: `${Math.ceil(status.remainingSeconds)}s`,
          stacksLabel: status.stacks > 1 ? `x${status.stacks}` : null,
          ariaLabel: `${definition.name}, ${tone.label}, ${severityLabel}, ${Math.ceil(status.remainingSeconds)} seconds remaining`
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
  const damageTone = getStatusTone("damage");
  const cleanseTone = getStatusTone("cleanse");
  const controlTone = getStatusTone("control");
  const callouts: StatusSummaryViewModel["callouts"] = [];

  if (mostStatusDamage !== null) {
    const label = `${mostStatusDamage.key} took ${formatWholeNumber(mostStatusDamage.value)} status damage`;
    callouts.push(
      {
        id: "status-damage",
        label,
        toneClassName: damageTone.className,
        ariaLabel: `${damageTone.label} summary: ${label}`
      }
    );
  }

  if (mostCleanses !== null) {
    const label = `${mostCleanses.key} cleansed ${formatWholeNumber(mostCleanses.value)} status`;
    callouts.push(
      {
        id: "cleanses",
        label,
        toneClassName: cleanseTone.className,
        ariaLabel: `${cleanseTone.label} summary: ${label}`
      }
    );
  }

  const rows = [
    {
      label: "Status Damage",
      value:
        mostStatusDamage === null
          ? "0"
          : `${formatWholeNumber(mostStatusDamage.value)} to ${mostStatusDamage.key}`,
      toneClassName: damageTone.className
    },
    {
      label: "Cleanses",
      value:
        mostCleanses === null
          ? "0"
          : `${formatWholeNumber(mostCleanses.value)} by ${mostCleanses.key}`,
      toneClassName: cleanseTone.className
    },
    {
      label: "Debuffs",
      value: formatDebuffList(input.cleanses, input.statusDefinitions),
      toneClassName: controlTone.className
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

function formatSeverityLabel(severity: StatusSeverity): string {
  return `${severity[0].toUpperCase()}${severity.slice(1)} severity`;
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
