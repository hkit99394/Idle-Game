import { describe, expect, it } from "vitest";
import {
  calculateSkillSupportCombatPower,
  deriveStats
} from "../../core";
import type { SkillDefinition, StaticGameData } from "../../core";
import { staticData } from "../helpers/staticData";

const applyStatusSkill: SkillDefinition = {
  id: "scenario_support_apply_status",
  name: "Scenario Support Status",
  cooldownSeconds: 10,
  kineticMultiplier: 0,
  cognitiveMultiplier: 0,
  targetRule: "first_living",
  effects: [
    {
      type: "apply_status",
      statusId: "exposed",
      chance: 1,
      durationSeconds: 5,
      stacks: 2
    }
  ]
};

describe("support combat power", () => {
  it("scores data-driven apply_status support effects", () => {
    const data: StaticGameData = {
      ...staticData,
      skills: [...staticData.skills, applyStatusSkill]
    };
    const stats = deriveStats({
      ...staticData.heroes[0].baseStats,
      statusAccuracy: 0.2
    });

    expect(
      calculateSkillSupportCombatPower(data, [applyStatusSkill.id], stats)
    ).toBeGreaterThan(0);
    expect(
      calculateSkillSupportCombatPower(data, ["missing_skill"], stats)
    ).toBe(0);
  });
});
