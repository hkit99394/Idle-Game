import type {
  BattleEvent,
  BattleMetrics,
  BattleResult,
  CombatFormulaConstants,
  CombatantInstanceDefinition,
  CombatantState,
  SimulateBattleInput,
  TeamId
} from "./types";
import type {
  EnemyDefinition,
  HeroDefinition,
  SkillDefinition,
  StaticGameData
} from "../data/types";
import {
  calculateAttackInterval,
  calculateInnerDamage,
  calculateInnerRecovery,
  calculateOuterDamage,
  calculateQiBreakBacklashDamage,
  calculateQiBreakBurst,
  calculateQiBreakRecovery,
  defaultCombatFormulaConstants,
  deriveStats,
  scaleStatsForLevel
} from "./formulas";
import { getDefaultFormationSlot } from "./formations";
import { hasLivingTeamMember, isLiving, selectTarget } from "./targeting";

const BASIC_SKILL_ID = "basic_strike";

type DefinitionLookup = {
  heroes: Map<string, HeroDefinition>;
  enemies: Map<string, EnemyDefinition>;
  skills: Map<string, SkillDefinition>;
};

function createLookup(staticData: StaticGameData): DefinitionLookup {
  return {
    heroes: new Map(staticData.heroes.map((hero) => [hero.id, hero])),
    enemies: new Map(staticData.enemies.map((enemy) => [enemy.id, enemy])),
    skills: new Map(staticData.skills.map((skill) => [skill.id, skill]))
  };
}

function getDefinition(
  lookup: DefinitionLookup,
  instance: CombatantInstanceDefinition
): HeroDefinition | EnemyDefinition {
  const definition =
    instance.kind === "hero"
      ? lookup.heroes.get(instance.definitionId)
      : lookup.enemies.get(instance.definitionId);

  if (!definition) {
    throw new Error(`Missing ${instance.kind} definition ${instance.definitionId}`);
  }

  return definition;
}

function getSkill(lookup: DefinitionLookup, skillId: string): SkillDefinition {
  const skill = lookup.skills.get(skillId);

  if (!skill) {
    throw new Error(`Missing skill definition ${skillId}`);
  }

  return skill;
}

function createCombatantState(
  lookup: DefinitionLookup,
  team: TeamId,
  instance: CombatantInstanceDefinition,
  index: number,
  constants: CombatFormulaConstants
): CombatantState {
  const definition = getDefinition(lookup, instance);
  const definitionLevel =
    instance.kind === "enemy"
      ? (definition as EnemyDefinition).level
      : 1;
  const level = instance.level ?? definitionLevel ?? 1;
  const stats = deriveStats(
    instance.statsOverride ?? scaleStatsForLevel(definition.baseStats, level)
  );
  const instanceId = instance.instanceId ?? `${team}_${definition.id}_${index + 1}`;
  const family = instance.kind === "enemy" ? (definition as EnemyDefinition).family : undefined;

  return {
    instanceId,
    definitionId: definition.id,
    kind: instance.kind,
    level,
    formationSlot: instance.formationSlot ?? getDefaultFormationSlot(index),
    family,
    name: definition.name,
    team,
    outerHp: stats.maxOuterHp,
    innerQi: stats.maxInnerQi,
    maxOuterHp: stats.maxOuterHp,
    maxInnerQi: stats.maxInnerQi,
    stats,
    damageMultipliersByFamily: instance.damageMultipliersByFamily ?? {},
    skillIds: definition.skillIds,
    nextActionAt: calculateAttackInterval(stats.speed, constants),
    skillCooldowns: Object.fromEntries(definition.skillIds.map((skillId) => [skillId, 0])),
    isQiBroken: false,
    qiBreakEndsAt: null,
    lastInnerDamageAt: null,
    defeatedAt: null
  };
}

function createInitialMetrics(): BattleMetrics {
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
    playerEffectiveDps: 0,
    enemyEffectiveDps: 0
  };
}

function createCombatants(
  lookup: DefinitionLookup,
  input: SimulateBattleInput,
  constants: CombatFormulaConstants
): CombatantState[] {
  const playerCombatants = input.playerTeam.combatants.map((combatant, index) =>
    createCombatantState(lookup, input.playerTeam.id, combatant, index, constants)
  );
  const enemyCombatants = input.enemyTeam.combatants.map((combatant, index) =>
    createCombatantState(lookup, input.enemyTeam.id, combatant, index, constants)
  );

  return [...playerCombatants, ...enemyCombatants];
}

function chooseSkill(
  lookup: DefinitionLookup,
  combatant: CombatantState,
  time: number
): SkillDefinition {
  const readySkillId = combatant.skillIds.find(
    (skillId) => (combatant.skillCooldowns[skillId] ?? 0) <= time
  );

  if (readySkillId) {
    return getSkill(lookup, readySkillId);
  }

  return getSkill(lookup, BASIC_SKILL_ID);
}

function recordDamage(
  metrics: BattleMetrics,
  sourceTeam: TeamId,
  outerDamage: number,
  innerDamage: number
): void {
  if (sourceTeam === "player") {
    metrics.playerOuterDamage += outerDamage;
    metrics.playerInnerDamage += innerDamage;
  } else {
    metrics.enemyOuterDamage += outerDamage;
    metrics.enemyInnerDamage += innerDamage;
  }
}

function recordQiBreak(
  metrics: BattleMetrics,
  sourceTeam: TeamId,
  burstDamage: number
): void {
  if (sourceTeam === "player") {
    metrics.qiBreaksTriggeredByPlayer += 1;
    metrics.playerQiBreakBurstDamage += burstDamage;
  } else {
    metrics.qiBreaksTriggeredByEnemy += 1;
    metrics.enemyQiBreakBurstDamage += burstDamage;
  }
}

function recordBacklash(
  metrics: BattleMetrics,
  brokenAttackerTeam: TeamId,
  damage: number
): void {
  if (brokenAttackerTeam === "player") {
    metrics.backlashDamageToPlayers += damage;
  } else {
    metrics.backlashDamageToEnemies += damage;
  }
}

function markDefeated(
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

function applyQiBreakIfNeeded(
  attacker: CombatantState,
  target: CombatantState,
  time: number,
  constants: CombatFormulaConstants,
  metrics: BattleMetrics,
  events: BattleEvent[]
): void {
  if (target.innerQi > 0 || target.isQiBroken || !isLiving(target)) {
    return;
  }

  target.innerQi = 0;
  target.isQiBroken = true;
  target.qiBreakEndsAt = time + constants.qiBreakDurationSeconds;

  const burst = calculateQiBreakBurst(
    {
      targetMaxOuterHp: target.maxOuterHp,
      attackerBreakPower: attacker.stats.breakPower,
      targetBreakResist: target.stats.breakResist
    },
    constants
  );

  target.outerHp -= burst.damage;
  recordQiBreak(metrics, attacker.team, burst.damage);
  events.push({
    type: "qi_break",
    time,
    sourceId: attacker.instanceId,
    targetId: target.instanceId,
    burstDamage: burst.damage,
    burstPercent: burst.percent,
    endsAt: target.qiBreakEndsAt
  });
  markDefeated(target, time, events);
}

function recoverQiBreaks(
  combatants: CombatantState[],
  time: number,
  constants: CombatFormulaConstants,
  events: BattleEvent[]
): void {
  for (const combatant of combatants) {
    if (
      isLiving(combatant) &&
      combatant.isQiBroken &&
      combatant.qiBreakEndsAt !== null &&
      time >= combatant.qiBreakEndsAt
    ) {
      combatant.isQiBroken = false;
      combatant.qiBreakEndsAt = null;
      combatant.innerQi = calculateQiBreakRecovery(combatant.maxInnerQi, constants);
      combatant.lastInnerDamageAt = time;
      events.push({
        type: "qi_recover",
        time,
        targetId: combatant.instanceId,
        innerQi: combatant.innerQi
      });
    }
  }
}

function recoverInnerQi(
  combatants: CombatantState[],
  time: number,
  deltaSeconds: number,
  constants: CombatFormulaConstants
): void {
  for (const combatant of combatants) {
    if (!isLiving(combatant) || combatant.isQiBroken) {
      continue;
    }

    const canRecover =
      combatant.lastInnerDamageAt === null ||
      time - combatant.lastInnerDamageAt >= constants.innerRecoveryDelaySeconds;

    if (!canRecover || combatant.innerQi >= combatant.maxInnerQi) {
      continue;
    }

    combatant.innerQi = calculateInnerRecovery({
      maxInnerQi: combatant.maxInnerQi,
      currentInnerQi: combatant.innerQi,
      innerRecoveryRate: combatant.stats.innerRecoveryRate,
      deltaSeconds
    });
  }
}

function executeAction(
  lookup: DefinitionLookup,
  combatants: CombatantState[],
  attacker: CombatantState,
  time: number,
  constants: CombatFormulaConstants,
  metrics: BattleMetrics,
  events: BattleEvent[]
): void {
  if (!isLiving(attacker) || time < attacker.nextActionAt) {
    return;
  }

  const skill = chooseSkill(lookup, attacker, time);
  const target = selectTarget(combatants, attacker.team, skill.targetRule);

  if (!target) {
    return;
  }

  const outerDamage = calculateOuterDamage(
    {
      attacker: attacker.stats,
      target: target.stats,
      skillMultiplier: skill.outerMultiplier,
      targetIsQiBroken: target.isQiBroken
    },
    constants
  ) * (1 + (target.family ? attacker.damageMultipliersByFamily[target.family] ?? 0 : 0));
  const innerDamage = calculateInnerDamage(
    {
      attacker: attacker.stats,
      target: target.stats,
      skillMultiplier: skill.innerMultiplier,
      targetIsQiBroken: target.isQiBroken
    },
    constants
  ) * (1 + (target.family ? attacker.damageMultipliersByFamily[target.family] ?? 0 : 0));

  target.outerHp = Math.max(0, target.outerHp - outerDamage);
  target.innerQi = Math.max(0, target.innerQi - innerDamage);

  if (innerDamage > 0) {
    target.lastInnerDamageAt = time;
  }

  recordDamage(metrics, attacker.team, outerDamage, innerDamage);
  events.push({
    type: "attack",
    time,
    sourceId: attacker.instanceId,
    targetId: target.instanceId,
    skillId: skill.id,
    outerDamage,
    innerDamage
  });

  applyQiBreakIfNeeded(attacker, target, time, constants, metrics, events);
  markDefeated(target, time, events);

  if (attacker.isQiBroken && isLiving(attacker)) {
    const backlashDamage = calculateQiBreakBacklashDamage(attacker.maxOuterHp, constants);
    attacker.outerHp -= backlashDamage;
    recordBacklash(metrics, attacker.team, backlashDamage);
    events.push({
      type: "backlash",
      time,
      sourceId: attacker.instanceId,
      damage: backlashDamage
    });
    markDefeated(attacker, time, events);
  }

  if (skill.id !== BASIC_SKILL_ID) {
    attacker.skillCooldowns[skill.id] = time + skill.cooldownSeconds;
  }

  attacker.nextActionAt = time + calculateAttackInterval(attacker.stats.speed, constants);
}

function getWinner(combatants: CombatantState[]): TeamId | null {
  const playerAlive = hasLivingTeamMember(combatants, "player");
  const enemyAlive = hasLivingTeamMember(combatants, "enemy");

  if (playerAlive && !enemyAlive) {
    return "player";
  }

  if (enemyAlive && !playerAlive) {
    return "enemy";
  }

  return null;
}

function finalizeMetrics(metrics: BattleMetrics, durationSeconds: number): BattleMetrics {
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

export function simulateBattle(
  staticData: StaticGameData,
  input: SimulateBattleInput
): BattleResult {
  const constants = input.constants ?? defaultCombatFormulaConstants;
  const maxDurationSeconds = input.maxDurationSeconds ?? 180;
  const stepSeconds = input.stepSeconds ?? 0.1;
  const lookup = createLookup(staticData);
  const combatants = createCombatants(lookup, input, constants);
  const events: BattleEvent[] = [];
  const metrics = createInitialMetrics();
  const totalSteps = Math.ceil(maxDurationSeconds / stepSeconds);
  let durationSeconds = maxDurationSeconds;
  let winner: BattleResult["winner"] = "timeout";

  for (let step = 0; step <= totalSteps; step += 1) {
    const time = Number((step * stepSeconds).toFixed(6));

    recoverQiBreaks(combatants, time, constants, events);
    recoverInnerQi(combatants, time, stepSeconds, constants);

    for (const combatant of combatants) {
      executeAction(lookup, combatants, combatant, time, constants, metrics, events);
      const currentWinner = getWinner(combatants);

      if (currentWinner) {
        winner = currentWinner;
        durationSeconds = time;
        break;
      }
    }

    if (winner !== "timeout") {
      break;
    }
  }

  return {
    winner,
    durationSeconds,
    events,
    finalPlayerTeam: combatants.filter((combatant) => combatant.team === "player"),
    finalEnemyTeam: combatants.filter((combatant) => combatant.team === "enemy"),
    metrics: finalizeMetrics(metrics, durationSeconds)
  };
}
