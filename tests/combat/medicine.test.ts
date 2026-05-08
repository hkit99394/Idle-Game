import { describe, expect, it } from "vitest";
import {
  applyMedicineResistanceBonus,
  applyStatusEffect,
  createStatusDictionary,
  useMedicineCounterplay
} from "../../core";
import type { MedicineDefinition, StatusEffectDefinition } from "../../core";
import medicines from "../../data/medicines.json" with { type: "json" };
import statusEffects from "../../data/statusEffects.json" with { type: "json" };

const statusDefinitions = createStatusDictionary(
  statusEffects as StatusEffectDefinition[]
);
const medicineDefinitions = medicines as MedicineDefinition[];

function getMedicine(medicineId: string): MedicineDefinition {
  const medicine = medicineDefinitions.find(
    (entry) => entry.id === medicineId
  );

  if (medicine === undefined) {
    throw new Error(`Missing medicine ${medicineId}`);
  }

  return medicine;
}

describe("medicine counterplay", () => {
  it("cleanses poison and wound while consuming one medicine", () => {
    const poisoned = applyStatusEffect({
      activeStatuses: [],
      definition: statusDefinitions.poison
    }).applied;
    const wounded = applyStatusEffect({
      activeStatuses: [],
      definition: statusDefinitions.wound
    }).applied;
    const suppressed = applyStatusEffect({
      activeStatuses: [],
      definition: statusDefinitions.qi_suppression
    }).applied;

    const result = useMedicineCounterplay({
      medicine: getMedicine("clear_heart_pill"),
      inventory: {
        clear_heart_pill: 2
      },
      activeStatuses: [poisoned, wounded, suppressed],
      statusDefinitions
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.inventory.clear_heart_pill).toBe(1);
    expect(result.cleansed.map((status) => status.statusId)).toEqual([
      "poison",
      "wound"
    ]);
    expect(result.statuses.map((status) => status.statusId)).toEqual([
      "qi_suppression"
    ]);
  });

  it("fails safely when medicine is not owned", () => {
    const result = useMedicineCounterplay({
      medicine: getMedicine("clear_heart_pill"),
      inventory: {},
      activeStatuses: [],
      statusDefinitions
    });

    expect(result).toEqual({
      ok: false,
      reason: "not_owned"
    });
  });

  it("does not consume cleanse medicine when no matching status is active", () => {
    const result = useMedicineCounterplay({
      medicine: getMedicine("clear_heart_pill"),
      inventory: {
        clear_heart_pill: 1
      },
      activeStatuses: [],
      statusDefinitions
    });

    expect(result).toEqual({
      ok: false,
      reason: "no_effect"
    });
  });

  it("applies a timed status resistance bonus", () => {
    const result = useMedicineCounterplay({
      medicine: getMedicine("quiet_meridian_powder"),
      inventory: {
        quiet_meridian_powder: 1
      },
      activeStatuses: [],
      statusDefinitions
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.inventory.quiet_meridian_powder).toBeUndefined();
    expect(result.statusResistanceBonus).toBeCloseTo(0.12);
    expect(result.statusResistanceDurationSeconds).toBe(12);
    expect(applyMedicineResistanceBonus(0.05, result)).toBeCloseTo(0.17);
    expect(applyMedicineResistanceBonus(0.75, result)).toBeCloseTo(0.8);
  });
});
