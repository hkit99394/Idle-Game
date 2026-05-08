import type {
  BattleContribution,
  BattleEvent,
  BattleMetrics,
  BattleResult,
  CombatFormulaConstants,
  CombatantInstanceDefinition,
  CombatantState,
  SimulateBattleInput,
  StatusEffectDefinition,
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
  clamp,
  defaultCombatFormulaConstants,
  deriveStats,
  scaleStatsForLevel
} from "./formulas";
import { getDefaultFormationSlot } from "./formations";
import {
  advanceStatusEffects,
  createStatusDictionary,
  expireStatusEffects,
  getActiveStatusEffectValue,
  getStatusCombatModifiers
} from "./statusEffects";
import { hasLivingTeamMember, isLiving, selectTarget } from "./targeting";

import {
  createInitialContributions,
  createInitialMetrics,
  finalizeContributions,
  finalizeMetrics,
  markDefeated,
  recordBacklash,
  recordDamage,
  recordQiBreak
} from "./battleRecorder";
import {
  applyGuardReduction,
  applyProtectionReduction,
  findProtector,
  getEffectiveTargetStats
} from "./defensivePipeline";
import {
  applyRecoverySkillEffects,
  applyTimedSkillEffects,
  tickRegeneration
} from "./effectPipeline";

const BASIC_SKILL_ID = "basic_strike";
type DefinitionLookup = {
  heroes: Map<string, HeroDefinition>;
  enemies: Map<string, EnemyDefinition>;
  skills: Map<string, SkillDefinition>;
  skillUpgrades: SkillUpgradeDefinition[];
  statusDefinitions: Record<string, StatusEffectDefinition>;
};

function createLookup(staticData: StaticGameData): DefinitionLookup {
  return {
    heroes: new Map(staticData.heroes.map((hero) => [hero.id, hero])),
    enemies: new Map(staticData.enemies.map((enemy) => [enemy.id, enemy])),
    skills: new Map(staticData.skills.map((skill) => [skill.id, skill])),
    skillUpgrades: staticData.skillUpgrades,
    statusDefinitions: createStatusDictionary(staticData.statusEffects)
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
    guard: null,
    protection: null,
    armorBreak: null,
    wound: null,
    speedDown: null,
    innerDefenseDown: null,
    activeStatuses: [],
    regeneration: null,
    defeatedAt: null
  };
}

function getEffectiveActionSpeed(combatant: CombatantState, time: number): number {
  const speedReduction = getActiveStatusEffectValue(
    combatant,
    "speed_down",
    time,
    (value) => clamp(value, 0, 0.9)
  );

  return combatant.stats.speed * (1 - speedReduction);
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
  statusDefinitions: Record<string, StatusEffectDefinition>,
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

    const modifiers = getStatusCombatModifiers(
      combatant.activeStatuses,
      statusDefinitions
    );
    combatant.innerQi = calculateInnerRecovery({
      maxInnerQi: combatant.maxInnerQi,
      currentInnerQi: combatant.innerQi,
      innerRecoveryRate:
        combatant.stats.innerRecoveryRate * modifiers.innerRecoveryMultiplier,
      deltaSeconds
    });
  }
}

function advanceCombatantDataStatuses(
  combatants: CombatantState[],
  statusDefinitions: Record<string, StatusEffectDefinition>,
  time: number,
  deltaSeconds: number,
  metrics: BattleMetrics,
  contributions: Map<string, BattleContribution>,
  events: BattleEvent[]
): void {
  for (const combatant of combatants) {
    if (!isLiving(combatant) || combatant.activeStatuses.length === 0) {
      continue;
    }

    const previousStatuses = combatant.activeStatuses;
    const result = advanceStatusEffects({
      activeStatuses: combatant.activeStatuses,
      definitions: statusDefinitions,
      deltaSeconds,
      targetMaxOuterHp: combatant.maxOuterHp,
      targetStatusResistance: combatant.stats.statusResistance
    });

    combatant.activeStatuses = result.statuses;

    for (const event of result.events) {
      if (event.type === "status_expire") {
        events.push({
          type: "status_expire",
          time,
          targetId: combatant.instanceId,
          statusId: event.statusId
        });
        continue;
      }

      if (event.outerDamage <= 0) {
        continue;
      }

      const activeStatus = previousStatuses.find(
        (status) => status.statusId === event.statusId
      );
      const source = activeStatus?.sourceCombatantId
        ? combatants.find(
            (candidate) =>
              candidate.instanceId === activeStatus.sourceCombatantId
          )
        : undefined;

      combatant.outerHp = Math.max(0, combatant.outerHp - event.outerDamage);

      if (source) {
        recordDamage(metrics, contributions, source, combatant, event.outerDamage, 0);
      }

      events.push({
        type: "status_tick",
        time,
        sourceId: activeStatus?.sourceCombatantId,
        targetId: combatant.instanceId,
        statusId: event.statusId,
        stacks: event.stacks,
        outerDamage: event.outerDamage
      });
      markDefeated(combatant, time, events);
    }
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
  const intendedTarget = selectTarget(combatants, attacker.team, skill.targetRule);

  if (!intendedTarget) {
    return;
  }

  const protector = findProtector(combatants, intendedTarget, time);
  const target = protector ?? intendedTarget;
  const effectiveTargetStats = getEffectiveTargetStats(target, time);
  const targetStatusModifiers = getStatusCombatModifiers(
    target.activeStatuses,
    lookup.statusDefinitions
  );
  let outerDamage = calculateOuterDamage(
    {
      attacker: attacker.stats,
      target: effectiveTargetStats,
      skillMultiplier: skill.outerMultiplier,
      targetIsQiBroken: target.isQiBroken
    },
    constants
  ) * (1 + (target.family ? attacker.damageMultipliersByFamily[target.family] ?? 0 : 0)) *
    targetStatusModifiers.outerDamageTakenMultiplier;
  let innerDamage = calculateInnerDamage(
    {
      attacker: attacker.stats,
      target: effectiveTargetStats,
      skillMultiplier: skill.innerMultiplier,
      targetIsQiBroken: target.isQiBroken
    },
    constants
  ) * (1 + (target.family ? attacker.damageMultipliersByFamily[target.family] ?? 0 : 0));

  outerDamage = applyGuardReduction(
    target,
    outerDamage,
    time,
    metrics,
    contributions,
    events
  );

  const protectedDamage = applyProtectionReduction(
    protector,
    intendedTarget,
    attacker,
    outerDamage,
    innerDamage,
    time,
    metrics,
    contributions,
    events
  );
  outerDamage = protectedDamage.outerDamage;
  innerDamage = protectedDamage.innerDamage;

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
    innerDamage,
    intendedTargetId:
      target.instanceId === intendedTarget.instanceId
        ? undefined
        : intendedTarget.instanceId
  });

  applyTimedSkillEffects(
    combatants,
    lookup.statusDefinitions,
    attacker,
    target,
    skill,
    time,
    metrics,
    contributions,
    events
  );
  applyRecoverySkillEffects(
    combatants,
    lookup.statusDefinitions,
    attacker,
    target,
    skill,
    time,
    metrics,
    contributions,
    events
  );
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

  const attackerStatusModifiers = getStatusCombatModifiers(
    attacker.activeStatuses,
    lookup.statusDefinitions
  );
  const statusBacklashDamage =
    attacker.maxOuterHp * attackerStatusModifiers.attackBacklashOuterHpPercent;

  if (statusBacklashDamage > 0 && isLiving(attacker)) {
    attacker.outerHp -= statusBacklashDamage;
    recordBacklash(metrics, contributions, attacker, statusBacklashDamage);
    events.push({
      type: "backlash",
      time,
      sourceId: attacker.instanceId,
      damage: statusBacklashDamage
    });
    markDefeated(attacker, time, events);
  }

  if (skill.id !== BASIC_SKILL_ID) {
    attacker.skillCooldowns[skill.id] = time + skill.cooldownSeconds;
  }

  attacker.nextActionAt =
    time + calculateAttackInterval(getEffectiveActionSpeed(attacker, time), constants);
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

    expireStatusEffects(combatants, time);
    advanceCombatantDataStatuses(
      combatants,
      lookup.statusDefinitions,
      time,
      stepSeconds,
      metrics,
      contributions,
      events
    );
    recoverQiBreaks(combatants, time, constants, events);
    recoverInnerQi(
      combatants,
      lookup.statusDefinitions,
      time,
      stepSeconds,
      constants
    );
    tickRegeneration(
      combatants,
      lookup.statusDefinitions,
      time,
      metrics,
      contributions,
      events
    );

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
