import { defaultBalanceScenarioPresets } from "../../core/balance/balanceReport";
import type { BalanceScenarioPreset } from "../../core/balance/balanceReport";
import type {
  StaticDataForSupportDecision,
  SupportIdentityOptionInput
} from "../supportDecision/decision";
import type { HeroDefinition, SkillDefinition } from "../../core/data";

const lotusSupportScenarioBonus = 0.08;
const temporaryManualScenarioBonus = 0.14;

const prototypeDemonPoisonPalm: SkillDefinition = {
  id: "prototype_demon_poison_palm",
  name: "Prototype Demon Poison Palm",
  cooldownSeconds: 4.5,
  outerMultiplier: 0.55,
  innerMultiplier: 1.15,
  targetRule: "first_living",
  effects: [
    {
      type: "apply_status",
      statusId: "poison",
      chance: 0.75,
      durationSeconds: 8,
      stacks: 1
    }
  ]
};

const prototypeDemonBloodSeal: SkillDefinition = {
  id: "prototype_demon_blood_seal",
  name: "Prototype Demon Blood Seal",
  cooldownSeconds: 5.5,
  outerMultiplier: 0.7,
  innerMultiplier: 1.25,
  targetRule: "highest_cp",
  effects: [
    {
      type: "apply_status",
      statusId: "wound",
      chance: 0.68,
      durationSeconds: 6,
      stacks: 1
    },
    {
      type: "apply_status",
      statusId: "burning_blood",
      chance: 0.55,
      durationSeconds: 5,
      stacks: 1
    }
  ]
};

const prototypeDemonCultEnemies: StaticDataForSupportDecision["enemies"] = [
  {
    id: "prototype_demon_poisoner",
    name: "Prototype Demon Poisoner",
    family: "demon_cult",
    type: "normal",
    style: "palm",
    combatRole: "breaker",
    level: 9,
    baseStats: {
      maxOuterHp: 980,
      maxInnerQi: 520,
      outerAttack: 26,
      innerAttack: 44,
      outerDefense: 24,
      innerDefense: 34,
      speed: 16,
      critChance: 0.05,
      critDamage: 1.45,
      breakPower: 0.04,
      breakResist: 0.04,
      innerRecoveryRate: 0.009,
      statusAccuracy: 0.1,
      statusResistance: 0.08
    },
    skillIds: [prototypeDemonPoisonPalm.id],
    traitIds: []
  },
  {
    id: "prototype_demon_blood_adept",
    name: "Prototype Demon Blood Adept",
    family: "demon_cult",
    type: "elite",
    style: "blade",
    combatRole: "striker",
    level: 10,
    baseStats: {
      maxOuterHp: 1350,
      maxInnerQi: 560,
      outerAttack: 48,
      innerAttack: 36,
      outerDefense: 30,
      innerDefense: 32,
      speed: 14,
      critChance: 0.07,
      critDamage: 1.6,
      breakPower: 0.03,
      breakResist: 0.05,
      innerRecoveryRate: 0.008,
      statusAccuracy: 0.08,
      statusResistance: 0.1
    },
    skillIds: [prototypeDemonBloodSeal.id],
    traitIds: []
  },
  {
    id: "prototype_demon_cult_boss",
    name: "Prototype Demon Cult Boss",
    family: "demon_cult",
    type: "boss",
    style: "blade",
    combatRole: "striker",
    level: 11,
    baseStats: {
      maxOuterHp: 2600,
      maxInnerQi: 980,
      outerAttack: 70,
      innerAttack: 58,
      outerDefense: 40,
      innerDefense: 42,
      speed: 12,
      critChance: 0.08,
      critDamage: 1.65,
      breakPower: 0.05,
      breakResist: 0.08,
      innerRecoveryRate: 0.009,
      statusAccuracy: 0.12,
      statusResistance: 0.12
    },
    skillIds: [prototypeDemonPoisonPalm.id, prototypeDemonBloodSeal.id],
    traitIds: ["boss"]
  }
];

const prototypeDemonCultRegion: StaticDataForSupportDecision["regions"][number] = {
  id: "demon_cult_outpost",
  name: "Prototype Demon Cult Outpost",
  stageIds: [
    "demon_cult_outpost_1",
    "demon_cult_outpost_2",
    "demon_cult_outpost_3",
    "demon_cult_outpost_4"
  ],
  unlockCondition: {
    type: "stage_cleared",
    stageId: "lotus_monastery_7"
  }
};

const prototypeDemonCultStages: StaticDataForSupportDecision["stages"] = [
  {
    id: "demon_cult_outpost_1",
    regionId: "demon_cult_outpost",
    index: 1,
    name: "Prototype Demon Cult Gate",
    enemyTeam: {
      combatantIds: ["prototype_demon_poisoner", "prototype_demon_poisoner"],
      formation: { front: [0], middle: [1], back: [] }
    },
    isBoss: false,
    canFarmOffline: true,
    rewards: { silver: 220, cultivation: 110, combatExperience: 60 },
    nextStageId: "demon_cult_outpost_2"
  },
  {
    id: "demon_cult_outpost_2",
    regionId: "demon_cult_outpost",
    index: 2,
    name: "Prototype Blood Seal Yard",
    enemyTeam: {
      combatantIds: ["prototype_demon_poisoner", "prototype_demon_blood_adept"],
      formation: { front: [1], middle: [0], back: [] }
    },
    isBoss: false,
    canFarmOffline: true,
    rewards: { silver: 260, cultivation: 130, combatExperience: 70 },
    nextStageId: "demon_cult_outpost_3"
  },
  {
    id: "demon_cult_outpost_3",
    regionId: "demon_cult_outpost",
    index: 3,
    name: "Prototype Burning Blood Hall",
    enemyTeam: {
      combatantIds: [
        "prototype_demon_blood_adept",
        "prototype_demon_poisoner",
        "prototype_demon_poisoner"
      ],
      formation: { front: [0], middle: [1], back: [2] }
    },
    isBoss: false,
    canFarmOffline: true,
    rewards: { silver: 310, cultivation: 155, combatExperience: 82 },
    nextStageId: "demon_cult_outpost_4"
  },
  {
    id: "demon_cult_outpost_4",
    regionId: "demon_cult_outpost",
    index: 4,
    name: "Prototype Demon Cult Boss",
    enemyTeam: {
      combatantIds: [
        "prototype_demon_blood_adept",
        "prototype_demon_cult_boss",
        "prototype_demon_poisoner"
      ],
      formation: { front: [0], middle: [1], back: [2] }
    },
    isBoss: true,
    canFarmOffline: false,
    rewards: { silver: 760, cultivation: 380, combatExperience: 220 },
    nextStageId: null
  }
];

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

export type SupportIdentityDecisionInput = {
  data: StaticDataForSupportDecision;
  options: SupportIdentityOptionInput[];
};

export function createSupportIdentityDecisionInput(
  data: StaticDataForSupportDecision
): SupportIdentityDecisionInput {
  const decisionData = withPrototypeDemonCultIfMissing(data);

  return {
    data: decisionData,
    options: [
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
        data: decisionData,
        supportSourceLabel: "Lotus Purity Training",
        supportResistanceBonus: lotusSupportScenarioBonus,
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
        data: withPrototypeLotusHero(decisionData)
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
        data: decisionData,
        supportSourceLabel: "Temporary manual",
        supportResistanceBonus: temporaryManualScenarioBonus,
        scenarios: withCombinedScenarioBonus(temporaryManualScenarioBonus, "manual")
      }
    ]
  };
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

function withPrototypeDemonCultIfMissing(
  data: StaticDataForSupportDecision
): StaticDataForSupportDecision {
  if (data.regions.some((region) => region.id === "demon_cult_outpost")) {
    return data;
  }

  return {
    ...data,
    regions: [...data.regions, prototypeDemonCultRegion],
    stages: [...data.stages, ...prototypeDemonCultStages],
    enemies: [...data.enemies, ...prototypeDemonCultEnemies],
    skills: [
      ...data.skills,
      prototypeDemonPoisonPalm,
      prototypeDemonBloodSeal
    ]
  };
}
function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
