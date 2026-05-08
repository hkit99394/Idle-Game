import type {
  EnemyDefinition,
  MedicineDefinition,
  SkillDefinition,
  StageDefinition,
  StaticGameData
} from "../data";
import type { PlayerProgress, RegionProgress } from "../progression";
import {
  useMedicineCounterplay,
  type MedicineInventory,
  type MedicineUseSuccess
} from "./medicine";
import type {
  ActiveStatusEffect,
  StatusDispelTag,
  StatusEffectDefinition
} from "./types";

export type AutoMedicineTrigger =
  | "battle_cleanse"
  | "post_battle_cleanse"
  | "pre_battle_resistance";

export type AutoMedicineSkippedReason =
  | "automation_locked"
  | "no_active_statuses"
  | "no_owned_match"
  | "no_status_pressure";

export type AutoMedicineUseSummary = {
  trigger: AutoMedicineTrigger;
  medicineId: string;
  cleansedStatusIds: string[];
  statusResistanceBonus: number;
  statusResistanceDurationSeconds: number;
};

export type AutoMedicineResult = {
  inventory: MedicineInventory;
  statuses: ActiveStatusEffect[];
  usedMedicine: AutoMedicineUseSummary | null;
  skippedReason: AutoMedicineSkippedReason | null;
};

export type AutoMedicinePreferences = {
  enabled: boolean;
  battleCleanseEnabled: boolean;
  postBattleCleanseEnabled: boolean;
  preBattleResistanceEnabled: boolean;
  disabledMedicineIds: string[];
};

export const defaultAutoMedicinePreferences: AutoMedicinePreferences = {
  enabled: true,
  battleCleanseEnabled: true,
  postBattleCleanseEnabled: true,
  preBattleResistanceEnabled: true,
  disabledMedicineIds: []
};

export const AUTO_MEDICINE_ON_LABEL = "Auto On" as const;
export const AUTO_MEDICINE_OFF_LABEL = "Auto Off" as const;

export type AutoMedicineToggleLabel =
  | typeof AUTO_MEDICINE_ON_LABEL
  | typeof AUTO_MEDICINE_OFF_LABEL;

export type AutoMedicineUnlockInput = {
  medicines: MedicineDefinition[];
  inventory: MedicineInventory;
  progress?: PlayerProgress | RegionProgress;
  stages?: StaticGameData["stages"];
  automationUnlocked?: boolean;
};

type AutoMedicineCleanseInput = AutoMedicineUnlockInput & {
  activeStatuses: ActiveStatusEffect[];
  statusDefinitions: Record<string, StatusEffectDefinition>;
  trigger: Extract<AutoMedicineTrigger, "battle_cleanse" | "post_battle_cleanse">;
  alreadyUsedMedicineIds?: string[];
  preferences?: AutoMedicinePreferences;
};

type AutoMedicinePreBattleResistanceInput = AutoMedicineUnlockInput & {
  stage: StageDefinition;
  enemies: EnemyDefinition[];
  skills: SkillDefinition[];
  statusDefinitions: Record<string, StatusEffectDefinition>;
  alreadyUsedMedicineIds?: string[];
  preferences?: AutoMedicinePreferences;
};

type CleanseCandidate = {
  medicine: MedicineDefinition;
  matchingStatusCount: number;
  cleanseBreadth: number;
  maxCleanseCount: number;
};

type ResistanceCandidate = {
  medicine: MedicineDefinition;
  resistanceBonus: number;
  durationSeconds: number;
};

export function isAutoMedicineUnlocked(input: AutoMedicineUnlockInput): boolean {
  if (input.automationUnlocked !== undefined) {
    return input.automationUnlocked;
  }

  if (hasOwnedMedicine(input.medicines, input.inventory)) {
    return true;
  }

  if (input.progress === undefined || input.stages === undefined) {
    return false;
  }

  return input.medicines.some((medicine) =>
    isMedicineUnlockConditionMet(input.progress, input.stages, medicine)
  );
}

export function isMedicineAutoUseEnabled(
  preferences: AutoMedicinePreferences | undefined,
  medicineId: string
): boolean {
  const resolved = preferences ?? defaultAutoMedicinePreferences;

  return (
    resolved.enabled &&
    !resolved.disabledMedicineIds.includes(medicineId)
  );
}

export function getMedicineAutoUseLabel(
  preferences: AutoMedicinePreferences | undefined,
  medicineId: string
): AutoMedicineToggleLabel {
  return isMedicineAutoUseEnabled(preferences, medicineId)
    ? AUTO_MEDICINE_ON_LABEL
    : AUTO_MEDICINE_OFF_LABEL;
}

export function setMedicineAutoUsePreference(
  preferences: AutoMedicinePreferences | undefined,
  medicineId: string,
  enabled: boolean
): AutoMedicinePreferences {
  const resolved = preferences ?? defaultAutoMedicinePreferences;
  const disabledMedicineIds = new Set(resolved.disabledMedicineIds);

  if (enabled) {
    disabledMedicineIds.delete(medicineId);
  } else {
    disabledMedicineIds.add(medicineId);
  }

  return {
    ...resolved,
    disabledMedicineIds: [...disabledMedicineIds].sort()
  };
}

export function applyAutoCleanseMedicine(
  input: AutoMedicineCleanseInput
): AutoMedicineResult {
  if (!isAutoMedicineUnlocked(input)) {
    return skipAutoMedicine(
      input.inventory,
      input.activeStatuses,
      "automation_locked"
    );
  }

  if (!isAutoMedicineTriggerEnabled(input.preferences, input.trigger)) {
    return skipAutoMedicine(
      input.inventory,
      input.activeStatuses,
      "no_owned_match"
    );
  }

  if (input.activeStatuses.length === 0) {
    return skipAutoMedicine(
      input.inventory,
      input.activeStatuses,
      "no_active_statuses"
    );
  }

  const medicine = selectAutoCleanseMedicine(input);

  if (medicine === null) {
    return skipAutoMedicine(
      input.inventory,
      input.activeStatuses,
      "no_owned_match"
    );
  }

  const result = useMedicineCounterplay({
    medicine,
    inventory: input.inventory,
    activeStatuses: input.activeStatuses,
    statusDefinitions: input.statusDefinitions
  });

  if (!result.ok) {
    return skipAutoMedicine(
      input.inventory,
      input.activeStatuses,
      "no_owned_match"
    );
  }

  return {
    inventory: result.inventory,
    statuses: result.statuses,
    usedMedicine: buildUseSummary(input.trigger, result),
    skippedReason: null
  };
}

export function applyAutoPreBattleResistanceMedicine(
  input: AutoMedicinePreBattleResistanceInput
): AutoMedicineResult {
  if (!isAutoMedicineUnlocked(input)) {
    return skipAutoMedicine(input.inventory, [], "automation_locked");
  }

  if (
    !isAutoMedicineTriggerEnabled(
      input.preferences,
      "pre_battle_resistance"
    )
  ) {
    return skipAutoMedicine(input.inventory, [], "no_owned_match");
  }

  if (getStageStatusPressureIds(input).length === 0) {
    return skipAutoMedicine(input.inventory, [], "no_status_pressure");
  }

  const medicine = selectAutoPreBattleResistanceMedicine(input);

  if (medicine === null) {
    return skipAutoMedicine(input.inventory, [], "no_owned_match");
  }

  const result = useMedicineCounterplay({
    medicine,
    inventory: input.inventory,
    activeStatuses: [],
    statusDefinitions: input.statusDefinitions
  });

  if (!result.ok) {
    return skipAutoMedicine(input.inventory, [], "no_owned_match");
  }

  return {
    inventory: result.inventory,
    statuses: result.statuses,
    usedMedicine: buildUseSummary("pre_battle_resistance", result),
    skippedReason: null
  };
}

export function selectAutoCleanseMedicine(
  input: Omit<AutoMedicineCleanseInput, "trigger">
): MedicineDefinition | null {
  if (!isAutoMedicineUnlocked(input)) {
    return null;
  }

  if (input.preferences !== undefined && !input.preferences.enabled) {
    return null;
  }

  const usedIds = new Set(input.alreadyUsedMedicineIds ?? []);
  const disabledIds = new Set(input.preferences?.disabledMedicineIds ?? []);
  const candidates = input.medicines
    .flatMap((medicine): CleanseCandidate[] => {
      const candidate = getCleanseCandidate({
        medicine,
        activeStatuses: input.activeStatuses,
        statusDefinitions: input.statusDefinitions
      });

      if (
        candidate === null ||
        (input.inventory[medicine.id] ?? 0) <= 0 ||
        usedIds.has(medicine.id) ||
        disabledIds.has(medicine.id)
      ) {
        return [];
      }

      return [candidate];
    })
    .sort(compareCleanseCandidates);

  return candidates[0]?.medicine ?? null;
}

export function selectAutoPreBattleResistanceMedicine(
  input: AutoMedicinePreBattleResistanceInput
): MedicineDefinition | null {
  if (!isAutoMedicineUnlocked(input)) {
    return null;
  }

  if (
    !isAutoMedicineTriggerEnabled(
      input.preferences,
      "pre_battle_resistance"
    )
  ) {
    return null;
  }

  if (getStageStatusPressureIds(input).length === 0) {
    return null;
  }

  const usedIds = new Set(input.alreadyUsedMedicineIds ?? []);
  const disabledIds = new Set(input.preferences?.disabledMedicineIds ?? []);
  const candidates = input.medicines
    .flatMap((medicine): ResistanceCandidate[] => {
      if (
        (input.inventory[medicine.id] ?? 0) <= 0 ||
        usedIds.has(medicine.id) ||
        disabledIds.has(medicine.id)
      ) {
        return [];
      }

      const candidate = getResistanceCandidate(medicine);

      return candidate === null ? [] : [candidate];
    })
    .sort(compareResistanceCandidates);

  return candidates[0]?.medicine ?? null;
}

export function getStageStatusPressureIds(input: {
  stage: StageDefinition;
  enemies: EnemyDefinition[];
  skills: SkillDefinition[];
}): string[] {
  const enemyById = new Map(input.enemies.map((enemy) => [enemy.id, enemy]));
  const skillById = new Map(input.skills.map((skill) => [skill.id, skill]));
  const statusIds = new Set<string>();

  for (const enemyId of input.stage.enemyTeam.combatantIds) {
    const enemy = enemyById.get(enemyId);

    if (enemy === undefined) {
      continue;
    }

    for (const skillId of enemy.skillIds) {
      const skill = skillById.get(skillId);

      if (skill === undefined) {
        continue;
      }

      for (const effect of skill.effects) {
        if (effect.type === "apply_status" && effect.statusId !== undefined) {
          statusIds.add(effect.statusId);
        }
      }
    }
  }

  return [...statusIds].sort();
}

function getCleanseCandidate(input: {
  medicine: MedicineDefinition;
  activeStatuses: ActiveStatusEffect[];
  statusDefinitions: Record<string, StatusEffectDefinition>;
}): CleanseCandidate | null {
  const matchingStatusIds = new Set<string>();
  const cleanseTags = new Set<StatusDispelTag>();
  let maxCleanseCount = 0;

  for (const effect of input.medicine.effects) {
    if (effect.type !== "cleanse_status") {
      continue;
    }

    for (const tag of effect.dispelTags) {
      cleanseTags.add(tag);
    }

    maxCleanseCount += effect.maxCount ?? Number.POSITIVE_INFINITY;

    for (const status of input.activeStatuses) {
      const definition = input.statusDefinitions[status.statusId];

      if (
        definition !== undefined &&
        canCleanseStatus(effect.dispelTags, definition)
      ) {
        matchingStatusIds.add(status.statusId);
      }
    }
  }

  if (matchingStatusIds.size === 0) {
    return null;
  }

  return {
    medicine: input.medicine,
    matchingStatusCount: matchingStatusIds.size,
    cleanseBreadth: getCleanseBreadth(cleanseTags),
    maxCleanseCount
  };
}

function getResistanceCandidate(
  medicine: MedicineDefinition
): ResistanceCandidate | null {
  let resistanceBonus = 0;
  let durationSeconds = 0;

  for (const effect of medicine.effects) {
    if (effect.type !== "status_resistance_bonus") {
      continue;
    }

    resistanceBonus += effect.value;
    durationSeconds = Math.max(durationSeconds, effect.durationSeconds);
  }

  if (resistanceBonus <= 0) {
    return null;
  }

  return {
    medicine,
    resistanceBonus,
    durationSeconds
  };
}

function canCleanseStatus(
  dispelTags: StatusDispelTag[],
  status: StatusEffectDefinition
): boolean {
  return dispelTags.some((tag) => status.dispelTags.includes(tag));
}

function getCleanseBreadth(tags: Set<StatusDispelTag>): number {
  return tags.has("debuff") ? 100 + tags.size : tags.size;
}

function compareCleanseCandidates(
  left: CleanseCandidate,
  right: CleanseCandidate
): number {
  return (
    left.cleanseBreadth - right.cleanseBreadth ||
    right.matchingStatusCount - left.matchingStatusCount ||
    right.maxCleanseCount - left.maxCleanseCount ||
    left.medicine.id.localeCompare(right.medicine.id)
  );
}

function compareResistanceCandidates(
  left: ResistanceCandidate,
  right: ResistanceCandidate
): number {
  return (
    right.resistanceBonus - left.resistanceBonus ||
    right.durationSeconds - left.durationSeconds ||
    left.medicine.id.localeCompare(right.medicine.id)
  );
}

function buildUseSummary(
  trigger: AutoMedicineTrigger,
  result: MedicineUseSuccess
): AutoMedicineUseSummary {
  return {
    trigger,
    medicineId: result.consumedMedicineId,
    cleansedStatusIds: result.cleansed.map((status) => status.statusId),
    statusResistanceBonus: result.statusResistanceBonus,
    statusResistanceDurationSeconds: result.statusResistanceDurationSeconds
  };
}

function hasOwnedMedicine(
  medicines: MedicineDefinition[],
  inventory: MedicineInventory
): boolean {
  const medicineIds = new Set(medicines.map((medicine) => medicine.id));

  return Object.entries(inventory).some(
    ([medicineId, count]) => medicineIds.has(medicineId) && (count ?? 0) > 0
  );
}

function isMedicineUnlockConditionMet(
  progress: PlayerProgress | RegionProgress | undefined,
  stages: StaticGameData["stages"] | undefined,
  medicine: MedicineDefinition
): boolean {
  if (medicine.unlock.type === "always") {
    return true;
  }

  if (progress === undefined || stages === undefined) {
    return false;
  }

  if (medicine.unlock.type !== "stage_cleared") {
    return false;
  }

  const stageId = medicine.unlock.stageId;
  const stage = stages.find((candidate) => candidate.id === stageId);

  if (stage === undefined) {
    return false;
  }

  const maps =
    typeof (progress as PlayerProgress).currentStageId === "string" &&
    typeof (progress as PlayerProgress).maps === "object"
      ? (progress as PlayerProgress).maps
      : (progress as RegionProgress);

  return (
    (maps[stage.regionId]?.highestClearedStageIndex ?? 0) >= stage.index
  );
}

function isAutoMedicineTriggerEnabled(
  preferences: AutoMedicinePreferences | undefined,
  trigger: AutoMedicineTrigger
): boolean {
  const resolved = preferences ?? defaultAutoMedicinePreferences;

  if (!resolved.enabled) {
    return false;
  }

  if (trigger === "battle_cleanse") {
    return resolved.battleCleanseEnabled;
  }

  if (trigger === "post_battle_cleanse") {
    return resolved.postBattleCleanseEnabled;
  }

  return resolved.preBattleResistanceEnabled;
}

function skipAutoMedicine(
  inventory: MedicineInventory,
  statuses: ActiveStatusEffect[],
  skippedReason: AutoMedicineSkippedReason
): AutoMedicineResult {
  return {
    inventory,
    statuses,
    usedMedicine: null,
    skippedReason
  };
}
