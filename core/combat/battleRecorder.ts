import type {
  BattleContribution,
  BattleEvent,
  BattleMetrics,
  CombatantState
} from "./types";
import { getBattleEventStatusId } from "./statusMetadata";
import { isLiving } from "./targeting";

export type BattleEventCategory = BattleEvent["type"];

export type BattleEventRecord = {
  id: string;
  index: number;
  category: BattleEventCategory;
  type: BattleEvent["type"];
  statusId: string | null;
  timeSeconds: number;
};

export const BATTLE_EVENT_TYPES = [
  "attack",
  "guard",
  "guard_absorb",
  "protect",
  "armor_break",
  "wound",
  "speed_down",
  "inner_defense_down",
  "status_apply",
  "status_tick",
  "status_expire",
  "regeneration",
  "regeneration_tick",
  "cleanse",
  "auto_medicine",
  "qi_break",
  "qi_recover",
  "backlash",
  "heal",
  "defeat"
] as const satisfies readonly BattleEvent["type"][];

export function createBattleEventRecord(
  event: BattleEvent,
  index: number
): BattleEventRecord {
  return {
    id: `${index}-${event.type}-${event.time}`,
    index,
    category: event.type,
    type: event.type,
    statusId: getBattleEventStatusId(event),
    timeSeconds: event.time
  };
}

export function createBattleEventRecords(
  events: BattleEvent[]
): BattleEventRecord[] {
  return events.map(createBattleEventRecord);
}

export function createInitialMetrics(): BattleMetrics {
  return {
    playerOuterDamage: 0,
    playerInnerDamage: 0,
    enemyOuterDamage: 0,
    enemyInnerDamage: 0,
    playerQiBreakBurstDamage: 0,
    enemyQiBreakBurstDamage: 0,
    qiBreaksTriggeredByPlayer: 0,
    qiBreaksTriggeredByEnemy: 0,
    backlashDamageToEnemies: 0,
    backlashDamageToPlayers: 0,
    guardDamagePreventedByPlayer: 0,
    guardDamagePreventedByEnemy: 0,
    protectionDamagePreventedByPlayer: 0,
    protectionDamagePreventedByEnemy: 0,
    armorBreaksTriggeredByPlayer: 0,
    armorBreaksTriggeredByEnemy: 0,
    woundsTriggeredByPlayer: 0,
    woundsTriggeredByEnemy: 0,
    cleansesByPlayer: 0,
    cleansesByEnemy: 0,
    playerOuterHealing: 0,
    enemyOuterHealing: 0,
    playerInnerQiRestored: 0,
    enemyInnerQiRestored: 0,
    playerOverhealing: 0,
    enemyOverhealing: 0,
    recoveryPreventedByPlayer: 0,
    recoveryPreventedByEnemy: 0,
    playerEffectiveDps: 0,
    enemyEffectiveDps: 0
  };
}

export function createInitialContributions(
  combatants: CombatantState[]
): Map<string, BattleContribution> {
  return new Map(
    combatants.map((combatant) => [
      combatant.instanceId,
      {
        instanceId: combatant.instanceId,
        definitionId: combatant.definitionId,
        kind: combatant.kind,
        team: combatant.team,
        name: combatant.name,
        formationSlot: combatant.formationSlot,
        combatRole: combatant.combatRole,
        outerDamageDealt: 0,
        innerDamageDealt: 0,
        qiBreakBurstDamageDealt: 0,
        qiBreaksTriggered: 0,
        outerDamageTaken: 0,
        innerDamageTaken: 0,
        backlashDamageTaken: 0,
        guardDamagePrevented: 0,
        protectionDamagePrevented: 0,
        protectionTriggers: 0,
        armorBreaksApplied: 0,
        woundsApplied: 0,
        cleansesApplied: 0,
        outerHealingDone: 0,
        innerQiRestored: 0,
        overhealingDone: 0,
        recoveryPrevented: 0,
        survived: true
      }
    ])
  );
}

export function recordDamage(
  metrics: BattleMetrics,
  contributions: Map<string, BattleContribution>,
  source: CombatantState,
  target: CombatantState,
  outerDamage: number,
  innerDamage: number
): void {
  if (source.team === "player") {
    metrics.playerOuterDamage += outerDamage;
    metrics.playerInnerDamage += innerDamage;
  } else {
    metrics.enemyOuterDamage += outerDamage;
    metrics.enemyInnerDamage += innerDamage;
  }

  const sourceContribution = contributions.get(source.instanceId);
  const targetContribution = contributions.get(target.instanceId);

  if (sourceContribution) {
    sourceContribution.outerDamageDealt += outerDamage;
    sourceContribution.innerDamageDealt += innerDamage;
  }

  if (targetContribution) {
    targetContribution.outerDamageTaken += outerDamage;
    targetContribution.innerDamageTaken += innerDamage;
  }
}

export function recordQiBreak(
  metrics: BattleMetrics,
  contributions: Map<string, BattleContribution>,
  source: CombatantState,
  target: CombatantState,
  burstDamage: number
): void {
  if (source.team === "player") {
    metrics.qiBreaksTriggeredByPlayer += 1;
    metrics.playerQiBreakBurstDamage += burstDamage;
  } else {
    metrics.qiBreaksTriggeredByEnemy += 1;
    metrics.enemyQiBreakBurstDamage += burstDamage;
  }

  const sourceContribution = contributions.get(source.instanceId);
  const targetContribution = contributions.get(target.instanceId);

  if (sourceContribution) {
    sourceContribution.qiBreaksTriggered += 1;
    sourceContribution.qiBreakBurstDamageDealt += burstDamage;
  }

  if (targetContribution) {
    targetContribution.outerDamageTaken += burstDamage;
  }
}

export function recordBacklash(
  metrics: BattleMetrics,
  contributions: Map<string, BattleContribution>,
  brokenAttacker: CombatantState,
  damage: number
): void {
  if (brokenAttacker.team === "player") {
    metrics.backlashDamageToPlayers += damage;
  } else {
    metrics.backlashDamageToEnemies += damage;
  }

  const contribution = contributions.get(brokenAttacker.instanceId);

  if (contribution) {
    contribution.outerDamageTaken += damage;
    contribution.backlashDamageTaken += damage;
  }
}

export function markDefeated(
  combatant: CombatantState,
  time: number,
  events: BattleEvent[]
): void {
  if (combatant.outerHp <= 0 && combatant.defeatedAt === null) {
    combatant.outerHp = 0;
    combatant.defeatedAt = time;
    events.push({
      type: "defeat",
      time,
      targetId: combatant.instanceId,
      team: combatant.team
    });
  }
}

export function finalizeMetrics(metrics: BattleMetrics, durationSeconds: number): BattleMetrics {
  const safeDuration = Math.max(durationSeconds, 0.001);

  return {
    ...metrics,
    playerEffectiveDps:
      (metrics.playerOuterDamage +
        metrics.playerQiBreakBurstDamage +
        metrics.backlashDamageToEnemies) /
      safeDuration,
    enemyEffectiveDps:
      (metrics.enemyOuterDamage +
        metrics.enemyQiBreakBurstDamage +
        metrics.backlashDamageToPlayers) /
      safeDuration
  };
}

export function finalizeContributions(
  combatants: CombatantState[],
  contributions: Map<string, BattleContribution>
): BattleContribution[] {
  for (const combatant of combatants) {
    const contribution = contributions.get(combatant.instanceId);

    if (contribution) {
      contribution.survived = isLiving(combatant);
    }
  }

  return [...contributions.values()];
}
