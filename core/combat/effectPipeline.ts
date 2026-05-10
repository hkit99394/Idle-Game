import type {
  BattleContribution,
  BattleEvent,
  BattleMetrics,
  CombatantState,
  StatusDispelTag,
  StatusEffectDefinition
} from "./types";
import type {
  SkillDefinition,
  SkillEffect,
  SkillEffectType
} from "../data/types";
import { clampDefensiveEffectValue, clampRecoveryEffectValue } from "./defensivePipeline";
import {
  applyStatusEffect,
  calculateStatusApplicationChance,
  createTimedRecoveryStatusEffect,
  createTimedStatusEffect,
  getActiveStatusEffect,
  getActiveStatusEffectValue,
  getCombatantStatusResistance,
  getStatusCombatModifiers,
  setStatusEffect
} from "./statusEffects";
import {
  cleanseCombatantStatuses,
  hasCleanseableCombatantStatus
} from "./cleansePolicy";
import { isLiving } from "./targeting";

const RECOVERY_TICK_INTERVAL_SECONDS = 1;
const SKILL_CLEANSE_DISPEL_TAGS: StatusDispelTag[] = ["debuff"];

export const COMBAT_SKILL_EFFECT_HANDLERS = {
  outer_heal_percent: "recovery",
  inner_heal_percent: "recovery",
  outer_regeneration_percent: "recovery",
  inner_regeneration_percent: "recovery",
  wound: "timed_status",
  cleanse: "recovery",
  speed_down: "timed_status",
  inner_defense_down: "timed_status",
  guard: "timed_status",
  protect: "timed_status",
  armor_break: "timed_status",
  apply_status: "data_status"
} as const satisfies Record<SkillEffectType, string>;

export const NON_COMBAT_SKILL_EFFECT_TYPES = [] as const satisfies readonly SkillEffectType[];

export type SkillEffectDispatchStage = "post_attack" | "recovery";

export type SkillEffectResolutionContext = {
  combatants: CombatantState[];
  statusDefinitions: Record<string, StatusEffectDefinition>;
  attacker: CombatantState;
  offensiveTarget: CombatantState;
  skill: SkillDefinition;
  time: number;
  metrics: BattleMetrics;
  contributions: Map<string, BattleContribution>;
  events: BattleEvent[];
};

type SkillEffectForType<T extends SkillEffectType> = SkillEffect & { type: T };

export type SkillEffectHandler<T extends SkillEffectType> = (
  effect: SkillEffectForType<T>,
  context: SkillEffectResolutionContext
) => void;

export type SkillEffectHandlerRegistry = {
  [T in SkillEffectType]?: SkillEffectHandler<T>;
};

function dispatchSkillEffects(
  context: SkillEffectResolutionContext,
  handlers: SkillEffectHandlerRegistry
): void {
  for (const effect of context.skill.effects) {
    const handler = handlers[effect.type] as
      | ((effect: SkillEffect, context: SkillEffectResolutionContext) => void)
      | undefined;

    handler?.(effect, context);
  }
}

function getDirectEffectValue(effect: SkillEffect): number {
  return "value" in effect ? effect.value : 0;
}

function getWoundReduction(target: CombatantState, time: number): number {
  return getActiveStatusEffectValue(
    target,
    "wound",
    time,
    clampRecoveryEffectValue
  );
}

function getMissingOuterHp(combatant: CombatantState): number {
  return Math.max(0, combatant.maxOuterHp - combatant.outerHp);
}

function getMissingInnerQi(combatant: CombatantState): number {
  return Math.max(0, combatant.maxInnerQi - combatant.innerQi);
}

function hasCleanseableStatus(
  combatant: CombatantState,
  time: number,
  statusDefinitions?: Record<string, StatusEffectDefinition>
): boolean {
  if (statusDefinitions === undefined) {
    return hasCleanseableCombatantStatus({
      combatant,
      time,
      statusDefinitions: {},
      dispelTags: SKILL_CLEANSE_DISPEL_TAGS,
      includeData: false
    });
  }

  return hasCleanseableCombatantStatus({
    combatant,
    time,
    statusDefinitions,
    dispelTags: SKILL_CLEANSE_DISPEL_TAGS
  });
}

function selectAllyByScore(
  combatants: CombatantState[],
  attacker: CombatantState,
  getScore: (combatant: CombatantState) => number
): CombatantState {
  return combatants
    .filter((combatant) => combatant.team === attacker.team && isLiving(combatant))
    .map((combatant, encounterOrder) => ({
      combatant,
      encounterOrder,
      score: getScore(combatant)
    }))
    .sort(
      (first, second) =>
        second.score - first.score || first.encounterOrder - second.encounterOrder
    )[0]?.combatant ?? attacker;
}

function selectEffectTarget(
  combatants: CombatantState[],
  attacker: CombatantState,
  offensiveTarget: CombatantState,
  effect: SkillEffect,
  time: number,
  statusDefinitions?: Record<string, StatusEffectDefinition>
): CombatantState {
  switch (effect.target) {
    case "target":
      return offensiveTarget;

    case "lowest_outer_hp_ally":
      return selectAllyByScore(combatants, attacker, getMissingOuterHp);

    case "lowest_inner_qi_ally":
      return selectAllyByScore(combatants, attacker, getMissingInnerQi);

    case "wounded_or_armor_broken_ally":
      return selectAllyByScore(combatants, attacker, (combatant) =>
        hasCleanseableStatus(combatant, time, statusDefinitions) ? 1 : 0
      );

    case "self":
    case undefined:
      return attacker;
  }
}

function selectOffensiveEffectTarget(
  combatants: CombatantState[],
  attacker: CombatantState,
  offensiveTarget: CombatantState,
  effect: SkillEffect,
  time: number
): CombatantState {
  return selectEffectTarget(
    combatants,
    attacker,
    offensiveTarget,
    { ...effect, target: effect.target ?? "target" },
    time
  );
}

function getDeterministicStatusRoll(input: {
  attackerId: string;
  targetId: string;
  skillId: string;
  statusId: string;
  time: number;
}): number {
  const key = [
    input.attackerId,
    input.targetId,
    input.skillId,
    input.statusId,
    input.time.toFixed(3)
  ].join("|");
  let hash = 2166136261;

  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) / 0x100000000;
}

function recordRecovery(
  metrics: BattleMetrics,
  contributions: Map<string, BattleContribution>,
  source: CombatantState,
  outerHealing: number,
  innerQiRestored: number,
  overhealing: number,
  recoveryPrevented: number,
  recoveryPreventedById?: string
): void {
  if (source.team === "player") {
    metrics.playerOuterHealing += outerHealing;
    metrics.playerInnerQiRestored += innerQiRestored;
    metrics.playerOverhealing += overhealing;
    metrics.recoveryPreventedByEnemy += recoveryPrevented;
  } else {
    metrics.enemyOuterHealing += outerHealing;
    metrics.enemyInnerQiRestored += innerQiRestored;
    metrics.enemyOverhealing += overhealing;
    metrics.recoveryPreventedByPlayer += recoveryPrevented;
  }

  const sourceContribution = contributions.get(source.instanceId);

  if (sourceContribution) {
    sourceContribution.outerHealingDone += outerHealing;
    sourceContribution.innerQiRestored += innerQiRestored;
    sourceContribution.overhealingDone += overhealing;
  }

  const preventerContribution = recoveryPreventedById
    ? contributions.get(recoveryPreventedById)
    : undefined;

  if (preventerContribution) {
    preventerContribution.recoveryPrevented += recoveryPrevented;
  }
}

function applyRecoveryToTarget(
  source: CombatantState,
  target: CombatantState,
  rawOuterRecovery: number,
  rawInnerRecovery: number,
  statusDefinitions: Record<string, StatusEffectDefinition>,
  time: number,
  metrics: BattleMetrics,
  contributions: Map<string, BattleContribution>
): {
  outerHealing: number;
  innerQiRestored: number;
  overhealing: number;
  recoveryPrevented: number;
} {
  const wound = getActiveStatusEffect(target, "wound", time);
  const woundReduction = getWoundReduction(target, time);
  const statusModifiers = getStatusCombatModifiers(
    target.activeStatuses,
    statusDefinitions
  );
  const recoveryMultiplier =
    (1 - woundReduction) * statusModifiers.healingReceivedMultiplier;
  const reducedOuterRecovery = rawOuterRecovery * recoveryMultiplier;
  const reducedInnerRecovery = rawInnerRecovery * recoveryMultiplier;
  const recoveryPrevented =
    rawOuterRecovery +
    rawInnerRecovery -
    reducedOuterRecovery -
    reducedInnerRecovery;
  const outerHealing = Math.min(getMissingOuterHp(target), reducedOuterRecovery);
  const innerQiRestored = Math.min(
    getMissingInnerQi(target),
    reducedInnerRecovery
  );
  const overhealing =
    reducedOuterRecovery -
    outerHealing +
    reducedInnerRecovery -
    innerQiRestored;

  target.outerHp += outerHealing;
  target.innerQi += innerQiRestored;

  recordRecovery(
    metrics,
    contributions,
    source,
    outerHealing,
    innerQiRestored,
    overhealing,
    recoveryPrevented,
    wound?.sourceId
  );

  return {
    outerHealing,
    innerQiRestored,
    overhealing,
    recoveryPrevented
  };
}

function recordWound(
  attacker: CombatantState,
  target: CombatantState,
  skill: SkillDefinition,
  value: number,
  endsAt: number,
  time: number,
  metrics: BattleMetrics,
  contributions: Map<string, BattleContribution>,
  events: BattleEvent[]
): void {
  if (!isLiving(target)) {
    return;
  }

  setStatusEffect(
    target,
    createTimedStatusEffect({
      id: "wound",
      value,
      sourceId: attacker.instanceId,
      targetId: target.instanceId,
      skillId: skill.id,
      appliedAt: time,
      durationSeconds: endsAt - time
    })
  );

  if (attacker.team === "player") {
    metrics.woundsTriggeredByPlayer += 1;
  } else {
    metrics.woundsTriggeredByEnemy += 1;
  }

  const attackerContribution = contributions.get(attacker.instanceId);

  if (attackerContribution) {
    attackerContribution.woundsApplied += 1;
  }

  events.push({
    type: "wound",
    time,
    sourceId: attacker.instanceId,
    targetId: target.instanceId,
    skillId: skill.id,
    statusId: "wound",
    reduction: value,
    endsAt
  });
}

function applyTimedDebuff(
  combatants: CombatantState[],
  attacker: CombatantState,
  offensiveTarget: CombatantState,
  skill: SkillDefinition,
  effect: {
    type: "speed_down" | "inner_defense_down";
    value: number;
    durationSeconds?: number;
    target?: SkillEffect["target"];
  },
  time: number,
  events: BattleEvent[]
): void {
  const durationSeconds = effect.durationSeconds ?? 0;
  const target = selectOffensiveEffectTarget(
    combatants,
    attacker,
    offensiveTarget,
    effect,
    time
  );

  if (durationSeconds <= 0 || !isLiving(target)) {
    return;
  }

  const value = clampDefensiveEffectValue(effect.value);

  if (value <= 0) {
    return;
  }

  setStatusEffect(
    target,
    createTimedStatusEffect({
      id: effect.type,
      value,
      sourceId: attacker.instanceId,
      targetId: target.instanceId,
      skillId: skill.id,
      appliedAt: time,
      durationSeconds
    })
  );

  if (effect.type === "speed_down") {
    events.push({
      type: "speed_down",
      time,
      sourceId: attacker.instanceId,
      targetId: target.instanceId,
      skillId: skill.id,
      statusId: "speed_down",
      reduction: value,
      endsAt: time + durationSeconds
    });
  } else {
    events.push({
      type: "inner_defense_down",
      time,
      sourceId: attacker.instanceId,
      targetId: target.instanceId,
      skillId: skill.id,
      statusId: "inner_defense_down",
      reduction: value,
      endsAt: time + durationSeconds
    });
  }
}

function applyDataStatusEffect(
  combatants: CombatantState[],
  statusDefinitions: Record<string, StatusEffectDefinition>,
  attacker: CombatantState,
  offensiveTarget: CombatantState,
  skill: SkillDefinition,
  effect: Extract<SkillEffect, { type: "apply_status" }>,
  time: number,
  events: BattleEvent[]
): void {
  const definition = statusDefinitions[effect.statusId];
  const target = selectOffensiveEffectTarget(
    combatants,
    attacker,
    offensiveTarget,
    effect,
    time
  );

  if (definition === undefined || effect.chance <= 0 || !isLiving(target)) {
    return;
  }

  const chance = calculateStatusApplicationChance({
    baseChance: effect.chance,
    attackerStatusAccuracy: attacker.stats.statusAccuracy,
    targetStatusResistance: getCombatantStatusResistance(target, time)
  });

  if (chance <= 0) {
    return;
  }

  const roll = getDeterministicStatusRoll({
    attackerId: attacker.instanceId,
    targetId: target.instanceId,
    skillId: skill.id,
    statusId: definition.id,
    time
  });

  if (roll >= chance) {
    return;
  }

  const result = applyStatusEffect({
    activeStatuses: target.activeStatuses,
    definition,
    durationSeconds: effect.durationSeconds,
    stacks: effect.stacks,
    targetStatusResistance: getCombatantStatusResistance(target, time),
    sourceTeamId: attacker.team,
    sourceCombatantId: attacker.instanceId
  });

  target.activeStatuses = result.statuses;
  events.push({
    type: "status_apply",
    time,
    sourceId: attacker.instanceId,
    targetId: target.instanceId,
    skillId: skill.id,
    statusId: definition.id,
    stacks: result.applied.stacks,
    durationSeconds: result.applied.remainingSeconds,
    chance,
    refreshed: result.refreshed
  });
}

function applyGuardEffect(
  effect: SkillEffectForType<"guard">,
  context: SkillEffectResolutionContext
): void {
  const durationSeconds = effect.durationSeconds ?? 0;

  if (durationSeconds <= 0) {
    return;
  }

  const value = clampDefensiveEffectValue(getDirectEffectValue(effect));
  const endsAt = context.time + durationSeconds;

  setStatusEffect(
    context.attacker,
    createTimedStatusEffect({
      id: "guard",
      value,
      sourceId: context.attacker.instanceId,
      targetId: context.attacker.instanceId,
      skillId: context.skill.id,
      appliedAt: context.time,
      durationSeconds
    })
  );
  context.events.push({
    type: "guard",
    time: context.time,
    sourceId: context.attacker.instanceId,
    targetId: context.attacker.instanceId,
    skillId: context.skill.id,
    statusId: "guard",
    reduction: value,
    endsAt
  });
}

function applyProtectEffect(
  effect: SkillEffectForType<"protect">,
  context: SkillEffectResolutionContext
): void {
  const durationSeconds = effect.durationSeconds ?? 0;

  if (durationSeconds <= 0) {
    return;
  }

  const value = clampDefensiveEffectValue(getDirectEffectValue(effect));

  setStatusEffect(
    context.attacker,
    createTimedStatusEffect({
      id: "protection",
      value,
      sourceId: context.attacker.instanceId,
      targetId: context.attacker.instanceId,
      skillId: context.skill.id,
      appliedAt: context.time,
      durationSeconds
    })
  );
}

function applyArmorBreakEffect(
  effect: SkillEffectForType<"armor_break">,
  context: SkillEffectResolutionContext
): void {
  const durationSeconds = effect.durationSeconds ?? 0;

  if (durationSeconds <= 0) {
    return;
  }

  const effectTarget = selectOffensiveEffectTarget(
    context.combatants,
    context.attacker,
    context.offensiveTarget,
    effect,
    context.time
  );

  if (!isLiving(effectTarget)) {
    return;
  }

  const value = clampDefensiveEffectValue(getDirectEffectValue(effect));
  const endsAt = context.time + durationSeconds;

  setStatusEffect(
    effectTarget,
    createTimedStatusEffect({
      id: "armor_break",
      value,
      sourceId: context.attacker.instanceId,
      targetId: effectTarget.instanceId,
      skillId: context.skill.id,
      appliedAt: context.time,
      durationSeconds
    })
  );

  if (context.attacker.team === "player") {
    context.metrics.armorBreaksTriggeredByPlayer += 1;
  } else {
    context.metrics.armorBreaksTriggeredByEnemy += 1;
  }

  const attackerContribution = context.contributions.get(context.attacker.instanceId);

  if (attackerContribution) {
    attackerContribution.armorBreaksApplied += 1;
  }

  context.events.push({
    type: "armor_break",
    time: context.time,
    sourceId: context.attacker.instanceId,
    targetId: effectTarget.instanceId,
    skillId: context.skill.id,
    statusId: "armor_break",
    reduction: value,
    endsAt
  });
}

function applyWoundEffect(
  effect: SkillEffectForType<"wound">,
  context: SkillEffectResolutionContext
): void {
  const durationSeconds = effect.durationSeconds ?? 0;

  if (durationSeconds <= 0) {
    return;
  }

  const value = clampRecoveryEffectValue(getDirectEffectValue(effect));
  const effectTarget = selectOffensiveEffectTarget(
    context.combatants,
    context.attacker,
    context.offensiveTarget,
    effect,
    context.time
  );

  if (value <= 0) {
    return;
  }

  recordWound(
    context.attacker,
    effectTarget,
    context.skill,
    value,
    context.time + durationSeconds,
    context.time,
    context.metrics,
    context.contributions,
    context.events
  );
}

function applyTimedDebuffEffect(
  effect:
    | SkillEffectForType<"speed_down">
    | SkillEffectForType<"inner_defense_down">,
  context: SkillEffectResolutionContext
): void {
  applyTimedDebuff(
    context.combatants,
    context.attacker,
    context.offensiveTarget,
    context.skill,
    {
      type: effect.type,
      value: getDirectEffectValue(effect),
      durationSeconds: effect.durationSeconds,
      target: effect.target
    },
    context.time,
    context.events
  );
}

function applyDataStatusEffectHandler(
  effect: SkillEffectForType<"apply_status">,
  context: SkillEffectResolutionContext
): void {
  if (effect.durationSeconds <= 0) {
    return;
  }

  applyDataStatusEffect(
    context.combatants,
    context.statusDefinitions,
    context.attacker,
    context.offensiveTarget,
    context.skill,
    effect,
    context.time,
    context.events
  );
}

export const POST_ATTACK_SKILL_EFFECT_HANDLERS = {
  guard: applyGuardEffect,
  protect: applyProtectEffect,
  armor_break: applyArmorBreakEffect,
  wound: applyWoundEffect,
  speed_down: applyTimedDebuffEffect,
  inner_defense_down: applyTimedDebuffEffect,
  apply_status: applyDataStatusEffectHandler
} as const satisfies SkillEffectHandlerRegistry;

export function applyTimedSkillEffects(
  combatants: CombatantState[],
  statusDefinitions: Record<string, StatusEffectDefinition>,
  attacker: CombatantState,
  target: CombatantState,
  skill: SkillDefinition,
  time: number,
  metrics: BattleMetrics,
  contributions: Map<string, BattleContribution>,
  events: BattleEvent[]
): void {
  dispatchSkillEffects(
    {
      combatants,
      statusDefinitions,
      attacker,
      offensiveTarget: target,
      skill,
      time,
      metrics,
      contributions,
      events
    },
    POST_ATTACK_SKILL_EFFECT_HANDLERS
  );
}

function applyCleanseEffect(
  combatants: CombatantState[],
  statusDefinitions: Record<string, StatusEffectDefinition>,
  attacker: CombatantState,
  offensiveTarget: CombatantState,
  skill: SkillDefinition,
  effect: SkillEffect & { value: number },
  time: number,
  metrics: BattleMetrics,
  contributions: Map<string, BattleContribution>,
  events: BattleEvent[]
): void {
  const target = selectEffectTarget(
    combatants,
    attacker,
    offensiveTarget,
    effect,
    time,
    statusDefinitions
  );

  if (!isLiving(target)) {
    return;
  }

  const removeCount = Math.max(1, Math.floor(effect.value));
  const cleanse = cleanseCombatantStatuses({
    combatant: target,
    time,
    statusDefinitions,
    dispelTags: SKILL_CLEANSE_DISPEL_TAGS,
    maxCount: removeCount
  });

  if (cleanse.cleansedStatusIds.length === 0) {
    return;
  }

  if (attacker.team === "player") {
    metrics.cleansesByPlayer += 1;
  } else {
    metrics.cleansesByEnemy += 1;
  }

  const attackerContribution = contributions.get(attacker.instanceId);

  if (attackerContribution) {
    attackerContribution.cleansesApplied += 1;
  }

  events.push({
    type: "cleanse",
    time,
    sourceId: attacker.instanceId,
    targetId: target.instanceId,
    skillId: skill.id,
    statusesRemoved: cleanse.cleansedStatusIds
  });
}

function applyRegenerationEffect(
  combatants: CombatantState[],
  attacker: CombatantState,
  offensiveTarget: CombatantState,
  skill: SkillDefinition,
  effect: SkillEffect & { value: number },
  time: number,
  events: BattleEvent[]
): void {
  const durationSeconds = effect.durationSeconds ?? 0;
  const value = clampRecoveryEffectValue(effect.value);

  if (durationSeconds <= 0 || value <= 0) {
    return;
  }

  const target = selectEffectTarget(
    combatants,
    attacker,
    offensiveTarget,
    effect,
    time
  );

  if (!isLiving(target)) {
    return;
  }

  const restores =
    effect.type === "outer_regeneration_percent" ? "outer" : "inner";
  const endsAt = time + durationSeconds;

  setStatusEffect(
    target,
    createTimedRecoveryStatusEffect({
      value,
      sourceId: attacker.instanceId,
      targetId: target.instanceId,
      skillId: skill.id,
      appliedAt: time,
      durationSeconds,
      nextTickAt: time + RECOVERY_TICK_INTERVAL_SECONDS,
      tickIntervalSeconds: RECOVERY_TICK_INTERVAL_SECONDS,
      restores
    })
  );

  events.push({
    type: "regeneration",
    time,
    sourceId: attacker.instanceId,
    targetId: target.instanceId,
    skillId: skill.id,
    statusId: "regeneration",
    restores,
    percentPerTick: value,
    endsAt
  });
}

function applyHealEffect(
  effect:
    | SkillEffectForType<"outer_heal_percent">
    | SkillEffectForType<"inner_heal_percent">,
  context: SkillEffectResolutionContext
): void {
  const value = clampRecoveryEffectValue(getDirectEffectValue(effect));

  if (value <= 0) {
    return;
  }

  const target = selectEffectTarget(
    context.combatants,
    context.attacker,
    context.offensiveTarget,
    effect,
    context.time
  );

  if (!isLiving(target)) {
    return;
  }

  const result = applyRecoveryToTarget(
    context.attacker,
    target,
    effect.type === "outer_heal_percent" ? target.maxOuterHp * value : 0,
    effect.type === "inner_heal_percent" ? target.maxInnerQi * value : 0,
    context.statusDefinitions,
    context.time,
    context.metrics,
    context.contributions
  );

  context.events.push({
    type: "heal",
    time: context.time,
    sourceId: context.attacker.instanceId,
    targetId: target.instanceId,
    skillId: context.skill.id,
    ...result
  });
}

function applyRegenerationSkillEffect(
  effect:
    | SkillEffectForType<"outer_regeneration_percent">
    | SkillEffectForType<"inner_regeneration_percent">,
  context: SkillEffectResolutionContext
): void {
  applyRegenerationEffect(
    context.combatants,
    context.attacker,
    context.offensiveTarget,
    context.skill,
    { ...effect, value: getDirectEffectValue(effect) },
    context.time,
    context.events
  );
}

function applyCleanseSkillEffect(
  effect: SkillEffectForType<"cleanse">,
  context: SkillEffectResolutionContext
): void {
  applyCleanseEffect(
    context.combatants,
    context.statusDefinitions,
    context.attacker,
    context.offensiveTarget,
    context.skill,
    { ...effect, value: getDirectEffectValue(effect) },
    context.time,
    context.metrics,
    context.contributions,
    context.events
  );
}

export const RECOVERY_SKILL_EFFECT_HANDLERS = {
  outer_heal_percent: applyHealEffect,
  inner_heal_percent: applyHealEffect,
  outer_regeneration_percent: applyRegenerationSkillEffect,
  inner_regeneration_percent: applyRegenerationSkillEffect,
  cleanse: applyCleanseSkillEffect
} as const satisfies SkillEffectHandlerRegistry;

export const SKILL_EFFECT_DISPATCHERS = {
  post_attack: POST_ATTACK_SKILL_EFFECT_HANDLERS,
  recovery: RECOVERY_SKILL_EFFECT_HANDLERS
} as const satisfies Record<SkillEffectDispatchStage, SkillEffectHandlerRegistry>;

export function applyRecoverySkillEffects(
  combatants: CombatantState[],
  statusDefinitions: Record<string, StatusEffectDefinition>,
  attacker: CombatantState,
  offensiveTarget: CombatantState,
  skill: SkillDefinition,
  time: number,
  metrics: BattleMetrics,
  contributions: Map<string, BattleContribution>,
  events: BattleEvent[]
): void {
  if (!isLiving(attacker)) {
    return;
  }

  dispatchSkillEffects(
    {
      combatants,
      statusDefinitions,
      attacker,
      offensiveTarget,
      skill,
      time,
      metrics,
      contributions,
      events
    },
    RECOVERY_SKILL_EFFECT_HANDLERS
  );
}

export function tickRegeneration(
  combatants: CombatantState[],
  statusDefinitions: Record<string, StatusEffectDefinition>,
  time: number,
  metrics: BattleMetrics,
  contributions: Map<string, BattleContribution>,
  events: BattleEvent[]
): void {
  for (const combatant of combatants) {
    while (
      isLiving(combatant) &&
      combatant.regeneration &&
      time >= combatant.regeneration.nextTickAt &&
      combatant.regeneration.nextTickAt < combatant.regeneration.expiresAt
    ) {
      const regeneration = combatant.regeneration;
      const source =
        combatants.find(
          (candidate) => candidate.instanceId === regeneration.sourceId
        ) ?? combatant;
      const tickTime = Number(regeneration.nextTickAt.toFixed(6));
      const result = applyRecoveryToTarget(
        source,
        combatant,
        regeneration.restores === "outer"
          ? combatant.maxOuterHp * regeneration.value
          : 0,
        regeneration.restores === "inner"
          ? combatant.maxInnerQi * regeneration.value
          : 0,
        statusDefinitions,
        tickTime,
        metrics,
        contributions
      );

      events.push({
        type: "regeneration_tick",
        time: tickTime,
        sourceId: regeneration.sourceId,
        targetId: combatant.instanceId,
        skillId: regeneration.skillId,
        statusId: "regeneration",
        ...result
      });

      regeneration.nextTickAt = Number(
        (regeneration.nextTickAt + regeneration.tickIntervalSeconds).toFixed(6)
      );
    }
  }
}
