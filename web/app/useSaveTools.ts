import { useState } from "react";
import type { SaveToolResult } from "../state/gameState";

type ConfirmReset = (message: string) => boolean;

type UseSaveToolsInput = {
  confirmReset?: ConfirmReset;
  exportSave: () => SaveToolResult;
  importSave: (rawSaveText: string) => SaveToolResult;
  resetNewGame: () => SaveToolResult;
  timeTravelOfflineFarm: () => SaveToolResult;
};

function confirmResetWithBrowser(message: string): boolean {
  return window.confirm(message);
}

export function formatSaveToolStatus(result: SaveToolResult): string {
  if (result.ok) {
    return result.message;
  }

  if (result.errors.length === 0) {
    return result.message;
  }

  return `${result.message}: ${result.errors.join("; ")}`;
}

export function useSaveTools({
  confirmReset = confirmResetWithBrowser,
  exportSave,
  importSave,
  resetNewGame,
  timeTravelOfflineFarm
}: UseSaveToolsInput) {
  const [exportText, setExportText] = useState("");
  const [importText, setImportText] = useState("");
  const [saveToolStatus, setSaveToolStatus] = useState("");

  function handleExportSave() {
    const result = exportSave();

    setSaveToolStatus(result.message);

    if (result.ok && result.json) {
      setExportText(result.json);
    }
  }

  function handleImportSave() {
    const result = importSave(importText);

    setSaveToolStatus(formatSaveToolStatus(result));

    if (result.ok) {
      setImportText("");
      setExportText("");
    }
  }

  function handleResetNewGame() {
    const resetConfirmed = confirmReset("Reset local save and start a new game?");

    if (!resetConfirmed) {
      return;
    }

    const result = resetNewGame();

    setSaveToolStatus(formatSaveToolStatus(result));
    setExportText("");
    setImportText("");
  }

  function handleTimeTravelOfflineFarm() {
    const result = timeTravelOfflineFarm();

    setSaveToolStatus(formatSaveToolStatus(result));
    setExportText("");
  }

  return {
    exportText,
    handleExportSave,
    handleImportSave,
    handleResetNewGame,
    handleTimeTravelOfflineFarm,
    importText,
    saveToolStatus,
    setImportText
  };
}

export type SaveToolControls = ReturnType<typeof useSaveTools>;
