export const displayTerms = {
  combat: {
    aiOverload: "AI Overload",
    aiOverloads: "AI Overloads",
    bodyIntegrity: "Body Integrity",
    cognitiveArt: "Cognitive Art",
    cognitiveAttack: "Cognitive Attack",
    cognitiveDamage: "Cognitive damage",
    contextRebuild: "Context Rebuild",
    contextStability: "Context Stability",
    kineticArt: "Kinetic Art",
    kineticAttack: "Kinetic Attack",
    kineticDamage: "Kinetic damage",
    overloadResist: "Overload Resist",
    breachPower: "Breach Power"
  },
  counterplay: {
    autoCountermeasure: "Auto Countermeasure",
    battlePurge: "Battle purge",
    countermeasure: "Countermeasure",
    countermeasures: "Countermeasures",
    postBattlePurge: "Post-battle purge",
    preBattleResistance: "Pre-battle resistance",
    purge: "Purge"
  },
  progression: {
    combatData: "Combat Data",
    district: "District",
    districts: "Districts",
    districtMastery: "District Mastery",
    initiate: "Initiate",
    initiates: "Initiates",
    operation: "Operation",
    operations: "Operations",
    protocol: "Protocol",
    protocolMastery: "Protocol Mastery",
    protocols: "Protocols",
    route: "Route",
    routes: "Routes",
    technoSect: "Techno-sect"
  },
  resources: {
    silver: "Credits",
    cultivation: "Resonance",
    herbs: "Reagents",
    combatExperience: "Combat Data",
    mastery: "District Mastery",
    styleMastery: "Protocol Mastery"
  },
  styles: {
    fist: "Impact Style",
    palm: "Pulse Style",
    leg: "Vector Style",
    sword: "Edge Style",
    blade: "Rend Style",
    staff: "Brace Style",
    hidden_weapons: "Ghostware Style"
  },
  tactics: {
    tactic: "Tactic",
    tactics: "Tactics"
  }
} as const;

type ResourceDisplayKey = keyof typeof displayTerms.resources;
type StyleDisplayKey = keyof typeof displayTerms.styles;

const statDisplayNames: Record<string, string> = {
  breakPower: displayTerms.combat.breachPower,
  breakResist: displayTerms.combat.overloadResist,
  critChance: "Crit Chance",
  critDamage: "Crit Damage",
  innerAttack: displayTerms.combat.cognitiveAttack,
  innerDefense: "Cognitive Defense",
  innerRecoveryRate: displayTerms.combat.contextRebuild,
  maxInnerQi: `Max ${displayTerms.combat.contextStability}`,
  maxOuterHp: `Max ${displayTerms.combat.bodyIntegrity}`,
  outerAttack: displayTerms.combat.kineticAttack,
  outerDefense: "Kinetic Defense",
  speed: "Speed",
  statusAccuracy: "Status Accuracy",
  statusResistance: "Status Resistance"
};

const tacticModifierDisplayNames: Record<string, string> = {
  boss_damage_multiplier: "Boss damage",
  break_power_multiplier: displayTerms.combat.breachPower,
  guard_multiplier: "Guard",
  healing_multiplier: "Healing",
  inner_damage_multiplier: displayTerms.combat.cognitiveDamage,
  outer_damage_multiplier: displayTerms.combat.kineticDamage,
  protection_multiplier: "Protection",
  status_resistance_bonus: "Status Resistance"
};

function formatFallbackLabel(value: string): string {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/[A-Z]/g, (match) => ` ${match}`)
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function formatResourceLabel(resource: string): string {
  return resource in displayTerms.resources
    ? displayTerms.resources[resource as ResourceDisplayKey]
    : formatFallbackLabel(resource);
}

export function formatInternalStatName(stat: string): string {
  return statDisplayNames[stat] ?? formatFallbackLabel(stat);
}

export function formatStyleFamilyName(styleId: string): string {
  return styleId in displayTerms.styles
    ? displayTerms.styles[styleId as StyleDisplayKey]
    : formatFallbackLabel(styleId);
}

export function formatTacticModifierLabel(modifierType: string): string {
  return (
    tacticModifierDisplayNames[modifierType] ?? formatFallbackLabel(modifierType)
  );
}
