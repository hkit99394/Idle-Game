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
  StaticGameData,
  TacticPresetDefinition
} from "../data/types";
import {
  calculateInnerRecovery,
  calculateQiBreakRecovery,
  defaultCombatFormulaConstants,
  deriveStats,
  scaleStatsForLevel
} from "./formulas";
import { getDefaultFormationSlot } from "./formations";
import {
  addStatusResistanceBonus,
  advanceStatusEffects,
  createStatusDictionary,
  expireStatusEffects,
  getCombatantStatusResistance,
  getStatusCombatModifiers
} from "./statusEffects";
import { hasLivingTeamMember, isLiving } from "./targeting";

import {
  createInitialContributions,
  createInitialMetrics,
  finalizeContributions,
  finalizeMetrics,
  markDefeated,
  recordDamage
} from "./battleRecorder";
import {
  applyDamagePackageMitigation,
  commitBacklashDamagePackage,
  commitDamagePackage,
  commitQiBreakDamagePackage,
  createAttackDamagePackage,
  createBacklashDamagePackage,
  createQiBreakBacklashDamagePackage,
  createQiBreakDamagePackage,
  resolveAttackDamageTargets
} from "./damagePackage";
import {
  applyRecoverySkillEffects,
  applyTimedSkillEffects,
  tickRegeneration
} from "./effectPipeline";
import {
  applyAutoCleanseMedicine,
  applyAutoPreBattleResistanceMedicine
} from "./autoMedicine/application";
import {
  canCombatantActAt,
  getInitialActionTime,
  scheduleNextAction
} from "./scheduler";
import type { AutoMedicineUseSummary } from "./autoMedicine/types";
import {
  createBattleTacticSummary,
  getPlayerTacticModifierValue,
  resolvePlayerTactic
} from "./tactics";

const BASIC_SKILL_ID = "baseline_strike";
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
  constants: CombatFormulaConstants,
  playerTactic: TacticPresetDefinition
): CombatantState {
  const definition = getDefinition(lookup, instance);
  const definitionLevel =
    instance.kind === "enemy"
      ? (definition as EnemyDefinition).level
      : 1;
  const level = instance.level ?? definitionLevel ?? 1;
  const baseStats = deriveStats(
    instance.statsOverride ?? scaleStatsForLevel(definition.baseStats, level)
  );
  const statusResistanceBonus = getPlayerTacticModifierValue(
    playerTactic,
    { team },
    "status_resistance_bonus",
    0
  );
  const stats =
    statusResistanceBonus > 0
      ? {
          ...baseStats,
          statusResistance: baseStats.statusResistance + statusResistanceBonus
        }
      : baseStats;
  const instanceId = instance.instanceId ?? `${team}_${definition.id}_${index + 1}`;
  const family = instance.kind === "enemy" ? (definition as EnemyDefinition).family : undefined;
  const enemyType =
    instance.kind === "enemy" ? (definition as EnemyDefinition).type : undefined;

  return {
    instanceId,
    definitionId: definition.id,
    kind: instance.kind,
    level,
    formationSlot: instance.formationSlot ?? getDefaultFormationSlot(index),
    combatRole: definition.combatRole,
    family,
    enemyType,
    name: definition.name,
    team,
    bodyIntegrity: stats.maxBodyIntegrity,
    contextStability: stats.maxContextStability,
    maxBodyIntegrity: stats.maxBodyIntegrity,
    maxContextStability: stats.maxContextStability,
    stats,
    damageMultipliersByFamily: instance.damageMultipliersByFamily ?? {},
    skillUpgradeLevels: instance.skillUpgradeLevels ?? {},
    skillIds: definition.skillIds,
    nextActionAt: getInitialActionTime(stats.speed, constants),
    skillCooldowns: Object.fromEntries(definition.skillIds.map((skillId) => [skillId, 0])),
    isOverloaded: false,
    overloadEndsAt: null,
    lastCognitiveDamageAt: null,
    guard: null,
    protection: null,
    armorBreak: null,
    wound: null,
    speedDown: null,
    innerDefenseDown: null,
    statusResistanceBonuses: [],
    activeStatuses: [],
    regeneration: null,
    defeatedAt: null
  };
}

function createCombatants(
  lookup: DefinitionLookup,
  input: SimulateBattleInput,
  constants: CombatFormulaConstants,
  playerTactic: TacticPresetDefinition
): CombatantState[] {
  const playerCombatants = input.playerTeam.combatants.map((combatant, index) =>
    createCombatantState(
      lookup,
      input.playerTeam.id,
      combatant,
      index,
      constants,
      playerTactic
    )
  );
  const enemyCombatants = input.enemyTeam.combatants.map((combatant, index) =>
    createCombatantState(
      lookup,
      input.enemyTeam.id,
      combatant,
      index,
      constants,
      playerTactic
    )
  );

  return [...playerCombatants, ...enemyCombatants];
}

type RuntimeAutoMedicineState = {
  inventory: Record<string, number | undefined>;
  uses: AutoMedicineUseSummary[];
};

type BattleRuntime = {
  input: SimulateBattleInput;
  lookup: DefinitionLookup;
  constants: CombatFormulaConstants;
  maxDurationSeconds: number;
  stepSeconds: number;
  combatants: CombatantState[];
  playerTactic: TacticPresetDefinition;
  events: BattleEvent[];
  metrics: BattleMetrics;
  contributions: Map<string, BattleContribution>;
  autoMedicine: RuntimeAutoMedicineState;
};

function applyPreBattleAutoMedicine(
  staticData: StaticGameData,
  input: SimulateBattleInput,
  statusDefinitions: Record<string, StatusEffectDefinition>
): {
  autoMedicine: RuntimeAutoMedicineState;
  preBattleUse: AutoMedicineUseSummary | null;
} {
  const autoMedicine: RuntimeAutoMedicineState = {
    inventory: { ...(input.autoMedicine?.inventory ?? {}) },
    uses: []
  };

  if (!input.autoMedicine?.stage) {
    return {
      autoMedicine,
      preBattleUse: null
    };
  }

  const result = applyAutoPreBattleResistanceMedicine({
    medicines: input.autoMedicine.medicines,
    inventory: autoMedicine.inventory,
    stage: input.autoMedicine.stage,
    enemies: input.autoMedicine.enemies ?? staticData.enemies,
    skills: input.autoMedicine.skills ?? staticData.skills,
    statusDefinitions,
    preferences: input.autoMedicine.preferences
  });

  autoMedicine.inventory = result.inventory;

  return {
    autoMedicine,
    preBattleUse: result.usedMedicine
  };
}

function createBattleRuntime(
  staticData: StaticGameData,
  input: SimulateBattleInput
): BattleRuntime {
  const constants = input.constants ?? defaultCombatFormulaConstants;
  const lookup = createLookup(staticData);
  const playerTactic = resolvePlayerTactic(staticData, input.tacticId);
  const preBattleAutoMedicine = applyPreBattleAutoMedicine(
    staticData,
    input,
    lookup.statusDefinitions
  );
  const combatants = createCombatants(lookup, input, constants, playerTactic);
  const runtime: BattleRuntime = {
    input,
    lookup,
    constants,
    maxDurationSeconds: input.maxDurationSeconds ?? 180,
    stepSeconds: input.stepSeconds ?? 0.1,
    combatants,
    playerTactic,
    events: [],
    metrics: createInitialMetrics(),
    contributions: createInitialContributions(combatants),
    autoMedicine: preBattleAutoMedicine.autoMedicine
  };

  if (preBattleAutoMedicine.preBattleUse) {
    applyPreBattleAutoMedicineUse(runtime, preBattleAutoMedicine.preBattleUse);
  }

  return runtime;
}

function applyPreBattleAutoMedicineUse(
  runtime: BattleRuntime,
  preBattleUse: AutoMedicineUseSummary
): void {
  const usedMedicine = recordAutoMedicineUse(runtime.events, preBattleUse, 0);

  for (const combatant of runtime.combatants) {
    if (combatant.team === "player" && isLiving(combatant)) {
      applyAutoMedicineResistanceBonus(combatant, usedMedicine, 0);
    }
  }

  runtime.autoMedicine.uses.push(usedMedicine);
}

function recordAutoMedicineUse(
  events: BattleEvent[],
  usedMedicine: AutoMedicineUseSummary,
  time: number,
  targetId?: string
): AutoMedicineUseSummary {
  const summary = {
    ...usedMedicine,
    timeSeconds: time,
    targetId
  };

  events.push({
    type: "auto_medicine",
    time,
    medicineId: summary.medicineId,
    trigger: summary.trigger,
    targetId,
    cleansedStatusIds: summary.cleansedStatusIds,
    statusResistanceBonus: summary.statusResistanceBonus,
    statusResistanceDurationSeconds: summary.statusResistanceDurationSeconds
  });

  return summary;
}

function applyAutoMedicineResistanceBonus(
  combatant: CombatantState,
  usedMedicine: AutoMedicineUseSummary,
  time: number
): void {
  addStatusResistanceBonus(combatant, {
    medicineId: usedMedicine.medicineId,
    value: usedMedicine.statusResistanceBonus,
    appliedAt: time,
    durationSeconds: usedMedicine.statusResistanceDurationSeconds
  });
}

function applyBattleCleanseAutoMedicine(
  input: SimulateBattleInput,
  statusDefinitions: Record<string, StatusEffectDefinition>,
  combatants: CombatantState[],
  autoMedicine: RuntimeAutoMedicineState,
  time: number,
  events: BattleEvent[]
): void {
  if (!input.autoMedicine) {
    return;
  }

  for (const combatant of combatants) {
    if (
      combatant.team !== "player" ||
      !isLiving(combatant)
    ) {
      continue;
    }

    const result = applyAutoCleanseMedicine({
      medicines: input.autoMedicine.medicines,
      inventory: autoMedicine.inventory,
      activeStatuses: combatant.activeStatuses,
      combatant,
      timeSeconds: time,
      statusDefinitions,
      trigger: "battle_cleanse",
      preferences: input.autoMedicine.preferences
    });

    autoMedicine.inventory = result.inventory;
    combatant.activeStatuses = result.statuses;

    if (result.usedMedicine) {
      const usedMedicine = recordAutoMedicineUse(
        events,
        result.usedMedicine,
        time,
        combatant.instanceId
      );
      applyAutoMedicineResistanceBonus(combatant, usedMedicine, time);
      autoMedicine.uses.push(usedMedicine);
    }
  }
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
  events: BattleEvent[],
  playerTactic: TacticPresetDefinition
): void {
  if (target.contextStability > 0 || target.isOverloaded || !isLiving(target)) {
    return;
  }

  const damagePackage = createQiBreakDamagePackage({
    attacker,
    target,
    time,
    constants,
    tactic: playerTactic
  });
  commitQiBreakDamagePackage({
    damagePackage,
    attacker,
    target,
    time,
    metrics,
    contributions,
    events
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
      combatant.isOverloaded &&
      combatant.overloadEndsAt !== null &&
      time >= combatant.overloadEndsAt
    ) {
      combatant.isOverloaded = false;
      combatant.overloadEndsAt = null;
      combatant.contextStability = calculateQiBreakRecovery(combatant.maxContextStability, constants);
      combatant.lastCognitiveDamageAt = time;
      events.push({
        type: "qi_recover",
        time,
        targetId: combatant.instanceId,
        innerQi: combatant.contextStability
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
    if (!isLiving(combatant) || combatant.isOverloaded) {
      continue;
    }

    const canRecover =
      combatant.lastCognitiveDamageAt === null ||
      time - combatant.lastCognitiveDamageAt >= constants.contextRebuildDelaySeconds;

    if (!canRecover || combatant.contextStability >= combatant.maxContextStability) {
      continue;
    }

    const modifiers = getStatusCombatModifiers(
      combatant.activeStatuses,
      statusDefinitions
    );
    combatant.contextStability = calculateInnerRecovery({
      maxContextStability: combatant.maxContextStability,
      currentContextStability: combatant.contextStability,
      contextRebuildRate:
        combatant.stats.contextRebuildRate * modifiers.contextRebuildMultiplier,
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
      targetMaxBodyIntegrity: combatant.maxBodyIntegrity,
      targetStatusResistance: getCombatantStatusResistance(combatant, time)
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

      combatant.bodyIntegrity = Math.max(0, combatant.bodyIntegrity - event.outerDamage);

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
  events: BattleEvent[],
  playerTactic: TacticPresetDefinition
): void {
  if (!canCombatantActAt(attacker, time)) {
    return;
  }

  const skill = chooseSkill(lookup, attacker, time);
  const damageTargets = resolveAttackDamageTargets({
    combatants,
    attacker,
    skill,
    time,
    tactic: playerTactic
  });

  if (!damageTargets) {
    return;
  }

  const target = damageTargets.damageTarget;
  const damagePackage = createAttackDamagePackage({
    attacker,
    targets: damageTargets,
    skill,
    time,
    constants,
    statusDefinitions: lookup.statusDefinitions,
    tactic: playerTactic
  });
  const mitigatedDamagePackage = applyDamagePackageMitigation({
    damagePackage,
    attacker,
    targets: damageTargets,
    time,
    metrics,
    contributions,
    events
  });
  commitDamagePackage({
    damagePackage: mitigatedDamagePackage,
    attacker,
    targets: damageTargets,
    time,
    metrics,
    contributions,
    events
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
    events,
    playerTactic
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
    events,
    playerTactic
  );
  applyQiBreakIfNeeded(
    attacker,
    target,
    time,
    constants,
    metrics,
    contributions,
    events,
    playerTactic
  );
  markDefeated(target, time, events);

  if (attacker.isOverloaded && isLiving(attacker)) {
    const backlashPackage = createQiBreakBacklashDamagePackage({
      target: attacker,
      constants
    });
    commitBacklashDamagePackage({
      damagePackage: backlashPackage,
      target: attacker,
      time,
      metrics,
      contributions,
      events
    });
    markDefeated(attacker, time, events);
  }

  const attackerStatusModifiers = getStatusCombatModifiers(
    attacker.activeStatuses,
    lookup.statusDefinitions
  );
  const statusBacklashDamage =
    attacker.maxBodyIntegrity * attackerStatusModifiers.feedbackBodyIntegrityPercent;

  if (statusBacklashDamage > 0 && isLiving(attacker)) {
    const backlashPackage = createBacklashDamagePackage({
      target: attacker,
      outerDamage: statusBacklashDamage
    });
    commitBacklashDamagePackage({
      damagePackage: backlashPackage,
      target: attacker,
      time,
      metrics,
      contributions,
      events
    });
    markDefeated(attacker, time, events);
  }

  if (skill.id !== BASIC_SKILL_ID) {
    attacker.skillCooldowns[skill.id] = time + skill.cooldownSeconds;
  }

  scheduleNextAction({
    combatant: attacker,
    time,
    constants
  });
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

function advanceSimulationPhase(
  runtime: BattleRuntime,
  time: number,
  deltaSeconds: number
): void {
  expireStatusEffects(runtime.combatants, time);
  advanceCombatantDataStatuses(
    runtime.combatants,
    runtime.lookup.statusDefinitions,
    time,
    deltaSeconds,
    runtime.metrics,
    runtime.contributions,
    runtime.events
  );
  recoverQiBreaks(
    runtime.combatants,
    time,
    runtime.constants,
    runtime.events
  );
  recoverInnerQi(
    runtime.combatants,
    runtime.lookup.statusDefinitions,
    time,
    deltaSeconds,
    runtime.constants
  );
  tickRegeneration(
    runtime.combatants,
    runtime.lookup.statusDefinitions,
    time,
    runtime.metrics,
    runtime.contributions,
    runtime.events
  );
}

function executeActionPhase(
  runtime: BattleRuntime,
  time: number
): TeamId | null {
  for (const combatant of runtime.combatants) {
    executeAction(
      runtime.lookup,
      runtime.combatants,
      combatant,
      time,
      runtime.constants,
      runtime.metrics,
      runtime.contributions,
      runtime.events,
      runtime.playerTactic
    );
    applyBattleCleanseAutoMedicine(
      runtime.input,
      runtime.lookup.statusDefinitions,
      runtime.combatants,
      runtime.autoMedicine,
      time,
      runtime.events
    );

    const currentWinner = getWinner(runtime.combatants);

    if (currentWinner) {
      return currentWinner;
    }
  }

  return null;
}

function executeBattleStep(runtime: BattleRuntime, time: number): TeamId | null {
  advanceSimulationPhase(runtime, time, runtime.stepSeconds);

  return executeActionPhase(runtime, time);
}

export function simulateBattle(
  staticData: StaticGameData,
  input: SimulateBattleInput
): BattleResult {
  const runtime = createBattleRuntime(staticData, input);
  const totalSteps = Math.ceil(runtime.maxDurationSeconds / runtime.stepSeconds);
  let durationSeconds = runtime.maxDurationSeconds;
  let winner: BattleResult["winner"] = "timeout";

  for (let step = 0; step <= totalSteps; step += 1) {
    const time = Number((step * runtime.stepSeconds).toFixed(6));
    const currentWinner = executeBattleStep(runtime, time);

    if (currentWinner) {
      winner = currentWinner;
      durationSeconds = time;
      break;
    }
  }

  return {
    winner,
    durationSeconds,
    playerTactic: createBattleTacticSummary(runtime.playerTactic),
    events: runtime.events,
    finalPlayerTeam: runtime.combatants.filter(
      (combatant) => combatant.team === "player"
    ),
    finalEnemyTeam: runtime.combatants.filter(
      (combatant) => combatant.team === "enemy"
    ),
    metrics: finalizeMetrics(runtime.metrics, durationSeconds),
    contributions: finalizeContributions(
      runtime.combatants,
      runtime.contributions
    ),
    autoMedicine: runtime.autoMedicine
  };
}
