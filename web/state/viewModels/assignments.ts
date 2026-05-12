import {
  getHeroAssignmentId,
  getStageById,
  isAssignmentUnlocked,
  isHeroEligibleForAssignment,
  isHeroUnlocked
} from "../../../core";
import type { PlayerProgress, StaticGameData } from "../../../core";
import {
  displayTerms,
  formatOperationTypeLabel,
  formatResourceLabel,
  formatStyleFamilyName
} from "../../displayTerms";
import type { AssignmentView } from "./assignmentTypes";

function formatAssignmentNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
  }).format(Math.max(0, value));
}

function getUnlockedHeroDefinitions(
  data: StaticGameData,
  progress: PlayerProgress
): StaticGameData["heroes"] {
  return data.heroes.filter((hero) => isHeroUnlocked(data, progress, hero));
}

function formatAssignmentRequirement(
  data: StaticGameData,
  assignment: NonNullable<StaticGameData["assignments"]>[number]
): string {
  const unlock = assignment.unlockCondition;

  switch (unlock.type) {
    case "always":
      return "Available";
    case "stage_cleared":
      return `Clear ${
        getStageById(data, unlock.stageId)?.name ?? unlock.stageId
      }`;
    case "hero_level":
      return `${
        data.heroes.find((hero) => hero.id === unlock.heroId)?.name ??
        unlock.heroId
      } level ${unlock.level}`;
    case "style_mastery_level":
      return `${formatStyleFamilyName(unlock.styleId)} ${
        displayTerms.progression.protocolMastery
      } ${unlock.level}`;
  }
}

function buildAssignmentRewardSummary(
  data: StaticGameData,
  assignment: NonNullable<StaticGameData["assignments"]>[number]
): string[] {
  const rewards = assignment.rewardProfile;
  const equipmentNames = new Map(
    data.equipment.map((equipment) => [equipment.id, equipment.name])
  );
  const details: string[] = [];

  if (rewards.silverPerHour) {
    details.push(
      `${formatAssignmentNumber(rewards.silverPerHour)} ${formatResourceLabel(
        "silver"
      )}/hour`
    );
  }

  if (rewards.cultivationPerHour) {
    details.push(
      `${formatAssignmentNumber(
        rewards.cultivationPerHour
      )} ${formatResourceLabel("cultivation")}/hour`
    );
  }

  if (rewards.herbsPerHour) {
    details.push(
      `${formatAssignmentNumber(rewards.herbsPerHour)} ${formatResourceLabel(
        "herbs"
      )}/hour`
    );
  }

  if (rewards.combatExperiencePerHour) {
    details.push(
      `${formatAssignmentNumber(
        rewards.combatExperiencePerHour
      )} ${formatResourceLabel("combatExperience")}/hour`
    );
  }

  if (rewards.styleMasteryExperiencePerHour) {
    details.push(
      `${formatAssignmentNumber(
        rewards.styleMasteryExperiencePerHour
      )} ${formatResourceLabel("styleMastery")}/hour`
    );
  }

  for (const reward of rewards.equipmentRewardsPerHour ?? []) {
    details.push(
      `${reward.quantityPerHour}/hour ${
        equipmentNames.get(reward.equipmentId) ?? reward.equipmentId
      }`
    );
  }

  return details;
}

export function buildAssignmentViews(
  data: StaticGameData,
  progress: PlayerProgress
): AssignmentView[] {
  const assignmentNameById = new Map(
    (data.assignments ?? []).map((assignment) => [assignment.id, assignment.name])
  );

  return (data.assignments ?? []).map((assignment) => {
    const unlocked = isAssignmentUnlocked(data, progress, assignment);
    const assignedHeroIds =
      progress.assignments?.[assignment.id]?.heroIds ?? [];

    return {
      assignmentId: assignment.id,
      name: assignment.name,
      type: assignment.type,
      typeLabel: formatOperationTypeLabel(assignment.type),
      durationBucket: assignment.durationBucket,
      unlocked,
      lockReason: unlocked
        ? null
        : formatAssignmentRequirement(data, assignment),
      assignedHeroIds,
      rewardSummary: buildAssignmentRewardSummary(data, assignment),
      heroOptions: getUnlockedHeroDefinitions(data, progress).map((hero) => {
        const assignedAssignmentId = getHeroAssignmentId(progress, hero.id);

        return {
          heroId: hero.id,
          name: hero.name,
          style: formatStyleFamilyName(hero.style),
          role: hero.combatRole,
          eligible: isHeroEligibleForAssignment(assignment, hero),
          assignedHere: assignedAssignmentId === assignment.id,
          assignedAssignmentName: assignedAssignmentId
            ? assignmentNameById.get(assignedAssignmentId) ?? assignedAssignmentId
            : null
        };
      })
    };
  });
}
