import {
  ACTIVE_TEAM_SIZE,
  calculateCombatPower,
  calculateSkillSupportCombatPower,
  deriveStats,
  getActiveHeroIds,
  getHeroAssignmentId,
  getStageById,
  isHeroUnlocked,
  scaleStatsForLevel
} from "../../../core";
import type { PlayerProgress, StaticGameData } from "../../../core";
import {
  displayTerms,
  formatStyleFamilyName
} from "../../displayTerms";
import type { BattleCombatantView } from "./battleTypes";
import type { PlayerFormationHeroView, RosterHeroView } from "./rosterTypes";

function formatHeroUnlockRequirement(
  data: StaticGameData,
  hero: StaticGameData["heroes"][number]
): string {
  const unlock = hero.unlock;

  switch (unlock.type) {
    case "always":
      return "Available";
    case "stage_cleared":
      return `Clear ${
        getStageById(data, unlock.stageId)?.name ?? unlock.stageId
      }`;
    case "hero_level":
      return `${
        data.heroes.find((candidate) => candidate.id === unlock.heroId)?.name ??
        unlock.heroId
      } level ${unlock.level}`;
    case "style_mastery_level":
      return `${formatStyleFamilyName(unlock.styleId)} ${
        displayTerms.progression.protocolMastery
      } ${unlock.level}`;
  }
}

function calculateRosterHeroCombatPower(
  data: StaticGameData,
  progress: PlayerProgress,
  hero: StaticGameData["heroes"][number]
): number {
  const level = progress.heroes[hero.id]?.level ?? 1;
  const stats = deriveStats(scaleStatsForLevel(hero.baseStats, level));

  return Math.round(
    calculateCombatPower(stats) +
      calculateSkillSupportCombatPower(data, hero.skillIds, stats)
  );
}

export function buildRosterHeroViews(
  data: StaticGameData,
  progress: PlayerProgress
): RosterHeroView[] {
  const activeHeroIds = getActiveHeroIds(data, progress);
  const activeHeroIdSet = new Set(activeHeroIds);
  const assignmentNameById = new Map(
    (data.assignments ?? []).map((assignment) => [assignment.id, assignment.name])
  );

  return data.heroes.map((hero) => {
    const unlocked = isHeroUnlocked(data, progress, hero);
    const active = activeHeroIdSet.has(hero.id);
    const assignedAssignmentId = getHeroAssignmentId(progress, hero.id);

    return {
      heroId: hero.id,
      name: hero.name,
      style: formatStyleFamilyName(hero.style),
      role: hero.role,
      combatRole: hero.combatRole,
      level: progress.heroes[hero.id]?.level ?? 1,
      combatPower: calculateRosterHeroCombatPower(data, progress, hero),
      unlocked,
      active,
      canActivate:
        unlocked && !active && activeHeroIds.length < ACTIVE_TEAM_SIZE,
      canDeactivate: active && activeHeroIds.length > 1,
      lockReason: unlocked ? null : formatHeroUnlockRequirement(data, hero),
      assignedAssignmentName: assignedAssignmentId
        ? assignmentNameById.get(assignedAssignmentId) ?? assignedAssignmentId
        : null
    };
  });
}

export function buildPlayerFormationViews(
  playerCombatants: BattleCombatantView[]
): PlayerFormationHeroView[] {
  return playerCombatants.map((combatant) => ({
    heroId: combatant.definitionId,
    name: combatant.name,
    style: formatStyleFamilyName(combatant.style),
    role: combatant.role,
    combatRole: combatant.combatRole,
    formationSlot: combatant.formationSlot
  }));
}
