import { describe, expect, it } from "vitest";
import { getWebGameViewModel } from "../../web/state/gameState";
import { buildWebGameViewModel } from "../../web/state/viewModels/webGameViewModel";
import {
  createWebWorkflowBaselineState,
  webWorkflowBaselineIds
} from "../helpers/webWorkflowBaselines";
import { staticData } from "../helpers/staticData";

describe("web game view-model assembler", () => {
  it("keeps the public view-model barrel aligned with feature assembly", () => {
    const state = createWebWorkflowBaselineState(staticData);
    const publicViewModel = getWebGameViewModel(staticData, state);
    const featureViewModel = buildWebGameViewModel(staticData, state);

    expect(featureViewModel).toEqual(publicViewModel);
    expect(featureViewModel.stageOptions.some((stage) => stage.isSelectedStage)).toBe(
      true
    );
    expect(featureViewModel.battleEvents.length).toBeGreaterThan(0);
    expect(featureViewModel.offlineSummary?.stageId).toBe(
      webWorkflowBaselineIds.offlineSummaryStageId
    );
    expect(
      featureViewModel.equipmentInventory.some(
        (item) => item.equipmentId === webWorkflowBaselineIds.equipmentId
      )
    ).toBe(true);
    expect(featureViewModel.counterplaySettings.resistanceMode).toBe(
      "status_heavy"
    );
  });
});
