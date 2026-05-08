import type { FormationDefinition, RegionDefinition, StageDefinition } from "../types";
import { FORMATION_SLOTS, isFormationSlot } from "../../combat";
import { isRecord } from "./shared";

export function validateClearTimeTargetRange(
  ownerLabel: string,
  value: unknown
): string[] {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return [`${ownerLabel} must be an object`];
  }

  if (typeof value.min !== "number" || !Number.isFinite(value.min)) {
    errors.push(`${ownerLabel}.min must be a finite number`);
  }

  if (typeof value.max !== "number" || !Number.isFinite(value.max)) {
    errors.push(`${ownerLabel}.max must be a finite number`);
  }

  if (
    typeof value.min === "number" &&
    Number.isFinite(value.min) &&
    value.min < 0
  ) {
    errors.push(`${ownerLabel}.min must be non-negative`);
  }

  if (
    typeof value.max === "number" &&
    Number.isFinite(value.max) &&
    value.max <= 0
  ) {
    errors.push(`${ownerLabel}.max must be greater than zero`);
  }

  if (
    typeof value.min === "number" &&
    Number.isFinite(value.min) &&
    typeof value.max === "number" &&
    Number.isFinite(value.max) &&
    value.min > value.max
  ) {
    errors.push(`${ownerLabel}.min must be less than or equal to max`);
  }

  return errors;
}

export function validateRegionBalanceTargets(region: RegionDefinition): string[] {
  const targets = region.balanceTargets;

  if (targets === undefined) {
    return [];
  }

  if (!isRecord(targets)) {
    return [`Region ${region.id} balanceTargets must be an object`];
  }

  if (!isRecord(targets.clearTimeSeconds)) {
    return [
      `Region ${region.id} balanceTargets.clearTimeSeconds must be an object`
    ];
  }

  const clearTimeSeconds = targets.clearTimeSeconds;
  const errors = [
    ...validateClearTimeTargetRange(
      `Region ${region.id} balanceTargets.clearTimeSeconds.normal`,
      clearTimeSeconds.normal
    ),
    ...validateClearTimeTargetRange(
      `Region ${region.id} balanceTargets.clearTimeSeconds.elite`,
      clearTimeSeconds.elite
    )
  ];

  if (clearTimeSeconds.boss !== undefined) {
    errors.push(
      ...validateClearTimeTargetRange(
        `Region ${region.id} balanceTargets.clearTimeSeconds.boss`,
        clearTimeSeconds.boss
      )
    );
  }

  return errors;
}

export function validateStageEnemyRefs(
  stages: StageDefinition[],
  enemyIds: Set<string>
): string[] {
  return stages.flatMap((stage) =>
    stage.enemyTeam.combatantIds
      .filter((enemyId) => !enemyIds.has(enemyId))
      .map((enemyId) => `Stage ${stage.id} references missing enemy ${enemyId}`)
  );
}

export function validateStageEquipmentRefs(
  stages: StageDefinition[],
  equipmentIds: Set<string>
): string[] {
  return stages.flatMap((stage) =>
    (stage.equipmentDrops ?? []).flatMap((drop) =>
      equipmentIds.has(drop.equipmentId)
        ? []
        : [`Stage ${stage.id} references missing equipment ${drop.equipmentId}`]
    )
  );
}

export function validateStageRegionRefs(
  stages: StageDefinition[],
  regionIds: Set<string>
): string[] {
  return stages.flatMap((stage) =>
    regionIds.has(stage.regionId)
      ? []
      : [`Stage ${stage.id} references missing region ${stage.regionId}`]
  );
}

export function validateStageNextRefs(
  stages: StageDefinition[],
  stageIds: Set<string>
): string[] {
  return stages.flatMap((stage) =>
    stage.nextStageId === null || stageIds.has(stage.nextStageId)
      ? []
      : [`Stage ${stage.id} references missing next stage ${stage.nextStageId}`]
  );
}

export function validateRegionStageRefs(
  regions: RegionDefinition[],
  stageIds: Set<string>
): string[] {
  return regions.flatMap((region) =>
    region.stageIds
      .filter((stageId) => !stageIds.has(stageId))
      .map((stageId) => `Region ${region.id} references missing stage ${stageId}`)
  );
}

export function validateRegionStageOwnership(
  regions: RegionDefinition[],
  stages: StageDefinition[]
): string[] {
  const stagesById = new Map(stages.map((stage) => [stage.id, stage]));

  return regions.flatMap((region) =>
    region.stageIds.flatMap((stageId) => {
      const stage = stagesById.get(stageId);

      return stage && stage.regionId !== region.id
        ? [
            `Region ${region.id} includes stage ${stageId} from region ${stage.regionId}`
          ]
        : [];
    })
  );
}

export function validateFormation(formation: FormationDefinition): string[] {
  const errors: string[] = [];
  const seenSlots = new Set<string>();

  for (const slot of formation.slots) {
    if (!isFormationSlot(slot)) {
      errors.push(
        `Formation ${formation.id} slot ${String(slot)} must be one of ${FORMATION_SLOTS.join(", ")}`
      );
      continue;
    }

    if (seenSlots.has(slot)) {
      errors.push(`Formation ${formation.id} slot ${slot} is duplicated`);
    }

    seenSlots.add(slot);
  }

  return errors;
}

export function validateStage(stage: StageDefinition): string[] {
  const errors: string[] = [];

  if (stage.isBoss && stage.canFarmOffline) {
    errors.push(`Boss stage ${stage.id} cannot be marked for offline farming`);
  }

  if (
    stage.rewards.silver < 0 ||
    stage.rewards.cultivation < 0 ||
    (stage.rewards.herbs ?? 0) < 0 ||
    stage.rewards.combatExperience < 0
  ) {
    errors.push(`Stage ${stage.id} rewards must be non-negative`);
  }

  for (const drop of stage.equipmentDrops ?? []) {
    if (!Number.isInteger(drop.quantity) || drop.quantity < 1) {
      errors.push(`Stage ${stage.id} equipment drop quantity must be an integer >= 1`);
    }
  }

  const placedCombatantIndexes = new Set<number>();

  for (const [slot, combatantIndexes] of Object.entries(
    stage.enemyTeam.formation ?? {}
  )) {
    if (!isFormationSlot(slot)) {
      errors.push(
        `Stage ${stage.id} enemyTeam formation slot ${slot} must be one of ${FORMATION_SLOTS.join(", ")}`
      );
      continue;
    }

    if (!Array.isArray(combatantIndexes)) {
      errors.push(`Stage ${stage.id} enemyTeam formation slot ${slot} must be an array`);
      continue;
    }

    for (const combatantIndex of combatantIndexes) {
      if (
        typeof combatantIndex !== "number" ||
        !Number.isInteger(combatantIndex) ||
        combatantIndex < 0 ||
        combatantIndex >= stage.enemyTeam.combatantIds.length
      ) {
        errors.push(
          `Stage ${stage.id} enemyTeam formation slot ${slot} has invalid combatant index ${String(combatantIndex)}`
        );
        continue;
      }

      if (placedCombatantIndexes.has(combatantIndex)) {
        errors.push(
          `Stage ${stage.id} enemyTeam formation places combatant index ${combatantIndex} more than once`
        );
      }

      placedCombatantIndexes.add(combatantIndex);
    }
  }

  return errors;
}
