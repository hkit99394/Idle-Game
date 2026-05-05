import type {
  HeroDefinition,
  RegionDefinition,
  StaticGameData
} from "../data";
import type { HeroProgress, PlayerProgress } from "./types";
import { createDefaultPlayerFormation } from "./playerFormationDefaults";

export function createInitialHeroProgress(): HeroProgress {
  return {
    level: 1,
    upgrades: {}
  };
}

export function createInitialPlayerProgress(
  data: Pick<StaticGameData, "heroes" | "regions" | "stages">
): PlayerProgress {
  const firstRegion = data.regions[0];
  const firstStageId =
    firstRegion?.stageIds[0] ?? data.stages[0]?.id ?? "";

  return {
    resources: {
      silver: 0,
      cultivation: 0
    },
    heroes: Object.fromEntries(
      data.heroes.map((hero: HeroDefinition) => [hero.id, createInitialHeroProgress()])
    ),
    sect: {
      upgrades: {}
    },
    maps: Object.fromEntries(
      data.regions.map((region: RegionDefinition) => [
        region.id,
        {
          combatExperience: 0,
          highestClearedStageIndex: 0
        }
      ])
    ),
    formation: createDefaultPlayerFormation(data.heroes.map((hero) => hero.id)),
    styleMastery: {},
    skillUpgrades: {},
    equipment: {
      inventory: {},
      equipped: {}
    },
    currentStageId: firstStageId
  };
}

export function cloneProgress(progress: PlayerProgress): PlayerProgress {
  return {
    resources: { ...progress.resources },
    heroes: Object.fromEntries(
      Object.entries(progress.heroes).map(([heroId, hero]) => [
        heroId,
        {
          level: hero.level,
          upgrades: { ...hero.upgrades }
        }
      ])
    ),
    sect: {
      upgrades: { ...progress.sect.upgrades }
    },
    maps: Object.fromEntries(
      Object.entries(progress.maps).map(([mapId, map]) => [
        mapId,
        {
          combatExperience: map.combatExperience,
          highestClearedStageIndex: map.highestClearedStageIndex
        }
      ])
    ),
    formation: progress.formation ? { ...progress.formation } : undefined,
    styleMastery: progress.styleMastery
      ? Object.fromEntries(
          Object.entries(progress.styleMastery).map(([styleId, mastery]) => [
            styleId,
            { experience: mastery.experience }
          ])
        )
      : undefined,
    skillUpgrades: progress.skillUpgrades
      ? { ...progress.skillUpgrades }
      : undefined,
    equipment: progress.equipment
      ? {
          inventory: { ...progress.equipment.inventory },
          equipped: Object.fromEntries(
            Object.entries(progress.equipment.equipped).map(([heroId, slots]) => [
              heroId,
              { ...slots }
            ])
          )
        }
      : undefined,
    currentStageId: progress.currentStageId
  };
}
