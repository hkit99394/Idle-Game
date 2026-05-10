import type { EquipmentRarity, EquipmentSlot } from "../../../core";

export type EquipmentInventoryItemView = {
  equipmentId: string;
  name: string;
  slot: EquipmentSlot;
  rarity: EquipmentRarity;
  count: number;
  availableCount: number;
  allowedStyles: string[];
  effects: string[];
  affixes: string[];
  setName: string | null;
  setBonuses: string[];
  compatibleHeroIds: string[];
};

export type HeroEquipmentSlotView = {
  slot: EquipmentSlot;
  label: string;
  equipmentId: string | null;
  name: string | null;
  rarity: EquipmentRarity | null;
  setName: string | null;
};

export type HeroEquipmentView = {
  heroId: string;
  name: string;
  style: string;
  slots: HeroEquipmentSlotView[];
  activeSetBonuses: string[];
};
