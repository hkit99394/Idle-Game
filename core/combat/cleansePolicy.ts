import type {
  ActiveStatusEffect,
  CleanseableStatusEffectId,
  CombatantState,
  StatusCleanseInput,
  StatusCleanseResult,
  StatusDispelTag,
  StatusEffectDefinition
} from "./types";
import {
  CLEANSEABLE_STATUS_EFFECT_IDS,
  TIMED_STATUS_METADATA,
  getStatusDisplayName
} from "./statusMetadata";
import {
  clearStatusEffect,
  getStatusEffect,
  isStatusEffectActive
} from "./statusEffects";

export type StatusCleanseCandidate = {
  id: string;
  label: string;
  kind: "timed" | "data";
  dispelTags: StatusDispelTag[];
  priority: number;
  remainingSeconds: number | null;
  stacks: number;
};

export type StatusCleanseDescriptor = StatusCleanseCandidate & {
  status: ActiveStatusEffect | null;
};

export type CombatantStatusCleanseResult = {
  statuses: ActiveStatusEffect[];
  cleansed: ActiveStatusEffect[];
  descriptors: StatusCleanseDescriptor[];
  cleansedStatusIds: string[];
};

type DataStatusCleanseCandidate = StatusCleanseCandidate & {
  kind: "data";
  status: ActiveStatusEffect;
  index: number;
};

type TimedStatusCleanseCandidate = StatusCleanseCandidate & {
  kind: "timed";
  id: CleanseableStatusEffectId;
};

type CleanseCandidate =
  | DataStatusCleanseCandidate
  | TimedStatusCleanseCandidate;

export const DATA_STATUS_CLEANSE_PRIORITY = 100;

export function getActiveStatusCandidates(input: {
  combatant: CombatantState;
  time: number;
  statusDefinitions: Record<string, StatusEffectDefinition>;
}): StatusCleanseCandidate[] {
  return [
    ...getTimedStatusCleanseCandidates(input.combatant, input.time),
    ...getDataStatusCleanseCandidates(
      input.combatant.activeStatuses,
      input.statusDefinitions
    )
  ].sort(compareStatusCleanseCandidates);
}

export function hasCleanseableCombatantStatus(input: {
  combatant: CombatantState;
  time: number;
  statusDefinitions: Record<string, StatusEffectDefinition>;
  dispelTags: StatusDispelTag[];
  includeTimed?: boolean;
  includeData?: boolean;
}): boolean {
  return (
    selectCleanseCandidates({
      ...input,
      maxCount: 1
    }).length > 0
  );
}

export function cleanseCombatantStatuses(input: {
  combatant: CombatantState;
  time: number;
  statusDefinitions: Record<string, StatusEffectDefinition>;
  dispelTags: StatusDispelTag[];
  maxCount?: number;
  includeTimed?: boolean;
  includeData?: boolean;
}): CombatantStatusCleanseResult {
  const selected = selectCleanseCandidates(input);
  const descriptors = selected.map(toCleanseDescriptor);
  const cleansedStatusIds = descriptors.map((descriptor) => descriptor.id);
  const cleansed = descriptors.flatMap((descriptor) =>
    descriptor.status === null ? [] : [descriptor.status]
  );
  const dataIndexesToRemove = new Set(
    selected.flatMap((candidate) =>
      candidate.kind === "data" ? [candidate.index] : []
    )
  );

  for (const candidate of selected) {
    if (candidate.kind === "timed") {
      clearStatusEffect(input.combatant, candidate.id);
    }
  }

  input.combatant.activeStatuses = input.combatant.activeStatuses.filter(
    (_, index) => !dataIndexesToRemove.has(index)
  );

  return {
    statuses: input.combatant.activeStatuses,
    cleansed,
    descriptors,
    cleansedStatusIds
  };
}

export function cleanseDataStatusEffects(
  input: StatusCleanseInput
): StatusCleanseResult {
  const selected = selectDataStatusCleanseCandidates({
    activeStatuses: input.activeStatuses,
    definitions: input.definitions,
    dispelTags: input.dispelTags,
    maxCount: input.maxCount
  });
  const removedIndexes = new Set(selected.map((candidate) => candidate.index));

  return {
    statuses: input.activeStatuses.filter(
      (_, index) => !removedIndexes.has(index)
    ),
    cleansed: selected.map((candidate) => candidate.status)
  };
}

function selectCleanseCandidates(input: {
  combatant: CombatantState;
  time: number;
  statusDefinitions: Record<string, StatusEffectDefinition>;
  dispelTags: StatusDispelTag[];
  maxCount?: number;
  includeTimed?: boolean;
  includeData?: boolean;
}): CleanseCandidate[] {
  const maxCount = input.maxCount ?? Number.POSITIVE_INFINITY;
  const candidates: CleanseCandidate[] = [
    ...(input.includeTimed === false
      ? []
      : getTimedStatusCleanseCandidates(input.combatant, input.time)),
    ...(input.includeData === false
      ? []
      : getDataStatusCleanseCandidates(
          input.combatant.activeStatuses,
          input.statusDefinitions
        ))
  ];

  return candidates
    .filter((candidate) => hasAnyDispelTag(candidate.dispelTags, input.dispelTags))
    .sort(compareStatusCleanseCandidates)
    .slice(0, maxCount);
}

function selectDataStatusCleanseCandidates(input: {
  activeStatuses: ActiveStatusEffect[];
  definitions: Record<string, StatusEffectDefinition>;
  dispelTags: StatusDispelTag[];
  maxCount?: number;
}): DataStatusCleanseCandidate[] {
  const maxCount = input.maxCount ?? Number.POSITIVE_INFINITY;

  return getDataStatusCleanseCandidates(input.activeStatuses, input.definitions)
    .filter((candidate) => hasAnyDispelTag(candidate.dispelTags, input.dispelTags))
    .sort(compareStatusCleanseCandidates)
    .slice(0, maxCount);
}

function getTimedStatusCleanseCandidates(
  combatant: CombatantState,
  time: number
): TimedStatusCleanseCandidate[] {
  return CLEANSEABLE_STATUS_EFFECT_IDS.flatMap((statusId) => {
    const metadata = TIMED_STATUS_METADATA[statusId];
    const effect = getStatusEffect(combatant, statusId);

    if (
      metadata.cleansePriority === null ||
      !isStatusEffectActive(effect, time)
    ) {
      return [];
    }

    return [
      {
        id: statusId,
        label: metadata.label,
        kind: "timed" as const,
        dispelTags: [...metadata.dispelTags],
        priority: metadata.cleansePriority,
        remainingSeconds: effect ? effect.expiresAt - time : null,
        stacks: 1
      }
    ];
  });
}

function getDataStatusCleanseCandidates(
  activeStatuses: ActiveStatusEffect[],
  definitions: Record<string, StatusEffectDefinition>
): DataStatusCleanseCandidate[] {
  return activeStatuses.flatMap((status, index) => {
    const definition = definitions[status.statusId];

    if (definition === undefined) {
      return [];
    }

    return [
      {
        id: status.statusId,
        label: getStatusDisplayName(status.statusId, definitions),
        kind: "data" as const,
        dispelTags: [...definition.dispelTags],
        priority: DATA_STATUS_CLEANSE_PRIORITY,
        remainingSeconds: status.remainingSeconds,
        stacks: status.stacks,
        status,
        index
      }
    ];
  });
}

function toCleanseDescriptor(
  candidate: CleanseCandidate
): StatusCleanseDescriptor {
  return {
    id: candidate.id,
    label: candidate.label,
    kind: candidate.kind,
    dispelTags: [...candidate.dispelTags],
    priority: candidate.priority,
    remainingSeconds: candidate.remainingSeconds,
    stacks: candidate.stacks,
    status: candidate.kind === "data" ? candidate.status : null
  };
}

function hasAnyDispelTag(
  candidateTags: StatusDispelTag[],
  requestedTags: StatusDispelTag[]
): boolean {
  const requested = new Set(requestedTags);

  return candidateTags.some((tag) => requested.has(tag));
}

function compareStatusCleanseCandidates(
  left: StatusCleanseCandidate,
  right: StatusCleanseCandidate
): number {
  return (
    left.priority - right.priority ||
    (right.remainingSeconds ?? 0) - (left.remainingSeconds ?? 0) ||
    left.label.localeCompare(right.label) ||
    left.id.localeCompare(right.id)
  );
}
