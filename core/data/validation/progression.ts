import type { FormationDefinition, RegionDefinition, StageDefinition } from "../types";
import { FORMATION_SLOTS, isFormationSlot } from "../../combat";
import { isRecord, type StaticDataValidationContext } from "./shared";

const BALANCE_RESULT_EXPECTATIONS = ["player_clear", "enemy_hold"] as const;

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

export function validateRegionBalanceTargets(
  region: RegionDefinition,
  context: Pick<StaticDataValidationContext, "statusEffectIds">
): string[] {
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

  errors.push(...validateRewardCurveTargets(region));
  errors.push(...validateStatusPressureTargets(region, context));
  errors.push(...validateDefensePressureTargets(region));
  errors.push(...validateHealingPressureTargets(region));
  errors.push(...validateBossGateTargets(region));

  return errors;
}

function validateRewardCurveTargets(region: RegionDefinition): string[] {
  const targets = region.balanceTargets?.rewardCurve;

  if (targets === undefined) {
    return [];
  }

  if (!isRecord(targets)) {
    return [`Region ${region.id} balanceTargets.rewardCurve must be an object`];
  }

  if (
    targets.requireBestFarmRecommendation !== undefined &&
    typeof targets.requireBestFarmRecommendation !== "boolean"
  ) {
    return [
      `Region ${region.id} balanceTargets.rewardCurve.requireBestFarmRecommendation must be a boolean`
    ];
  }

  return [];
}

function validateStatusPressureTargets(
  region: RegionDefinition,
  context: Pick<StaticDataValidationContext, "statusEffectIds">
): string[] {
  const targets = region.balanceTargets?.statusPressure;

  if (targets === undefined) {
    return [];
  }

  if (!isRecord(targets)) {
    return [`Region ${region.id} balanceTargets.statusPressure must be an object`];
  }

  const errors: string[] = [];
  validateOptionalNonNegativeNumber(
    errors,
    targets.minApplications,
    `Region ${region.id} balanceTargets.statusPressure.minApplications`
  );
  validateOptionalNonNegativeNumber(
    errors,
    targets.maxApplications,
    `Region ${region.id} balanceTargets.statusPressure.maxApplications`
  );
  validateOptionalNonNegativeNumber(
    errors,
    targets.maxExpectedDamage,
    `Region ${region.id} balanceTargets.statusPressure.maxExpectedDamage`
  );
  validateOptionalNonNegativeNumber(
    errors,
    targets.maxMedicineConsumed,
    `Region ${region.id} balanceTargets.statusPressure.maxMedicineConsumed`
  );

  if (targets.expectedStatusIds !== undefined) {
    if (
      !Array.isArray(targets.expectedStatusIds) ||
      targets.expectedStatusIds.some((statusId) => typeof statusId !== "string")
    ) {
      errors.push(
        `Region ${region.id} balanceTargets.statusPressure.expectedStatusIds must be an array of strings`
      );
    } else {
      for (const statusId of targets.expectedStatusIds) {
        if (!context.statusEffectIds.has(statusId)) {
          errors.push(
            `Region ${region.id} balanceTargets.statusPressure.expectedStatusIds includes unknown status ${statusId}`
          );
        }
      }
    }
  }

  validateMinMaxPair(
    errors,
    targets.minApplications,
    targets.maxApplications,
    `Region ${region.id} balanceTargets.statusPressure.applications`
  );

  return errors;
}

function validateDefensePressureTargets(region: RegionDefinition): string[] {
  const targets = region.balanceTargets?.defensePressure;

  if (targets === undefined) {
    return [];
  }

  if (!isRecord(targets)) {
    return [`Region ${region.id} balanceTargets.defensePressure must be an object`];
  }

  const errors: string[] = [];
  validateOptionalNonNegativeNumber(
    errors,
    targets.minGuardAbsorbs,
    `Region ${region.id} balanceTargets.defensePressure.minGuardAbsorbs`
  );
  validateOptionalNonNegativeNumber(
    errors,
    targets.minArmorBreaks,
    `Region ${region.id} balanceTargets.defensePressure.minArmorBreaks`
  );
  validateOptionalNonNegativeNumber(
    errors,
    targets.minDamagePrevented,
    `Region ${region.id} balanceTargets.defensePressure.minDamagePrevented`
  );

  return errors;
}

function validateHealingPressureTargets(region: RegionDefinition): string[] {
  const targets = region.balanceTargets?.healingPressure;

  if (targets === undefined) {
    return [];
  }

  if (!isRecord(targets)) {
    return [`Region ${region.id} balanceTargets.healingPressure must be an object`];
  }

  const errors: string[] = [];
  validateOptionalNonNegativeNumber(
    errors,
    targets.minHeals,
    `Region ${region.id} balanceTargets.healingPressure.minHeals`
  );
  validateOptionalNonNegativeNumber(
    errors,
    targets.minOuterHealing,
    `Region ${region.id} balanceTargets.healingPressure.minOuterHealing`
  );
  validateOptionalNonNegativeNumber(
    errors,
    targets.minCleanses,
    `Region ${region.id} balanceTargets.healingPressure.minCleanses`
  );
  validateOptionalNonNegativeNumber(
    errors,
    targets.maxRecoveryPrevented,
    `Region ${region.id} balanceTargets.healingPressure.maxRecoveryPrevented`
  );

  return errors;
}

function validateBossGateTargets(region: RegionDefinition): string[] {
  const targets = region.balanceTargets?.bossGate;

  if (targets === undefined) {
    return [];
  }

  if (!isRecord(targets)) {
    return [`Region ${region.id} balanceTargets.bossGate must be an object`];
  }

  const errors: string[] = [];
  validateOptionalResultExpectation(
    errors,
    targets.baselineResult,
    `Region ${region.id} balanceTargets.bossGate.baselineResult`
  );
  validateOptionalResultExpectation(
    errors,
    targets.trainedResult,
    `Region ${region.id} balanceTargets.bossGate.trainedResult`
  );
  validateOptionalResultExpectation(
    errors,
    targets.farmedResult,
    `Region ${region.id} balanceTargets.bossGate.farmedResult`
  );
  validateOptionalNonNegativeNumber(
    errors,
    targets.maxFarmClears,
    `Region ${region.id} balanceTargets.bossGate.maxFarmClears`
  );
  validateOptionalNonNegativeNumber(
    errors,
    targets.maxTrainingCost,
    `Region ${region.id} balanceTargets.bossGate.maxTrainingCost`
  );
  validateOptionalNonNegativeNumber(
    errors,
    targets.maxMedicineConsumed,
    `Region ${region.id} balanceTargets.bossGate.maxMedicineConsumed`
  );
  validateOptionalNonNegativeNumber(
    errors,
    targets.maxStatusDamage,
    `Region ${region.id} balanceTargets.bossGate.maxStatusDamage`
  );

  if (targets.clearTimeSeconds !== undefined) {
    errors.push(
      ...validateClearTimeTargetRange(
        `Region ${region.id} balanceTargets.bossGate.clearTimeSeconds`,
        targets.clearTimeSeconds
      )
    );
  }

  return errors;
}

function validateOptionalResultExpectation(
  errors: string[],
  value: unknown,
  ownerLabel: string
): void {
  if (
    value !== undefined &&
    !BALANCE_RESULT_EXPECTATIONS.includes(
      value as (typeof BALANCE_RESULT_EXPECTATIONS)[number]
    )
  ) {
    errors.push(
      `${ownerLabel} must be one of ${BALANCE_RESULT_EXPECTATIONS.join(", ")}`
    );
  }
}

function validateOptionalNonNegativeNumber(
  errors: string[],
  value: unknown,
  ownerLabel: string
): void {
  if (value === undefined) {
    return;
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors.push(`${ownerLabel} must be a finite number`);
    return;
  }

  if (value < 0) {
    errors.push(`${ownerLabel} must be non-negative`);
  }
}

function validateMinMaxPair(
  errors: string[],
  minValue: unknown,
  maxValue: unknown,
  ownerLabel: string
): void {
  if (
    typeof minValue === "number" &&
    Number.isFinite(minValue) &&
    typeof maxValue === "number" &&
    Number.isFinite(maxValue) &&
    minValue > maxValue
  ) {
    errors.push(`${ownerLabel}.min must be less than or equal to max`);
  }
}

export function validateStageEnemyRefs(
  stages: StageDefinition[],
  context: Pick<StaticDataValidationContext, "enemyIds">
): string[] {
  return stages.flatMap((stage) =>
    stage.enemyTeam.combatantIds
      .filter((enemyId) => !context.enemyIds.has(enemyId))
      .map((enemyId) => `Stage ${stage.id} references missing enemy ${enemyId}`)
  );
}

export function validateStageEquipmentRefs(
  stages: StageDefinition[],
  context: Pick<StaticDataValidationContext, "equipmentIds">
): string[] {
  return stages.flatMap((stage) =>
    (stage.equipmentDrops ?? []).flatMap((drop) =>
      context.equipmentIds.has(drop.equipmentId)
        ? []
        : [`Stage ${stage.id} references missing equipment ${drop.equipmentId}`]
    )
  );
}

export function validateStageRegionRefs(
  stages: StageDefinition[],
  context: Pick<StaticDataValidationContext, "regionIds">
): string[] {
  return stages.flatMap((stage) =>
    context.regionIds.has(stage.regionId)
      ? []
      : [`Stage ${stage.id} references missing region ${stage.regionId}`]
  );
}

export function validateStageNextRefs(
  stages: StageDefinition[],
  context: Pick<StaticDataValidationContext, "stageIds">
): string[] {
  return stages.flatMap((stage) =>
    stage.nextStageId === null || context.stageIds.has(stage.nextStageId)
      ? []
      : [`Stage ${stage.id} references missing next stage ${stage.nextStageId}`]
  );
}

export function validateRegionStageRefs(
  regions: RegionDefinition[],
  context: Pick<StaticDataValidationContext, "stageIds">
): string[] {
  return regions.flatMap((region) =>
    region.stageIds
      .filter((stageId) => !context.stageIds.has(stageId))
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
