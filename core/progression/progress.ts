import type {
  HeroDefinition,
  RegionDefinition,
  StaticGameData
} from "../data";
import type { HeroProgress, PlayerProgress } from "./types";
import { DEFAULT_TACTIC_ID } from "../combat/tactics";
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
      credits: 0,
      resonance: 0,
      reagents: 0
    },
    heroes: Object.fromEntries(
      data.heroes.map((hero: HeroDefinition) => [hero.id, createInitialHeroProgress()])
    ),
    technoSect: {
      upgrades: {}
    },
    districts: Object.fromEntries(
      data.regions.map((region: RegionDefinition) => [
        region.id,
        {
          combatData: 0,
          highestClearedRouteIndex: 0
        }
      ])
    ),
    selectedRoutineId: DEFAULT_TACTIC_ID,
    activeHeroIds: createDefaultActiveHeroIds(heroIds),
    formation: createDefaultPlayerFormation(heroIds),
    styleMastery: {},
    styleBranches: {},
    skillUpgrades: {},
    equipment: {
      inventory: {},
      equipped: {}
    },
    medicineInventory: {},
    assignments: {},
    currentRouteId: firstStageId
  };
}

export function cloneProgress(progress: PlayerProgress): PlayerProgress {
  return {
    resources: {
      ...progress.resources,
      reagents: progress.resources.reagents ?? 0
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
    technoSect: {
      upgrades: { ...progress.technoSect.upgrades }
    },
    districts: Object.fromEntries(
      Object.entries(progress.districts).map(([districtId, district]) => [
        districtId,
        {
          combatData: district.combatData,
          highestClearedRouteIndex: district.highestClearedRouteIndex
        }
      ])
    ),
    selectedRoutineId: progress.selectedRoutineId ?? DEFAULT_TACTIC_ID,
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
    medicineInventory: progress.medicineInventory
      ? { ...progress.medicineInventory }
      : undefined,
    assignments: progress.assignments
      ? Object.fromEntries(
          Object.entries(progress.assignments).map(([assignmentId, assignment]) => [
            assignmentId,
            { heroIds: [...assignment.heroIds] }
          ])
        )
      : undefined,
    currentRouteId: progress.currentRouteId
  };
}
