import { clamp } from "./formulas";
import type {
  ActiveStatusEffect,
  CleanseableStatusEffectId,
  CombatantState,
  StatusAdvanceEvent,
  StatusAdvanceInput,
  StatusAdvanceResult,
  StatusApplicationChanceInput,
  StatusApplicationInput,
  StatusApplicationResult,
  StatusCleanseInput,
  StatusCleanseResult,
  StatusCombatModifiers,
  StatusEffectDefinition,
  StatusEffectId,
  StatusResistanceFormulaConstants,
  StatusEffectStackBehavior,
  TimedCombatEffect,
  TimedRecoveryEffect
} from "./types";
import {
  CLEANSEABLE_STATUS_EFFECT_IDS,
  STATUS_EFFECT_IDS
} from "./statusMetadata";

export const defaultStatusResistanceFormulaConstants: StatusResistanceFormulaConstants = {
  maxEffectiveResistance: 0.8,
  minimumApplicationChance: 0.05,
  maximumApplicationChance: 0.95,
  durationReductionScale: 0.75,
  tickDamageReductionScale: 0.6,
  minimumDurationSeconds: 1
};

export const defaultStatusCombatModifiers: StatusCombatModifiers = {
  healingReceivedMultiplier: 1,
  contextRebuildMultiplier: 1,
  kineticDamageTakenMultiplier: 1,
  cognitiveDamageTakenMultiplier: 1,
  feedbackBodyIntegrityPercent: 0
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
  const minimumChance =
    input.minimumChance ??
    defaultStatusResistanceFormulaConstants.minimumApplicationChance;
  const maximumChance =
    input.maximumChance ??
    defaultStatusResistanceFormulaConstants.maximumApplicationChance;
  const chance =
    input.baseChance +
    (input.attackerStatusAccuracy ?? 0) -
    calculateEffectiveStatusResistance(input.targetStatusResistance ?? 0);

  return clamp(chance, minimumChance, maximumChance);
}

export function calculateEffectiveStatusResistance(
  statusResistance: number,
  temporaryBonus = 0
): number {
  return clamp(
    statusResistance + temporaryBonus,
    0,
    defaultStatusResistanceFormulaConstants.maxEffectiveResistance
  );
}

export function calculateStatusDuration(
  baseDurationSeconds: number,
  targetStatusResistance = 0,
  minimumDurationSeconds =
    defaultStatusResistanceFormulaConstants.minimumDurationSeconds
): number {
  const effectiveResistance =
    calculateEffectiveStatusResistance(targetStatusResistance);

  return Math.max(
    minimumDurationSeconds,
    baseDurationSeconds *
      (1 -
        effectiveResistance *
          defaultStatusResistanceFormulaConstants.durationReductionScale)
  );
}

export function calculateStatusTickOuterDamage(input: {
  definition: StatusEffectDefinition;
  targetMaxBodyIntegrity: number;
  stacks: number;
  targetStatusResistance?: number;
}): number {
  if (
    input.definition.tickIntervalSeconds === undefined ||
    input.definition.effects.bodyIntegrityDamagePerSecond === undefined
  ) {
    return 0;
  }

  const effectiveResistance = calculateEffectiveStatusResistance(
    input.targetStatusResistance ?? 0
  );
  const resistanceMultiplier =
    1 -
    effectiveResistance *
      defaultStatusResistanceFormulaConstants.tickDamageReductionScale;

  return (
    input.targetMaxBodyIntegrity *
    input.definition.effects.bodyIntegrityDamagePerSecond *
    input.definition.tickIntervalSeconds *
    input.stacks *
    resistanceMultiplier
  );
}

export function applyStatusEffect(
  input: StatusApplicationInput
): StatusApplicationResult {
  const durationSeconds = calculateStatusDuration(
    input.durationSeconds ?? input.definition.durationSeconds,
    input.targetStatusResistance
  );
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
      input.targetMaxBodyIntegrity,
      input.targetStatusResistance
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
        contextRebuildMultiplier:
          modifiers.contextRebuildMultiplier *
          getStackedMultiplier(effects.contextRebuildMultiplier, stacks),
        kineticDamageTakenMultiplier:
          modifiers.kineticDamageTakenMultiplier *
          getStackedMultiplier(effects.kineticDamageTakenMultiplier, stacks),
        cognitiveDamageTakenMultiplier:
          modifiers.cognitiveDamageTakenMultiplier *
          getStackedMultiplier(effects.cognitiveDamageTakenMultiplier, stacks),
        feedbackBodyIntegrityPercent:
          modifiers.feedbackBodyIntegrityPercent +
          (effects.feedbackBodyIntegrityPercent ?? 0) * stacks
      };
    },
    { ...defaultStatusCombatModifiers }
  );
}

export function addStatusResistanceBonus(
  combatant: CombatantState,
  input: {
    medicineId: string;
    value: number;
    appliedAt: number;
    durationSeconds: number;
  }
): void {
  if (input.value <= 0 || input.durationSeconds <= 0) {
    return;
  }

  combatant.statusResistanceBonuses = [
    ...combatant.statusResistanceBonuses,
    {
      value: input.value,
      medicineId: input.medicineId,
      appliedAt: input.appliedAt,
      durationSeconds: input.durationSeconds,
      expiresAt: input.appliedAt + input.durationSeconds
    }
  ];
}

export function getActiveStatusResistanceBonus(
  combatant: CombatantState,
  time: number
): number {
  return combatant.statusResistanceBonuses
    .filter((bonus) => time < bonus.expiresAt)
    .reduce((total, bonus) => total + bonus.value, 0);
}

export function getCombatantStatusResistance(
  combatant: CombatantState,
  time: number
): number {
  return calculateEffectiveStatusResistance(
    combatant.stats.statusResistance,
    getActiveStatusResistanceBonus(combatant, time)
  );
}

export type CreateTimedStatusEffectInput = {
  id: Exclude<StatusEffectId, "regeneration">;
  value: number;
  sourceId: string;
  targetId: string;
  skillId: string;
  appliedAt: number;
  durationSeconds: number;
  stackBehavior?: StatusEffectStackBehavior;
};

export type CreateTimedRecoveryStatusEffectInput =
  Omit<CreateTimedStatusEffectInput, "id"> & {
    nextTickAt: number;
    tickIntervalSeconds: number;
    restores: TimedRecoveryEffect["restores"];
  };

export function createTimedStatusEffect(
  input: CreateTimedStatusEffectInput
): TimedCombatEffect {
  return {
    id: input.id,
    value: input.value,
    sourceId: input.sourceId,
    targetId: input.targetId,
    skillId: input.skillId,
    appliedAt: input.appliedAt,
    durationSeconds: input.durationSeconds,
    expiresAt: input.appliedAt + input.durationSeconds,
    stackBehavior: input.stackBehavior ?? "refresh"
  };
}

export function createTimedRecoveryStatusEffect(
  input: CreateTimedRecoveryStatusEffectInput
): TimedRecoveryEffect {
  return {
    id: "regeneration",
    value: input.value,
    sourceId: input.sourceId,
    targetId: input.targetId,
    skillId: input.skillId,
    appliedAt: input.appliedAt,
    durationSeconds: input.durationSeconds,
    expiresAt: input.appliedAt + input.durationSeconds,
    stackBehavior: input.stackBehavior ?? "refresh",
    nextTickAt: input.nextTickAt,
    tickIntervalSeconds: input.tickIntervalSeconds,
    restores: input.restores
  };
}

export function isStatusEffectActive(
  effect: TimedCombatEffect | TimedRecoveryEffect | null,
  time: number
): boolean {
  return Boolean(effect && time < effect.expiresAt);
}

export function getStatusEffect(
  combatant: CombatantState,
  statusId: StatusEffectId
): TimedCombatEffect | TimedRecoveryEffect | null {
  switch (statusId) {
    case "guard":
      return combatant.guard;
    case "protection":
      return combatant.protection;
    case "armor_break":
      return combatant.armorBreak;
    case "wound":
      return combatant.wound;
    case "speed_down":
      return combatant.speedDown;
    case "inner_defense_down":
      return combatant.innerDefenseDown;
    case "regeneration":
      return combatant.regeneration;
  }
}

export function getActiveStatusEffect(
  combatant: CombatantState,
  statusId: StatusEffectId,
  time: number
): TimedCombatEffect | TimedRecoveryEffect | null {
  const effect = getStatusEffect(combatant, statusId);

  return isStatusEffectActive(effect, time) ? effect : null;
}

export function getActiveStatusEffectValue(
  combatant: CombatantState,
  statusId: StatusEffectId,
  time: number,
  clampValue: (value: number) => number = (value) => value
): number {
  const effect = getActiveStatusEffect(combatant, statusId, time);

  return effect ? clampValue(effect.value) : 0;
}

export function setStatusEffect(
  combatant: CombatantState,
  effect: TimedCombatEffect | TimedRecoveryEffect
): void {
  switch (effect.id) {
    case "guard":
      combatant.guard = effect;
      break;
    case "protection":
      combatant.protection = effect;
      break;
    case "armor_break":
      combatant.armorBreak = effect;
      break;
    case "wound":
      combatant.wound = effect;
      break;
    case "speed_down":
      combatant.speedDown = effect;
      break;
    case "inner_defense_down":
      combatant.innerDefenseDown = effect;
      break;
    case "regeneration":
      combatant.regeneration = effect;
      break;
  }
}

export function clearStatusEffect(
  combatant: CombatantState,
  statusId: StatusEffectId
): void {
  switch (statusId) {
    case "guard":
      combatant.guard = null;
      break;
    case "protection":
      combatant.protection = null;
      break;
    case "armor_break":
      combatant.armorBreak = null;
      break;
    case "wound":
      combatant.wound = null;
      break;
    case "speed_down":
      combatant.speedDown = null;
      break;
    case "inner_defense_down":
      combatant.innerDefenseDown = null;
      break;
    case "regeneration":
      combatant.regeneration = null;
      break;
  }
}

export function expireStatusEffects(
  combatants: CombatantState[],
  time: number
): void {
  for (const combatant of combatants) {
    combatant.statusResistanceBonuses = combatant.statusResistanceBonuses.filter(
      (bonus) => time < bonus.expiresAt
    );

    for (const statusId of STATUS_EFFECT_IDS) {
      const effect = getStatusEffect(combatant, statusId);

      if (effect && !isStatusEffectActive(effect, time)) {
        clearStatusEffect(combatant, statusId);
      }
    }
  }
}

export function hasCleanseableStatusEffect(
  combatant: CombatantState,
  time: number
): boolean {
  return CLEANSEABLE_STATUS_EFFECT_IDS.some((statusId) =>
    isStatusEffectActive(getStatusEffect(combatant, statusId), time)
  );
}

export function clearCleanseableStatusEffects(
  combatant: CombatantState,
  time: number,
  maxCount: number
): CleanseableStatusEffectId[] {
  const removed: CleanseableStatusEffectId[] = [];

  for (const statusId of CLEANSEABLE_STATUS_EFFECT_IDS) {
    if (removed.length >= maxCount) {
      break;
    }

    if (isStatusEffectActive(getStatusEffect(combatant, statusId), time)) {
      clearStatusEffect(combatant, statusId);
      removed.push(statusId);
    }
  }

  return removed;
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
  targetMaxBodyIntegrity: number,
  targetStatusResistance = 0
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
      const tickDamage = calculateStatusTickOuterDamage({
        definition,
        targetMaxBodyIntegrity,
        stacks: status.stacks,
        targetStatusResistance
      });

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

function clampStacks(stacks: number, maxStacks: number): number {
  return Math.max(1, Math.min(Math.trunc(stacks), maxStacks));
}

function getStackedMultiplier(value: number | undefined, stacks: number): number {
  if (value === undefined) {
    return 1;
  }

  return value ** stacks;
}
