import type {
  HeroDefinition,
  RegionDefinition,
  StaticGameData
} from "../data";
import type { HeroProgress, PlayerProgress } from "./types";
import { createDefaultPlayerFormation } from "./playerFormationDefaults";
import { createDefaultActiveHeroIds } from "./playerRosterDefaults";

export function createInitialHeroProgress(): HeroProgress {
  return {
    level: 1,
    upgrades: {}
  };
}

export function createInitialPlayerProgress(
  data: Pick<StaticGameData, "heroes" | "regions" | "stages">
): PlayerProgress {
  const heroIds = data.heroes.map((hero) => hero.id);
  const firstRegion = data.regions[0];
  const firstStageId =
    firstRegion?.stageIds[0] ?? data.stages[0]?.id ?? "";

  return {
    resources: {
      silver: 0,
      cultivation: 0,
      herbs: 0
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
    activeHeroIds: createDefaultActiveHeroIds(heroIds),
    formation: createDefaultPlayerFormation(heroIds),
    styleMastery: {},
    styleBranches: {},
    skillUpgrades: {},
    equipment: {
      inventory: {},
      equipped: {}
    },
    assignments: {},
    currentStageId: firstStageId
  };
}

export function cloneProgress(progress: PlayerProgress): PlayerProgress {
  return {
    resources: {
      ...progress.resources,
      herbs: progress.resources.herbs ?? 0
    },
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
    activeHeroIds: progress.activeHeroIds
      ? [...progress.activeHeroIds]
      : undefined,
    formation: progress.formation ? { ...progress.formation } : undefined,
    styleMastery: progress.styleMastery
      ? Object.fromEntries(
          Object.entries(progress.styleMastery).map(([styleId, mastery]) => [
            styleId,
            { experience: mastery.experience }
          ])
        )
      : undefined,
    styleBranches: progress.styleBranches
      ? { ...progress.styleBranches }
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
    assignments: progress.assignments
      ? Object.fromEntries(
          Object.entries(progress.assignments).map(([assignmentId, assignment]) => [
            assignmentId,
            { heroIds: [...assignment.heroIds] }
          ])
        )
      : undefined,
    currentStageId: progress.currentStageId
  };
}
