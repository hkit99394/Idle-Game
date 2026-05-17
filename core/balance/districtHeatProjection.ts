export type DistrictHeatActivityType =
  | "active_clear"
  | "offline_farm"
  | "boss_attempt"
  | "assignment";

export type DistrictHeatBand = "cool" | "watched" | "hot" | "lockdown";

export type DistrictHeatProjectionInput = {
  affectedDistrictId: string;
  affectedRouteId?: string | null;
  activityType: DistrictHeatActivityType;
  activityCount: number;
  elapsedSeconds: number;
  clearTimeSeconds?: number | null;
  inactiveSeconds?: number;
};

export type DistrictHeatProjection = {
  affectedDistrictId: string;
  affectedRouteId: string | null;
  activityType: DistrictHeatActivityType;
  activityCount: number;
  elapsedSeconds: number;
  clearTimeSeconds: number | null;
  projectedHeat: number;
  heatBand: DistrictHeatBand;
  gainReason:
    | "active_clear"
    | "active_clear_repetition"
    | "offline_farm"
    | "offline_farm_repetition"
    | "boss_attempt"
    | "assignment"
    | "no_activity";
  decayReason: "inactive_decay" | "no_decay_active_window";
};

export const DISTRICT_HEAT_MAX = 100;
export const DISTRICT_HEAT_REPETITION_THRESHOLD = 20;
export const DISTRICT_HEAT_REPORT_WINDOW_SECONDS = 60 * 60;

const DISTRICT_HEAT_DECAY_PER_INACTIVE_HOUR = 10;
const DISTRICT_HEAT_REPETITION_GAIN_MULTIPLIER = 1.25;

function getActivityGain(activityType: DistrictHeatActivityType): number {
  switch (activityType) {
    case "active_clear":
      return 1;
    case "offline_farm":
      return 0.75;
    case "boss_attempt":
      return 3;
    case "assignment":
      return 0.5;
  }
}

function getHeatBand(projectedHeat: number): DistrictHeatBand {
  if (projectedHeat < 20) {
    return "cool";
  }

  if (projectedHeat < 50) {
    return "watched";
  }

  if (projectedHeat < 80) {
    return "hot";
  }

  return "lockdown";
}

function roundHeat(value: number): number {
  return Number(value.toFixed(2));
}

function clampHeat(value: number): number {
  return Math.min(DISTRICT_HEAT_MAX, Math.max(0, value));
}

function getNormalizedCount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function getNormalizedDuration(value: number | null | undefined): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, value);
}

function isRepeatedRouteActivity(activityType: DistrictHeatActivityType): boolean {
  return activityType === "active_clear" || activityType === "offline_farm";
}

function getGainReason(
  activityType: DistrictHeatActivityType,
  activityCount: number,
  hasRepetitionBonus: boolean
): DistrictHeatProjection["gainReason"] {
  if (activityCount === 0) {
    return "no_activity";
  }

  if (hasRepetitionBonus) {
    return activityType === "active_clear"
      ? "active_clear_repetition"
      : "offline_farm_repetition";
  }

  return activityType;
}

export function projectDistrictHeat(
  input: DistrictHeatProjectionInput
): DistrictHeatProjection {
  const activityCount = getNormalizedCount(input.activityCount);
  const elapsedSeconds = getNormalizedDuration(input.elapsedSeconds) ?? 0;
  const clearTimeSeconds = getNormalizedDuration(input.clearTimeSeconds);
  const baseGain = getActivityGain(input.activityType);
  const hasRepetitionBonus =
    isRepeatedRouteActivity(input.activityType) &&
    input.affectedRouteId !== null &&
    input.affectedRouteId !== undefined &&
    activityCount > DISTRICT_HEAT_REPETITION_THRESHOLD;
  const baseCount = hasRepetitionBonus
    ? DISTRICT_HEAT_REPETITION_THRESHOLD
    : activityCount;
  const repeatedCount = hasRepetitionBonus
    ? activityCount - DISTRICT_HEAT_REPETITION_THRESHOLD
    : 0;
  const gain =
    baseCount * baseGain +
    repeatedCount * baseGain * DISTRICT_HEAT_REPETITION_GAIN_MULTIPLIER;
  const inactiveSeconds =
    input.inactiveSeconds !== undefined && Number.isFinite(input.inactiveSeconds)
      ? Math.max(0, input.inactiveSeconds)
      : 0;
  const decay =
    (inactiveSeconds / DISTRICT_HEAT_REPORT_WINDOW_SECONDS) *
    DISTRICT_HEAT_DECAY_PER_INACTIVE_HOUR;
  const projectedHeat = roundHeat(clampHeat(gain - decay));

  return {
    affectedDistrictId: input.affectedDistrictId,
    affectedRouteId: input.affectedRouteId ?? null,
    activityType: input.activityType,
    activityCount,
    elapsedSeconds,
    clearTimeSeconds:
      clearTimeSeconds === null ? null : roundHeat(clearTimeSeconds),
    projectedHeat,
    heatBand: getHeatBand(projectedHeat),
    gainReason: getGainReason(
      input.activityType,
      activityCount,
      hasRepetitionBonus
    ),
    decayReason:
      inactiveSeconds > 0 ? "inactive_decay" : "no_decay_active_window"
  };
}
