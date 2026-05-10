import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildSaveDiagnostics,
  getWebGameViewModel
} from "../../web/state/gameState";
import { staticData } from "../helpers/staticData";
import {
  createWebWorkflowBaselineState,
  webUiModuleInventory,
  webWorkflowBaselineIds
} from "../helpers/webWorkflowBaselines";

function parseInventoryDocRows(
  markdown: string
): Array<{ feature: string; files: string[]; workflows: string[] }> {
  return markdown
    .split("\n")
    .filter((line) => line.startsWith("| ") && !line.includes("---"))
    .slice(1)
    .map((line) => {
      const cells = line
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim());
      const [feature, filesCell, workflowsCell] = cells;

      return {
        feature,
        files: [...filesCell.matchAll(/`([^`]+)`/g)].map((match) => match[1]),
        workflows: workflowsCell
          .split(",")
          .map((workflow) => workflow.trim().toLowerCase().replaceAll("-", " "))
      };
    });
}

describe("web workflow baselines", () => {
  it("covers the current feature panel domains from one reusable state", () => {
    const state = createWebWorkflowBaselineState(staticData);
    const viewModel = getWebGameViewModel(staticData, state);
    const saveDiagnostics = buildSaveDiagnostics(staticData, state);

    expect(viewModel.selectedStage?.id).toBe(webWorkflowBaselineIds.stageId);
    expect(viewModel.stageOptions.find((stage) => stage.isSelectedStage))
      .toMatchObject({
        id: webWorkflowBaselineIds.stageId,
        isUnlocked: true,
        canSelectStage: true
      });
    expect(viewModel.lastBattle?.ok).toBe(true);
    expect(viewModel.lastBattleStage?.id).toBe(webWorkflowBaselineIds.stageId);
    expect(viewModel.battleEvents.length).toBeGreaterThan(0);
    expect(viewModel.battleEvents[0]).toMatchObject({
      id: expect.any(String),
      category: "attack",
      timeLabel: expect.any(String),
      headline: expect.stringContaining("attacks")
    });
    expect(viewModel.battleSummary?.title).toContain("Victory");
    expect(viewModel.playerCombatants.length).toBeGreaterThan(0);
    expect(viewModel.enemyCombatants.length).toBeGreaterThan(0);
    expect(viewModel.playerFormation.map((hero) => hero.heroId)).toContain(
      webWorkflowBaselineIds.heroId
    );

    expect(viewModel.offlineSummary).toMatchObject({
      stageId: webWorkflowBaselineIds.offlineSummaryStageId,
      stageName: "Bamboo Road 3",
      clears: 36,
      assignmentSilver: 24
    });
    expect(viewModel.offlineFarmRecommendation.stageId).toBe(
      webWorkflowBaselineIds.stageId
    );
    expect(viewModel.offlineRewardPreview).toMatchObject({
      ok: true,
      stageName: "Bamboo Road 3"
    });

    expect(viewModel.heroEquipment[0].slots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          equipmentId: webWorkflowBaselineIds.equipmentId,
          slot: "weapon"
        })
      ])
    );
    expect(
      viewModel.assignments.find(
        (assignment) =>
          assignment.assignmentId === webWorkflowBaselineIds.assignmentId
      )
    ).toMatchObject({
      assignedHeroIds: [webWorkflowBaselineIds.heroId]
    });
    expect(viewModel.upgrades.length).toBeGreaterThan(0);
    expect(viewModel.skillUpgrades.length).toBeGreaterThan(0);
    expect(viewModel.masteryPanel).toMatchObject({
      regionId: "bamboo_road",
      combatExperience: 108
    });
    expect(viewModel.roster.find((hero) => hero.heroId === webWorkflowBaselineIds.heroId))
      .toMatchObject({
        active: true,
        unlocked: true
      });
    expect(viewModel.counterplaySettings).toMatchObject({
      unlocked: true,
      resistanceMode: "status_heavy",
      resistanceModeLabel: "Status Heavy"
    });
    expect(
      viewModel.counterplaySettings.medicineRows.find(
        (medicine) => medicine.id === webWorkflowBaselineIds.medicineId
      )
    ).toMatchObject({
      disabled: true,
      autoUseEnabled: false,
      canToggle: true
    });
    expect(saveDiagnostics).toMatchObject({
      storageAvailable: false,
      status: "storage_unavailable",
      currentStageId: expect.any(String),
      selectedOfflineFarmStageId:
        webWorkflowBaselineIds.offlineSummaryStageId
    });
  });

  it("tracks current UI module ownership for Stage 1.9 moves", () => {
    const inventoryDoc = readFileSync(
      "docs/stage-1.9-ui-inventory.md",
      "utf8"
    );
    const inventoryRows = parseInventoryDocRows(inventoryDoc);

    expect(webUiModuleInventory.map((entry) => entry.feature)).toEqual([
      "app_shell",
      "battle",
      "map_idle",
      "roster_formation",
      "equipment_assignments",
      "growth_mastery",
      "counterplay_save",
      "shared_ui"
    ]);
    expect(inventoryRows).toHaveLength(webUiModuleInventory.length);

    webUiModuleInventory.forEach((entry, index) => {
      const inventoryRow = inventoryRows[index];

      expect(entry.files.length, entry.feature).toBeGreaterThan(0);
      expect(entry.workflows.length, entry.feature).toBeGreaterThan(0);
      expect(inventoryRow.feature).toBe(entry.label);
      expect(inventoryRow.files).toEqual([...entry.files]);
      expect(inventoryRow.workflows).toEqual(
        entry.workflows.map((workflow) => workflow.replaceAll("_", " "))
      );

      for (const file of entry.files) {
        expect(existsSync(file), `${entry.feature}: ${file}`).toBe(true);
      }
    });
  });
});
