import type {
  HeroDefinition,
  RegionDefinition,
  StaticGameData
} from "../data";
import type { HeroProgress, PlayerProgress } from "./types";

export function createInitialHeroProgress(): HeroProgress {
  return {
    level: 1,
    upgrades: {}
  };
}

export function createInitialPlayerProgress(
  data: Pick<StaticGameData, "heroes" | "regions">
): PlayerProgress {
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
    )
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
    )
  };
}
