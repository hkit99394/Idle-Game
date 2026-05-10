import type {
  BalanceResultExpectation,
  ClearTimeTargetRange,
  EnemyDefinition,
  RegionDefinition,
  StageRewards,
  StageDefinition
} from "../data";

export type StageClearTimeTargetInput = {
  region: Pick<RegionDefinition, "balanceTargets"> | null | undefined;
  stage: Pick<StageDefinition, "isBoss">;
  enemies: Array<Pick<EnemyDefinition, "type">>;
};

export type BalanceTargetCheckStatus = "pass" | "fail";

export type BalanceTargetCheck = {
  id: string;
  label: string;
  status: BalanceTargetCheckStatus;
  reason: string;
};

export type StageClearTimeAssessmentInput = {
  stageId: string;
  result: BalanceResultExpectation;
  stageCleared: boolean;
  durationSeconds: number;
  target: ClearTimeTargetRange | null;
};

export const defaultClearTimeTargets: NonNullable<
  RegionDefinition["balanceTargets"]
>["clearTimeSeconds"] = {
  normal: {
    min: 5,
    max: 15
  },
  elite: {
    min: 20,
    max: 40
  }
};

export function getStageClearTimeTargetRange(
  input: StageClearTimeTargetInput
): ClearTimeTargetRange | null {
  const clearTimeSeconds =
    input.region?.balanceTargets?.clearTimeSeconds ?? defaultClearTimeTargets;

  if (input.stage.isBoss) {
    return clearTimeSeconds.boss ?? null;
  }

  return input.enemies.some((enemy) => enemy.type === "elite")
    ? clearTimeSeconds.elite
    : clearTimeSeconds.normal;
}

export function isWithinClearTimeTarget(
  clearTimeSeconds: number,
  target: ClearTimeTargetRange
): boolean {
  return clearTimeSeconds >= target.min && clearTimeSeconds <= target.max;
}

export function assessStageClearTimeTarget(
  input: StageClearTimeAssessmentInput
): BalanceTargetCheck {
  if (input.target === null) {
    return {
      id: "clear_time",
      label: "Clear Time",
      status: "pass",
      reason: `${input.stageId} has no configured clear-time target`
    };
  }

  const targetRange = `${formatNumber(input.target.min)}-${formatNumber(
    input.target.max
  )}s`;

  if (input.result !== "player_clear" || !input.stageCleared) {
    return {
      id: "clear_time",
      label: "Clear Time",
      status: "fail",
      reason: `${input.stageId} did not clear before the ${targetRange} target could be evaluated`
    };
  }

  if (input.durationSeconds < input.target.min) {
    return {
      id: "clear_time",
      label: "Clear Time",
      status: "fail",
      reason: `${input.stageId} clear time ${formatNumber(input.durationSeconds)}s is below the ${targetRange} target`
    };
  }

  if (input.durationSeconds > input.target.max) {
    return {
      id: "clear_time",
      label: "Clear Time",
      status: "fail",
      reason: `${input.stageId} clear time ${formatNumber(input.durationSeconds)}s is above the ${targetRange} target`
    };
  }

  return {
    id: "clear_time",
    label: "Clear Time",
    status: "pass",
    reason: `${input.stageId} clear time ${formatNumber(input.durationSeconds)}s is within the ${targetRange} target`
  };
}

export const defaultBossGateCriteria = {
  passSurvivalRatio: 1,
  nearSurvivalRatio: 0.9
} as const;

export const defaultDemonCultBossGateCriteria = {
  preferredClearTimeSeconds: {
    min: 90,
    max: 120
  },
  acceptableClearTimeSeconds: {
    min: 80,
    max: 140
  },
  maxMedicineConsumed: 4,
  maxStatusDamage: 600
} as const;

export const defaultFarmScoreWeights = {
  combatExperience: 4,
  silver: 1,
  cultivation: 1.5,
  herbs: 2
} as const satisfies Record<keyof StageRewards, number>;

export type StageRewardScoreBreakdown = {
  combatExperience: number;
  silver: number;
  cultivation: number;
  herbs: number;
  total: number;
};

export function getStageRewardScoreBreakdown(
  rewards: Pick<
    StageRewards,
    "combatExperience" | "silver" | "cultivation" | "herbs"
  >
): StageRewardScoreBreakdown {
  const breakdown = {
    combatExperience:
      rewards.combatExperience * defaultFarmScoreWeights.combatExperience,
    silver: rewards.silver * defaultFarmScoreWeights.silver,
    cultivation: rewards.cultivation * defaultFarmScoreWeights.cultivation,
    herbs: (rewards.herbs ?? 0) * defaultFarmScoreWeights.herbs
  };

  return {
    ...breakdown,
    total:
      breakdown.combatExperience +
      breakdown.silver +
      breakdown.cultivation +
      breakdown.herbs
  };
}

export function scoreStageRewards(
  rewards: Pick<
    StageRewards,
    "combatExperience" | "silver" | "cultivation" | "herbs"
  >
): number {
  return getStageRewardScoreBreakdown(rewards).total;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}
