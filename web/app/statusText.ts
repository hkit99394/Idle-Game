import {
  getBattleResultClass,
  getBattleResultText
} from "../statusPresentation";
import { displayTerms, formatResourceLabel } from "../displayTerms";
import type { WebGameViewModel } from "../state/gameState";

export type AppStatusText = {
  activeTeamStatus: string;
  assignmentStatus: string;
  battleResultClass: string;
  battleStatus: string;
  equipmentStatus: string;
  purchaseStatus: string;
  skillPurchaseStatus: string;
  stageType: string;
  styleBranchStatus: string;
};

export function formatActionReason(reason: string): string {
  return reason.replaceAll("_", " ");
}

export function buildAppStatusText(
  viewModel: WebGameViewModel
): AppStatusText {
  const resultStageName =
    viewModel.lastBattleStage?.name ??
    viewModel.selectedStage?.name ??
    `Unknown ${displayTerms.progression.route}`;

  return {
    activeTeamStatus: viewModel.lastActiveTeamAction?.ok
      ? "Team changed"
      : viewModel.lastActiveTeamAction
        ? formatActionReason(viewModel.lastActiveTeamAction.reason)
        : "",
    assignmentStatus: viewModel.lastAssignmentAction?.ok
      ? "Assignment changed"
      : viewModel.lastAssignmentAction
        ? formatActionReason(viewModel.lastAssignmentAction.reason)
        : "",
    battleResultClass: getBattleResultClass(viewModel.lastBattle),
    battleStatus: getBattleResultText(viewModel.lastBattle, resultStageName),
    equipmentStatus: viewModel.lastEquipmentAction?.ok
      ? "Equipment changed"
      : viewModel.lastEquipmentAction
        ? formatActionReason(viewModel.lastEquipmentAction.reason)
        : "",
    purchaseStatus: viewModel.lastPurchase?.ok
      ? `Art level ${viewModel.lastPurchase.newLevel}`
      : viewModel.lastPurchase
        ? `Need ${formatResourceLabel("silver")}`
        : "",
    skillPurchaseStatus: viewModel.lastSkillPurchase?.ok
      ? `Skill refinement ${viewModel.lastSkillPurchase.newLevel}`
      : viewModel.lastSkillPurchase
        ? `Need ${formatResourceLabel("cultivation")}`
        : "",
    stageType: viewModel.selectedStage?.isBoss
      ? "Boss"
      : displayTerms.progression.route,
    styleBranchStatus: viewModel.lastStyleBranchAction?.ok
      ? viewModel.lastStyleBranchAction.branchId
        ? "Branch selected"
        : "Branch cleared"
      : viewModel.lastStyleBranchAction
        ? formatActionReason(viewModel.lastStyleBranchAction.reason)
        : ""
  };
}
