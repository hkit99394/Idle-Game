import { describe, expect, it } from "vitest";
import {
  BATTLE_EVENT_TYPES,
  createBattleEventRecord,
  createBattleEventRecords
} from "../../core";
import type { BattleEvent, LegacyBattleEvent } from "../../core";

const sampleEventsByType = {
  attack: {
    type: "attack",
    time: 1,
    sourceId: "player_a",
    targetId: "enemy_a",
    skillId: "strike",
    outerDamage: 10,
    innerDamage: 2
  },
  guard: {
    type: "guard",
    time: 1,
    sourceId: "enemy_a",
    targetId: "enemy_a",
    skillId: "guard",
    statusId: "guard",
    reduction: 0.5,
    endsAt: 4
  },
  guard_absorb: {
    type: "guard_absorb",
    time: 2,
    targetId: "enemy_a",
    skillId: "guard",
    statusId: "guard",
    outerDamagePrevented: 5,
    reduction: 0.5
  },
  protect: {
    type: "protect",
    time: 2,
    sourceId: "enemy_guard",
    protectedId: "enemy_back",
    attackerId: "player_a",
    skillId: "protect",
    statusId: "protection",
    outerDamagePrevented: 3,
    innerDamagePrevented: 1,
    reduction: 0.25
  },
  armor_break: {
    type: "armor_break",
    time: 2,
    sourceId: "player_a",
    targetId: "enemy_a",
    skillId: "break",
    statusId: "armor_break",
    reduction: 0.4,
    endsAt: 6
  },
  wound: {
    type: "wound",
    time: 2,
    sourceId: "player_a",
    targetId: "enemy_a",
    skillId: "wound",
    statusId: "wound",
    reduction: 0.4,
    endsAt: 6
  },
  speed_down: {
    type: "speed_down",
    time: 2,
    sourceId: "player_a",
    targetId: "enemy_a",
    skillId: "slow",
    statusId: "speed_down",
    reduction: 0.3,
    endsAt: 6
  },
  inner_defense_down: {
    type: "inner_defense_down",
    time: 2,
    sourceId: "player_a",
    targetId: "enemy_a",
    skillId: "soften",
    statusId: "inner_defense_down",
    reduction: 0.3,
    endsAt: 6
  },
  status_apply: {
    type: "status_apply",
    time: 2,
    sourceId: "enemy_a",
    targetId: "player_a",
    skillId: "poison",
    statusId: "poison",
    stacks: 1,
    durationSeconds: 4,
    chance: 1,
    refreshed: false
  },
  status_tick: {
    type: "status_tick",
    time: 3,
    sourceId: "enemy_a",
    targetId: "player_a",
    statusId: "poison",
    stacks: 1,
    outerDamage: 12
  },
  status_expire: {
    type: "status_expire",
    time: 6,
    targetId: "player_a",
    statusId: "poison"
  },
  regeneration: {
    type: "regeneration",
    time: 2,
    sourceId: "player_healer",
    targetId: "player_a",
    skillId: "regen",
    statusId: "regeneration",
    restores: "body_integrity",
    percentPerTick: 0.1,
    endsAt: 6
  },
  regeneration_tick: {
    type: "regeneration_tick",
    time: 3,
    sourceId: "player_healer",
    targetId: "player_a",
    skillId: "regen",
    statusId: "regeneration",
    bodyIntegrityRestored: 20,
    contextStabilityRestored: 0,
    overhealing: 0,
    recoveryPrevented: 0
  },
  cleanse: {
    type: "cleanse",
    time: 3,
    sourceId: "player_healer",
    targetId: "player_a",
    skillId: "cleanse",
    statusesRemoved: ["poison", "wound"]
  },
  auto_medicine: {
    type: "auto_medicine",
    time: 3,
    medicineId: "clear_heart_countermeasure",
    trigger: "battle_cleanse",
    targetId: "player_a",
    cleansedStatusIds: ["poison"],
    statusResistanceBonus: 0,
    statusResistanceDurationSeconds: 0
  },
  ai_overload: {
    type: "ai_overload",
    time: 4,
    sourceId: "player_a",
    targetId: "enemy_a",
    burstDamage: 30,
    burstPercent: 0.1,
    endsAt: 10
  },
  context_rebuild: {
    type: "context_rebuild",
    time: 10,
    targetId: "enemy_a",
    contextStability: 50
  },
  backlash: {
    type: "backlash",
    time: 5,
    sourceId: "enemy_a",
    damage: 8
  },
  heal: {
    type: "heal",
    time: 5,
    sourceId: "player_healer",
    targetId: "player_a",
    skillId: "heal",
    bodyIntegrityRestored: 25,
    contextStabilityRestored: 5,
    overhealing: 0,
    recoveryPrevented: 0
  },
  defeat: {
    type: "defeat",
    time: 6,
    targetId: "enemy_a",
    team: "enemy"
  }
} satisfies Record<BattleEvent["type"], BattleEvent>;

describe("battle event recorder contract", () => {
  it("creates stable view records for every battle event type", () => {
    expect([...BATTLE_EVENT_TYPES].sort()).toEqual(
      Object.keys(sampleEventsByType).sort()
    );

    const events = BATTLE_EVENT_TYPES.map((type) => sampleEventsByType[type]);
    const records = createBattleEventRecords(events);

    expect(records.map((record) => record.category)).toEqual(BATTLE_EVENT_TYPES);
    expect(records.map((record) => record.type)).toEqual(BATTLE_EVENT_TYPES);
    expect(records[0]).toEqual({
      id: "0-attack-1",
      index: 0,
      category: "attack",
      type: "attack",
      statusId: null,
      timeSeconds: 1
    });
    expect(
      Object.fromEntries(
        records.map((record) => [record.type, record.statusId])
      )
    ).toMatchObject({
      guard: "guard",
      guard_absorb: "guard",
      protect: "protection",
      armor_break: "armor_break",
      wound: "wound",
      speed_down: "speed_down",
      inner_defense_down: "inner_defense_down",
      status_apply: "poison",
      status_tick: "poison",
      status_expire: "poison",
      regeneration: "regeneration",
      regeneration_tick: "regeneration",
      cleanse: "poison",
      auto_medicine: "poison",
      attack: null,
      ai_overload: null,
      context_rebuild: null,
      backlash: null,
      heal: null,
      defeat: null
    });
  });

  it("keeps ids tied to event order, type, and timestamp", () => {
    expect(createBattleEventRecord(sampleEventsByType.ai_overload, 7)).toMatchObject({
      id: "7-ai_overload-4",
      index: 7,
      category: "ai_overload",
      timeSeconds: 4
    });
  });

  it("normalizes legacy Qi Break event record categories", () => {
    const legacyEvents: LegacyBattleEvent[] = [
      {
        ...sampleEventsByType.ai_overload,
        type: "qi_break"
      },
      {
        ...sampleEventsByType.context_rebuild,
        type: "qi_recover"
      }
    ];

    expect(createBattleEventRecords(legacyEvents)).toEqual([
      expect.objectContaining({
        id: "0-ai_overload-4",
        category: "ai_overload",
        type: "ai_overload"
      }),
      expect.objectContaining({
        id: "1-context_rebuild-10",
        category: "context_rebuild",
        type: "context_rebuild"
      })
    ]);
  });
});
