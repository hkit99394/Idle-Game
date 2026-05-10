import type { StaticGameData } from "./types";

export type StaticGameDataParts = {
  [Key in keyof StaticGameData]: unknown;
};

export function buildStaticGameData(parts: StaticGameDataParts): StaticGameData {
  return {
    assignments: parts.assignments as StaticGameData["assignments"],
    heroes: parts.heroes as StaticGameData["heroes"],
    skills: parts.skills as StaticGameData["skills"],
    enemies: parts.enemies as StaticGameData["enemies"],
    equipment: parts.equipment as StaticGameData["equipment"],
    equipmentSets: parts.equipmentSets as StaticGameData["equipmentSets"],
    regions: parts.regions as StaticGameData["regions"],
    stages: parts.stages as StaticGameData["stages"],
    upgrades: parts.upgrades as StaticGameData["upgrades"],
    skillUpgrades: parts.skillUpgrades as StaticGameData["skillUpgrades"],
    mastery: parts.mastery as StaticGameData["mastery"],
    formations: parts.formations as StaticGameData["formations"],
    styles: parts.styles as StaticGameData["styles"],
    statusEffects: parts.statusEffects as StaticGameData["statusEffects"],
    medicines: parts.medicines as StaticGameData["medicines"]
  };
}
