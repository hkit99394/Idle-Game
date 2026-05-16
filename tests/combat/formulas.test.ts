import { describe, expect, it } from "vitest";
import {
  calculateAttackInterval,
  calculateCombatPower,
  calculateExpectedCritMultiplier,
  calculateInnerDamage,
  calculateInnerRecovery,
  calculateOuterDamage,
  calculateAiOverloadFeedbackDamage,
  calculateAiOverloadBurst,
  calculateAiOverloadContextRebuild,
  defaultCombatFormulaConstants
} from "../../core";
import type { DerivedStats } from "../../core";

const attacker: DerivedStats = {
  maxBodyIntegrity: 200,
  maxContextStability: 100,
  kineticAttack: 100,
  cognitiveAttack: 80,
  kineticDefense: 10,
  cognitiveDefense: 10,
  speed: 100,
  critChance: 0.1,
  critDamage: 1.5,
  breachPower: 0,
  overloadResist: 0,
  contextRebuildRate: 0.005,
  statusAccuracy: 0,
  statusResistance: 0
};

const target: DerivedStats = {
  maxBodyIntegrity: 1000,
  maxContextStability: 400,
  kineticAttack: 30,
  cognitiveAttack: 10,
  kineticDefense: 100,
  cognitiveDefense: 60,
  speed: 0,
  critChance: 0,
  critDamage: 1.5,
  breachPower: 0,
  overloadResist: 0,
  contextRebuildRate: 0.005,
  statusAccuracy: 0,
  statusResistance: 0
};

describe("combat formulas", () => {
  it("calculates attack interval with speed and clamps", () => {
    expect(calculateAttackInterval(0)).toBe(2);
    expect(calculateAttackInterval(100)).toBe(1);
    expect(calculateAttackInterval(10000)).toBe(
      defaultCombatFormulaConstants.minAttackInterval
    );
  });

  it("calculates expected crit multiplier", () => {
    expect(calculateExpectedCritMultiplier(0.1, 1.5)).toBeCloseTo(1.05);
  });

  it("calculates display combat power from durability and offense stats", () => {
    expect(calculateCombatPower(attacker)).toBe(3729);
    expect(calculateCombatPower(target)).toBe(2740);
  });

  it("mitigates outer damage with target outer defense", () => {
    const damage = calculateOuterDamage({
      attacker,
      target,
      skillMultiplier: 1,
      critMultiplier: 1
    });

    expect(damage).toBeCloseTo(50);
  });

  it("increases outer damage against overloaded targets", () => {
    const normalDamage = calculateOuterDamage({
      attacker,
      target,
      skillMultiplier: 1,
      critMultiplier: 1
    });
    const brokenDamage = calculateOuterDamage({
      attacker,
      target,
      skillMultiplier: 1,
      critMultiplier: 1,
      targetIsOverloaded: true
    });

    expect(brokenDamage).toBeCloseTo(normalDamage * 1.25);
  });

  it("mitigates inner damage and halves it against overloaded targets", () => {
    const normalDamage = calculateInnerDamage({
      attacker,
      target,
      skillMultiplier: 1
    });
    const brokenDamage = calculateInnerDamage({
      attacker,
      target,
      skillMultiplier: 1,
      targetIsOverloaded: true
    });

    expect(normalDamage).toBeCloseTo(50);
    expect(brokenDamage).toBeCloseTo(25);
  });

  it("calculates default AI Overload burst as 10% of max Outer HP", () => {
    const burst = calculateAiOverloadBurst({ targetMaxBodyIntegrity: 1000 });

    expect(burst.percent).toBeCloseTo(0.1);
    expect(burst.damage).toBeCloseTo(100);
  });

  it("clamps AI Overload burst modifiers", () => {
    expect(
      calculateAiOverloadBurst({
        targetMaxBodyIntegrity: 1000,
        attackerBreachPower: 1
      }).percent
    ).toBe(defaultCombatFormulaConstants.maxAiOverloadBurstPercent);

    expect(
      calculateAiOverloadBurst({
        targetMaxBodyIntegrity: 1000,
        targetOverloadResist: 1
      }).percent
    ).toBe(defaultCombatFormulaConstants.minAiOverloadBurstPercent);
  });

  it("calculates AI Overload backlash and recovery", () => {
    expect(calculateAiOverloadFeedbackDamage(1000)).toBeCloseTo(30);
    expect(calculateAiOverloadContextRebuild(400)).toBeCloseTo(140);
  });

  it("recovers Inner Qi without exceeding maximum", () => {
    expect(
      calculateInnerRecovery({
        maxContextStability: 100,
        currentContextStability: 50,
        contextRebuildRate: 0.005,
        deltaSeconds: 10
      })
    ).toBeCloseTo(55);

    expect(
      calculateInnerRecovery({
        maxContextStability: 100,
        currentContextStability: 99,
        contextRebuildRate: 0.005,
        deltaSeconds: 10
      })
    ).toBe(100);
  });
});
