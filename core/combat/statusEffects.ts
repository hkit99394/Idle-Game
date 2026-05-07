import { clamp } from "./formulas";
import type {
  ActiveStatusEffect,
  StatusAdvanceEvent,
  StatusAdvanceInput,
  StatusAdvanceResult,
  StatusApplicationInput,
  StatusApplicationChanceInput,
  StatusApplicationResult,
  StatusCleanseInput,
  StatusCleanseResult,
  StatusCombatModifiers,
  StatusEffectDefinition
} from "./types";

export const defaultStatusCombatModifiers: StatusCombatModifiers = {
  healingReceivedMultiplier: 1,
  innerRecoveryMultiplier: 1,
  outerDamageTakenMultiplier: 1,
  attackBacklashOuterHpPercent: 0
};

export function createStatusDictionary(
  definitions: StatusEffectDefinition[]
): Record<string, StatusEffectDefinition> {
  return Object.fromEntries(
    definitions.map((definition) => [definition.id, definition])
  );
}

export function calculateStatusApplicationChance(
  input: StatusApplicationChanceInput
): number {
  const minimumChance = input.minimumChance ?? 0.05;
  const maximumChance = input.maximumChance ?? 0.95;
  const chance =
    input.baseChance +
    (input.attackerStatusAccuracy ?? 0) -
    (input.targetStatusResistance ?? 0);

  return clamp(chance, minimumChance, maximumChance);
}

export function calculateStatusDuration(
  baseDurationSeconds: number,
  targetStatusResistance = 0,
  minimumDurationSeconds = 1
): number {
  return Math.max(
    minimumDurationSeconds,
    baseDurationSeconds * (1 - clamp(targetStatusResistance, 0, 0.8))
  );
}

export function applyStatusEffect(
  input: StatusApplicationInput
): StatusApplicationResult {
  const durationSeconds =
    input.durationSeconds ?? input.definition.durationSeconds;
  const addedStacks = input.stacks ?? 1;
  const existingIndex = input.activeStatuses.findIndex(
    (status) => status.statusId === input.definition.id
  );

  if (existingIndex < 0) {
    const applied = createActiveStatus(
      input.definition,
      durationSeconds,
      addedStacks,
      input.sourceTeamId,
      input.sourceCombatantId
    );

    return {
      statuses: [...input.activeStatuses, applied],
      applied,
      refreshed: false
    };
  }

  const existing = input.activeStatuses[existingIndex];
  const refreshed = refreshActiveStatus(
    existing,
    input.definition,
    durationSeconds,
    addedStacks,
    input.sourceTeamId,
    input.sourceCombatantId
  );
  const statuses = [...input.activeStatuses];
  statuses[existingIndex] = refreshed;

  return {
    statuses,
    applied: refreshed,
    refreshed: true
  };
}

export function advanceStatusEffects(
  input: StatusAdvanceInput
): StatusAdvanceResult {
  const events: StatusAdvanceEvent[] = [];
  const statuses: ActiveStatusEffect[] = [];

  for (const status of input.activeStatuses) {
    const definition = input.definitions[status.statusId];

    if (definition === undefined) {
      continue;
    }

    const advanced = advanceSingleStatus(
      status,
      definition,
      input.deltaSeconds,
      input.targetMaxOuterHp
    );

    events.push(...advanced.events);

    if (advanced.status === null) {
      events.push({
        type: "status_expire",
        statusId: status.statusId
      });
      continue;
    }

    statuses.push(advanced.status);
  }

  return { statuses, events };
}

export function cleanseStatusEffects(
  input: StatusCleanseInput
): StatusCleanseResult {
  const dispelTags = new Set(input.dispelTags);
  const maxCount = input.maxCount ?? Number.POSITIVE_INFINITY;
  const statuses: ActiveStatusEffect[] = [];
  const cleansed: ActiveStatusEffect[] = [];

  for (const status of input.activeStatuses) {
    const definition = input.definitions[status.statusId];
    const canCleanse =
      definition !== undefined &&
      definition.dispelTags.some((tag) => dispelTags.has(tag)) &&
      cleansed.length < maxCount;

    if (canCleanse) {
      cleansed.push(status);
      continue;
    }

    statuses.push(status);
  }

  return { statuses, cleansed };
}

export function getStatusCombatModifiers(
  activeStatuses: ActiveStatusEffect[],
  definitions: Record<string, StatusEffectDefinition>
): StatusCombatModifiers {
  return activeStatuses.reduce<StatusCombatModifiers>(
    (modifiers, status) => {
      const definition = definitions[status.statusId];

      if (definition === undefined) {
        return modifiers;
      }

      const effects = definition.effects;
      const stacks = Math.max(1, status.stacks);

      return {
        healingReceivedMultiplier:
          modifiers.healingReceivedMultiplier *
          getStackedMultiplier(effects.healingReceivedMultiplier, stacks),
        innerRecoveryMultiplier:
          modifiers.innerRecoveryMultiplier *
          getStackedMultiplier(effects.innerRecoveryMultiplier, stacks),
        outerDamageTakenMultiplier:
          modifiers.outerDamageTakenMultiplier *
          getStackedMultiplier(effects.outerDamageTakenMultiplier, stacks),
        attackBacklashOuterHpPercent:
          modifiers.attackBacklashOuterHpPercent +
          (effects.attackBacklashOuterHpPercent ?? 0) * stacks
      };
    },
    { ...defaultStatusCombatModifiers }
  );
}

function createActiveStatus(
  definition: StatusEffectDefinition,
  durationSeconds: number,
  stacks: number,
  sourceTeamId: ActiveStatusEffect["sourceTeamId"],
  sourceCombatantId: ActiveStatusEffect["sourceCombatantId"]
): ActiveStatusEffect {
  return {
    statusId: definition.id,
    remainingSeconds: durationSeconds,
    stacks: clampStacks(stacks, definition.maxStacks),
    nextTickInSeconds: definition.tickIntervalSeconds,
    sourceTeamId,
    sourceCombatantId
  };
}

function refreshActiveStatus(
  status: ActiveStatusEffect,
  definition: StatusEffectDefinition,
  durationSeconds: number,
  addedStacks: number,
  sourceTeamId: ActiveStatusEffect["sourceTeamId"],
  sourceCombatantId: ActiveStatusEffect["sourceCombatantId"]
): ActiveStatusEffect {
  const stacks =
    definition.stackPolicy === "stack_intensity"
      ? status.stacks + addedStacks
      : Math.max(status.stacks, addedStacks);

  return {
    ...status,
    remainingSeconds: Math.max(status.remainingSeconds, durationSeconds),
    stacks: clampStacks(stacks, definition.maxStacks),
    nextTickInSeconds: status.nextTickInSeconds ?? definition.tickIntervalSeconds,
    sourceTeamId: sourceTeamId ?? status.sourceTeamId,
    sourceCombatantId: sourceCombatantId ?? status.sourceCombatantId
  };
}

function advanceSingleStatus(
  status: ActiveStatusEffect,
  definition: StatusEffectDefinition,
  deltaSeconds: number,
  targetMaxOuterHp: number
): {
  status: ActiveStatusEffect | null;
  events: StatusAdvanceEvent[];
} {
  const events: StatusAdvanceEvent[] = [];
  let remainingSeconds = status.remainingSeconds;
  let advanceSeconds = Math.min(deltaSeconds, remainingSeconds);
  let nextTickInSeconds =
    status.nextTickInSeconds ?? definition.tickIntervalSeconds;

  if (
    definition.tickIntervalSeconds !== undefined &&
    nextTickInSeconds !== undefined
  ) {
    while (nextTickInSeconds <= advanceSeconds) {
      const tickDamage = calculateStatusTickOuterDamage(
        definition,
        targetMaxOuterHp,
        status.stacks
      );

      events.push({
        type: "status_tick",
        statusId: status.statusId,
        stacks: status.stacks,
        outerDamage: tickDamage
      });

      advanceSeconds -= nextTickInSeconds;
      remainingSeconds -= nextTickInSeconds;
      nextTickInSeconds = definition.tickIntervalSeconds;
    }

    nextTickInSeconds -= advanceSeconds;
  }

  remainingSeconds -= advanceSeconds;

  if (remainingSeconds <= 0) {
    return { status: null, events };
  }

  return {
    status: {
      ...status,
      remainingSeconds,
      nextTickInSeconds
    },
    events
  };
}

function calculateStatusTickOuterDamage(
  definition: StatusEffectDefinition,
  targetMaxOuterHp: number,
  stacks: number
): number {
  if (
    definition.tickIntervalSeconds === undefined ||
    definition.effects.outerDamagePerSecond === undefined
  ) {
    return 0;
  }

  return (
    targetMaxOuterHp *
    definition.effects.outerDamagePerSecond *
    definition.tickIntervalSeconds *
    stacks
  );
}

function clampStacks(stacks: number, maxStacks: number): number {
  return Math.max(1, Math.min(Math.trunc(stacks), maxStacks));
}

function getStackedMultiplier(value: number | undefined, stacks: number): number {
  if (value === undefined) {
    return 1;
  }

  return value ** stacks;
}
