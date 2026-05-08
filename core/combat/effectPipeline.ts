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
  for (const effect of skill.effects) {
    const durationSeconds = effect.durationSeconds ?? 0;

    if (durationSeconds <= 0) {
      continue;
    }

    const endsAt = time + durationSeconds;

    switch (effect.type) {
      case "guard": {
        const value = clampDefensiveEffectValue(effect.value);

        setStatusEffect(
          attacker,
          createTimedStatusEffect({
            id: "guard",
            value,
            sourceId: attacker.instanceId,
            targetId: attacker.instanceId,
            skillId: skill.id,
            appliedAt: time,
            durationSeconds
          })
        );
        events.push({
          type: "guard",
          time,
          sourceId: attacker.instanceId,
          targetId: attacker.instanceId,
          skillId: skill.id,
          statusId: "guard",
          reduction: value,
          endsAt
        });
        break;
      }

      case "protect": {
        const value = clampDefensiveEffectValue(effect.value);

        setStatusEffect(
          attacker,
          createTimedStatusEffect({
            id: "protection",
            value,
            sourceId: attacker.instanceId,
            targetId: attacker.instanceId,
            skillId: skill.id,
            appliedAt: time,
            durationSeconds
          })
        );
        break;
      }

      case "armor_break": {
        const effectTarget = selectOffensiveEffectTarget(
          combatants,
          attacker,
          target,
          effect,
          time
        );

        if (!isLiving(effectTarget)) {
          break;
        }

        const value = clampDefensiveEffectValue(effect.value);

        setStatusEffect(
          effectTarget,
          createTimedStatusEffect({
            id: "armor_break",
            value,
            sourceId: attacker.instanceId,
            targetId: effectTarget.instanceId,
            skillId: skill.id,
            appliedAt: time,
            durationSeconds
          })
        );

        if (attacker.team === "player") {
          metrics.armorBreaksTriggeredByPlayer += 1;
        } else {
          metrics.armorBreaksTriggeredByEnemy += 1;
        }

        const attackerContribution = contributions.get(attacker.instanceId);

        if (attackerContribution) {
          attackerContribution.armorBreaksApplied += 1;
        }

        events.push({
          type: "armor_break",
          time,
          sourceId: attacker.instanceId,
          targetId: effectTarget.instanceId,
          skillId: skill.id,
          statusId: "armor_break",
          reduction: value,
          endsAt
        });
        break;
      }

      case "wound": {
        const value = clampRecoveryEffectValue(effect.value);
        const effectTarget = selectOffensiveEffectTarget(
          combatants,
          attacker,
          target,
          effect,
          time
        );

        if (value <= 0) {
          break;
        }

        recordWound(
          attacker,
          effectTarget,
          skill,
          value,
          endsAt,
          time,
          metrics,
          contributions,
          events
        );
        break;
      }

      case "speed_down":
      case "inner_defense_down":
        applyTimedDebuff(
          combatants,
          attacker,
          target,
          skill,
          {
            type: effect.type,
            value: effect.value,
            durationSeconds: effect.durationSeconds,
            target: effect.target
          },
          time,
          events
        );
        break;

      case "apply_status":
        applyDataStatusEffect(
          combatants,
          statusDefinitions,
          attacker,
          target,
          skill,
          effect,
          time,
          events
        );
        break;
    }
  }
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

  for (const effect of skill.effects) {
    switch (effect.type) {
      case "outer_heal_percent":
      case "inner_heal_percent": {
        const value = clampRecoveryEffectValue(effect.value);

        if (value <= 0) {
          break;
        }

        const target = selectEffectTarget(
          combatants,
          attacker,
          offensiveTarget,
          effect,
          time
        );

        if (!isLiving(target)) {
          break;
        }

        const result = applyRecoveryToTarget(
          attacker,
          target,
          effect.type === "outer_heal_percent" ? target.maxOuterHp * value : 0,
          effect.type === "inner_heal_percent" ? target.maxInnerQi * value : 0,
          statusDefinitions,
          time,
          metrics,
          contributions
        );

        events.push({
          type: "heal",
          time,
          sourceId: attacker.instanceId,
          targetId: target.instanceId,
          skillId: skill.id,
          ...result
        });
        break;
      }

      case "outer_regeneration_percent":
      case "inner_regeneration_percent":
        applyRegenerationEffect(
          combatants,
          attacker,
          offensiveTarget,
          skill,
          effect,
          time,
          events
        );
        break;

      case "cleanse":
        applyCleanseEffect(
          combatants,
          statusDefinitions,
          attacker,
          offensiveTarget,
          skill,
          effect,
          time,
          metrics,
          contributions,
          events
        );
        break;
    }
  }
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
