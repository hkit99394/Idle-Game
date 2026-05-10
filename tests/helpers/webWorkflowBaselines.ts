import type { StaticGameData } from "../../core";
import {
  createInitialWebGameState,
  equipGameEquipment,
  resolveSelectedStageBattle,
  setGameAssignmentHeroes,
  webGameStateReducer
} from "../../web/state/gameState";
import type { OfflineRewardSummary, WebGameState } from "../../web/state/gameState";

export const webWorkflowBaselineIds = {
  stageId: "bamboo_road_5",
  offlineSummaryStageId: "bamboo_road_3",
  equipmentId: "training_wraps",
  assignmentId: "bamboo_road_patrol",
  heroId: "iron_fist_disciple",
  medicineId: "clear_heart_pill"
} as const;

export const webUiModuleInventory = [
  {
    feature: "app_shell",
    label: "App shell",
    files: [
      "web/App.tsx",
      "web/app/AppPanels.tsx",
      "web/app/statusText.ts",
      "web/app/useSaveTools.ts",
      "web/components/GamePanels.tsx",
      "web/state/viewModel.ts",
      "web/state/viewModels/webGameViewModel.ts"
    ],
    workflows: [
      "startup",
      "auto_run_loop",
      "panel_composition",
      "status_labels",
      "save_tool_local_state",
      "view_model_assembly"
    ]
  },
  {
    feature: "battle",
    label: "Battle",
    files: [
      "web/features/battle/panels.tsx",
      "web/state/viewModels/battle.ts",
      "web/state/viewModels/battleTypes.ts"
    ],
    workflows: ["battle_status", "team_cards", "battle_log", "battle_summary"]
  },
  {
    feature: "map_idle",
    label: "Map and idle",
    files: [
      "web/features/mapIdle/panels.tsx",
      "web/state/offlineRewardSummary.ts",
      "web/state/viewModels/map.ts",
      "web/state/viewModels/mapTypes.ts",
      "web/state/viewModels/offline.ts",
      "web/state/viewModels/offlineTypes.ts"
    ],
    workflows: ["stage_selection", "offline_farm_target", "offline_summary"]
  },
  {
    feature: "roster_formation",
    label: "Roster and formation",
    files: [
      "web/features/rosterFormation/panels.tsx",
      "web/state/viewModels/roster.ts",
      "web/state/viewModels/rosterTypes.ts"
    ],
    workflows: ["active_team", "formation_slots"]
  },
  {
    feature: "equipment_assignments",
    label: "Equipment and assignments",
    files: [
      "web/features/equipmentAssignments/panels.tsx",
      "web/state/viewModels/assignments.ts",
      "web/state/viewModels/assignmentTypes.ts",
      "web/state/viewModels/equipment.ts",
      "web/state/viewModels/equipmentTypes.ts"
    ],
    workflows: ["equipment_inventory", "hero_equipment", "assignments"]
  },
  {
    feature: "growth_mastery",
    label: "Growth and mastery",
    files: [
      "web/features/growthMastery/panels.tsx",
      "web/state/viewModels/progression.ts",
      "web/state/viewModels/progressionTypes.ts"
    ],
    workflows: ["upgrades", "skill_upgrades", "mastery", "style_mastery"]
  },
  {
    feature: "counterplay_save",
    label: "Counterplay and save",
    files: [
      "web/features/counterplaySave/panels.tsx",
      "web/state/viewModels/counterplay.ts",
      "web/state/viewModels/counterplayTypes.ts",
      "web/state/viewModels/saveDiagnostics.ts",
      "web/state/viewModels/saveDiagnosticsTypes.ts",
      "web/state/saveStorage.ts"
    ],
    workflows: ["counterplay_settings", "save_tools", "diagnostics"]
  },
  {
    feature: "shared_ui",
    label: "Shared UI",
    files: [
      "web/features/shared/ui.tsx",
      "web/statusPresentation.ts",
      "web/styles/app.css"
    ],
    workflows: ["formatting", "status_presentation", "layout"]
  }
] as const;

const baselineOfflineSummary: OfflineRewardSummary = {
  stageId: webWorkflowBaselineIds.offlineSummaryStageId,
  offlineSeconds: 3600,
  clears: 36,
  silver: 240,
  cultivation: 120,
  herbs: 0,
  combatExperience: 108,
  assignmentSilver: 24,
  assignmentCultivation: 0,
  assignmentHerbs: 0,
  assignmentCombatExperience: 12,
  assignmentStyleMasteryExperience: 0,
  assignmentEquipmentRewards: []
};

export function createWebWorkflowBaselineState(
  data: StaticGameData
): WebGameState {
  const initialState = createInitialWebGameState(data);
  const baselineProgress = {
    ...initialState.progress,
    currentStageId: webWorkflowBaselineIds.stageId,
    resources: {
      silver: 120,
      cultivation: 80,
      herbs: 6
    },
    maps: {
      ...initialState.progress.maps,
      bamboo_road: {
        combatExperience: 88,
        highestClearedStageIndex: 4
      }
    },
    equipment: {
      inventory: {
        [webWorkflowBaselineIds.equipmentId]: 1
      },
      equipped: {}
    },
    medicineInventory: {
      [webWorkflowBaselineIds.medicineId]: 1
    }
  };
  const progressedState = webGameStateReducer(data, initialState, {
    type: "replace_progress",
    progress: baselineProgress
  });
  const selectedState = webGameStateReducer(data, progressedState, {
    type: "select_stage",
    stageId: webWorkflowBaselineIds.stageId
  });
  const equippedState = equipGameEquipment(data, selectedState, {
    heroId: webWorkflowBaselineIds.heroId,
    equipmentId: webWorkflowBaselineIds.equipmentId
  });
  const assignedState = setGameAssignmentHeroes(data, equippedState, {
    assignmentId: webWorkflowBaselineIds.assignmentId,
    heroIds: [webWorkflowBaselineIds.heroId]
  });
  const resistanceState = webGameStateReducer(data, assignedState, {
    type: "set_pre_battle_resistance_mode",
    mode: "status_heavy"
  });
  const medicineState = webGameStateReducer(data, resistanceState, {
    type: "set_medicine_auto_use",
    medicineId: webWorkflowBaselineIds.medicineId,
    enabled: false
  });
  const battleState = resolveSelectedStageBattle(data, medicineState);
  const farmTargetState = webGameStateReducer(data, battleState, {
    type: "select_offline_farm_stage",
    stageId: webWorkflowBaselineIds.offlineSummaryStageId
  });

  return {
    ...farmTargetState,
    offlineSummary: baselineOfflineSummary
  };
}
