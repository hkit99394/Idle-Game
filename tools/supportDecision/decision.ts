import {
  buildBalanceReport,
  defaultBalanceScenarioPresets
} from "../../core/core-balance";
import type {
  BalanceGateRating,
  BalanceReport,
  BalanceScenarioPreset
} from "../../core/core-balance";
import { calculateEffectiveStatusResistance, type BaseStats } from "../../core/combat";
import type { HeroDefinition, StaticGameData } from "../../core/data";

export type SupportIdentityOptionId =
  | "lotus_support"
  | "new_support_hero"
  | "temporary_manual";

export type SupportIdentityOptionReport = {
  optionId: SupportIdentityOptionId;
  label: string;
  summary: string;
  productionRosterChangeRequired: boolean;
  prototypeNotes: string[];
  supportContribution: {
    label: string;
    statusResistanceBonus: number;
    estimatedCpContribution: number;
    summary: string;
  } | null;
  estimatedTeamCp: number;
  demonCultBoss: {
    stageId: string;
    result: "player_clear" | "enemy_hold";
    rating: BalanceGateRating;
    survivalRatio: number;
    estimatedClearTimeSeconds: number;
    estimatedSurvivalSeconds: number;
    medicineConsumed: number;
    statusDamage: number;
    statusDurationSeconds: number;
  };
};

export type SupportIdentityDecisionReport = {
  selectedOptionId: SupportIdentityOptionId;
  decision: string;
  rationale: string[];
  defaultCombinedGate: {
    rating: BalanceGateRating;
    survivalRatio: number;
    medicineConsumed: number;
    statusDamage: number;
    statusDurationSeconds: number;
  };
  options: SupportIdentityOptionReport[];
  rejectedAlternatives: Array<{
    optionId: Exclude<SupportIdentityOptionId, "lotus_support">;
    reason: string;
  }>;
  stageOnePointSixRecommendation: {
    direction: string;
    backlogHooks: string[];
  };
};

export type StaticDataForSupportDecision = Pick<
  StaticGameData,
  | "heroes"
  | "enemies"
  | "skills"
  | "regions"
  | "stages"
  | "statusEffects"
  | "medicines"
>;

export type SupportIdentityOptionInput = {
  optionId: SupportIdentityOptionId;
  label: string;
  summary: string;
  productionRosterChangeRequired: boolean;
  prototypeNotes: string[];
  data: StaticDataForSupportDecision;
  supportSourceLabel?: string;
  supportResistanceBonus?: number;
  scenarios?: BalanceScenarioPreset[];
};

export function buildSupportIdentityDecisionReport(
  data: StaticDataForSupportDecision,
  optionInputs: SupportIdentityOptionInput[]
): SupportIdentityDecisionReport {
  const defaultCombined = getCombinedDemonCultBoss(buildBalanceReport(data));
  const options = buildOptionReports(optionInputs);

  return {
    selectedOptionId: "lotus_support",
    decision:
      "Keep Lotus/support counterplay as the Stage 1.6 direction; do not add a new production hero yet.",
    rationale: [
      "The default combined route already reaches the Demon Cult near-clear gate, so the game needs clearer support identity more than roster expansion.",
      "The Lotus support prototype improves the boss survival ratio while keeping medicine use and UI scope stable.",
      "The new hero prototype improves survivability, but it adds roster, unlock, formation, and presentation work before the combat loop needs that complexity.",
      "A temporary manual is numerically clean, but it has weaker fantasy and should become part of Lotus support progression rather than a separate direction."
    ],
    defaultCombinedGate: {
      rating: defaultCombined.rating,
      survivalRatio: defaultCombined.survivalRatio,
      medicineConsumed: defaultCombined.stage.statusMetrics.medicineConsumed,
      statusDamage: defaultCombined.stage.statusMetrics.expectedDamage,
      statusDurationSeconds:
        defaultCombined.stage.statusMetrics.expectedDurationSeconds
    },
    options,
    rejectedAlternatives: [
      {
        optionId: "new_support_hero",
        reason:
          "Defer until team composition needs a roster shake-up; it is more UI and balance surface than Stage 1.6 needs."
      },
      {
        optionId: "temporary_manual",
        reason:
          "Fold the manual idea into Lotus/support progression so the counterplay has a visible character identity."
      }
    ],
    stageOnePointSixRecommendation: {
      direction:
        "Make Mountain Staff Guardian and Lotus purity training the visible anti-status counterplay path.",
      backlogHooks: [
        "Add Lotus purity support upgrades or manuals that grant status resistance and cleanse reliability.",
        "Show support contribution in battle summary and counterplay preview.",
        "Keep a new Lotus hero as a later content reward only if Stage 1.6 playtests need roster excitement."
      ]
    }
  };
}

export function formatSupportIdentityDecisionReport(
  report: SupportIdentityDecisionReport
): string {
  const lines = [
    "Support Identity Decision",
    "",
    report.decision,
    "",
    "Default combined gate:",
    [
      `rating ${report.defaultCombinedGate.rating}`,
      `survival ratio ${formatNumber(report.defaultCombinedGate.survivalRatio)}`,
      `status damage ${formatNumber(report.defaultCombinedGate.statusDamage)}`,
      `status duration ${formatNumber(
        report.defaultCombinedGate.statusDurationSeconds
      )}s`,
      `medicine ${formatNumber(report.defaultCombinedGate.medicineConsumed)}`
    ].join(", "),
    "",
    "Options:",
    "option cp support_bonus support_cp result gate survival_ratio clear_time survival_time status_damage status_duration medicine"
  ];

  for (const option of report.options) {
    lines.push(
      [
        option.optionId,
        option.estimatedTeamCp,
        formatPercent(option.supportContribution?.statusResistanceBonus ?? 0),
        formatNumber(option.supportContribution?.estimatedCpContribution ?? 0),
        option.demonCultBoss.result,
        option.demonCultBoss.rating,
        formatNumber(option.demonCultBoss.survivalRatio),
        `${formatNumber(option.demonCultBoss.estimatedClearTimeSeconds)}s`,
        `${formatNumber(option.demonCultBoss.estimatedSurvivalSeconds)}s`,
        formatNumber(option.demonCultBoss.statusDamage),
        formatNumber(option.demonCultBoss.statusDurationSeconds),
        formatNumber(option.demonCultBoss.medicineConsumed)
      ].join(" ")
    );
  }

  lines.push("", "Rationale:");

  for (const reason of report.rationale) {
    lines.push(`- ${reason}`);
  }

  lines.push("", "Stage 1.6 recommendation:");
  lines.push(report.stageOnePointSixRecommendation.direction);

  for (const hook of report.stageOnePointSixRecommendation.backlogHooks) {
    lines.push(`- ${hook}`);
  }

  return lines.join("\n");
}

function buildOptionReports(
  prototypes: SupportIdentityOptionInput[]
): SupportIdentityOptionReport[] {
  return prototypes.map((prototype) => {
    const scenarios = prototype.scenarios ?? defaultBalanceScenarioPresets;
    const report = buildBalanceReport(prototype.data, { scenarios });

    return buildOptionReport({
      ...prototype,
      combinedScenario: getCombinedScenarioPreset(scenarios),
      report
    });
  });
}

function buildOptionReport(
  input: SupportIdentityOptionInput & {
    combinedScenario: BalanceScenarioPreset;
    report: BalanceReport;
  }
): SupportIdentityOptionReport {
  const boss = getCombinedDemonCultBoss(input.report);
  const supportContribution = getSupportContribution({
    heroes: input.data.heroes,
    combinedScenario: input.combinedScenario,
    sourceLabel: input.supportSourceLabel,
    resistanceBonus: input.supportResistanceBonus
  });

  return {
    optionId: input.optionId,
    label: input.label,
    summary: input.summary,
    productionRosterChangeRequired: input.productionRosterChangeRequired,
    prototypeNotes: input.prototypeNotes,
    supportContribution,
    estimatedTeamCp: estimateTeamCp(
      input.data.heroes,
      input.combinedScenario.statusResistanceBonus
    ),
    demonCultBoss: {
      stageId: boss.stage.stageId,
      result: boss.stage.result,
      rating: boss.rating,
      survivalRatio: boss.survivalRatio,
      estimatedClearTimeSeconds: boss.stage.estimatedClearTimeSeconds,
      estimatedSurvivalSeconds: boss.stage.estimatedSurvivalSeconds,
      medicineConsumed: boss.stage.statusMetrics.medicineConsumed,
      statusDamage: boss.stage.statusMetrics.expectedDamage,
      statusDurationSeconds: boss.stage.statusMetrics.expectedDurationSeconds
    }
  };
}

function getSupportContribution(input: {
  heroes: HeroDefinition[];
  combinedScenario: BalanceScenarioPreset;
  sourceLabel?: string;
  resistanceBonus?: number;
}): SupportIdentityOptionReport["supportContribution"] {
  if (
    input.sourceLabel === undefined ||
    input.resistanceBonus === undefined ||
    input.resistanceBonus <= 0
  ) {
    return null;
  }

  const baselineBonus = Math.max(
    0,
    input.combinedScenario.statusResistanceBonus - input.resistanceBonus
  );
  const estimatedCpContribution =
    estimateTeamCp(input.heroes, input.combinedScenario.statusResistanceBonus) -
    estimateTeamCp(input.heroes, baselineBonus);

  return {
    label: input.sourceLabel,
    statusResistanceBonus: input.resistanceBonus,
    estimatedCpContribution,
    summary: `${input.sourceLabel} contributes ${formatPercent(
      input.resistanceBonus
    )} capped status resistance and roughly ${formatNumber(
      estimatedCpContribution
    )} team CP in the combined gate.`
  };
}

function getCombinedScenarioPreset(
  scenarios: BalanceScenarioPreset[]
): BalanceScenarioPreset {
  const scenario = scenarios.find((entry) => entry.id === "combined");

  if (scenario === undefined) {
    throw new Error("Missing combined support decision scenario");
  }

  return scenario;
}

function getCombinedDemonCultBoss(report: BalanceReport) {
  const combined = report.scenarios.find(
    (scenario) => scenario.scenarioId === "combined"
  );
  const demonCult = combined?.regions.find(
    (region) => region.regionId === "demon_cult_outpost"
  );
  const bossGate = demonCult?.bossGate;
  const stage = demonCult?.stages.find((candidate) => candidate.isBoss);

  if (bossGate == null || stage === undefined) {
    throw new Error("Missing combined Demon Cult boss decision output");
  }

  return {
    ...bossGate,
    stage
  };
}

function estimateTeamCp(
  heroes: HeroDefinition[],
  scenarioResistanceBonus: number
): number {
  return Math.round(
    heroes.reduce(
      (total, hero) =>
        total + estimateHeroCp(hero.baseStats, scenarioResistanceBonus),
      0
    )
  );
}

function estimateHeroCp(
  stats: BaseStats,
  scenarioResistanceBonus: number
): number {
  return (
    stats.maxOuterHp * 0.6 +
    stats.maxInnerQi * 0.25 +
    (stats.outerAttack + stats.innerAttack) * 12 +
    (stats.outerDefense + stats.innerDefense) * 7 +
    stats.speed * 4 +
    stats.breakPower * 500 +
    stats.breakResist * 350 +
    stats.statusAccuracy * 600 +
    calculateEffectiveStatusResistance(
      stats.statusResistance,
      scenarioResistanceBonus
    ) *
      800
  );
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}
