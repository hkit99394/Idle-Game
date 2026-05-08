import type { BaseStats, MartialStyleId } from "../combat";
import type {
  EquipmentDefinition,
  EquipmentEffect,
  EquipmentSetDefinition,
  EquipmentSlot,
  HeroDefinition,
  StageEquipmentDrop,
  StaticGameData
} from "../data";
import { cloneProgress } from "./progress";
import type {
  EquipHeroEquipmentInput,
  EquipHeroEquipmentResult,
  EquipmentProgress,
  PlayerProgress
} from "./types";

export const EQUIPMENT_SLOTS = [
  "weapon",
  "armor",
  "manual",
  "medicine"
] as const satisfies EquipmentSlot[];

export function getEquipmentProgress(
  progress: PlayerProgress
): EquipmentProgress {
  return progress.equipment ?? {
    inventory: {},
    equipped: {}
  };
}

export function getEquipmentInventoryCount(
  progress: PlayerProgress,
  equipmentId: string
): number {
  return getEquipmentProgress(progress).inventory[equipmentId] ?? 0;
}

function getEquippedEquipmentIds(progress: PlayerProgress): string[] {
  return Object.values(getEquipmentProgress(progress).equipped).flatMap((slots) =>
    Object.values(slots).filter((equipmentId): equipmentId is string =>
      Boolean(equipmentId)
    )
  );
}

export function getEquippedCopyCount(
  progress: PlayerProgress,
  equipmentId: string,
  exceptHeroId?: string,
  exceptSlot?: EquipmentSlot
): number {
  return Object.entries(getEquipmentProgress(progress).equipped).reduce(
    (count, [heroId, slots]) =>
      count +
      Object.entries(slots).filter(
        ([slot, equippedId]) =>
          equippedId === equipmentId &&
          !(heroId === exceptHeroId && slot === exceptSlot)
      ).length,
    0
  );
}

export function getAvailableEquipmentCopyCount(
  progress: PlayerProgress,
  equipmentId: string,
  exceptHeroId?: string,
  exceptSlot?: EquipmentSlot
): number {
  return Math.max(
    0,
    getEquipmentInventoryCount(progress, equipmentId) -
      getEquippedCopyCount(progress, equipmentId, exceptHeroId, exceptSlot)
  );
}

export function addEquipmentDropsToInventory(
  progress: PlayerProgress,
  drops: StageEquipmentDrop[] = []
): Array<{ equipmentId: string; quantity: number }> {
  if (drops.length === 0) {
    return [];
  }

  progress.equipment ??= {
    inventory: {},
    equipped: {}
  };

  for (const drop of drops) {
    progress.equipment.inventory[drop.equipmentId] =
      (progress.equipment.inventory[drop.equipmentId] ?? 0) + drop.quantity;
  }

  return drops.map((drop) => ({
    equipmentId: drop.equipmentId,
    quantity: drop.quantity
  }));
}

export function isEquipmentCompatibleWithStyle(
  equipment: EquipmentDefinition,
  style: string | undefined
): style is MartialStyleId {
  return Boolean(
    style && equipment.allowedStyles.includes(style as MartialStyleId)
  );
}

export function isEquipmentCompatibleWithHero(
  equipment: EquipmentDefinition,
  hero: Pick<HeroDefinition, "style">
): boolean {
  return isEquipmentCompatibleWithStyle(equipment, hero.style);
}

export function equipHeroEquipment(
  data: Pick<StaticGameData, "heroes" | "equipment">,
  input: EquipHeroEquipmentInput
): EquipHeroEquipmentResult {
  const hero = data.heroes.find((candidate) => candidate.id === input.heroId);

  if (!hero) {
    return {
      ok: false,
      reason: "missing_hero",
      progress: input.progress
    };
  }

  const equipment = data.equipment.find(
    (candidate) => candidate.id === input.equipmentId
  );

  if (!equipment) {
    return {
      ok: false,
      reason: "missing_equipment",
      progress: input.progress
    };
  }

  if (getEquipmentInventoryCount(input.progress, equipment.id) <= 0) {
    return {
      ok: false,
      reason: "not_owned",
      progress: input.progress
    };
  }

  if (!isEquipmentCompatibleWithHero(equipment, hero)) {
    return {
      ok: false,
      reason: "incompatible_style",
      progress: input.progress
    };
  }

  if (
    getAvailableEquipmentCopyCount(
      input.progress,
      equipment.id,
      hero.id,
      equipment.slot
    ) <= 0
  ) {
    return {
      ok: false,
      reason: "not_enough_copies",
      progress: input.progress
    };
  }

  const nextProgress = cloneProgress(input.progress);
  nextProgress.equipment ??= {
    inventory: {},
    equipped: {}
  };
  nextProgress.equipment.equipped[hero.id] ??= {};
  nextProgress.equipment.equipped[hero.id][equipment.slot] = equipment.id;

  return {
    ok: true,
    progress: nextProgress,
    heroId: hero.id,
    equipmentId: equipment.id,
    slot: equipment.slot
  };
}

export function getHeroEquippedEquipment(
  data: Pick<StaticGameData, "equipment">,
  progress: PlayerProgress,
  heroId: string
): EquipmentDefinition[] {
  const equipped = getEquipmentProgress(progress).equipped[heroId] ?? {};

  return EQUIPMENT_SLOTS.flatMap((slot) => {
    const equipmentId = equipped[slot];
    const equipment = data.equipment.find(
      (candidate) => candidate.id === equipmentId
    );

    return equipment ? [equipment] : [];
  });
}

function applyEquipmentEffects(stats: BaseStats, effects: EquipmentEffect[]): void {
  for (const effect of effects) {
    if (effect.mode === "flat") {
      stats[effect.stat] += effect.value;
    } else {
      stats[effect.stat] *= 1 + effect.value;
    }
  }
}

export function getEquipmentEffects(
  equipment: EquipmentDefinition
): EquipmentEffect[] {
  return [
    ...equipment.effects,
    ...(equipment.affixes ?? []).flatMap((affix) => affix.effects)
  ];
}

export type ActiveEquipmentSetBonus = {
  setId: string;
  name: string;
  pieces: number;
  requiredPieces: number;
  effects: EquipmentEffect[];
};

export function getActiveEquipmentSetBonuses(
  equipmentDefinitions: EquipmentDefinition[] | undefined,
  equipmentSetDefinitions: EquipmentSetDefinition[] | undefined,
  equipmentProgress: EquipmentProgress | undefined,
  heroId: string | undefined
): ActiveEquipmentSetBonus[] {
  if (
    !equipmentDefinitions ||
    !equipmentSetDefinitions ||
    !equipmentProgress ||
    !heroId
  ) {
    return [];
  }

  const equippedIds = Object.values(equipmentProgress.equipped[heroId] ?? {});
  const equipmentById = new Map(
    equipmentDefinitions.map((equipment) => [equipment.id, equipment])
  );
  const piecesBySetId = new Map<string, number>();

  for (const equipmentId of equippedIds) {
    const setId = equipmentById.get(equipmentId)?.setId;

    if (setId) {
      piecesBySetId.set(setId, (piecesBySetId.get(setId) ?? 0) + 1);
    }
  }

  return equipmentSetDefinitions.flatMap((set) => {
    const pieces = piecesBySetId.get(set.id) ?? 0;

    return set.bonuses.flatMap((bonus) =>
      pieces >= bonus.pieces
        ? [
            {
              setId: set.id,
              name: set.name,
              pieces,
              requiredPieces: bonus.pieces,
              effects: bonus.effects
            }
          ]
        : []
    );
  });
}

export function applyEquipmentBonuses(
  stats: BaseStats,
  equipmentDefinitions: EquipmentDefinition[] | undefined,
  equipmentProgress: EquipmentProgress | undefined,
  heroId: string | undefined,
  equipmentSetDefinitions?: EquipmentSetDefinition[]
): void {
  if (!equipmentDefinitions || !equipmentProgress || !heroId) {
    return;
  }

  const equippedIds = Object.values(equipmentProgress.equipped[heroId] ?? {});
  const equipmentById = new Map(
    equipmentDefinitions.map((equipment) => [equipment.id, equipment])
  );

  for (const equipmentId of equippedIds) {
    const equipment = equipmentById.get(equipmentId);

    if (!equipment) {
      continue;
    }

    applyEquipmentEffects(stats, getEquipmentEffects(equipment));
  }

  for (const bonus of getActiveEquipmentSetBonuses(
    equipmentDefinitions,
    equipmentSetDefinitions,
    equipmentProgress,
    heroId
  )) {
    applyEquipmentEffects(stats, bonus.effects);
  }
}

export function getEquippedEquipmentIdsForSave(progress: PlayerProgress): string[] {
  return getEquippedEquipmentIds(progress);
}
