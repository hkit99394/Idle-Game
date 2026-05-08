import {
  defaultAutoMedicinePreferences,
  getMedicineAutoUseLabel,
  getPreBattleResistanceModeLabel,
  getPreBattleResistancePolicyDecision,
  getStageStatusPressureIds,
  isMedicineAutoUseEnabled,
  selectAutoCleanseMedicine,
  selectAutoPreBattleResistanceMedicine,
  type AutoMedicinePreferences,
  type AutoMedicineToggleLabel,
  type MedicineInventory,
  type PreBattleResistanceMode
} from "../combat";
import type {
  EnemyDefinition,
  MedicineDefinition,
  SkillDefinition,
  StageDefinition,
  StaticGameData
} from "../data";
import type { ActiveStatusEffect, StatusEffectDefinition } from "../combat";
import {
  getLotusSupportGrowthContribution,
  isStageCleared,
  type PlayerProgress,
  type RegionProgress
} from "../progression";

export type MedicineAvailability = "ready" | "empty" | "locked" | "disabled";

export type MedicineCounterplayViewModel = {
  id: string;
  name: string;
  count: number;
  maxCarry: number;
  unlocked: boolean;
  owned: boolean;
  disabled: boolean;
  autoUseEnabled: boolean;
  autoUseLabel: AutoMedicineToggleLabel;
  autoEligible: boolean;
  availability: MedicineAvailability;
  effectLabels: string[];
};

export type StageCounterplayPreview = {
  stageId: string;
  stageName: string;
  statusPressureItems: Array<{
    statusId: string;
    label: string;
    category: StatusEffectDefinition["category"];
  }>;
  statusPressureIds: string[];
  statusPressureLabels: string[];
  statusCategories: StatusEffectDefinition["category"][];
  recommendedMedicineIds: string[];
  recommendationText: string;
  supportContributionText: string | null;
  supportResistanceBonus: number;
  preBattleResistanceMode: PreBattleResistanceMode;
  preBattleResistanceModeLabel: string;
  preBattleResistancePolicyReason: string | null;
};

type CounterplayData = Pick<
  StaticGameData,
  "medicines" | "stages" | "enemies" | "skills" | "statusEffects" | "upgrades"
>;

export function buildMedicineCounterplayViewModels(input: {
  data: Pick<CounterplayData, "medicines" | "stages">;
  progress: RegionProgress;
  inventory: MedicineInventory;
  preferences?: AutoMedicinePreferences;
}): MedicineCounterplayViewModel[] {
  const preferences = input.preferences ?? defaultAutoMedicinePreferences;
  const disabledMedicineIds = new Set(preferences.disabledMedicineIds);

  return input.data.medicines.map((medicine) => {
    const count = input.inventory[medicine.id] ?? 0;
    const unlocked = isMedicineUnlocked(
      input.data,
      input.progress,
      medicine
    );
    const owned = count > 0;
    const disabled = disabledMedicineIds.has(medicine.id);
    const autoUseEnabled = isMedicineAutoUseEnabled(preferences, medicine.id);
    const autoEligible =
      autoUseEnabled &&
      unlocked &&
      owned &&
      hasAutoEffect(medicine);

    return {
      id: medicine.id,
      name: medicine.name,
      count,
      maxCarry: medicine.maxCarry,
      unlocked,
      owned,
      disabled,
      autoUseEnabled,
      autoUseLabel: getMedicineAutoUseLabel(preferences, medicine.id),
      autoEligible,
      availability: getMedicineAvailability({
        unlocked,
        owned,
        disabled
      }),
      effectLabels: medicine.effects.map(formatMedicineEffectLabel)
    };
  });
}

export function buildStageCounterplayPreview(input: {
  data: CounterplayData;
  stage: StageDefinition;
  inventory: MedicineInventory;
  progress?: Pick<PlayerProgress, "sect">;
  preferences?: AutoMedicinePreferences;
}): StageCounterplayPreview {
  const preferences = input.preferences ?? defaultAutoMedicinePreferences;
  const statusDefinitions = Object.fromEntries(
    input.data.statusEffects.map((status) => [status.id, status])
  );
  const statusPressureIds = getStageStatusPressureIds({
    stage: input.stage,
    enemies: input.data.enemies,
    skills: input.data.skills
  });
  const preBattleResistancePolicy = getPreBattleResistancePolicyDecision({
    medicines: input.data.medicines,
    inventory: input.inventory,
    stage: input.stage,
    enemies: input.data.enemies,
    skills: input.data.skills,
    statusDefinitions,
    preferences
  });
  const pressureStatuses = statusPressureIds.flatMap((statusId) => {
    const status = statusDefinitions[statusId];
    return status === undefined ? [] : [status];
  });
  const preBattleMedicine = selectAutoPreBattleResistanceMedicine({
    medicines: input.data.medicines,
    inventory: input.inventory,
    stage: input.stage,
    enemies: input.data.enemies,
    skills: input.data.skills,
    statusDefinitions,
    preferences
  });
  const cleanseMedicineIds = selectStageCleanseMedicineIds({
    medicines: input.data.medicines,
    inventory: input.inventory,
    pressureStatuses,
    statusDefinitions,
    preferences
  });
  const recommendedMedicineIds = [
    ...new Set([
      preBattleMedicine?.id,
      ...cleanseMedicineIds
    ].filter((medicineId): medicineId is string => medicineId !== undefined))
  ];
  const supportContribution = input.progress
    ? getLotusSupportGrowthContribution(input.data, input.progress)
    : null;
  const supportContributionText =
    supportContribution !== null && statusPressureIds.length > 0
      ? supportContribution.contributionText
      : null;

  return {
    stageId: input.stage.id,
    stageName: input.stage.name,
    statusPressureItems: pressureStatuses.map((status) => ({
      statusId: status.id,
      label: status.name,
      category: status.category
    })),
    statusPressureIds,
    statusPressureLabels: pressureStatuses.map((status) => status.name),
    statusCategories: [
      ...new Set(pressureStatuses.map((status) => status.category))
    ],
    recommendedMedicineIds,
    recommendationText: buildRecommendationText({
      pressureStatuses,
      recommendedMedicineIds,
      medicines: input.data.medicines
    }),
    supportContributionText,
    supportResistanceBonus: supportContribution?.effectiveResistanceBonus ?? 0,
    preBattleResistanceMode: preBattleResistancePolicy.mode,
    preBattleResistanceModeLabel: getPreBattleResistanceModeLabel(
      preBattleResistancePolicy.mode
    ),
    preBattleResistancePolicyReason: preBattleResistancePolicy.skippedReason
  };
}

function selectStageCleanseMedicineIds(input: {
  medicines: MedicineDefinition[];
  inventory: MedicineInventory;
  pressureStatuses: StatusEffectDefinition[];
  statusDefinitions: Record<string, StatusEffectDefinition>;
  preferences?: AutoMedicinePreferences;
}): string[] {
  let remainingStatuses = input.pressureStatuses.map(
    (status): ActiveStatusEffect => ({
      statusId: status.id,
      remainingSeconds: status.durationSeconds,
      stacks: 1
    })
  );
  const selectedMedicineIds: string[] = [];

  while (remainingStatuses.length > 0) {
    const medicine = selectAutoCleanseMedicine({
      medicines: input.medicines,
      inventory: input.inventory,
      activeStatuses: remainingStatuses,
      statusDefinitions: input.statusDefinitions,
      preferences: input.preferences,
      alreadyUsedMedicineIds: selectedMedicineIds
    });

    if (medicine === null) {
      break;
    }

    selectedMedicineIds.push(medicine.id);
    remainingStatuses = remainingStatuses.filter((activeStatus) => {
      const status = input.statusDefinitions[activeStatus.statusId];
      return (
        status === undefined ||
        !medicineCanCleanseStatus(medicine, status)
      );
    });
  }

  return selectedMedicineIds;
}

function isMedicineUnlocked(
  data: Pick<CounterplayData, "stages">,
  progress: RegionProgress,
  medicine: MedicineDefinition
): boolean {
  switch (medicine.unlock.type) {
    case "always":
      return true;

    case "stage_cleared":
      return isStageCleared(data, progress, medicine.unlock.stageId);

    default:
      return false;
  }
}

function hasAutoEffect(medicine: MedicineDefinition): boolean {
  return medicine.effects.some(
    (effect) =>
      effect.type === "cleanse_status" ||
      effect.type === "status_resistance_bonus"
  );
}

function getMedicineAvailability(input: {
  unlocked: boolean;
  owned: boolean;
  disabled: boolean;
}): MedicineAvailability {
  if (!input.unlocked) {
    return "locked";
  }

  if (input.disabled) {
    return "disabled";
  }

  return input.owned ? "ready" : "empty";
}

function formatMedicineEffectLabel(
  effect: MedicineDefinition["effects"][number]
): string {
  if (effect.type === "cleanse_status") {
    return `Cleanse ${effect.dispelTags.join(", ")}`;
  }

  return `+${Math.round(
    effect.value * 100
  )}% status resistance for ${effect.durationSeconds}s`;
}

function buildRecommendationText(input: {
  pressureStatuses: StatusEffectDefinition[];
  recommendedMedicineIds: string[];
  medicines: MedicineDefinition[];
}): string {
  if (input.pressureStatuses.length === 0) {
    return "No major status pressure expected.";
  }

  const pressureText = input.pressureStatuses
    .map((status) => status.name)
    .join(", ");
  const recommendedMedicineNames = input.recommendedMedicineIds.map(
    (medicineId) =>
      input.medicines.find((medicine) => medicine.id === medicineId)?.name ??
      medicineId
  );

  if (recommendedMedicineNames.length === 0) {
    return `Expected ${pressureText}. No owned auto medicine covers this stage yet.`;
  }

  return `Expected ${pressureText}. Recommended auto medicine: ${recommendedMedicineNames.join(", ")}.`;
}

function medicineCanCleanseStatus(
  medicine: MedicineDefinition,
  status: StatusEffectDefinition
): boolean {
  return medicine.effects.some(
    (effect) =>
      effect.type === "cleanse_status" &&
      effect.dispelTags.some((tag) => status.dispelTags.includes(tag))
  );
}
