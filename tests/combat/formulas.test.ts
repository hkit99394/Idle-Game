import { describe, expect, it } from "vitest";
import {
  calculateAttackInterval,
  calculateExpectedCritMultiplier,
  calculateInnerDamage,
  calculateInnerRecovery,
  calculateOuterDamage,
  calculateQiBreakBacklashDamage,
  calculateQiBreakBurst,
  calculateQiBreakRecovery,
  defaultCombatFormulaConstants
} from "../../core";
import type { DerivedStats } from "../../core";

const attacker: DerivedStats = {
  maxOuterHp: 200,
  maxInnerQi: 100,
  outerAttack: 100,
  innerAttack: 80,
  outerDefense: 10,
  innerDefense: 10,
  speed: 100,
  critChance: 0.1,
  critDamage: 1.5,
  breakPower: 0,
  breakResist: 0,
  innerRecoveryRate: 0.005
};

const target: DerivedStats = {
  maxOuterHp: 1000,
  maxInnerQi: 400,
  outerAttack: 30,
  innerAttack: 10,
  outerDefense: 100,
  innerDefense: 60,
  speed: 0,
  critChance: 0,
  critDamage: 1.5,
  breakPower: 0,
  breakResist: 0,
  innerRecoveryRate: 0.005
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

  it("mitigates outer damage with target outer defense", () => {
    const damage = calculateOuterDamage({
      attacker,
      target,
      skillMultiplier: 1,
      critMultiplier: 1
    });

    expect(damage).toBeCloseTo(50);
  });

  it("increases outer damage against Qi Broken targets", () => {
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
      targetIsQiBroken: true
    });

    expect(brokenDamage).toBeCloseTo(normalDamage * 1.25);
  });

  it("mitigates inner damage and halves it against Qi Broken targets", () => {
    const normalDamage = calculateInnerDamage({
      attacker,
      target,
      skillMultiplier: 1
    });
    const brokenDamage = calculateInnerDamage({
      attacker,
      target,
      skillMultiplier: 1,
      targetIsQiBroken: true
    });

    expect(normalDamage).toBeCloseTo(50);
    expect(brokenDamage).toBeCloseTo(25);
  });

  it("calculates default Qi Break burst as 10% of max Outer HP", () => {
    const burst = calculateQiBreakBurst({ targetMaxOuterHp: 1000 });

    expect(burst.percent).toBeCloseTo(0.1);
    expect(burst.damage).toBeCloseTo(100);
  });

  it("clamps Qi Break burst modifiers", () => {
    expect(
      calculateQiBreakBurst({
        targetMaxOuterHp: 1000,
        attackerBreakPower: 1
      }).percent
    ).toBe(defaultCombatFormulaConstants.maxQiBreakBurstPercent);

    expect(
      calculateQiBreakBurst({
        targetMaxOuterHp: 1000,
        targetBreakResist: 1
      }).percent
    ).toBe(defaultCombatFormulaConstants.minQiBreakBurstPercent);
  });

  it("calculates Qi Break backlash and recovery", () => {
    expect(calculateQiBreakBacklashDamage(1000)).toBeCloseTo(30);
    expect(calculateQiBreakRecovery(400)).toBeCloseTo(140);
  });

  it("recovers Inner Qi without exceeding maximum", () => {
    expect(
      calculateInnerRecovery({
        maxInnerQi: 100,
        currentInnerQi: 50,
        innerRecoveryRate: 0.005,
        deltaSeconds: 10
      })
    ).toBeCloseTo(55);

    expect(
      calculateInnerRecovery({
        maxInnerQi: 100,
        currentInnerQi: 99,
        innerRecoveryRate: 0.005,
        deltaSeconds: 10
      })
    ).toBe(100);
  });
});
