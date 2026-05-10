import {
  ACTIVE_TEAM_SIZE,
  getActiveMasterySummaryForStage,
  getStageById
} from "../../core";
import type { StaticGameData } from "../../core";
import type { WebGameState } from "./types";
import {
  buildBattleEventViews,
  buildBattleSummary,
  buildEnemyCombatantViews,
  buildEnemyTeamLabel,
  buildPlayerCombatantViews,
  buildPlayerFormationViews
} from "./viewModels/battle";
import { buildCounterplaySettingsView } from "./viewModels/counterplay";
import {
  buildEquipmentInventoryViews,
  buildHeroEquipmentViews
} from "./viewModels/equipment";
import {
  buildOfflineFarmPresetViews,
  buildOfflineFarmRecommendationView,
  buildOfflineRewardPreviewView,
  buildOfflineRewardSummaryView
} from "./viewModels/offline";
import { buildStageOptions } from "./viewModels/map";
import {
  buildAssignmentViews,
  buildMasteryPanel,
  buildRosterHeroViews,
  buildSkillUpgradeViews,
  buildStyleMasteryViews,
  buildUpgradeViews
} from "./viewModels/progression";

export {
  buildSaveDiagnostics,
  getSaveToolErrorMessage
} from "./viewModels/saveDiagnostics";

export function getWebGameViewModel(
  data: StaticGameData,
  state: WebGameState
) {
  const selectedStage = getStageById(data, state.selectedStageId);
  const selectedStageRegion = data.regions.find(
    (region) => region.id === selectedStage?.regionId
  );
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
  const battleContributions = showFinalCombatants
    ? successfulLastBattle.battle.contributions
    : undefined;
  const playerCombatants = selectedStage
    ? buildPlayerCombatantViews(
        data,
        state.progress,
        selectedStage.id,
        finalPlayerTeam,
        battleContributions
      )
    : [];
  const enemyCombatants = selectedStage
    ? buildEnemyCombatantViews(
        data,
        selectedStage.id,
        finalEnemyTeam,
        battleContributions
      )
    : [];

  return {
    progress: state.progress,
    selectedStage,
    selectedStageRegionName:
      selectedStageRegion?.name ?? selectedStage?.regionId ?? "Unknown map",
    selectedOfflineFarmStage,
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
    equipmentInventory: buildEquipmentInventoryViews(data, state.progress),
    heroEquipment: buildHeroEquipmentViews(data, state.progress),
    roster: buildRosterHeroViews(data, state.progress),
    activeTeamSize: ACTIVE_TEAM_SIZE,
    assignments: buildAssignmentViews(data, state.progress),
    upgrades: buildUpgradeViews(data, state.progress),
    skillUpgrades: buildSkillUpgradeViews(data, state.progress),
    styleMastery: buildStyleMasteryViews(data, state.progress),
    playerFormation: buildPlayerFormationViews(playerCombatants),
    playerCombatants,
    enemyCombatants,
    enemyTeamLabel,
    counterplaySettings: buildCounterplaySettingsView(data, state, selectedStage),
    masterySummary: activeMasterySummary,
    masteryPanel: buildMasteryPanel(data, activeMasterySummary),
    offlineSummary: buildOfflineRewardSummaryView(data, state.offlineSummary),
    lastBattle: state.lastBattle,
    lastBattleStage,
    battleEvents: buildBattleEventViews(data, state.lastBattle),
    battleSummary: buildBattleSummary(state.lastBattle, lastBattleStage?.name ?? null),
    lastPurchase: state.lastPurchase,
    lastSkillPurchase: state.lastSkillPurchase,
    lastEquipmentAction: state.lastEquipmentAction,
    lastStyleBranchAction: state.lastStyleBranchAction,
    lastActiveTeamAction: state.lastActiveTeamAction,
    lastAssignmentAction: state.lastAssignmentAction
  };
}

export type WebGameViewModel = ReturnType<typeof getWebGameViewModel>;
