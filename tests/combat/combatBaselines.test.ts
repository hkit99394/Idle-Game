import { describe, expect, it } from "vitest";
import {
  defaultAutoMedicinePreferences,
  resolveStageBattle,
  simulateBattle
} from "../../core";
import {
  createCombatBaselineFixture
} from "../helpers/combatScenarios";
import {
  autoMedicineCorruptionScenarioIds,
  createAutoMedicineCorruptionProgress,
  createAutoMedicineCorruptionScenarioData
} from "../helpers/statusScenarios";

function summarizeEvent(event: ReturnType<typeof simulateBattle>["events"][number]) {
  const summary = {
    type: event.type,
    time: event.time,
    sourceId: "sourceId" in event ? event.sourceId : undefined,
    targetId: "targetId" in event ? event.targetId : undefined,
    skillId: "skillId" in event ? event.skillId : undefined,
    statusId: "statusId" in event ? event.statusId : undefined,
    outerDamage: "outerDamage" in event ? event.outerDamage : undefined,
    innerDamage: "innerDamage" in event ? event.innerDamage : undefined,
    outerHealing: "outerHealing" in event ? event.outerHealing : undefined,
    burstDamage: "burstDamage" in event ? event.burstDamage : undefined,
    medicineId: "medicineId" in event ? event.medicineId : undefined,
    trigger: event.type === "auto_medicine" ? event.trigger : undefined
  };

  return Object.fromEntries(
    Object.entries(summary).filter(([, value]) => value !== undefined)
  );
}

describe("combat baseline traces", () => {
  it("locks the opening order for a mixed striker, breaker, support, tank, and status fixture", () => {
    const { data, playerTeam, enemyTeam } = createCombatBaselineFixture();
    const result = simulateBattle(data, {
      playerTeam,
      enemyTeam,
      maxDurationSeconds: 3
    });
    const trace = result.events.slice(0, 15).map(summarizeEvent);

    expect(trace).toEqual([
      {
        type: "attack",
        time: 1,
        sourceId: "player_scenario_trace_striker_1",
        targetId: "enemy_scenario_trace_guardian_1",
        skillId: "scenario_outer_combo",
        outerDamage: 120,
        innerDamage: 0
      },
      {
        type: "attack",
        time: 1,
        sourceId: "player_scenario_trace_breaker_2",
        targetId: "enemy_scenario_trace_guardian_1",
        skillId: "scenario_inner_break",
        outerDamage: 0,
        innerDamage: 90
      },
      {
        type: "attack",
        time: 1,
        sourceId: "player_scenario_trace_support_3",
        targetId: "enemy_scenario_trace_guardian_1",
        skillId: "scenario_heal",
        outerDamage: 0,
        innerDamage: 0
      },
      {
        type: "heal",
        time: 1,
        sourceId: "player_scenario_trace_support_3",
        targetId: "player_scenario_trace_striker_1",
        skillId: "scenario_heal",
        outerHealing: 0
      },
      {
        type: "attack",
        time: 1,
        sourceId: "enemy_scenario_trace_guardian_1",
        targetId: "player_scenario_trace_striker_1",
        skillId: "scenario_guard",
        outerDamage: 0,
        innerDamage: 0
      },
      {
        type: "guard",
        time: 1,
        sourceId: "enemy_scenario_trace_guardian_1",
        targetId: "enemy_scenario_trace_guardian_1",
        skillId: "scenario_guard",
        statusId: "guard"
      },
      {
        type: "attack",
        time: 1,
        sourceId: "enemy_scenario_trace_protector_2",
        targetId: "player_scenario_trace_striker_1",
        skillId: "scenario_protect",
        outerDamage: 0,
        innerDamage: 0
      },
      {
        type: "attack",
        time: 1,
        sourceId: "enemy_scenario_trace_poisoner_3",
        targetId: "player_scenario_trace_striker_1",
        skillId: "scenario_poison_touch",
        outerDamage: 0,
        innerDamage: 0
      },
      {
        type: "status_apply",
        time: 1,
        sourceId: "enemy_scenario_trace_poisoner_3",
        targetId: "player_scenario_trace_striker_1",
        skillId: "scenario_poison_touch",
        statusId: "corruption"
      },
      {
        type: "guard_absorb",
        time: 2,
        targetId: "enemy_scenario_trace_guardian_1",
        skillId: "scenario_guard",
        statusId: "guard"
      },
      {
        type: "attack",
        time: 2,
        sourceId: "player_scenario_trace_striker_1",
        targetId: "enemy_scenario_trace_guardian_1",
        skillId: "scenario_outer_combo",
        outerDamage: 60,
        innerDamage: 0
      },
      {
        type: "guard_absorb",
        time: 2,
        targetId: "enemy_scenario_trace_guardian_1",
        skillId: "scenario_guard",
        statusId: "guard"
      },
      {
        type: "attack",
        time: 2,
        sourceId: "player_scenario_trace_breaker_2",
        targetId: "enemy_scenario_trace_guardian_1",
        skillId: "scenario_inner_break",
        outerDamage: 0,
        innerDamage: 90
      },
      {
        type: "ai_overload",
        time: 2,
        sourceId: "player_scenario_trace_breaker_2",
        targetId: "enemy_scenario_trace_guardian_1",
        burstDamage: 225
      },
      {
        type: "guard_absorb",
        time: 2,
        targetId: "enemy_scenario_trace_guardian_1",
        skillId: "scenario_guard",
        statusId: "guard"
      }
    ]);
    expect(result.metrics.aiOverloadsTriggeredByPlayer).toBe(1);
    expect(result.metrics.guardDamagePreventedByEnemy).toBeGreaterThan(0);
    expect(result.metrics.enemyOuterHealing).toBe(0);
  });

  it("locks battle-cleanse medicine ordering around status application", () => {
    const data = createAutoMedicineCorruptionScenarioData();
    const progress = createAutoMedicineCorruptionProgress(data);
    const ids = autoMedicineCorruptionScenarioIds;
    const result = resolveStageBattle(data, {
      progress,
      stageId: ids.stageId,
      maxDurationSeconds: 4.5,
      autoMedicinePreferences: defaultAutoMedicinePreferences
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const trace = result.battle.events
      .filter(
        (event) =>
          event.time === 1 &&
          ["attack", "status_apply", "auto_medicine"].includes(event.type)
      )
      .map(summarizeEvent);

    expect(trace).toEqual([
      {
        type: "attack",
        time: 1,
        sourceId: "enemy_scenario_auto_medicine_poisoner_1",
        targetId: ids.targetId,
        skillId: ids.skillId,
        outerDamage: 0,
        innerDamage: 0
      },
      {
        type: "status_apply",
        time: 1,
        sourceId: "enemy_scenario_auto_medicine_poisoner_1",
        targetId: ids.targetId,
        skillId: ids.skillId,
        statusId: "corruption"
      },
      {
        type: "auto_medicine",
        time: 1,
        targetId: ids.targetId,
        medicineId: "clear_heart_countermeasure",
        trigger: "battle_cleanse"
      }
    ]);
    expect(result.battle.autoMedicine.uses).toEqual([
      expect.objectContaining({
        trigger: "battle_cleanse",
        medicineId: "clear_heart_countermeasure",
        targetId: ids.targetId,
        cleansedStatusIds: ["corruption"]
      })
    ]);
  });
});
