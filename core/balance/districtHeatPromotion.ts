export type DistrictHeatPromotionPosture = "report_only";

export type DistrictHeatPromotionGateStatus = "pass" | "watch" | "blocker";

export type DistrictHeatPromotionGateId =
  | "report_projection"
  | "offline_parity"
  | "redline_budget"
  | "known_debt"
  | "save_ui_export_boundaries";

export type DistrictHeatPromotionGate = {
  id: DistrictHeatPromotionGateId;
  label: string;
  status: DistrictHeatPromotionGateStatus;
  reason: string;
  affectedRegionIds: string[];
  affectedStageIds: string[];
};

export type DistrictHeatPromotionDecision = {
  posture: DistrictHeatPromotionPosture;
  summary: string;
  nextAction: string;
  gates: DistrictHeatPromotionGate[];
  boundaries: {
    save: "no_persistence";
    cloud: "no_heat_fields";
    webUi: "no_player_facing_heat";
    compactExport: "no_heat_fields";
    tacticExport: "no_heat_fields";
    liveRewards: "unchanged";
  };
};

type DistrictHeatPromotionRegionInput = {
  regionId: string;
  regionName: string;
  districtHeatProjection?: unknown;
  offlineParity: {
    stageId: string | null;
    classification: "acceptable" | "watch" | "inversion";
    status: string;
    offlineToActiveRatio: number | null;
  };
  budgetChecks: Array<{
    id: string;
    label: string;
    status: "pass" | "fail";
    reason: string;
  }>;
};

function formatRegionList(regions: DistrictHeatPromotionRegionInput[]): string {
  return regions.map((region) => region.regionName).join(", ");
}

function buildGate(
  gate: Omit<DistrictHeatPromotionGate, "affectedRegionIds" | "affectedStageIds">,
  affectedRegionIds: string[] = [],
  affectedStageIds: string[] = []
): DistrictHeatPromotionGate {
  return {
    ...gate,
    affectedRegionIds,
    affectedStageIds
  };
}

export function buildDistrictHeatPromotionDecision(
  regions: DistrictHeatPromotionRegionInput[]
): DistrictHeatPromotionDecision {
  const regionsMissingProjection = regions.filter(
    (region) => region.districtHeatProjection === undefined
  );
  const parityInversions = regions.filter(
    (region) => region.offlineParity.classification === "inversion"
  );
  const redline = regions.find((region) => region.regionId === "redline_outpost");
  const redlineFailures =
    redline?.budgetChecks.filter((check) => check.status === "fail") ?? [];
  const visibleDebt = regions.flatMap((region) =>
    region.budgetChecks
      .filter((check) => check.status === "fail")
      .map((check) => ({
        region,
        check
      }))
  );
  const visibleDebtStageIds = visibleDebt
    .map(({ check }) =>
      check.reason.match(/`([^`]+)`/)?.[1] ??
      check.reason.match(/\b[a-z0-9]+(?:_[a-z0-9]+)+_\d+\b/)?.[0]
    )
    .filter((stageId): stageId is string => stageId !== undefined);
  const gates = [
    buildGate(
      {
        id: "report_projection",
        label: "Report projection",
        status: regionsMissingProjection.length === 0 ? "pass" : "blocker",
        reason:
          regionsMissingProjection.length === 0
            ? "Every region has report-only District Heat projection evidence."
            : `Missing projection evidence for ${formatRegionList(regionsMissingProjection)}.`
      },
      regionsMissingProjection.map((region) => region.regionId)
    ),
    buildGate(
      {
        id: "offline_parity",
        label: "Offline parity",
        status: parityInversions.length === 0 ? "pass" : "blocker",
        reason:
          parityInversions.length === 0
            ? "No recommended farm route is classified as an offline/active inversion."
            : `${parityInversions.length} recommended farm routes are still offline/active inversions: ${formatRegionList(parityInversions)}.`
      },
      parityInversions.map((region) => region.regionId),
      parityInversions
        .map((region) => region.offlineParity.stageId)
        .filter((stageId): stageId is string => stageId !== null)
    ),
    buildGate(
      {
        id: "redline_budget",
        label: "Redline default gates",
        status: redlineFailures.length === 0 ? "pass" : "blocker",
        reason:
          redlineFailures.length === 0
            ? "Redline default clear-time, status-pressure, reward-curve, and boss gates pass after Slice 98.5."
            : `Redline still has ${redlineFailures.length} failed budget checks.`
      },
      redlineFailures.length === 0 ? [] : ["redline_outpost"]
    ),
    buildGate(
      {
        id: "known_debt",
        label: "Known balance debt",
        status: visibleDebt.length === 0 ? "pass" : "watch",
        reason:
          visibleDebt.length === 0
            ? "No failed region budget checks remain visible in the simulator."
            : `${visibleDebt.length} failed region budget checks remain visible and must not be masked by live heat pressure.`
      },
      [...new Set(visibleDebt.map(({ region }) => region.regionId))],
      [...new Set(visibleDebtStageIds)]
    ),
    buildGate({
      id: "save_ui_export_boundaries",
      label: "Save, UI, and export boundaries",
      status: "pass",
      reason:
        "The selected posture keeps heat out of saves, cloud envelopes, live web UI, compact exports, tactic exports, and live rewards."
    })
  ];

  return {
    posture: "report_only",
    summary:
      parityInversions.length > 0
        ? "Keep District Heat report-only because offline reward parity still has inversion risk even though Redline default gates now pass."
        : visibleDebt.length > 0
          ? "Keep District Heat report-only because visible balance debt still needs a current disposition before live heat changes rewards or risk."
          : "Keep District Heat report-only after Stage 3.4; the promotion gates now pass, and the warning contract now requires stronger guard rails before player-facing heat copy ships.",
    nextAction:
      parityInversions.length > 0 || visibleDebt.length > 0
        ? "Resolve offline parity and visible balance debt first, or open a separate non-punitive warning contract before any live heat UI or reward behavior."
        : "Open a dedicated route-card warning prototype slice if player-facing copy is desired; amend the web-source guard with an explicit allowlist, and keep rewards, route risk, saves, cloud payloads, and stable exports unchanged.",
    gates,
    boundaries: {
      save: "no_persistence",
      cloud: "no_heat_fields",
      webUi: "no_player_facing_heat",
      compactExport: "no_heat_fields",
      tacticExport: "no_heat_fields",
      liveRewards: "unchanged"
    }
  };
}
