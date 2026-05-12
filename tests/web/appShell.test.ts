import { describe, expect, it } from "vitest";
import { appFeaturePanelOrder } from "../../web/app/AppPanels";
import {
  buildAppStatusText,
  formatActionReason
} from "../../web/app/statusText";
import { formatSaveToolStatus } from "../../web/app/useSaveTools";
import { getWebGameViewModel } from "../../web/state/gameState";
import type { SaveToolResult } from "../../web/state/gameState";
import { staticData } from "../helpers/staticData";
import { createWebWorkflowBaselineState } from "../helpers/webWorkflowBaselines";

describe("app shell helpers", () => {
  it("keeps the feature panel composition order explicit", () => {
    expect(appFeaturePanelOrder).toEqual([
      "offline_summary",
      "offline_farm",
      "assignments",
      "counterplay_settings",
      "roster",
      "mastery",
      "stage_selector",
      "formation",
      "tactics",
      "style_mastery",
      "upgrades",
      "skill_upgrades",
      "equipment",
      "battle_teams",
      "battle_log",
      "save_tools"
    ]);
  });

  it("derives shell status labels from the web view model", () => {
    const state = createWebWorkflowBaselineState(staticData);
    const viewModel = getWebGameViewModel(staticData, state);
    const statusText = buildAppStatusText(viewModel);

    expect(statusText).toMatchObject({
      activeTeamStatus: "",
      assignmentStatus: "",
      battleResultClass: "victory",
      battleStatus: "Victory - Bamboo Road 5 cleared",
      equipmentStatus: "",
      purchaseStatus: "",
      skillPurchaseStatus: "",
      stageType: "Route",
      styleBranchStatus: ""
    });
  });

  it("keeps transient action label wording stable", () => {
    const state = createWebWorkflowBaselineState(staticData);
    const viewModel = getWebGameViewModel(staticData, state);
    const statusText = buildAppStatusText({
      ...viewModel,
      lastActiveTeamAction: {
        ok: false,
        progress: viewModel.progress,
        reason: "locked_hero"
      } as typeof viewModel.lastActiveTeamAction,
      lastAssignmentAction: {
        ok: true
      } as typeof viewModel.lastAssignmentAction,
      lastEquipmentAction: {
        ok: false,
        progress: viewModel.progress,
        reason: "incompatible_style"
      } as typeof viewModel.lastEquipmentAction,
      lastPurchase: {
        ok: false
      } as typeof viewModel.lastPurchase,
      lastSkillPurchase: {
        ok: false
      } as typeof viewModel.lastSkillPurchase,
      lastStyleBranchAction: {
        ok: true,
        branchId: "iron_body"
      } as typeof viewModel.lastStyleBranchAction
    });

    expect(statusText).toMatchObject({
      activeTeamStatus: "locked hero",
      assignmentStatus: "Assignment changed",
      equipmentStatus: "incompatible style",
      purchaseStatus: "Need Credits",
      skillPurchaseStatus: "Need Resonance",
      styleBranchStatus: "Branch selected"
    });
  });

  it("formats action reasons and save tool errors without React state", () => {
    const result: SaveToolResult = {
      ok: false,
      message: "Invalid save",
      errors: ["Missing progress", "Unknown hero"]
    };

    expect(formatActionReason("hero_already_assigned")).toBe(
      "hero already assigned"
    );
    expect(formatSaveToolStatus(result)).toBe(
      "Invalid save: Missing progress; Unknown hero"
    );
    expect(
      formatSaveToolStatus({
        ok: true,
        message: "Save imported"
      })
    ).toBe("Save imported");
  });
});
