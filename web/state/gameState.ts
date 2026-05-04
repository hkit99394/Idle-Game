import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import {
  buildEnemyTeamForStage,
  buildPlayerTeamForStage,
  calculateUpgradeCost,
  createInitialPlayerProgress,
  deriveStats,
  getActiveMasterySummaryForStage,
  getStageById,
  getUpgradeLevel,
  hasClearedStage,
  isOfflineFarmStageUnlocked,
  isStageUnlocked,
  purchaseUpgrade as purchaseCoreUpgrade,
  resolveStageBattle,
  setOfflineFarmStageTarget
} from "../../core";
import type {
  ActiveMasterySummary,
  BattleEvent,
  CombatantInstanceDefinition,
  CombatantState,
  DerivedStats,
  MasteryBonus,
  TeamId,
  PlayerProgress,
  ApplyOfflineRewardsResult,
  PurchaseUpgradeInput,
  PurchaseUpgradeResult,
  ResolveStageBattleResult,
  SaveData,
  StaticGameData
} from "../../core";
import {
  getBrowserSaveStorage,
  exportSaveDataFromStorage,
  importSaveDataToStorage,
  loadSaveDataFromStorage,
  loadSaveDataWithOfflineRewardsFromStorage,
  resetSaveDataInStorage,
  saveWebGameStateToStorage,
  WEB_SAVE_STORAGE_KEY,
  WEB_SAVE_AUTOSAVE_INTERVAL_MS
} from "./saveStorage";
import type { WebSaveStorage } from "./saveStorage";

export type WebGameState = {
  progress: PlayerProgress;
  selectedStageId: string;
  selectedOfflineFarmStageId: string | null;
  offlineSummary: OfflineRewardSummary | null;
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
    }
  | {
      type: "replace_state";
      state: WebGameState;
    }
  | {
      type: "dismiss_offline_summary";
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

export type BattleEventBadgeTone =
  | "skill"
  | "outer"
  | "inner"
  | "qi"
  | "danger"
  | "neutral";

export type BattleEventBadgeView = {
  label: string;
  tone: BattleEventBadgeTone;
};

export type BattleEventView = {
  id: string;
  category: BattleEventCategory;
  timeSeconds: number;
  timeLabel: string;
  headline: string;
  detail: string;
  badges: BattleEventBadgeView[];
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
  missingSilver: number;
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

export type MasteryBonusView = {
  key: string;
  label: string;
};

export type MasteryPanelView = {
  regionId: string;
  regionName: string;
  combatExperience: number;
  reachedRanks: string[];
  nextThreshold: {
    experience: number;
    rank: string;
    remainingExperience: number;
  } | null;
  activeBonuses: MasteryBonusView[];
  progressPercent: number;
};

export type OfflineRewardSummary = {
  stageId: string;
  offlineSeconds: number;
  clears: number;
  silver: number;
  cultivation: number;
  combatExperience: number;
};

export type OfflineRewardSummaryView = OfflineRewardSummary & {
  stageName: string;
  regionName: string;
};

export type SaveStatus =
  | "ready"
  | "missing_save"
  | "invalid_json"
  | "invalid_save"
  | "storage_error"
  | "storage_unavailable";

export type SaveDiagnosticsView = {
  storageAvailable: boolean;
  storageKey: string;
  status: SaveStatus;
  saveVersion: number | null;
  saveSizeCharacters: number;
  createdAtMs: number | null;
  updatedAtMs: number | null;
  lastOfflineRewardAtMs: number | null;
  currentStageId: string;
  selectedOfflineFarmStageId: string | null;
  highestClearedStageIndex: number;
  autosaveIntervalMs: number;
  errors: string[];
};

export type SaveToolResult =
  | {
      ok: true;
      message: string;
      json?: string;
    }
  | {
      ok: false;
      message: string;
      errors: string[];
    };

function getDefaultFarmStageId(
  data: StaticGameData,
  progress: PlayerProgress
): string | null {
  return setOfflineFarmStageTarget(data, progress, null);
}

function normalizeFarmStageId(
  data: StaticGameData,
  progress: PlayerProgress,
  selectedStageId: string | null
): string | null {
  return setOfflineFarmStageTarget(data, progress, selectedStageId);
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

function createOfflineRewardSummary(
  offlineRewards: ApplyOfflineRewardsResult | null
): OfflineRewardSummary | null {
  if (!offlineRewards?.ok || offlineRewards.rewards.clears <= 0) {
    return null;
  }

  return {
    stageId: offlineRewards.stageId,
    offlineSeconds: offlineRewards.rewards.offlineSeconds,
    clears: offlineRewards.rewards.clears,
    silver: offlineRewards.rewards.silver,
    cultivation: offlineRewards.rewards.cultivation,
    combatExperience: offlineRewards.rewards.combatExperience
  };
}

export function createInitialWebGameState(data: StaticGameData): WebGameState {
  const progress = createInitialPlayerProgress(data);

  return {
    progress,
    selectedStageId: progress.currentStageId,
    selectedOfflineFarmStageId: getDefaultFarmStageId(data, progress),
    offlineSummary: null,
    lastBattle: null,
    lastBattleStageId: null,
    lastPurchase: null
  };
}

export function createWebGameStateFromSave(
  data: StaticGameData,
  save: SaveData,
  offlineSummary: OfflineRewardSummary | null = null
): WebGameState {
  return {
    progress: save.progress,
    selectedStageId: normalizeSelectedStageId(
      data,
      save.progress,
      save.progress.currentStageId
    ),
    selectedOfflineFarmStageId: normalizeFarmStageId(
      data,
      save.progress,
      save.selectedOfflineFarmStageId
    ),
    offlineSummary,
    lastBattle: null,
    lastBattleStageId: null,
    lastPurchase: null
  };
}

export function createInitialWebGameStateFromStorage(
  data: StaticGameData,
  storage: WebSaveStorage | null = getBrowserSaveStorage(),
  nowMs = Date.now()
): WebGameState {
  if (!storage) {
    return createInitialWebGameState(data);
  }

  const loadResult = loadSaveDataWithOfflineRewardsFromStorage(
    data,
    storage,
    nowMs
  );

  return loadResult.ok
    ? createWebGameStateFromSave(
        data,
        loadResult.save,
        createOfflineRewardSummary(loadResult.offlineRewards)
      )
    : createInitialWebGameState(data);
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

    case "replace_state":
      return action.state;

    case "dismiss_offline_summary":
      return {
        ...state,
        offlineSummary: null
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
): Pick<BattleEventView, "category" | "headline" | "detail" | "badges"> {
  switch (event.type) {
    case "attack": {
      const source = getName(names, event.sourceId);
      const target = getName(names, event.targetId);
      const skillName = getSkillName(data, event.skillId);

      return {
        category: "attack",
        headline: `${source} attacks ${target}`,
        detail: formatAttackDetail(data, event),
        badges: [
          {
            label: skillName,
            tone: "skill"
          },
          {
            label: `${formatBattleNumber(event.outerDamage)} Outer HP`,
            tone: "outer"
          },
          {
            label: `${formatBattleNumber(event.innerDamage)} Inner Qi`,
            tone: "inner"
          }
        ]
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
          `${formatBattleSeconds(event.endsAt)}`,
        badges: [
          {
            label: "Qi Break",
            tone: "danger"
          },
          {
            label: `${formatBattleNumber(event.burstDamage)} burst`,
            tone: "outer"
          },
          {
            label: `${formatBattleSeconds(event.endsAt)} recovery`,
            tone: "qi"
          }
        ]
      };
    }

    case "qi_recover": {
      const target = getName(names, event.targetId);

      return {
        category: "qi_recover",
        headline: `${target} restores Inner Qi`,
        detail: `Inner Qi returns to ${formatBattleNumber(event.innerQi)}`,
        badges: [
          {
            label: `${formatBattleNumber(event.innerQi)} Inner Qi`,
            tone: "inner"
          }
        ]
      };
    }

    case "backlash": {
      const source = getName(names, event.sourceId);

      return {
        category: "backlash",
        headline: `${source} suffers backlash`,
        detail: `${formatBattleNumber(event.damage)} Outer damage while Qi Broken`,
        badges: [
          {
            label: `${formatBattleNumber(event.damage)} backlash`,
            tone: "danger"
          },
          {
            label: "Qi Broken",
            tone: "qi"
          }
        ]
      };
    }

    case "defeat": {
      const target = getName(names, event.targetId);
      const defeatedSide = event.team === "player" ? "disciple" : "enemy";

      return {
        category: "defeat",
        headline: `${target} is defeated`,
        detail: `A ${defeatedSide} combatant falls`,
        badges: [
          {
            label: "Defeated",
            tone: "danger"
          },
          {
            label: defeatedSide,
            tone: "neutral"
          }
        ]
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
      const missingSilver = Math.max(0, cost - progress.resources.silver);

      return [{
        key: `sect:${upgrade.id}`,
        upgradeId: upgrade.id,
        name: upgrade.name,
        scope: upgrade.scope,
        targetName: "Sect",
        stat: formatStatName(upgrade.stat),
        level,
        cost,
        affordable: missingSilver === 0,
        missingSilver,
        effectPercent: upgrade.effectPerLevel
      }];
    }

    return data.heroes.map((hero) => {
      const level = getUpgradeLevel(progress, upgrade, hero.id);
      const cost = calculateUpgradeCost(upgrade, level);
      const missingSilver = Math.max(0, cost - progress.resources.silver);

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
        affordable: missingSilver === 0,
        missingSilver,
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

function formatMasteryPercent(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    signDisplay: "always",
    style: "percent"
  }).format(value);
}

function formatMasteryBonus(bonus: MasteryBonus): string {
  switch (bonus.type) {
    case "map_outer_and_inner_attack_multiplier":
      return `${formatMasteryPercent(bonus.value)} Outer and Inner attack`;
    case "map_reward_multiplier":
      return `${formatMasteryPercent(bonus.value)} stage rewards`;
    case "enemy_family_damage_multiplier":
      return `${formatMasteryPercent(bonus.value)} damage to enemy family`;
  }
}

function buildMasteryPanel(
  data: StaticGameData,
  summary: ActiveMasterySummary | null
): MasteryPanelView | null {
  if (!summary) {
    return null;
  }

  const region = data.regions.find(
    (candidate) => candidate.id === summary.regionId
  );
  const nextThreshold = summary.nextThreshold
    ? {
        experience: summary.nextThreshold.experience,
        rank: summary.nextThreshold.rank,
        remainingExperience: Math.max(
          0,
          summary.nextThreshold.experience - summary.combatExperience
        )
      }
    : null;
  const progressTargetExperience =
    nextThreshold?.experience ??
    data.mastery.thresholds.at(-1)?.experience ??
    summary.combatExperience;

  return {
    regionId: summary.regionId,
    regionName: region?.name ?? summary.regionId,
    combatExperience: summary.combatExperience,
    reachedRanks: summary.reachedRanks,
    nextThreshold,
    activeBonuses: summary.activeBonuses.map((bonus, index) => ({
      key: `${bonus.type}-${bonus.value}-${index}`,
      label: formatMasteryBonus(bonus)
    })),
    progressPercent:
      progressTargetExperience > 0
        ? Math.min(summary.combatExperience / progressTargetExperience, 1)
        : 0
  };
}

function buildOfflineRewardSummaryView(
  data: StaticGameData,
  summary: OfflineRewardSummary | null
): OfflineRewardSummaryView | null {
  if (!summary) {
    return null;
  }

  const stage = getStageById(data, summary.stageId);
  const region = data.regions.find((candidate) => candidate.id === stage?.regionId);

  return {
    ...summary,
    stageName: stage?.name ?? summary.stageId,
    regionName: region?.name ?? stage?.regionId ?? "Unknown map"
  };
}

function getSaveToolErrorMessage(reason: string): string {
  switch (reason) {
    case "empty_import":
      return "Import text is empty";
    case "invalid_json":
      return "Save JSON is invalid";
    case "invalid_save":
      return "Save data is invalid";
    case "missing_save":
      return "No save found";
    case "storage_error":
      return "Save storage failed";
    default:
      return "Save tool failed";
  }
}

function buildSaveDiagnostics(
  data: StaticGameData,
  state: WebGameState
): SaveDiagnosticsView {
  const storage = getBrowserSaveStorage();

  if (!storage) {
    return {
      storageAvailable: false,
      storageKey: WEB_SAVE_STORAGE_KEY,
      status: "storage_unavailable",
      saveVersion: null,
      saveSizeCharacters: 0,
      createdAtMs: null,
      updatedAtMs: null,
      lastOfflineRewardAtMs: null,
      currentStageId: state.progress.currentStageId,
      selectedOfflineFarmStageId: state.selectedOfflineFarmStageId,
      highestClearedStageIndex:
        state.progress.maps.bamboo_road?.highestClearedStageIndex ?? 0,
      autosaveIntervalMs: WEB_SAVE_AUTOSAVE_INTERVAL_MS,
      errors: ["Browser save storage is unavailable"]
    };
  }

  let rawSave: string | null = null;

  try {
    rawSave = storage.getItem(WEB_SAVE_STORAGE_KEY);
  } catch (error) {
    return {
      storageAvailable: true,
      storageKey: WEB_SAVE_STORAGE_KEY,
      status: "storage_error",
      saveVersion: null,
      saveSizeCharacters: 0,
      createdAtMs: null,
      updatedAtMs: null,
      lastOfflineRewardAtMs: null,
      currentStageId: state.progress.currentStageId,
      selectedOfflineFarmStageId: state.selectedOfflineFarmStageId,
      highestClearedStageIndex:
        state.progress.maps.bamboo_road?.highestClearedStageIndex ?? 0,
      autosaveIntervalMs: WEB_SAVE_AUTOSAVE_INTERVAL_MS,
      errors: [error instanceof Error ? error.message : "Unable to read save"]
    };
  }

  const loadResult = loadSaveDataFromStorage(data, storage);

  if (!loadResult.ok) {
    return {
      storageAvailable: true,
      storageKey: WEB_SAVE_STORAGE_KEY,
      status: loadResult.reason,
      saveVersion: null,
      saveSizeCharacters: rawSave?.length ?? 0,
      createdAtMs: null,
      updatedAtMs: null,
      lastOfflineRewardAtMs: null,
      currentStageId: state.progress.currentStageId,
      selectedOfflineFarmStageId: state.selectedOfflineFarmStageId,
      highestClearedStageIndex:
        state.progress.maps.bamboo_road?.highestClearedStageIndex ?? 0,
      autosaveIntervalMs: WEB_SAVE_AUTOSAVE_INTERVAL_MS,
      errors: loadResult.errors
    };
  }

  const save = loadResult.save;

  return {
    storageAvailable: true,
    storageKey: WEB_SAVE_STORAGE_KEY,
    status: "ready",
    saveVersion: save.version,
    saveSizeCharacters: rawSave?.length ?? 0,
    createdAtMs: save.createdAtMs,
    updatedAtMs: save.updatedAtMs,
    lastOfflineRewardAtMs: save.lastOfflineRewardAtMs,
    currentStageId: save.progress.currentStageId,
    selectedOfflineFarmStageId: save.selectedOfflineFarmStageId,
    highestClearedStageIndex:
      save.progress.maps.bamboo_road?.highestClearedStageIndex ?? 0,
    autosaveIntervalMs: WEB_SAVE_AUTOSAVE_INTERVAL_MS,
    errors: []
  };
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
  const activeMasterySummary = masterySummary.ok ? masterySummary.summary : null;
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
    masterySummary: activeMasterySummary,
    masteryPanel: buildMasteryPanel(data, activeMasterySummary),
    offlineSummary: buildOfflineRewardSummaryView(data, state.offlineSummary),
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
    createInitialWebGameStateFromStorage
  );
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const persistState = useCallback(
    (stateToSave: WebGameState) => {
      const storage = getBrowserSaveStorage();

      if (!storage) {
        return;
      }

      saveWebGameStateToStorage(data, stateToSave, storage);
    },
    [data]
  );

  const dispatchAndPersist = useCallback(
    (action: WebGameAction) => {
      const nextState = webGameStateReducer(data, state, action);

      dispatch(action);
      persistState(nextState);
    },
    [data, persistState, state]
  );

  useEffect(() => {
    const storage = getBrowserSaveStorage();

    if (!storage) {
      return;
    }

    const timer = window.setInterval(() => {
      saveWebGameStateToStorage(data, stateRef.current, storage);
    }, WEB_SAVE_AUTOSAVE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [data]);

  const battleSelectedStage = useCallback(() => {
    dispatchAndPersist({
      type: "battle_resolved",
      stageId: state.selectedStageId,
      result: resolveStageBattle(data, {
        progress: state.progress,
        stageId: state.selectedStageId,
        maxDurationSeconds: 180
      })
    });
  }, [data, dispatchAndPersist, state.progress, state.selectedStageId]);

  const purchaseUpgrade = useCallback(
    (input: PurchaseGameUpgradeInput) => {
      dispatchAndPersist({
        type: "purchase_resolved",
        result: purchaseCoreUpgrade(data.upgrades, {
          progress: state.progress,
          ...input
        })
      });
    },
    [data, dispatchAndPersist, state.progress]
  );

  const selectStage = useCallback((stageId: string) => {
    dispatchAndPersist({
      type: "select_stage",
      stageId
    });
  }, [dispatchAndPersist]);

  const selectOfflineFarmStage = useCallback((stageId: string | null) => {
    dispatchAndPersist({
      type: "select_offline_farm_stage",
      stageId
    });
  }, [dispatchAndPersist]);

  const dismissOfflineSummary = useCallback(() => {
    dispatch({
      type: "dismiss_offline_summary"
    });
  }, []);

  const viewModel = useMemo(
    () => getWebGameViewModel(data, state),
    [data, state]
  );
  const saveDiagnostics = useMemo(
    () => buildSaveDiagnostics(data, state),
    [data, state]
  );

  const exportSave = useCallback((): SaveToolResult => {
    const storage = getBrowserSaveStorage();

    if (!storage) {
      return {
        ok: false,
        message: "Browser save storage is unavailable",
        errors: ["Browser save storage is unavailable"]
      };
    }

    const result = exportSaveDataFromStorage(data, storage);

    if (!result.ok) {
      return {
        ok: false,
        message: getSaveToolErrorMessage(result.reason),
        errors: result.errors
      };
    }

    return {
      ok: true,
      message: "Save exported",
      json: result.json
    };
  }, [data]);

  const importSave = useCallback((rawSaveText: string): SaveToolResult => {
    const storage = getBrowserSaveStorage();

    if (!storage) {
      return {
        ok: false,
        message: "Browser save storage is unavailable",
        errors: ["Browser save storage is unavailable"]
      };
    }

    const result = importSaveDataToStorage(data, storage, rawSaveText);

    if (!result.ok) {
      return {
        ok: false,
        message: getSaveToolErrorMessage(result.reason),
        errors: result.errors
      };
    }

    dispatch({
      type: "replace_state",
      state: createWebGameStateFromSave(data, result.save)
    });

    return {
      ok: true,
      message: "Save imported"
    };
  }, [data]);

  const resetNewGame = useCallback((): SaveToolResult => {
    const storage = getBrowserSaveStorage();

    if (!storage) {
      dispatch({
        type: "replace_state",
        state: createInitialWebGameState(data)
      });

      return {
        ok: false,
        message: "Browser save storage is unavailable",
        errors: ["New game was reset for this session only"]
      };
    }

    const result = resetSaveDataInStorage(data, storage);

    if (!result.ok) {
      return {
        ok: false,
        message: getSaveToolErrorMessage(result.reason),
        errors: result.errors
      };
    }

    dispatch({
      type: "replace_state",
      state: createWebGameStateFromSave(data, result.save)
    });

    return {
      ok: true,
      message: "New game save created"
    };
  }, [data]);

  return {
    state,
    viewModel,
    saveDiagnostics,
    dispatch,
    battleSelectedStage,
    purchaseUpgrade,
    selectStage,
    selectOfflineFarmStage,
    dismissOfflineSummary,
    exportSave,
    importSave,
    resetNewGame
  };
}
