import { describe, expect, it } from "vitest";
import {
  BASE_COMBAT_EXPERIENCE_PER_LEVEL,
  calculateCombatExperienceRequiredForLevel,
  calculateCombatExperienceRequiredForNextLevel,
  calculateLevelFromCombatExperience,
  calculatePlayerLevel,
  calculateTotalCombatExperience,
  createInitialPlayerProgress
} from "../../core";
import { staticData } from "../helpers/staticData";

describe("combat experience levels", () => {
  it("uses increasing combat experience requirements per level", () => {
    expect(BASE_COMBAT_EXPERIENCE_PER_LEVEL).toBe(100);
    expect(calculateCombatExperienceRequiredForNextLevel(1)).toBe(100);
    expect(calculateCombatExperienceRequiredForNextLevel(2)).toBe(200);
    expect(calculateCombatExperienceRequiredForNextLevel(3)).toBe(300);
    expect(calculateCombatExperienceRequiredForLevel(1)).toBe(0);
    expect(calculateCombatExperienceRequiredForLevel(2)).toBe(100);
    expect(calculateCombatExperienceRequiredForLevel(3)).toBe(300);
    expect(calculateCombatExperienceRequiredForLevel(4)).toBe(600);
  });

  it("calculates level from cumulative combat experience", () => {
    expect(calculateLevelFromCombatExperience(0)).toBe(1);
    expect(calculateLevelFromCombatExperience(99)).toBe(1);
    expect(calculateLevelFromCombatExperience(100)).toBe(2);
    expect(calculateLevelFromCombatExperience(299)).toBe(2);
    expect(calculateLevelFromCombatExperience(300)).toBe(3);
    expect(calculateLevelFromCombatExperience(600)).toBe(4);
    expect(calculateLevelFromCombatExperience(-10)).toBe(1);
    expect(calculateLevelFromCombatExperience(Number.NaN)).toBe(1);
  });

  it("derives player level from accumulated map combat experience", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.districts.greenline_approach.combatData = 120;

    expect(calculateTotalCombatExperience(progress)).toBe(120);
    expect(calculatePlayerLevel(progress)).toBe(2);
  });
});
