import {
  EQUIPMENT_SLOTS,
  getActiveEquipmentSetBonuses,
  getAvailableEquipmentCopyCount,
  getEquipmentInventoryCount,
  isHeroUnlocked
} from "../../../core";
import type { EquipmentSlot, PlayerProgress, StaticGameData } from "../../../core";
import type { EquipmentInventoryItemView, HeroEquipmentView } from "../types";

function formatStatName(stat: string): string {
  return stat.replace(/[A-Z]/g, (match) => ` ${match}`).replace(/^./, (match) =>
    match.toUpperCase()
  );
}

function formatMasteryPercent(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    signDisplay: "always",
    style: "percent"
  }).format(value);
}

function formatEquipmentSlot(slot: EquipmentSlot): string {
  return slot.charAt(0).toUpperCase() + slot.slice(1);
}

function formatEquipmentEffect(
  effect: StaticGameData["equipment"][number]["effects"][number]
): string {
  if (effect.mode === "multiplier") {
    return `${formatMasteryPercent(effect.value)} ${formatStatName(effect.stat)}`;
  }

  if (
    effect.stat === "critChance" ||
    effect.stat === "critDamage" ||
    effect.stat === "breakPower" ||
    effect.stat === "breakResist" ||
    effect.stat === "innerRecoveryRate"
  ) {
    return `${formatMasteryPercent(effect.value)} ${formatStatName(effect.stat)}`;
  }

  return `${effect.value >= 0 ? "+" : ""}${effect.value} ${formatStatName(
    effect.stat
  )}`;
}

function formatEquipmentSetBonus(
  set: NonNullable<StaticGameData["equipmentSets"]>[number],
  bonus: NonNullable<StaticGameData["equipmentSets"]>[number]["bonuses"][number]
): string {
  return `${set.name} ${bonus.pieces}-piece: ${bonus.effects
    .map(formatEquipmentEffect)
    .join(", ")}`;
}

export function buildEquipmentInventoryViews(
  data: StaticGameData,
  progress: PlayerProgress
): EquipmentInventoryItemView[] {
  const styleNames = new Map(data.styles.map((style) => [style.id, style.name]));
  const equipmentSetById = new Map(
    (data.equipmentSets ?? []).map((set) => [set.id, set])
  );

  return data.equipment.flatMap((equipment) => {
    const count = getEquipmentInventoryCount(progress, equipment.id);
    const set = equipment.setId
      ? equipmentSetById.get(equipment.setId) ?? null
      : null;

    if (count <= 0) {
      return [];
    }

    return [
      {
        equipmentId: equipment.id,
        name: equipment.name,
        slot: equipment.slot,
        rarity: equipment.rarity,
        count,
        availableCount: getAvailableEquipmentCopyCount(progress, equipment.id),
        allowedStyles: equipment.allowedStyles.map(
          (styleId) => styleNames.get(styleId) ?? styleId
        ),
        effects: equipment.effects.map(formatEquipmentEffect),
        affixes: (equipment.affixes ?? []).map(
          (affix) =>
            `${affix.name}: ${affix.effects.map(formatEquipmentEffect).join(", ")}`
        ),
        setName: set?.name ?? null,
        setBonuses: set?.bonuses.map((bonus) =>
          formatEquipmentSetBonus(set, bonus)
        ) ?? [],
        compatibleHeroIds: data.heroes
          .filter(
            (hero) =>
              isHeroUnlocked(data, progress, hero) &&
              equipment.allowedStyles.includes(hero.style) &&
              getAvailableEquipmentCopyCount(
                progress,
                equipment.id,
                hero.id,
                equipment.slot
              ) > 0
          )
          .map((hero) => hero.id)
      }
    ];
  });
}

export function buildHeroEquipmentViews(
  data: StaticGameData,
  progress: PlayerProgress
): HeroEquipmentView[] {
  const equipped = progress.equipment?.equipped ?? {};
  const equipmentById = new Map(
    data.equipment.map((equipment) => [equipment.id, equipment])
  );
  const equipmentSetById = new Map(
    (data.equipmentSets ?? []).map((set) => [set.id, set])
  );

  return data.heroes
    .filter((hero) => isHeroUnlocked(data, progress, hero))
    .map((hero) => ({
      heroId: hero.id,
      name: hero.name,
      style: hero.style,
      slots: EQUIPMENT_SLOTS.map((slot) => {
        const equipmentId = equipped[hero.id]?.[slot] ?? null;
        const equipment = equipmentId ? equipmentById.get(equipmentId) : null;

        return {
          slot,
          label: formatEquipmentSlot(slot),
          equipmentId,
          name: equipment?.name ?? null,
          rarity: equipment?.rarity ?? null,
          setName: equipment?.setId
            ? equipmentSetById.get(equipment.setId)?.name ?? null
            : null
        };
      }),
      activeSetBonuses: getActiveEquipmentSetBonuses(
        data.equipment,
        data.equipmentSets,
        progress.equipment,
        hero.id
      ).map(
        (bonus) =>
          `${bonus.name} ${bonus.requiredPieces}-piece: ${bonus.effects
            .map(formatEquipmentEffect)
            .join(", ")}`
      )
    }));
}
