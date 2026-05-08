import type { BattleContribution, BattleEvent, BattleMetrics, CombatantState } from "./types";
import type { SkillDefinition, SkillEffect } from "../data/types";
import { calculateInnerRecovery } from "./formulas";
import { clampDefensiveEffectValue, clampRecoveryEffectValue } from "./defensivePipeline";
import {
  clearCleanseableStatusEffects,
  createTimedRecoveryStatusEffect,
  createTimedStatusEffect,
  getActiveStatusEffect,
  getActiveStatusEffectValue,
  hasCleanseableStatusEffect,
  setStatusEffect
} from "./statusEffects";
import { isLiving } from "./targeting";

const RECOVERY_TICK_INTERVAL_SECONDS = 1;

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

function hasCleanseableStatus(combatant: CombatantState, time: number): boolean {
  return hasCleanseableStatusEffect(combatant, time);
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
  time: number
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
        hasCleanseableStatus(combatant, time) ? 1 : 0
      );

    case "self":
    case undefined:
      return attacker;
  }
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
  const recoveryPrevented =
    (rawOuterRecovery + rawInnerRecovery) * woundReduction;
  const reducedOuterRecovery = rawOuterRecovery * (1 - woundReduction);
  const reducedInnerRecovery = rawInnerRecovery * (1 - woundReduction);
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

export function applyTimedSkillEffects(
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
        if (!isLiving(target)) {
          break;
        }

        const value = clampDefensiveEffectValue(effect.value);

        setStatusEffect(
          target,
          createTimedStatusEffect({
            id: "armor_break",
            value,
            sourceId: attacker.instanceId,
            targetId: target.instanceId,
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
          targetId: target.instanceId,
          skillId: skill.id,
          statusId: "armor_break",
          reduction: value,
          endsAt
        });
        break;
      }

      case "wound": {
        const value = clampRecoveryEffectValue(effect.value);

        if (value <= 0) {
          break;
        }

        recordWound(
          attacker,
          target,
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
    }
  }
}

function applyCleanseEffect(
  combatants: CombatantState[],
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
    time
  );

  if (!isLiving(target)) {
    return;
  }

  const removeCount = Math.max(1, Math.floor(effect.value));
  const statusesRemoved = clearCleanseableStatusEffects(target, time, removeCount);

  if (statusesRemoved.length === 0) {
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
    statusesRemoved
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
