import {
  ACTIVE_TEAM_SIZE,
  getActiveMasterySummaryForStage,
  getStageById
} from "../../../core";
import type { StaticGameData } from "../../../core";
import { displayTerms } from "../../displayTerms";
import type { WebGameState } from "../types";
import { buildAssignmentViews } from "./assignments";
import { buildBattleFeatureView } from "./battle";
import { buildCounterplaySettingsView } from "./counterplay";
import {
  buildEquipmentInventoryViews,
  buildHeroEquipmentViews
} from "./equipment";
import { buildStageOptions } from "./map";
import {
  buildOfflineFarmPresetViews,
  buildOfflineFarmRecommendationView,
  buildOfflineRewardPreviewView,
  buildOfflineRewardSummaryView
} from "./offline";
import {
  buildMasteryPanel,
  buildSkillUpgradeViews,
  buildStyleMasteryViews,
  buildUpgradeViews
} from "./progression";
import { buildPlayerFormationViews, buildRosterHeroViews } from "./roster";
import { buildTacticPresetViews } from "./tactics";

function getSelectedStageContext(data: StaticGameData, state: WebGameState) {
  const selectedStage = getStageById(data, state.selectedStageId);
  const selectedStageRegion = data.regions.find(
    (region) => region.id === selectedStage?.regionId
  );
  const selectedOfflineFarmStage = state.selectedOfflineFarmStageId
    ? getStageById(data, state.selectedOfflineFarmStageId)
    : null;
  const lastBattleStage = state.lastBattleStageId
    ? getStageById(data, state.lastBattleStageId)
    : null;

  return {
    selectedStage,
    selectedStageRegionName:
      selectedStageRegion?.name ??
      selectedStage?.regionId ??
      `Unknown ${displayTerms.progression.district}`,
    selectedOfflineFarmStage,
    lastBattleStage
  };
}

function getActiveMasterySummary(data: StaticGameData, state: WebGameState) {
  const masterySummary = getActiveMasterySummaryForStage(
    data,
    state.progress,
    state.selectedStageId
  );

  return masterySummary.ok ? masterySummary.summary : null;
}

function buildMapIdleFeatureView(data: StaticGameData, state: WebGameState) {
  return {
    offlineFarmPreset: state.offlineFarmPreset,
    offlineFarmPresets: buildOfflineFarmPresetViews(state.offlineFarmPreset),
    offlineFarmRecommendation: buildOfflineFarmRecommendationView(
      data,
      state.progress,
      state.selectedOfflineFarmStageId,
      state.offlineFarmPreset
    ),
    offlineRewardPreview: buildOfflineRewardPreviewView(
      data,
      state.progress,
      state.selectedOfflineFarmStageId
    ),
    stageOptions: buildStageOptions(
      data,
      state.progress,
      state.selectedStageId,
      state.selectedOfflineFarmStageId
    ),
    offlineSummary: buildOfflineRewardSummaryView(data, state.offlineSummary)
  };
}

function buildEquipmentAndGrowthFeatureView(
  data: StaticGameData,
  state: WebGameState,
  activeMasterySummary: ReturnType<typeof getActiveMasterySummary>
) {
  return {
    equipmentInventory: buildEquipmentInventoryViews(data, state.progress),
    heroEquipment: buildHeroEquipmentViews(data, state.progress),
    roster: buildRosterHeroViews(data, state.progress),
    activeTeamSize: ACTIVE_TEAM_SIZE,
    assignments: buildAssignmentViews(data, state.progress),
    upgrades: buildUpgradeViews(data, state.progress),
    skillUpgrades: buildSkillUpgradeViews(data, state.progress),
    styleMastery: buildStyleMasteryViews(data, state.progress),
    masterySummary: activeMasterySummary,
    masteryPanel: buildMasteryPanel(data, activeMasterySummary)
  };
}

export function buildWebGameViewModel(
  data: StaticGameData,
  state: WebGameState
) {
  const {
    selectedStage,
    selectedStageRegionName,
    selectedOfflineFarmStage,
    lastBattleStage
  } = getSelectedStageContext(data, state);
  const activeMasterySummary = getActiveMasterySummary(data, state);
  const battleView = buildBattleFeatureView(data, {
    progress: state.progress,
    selectedStage,
    selectedStageId: state.selectedStageId,
    lastBattle: state.lastBattle,
    lastBattleStage,
    lastBattleStageId: state.lastBattleStageId
  });

  return {
    progress: state.progress,
    selectedStage,
    selectedStageRegionName,
    selectedOfflineFarmStage,
    tactics: buildTacticPresetViews(data, state.progress),
    ...buildMapIdleFeatureView(data, state),
    ...buildEquipmentAndGrowthFeatureView(data, state, activeMasterySummary),
    playerFormation: buildPlayerFormationViews(battleView.playerCombatants),
    playerCombatants: battleView.playerCombatants,
    enemyCombatants: battleView.enemyCombatants,
    enemyTeamLabel: battleView.enemyTeamLabel,
    counterplaySettings: buildCounterplaySettingsView(data, state, selectedStage),
    lastBattle: battleView.lastBattle,
    lastBattleStage: battleView.lastBattleStage,
    battleEvents: battleView.battleEvents,
    battleSummary: battleView.battleSummary,
    lastPurchase: state.lastPurchase,
    lastSkillPurchase: state.lastSkillPurchase,
    lastEquipmentAction: state.lastEquipmentAction,
    lastStyleBranchAction: state.lastStyleBranchAction,
    lastActiveTeamAction: state.lastActiveTeamAction,
    lastAssignmentAction: state.lastAssignmentAction
  };
}
