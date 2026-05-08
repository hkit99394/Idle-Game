import {
  buildBalanceReport,
  defaultBalanceScenarioPresets
} from "./balanceReport";
import type {
  BalanceGateRating,
  BalanceReport,
  BalanceScenarioPreset
} from "./balanceReport";
import { calculateEffectiveStatusResistance, type BaseStats } from "../combat";
import type { HeroDefinition, SkillDefinition, StaticGameData } from "../data";

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

type StaticDataForSupportDecision = Pick<
  StaticGameData,
  | "heroes"
  | "enemies"
  | "skills"
  | "regions"
  | "stages"
  | "statusEffects"
  | "medicines"
>;

type SupportIdentityPrototype = {
  optionId: SupportIdentityOptionId;
  label: string;
  summary: string;
  productionRosterChangeRequired: boolean;
  prototypeNotes: string[];
  data: StaticDataForSupportDecision;
  scenarios?: BalanceScenarioPreset[];
};

const lotusSupportScenarioBonus = 0.08;
const temporaryManualScenarioBonus = 0.14;

const prototypeLotusSkill: SkillDefinition = {
  id: "prototype_lotus_purifying_staff",
  name: "Prototype Lotus Purifying Staff",
  cooldownSeconds: 7,
  outerMultiplier: 0.35,
  innerMultiplier: 0.55,
  targetRule: "first_living",
  effects: [
    {
      type: "apply_status",
      statusId: "vulnerable",
      chance: 0.35,
      durationSeconds: 5,
      stacks: 1
    }
  ]
};

const prototypeLotusHero: HeroDefinition = {
  id: "prototype_lotus_purity_adept",
  name: "Prototype Lotus Purity Adept",
  style: "staff",
  role: "Anti-status support",
  combatRole: "support",
  baseStats: {
    maxOuterHp: 150,
    maxInnerQi: 180,
    outerAttack: 7,
    innerAttack: 12,
    outerDefense: 9,
    innerDefense: 18,
    speed: 8,
    critChance: 0.03,
    critDamage: 1.4,
    breakPower: 0.01,
    breakResist: 0.04,
    innerRecoveryRate: 0.006,
    statusAccuracy: 0.03,
    statusResistance: 0.3
  },
  skillIds: [prototypeLotusSkill.id],
  passiveIds: ["prototype_lotus_purity_aura"],
  unlock: {
    type: "stage_cleared",
    stageId: "demon_cult_outpost_4"
  }
};

export function buildSupportIdentityDecisionReport(
  data: StaticDataForSupportDecision
): SupportIdentityDecisionReport {
  const defaultCombined = getCombinedDemonCultBoss(buildBalanceReport(data));
  const options = buildOptionReports([
    {
      optionId: "lotus_support",
      label: "Lotus support remains main counterplay",
      summary:
        "Upgrade the existing support identity through Lotus purity training and clearer cleanse/resistance presentation.",
      productionRosterChangeRequired: false,
      prototypeNotes: [
        `Adds ${formatPercent(lotusSupportScenarioBonus)} support resistance to the combined scenario only.`,
        "Represents Lotus method/manual progression without changing production hero data."
      ],
      data,
      scenarios: withCombinedScenarioBonus(lotusSupportScenarioBonus, "support")
    },
    {
      optionId: "new_support_hero",
      label: "Add a new anti-Demon Cult support hero",
      summary:
        "Prototype a Lotus purity adept as a fifth team member with high resistance and low damage.",
      productionRosterChangeRequired: true,
      prototypeNotes: [
        `Adds prototype hero ${prototypeLotusHero.name} and skill ${prototypeLotusSkill.name} only to the decision simulation.`,
        "Would require roster, unlock, formation, and UI work before production."
      ],
      data: withPrototypeLotusHero(data)
    },
    {
      optionId: "temporary_manual",
      label: "Add a temporary manual or ally",
      summary:
        "Use a stronger manual-style resistance bump without a permanent support identity.",
      productionRosterChangeRequired: false,
      prototypeNotes: [
        `Adds ${formatPercent(temporaryManualScenarioBonus)} manual resistance to the combined scenario only.`,
        "Represents a lower-scope reward, but it is less personal than support progression."
      ],
      data,
      scenarios: withCombinedScenarioBonus(temporaryManualScenarioBonus, "manual")
    }
  ]);

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
      statusDamage: defaultCombined.stage.statusMetrics.expectedDamage
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
      `medicine ${formatNumber(report.defaultCombinedGate.medicineConsumed)}`
    ].join(", "),
    "",
    "Options:",
    "option cp result gate survival_ratio clear_time survival_time status_damage status_duration medicine"
  ];

  for (const option of report.options) {
    lines.push(
      [
        option.optionId,
        option.estimatedTeamCp,
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
  prototypes: SupportIdentityPrototype[]
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
  input: SupportIdentityPrototype & {
    combinedScenario: BalanceScenarioPreset;
    report: BalanceReport;
  }
): SupportIdentityOptionReport {
  const boss = getCombinedDemonCultBoss(input.report);

  return {
    optionId: input.optionId,
    label: input.label,
    summary: input.summary,
    productionRosterChangeRequired: input.productionRosterChangeRequired,
    prototypeNotes: input.prototypeNotes,
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

function getCombinedScenarioPreset(
  scenarios: BalanceScenarioPreset[]
): BalanceScenarioPreset {
  const scenario = scenarios.find((entry) => entry.id === "combined");

  if (scenario === undefined) {
    throw new Error("Missing combined support decision scenario");
  }

  return scenario;
}

function withCombinedScenarioBonus(
  resistanceBonus: number,
  sourceLabel: "support" | "manual"
): BalanceScenarioPreset[] {
  return defaultBalanceScenarioPresets.map((scenario) =>
    scenario.id === "combined"
      ? {
          ...scenario,
          statusResistanceBonus:
            scenario.statusResistanceBonus + resistanceBonus,
          description: `${scenario.description} Prototype ${sourceLabel} bonus: ${formatPercent(
            resistanceBonus
          )}.`
        }
      : scenario
  );
}

function withPrototypeLotusHero(
  data: StaticDataForSupportDecision
): StaticDataForSupportDecision {
  return {
    ...data,
    heroes: [...data.heroes, prototypeLotusHero],
    skills: [...data.skills, prototypeLotusSkill]
  };
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
