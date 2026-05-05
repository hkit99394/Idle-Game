import type {
  BattleContribution,
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
  SkillUpgradeDefinition,
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
  skillUpgrades: SkillUpgradeDefinition[];
};

function createLookup(staticData: StaticGameData): DefinitionLookup {
  return {
    heroes: new Map(staticData.heroes.map((hero) => [hero.id, hero])),
    enemies: new Map(staticData.enemies.map((enemy) => [enemy.id, enemy])),
    skills: new Map(staticData.skills.map((skill) => [skill.id, skill])),
    skillUpgrades: staticData.skillUpgrades
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

function applySkillUpgradesToSkill(
  skill: SkillDefinition,
  skillUpgrades: SkillUpgradeDefinition[],
  levels: Record<string, number>
): SkillDefinition {
  let cooldownSeconds = skill.cooldownSeconds;
  let outerMultiplier = skill.outerMultiplier;
  let innerMultiplier = skill.innerMultiplier;
  const effects = [...skill.effects];

  for (const upgrade of skillUpgrades) {
    if (upgrade.skillId !== skill.id) {
      continue;
    }

    const level = levels[upgrade.id] ?? 0;

    if (level <= 0) {
      continue;
    }

    for (const effect of upgrade.effects) {
      switch (effect.type) {
        case "cooldown_seconds":
          cooldownSeconds += effect.valuePerLevel * level;
          break;

        case "outer_multiplier":
          outerMultiplier += effect.valuePerLevel * level;
          break;

        case "inner_multiplier":
          innerMultiplier += effect.valuePerLevel * level;
          break;

        case "add_skill_effect":
          if (level >= effect.unlockLevel) {
            effects.push(effect.effect);
          }
          break;
      }
    }
  }

  return {
    ...skill,
    cooldownSeconds: Math.max(0, cooldownSeconds),
    outerMultiplier: Math.max(0, outerMultiplier),
    innerMultiplier: Math.max(0, innerMultiplier),
    effects
  };
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
    combatRole: definition.combatRole,
    family,
    name: definition.name,
    team,
    outerHp: stats.maxOuterHp,
    innerQi: stats.maxInnerQi,
    maxOuterHp: stats.maxOuterHp,
    maxInnerQi: stats.maxInnerQi,
    stats,
    damageMultipliersByFamily: instance.damageMultipliersByFamily ?? {},
    skillUpgradeLevels: instance.skillUpgradeLevels ?? {},
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

function createInitialContributions(
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
        survived: true
      }
    ])
  );
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
    return applySkillUpgradesToSkill(
      getSkill(lookup, readySkillId),
      lookup.skillUpgrades,
      combatant.skillUpgradeLevels
    );
  }

  return applySkillUpgradesToSkill(
    getSkill(lookup, BASIC_SKILL_ID),
    lookup.skillUpgrades,
    combatant.skillUpgradeLevels
  );
}

function recordDamage(
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

function recordQiBreak(
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

function recordBacklash(
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

function applyHealingEffects(
  attacker: CombatantState,
  skill: SkillDefinition,
  time: number,
  events: BattleEvent[]
): void {
  if (!isLiving(attacker)) {
    return;
  }

  for (const effect of skill.effects) {
    if (effect.type !== "outer_heal_percent" || effect.value <= 0) {
      continue;
    }

    const missingOuterHp = attacker.maxOuterHp - attacker.outerHp;
    const outerHealing = Math.min(missingOuterHp, attacker.maxOuterHp * effect.value);

    if (outerHealing <= 0) {
      continue;
    }

    attacker.outerHp += outerHealing;
    events.push({
      type: "heal",
      time,
      sourceId: attacker.instanceId,
      targetId: attacker.instanceId,
      outerHealing
    });
  }
}

function applyQiBreakIfNeeded(
  attacker: CombatantState,
  target: CombatantState,
  time: number,
  constants: CombatFormulaConstants,
  metrics: BattleMetrics,
  contributions: Map<string, BattleContribution>,
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
  recordQiBreak(metrics, contributions, attacker, target, burst.damage);
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
  contributions: Map<string, BattleContribution>,
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

  recordDamage(metrics, contributions, attacker, target, outerDamage, innerDamage);
  events.push({
    type: "attack",
    time,
    sourceId: attacker.instanceId,
    targetId: target.instanceId,
    skillId: skill.id,
    outerDamage,
    innerDamage
  });

  applyHealingEffects(attacker, skill, time, events);
  applyQiBreakIfNeeded(
    attacker,
    target,
    time,
    constants,
    metrics,
    contributions,
    events
  );
  markDefeated(target, time, events);

  if (attacker.isQiBroken && isLiving(attacker)) {
    const backlashDamage = calculateQiBreakBacklashDamage(attacker.maxOuterHp, constants);
    attacker.outerHp -= backlashDamage;
    recordBacklash(metrics, contributions, attacker, backlashDamage);
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

function finalizeContributions(
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
  const contributions = createInitialContributions(combatants);
  const totalSteps = Math.ceil(maxDurationSeconds / stepSeconds);
  let durationSeconds = maxDurationSeconds;
  let winner: BattleResult["winner"] = "timeout";

  for (let step = 0; step <= totalSteps; step += 1) {
    const time = Number((step * stepSeconds).toFixed(6));

    recoverQiBreaks(combatants, time, constants, events);
    recoverInnerQi(combatants, time, stepSeconds, constants);

    for (const combatant of combatants) {
      executeAction(
        lookup,
        combatants,
        combatant,
        time,
        constants,
        metrics,
        contributions,
        events
      );
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
    metrics: finalizeMetrics(metrics, durationSeconds),
    contributions: finalizeContributions(combatants, contributions)
  };
}
