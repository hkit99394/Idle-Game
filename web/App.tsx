import { Component, useEffect, useState } from "react";
import type { ReactNode } from "react";
import "./styles/app.css";
import { staticData } from "./gameData";
import { useWebGameState } from "./state/gameState";
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
  TeamPanel,
  UpgradePanel,
  formatNumber,
  getBattleResultClass,
  getBattleResultText
} from "./components/GamePanels";

const AUTO_RUN_INTERVAL_MS = 1200;

type AppErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

class AppErrorBoundary extends Component<
  { children: ReactNode },
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
    message: ""
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      message: error.message
    };
  }

  componentDidCatch(error: Error) {
    console.error("Path of Jianghu app error", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="app-shell">
          <section className="app-error-state" role="alert">
            <span className="label">Data Error</span>
            <h1>Game data could not load</h1>
            <p>
              {this.state.message ||
                "The app hit an unexpected data or rendering error."}
            </p>
            <button type="button" onClick={() => window.location.reload()}>
              Reload
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

function GameApp() {
  const [exportText, setExportText] = useState("");
  const [importText, setImportText] = useState("");
  const [saveToolStatus, setSaveToolStatus] = useState("");
  const {
    battleSelectedStage,
    dismissOfflineSummary,
    equipEquipment,
    exportSave,
    importSave,
    purchaseSkillUpgrade,
    purchaseUpgrade,
    resetNewGame,
    saveDiagnostics,
    selectStyleBranch,
    selectStage,
    setActiveHeroTeam,
    setAssignmentHeroes,
    setAutoMedicineEnabled,
    setOfflineFarmPreset,
    setHeroFormation,
    setMedicineAutoUse,
    setPreBattleResistanceMode,
    timeTravelOfflineFarm,
    viewModel
  } = useWebGameState(staticData);
  const {
    activeTeamSize,
    battleEvents,
    battleSummary,
    assignments,
    counterplaySettings,
    enemyTeamLabel,
    enemyCombatants,
    equipmentInventory,
    heroEquipment,
    lastBattle,
    lastEquipmentAction,
    lastActiveTeamAction,
    lastAssignmentAction,
    lastStyleBranchAction,
    lastBattleStage,
    lastPurchase,
    lastSkillPurchase,
    masteryPanel,
    offlineFarmPresets,
    offlineFarmRecommendation,
    offlineRewardPreview,
    offlineSummary,
    playerCombatants,
    playerFormation,
    progress,
    roster,
    selectedStage,
    selectedStageRegionName,
    skillUpgrades,
    stageOptions,
    styleMastery,
    upgrades
  } = viewModel;
  const resultStageName =
    lastBattleStage?.name ?? selectedStage?.name ?? "Unknown Stage";
  const battleStatus = getBattleResultText(lastBattle, resultStageName);
  const battleResultClass = getBattleResultClass(lastBattle);
  const purchaseStatus =
    lastPurchase?.ok
      ? `Art level ${lastPurchase.newLevel}`
      : lastPurchase
        ? "Need silver"
        : "";
  const skillPurchaseStatus =
    lastSkillPurchase?.ok
      ? `Skill refinement ${lastSkillPurchase.newLevel}`
      : lastSkillPurchase
        ? "Need cultivation"
        : "";
  const equipmentStatus =
    lastEquipmentAction?.ok
      ? "Equipment changed"
      : lastEquipmentAction
        ? lastEquipmentAction.reason.replaceAll("_", " ")
        : "";
  const styleBranchStatus =
    lastStyleBranchAction?.ok
      ? lastStyleBranchAction.branchId
        ? "Branch selected"
        : "Branch cleared"
      : lastStyleBranchAction
        ? lastStyleBranchAction.reason.replaceAll("_", " ")
        : "";
  const assignmentStatus =
    lastAssignmentAction?.ok
      ? "Assignment changed"
      : lastAssignmentAction
        ? lastAssignmentAction.reason.replaceAll("_", " ")
        : "";
  const activeTeamStatus =
    lastActiveTeamAction?.ok
      ? "Team changed"
      : lastActiveTeamAction
        ? lastActiveTeamAction.reason.replaceAll("_", " ")
        : "";
  const stageType = selectedStage?.isBoss ? "Boss" : "Road";

  useEffect(() => {
    const timer = window.setInterval(() => {
      battleSelectedStage();
    }, AUTO_RUN_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [battleSelectedStage]);

  function handleExportSave() {
    const result = exportSave();

    setSaveToolStatus(result.message);

    if (result.ok && result.json) {
      setExportText(result.json);
    }
  }

  function handleImportSave() {
    const result = importSave(importText);

    setSaveToolStatus(
      result.ok || result.errors.length === 0
        ? result.message
        : `${result.message}: ${result.errors.join("; ")}`
    );

    if (result.ok) {
      setImportText("");
      setExportText("");
    }
  }

  function handleResetNewGame() {
    const resetConfirmed = window.confirm(
      "Reset local save and start a new game?"
    );

    if (!resetConfirmed) {
      return;
    }

    const result = resetNewGame();

    setSaveToolStatus(
      result.ok || result.errors.length === 0
        ? result.message
        : `${result.message}: ${result.errors.join("; ")}`
    );
    setExportText("");
    setImportText("");
  }

  function handleTimeTravelOfflineFarm() {
    const result = timeTravelOfflineFarm();

    setSaveToolStatus(
      result.ok || result.errors.length === 0
        ? result.message
        : `${result.message}: ${result.errors.join("; ")}`
    );
    setExportText("");
  }

  return (
    <main className="app-shell">
      <section className="battle-surface">
        <header className="stage-header">
          <div>
            <span className="label">Current Stage</span>
            <h1>{selectedStage?.name ?? "Unknown Stage"}</h1>
          </div>
          <div className="stage-meta">
            <span>{selectedStageRegionName}</span>
            <span>{stageType}</span>
            <span>Stage {selectedStage?.index ?? "-"}</span>
            <span>{enemyTeamLabel}</span>
          </div>
          <div
            className={`battle-result ${battleResultClass}`}
            aria-live="polite"
          >
            {battleStatus}
          </div>
        </header>
        <div className="resource-row">
          <span>Silver {formatNumber(progress.resources.silver)}</span>
          <span>Cultivation {formatNumber(progress.resources.cultivation)}</span>
          <span>Herbs {formatNumber(progress.resources.herbs)}</span>
          <span>Combat Exp {formatNumber(masteryPanel?.combatExperience ?? 0)}</span>
        </div>
        <OfflineSummaryPanel
          onDismiss={dismissOfflineSummary}
          summary={offlineSummary}
        />
        <OfflineFarmPanel
          onSetPreset={setOfflineFarmPreset}
          presets={offlineFarmPresets}
          preview={offlineRewardPreview}
          recommendation={offlineFarmRecommendation}
        />
        <AssignmentPanel
          assignments={assignments}
          onSetAssignment={setAssignmentHeroes}
          status={assignmentStatus}
        />
        <CounterplaySettingsPanel
          onSetAutoMedicineEnabled={setAutoMedicineEnabled}
          onSetMedicineAutoUse={setMedicineAutoUse}
          onSetPreBattleResistanceMode={setPreBattleResistanceMode}
          settings={counterplaySettings}
        />
        <RosterPanel
          activeTeamSize={activeTeamSize}
          heroes={roster}
          onSetActiveTeam={setActiveHeroTeam}
          status={activeTeamStatus}
        />
        <MasteryPanel mastery={masteryPanel} />
        <StageSelectorPanel
          onSelectStage={selectStage}
          stages={stageOptions}
        />
        <FormationPanel
          heroes={playerFormation}
          onSetFormation={setHeroFormation}
        />
        <StyleMasteryPanel
          onSelectBranch={selectStyleBranch}
          status={styleBranchStatus}
          styles={styleMastery}
        />
        <UpgradePanel
          onPurchase={purchaseUpgrade}
          silver={progress.resources.silver}
          status={purchaseStatus}
          upgrades={upgrades}
        />
        <SkillUpgradePanel
          cultivation={progress.resources.cultivation}
          onPurchase={purchaseSkillUpgrade}
          skillUpgrades={skillUpgrades}
          status={skillPurchaseStatus}
        />
        <EquipmentPanel
          heroes={heroEquipment}
          inventory={equipmentInventory}
          onEquip={equipEquipment}
          status={equipmentStatus}
        />
        <div className="battle-grid">
          <TeamPanel title="Disciples" combatants={playerCombatants} />
          <TeamPanel title="Enemy Team" combatants={enemyCombatants} />
        </div>
        <BattleLog events={battleEvents} summary={battleSummary} />
        <SaveToolsPanel
          diagnostics={saveDiagnostics}
          exportText={exportText}
          importText={importText}
          onExport={handleExportSave}
          onImport={handleImportSave}
          onImportTextChange={setImportText}
          onReset={handleResetNewGame}
          onTimeTravelOfflineFarm={handleTimeTravelOfflineFarm}
          status={saveToolStatus}
        />
      </section>
    </main>
  );
}

export function App() {
  return (
    <AppErrorBoundary>
      <GameApp />
    </AppErrorBoundary>
  );
}
