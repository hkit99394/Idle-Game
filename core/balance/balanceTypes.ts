import type { BaseStats } from "../combat";
import type { ClearTimeTargetRange, StageDefinition } from "../data";
import type { StageRewardScoreBreakdown } from "./targets";

export type BalanceResult = "player_clear" | "enemy_hold";
export type BalanceScenarioId =
  | "baseline"
  | "resistance"
  | "medicine"
  | "combined";
export type BalanceAssessmentRating =
  | "too_fast"
  | "target"
  | "too_slow"
  | "impossible";
export type BalanceGateRating = "pass" | "near" | "fail";

export type BalanceScenarioPreset = {
  id: BalanceScenarioId;
  name: string;
  description: string;
  playerStatMultipliers: Partial<Record<keyof BaseStats, number>>;
  statusResistanceBonus: number;
  useResistanceMedicine: boolean;
  useCleanseMedicine: boolean;
};

export type StageStatusMetrics = {
  attempts: number;
  applications: number;
  resisted: number;
  averageApplicationChance: number;
  expectedDurationSeconds: number;
  averageDurationSeconds: number;
  averageTickDamage: number;
  reducedTickDamage: number;
  cleanses: number;
  medicineConsumed: number;
  expectedDamage: number;
  healingDenied: number;
  statusIds: string[];
};

export type StageBalanceAssessment = {
  rating: BalanceAssessmentRating;
  reasons: string[];
  clearTimeRangeSeconds: ClearTimeTargetRange | null;
};

export type StageBalanceReport = {
  scenarioId: BalanceScenarioId;
  stageId: string;
  regionId: string;
  index: number;
  name: string;
  enemyTeamIds: string[];
  result: BalanceResult;
  isBoss: boolean;
  canFarmOffline: boolean;
  estimatedClearTimeSeconds: number;
  estimatedSurvivalSeconds: number;
  playerDps: number;
  enemyDps: number;
  qiBreakPressure: number;
  rewards: StageDefinition["rewards"];
  statusMetrics: StageStatusMetrics;
  balanceAssessment: StageBalanceAssessment;
};

export type RegionBalanceReport = {
  scenarioId: BalanceScenarioId;
  regionId: string;
  name: string;
  stages: StageBalanceReport[];
  farmRecommendation: {
    stageId: string;
    score: number;
    scoreBreakdown: StageRewardScoreBreakdown;
    reason: string;
  } | null;
  bossGate: {
    stageId: string;
    scenarioId: BalanceScenarioId;
    result: BalanceResult;
    rating: BalanceGateRating;
    survivalRatio: number;
    criteria: {
      passSurvivalRatio: number;
      nearSurvivalRatio: number;
    };
    failureReason: string | null;
  } | null;
};

export type BalanceReportTotals = {
  stages: number;
  playerClears: number;
  enemyHolds: number;
  statusApplications: number;
  statusDurationSeconds: number;
  statusDamage: number;
  reducedTickDamage: number;
  cleanses: number;
  medicineConsumed: number;
  tooFastStages: number;
  tooSlowStages: number;
  impossibleStages: number;
};

export type BalanceScenarioReport = {
  scenarioId: BalanceScenarioId;
  name: string;
  description: string;
  regions: RegionBalanceReport[];
  totals: BalanceReportTotals;
};

export type DemonCultBossGateReport = {
  stageId: string;
  baselineScenarioId: BalanceScenarioId;
  intendedScenarioId: BalanceScenarioId;
  baselineResult: BalanceResult;
  intendedResult: BalanceResult;
  intendedRating: BalanceGateRating;
  survivalRatio: number;
  estimatedClearTimeSeconds: number;
  statusDamage: number;
  medicineConsumed: number;
  pass: boolean;
  criteria: {
    baselineMustHold: true;
    intendedPassSurvivalRatio: number;
    intendedNearSurvivalRatio: number;
    preferredClearTimeSeconds: {
      min: number;
      max: number;
    };
    acceptableClearTimeSeconds: {
      min: number;
      max: number;
    };
    maxMedicineConsumed: number;
    maxStatusDamage: number;
  };
  reasons: string[];
  failureReason: string | null;
};

export type BalanceReport = {
  scenarios: BalanceScenarioReport[];
  regions: RegionBalanceReport[];
  totals: BalanceReportTotals;
  demonCultBossGate: DemonCultBossGateReport | null;
};

export const defaultBalanceScenarioPresets: BalanceScenarioPreset[] = [
  {
    id: "baseline",
    name: "Baseline",
    description: "Boss-ready team without special status counterplay.",
    playerStatMultipliers: {
      maxOuterHp: 2,
      maxInnerQi: 1.4,
      outerAttack: 4,
      innerAttack: 4,
      outerDefense: 1.3,
      innerDefense: 1.3
    },
    statusResistanceBonus: 0,
    useResistanceMedicine: false,
    useCleanseMedicine: false
  },
  {
    id: "resistance",
    name: "Resistance",
    description: "Boss-ready team with resistance training and manuals.",
    playerStatMultipliers: {
      maxOuterHp: 2,
      maxInnerQi: 1.4,
      outerAttack: 4,
      innerAttack: 4,
      outerDefense: 1.3,
      innerDefense: 1.3
    },
    statusResistanceBonus: 0.22,
    useResistanceMedicine: false,
    useCleanseMedicine: false
  },
  {
    id: "medicine",
    name: "Medicine",
    description: "Boss-ready team using automatic resistance and cleanse medicine.",
    playerStatMultipliers: {
      maxOuterHp: 2,
      maxInnerQi: 1.4,
      outerAttack: 4,
      innerAttack: 4,
      outerDefense: 1.3,
      innerDefense: 1.3
    },
    statusResistanceBonus: 0,
    useResistanceMedicine: true,
    useCleanseMedicine: true
  },
  {
    id: "combined",
    name: "Combined",
    description: "Intended Demon Cult route with resistance training and medicine.",
    playerStatMultipliers: {
      maxOuterHp: 2,
      maxInnerQi: 1.4,
      outerAttack: 4,
      innerAttack: 4,
      outerDefense: 1.3,
      innerDefense: 1.3
    },
    statusResistanceBonus: 0.22,
    useResistanceMedicine: true,
    useCleanseMedicine: true
  }
];
