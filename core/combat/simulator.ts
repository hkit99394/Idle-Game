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
  SkillEffect,
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
import { hasLivingTeamMember, isLiving, selectTarget } from "./targeting";

const BASIC_SKILL_ID = "basic_strike";
const DEFENSIVE_EFFECT_MAX_VALUE = 0.9;
const RECOVERY_EFFECT_MAX_VALUE = 1;
const RECOVERY_TICK_INTERVAL_SECONDS = 1;
const FORMATION_SLOT_ORDER = {
  front: 0,
  middle: 1,
  back: 2
} as const;

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
    guard: null,
    protection: null,
    armorBreak: null,
    wound: null,
    regeneration: null,
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

function getFormationSlotOrder(combatant: CombatantState): number {
  return FORMATION_SLOT_ORDER[combatant.formationSlot];
}

function clampDefensiveEffectValue(value: number): number {
  return clamp(value, 0, DEFENSIVE_EFFECT_MAX_VALUE);
}

function clampRecoveryEffectValue(value: number): number {
  return clamp(value, 0, RECOVERY_EFFECT_MAX_VALUE);
}

function expireTimedCombatEffects(combatants: CombatantState[], time: number): void {
  for (const combatant of combatants) {
    if (combatant.guard && time >= combatant.guard.expiresAt) {
      combatant.guard = null;
    }

    if (combatant.protection && time >= combatant.protection.expiresAt) {
      combatant.protection = null;
    }

    if (combatant.armorBreak && time >= combatant.armorBreak.expiresAt) {
      combatant.armorBreak = null;
    }

    if (combatant.wound && time >= combatant.wound.expiresAt) {
      combatant.wound = null;
    }

    if (combatant.regeneration && time >= combatant.regeneration.expiresAt) {
      combatant.regeneration = null;
    }
  }
}

function getActiveEffectValue(
  effect: CombatantState["guard"],
  time: number
): number {
  if (!effect || time >= effect.expiresAt) {
    return 0;
  }

  return clampDefensiveEffectValue(effect.value);
}

function getEffectiveTargetStats(
  target: CombatantState,
  time: number
): CombatantState["stats"] {
  const armorBreak = getActiveEffectValue(target.armorBreak, time);

  if (armorBreak <= 0) {
    return target.stats;
  }

  return {
    ...target.stats,
    outerDefense: target.stats.outerDefense * (1 - armorBreak)
  };
}

function findProtector(
  combatants: CombatantState[],
  target: CombatantState,
  time: number
): CombatantState | null {
  const targetSlotOrder = getFormationSlotOrder(target);

  return combatants
    .flatMap((combatant, encounterOrder) =>
      combatant.team === target.team &&
      combatant.instanceId !== target.instanceId &&
      isLiving(combatant) &&
      getActiveEffectValue(combatant.protection, time) > 0 &&
      getFormationSlotOrder(combatant) < targetSlotOrder
        ? [{ combatant, encounterOrder }]
        : []
    )
    .sort((first, second) => {
      const slotDifference =
        getFormationSlotOrder(second.combatant) -
        getFormationSlotOrder(first.combatant);

      return slotDifference || first.encounterOrder - second.encounterOrder;
    })[0]?.combatant ?? null;
}

function applyGuardReduction(
  target: CombatantState,
  outerDamage: number,
  time: number,
  metrics: BattleMetrics,
  contributions: Map<string, BattleContribution>,
  events: BattleEvent[]
): number {
  if (!target.guard || time >= target.guard.expiresAt) {
    return outerDamage;
  }

  const armorBreak = getActiveEffectValue(target.armorBreak, time);
  const reduction = Math.max(0, clampDefensiveEffectValue(target.guard.value) - armorBreak);

  if (reduction <= 0) {
    return outerDamage;
  }

  const outerDamagePrevented = outerDamage * reduction;

  if (target.team === "player") {
    metrics.guardDamagePreventedByPlayer += outerDamagePrevented;
  } else {
    metrics.guardDamagePreventedByEnemy += outerDamagePrevented;
  }

  const targetContribution = contributions.get(target.instanceId);

  if (targetContribution) {
    targetContribution.guardDamagePrevented += outerDamagePrevented;
  }

  events.push({
    type: "guard_absorb",
    time,
    targetId: target.instanceId,
    skillId: target.guard.skillId,
    outerDamagePrevented,
    reduction
  });

  return outerDamage - outerDamagePrevented;
}

function recordProtection(
  protector: CombatantState,
  protectedTarget: CombatantState,
  attacker: CombatantState,
  outerDamagePrevented: number,
  innerDamagePrevented: number,
  reduction: number,
  time: number,
  metrics: BattleMetrics,
  contributions: Map<string, BattleContribution>,
  events: BattleEvent[]
): void {
  if (!protector.protection) {
    return;
  }

  const totalPrevented = outerDamagePrevented + innerDamagePrevented;

  if (protector.team === "player") {
    metrics.protectionDamagePreventedByPlayer += totalPrevented;
  } else {
    metrics.protectionDamagePreventedByEnemy += totalPrevented;
  }

  const protectorContribution = contributions.get(protector.instanceId);

  if (protectorContribution) {
    protectorContribution.protectionDamagePrevented += totalPrevented;
    protectorContribution.protectionTriggers += 1;
  }

  events.push({
    type: "protect",
    time,
    sourceId: protector.instanceId,
    protectedId: protectedTarget.instanceId,
    attackerId: attacker.instanceId,
    skillId: protector.protection.skillId,
    outerDamagePrevented,
    innerDamagePrevented,
    reduction
  });
}

function applyProtectionReduction(
  protector: CombatantState | null,
  protectedTarget: CombatantState,
  attacker: CombatantState,
  outerDamage: number,
  innerDamage: number,
  time: number,
  metrics: BattleMetrics,
  contributions: Map<string, BattleContribution>,
  events: BattleEvent[]
): { outerDamage: number; innerDamage: number } {
  if (!protector || !protector.protection || time >= protector.protection.expiresAt) {
    return { outerDamage, innerDamage };
  }

  const reduction = clampDefensiveEffectValue(protector.protection.value);

  if (reduction <= 0) {
    return { outerDamage, innerDamage };
  }

  const outerDamagePrevented = outerDamage * reduction;
  const innerDamagePrevented = innerDamage * reduction;

  recordProtection(
    protector,
    protectedTarget,
    attacker,
    outerDamagePrevented,
    innerDamagePrevented,
    reduction,
    time,
    metrics,
    contributions,
    events
  );

  return {
    outerDamage: outerDamage - outerDamagePrevented,
    innerDamage: innerDamage - innerDamagePrevented
  };
}

function getWoundReduction(target: CombatantState, time: number): number {
  if (!target.wound || time >= target.wound.expiresAt) {
    return 0;
  }

  return clampRecoveryEffectValue(target.wound.value);
}

function getMissingOuterHp(combatant: CombatantState): number {
  return Math.max(0, combatant.maxOuterHp - combatant.outerHp);
}

function getMissingInnerQi(combatant: CombatantState): number {
  return Math.max(0, combatant.maxInnerQi - combatant.innerQi);
}

function hasCleanseableStatus(combatant: CombatantState, time: number): boolean {
  return (
    Boolean(combatant.wound && time < combatant.wound.expiresAt) ||
    Boolean(combatant.armorBreak && time < combatant.armorBreak.expiresAt)
  );
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
  const wound = target.wound && time < target.wound.expiresAt ? target.wound : null;
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

  target.wound = {
    value,
    sourceId: attacker.instanceId,
    skillId: skill.id,
    expiresAt: endsAt
  };

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
    reduction: value,
    endsAt
  });
}

function applyTimedSkillEffects(
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

        attacker.guard = {
          value,
          sourceId: attacker.instanceId,
          skillId: skill.id,
          expiresAt: endsAt
        };
        events.push({
          type: "guard",
          time,
          sourceId: attacker.instanceId,
          targetId: attacker.instanceId,
          skillId: skill.id,
          reduction: value,
          endsAt
        });
        break;
      }

      case "protect": {
        const value = clampDefensiveEffectValue(effect.value);

        attacker.protection = {
          value,
          sourceId: attacker.instanceId,
          skillId: skill.id,
          expiresAt: endsAt
        };
        break;
      }

      case "armor_break": {
        if (!isLiving(target)) {
          break;
        }

        const value = clampDefensiveEffectValue(effect.value);

        target.armorBreak = {
          value,
          sourceId: attacker.instanceId,
          skillId: skill.id,
          expiresAt: endsAt
        };

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
  effect: SkillEffect,
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
  const statusesRemoved: Array<"wound" | "armor_break"> = [];

  if (target.wound && time < target.wound.expiresAt) {
    target.wound = null;
    statusesRemoved.push("wound");
  }

  if (
    statusesRemoved.length < removeCount &&
    target.armorBreak &&
    time < target.armorBreak.expiresAt
  ) {
    target.armorBreak = null;
    statusesRemoved.push("armor_break");
  }

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
  effect: SkillEffect,
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

  target.regeneration = {
    value,
    sourceId: attacker.instanceId,
    skillId: skill.id,
    expiresAt: endsAt,
    nextTickAt: time + RECOVERY_TICK_INTERVAL_SECONDS,
    tickIntervalSeconds: RECOVERY_TICK_INTERVAL_SECONDS,
    restores
  };

  events.push({
    type: "regeneration",
    time,
    sourceId: attacker.instanceId,
    targetId: target.instanceId,
    skillId: skill.id,
    restores,
    percentPerTick: value,
    endsAt
  });
}

function applyRecoverySkillEffects(
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

function tickRegeneration(
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
        ...result
      });

      regeneration.nextTickAt = Number(
        (regeneration.nextTickAt + regeneration.tickIntervalSeconds).toFixed(6)
      );
    }
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
  const intendedTarget = selectTarget(combatants, attacker.team, skill.targetRule);

  if (!intendedTarget) {
    return;
  }

  const protector = findProtector(combatants, intendedTarget, time);
  const target = protector ?? intendedTarget;
  const effectiveTargetStats = getEffectiveTargetStats(target, time);
  let outerDamage = calculateOuterDamage(
    {
      attacker: attacker.stats,
      target: effectiveTargetStats,
      skillMultiplier: skill.outerMultiplier,
      targetIsQiBroken: target.isQiBroken
    },
    constants
  ) * (1 + (target.family ? attacker.damageMultipliersByFamily[target.family] ?? 0 : 0));
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

    expireTimedCombatEffects(combatants, time);
    recoverQiBreaks(combatants, time, constants, events);
    recoverInnerQi(combatants, time, stepSeconds, constants);
    tickRegeneration(combatants, time, metrics, contributions, events);

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
