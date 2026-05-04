import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import {
  buildEnemyTeamForStage,
  buildPlayerTeamForStage,
  calculateCombatPower,
  calculateSkillUpgradeCost,
  calculateUpgradeCost,
  createInitialPlayerProgress,
  deriveStats,
  getDefaultFormationSlot,
  getActiveMasterySummaryForStage,
  getStageById,
  getSkillUpgradeLevel,
  getStyleMasteryExperience,
  getStyleMasteryLevel,
  getUpgradeLevel,
  hasClearedStage,
  isOfflineFarmStageUnlocked,
  isStageUnlocked,
  isStyleBranchUnlocked,
  purchaseSkillUpgrade as purchaseCoreSkillUpgrade,
  purchaseUpgrade as purchaseCoreUpgrade,
  resolveStageBattle,
  scaleStatsForLevel,
  setPlayerFormationSlot,
  setOfflineFarmStageTarget,
  STYLE_MASTERY_EXPERIENCE_PER_LEVEL
} from "../../core";
import type {
  ActiveMasterySummary,
  BattleEvent,
  BattleContribution,
  CombatantInstanceDefinition,
  CombatantState,
  CombatRole,
  DerivedStats,
  FormationSlot,
  MasteryBonus,
  TeamId,
  PlayerProgress,
  ApplyOfflineRewardsResult,
  PurchaseSkillUpgradeInput,
  PurchaseSkillUpgradeResult,
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
  timeTravelOfflineSaveInStorage,
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
  lastSkillPurchase: PurchaseSkillUpgradeResult | null;
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
      type: "set_hero_formation_slot";
      heroId: string;
      slot: FormationSlot;
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
      type: "skill_purchase_resolved";
      result: PurchaseSkillUpgradeResult;
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
export type PurchaseGameSkillUpgradeInput = Omit<
  PurchaseSkillUpgradeInput,
  "progress"
>;

export type BattleCombatantView = {
  instanceId: string;
  definitionId: string;
  team: TeamId;
  kind: "hero" | "enemy";
  name: string;
  style: string;
  role: string;
  combatRole: CombatRole;
  formationSlot: FormationSlot;
  level: number;
  outerHp: number;
  innerQi: number;
  maxOuterHp: number;
  maxInnerQi: number;
  outerAttack: number;
  innerAttack: number;
  speed: number;
  combatPower: number;
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
  art: "outer" | "inner";
  heroId?: string;
  targetName: string;
  effects: string[];
  level: number;
  cost: number;
  affordable: boolean;
  missingSilver: number;
};

export type SkillUpgradeView = {
  key: string;
  skillUpgradeId: string;
  skillId: string;
  name: string;
  skillName: string;
  level: number;
  maxLevel: number;
  cost: number;
  affordable: boolean;
  missingCultivation: number;
  effects: string[];
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

export type MasteryRankTone = "unfamiliar" | "familiar" | "trained" | "mastered";

export type MasteryRankView = {
  rank: string;
  label: string;
  tone: MasteryRankTone;
};

export type MasteryPanelView = {
  regionId: string;
  regionName: string;
  combatExperience: number;
  reachedRanks: MasteryRankView[];
  nextThreshold: {
    experience: number;
    rank: string;
    remainingExperience: number;
  } | null;
  activeBonuses: MasteryBonusView[];
  progressPercent: number;
};

export type PlayerFormationHeroView = {
  heroId: string;
  name: string;
  style: string;
  role: string;
  combatRole: CombatRole;
  formationSlot: FormationSlot;
};

export type StyleBranchView = {
  id: string;
  name: string;
  isUnlocked: boolean;
  hiddenInMvp: boolean;
  requirement: string;
};

export type StyleMasteryView = {
  styleId: string;
  name: string;
  level: number;
  experience: number;
  nextLevelExperience: number;
  progressPercent: number;
  bonuses: string[];
  branches: StyleBranchView[];
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

export const OFFLINE_TIME_TRAVEL_SECONDS = 60 * 60;

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
    lastPurchase: null,
    lastSkillPurchase: null
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
    lastPurchase: null,
    lastSkillPurchase: null
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
    case "select_stage": {
      const selectedStageId = normalizeSelectedStageId(
        data,
        state.progress,
        action.stageId
      );

      return {
        ...state,
        selectedStageId,
        selectedOfflineFarmStageId: normalizeFarmStageId(
          data,
          state.progress,
          selectedStageId
        )
      };
    }

    case "select_offline_farm_stage":
      return {
        ...state,
        selectedOfflineFarmStageId: normalizeFarmStageId(
          data,
          state.progress,
          action.stageId
        )
      };

    case "set_hero_formation_slot": {
      const result = setPlayerFormationSlot(
        data,
        state.progress,
        action.heroId,
        action.slot
      );

      if (!result.ok) {
        return state;
      }

      return {
        ...state,
        progress: result.progress,
        lastBattle: null,
        lastBattleStageId: null,
        lastPurchase: null,
        lastSkillPurchase: null
      };
    }

    case "battle_resolved": {
      const nextProgress = action.result.ok
        ? action.result.progress
        : state.progress;
      const selectedStageId = state.selectedStageId;

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
          selectedStageId
        ),
        lastBattle: action.result,
        lastBattleStageId: action.stageId,
        lastPurchase: null,
        lastSkillPurchase: null
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
        lastSkillPurchase: null,
        lastBattle: null,
        lastBattleStageId: null
      };
    }

    case "skill_purchase_resolved": {
      const nextProgress = action.result.ok
        ? action.result.progress
        : state.progress;

      return {
        ...state,
        progress: nextProgress,
        lastSkillPurchase: action.result,
        lastPurchase: null,
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
        lastPurchase: null,
        lastSkillPurchase: null
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

export function purchaseGameSkillUpgrade(
  data: StaticGameData,
  state: WebGameState,
  input: PurchaseGameSkillUpgradeInput
): WebGameState {
  const result = purchaseCoreSkillUpgrade(data.skillUpgrades, {
    progress: state.progress,
    ...input
  });

  return webGameStateReducer(data, state, {
    type: "skill_purchase_resolved",
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
    combatRole: CombatRole;
    formationSlot: FormationSlot;
    level: number;
    stats: DerivedStats;
  },
  finalState?: CombatantState
): BattleCombatantView {
  const stats = finalState?.stats ?? input.stats;

  return {
    instanceId: input.instanceId,
    definitionId: input.definitionId,
    team: input.team,
    kind: input.kind,
    name: input.name,
    style: input.style,
    role: input.role,
    combatRole: input.combatRole,
    formationSlot: finalState?.formationSlot ?? input.formationSlot,
    level: Math.max(finalState?.level ?? input.level, input.level),
    outerHp: finalState?.outerHp ?? input.stats.maxOuterHp,
    innerQi: finalState?.innerQi ?? input.stats.maxInnerQi,
    maxOuterHp: finalState?.maxOuterHp ?? input.stats.maxOuterHp,
    maxInnerQi: finalState?.maxInnerQi ?? input.stats.maxInnerQi,
    outerAttack: stats.outerAttack,
    innerAttack: stats.innerAttack,
    speed: stats.speed,
    combatPower: calculateCombatPower(stats),
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
      `${combatant.name} (${formatSlotLabel(combatant.formationSlot)})`
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

function formatSlotLabel(slot: FormationSlot): string {
  return `${slot.charAt(0).toUpperCase()}${slot.slice(1)}`;
}

function formatRoleLabel(role: string): string {
  return role
    .replace(/[-_]+/g, " ")
    .replace(/^./, (match) => match.toUpperCase());
}

function getContributionDamage(contribution: BattleContribution): number {
  return (
    contribution.outerDamageDealt +
    contribution.innerDamageDealt +
    contribution.qiBreakBurstDamageDealt
  );
}

function formatContributionName(contribution: BattleContribution): string {
  return `${contribution.name} (${formatSlotLabel(
    contribution.formationSlot
  )} ${formatRoleLabel(contribution.combatRole)})`;
}

function getTopContribution(
  contributions: BattleContribution[],
  getScore: (contribution: BattleContribution) => number
): BattleContribution | null {
  let topContribution: BattleContribution | null = null;
  let topScore = 0;

  for (const contribution of contributions) {
    const score = getScore(contribution);

    if (score > topScore) {
      topContribution = contribution;
      topScore = score;
    }
  }

  return topContribution;
}

function buildContributionSummaryDetails(
  battle: Extract<ResolveStageBattleResult, { ok: true }>["battle"]
): string[] {
  const topDamageDealer = getTopContribution(
    battle.contributions,
    getContributionDamage
  );
  const topBreaker = getTopContribution(
    battle.contributions,
    (contribution) =>
      contribution.qiBreaksTriggered * 1000 +
      contribution.qiBreakBurstDamageDealt
  );
  const carryPool =
    battle.winner === "timeout"
      ? battle.contributions
      : battle.contributions.filter(
          (contribution) => contribution.team === battle.winner
        );
  const carry = getTopContribution(
    carryPool,
    (contribution) =>
      getContributionDamage(contribution) +
      contribution.qiBreaksTriggered * 100 +
      (contribution.survived ? 50 : 0)
  );
  const details: string[] = [];

  if (topDamageDealer) {
    details.push(
      `Top damage: ${formatContributionName(topDamageDealer)} dealt ${formatBattleNumber(
        getContributionDamage(topDamageDealer)
      )} total damage.`
    );
  }

  if (topBreaker && topBreaker.qiBreaksTriggered > 0) {
    details.push(
      `Qi breaker: ${formatContributionName(topBreaker)} triggered ${
        topBreaker.qiBreaksTriggered
      } break${topBreaker.qiBreaksTriggered === 1 ? "" : "s"}.`
    );
  } else {
    details.push("Qi breaker: none.");
  }

  if (carry) {
    details.push(
      `Carry: ${formatContributionName(carry)} ${
        carry.survived ? "survived" : "fell"
      } with ${formatBattleNumber(getContributionDamage(carry))} damage.`
    );
  }

  return details;
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
      ...buildContributionSummaryDetails(battle),
      rewardText
    ]
  };
}

function formatStatName(stat: string): string {
  return stat.replace(/[A-Z]/g, (match) => ` ${match}`).replace(/^./, (match) =>
    match.toUpperCase()
  );
}

function formatPerLevelEffect(stat: string, value: number): string {
  return `${formatMasteryPercent(value)} ${formatStatName(stat)} per level`;
}

function buildUpgradeViews(
  data: StaticGameData,
  progress: PlayerProgress
): UpgradeView[] {
  const buildUpgradeView = (
    upgrade: StaticGameData["upgrades"][number],
    level: number,
    cost: number,
    missingSilver: number,
    key: string,
    targetName: string,
    heroId?: string
  ): UpgradeView => ({
    key,
    upgradeId: upgrade.id,
    name: upgrade.name,
    scope: upgrade.scope,
    art: upgrade.art,
    heroId,
    targetName,
    effects: upgrade.effects.map((effect) =>
      formatPerLevelEffect(effect.stat, effect.effectPerLevel)
    ),
    level,
    cost,
    affordable: missingSilver === 0,
    missingSilver
  });

  return data.upgrades.flatMap<UpgradeView>((upgrade) => {
    if (upgrade.scope === "sect") {
      const level = getUpgradeLevel(progress, upgrade);
      const cost = calculateUpgradeCost(upgrade, level);
      const missingSilver = Math.max(0, cost - progress.resources.silver);

      return [
        buildUpgradeView(
          upgrade,
          level,
          cost,
          missingSilver,
          `sect:${upgrade.id}`,
          "Sect"
        )
      ];
    }

    return data.heroes.map((hero) => {
      const level = getUpgradeLevel(progress, upgrade, hero.id);
      const cost = calculateUpgradeCost(upgrade, level);
      const missingSilver = Math.max(0, cost - progress.resources.silver);

      return buildUpgradeView(
        upgrade,
        level,
        cost,
        missingSilver,
        `${hero.id}:${upgrade.id}`,
        hero.name,
        hero.id
      );
    });
  });
}

function formatSkillUpgradeEffect(
  effect: StaticGameData["skillUpgrades"][number]["effects"][number]
): string {
  switch (effect.type) {
    case "cooldown_seconds":
      return `${effect.valuePerLevel < 0 ? "" : "+"}${effect.valuePerLevel.toFixed(
        2
      )}s cooldown per level`;
    case "outer_multiplier":
      return `${formatMasteryPercent(effect.valuePerLevel)} Outer ratio per level`;
    case "inner_multiplier":
      return `${formatMasteryPercent(effect.valuePerLevel)} Inner ratio per level`;
    case "add_skill_effect":
      return `Adds ${effect.effect.type.replaceAll("_", " ")} at level ${effect.unlockLevel}`;
  }
}

function buildSkillUpgradeViews(
  data: StaticGameData,
  progress: PlayerProgress
): SkillUpgradeView[] {
  return data.skillUpgrades.map((upgrade) => {
    const skill = data.skills.find((candidate) => candidate.id === upgrade.skillId);
    const level = getSkillUpgradeLevel(progress, upgrade.id);
    const isMaxLevel = level >= upgrade.maxLevel;
    const cost = isMaxLevel ? 0 : calculateSkillUpgradeCost(upgrade, level);
    const missingCultivation = Math.max(
      0,
      cost - progress.resources.cultivation
    );

    return {
      key: upgrade.id,
      skillUpgradeId: upgrade.id,
      skillId: upgrade.skillId,
      name: upgrade.name,
      skillName: skill?.name ?? upgrade.skillId,
      level,
      maxLevel: upgrade.maxLevel,
      cost,
      affordable: !isMaxLevel && missingCultivation === 0,
      missingCultivation,
      effects: upgrade.effects.map(formatSkillUpgradeEffect)
    };
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

function getMasteryRankTone(rank: string): MasteryRankTone {
  switch (rank) {
    case "familiar":
      return "familiar";
    case "trained":
      return "trained";
    case "mastered":
      return "mastered";
    default:
      return "unfamiliar";
  }
}

function formatMasteryRankLabel(rank: string): string {
  const words = rank
    .replace(/[-_]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "Unfamiliar";
  }

  return words
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function buildMasteryRankView(rank: string): MasteryRankView {
  return {
    rank,
    label: formatMasteryRankLabel(rank),
    tone: getMasteryRankTone(rank)
  };
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
    reachedRanks: summary.reachedRanks.map(buildMasteryRankView),
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

function formatStyleBranchRequirement(
  data: StaticGameData,
  branch: StaticGameData["styles"][number]["branches"][number]
): string {
  const unlock = branch.unlock;

  switch (unlock.type) {
    case "always":
      return "Available";
    case "stage_cleared":
      return `Clear ${
        getStageById(data, unlock.stageId)?.name ?? unlock.stageId
      }`;
    case "hero_level":
      return `${
        data.heroes.find((hero) => hero.id === unlock.heroId)?.name ??
        unlock.heroId
      } level ${unlock.level}`;
    case "style_mastery_level":
      return `${
        data.styles.find((style) => style.id === unlock.styleId)?.name ??
        unlock.styleId
      } mastery ${unlock.level}`;
  }
}

function buildStyleMasteryViews(
  data: StaticGameData,
  progress: PlayerProgress
): StyleMasteryView[] {
  return data.styles.map((style) => {
    const experience = getStyleMasteryExperience(progress, style.id);
    const level = getStyleMasteryLevel(progress, style.id);
    const currentLevelExperience = level * STYLE_MASTERY_EXPERIENCE_PER_LEVEL;
    const nextLevelExperience = (level + 1) * STYLE_MASTERY_EXPERIENCE_PER_LEVEL;
    const progressPercent = Math.min(
      Math.max(
        (experience - currentLevelExperience) /
          (nextLevelExperience - currentLevelExperience),
        0
      ),
      1
    );

    return {
      styleId: style.id,
      name: style.name,
      level,
      experience,
      nextLevelExperience,
      progressPercent,
      bonuses: style.bonuses.map((bonus) =>
        formatPerLevelEffect(bonus.stat, bonus.effectPerLevel)
      ),
      branches: style.branches.map((branch) => ({
        id: branch.id,
        name: branch.name,
        isUnlocked: isStyleBranchUnlocked(data, progress, branch),
        hiddenInMvp: branch.hiddenInMvp,
        requirement: formatStyleBranchRequirement(data, branch)
      }))
    };
  });
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
    case "invalid_duration":
      return "Offline time travel duration is invalid";
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
    const level = instance.level ?? progress.heroes[hero.id]?.level ?? 1;
    const formationSlot = instance.formationSlot ?? getDefaultFormationSlot(index);
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
        combatRole: hero.combatRole,
        formationSlot,
        level,
        stats
      },
      getFinalCombatantById(finalCombatants, instanceId)
    );
  });
}

function buildPlayerFormationViews(
  playerCombatants: BattleCombatantView[]
): PlayerFormationHeroView[] {
  return playerCombatants.map((combatant) => ({
    heroId: combatant.definitionId,
    name: combatant.name,
    style: combatant.style,
    role: combatant.role,
    combatRole: combatant.combatRole,
    formationSlot: combatant.formationSlot
  }));
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

    const level = instance.level ?? enemy.level;
    const formationSlot = instance.formationSlot ?? getDefaultFormationSlot(index);
    const stats = deriveStats(
      instance.statsOverride ?? scaleStatsForLevel(enemy.baseStats, level)
    );
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
        combatRole: enemy.combatRole,
        formationSlot,
        level,
        stats
      },
      getFinalCombatantById(finalCombatants, instanceId)
    );
  });
}

function buildEnemyTeamLabel(
  data: StaticGameData,
  stage: ReturnType<typeof getStageById> | null
): string {
  if (!stage || stage.enemyTeam.combatantIds.length === 0) {
    return "Unknown Enemy Team";
  }

  const enemyNames = new Map(
    data.enemies.map((enemy) => [enemy.id, enemy.name])
  );
  const nameCounts = new Map<string, number>();

  for (const enemyId of stage.enemyTeam.combatantIds) {
    const enemyName = enemyNames.get(enemyId) ?? enemyId;
    nameCounts.set(enemyName, (nameCounts.get(enemyName) ?? 0) + 1);
  }

  return [...nameCounts.entries()]
    .map(([enemyName, count]) =>
      count > 1 ? `${enemyName} x${count}` : enemyName
    )
    .join(" / ");
}

export function getWebGameViewModel(
  data: StaticGameData,
  state: WebGameState
) {
  const selectedStage = getStageById(data, state.selectedStageId);
  const enemyTeamLabel = buildEnemyTeamLabel(data, selectedStage);
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
  const playerCombatants = selectedStage
    ? buildPlayerCombatantViews(
        data,
        state.progress,
        selectedStage.id,
        finalPlayerTeam
      )
    : [];
  const enemyCombatants = selectedStage
    ? buildEnemyCombatantViews(data, selectedStage.id, finalEnemyTeam)
    : [];

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
    skillUpgrades: buildSkillUpgradeViews(data, state.progress),
    styleMastery: buildStyleMasteryViews(data, state.progress),
    playerFormation: buildPlayerFormationViews(playerCombatants),
    playerCombatants,
    enemyCombatants,
    enemyTeamLabel,
    masterySummary: activeMasterySummary,
    masteryPanel: buildMasteryPanel(data, activeMasterySummary),
    offlineSummary: buildOfflineRewardSummaryView(data, state.offlineSummary),
    lastBattle: state.lastBattle,
    lastBattleStage,
    battleEvents: buildBattleEventViews(data, state.lastBattle),
    battleSummary: buildBattleSummary(state.lastBattle, lastBattleStage?.name ?? null),
    lastPurchase: state.lastPurchase,
    lastSkillPurchase: state.lastSkillPurchase
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

  const purchaseSkillUpgrade = useCallback(
    (input: PurchaseGameSkillUpgradeInput) => {
      dispatchAndPersist({
        type: "skill_purchase_resolved",
        result: purchaseCoreSkillUpgrade(data.skillUpgrades, {
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

  const setHeroFormation = useCallback((heroId: string, slot: FormationSlot) => {
    dispatchAndPersist({
      type: "set_hero_formation_slot",
      heroId,
      slot
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

  const timeTravelOfflineFarm = useCallback(
    (
      offlineSeconds = OFFLINE_TIME_TRAVEL_SECONDS
    ): SaveToolResult => {
      const storage = getBrowserSaveStorage();

      if (!state.selectedOfflineFarmStageId) {
        return {
          ok: false,
          message: "Select an offline farm stage first",
          errors: []
        };
      }

      if (!storage) {
        return {
          ok: false,
          message: "Browser save storage is unavailable",
          errors: ["Browser save storage is unavailable"]
        };
      }

      const nowMs = Date.now();
      const saveResult = saveWebGameStateToStorage(data, state, storage, nowMs);

      if (!saveResult.ok) {
        return {
          ok: false,
          message: getSaveToolErrorMessage(saveResult.reason),
          errors: saveResult.errors
        };
      }

      const travelResult = timeTravelOfflineSaveInStorage(
        data,
        storage,
        offlineSeconds,
        nowMs
      );

      if (!travelResult.ok) {
        return {
          ok: false,
          message: getSaveToolErrorMessage(travelResult.reason),
          errors: travelResult.errors
        };
      }

      const loadResult = loadSaveDataWithOfflineRewardsFromStorage(
        data,
        storage,
        nowMs
      );

      if (!loadResult.ok) {
        return {
          ok: false,
          message: getSaveToolErrorMessage(loadResult.reason),
          errors: loadResult.errors
        };
      }

      const offlineSummary = createOfflineRewardSummary(loadResult.offlineRewards);

      dispatch({
        type: "replace_state",
        state: createWebGameStateFromSave(data, loadResult.save, offlineSummary)
      });

      return {
        ok: true,
        message: offlineSummary
          ? "Offline time travel rewards applied"
          : "Offline time travel applied with no rewards"
      };
    },
    [data, state]
  );

  return {
    state,
    viewModel,
    saveDiagnostics,
    dispatch,
    battleSelectedStage,
    purchaseUpgrade,
    purchaseSkillUpgrade,
    selectStage,
    selectOfflineFarmStage,
    setHeroFormation,
    dismissOfflineSummary,
    exportSave,
    importSave,
    resetNewGame,
    timeTravelOfflineFarm
  };
}
