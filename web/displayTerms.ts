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
  equipment: {
    augment: "Augment",
    augments: "Augments",
    slots: {
      armor: "Plating",
      manual: "Protocol",
      medicine: "Countermeasure",
      weapon: "Weapon"
    }
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
    routine: "Routine",
    routines: "Routines",
    tactic: "Tactic",
    tactics: "Tactics"
  },
  teams: {
    activeInitiates: "Active Initiates",
    crew: "Crew",
    formation: "Formation",
    initiateRoster: "Initiate Roster"
  }
} as const;

type ResourceDisplayKey = keyof typeof displayTerms.resources;
type EquipmentSlotDisplayKey = keyof typeof displayTerms.equipment.slots;
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

const combatRoleDisplayNames: Record<string, string> = {
  breaker: "Breacher",
  striker: "Striker",
  support: "Stabilizer",
  tank: "Anchor"
};

const operationTypeDisplayNames: Record<string, string> = {
  patrol: "Sweep operation",
  training_ground: "Calibration operation"
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

export function formatCombatRoleLabel(role: string): string {
  return combatRoleDisplayNames[role] ?? formatFallbackLabel(role);
}

export function formatEquipmentSlotLabel(slot: string): string {
  return slot in displayTerms.equipment.slots
    ? displayTerms.equipment.slots[slot as EquipmentSlotDisplayKey]
    : formatFallbackLabel(slot);
}

export function formatOperationTypeLabel(operationType: string): string {
  return (
    operationTypeDisplayNames[operationType] ?? formatFallbackLabel(operationType)
  );
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
