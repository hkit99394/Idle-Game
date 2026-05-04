import { useCallback, useMemo, useReducer } from "react";
import {
  buildEnemyTeamForStage,
  buildPlayerTeamForStage,
  calculateUpgradeCost,
  createInitialPlayerProgress,
  deriveStats,
  getActiveMasterySummaryForStage,
  getRecommendedOfflineFarmStage,
  getStageById,
  getUpgradeLevel,
  hasClearedStage,
  isOfflineFarmStageUnlocked,
  isStageUnlocked,
  purchaseUpgrade as purchaseCoreUpgrade,
  resolveStageBattle
} from "../../core";
import type {
  BattleEvent,
  CombatantInstanceDefinition,
  CombatantState,
  DerivedStats,
  TeamId,
  PlayerProgress,
  PurchaseUpgradeInput,
  PurchaseUpgradeResult,
  ResolveStageBattleResult,
  StaticGameData
} from "../../core";

export type WebGameState = {
  progress: PlayerProgress;
  selectedStageId: string;
  selectedOfflineFarmStageId: string | null;
  lastBattle: ResolveStageBattleResult | null;
  lastBattleStageId: string | null;
  lastPurchase: PurchaseUpgradeResult | null;
};

export type WebGameAction =
  | {
      type: "select_stage";
      stageId: string;
    }
  | {
      type: "select_offline_farm_stage";
      stageId: string | null;
    }
  | {
      type: "battle_resolved";
      stageId: string;
      result: ResolveStageBattleResult;
    }
  | {
      type: "purchase_resolved";
      result: PurchaseUpgradeResult;
    }
  | {
      type: "replace_progress";
      progress: PlayerProgress;
    };

export type PurchaseGameUpgradeInput = Omit<PurchaseUpgradeInput, "progress">;

export type BattleCombatantView = {
  instanceId: string;
  definitionId: string;
  team: TeamId;
  kind: "hero" | "enemy";
  name: string;
  style: string;
  role: string;
  outerHp: number;
  innerQi: number;
  maxOuterHp: number;
  maxInnerQi: number;
  outerAttack: number;
  innerAttack: number;
  speed: number;
  isQiBroken: boolean;
  isDefeated: boolean;
};

export type BattleEventCategory =
  | "attack"
  | "qi_break"
  | "qi_recover"
  | "backlash"
  | "defeat";

export type BattleEventView = {
  id: string;
  category: BattleEventCategory;
  timeSeconds: number;
  timeLabel: string;
  headline: string;
  detail: string;
};

export type BattleSummaryView = {
  title: string;
  details: string[];
};

export type UpgradeView = {
  key: string;
  upgradeId: string;
  name: string;
  scope: "hero" | "sect";
  heroId?: string;
  targetName: string;
  stat: string;
  level: number;
  cost: number;
  affordable: boolean;
  effectPercent: number;
};

export type StageOptionView = {
  id: string;
  name: string;
  index: number;
  isBoss: boolean;
  isUnlocked: boolean;
  isCleared: boolean;
  isSelectedStage: boolean;
  isSelectedOfflineFarmStage: boolean;
  canSelectStage: boolean;
  canSelectOfflineFarm: boolean;
  rewards: {
    silver: number;
    cultivation: number;
    combatExperience: number;
  };
};

function getDefaultFarmStageId(
  data: StaticGameData,
  progress: PlayerProgress
): string | null {
  return getRecommendedOfflineFarmStage(data, progress)?.id ?? null;
}

function normalizeFarmStageId(
  data: StaticGameData,
  progress: PlayerProgress,
  selectedStageId: string | null
): string | null {
  if (
    selectedStageId &&
    isOfflineFarmStageUnlocked(data, progress, selectedStageId)
  ) {
    return selectedStageId;
  }

  return getDefaultFarmStageId(data, progress);
}

function normalizeSelectedStageId(
  data: StaticGameData,
  progress: PlayerProgress,
  selectedStageId: string
): string {
  const selectedStage = getStageById(data, selectedStageId);

  return selectedStage && isStageUnlocked(data, progress, selectedStage)
    ? selectedStage.id
    : progress.currentStageId;
}

export function createInitialWebGameState(data: StaticGameData): WebGameState {
  const progress = createInitialPlayerProgress(data);

  return {
    progress,
    selectedStageId: progress.currentStageId,
    selectedOfflineFarmStageId: getDefaultFarmStageId(data, progress),
    lastBattle: null,
    lastBattleStageId: null,
    lastPurchase: null
  };
}

export function webGameStateReducer(
  data: StaticGameData,
  state: WebGameState,
  action: WebGameAction
): WebGameState {
  switch (action.type) {
    case "select_stage":
      return {
        ...state,
        selectedStageId: normalizeSelectedStageId(
          data,
          state.progress,
          action.stageId
        )
      };

    case "select_offline_farm_stage":
      return {
        ...state,
        selectedOfflineFarmStageId: normalizeFarmStageId(
          data,
          state.progress,
          action.stageId
        )
      };

    case "battle_resolved": {
      const nextProgress = action.result.ok
        ? action.result.progress
        : state.progress;
      const selectedStageId =
        action.result.ok && action.result.stageCleared
          ? nextProgress.currentStageId
          : state.selectedStageId;

      return {
        ...state,
        progress: nextProgress,
        selectedStageId: normalizeSelectedStageId(
          data,
          nextProgress,
          selectedStageId
        ),
        selectedOfflineFarmStageId: normalizeFarmStageId(
          data,
          nextProgress,
          state.selectedOfflineFarmStageId
        ),
        lastBattle: action.result,
        lastBattleStageId: action.stageId,
        lastPurchase: null
      };
    }

    case "purchase_resolved": {
      const nextProgress = action.result.ok
        ? action.result.progress
        : state.progress;

      return {
        ...state,
        progress: nextProgress,
        selectedOfflineFarmStageId: normalizeFarmStageId(
          data,
          nextProgress,
          state.selectedOfflineFarmStageId
        ),
        lastPurchase: action.result,
        lastBattle: null,
        lastBattleStageId: null
      };
    }

    case "replace_progress":
      return {
        ...state,
        progress: action.progress,
        selectedStageId: normalizeSelectedStageId(
          data,
          action.progress,
          state.selectedStageId
        ),
        selectedOfflineFarmStageId: normalizeFarmStageId(
          data,
          action.progress,
          state.selectedOfflineFarmStageId
        ),
        lastBattle: null,
        lastBattleStageId: null,
        lastPurchase: null
      };
  }
}

export function resolveSelectedStageBattle(
  data: StaticGameData,
  state: WebGameState
): WebGameState {
  const result = resolveStageBattle(data, {
    progress: state.progress,
    stageId: state.selectedStageId,
    maxDurationSeconds: 180
  });

  return webGameStateReducer(data, state, {
    type: "battle_resolved",
    stageId: state.selectedStageId,
    result
  });
}

export function purchaseGameUpgrade(
  data: StaticGameData,
  state: WebGameState,
  input: PurchaseGameUpgradeInput
): WebGameState {
  const result = purchaseCoreUpgrade(data.upgrades, {
    progress: state.progress,
    ...input
  });

  return webGameStateReducer(data, state, {
    type: "purchase_resolved",
    result
  });
}

function getPreviewInstanceId(
  team: TeamId,
  instance: CombatantInstanceDefinition,
  nameId: string,
  index: number
): string {
  return instance.instanceId ?? `${team}_${nameId}_${index + 1}`;
}

function createCombatantView(
  input: {
    instanceId: string;
    definitionId: string;
    team: TeamId;
    kind: "hero" | "enemy";
    name: string;
    style: string;
    role: string;
    stats: DerivedStats;
  },
  finalState?: CombatantState
): BattleCombatantView {
  return {
    instanceId: input.instanceId,
    definitionId: input.definitionId,
    team: input.team,
    kind: input.kind,
    name: input.name,
    style: input.style,
    role: input.role,
    outerHp: finalState?.outerHp ?? input.stats.maxOuterHp,
    innerQi: finalState?.innerQi ?? input.stats.maxInnerQi,
    maxOuterHp: finalState?.maxOuterHp ?? input.stats.maxOuterHp,
    maxInnerQi: finalState?.maxInnerQi ?? input.stats.maxInnerQi,
    outerAttack: finalState?.stats.outerAttack ?? input.stats.outerAttack,
    innerAttack: finalState?.stats.innerAttack ?? input.stats.innerAttack,
    speed: finalState?.stats.speed ?? input.stats.speed,
    isQiBroken: finalState?.isQiBroken ?? false,
    isDefeated: finalState?.defeatedAt != null
  };
}

function getFinalCombatantById(
  finalCombatants: CombatantState[] | undefined,
  instanceId: string
): CombatantState | undefined {
  return finalCombatants?.find((combatant) => combatant.instanceId === instanceId);
}

function formatBattleNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
  }).format(Math.max(0, value));
}

function formatBattlePercent(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
    style: "percent"
  }).format(value);
}

function formatBattleSeconds(value: number): string {
  const maximumFractionDigits = value < 10 ? 1 : 0;

  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits
  }).format(value)}s`;
}

function buildCombatantNameLookup(
  battle: Extract<ResolveStageBattleResult, { ok: true }>["battle"]
): Map<string, string> {
  return new Map(
    [...battle.finalPlayerTeam, ...battle.finalEnemyTeam].map((combatant) => [
      combatant.instanceId,
      combatant.name
    ])
  );
}

function getName(lookup: Map<string, string>, instanceId: string): string {
  return lookup.get(instanceId) ?? instanceId;
}

function getSkillName(data: StaticGameData, skillId: string): string {
  return data.skills.find((skill) => skill.id === skillId)?.name ?? skillId;
}

function formatAttackDetail(
  data: StaticGameData,
  event: Extract<BattleEvent, { type: "attack" }>
): string {
  return [
    getSkillName(data, event.skillId),
    `${formatBattleNumber(event.outerDamage)} Outer damage`,
    `${formatBattleNumber(event.innerDamage)} Inner Qi damage`
  ].join(" · ");
}

function buildBattleEventDetail(
  data: StaticGameData,
  event: BattleEvent,
  names: Map<string, string>
): Pick<BattleEventView, "category" | "headline" | "detail"> {
  switch (event.type) {
    case "attack": {
      const source = getName(names, event.sourceId);
      const target = getName(names, event.targetId);

      return {
        category: "attack",
        headline: `${source} attacks ${target}`,
        detail: formatAttackDetail(data, event)
      };
    }

    case "qi_break": {
      const source = getName(names, event.sourceId);
      const target = getName(names, event.targetId);

      return {
        category: "qi_break",
        headline: `${target} suffers Qi Break`,
        detail:
          `${source} drops Inner Qi to zero, bursts ` +
          `${formatBattleNumber(event.burstDamage)} Outer damage ` +
          `(${formatBattlePercent(event.burstPercent)}), recovers at ` +
          `${formatBattleSeconds(event.endsAt)}`
      };
    }

    case "qi_recover": {
      const target = getName(names, event.targetId);

      return {
        category: "qi_recover",
        headline: `${target} restores Inner Qi`,
        detail: `Inner Qi returns to ${formatBattleNumber(event.innerQi)}`
      };
    }

    case "backlash": {
      const source = getName(names, event.sourceId);

      return {
        category: "backlash",
        headline: `${source} suffers backlash`,
        detail: `${formatBattleNumber(event.damage)} Outer damage while Qi Broken`
      };
    }

    case "defeat": {
      const target = getName(names, event.targetId);
      const defeatedSide = event.team === "player" ? "disciple" : "enemy";

      return {
        category: "defeat",
        headline: `${target} is defeated`,
        detail: `A ${defeatedSide} combatant falls`
      };
    }
  }
}

function buildBattleEventViews(
  data: StaticGameData,
  lastBattle: ResolveStageBattleResult | null
): BattleEventView[] {
  if (!lastBattle?.ok) {
    return [];
  }

  const names = buildCombatantNameLookup(lastBattle.battle);

  return lastBattle.battle.events.map((event, index) => {
    const detail = buildBattleEventDetail(data, event, names);

    return {
      id: `${index}-${event.type}-${event.time}`,
      timeSeconds: event.time,
      timeLabel: formatBattleSeconds(event.time),
      ...detail
    };
  });
}

function formatWinner(winner: TeamId | "timeout"): string {
  switch (winner) {
    case "player":
      return "Victory";
    case "enemy":
      return "Defeat";
    case "timeout":
      return "Stalemate";
  }
}

function buildBattleSummary(
  lastBattle: ResolveStageBattleResult | null,
  stageName: string | null
): BattleSummaryView | null {
  if (!lastBattle) {
    return null;
  }

  if (!lastBattle.ok) {
    return {
      title: "Battle could not start",
      details: [`Reason: ${lastBattle.reason.replaceAll("_", " ")}`]
    };
  }

  const battle = lastBattle.battle;
  const stageLabel = stageName ?? "stage";
  const result = formatWinner(battle.winner);
  const rewardText = lastBattle.rewards
    ? `Rewards: ${formatBattleNumber(lastBattle.rewards.silver)} silver, ` +
      `${formatBattleNumber(lastBattle.rewards.cultivation)} cultivation, ` +
      `${formatBattleNumber(lastBattle.rewards.combatExperience)} Combat XP.`
    : "No rewards earned.";

  return {
    title: `${result} at ${stageLabel} in ${formatBattleSeconds(
      battle.durationSeconds
    )}`,
    details: [
      `Disciples dealt ${formatBattleNumber(
        battle.metrics.playerOuterDamage
      )} Outer, ${formatBattleNumber(
        battle.metrics.playerInnerDamage
      )} Inner Qi, and ${formatBattleNumber(
        battle.metrics.playerQiBreakBurstDamage
      )} Qi Break burst damage.`,
      `Enemy dealt ${formatBattleNumber(
        battle.metrics.enemyOuterDamage
      )} Outer, ${formatBattleNumber(
        battle.metrics.enemyInnerDamage
      )} Inner Qi, and ${formatBattleNumber(
        battle.metrics.enemyQiBreakBurstDamage
      )} Qi Break burst damage.`,
      `Qi Breaks: ${battle.metrics.qiBreaksTriggeredByPlayer} by disciples, ${battle.metrics.qiBreaksTriggeredByEnemy} by enemy.`,
      rewardText
    ]
  };
}

function formatStatName(stat: string): string {
  return stat.replace(/[A-Z]/g, (match) => ` ${match}`).replace(/^./, (match) =>
    match.toUpperCase()
  );
}

function buildUpgradeViews(
  data: StaticGameData,
  progress: PlayerProgress
): UpgradeView[] {
  return data.upgrades.flatMap<UpgradeView>((upgrade) => {
    if (upgrade.scope === "sect") {
      const level = getUpgradeLevel(progress, upgrade);
      const cost = calculateUpgradeCost(upgrade, level);

      return [{
        key: `sect:${upgrade.id}`,
        upgradeId: upgrade.id,
        name: upgrade.name,
        scope: upgrade.scope,
        targetName: "Sect",
        stat: formatStatName(upgrade.stat),
        level,
        cost,
        affordable: progress.resources.silver >= cost,
        effectPercent: upgrade.effectPerLevel
      }];
    }

    return data.heroes.map((hero) => {
      const level = getUpgradeLevel(progress, upgrade, hero.id);
      const cost = calculateUpgradeCost(upgrade, level);

      return {
        key: `${hero.id}:${upgrade.id}`,
        upgradeId: upgrade.id,
        name: upgrade.name,
        scope: upgrade.scope,
        heroId: hero.id,
        targetName: hero.name,
        stat: formatStatName(upgrade.stat),
        level,
        cost,
        affordable: progress.resources.silver >= cost,
        effectPercent: upgrade.effectPerLevel
      };
    });
  });
}

function buildStageOptions(
  data: StaticGameData,
  progress: PlayerProgress,
  selectedStageId: string,
  selectedOfflineFarmStageId: string | null
): StageOptionView[] {
  const bambooRoad = data.regions.find((region) => region.id === "bamboo_road");
  const stageIds = bambooRoad?.stageIds ?? data.stages.map((stage) => stage.id);

  return stageIds.flatMap((stageId) => {
    const stage = getStageById(data, stageId);

    if (!stage) {
      return [];
    }

    const isUnlocked = isStageUnlocked(data, progress, stage);
    const isCleared = hasClearedStage(progress, stage);
    const canSelectOfflineFarm = isOfflineFarmStageUnlocked(
      data,
      progress,
      stage.id
    );

    return {
      id: stage.id,
      name: stage.name,
      index: stage.index,
      isBoss: stage.isBoss,
      isUnlocked,
      isCleared,
      isSelectedStage: stage.id === selectedStageId,
      isSelectedOfflineFarmStage: stage.id === selectedOfflineFarmStageId,
      canSelectStage: isUnlocked,
      canSelectOfflineFarm,
      rewards: stage.rewards
    };
  });
}

function buildPlayerCombatantViews(
  data: StaticGameData,
  progress: PlayerProgress,
  stageId: string,
  finalCombatants?: CombatantState[]
): BattleCombatantView[] {
  const teamResult = buildPlayerTeamForStage(data, progress, stageId);

  if (!teamResult.ok) {
    return [];
  }

  return teamResult.team.combatants.flatMap((instance, index) => {
    const hero = data.heroes.find(
      (candidate) => candidate.id === instance.definitionId
    );

    if (!hero) {
      return [];
    }

    const stats = deriveStats(instance.statsOverride ?? hero.baseStats);
    const instanceId = getPreviewInstanceId(
      teamResult.team.id,
      instance,
      hero.id,
      index
    );

    return createCombatantView(
      {
        instanceId,
        definitionId: hero.id,
        team: teamResult.team.id,
        kind: "hero",
        name: hero.name,
        style: hero.style,
        role: hero.role,
        stats
      },
      getFinalCombatantById(finalCombatants, instanceId)
    );
  });
}

function buildEnemyCombatantViews(
  data: StaticGameData,
  stageId: string,
  finalCombatants?: CombatantState[]
): BattleCombatantView[] {
  const teamResult = buildEnemyTeamForStage(data, stageId);

  if (!teamResult.ok) {
    return [];
  }

  return teamResult.team.combatants.flatMap((instance, index) => {
    const enemy = data.enemies.find(
      (candidate) => candidate.id === instance.definitionId
    );

    if (!enemy) {
      return [];
    }

    const stats = deriveStats(enemy.baseStats);
    const instanceId = getPreviewInstanceId(
      teamResult.team.id,
      instance,
      enemy.id,
      index
    );

    return createCombatantView(
      {
        instanceId,
        definitionId: enemy.id,
        team: teamResult.team.id,
        kind: "enemy",
        name: enemy.name,
        style: enemy.style,
        role: enemy.type,
        stats
      },
      getFinalCombatantById(finalCombatants, instanceId)
    );
  });
}

export function getWebGameViewModel(
  data: StaticGameData,
  state: WebGameState
) {
  const selectedStage = getStageById(data, state.selectedStageId);
  const enemyId = selectedStage?.enemyTeam.combatantIds[0];
  const enemy = data.enemies.find((candidate) => candidate.id === enemyId) ?? null;
  const selectedOfflineFarmStage = state.selectedOfflineFarmStageId
    ? getStageById(data, state.selectedOfflineFarmStageId)
    : null;
  const lastBattleStage = state.lastBattleStageId
    ? getStageById(data, state.lastBattleStageId)
    : null;
  const masterySummary = getActiveMasterySummaryForStage(
    data,
    state.progress,
    state.selectedStageId
  );
  const successfulLastBattle = state.lastBattle?.ok ? state.lastBattle : null;
  const showFinalCombatants =
    successfulLastBattle !== null &&
    state.lastBattleStageId === state.selectedStageId;
  const finalPlayerTeam = showFinalCombatants
    ? successfulLastBattle.battle.finalPlayerTeam
    : undefined;
  const finalEnemyTeam = showFinalCombatants
    ? successfulLastBattle.battle.finalEnemyTeam
    : undefined;

  return {
    progress: state.progress,
    selectedStage,
    selectedOfflineFarmStage,
    stageOptions: buildStageOptions(
      data,
      state.progress,
      state.selectedStageId,
      state.selectedOfflineFarmStageId
    ),
    upgrades: buildUpgradeViews(data, state.progress),
    playerCombatants: selectedStage
      ? buildPlayerCombatantViews(
          data,
          state.progress,
          selectedStage.id,
          finalPlayerTeam
        )
      : [],
    enemyCombatants: selectedStage
      ? buildEnemyCombatantViews(data, selectedStage.id, finalEnemyTeam)
      : [],
    enemy,
    masterySummary: masterySummary.ok ? masterySummary.summary : null,
    lastBattle: state.lastBattle,
    lastBattleStage,
    battleEvents: buildBattleEventViews(data, state.lastBattle),
    battleSummary: buildBattleSummary(state.lastBattle, lastBattleStage?.name ?? null),
    lastPurchase: state.lastPurchase
  };
}

export function useWebGameState(data: StaticGameData) {
  const [state, dispatch] = useReducer(
    (currentState: WebGameState, action: WebGameAction) =>
      webGameStateReducer(data, currentState, action),
    data,
    createInitialWebGameState
  );

  const battleSelectedStage = useCallback(() => {
    dispatch({
      type: "battle_resolved",
      stageId: state.selectedStageId,
      result: resolveStageBattle(data, {
        progress: state.progress,
        stageId: state.selectedStageId,
        maxDurationSeconds: 180
      })
    });
  }, [data, state.progress, state.selectedStageId]);

  const purchaseUpgrade = useCallback(
    (input: PurchaseGameUpgradeInput) => {
      dispatch({
        type: "purchase_resolved",
        result: purchaseCoreUpgrade(data.upgrades, {
          progress: state.progress,
          ...input
        })
      });
    },
    [data, state.progress]
  );

  const selectStage = useCallback((stageId: string) => {
    dispatch({
      type: "select_stage",
      stageId
    });
  }, []);

  const selectOfflineFarmStage = useCallback((stageId: string | null) => {
    dispatch({
      type: "select_offline_farm_stage",
      stageId
    });
  }, []);

  const viewModel = useMemo(
    () => getWebGameViewModel(data, state),
    [data, state]
  );

  return {
    state,
    viewModel,
    dispatch,
    battleSelectedStage,
    purchaseUpgrade,
    selectStage,
    selectOfflineFarmStage
  };
}
