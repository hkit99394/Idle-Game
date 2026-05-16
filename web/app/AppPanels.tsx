import { Fragment } from "react";
import type { ReactNode } from "react";
import type {
  FormationSlot,
  OfflineFarmPreset,
  PreBattleResistanceMode
} from "../../core";
import {
  AssignmentPanel,
  BattleLog,
  CounterplaySettingsPanel,
  EquipmentPanel,
  FormationPanel,
  MasteryPanel,
  OfflineFarmPanel,
  OfflineSummaryPanel,
  RosterPanel,
  SaveToolsPanel,
  SkillUpgradePanel,
  StageSelectorPanel,
  StyleMasteryPanel,
  TacticsPanel,
  TeamPanel,
  UpgradePanel,
  formatNumber
} from "../components/GamePanels";
import type {
  EquipGameEquipmentInput,
  PurchaseGameSkillUpgradeInput,
  PurchaseGameUpgradeInput,
  SelectGameStyleBranchInput,
  SelectGameTacticInput,
  SetGameActiveHeroTeamInput,
  SetGameAssignmentHeroesInput,
  WebGameViewModel
} from "../state/gameState";
import type { SaveDiagnosticsView } from "../state/viewModels/saveDiagnosticsTypes";
import { displayTerms, formatResourceLabel } from "../displayTerms";
import { buildAppStatusText } from "./statusText";
import type { AppStatusText } from "./statusText";
import type { SaveToolControls } from "./useSaveTools";

export type AppFeaturePanelId =
  | "offline_summary"
  | "offline_farm"
  | "assignments"
  | "counterplay_settings"
  | "roster"
  | "mastery"
  | "stage_selector"
  | "formation"
  | "tactics"
  | "style_mastery"
  | "upgrades"
  | "skill_upgrades"
  | "equipment"
  | "battle_teams"
  | "battle_log"
  | "save_tools";

type AppPanelGameContext = {
  dismissOfflineSummary: () => void;
  equipEquipment: (input: EquipGameEquipmentInput) => void;
  purchaseSkillUpgrade: (input: PurchaseGameSkillUpgradeInput) => void;
  purchaseUpgrade: (input: PurchaseGameUpgradeInput) => void;
  saveDiagnostics: SaveDiagnosticsView;
  selectStage: (stageId: string) => void;
  selectStyleBranch: (input: SelectGameStyleBranchInput) => void;
  selectTactic: (input: SelectGameTacticInput) => void;
  setActiveHeroTeam: (input: SetGameActiveHeroTeamInput) => void;
  setAssignmentHeroes: (input: SetGameAssignmentHeroesInput) => void;
  setAutoMedicineEnabled: (enabled: boolean) => void;
  setHeroFormation: (heroId: string, slot: FormationSlot) => void;
  setMedicineAutoUse: (medicineId: string, enabled: boolean) => void;
  setOfflineFarmPreset: (preset: OfflineFarmPreset) => void;
  setPreBattleResistanceMode: (mode: PreBattleResistanceMode) => void;
  viewModel: WebGameViewModel;
};

type AppPanelRenderContext = {
  game: AppPanelGameContext;
  saveTools: SaveToolControls;
  statusText: AppStatusText;
};

type AppFeaturePanelDescriptor = {
  id: AppFeaturePanelId;
  render: (context: AppPanelRenderContext) => ReactNode;
};

export const appFeaturePanels: readonly AppFeaturePanelDescriptor[] = [
  {
    id: "offline_summary",
    render: ({ game }) => (
      <OfflineSummaryPanel
        onDismiss={game.dismissOfflineSummary}
        summary={game.viewModel.offlineSummary}
      />
    )
  },
  {
    id: "offline_farm",
    render: ({ game }) => (
      <OfflineFarmPanel
        onSetPreset={game.setOfflineFarmPreset}
        presets={game.viewModel.offlineFarmPresets}
        preview={game.viewModel.offlineRewardPreview}
        recommendation={game.viewModel.offlineFarmRecommendation}
      />
    )
  },
  {
    id: "assignments",
    render: ({ game, statusText }) => (
      <AssignmentPanel
        assignments={game.viewModel.assignments}
        onSetAssignment={game.setAssignmentHeroes}
        status={statusText.assignmentStatus}
      />
    )
  },
  {
    id: "counterplay_settings",
    render: ({ game }) => (
      <CounterplaySettingsPanel
        onSetAutoMedicineEnabled={game.setAutoMedicineEnabled}
        onSetMedicineAutoUse={game.setMedicineAutoUse}
        onSetPreBattleResistanceMode={game.setPreBattleResistanceMode}
        settings={game.viewModel.counterplaySettings}
      />
    )
  },
  {
    id: "roster",
    render: ({ game, statusText }) => (
      <RosterPanel
        activeTeamSize={game.viewModel.activeTeamSize}
        heroes={game.viewModel.roster}
        onSetActiveTeam={game.setActiveHeroTeam}
        status={statusText.activeTeamStatus}
      />
    )
  },
  {
    id: "mastery",
    render: ({ game }) => <MasteryPanel mastery={game.viewModel.masteryPanel} />
  },
  {
    id: "stage_selector",
    render: ({ game }) => (
      <StageSelectorPanel
        onSelectStage={game.selectStage}
        stages={game.viewModel.stageOptions}
      />
    )
  },
  {
    id: "formation",
    render: ({ game }) => (
      <FormationPanel
        heroes={game.viewModel.playerFormation}
        onSetFormation={game.setHeroFormation}
      />
    )
  },
  {
    id: "tactics",
    render: ({ game }) => (
      <TacticsPanel
        onSelectTactic={(tacticId) => game.selectTactic({ tacticId })}
        tactics={game.viewModel.tactics}
      />
    )
  },
  {
    id: "style_mastery",
    render: ({ game, statusText }) => (
      <StyleMasteryPanel
        onSelectBranch={game.selectStyleBranch}
        status={statusText.styleBranchStatus}
        styles={game.viewModel.styleMastery}
      />
    )
  },
  {
    id: "upgrades",
    render: ({ game, statusText }) => (
      <UpgradePanel
        onPurchase={game.purchaseUpgrade}
        silver={game.viewModel.progress.resources.credits}
        status={statusText.purchaseStatus}
        upgrades={game.viewModel.upgrades}
      />
    )
  },
  {
    id: "skill_upgrades",
    render: ({ game, statusText }) => (
      <SkillUpgradePanel
        cultivation={game.viewModel.progress.resources.resonance}
        onPurchase={game.purchaseSkillUpgrade}
        skillUpgrades={game.viewModel.skillUpgrades}
        status={statusText.skillPurchaseStatus}
      />
    )
  },
  {
    id: "equipment",
    render: ({ game, statusText }) => (
      <EquipmentPanel
        heroes={game.viewModel.heroEquipment}
        inventory={game.viewModel.equipmentInventory}
        onEquip={game.equipEquipment}
        status={statusText.equipmentStatus}
      />
    )
  },
  {
    id: "battle_teams",
    render: ({ game }) => (
      <div className="battle-grid">
        <TeamPanel
          title={displayTerms.progression.initiates}
          combatants={game.viewModel.playerCombatants}
        />
        <TeamPanel
          title="Hostiles"
          combatants={game.viewModel.enemyCombatants}
        />
      </div>
    )
  },
  {
    id: "battle_log",
    render: ({ game }) => (
      <BattleLog
        events={game.viewModel.battleEvents}
        summary={game.viewModel.battleSummary}
      />
    )
  },
  {
    id: "save_tools",
    render: ({ game, saveTools }) => (
      <SaveToolsPanel
        diagnostics={game.saveDiagnostics}
        exportText={saveTools.exportText}
        importText={saveTools.importText}
        onExport={saveTools.handleExportSave}
        onImport={saveTools.handleImportSave}
        onImportTextChange={saveTools.setImportText}
        onReset={saveTools.handleResetNewGame}
        onTimeTravelOfflineFarm={saveTools.handleTimeTravelOfflineFarm}
        status={saveTools.saveToolStatus}
      />
    )
  }
];

export const appFeaturePanelOrder = appFeaturePanels.map((panel) => panel.id);

type GamePanelStackProps = {
  game: AppPanelGameContext;
  saveTools: SaveToolControls;
};

export function GamePanelStack({ game, saveTools }: GamePanelStackProps) {
  const { viewModel } = game;
  const statusText = buildAppStatusText(viewModel);

  return (
    <section className="battle-surface">
      <header className="stage-header">
        <div>
          <span className="label">Current {displayTerms.progression.route}</span>
          <h1>
            {viewModel.selectedStage?.name ??
              `Unknown ${displayTerms.progression.route}`}
          </h1>
        </div>
        <div className="stage-meta">
          <span>{viewModel.selectedStageRegionName}</span>
          <span>{statusText.stageType}</span>
          <span>
            {displayTerms.progression.route} {viewModel.selectedStage?.index ?? "-"}
          </span>
          <span>{viewModel.enemyTeamLabel}</span>
        </div>
        <div
          className={`battle-result ${statusText.battleResultClass}`}
          aria-live="polite"
        >
          {statusText.battleStatus}
        </div>
      </header>
      <div className="resource-row">
        <span>
          {formatResourceLabel("silver")}{" "}
          {formatNumber(viewModel.progress.resources.credits)}
        </span>
        <span>
          {formatResourceLabel("cultivation")}{" "}
          {formatNumber(viewModel.progress.resources.resonance)}
        </span>
        <span>
          {formatResourceLabel("herbs")}{" "}
          {formatNumber(viewModel.progress.resources.reagents)}
        </span>
        <span>
          {formatResourceLabel("combatExperience")}{" "}
          {formatNumber(viewModel.masteryPanel?.combatExperience ?? 0)}
        </span>
      </div>
      {appFeaturePanels.map((panel) => (
        <Fragment key={panel.id}>
          {panel.render({ game, saveTools, statusText })}
        </Fragment>
      ))}
    </section>
  );
}
