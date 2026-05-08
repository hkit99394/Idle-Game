import type {
  EnemyDefinition,
  MedicineDefinition,
  SkillDefinition,
  StageDefinition
} from "../data";
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

type AutoMedicineCleanseInput = {
  medicines: MedicineDefinition[];
  inventory: MedicineInventory;
  activeStatuses: ActiveStatusEffect[];
  statusDefinitions: Record<string, StatusEffectDefinition>;
  trigger: Extract<AutoMedicineTrigger, "battle_cleanse" | "post_battle_cleanse">;
  alreadyUsedMedicineIds?: string[];
};

type AutoMedicinePreBattleResistanceInput = {
  medicines: MedicineDefinition[];
  inventory: MedicineInventory;
  stage: StageDefinition;
  enemies: EnemyDefinition[];
  skills: SkillDefinition[];
  statusDefinitions: Record<string, StatusEffectDefinition>;
  alreadyUsedMedicineIds?: string[];
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

export function applyAutoCleanseMedicine(
  input: AutoMedicineCleanseInput
): AutoMedicineResult {
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
  const usedIds = new Set(input.alreadyUsedMedicineIds ?? []);
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
        usedIds.has(medicine.id)
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
  if (getStageStatusPressureIds(input).length === 0) {
    return null;
  }

  const usedIds = new Set(input.alreadyUsedMedicineIds ?? []);
  const candidates = input.medicines
    .flatMap((medicine): ResistanceCandidate[] => {
      if ((input.inventory[medicine.id] ?? 0) <= 0 || usedIds.has(medicine.id)) {
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
