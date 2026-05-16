import { describe, expect, it } from "vitest";
import {
  buildRegionBudgetGateChecks,
  buildRegionBudgetGateContext
} from "../../core";
import type {
  BalanceTargetCheck,
  RegionBalanceTargets,
  RegionBudgetGateBattleOutcome,
  RegionBudgetGateStageSummary
} from "../../core";

const targets: RegionBalanceTargets = {
  clearTimeSeconds: {
    normal: { min: 1, max: 10 },
    elite: { min: 10, max: 30 }
  },
  rewardCurve: {
    requireBestFarmRecommendation: true
  },
  statusPressure: {
    minApplications: 1,
    maxApplications: 5,
    maxExpectedDamage: 20,
    maxMedicineConsumed: 2,
    expectedStatusIds: ["corruption"]
  },
  defensePressure: {
    minGuardAbsorbs: 2,
    minArmorBreaks: 1,
    minDamagePrevented: 20
  },
  healingPressure: {
    minHeals: 2,
    minBodyIntegrityRestored: 50,
    minCleanses: 1,
    maxRecoveryPrevented: 10
  },
  bossGate: {
    baselineResult: "enemy_hold",
    trainedResult: "player_clear",
    farmedResult: "player_clear",
    maxFarmClears: 3,
    maxTrainingCost: 50,
    clearTimeSeconds: { min: 80, max: 120 },
    maxMedicineConsumed: 2,
    maxStatusDamage: 25
  }
};

function getCheck(checks: BalanceTargetCheck[], id: string): BalanceTargetCheck {
  const check = checks.find((candidate) => candidate.id === id);

  if (check === undefined) {
    throw new Error(`Missing check ${id}`);
  }

  return check;
}

function outcome(
  result: "player_clear" | "enemy_hold",
  overrides: Partial<Extract<RegionBudgetGateBattleOutcome, { ok: true }>> = {}
): RegionBudgetGateBattleOutcome {
  return {
    ok: true,
    stageId: "stage_boss",
    result,
    durationSeconds: result === "player_clear" ? 100 : 180,
    medicineConsumed: 1,
    statusDamage: 10,
    ...overrides
  };
}

describe("region budget gates", () => {
  it("builds core budget context and passes every configured gate", () => {
    const stageResults: RegionBudgetGateStageSummary[] = [
      {
        ok: true,
        stageId: "stage_1",
        targetSeconds: [1, 10],
        result: "player_clear",
        stageCleared: true,
        durationSeconds: 5,
        statusApplications: 3,
        statusDamage: 12,
        medicineConsumed: 1,
        statusIds: ["corruption"],
        guardAbsorbs: 2,
        armorBreaks: 1,
        defensiveDamagePrevented: 20,
        heals: 2,
        bodyIntegrityRestored: 50,
        cleanses: 1,
        recoveryPrevented: 5
      }
    ];
    const checks = buildRegionBudgetGateChecks(
      buildRegionBudgetGateContext({
        targets,
        stageResults,
        rewardCurve: {
          actualFarmStageId: "stage_1",
          expectedFarmStageId: "stage_1",
          expectedFarmScore: 25
        },
        bossGate: {
          baseline: outcome("enemy_hold"),
          trained: outcome("player_clear"),
          farmed: outcome("player_clear", {
            farmClears: 3,
            trainingCost: 50
          })
        }
      })
    );

    expect(checks.map((check) => [check.id, check.status])).toEqual([
      ["clear_time", "pass"],
      ["reward_curve", "pass"],
      ["status_pressure", "pass"],
      ["defense_pressure", "pass"],
      ["healing_pressure", "pass"],
      ["boss_gate", "pass"]
    ]);
  });

  it("reports missing optional metric groups when a configured gate needs them", () => {
    const checks = buildRegionBudgetGateChecks({
      targets,
      clearTime: {
        evaluatedCount: 1,
        failures: []
      }
    });

    expect(getCheck(checks, "reward_curve")).toMatchObject({
      status: "fail",
      reason: "reward curve metrics were not provided"
    });
    expect(getCheck(checks, "status_pressure")).toMatchObject({
      status: "fail",
      reason: "status pressure metrics were not provided"
    });
    expect(getCheck(checks, "defense_pressure")).toMatchObject({
      status: "fail",
      reason: "defense pressure metrics were not provided"
    });
    expect(getCheck(checks, "healing_pressure")).toMatchObject({
      status: "fail",
      reason: "healing pressure metrics were not provided"
    });
    expect(getCheck(checks, "boss_gate")).toMatchObject({
      status: "fail",
      reason: "boss gate metrics were not provided"
    });
  });

  it("fails each stage-summary gate with actionable reasons", () => {
    const checks = buildRegionBudgetGateChecks(
      buildRegionBudgetGateContext({
        targets,
        stageResults: [
          {
            ok: true,
            stageId: "stage_1",
            targetSeconds: [1, 10],
            result: "player_clear",
            stageCleared: true,
            durationSeconds: 11,
            statusApplications: 3,
            statusDamage: 12,
            medicineConsumed: 1,
            statusIds: [],
            guardAbsorbs: 1,
            armorBreaks: 0,
            defensiveDamagePrevented: 19,
            heals: 1,
            bodyIntegrityRestored: 49,
            cleanses: 0,
            recoveryPrevented: 11
          }
        ],
        rewardCurve: {
          actualFarmStageId: "stage_2",
          expectedFarmStageId: "stage_1",
          expectedFarmScore: 25
        }
      })
    );

    expect(getCheck(checks, "clear_time").reason).toBe(
      "stage_1 clear time 11s is above the 1-10s target"
    );
    expect(getCheck(checks, "reward_curve").reason).toContain(
      "does not match best configured farm"
    );
    expect(getCheck(checks, "status_pressure").reason).toEqual(
      expect.stringContaining("expected status corruption was not applied")
    );
    expect(getCheck(checks, "defense_pressure").reason).toContain(
      "guard absorbs 1 below minimum 2"
    );
    expect(getCheck(checks, "healing_pressure").reason).toContain(
      "cleanses 0 below minimum 1"
    );
  });

  it("handles boss result errors, farming limits, and explicit outcomes", () => {
    const explicitEnemyHold: RegionBudgetGateBattleOutcome = {
      ok: true,
      stageId: "stage_boss",
      result: "enemy_hold",
      durationSeconds: 90,
      medicineConsumed: 1,
      statusDamage: 10
    };

    expect(
      buildRegionBudgetGateChecks({
        targets: {
          ...targets,
          bossGate: {
            baselineResult: "enemy_hold"
          }
        },
        clearTime: { evaluatedCount: 0, failures: [] },
        bossGate: {
          baseline: explicitEnemyHold
        }
      }).find((check) => check.id === "boss_gate")
    ).toMatchObject({
      status: "pass"
    });

    const checks = buildRegionBudgetGateChecks({
      targets,
      clearTime: { evaluatedCount: 0, failures: [] },
      bossGate: {
        baseline: {
          ok: false,
          stageId: "stage_boss",
          reason: "missing_enemy"
        },
        trained: outcome("enemy_hold"),
        farmed: outcome("player_clear", {
          durationSeconds: 130,
          medicineConsumed: 3,
          statusDamage: 26,
          farmClears: 4,
          trainingCost: 51
        })
      }
    });
    const bossGate = getCheck(checks, "boss_gate");

    expect(bossGate.status).toBe("fail");
    expect(bossGate.reason).toEqual(
      expect.stringContaining("baseline expected enemy_hold, got error:missing_enemy")
    );
    expect(bossGate.reason).toEqual(
      expect.stringContaining("trained expected player_clear, got enemy_hold")
    );
    expect(bossGate.reason).toEqual(
      expect.stringContaining("farmed clear needs 4 farms above maximum 3")
    );
    expect(bossGate.reason).toEqual(
      expect.stringContaining("stage_boss clear time 130s is above")
    );
    expect(bossGate.reason).toEqual(
      expect.stringContaining("boss medicine 3 above maximum 2")
    );
    expect(bossGate.reason).toEqual(
      expect.stringContaining("boss status damage 26 above maximum 25")
    );
  });

  it("does not treat failed boss attempts as enemy holds", () => {
    const timeout: RegionBudgetGateBattleOutcome = {
      ok: false,
      stageId: "stage_boss",
      reason: "timeout"
    };
    const bossGate = getCheck(
      buildRegionBudgetGateChecks({
        targets: {
          clearTimeSeconds: targets.clearTimeSeconds,
          bossGate: {
            baselineResult: "enemy_hold"
          }
        },
        clearTime: { evaluatedCount: 0, failures: [] },
        bossGate: {
          baseline: timeout
        }
      }),
      "boss_gate"
    );

    expect(timeout).toEqual({
      ok: false,
      stageId: "stage_boss",
      reason: "timeout"
    });
    expect(bossGate).toMatchObject({
      status: "fail",
      reason: "baseline expected enemy_hold, got error:timeout"
    });
  });
});
