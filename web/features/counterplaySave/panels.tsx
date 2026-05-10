import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { OFFLINE_TIME_TRAVEL_SECONDS } from "../../state/constants";
import type { CounterplaySettingsView } from "../../state/viewModels/counterplayTypes";
import type { SaveDiagnosticsView } from "../../state/viewModels/saveDiagnosticsTypes";
import {
  formatDuration,
  formatNumber
} from "../shared/ui";

function formatTimestamp(value: number | null): string {
  if (value === null) {
    return "Not saved";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatSaveStatus(status: SaveDiagnosticsView["status"]): string {
  switch (status) {
    case "ready":
      return "Ready";
    case "missing_save":
      return "Missing save";
    case "invalid_json":
      return "Invalid JSON";
    case "invalid_save":
      return "Invalid save";
    case "storage_error":
      return "Storage error";
    case "storage_unavailable":
      return "Storage unavailable";
  }
}

type CounterplaySettingsPanelProps = {
  onSetAutoMedicineEnabled: (enabled: boolean) => void;
  onSetMedicineAutoUse: (medicineId: string, enabled: boolean) => void;
  onSetPreBattleResistanceMode: (
    mode: CounterplaySettingsView["resistanceMode"]
  ) => void;
  settings: CounterplaySettingsView;
};

export function CounterplaySettingsPanel({
  onSetAutoMedicineEnabled,
  onSetMedicineAutoUse,
  onSetPreBattleResistanceMode,
  settings
}: CounterplaySettingsPanelProps) {
  function handleGlobalChange(event: ChangeEvent<HTMLInputElement>) {
    onSetAutoMedicineEnabled(event.target.checked);
  }

  function handleResistanceModeChange(event: ChangeEvent<HTMLSelectElement>) {
    onSetPreBattleResistanceMode(
      event.target.value as CounterplaySettingsView["resistanceMode"]
    );
  }

  const pressureItems = settings.stagePreview?.statusPressureItems ?? [];
  const recommendationText =
    settings.stagePreview?.recommendationText ??
    "No selected stage counterplay data.";

  return (
    <section
      className="counterplay-settings-panel"
      aria-label="Counterplay settings"
    >
      <div className="counterplay-settings-heading">
        <div>
          <span className="label">Counterplay</span>
          <h2>Medicine Automation</h2>
        </div>
        <span>{settings.unlocked ? settings.globalLabel : "Locked"}</span>
      </div>
      {settings.lockedReason ? (
        <p className="counterplay-lock-message">{settings.lockedReason}</p>
      ) : null}
      <div className="counterplay-settings-grid">
        <label className="counterplay-toggle-row">
          <input
            type="checkbox"
            checked={settings.globalEnabled}
            disabled={!settings.unlocked}
            onChange={handleGlobalChange}
          />
          <span>
            <strong>Auto Medicine</strong>
            <small>{settings.globalLabel}</small>
          </span>
        </label>
        <label className="counterplay-mode-field">
          <span>Resistance Mode</span>
          <select
            value={settings.resistanceMode}
            disabled={!settings.unlocked}
            onChange={handleResistanceModeChange}
          >
            {settings.resistanceModeOptions.map((mode) => (
              <option key={mode.id} value={mode.id}>
                {mode.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="medicine-toggle-list">
        {settings.medicineRows.map((medicine) => (
          <label
            key={medicine.id}
            className={`medicine-toggle-row ${medicine.disabled ? "disabled" : ""}`}
          >
            <input
              type="checkbox"
              checked={medicine.autoUseEnabled}
              disabled={!medicine.canToggle}
              onChange={(event) =>
                onSetMedicineAutoUse(medicine.id, event.target.checked)
              }
            />
            <span>
              <strong>{medicine.name}</strong>
              <small>
                {medicine.availability} · {formatNumber(medicine.count)}/
                {formatNumber(medicine.maxCarry)}
              </small>
            </span>
            <em>{medicine.autoUseLabel}</em>
          </label>
        ))}
      </div>
      <div className="counterplay-preview">
        <div className="status-pressure-list">
          {pressureItems.length > 0 ? (
            pressureItems.map((item) => (
              <span key={item.statusId} className={`status-${item.category}`}>
                {item.label}
              </span>
            ))
          ) : (
            <span>No status pressure</span>
          )}
        </div>
        <p>{recommendationText}</p>
        {settings.stagePreview?.supportContributionText ? (
          <p className="counterplay-support-note">
            {settings.stagePreview.supportContributionText}
          </p>
        ) : null}
      </div>
    </section>
  );
}

type SaveToolsPanelProps = {
  diagnostics: SaveDiagnosticsView;
  exportText: string;
  importText: string;
  onExport: () => void;
  onImport: () => void;
  onImportTextChange: (value: string) => void;
  onReset: () => void;
  onTimeTravelOfflineFarm: () => void;
  status: string;
};

export function SaveToolsPanel({
  diagnostics,
  exportText,
  importText,
  onExport,
  onImport,
  onImportTextChange,
  onReset,
  onTimeTravelOfflineFarm,
  status
}: SaveToolsPanelProps) {
  const [diagnosticsExpanded, setDiagnosticsExpanded] = useState(
    () => diagnostics.errors.length > 0
  );

  useEffect(() => {
    if (diagnostics.errors.length > 0) {
      setDiagnosticsExpanded(true);
    }
  }, [diagnostics.errors.length]);

  function handleImportTextChange(event: ChangeEvent<HTMLTextAreaElement>) {
    onImportTextChange(event.target.value);
  }

  return (
    <section className="save-tools" aria-label="Save tools">
      <div className="save-tools-heading">
        <div>
          <span className="label">Save</span>
          <h2>Save Tools</h2>
        </div>
        <span>{formatSaveStatus(diagnostics.status)}</span>
      </div>
      <details
        className="save-diagnostics-panel"
        open={diagnosticsExpanded}
        onToggle={(event) => setDiagnosticsExpanded(event.currentTarget.open)}
      >
        <summary>Save Diagnostics</summary>
        <div className="save-diagnostics-grid">
          <span>Key</span>
          <strong>{diagnostics.storageKey}</strong>
          <span>Version</span>
          <strong>{diagnostics.saveVersion ?? "-"}</strong>
          <span>Updated</span>
          <strong>{formatTimestamp(diagnostics.updatedAtMs)}</strong>
          <span>Offline checkpoint</span>
          <strong>{formatTimestamp(diagnostics.lastOfflineRewardAtMs)}</strong>
          <span>Current stage</span>
          <strong>{diagnostics.currentStageId}</strong>
          <span>Farm stage</span>
          <strong>{diagnostics.selectedOfflineFarmStageId ?? "-"}</strong>
          <span>Farm preset</span>
          <strong>{diagnostics.offlineFarmPreset}</strong>
          <span>Highest clear</span>
          <strong>{formatNumber(diagnostics.highestClearedStageIndex)}</strong>
          <span>Save size</span>
          <strong>{formatNumber(diagnostics.saveSizeCharacters)} chars</strong>
          <span>Autosave</span>
          <strong>{formatDuration(diagnostics.autosaveIntervalMs / 1000)}</strong>
        </div>
        {diagnostics.errors.length > 0 ? (
          <div className="save-errors">
            {diagnostics.errors.map((error) => (
              <span key={error}>{error}</span>
            ))}
          </div>
        ) : null}
      </details>
      <div className="save-actions">
        <button
          type="button"
          disabled={!diagnostics.storageAvailable}
          onClick={onExport}
        >
          Export Save
        </button>
        <button
          type="button"
          disabled={!diagnostics.storageAvailable || !importText.trim()}
          onClick={onImport}
        >
          Import Save
        </button>
        <button
          type="button"
          disabled={
            !diagnostics.storageAvailable ||
            !diagnostics.selectedOfflineFarmStageId
          }
          onClick={onTimeTravelOfflineFarm}
        >
          Simulate {formatDuration(OFFLINE_TIME_TRAVEL_SECONDS)} Away
        </button>
        <button
          type="button"
          className="danger"
          onClick={onReset}
        >
          Reset New Game
        </button>
      </div>
      <div className="save-text-grid">
        <label>
          <span>Export JSON</span>
          <textarea readOnly value={exportText} />
        </label>
        <label>
          <span>Import JSON</span>
          <textarea value={importText} onChange={handleImportTextChange} />
        </label>
      </div>
      {status ? <div className="save-status">{status}</div> : null}
    </section>
  );
}
