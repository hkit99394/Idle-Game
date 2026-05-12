import { describe, expect, it } from "vitest";
import type { ResolveStageBattleResult } from "../../core";
import { buildBattleEventViews } from "../../web/state/viewModels/battle";
import { staticData } from "../helpers/staticData";

describe("battle event view models", () => {
  it("presents auto-countermeasure events with purge and resistance details", () => {
    const lastBattle = {
      ok: true,
      battle: {
        finalPlayerTeam: [
          {
            instanceId: "player_iron_fist_disciple_1",
            name: "Iron Fist Disciple",
            formationSlot: "front"
          }
        ],
        finalEnemyTeam: [],
        events: [
          {
            type: "auto_medicine",
            time: 1,
            targetId: "player_iron_fist_disciple_1",
            trigger: "battle_cleanse",
            medicineId: "clear_heart_pill",
            cleansedStatusIds: ["poison"],
            statusResistanceBonus: 0,
            statusResistanceDurationSeconds: 0
          },
          {
            type: "auto_medicine",
            time: 0,
            trigger: "pre_battle_resistance",
            medicineId: "quiet_meridian_powder",
            cleansedStatusIds: [],
            statusResistanceBonus: 0.12,
            statusResistanceDurationSeconds: 12
          }
        ]
      }
    } as unknown as ResolveStageBattleResult;

    expect(buildBattleEventViews(staticData, lastBattle)).toEqual([
      {
        id: "0-auto_medicine-1",
        category: "auto_medicine",
        statusId: "poison",
        timeSeconds: 1,
        timeLabel: "1s",
        headline: "Iron Fist Disciple (Front) uses Clear Heart Pill",
        detail: "Battle purge · removes Poison",
        badges: [
          {
            label: "Auto Countermeasure",
            tone: "neutral"
          },
          {
            label: "Poison",
            tone: "danger"
          }
        ]
      },
      {
        id: "1-auto_medicine-0",
        category: "auto_medicine",
        statusId: null,
        timeSeconds: 0,
        timeLabel: "0s",
        headline: "the party uses Quiet Meridian Powder",
        detail: "Pre-battle resistance · adds 12% Status Resistance for 12s",
        badges: [
          {
            label: "Auto Countermeasure",
            tone: "neutral"
          },
          {
            label: "12% resistance",
            tone: "qi"
          }
        ]
      }
    ]);
  });
});
