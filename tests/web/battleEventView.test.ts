import { describe, expect, it } from "vitest";
import type { ResolveStageBattleResult } from "../../core";
import { buildBattleEventViews } from "../../web/state/viewModels/battle";
import { staticData } from "../helpers/staticData";

describe("battle event view models", () => {
  it("presents Intrusion status apply and purge events through status metadata", () => {
    const lastBattle = {
      ok: true,
      battle: {
        finalPlayerTeam: [
          {
            instanceId: "player_azure_pulse_monk_1",
            name: "Azure Pulse Monk",
            formationSlot: "middle"
          }
        ],
        finalEnemyTeam: [
          {
            instanceId: "enemy_greenline_cutter_1",
            name: "Greenline Cutter",
            formationSlot: "front"
          }
        ],
        events: [
          {
            type: "status_apply",
            time: 2,
            sourceId: "player_azure_pulse_monk_1",
            targetId: "enemy_greenline_cutter_1",
            skillId: "context_shock",
            statusId: "cognitive_intrusion",
            stacks: 1,
            durationSeconds: 6,
            chance: 0.7,
            refreshed: false
          },
          {
            type: "cleanse",
            time: 4,
            sourceId: "enemy_greenline_cutter_1",
            targetId: "enemy_greenline_cutter_1",
            skillId: "director_lotus_vow",
            statusesRemoved: ["cognitive_intrusion"]
          }
        ]
      }
    } as unknown as ResolveStageBattleResult;

    expect(buildBattleEventViews(staticData, lastBattle)).toEqual([
      {
        id: "0-status_apply-2",
        category: "status_apply",
        statusId: "cognitive_intrusion",
        timeSeconds: 2,
        timeLabel: "2s",
        headline:
          "Azure Pulse Monk (Middle) applies Intrusion to Greenline Cutter (Front)",
        detail: "Context Shock applies 1 stack(s) for 6s",
        badges: [
          {
            label: "Intrusion",
            tone: "danger"
          },
          {
            label: "70% chance",
            tone: "neutral"
          }
        ]
      },
      {
        id: "1-cleanse-4",
        category: "cleanse",
        statusId: "cognitive_intrusion",
        timeSeconds: 4,
        timeLabel: "4s",
        headline: "Greenline Cutter (Front) purges pressure",
        detail: "Director Lotus Vow removes Intrusion",
        badges: [
          {
            label: "Purge",
            tone: "neutral"
          },
          {
            label: "Intrusion",
            tone: "danger"
          }
        ]
      }
    ]);
  });

  it("presents auto-countermeasure events with purge and resistance details", () => {
    const lastBattle = {
      ok: true,
      battle: {
        finalPlayerTeam: [
          {
            instanceId: "player_iron_fist_initiate_1",
            name: "Iron Fist Initiate",
            formationSlot: "front"
          }
        ],
        finalEnemyTeam: [],
        events: [
          {
            type: "auto_medicine",
            time: 1,
            targetId: "player_iron_fist_initiate_1",
            trigger: "battle_cleanse",
            medicineId: "clear_heart_countermeasure",
            cleansedStatusIds: ["corruption"],
            statusResistanceBonus: 0,
            statusResistanceDurationSeconds: 0
          },
          {
            type: "auto_medicine",
            time: 0,
            trigger: "pre_battle_resistance",
            medicineId: "quiet_context_powder",
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
        statusId: "corruption",
        timeSeconds: 1,
        timeLabel: "1s",
        headline: "Iron Fist Initiate (Front) uses Clear Heart Countermeasure",
        detail: "Battle purge · removes Corruption",
        badges: [
          {
            label: "Auto Countermeasure",
            tone: "neutral"
          },
          {
            label: "Corruption",
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
        headline: "the party uses Quiet Context Powder",
        detail: "Pre-battle resistance · adds 12% Status Resistance for 12s",
        badges: [
          {
            label: "Auto Countermeasure",
            tone: "neutral"
          },
          {
            label: "12% resistance",
            tone: "inner"
          }
        ]
      }
    ]);
  });
});
