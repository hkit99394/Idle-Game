import {
  calculateAttackInterval,
  calculateInnerDamage,
  calculateOuterDamage,
  calculateQiBreakBurst
} from "../core";
import heroes from "../data/heroes.json" with { type: "json" };
import enemies from "../data/enemies.json" with { type: "json" };

const hero = heroes[0];
const enemy = enemies[0];

const outerDamage = calculateOuterDamage({
  attacker: hero.baseStats,
  target: enemy.baseStats,
  skillMultiplier: 1
});

const innerDamage = calculateInnerDamage({
  attacker: hero.baseStats,
  target: enemy.baseStats,
  skillMultiplier: 0.15
});

const qiBreak = calculateQiBreakBurst({
  targetMaxOuterHp: enemy.baseStats.maxOuterHp,
  attackerBreakPower: hero.baseStats.breakPower,
  targetBreakResist: enemy.baseStats.breakResist
});

const result = {
  attacker: hero.name,
  target: enemy.name,
  attackInterval: calculateAttackInterval(hero.baseStats.speed),
  outerDamage,
  innerDamage,
  qiBreak
};

console.log(JSON.stringify(result, null, 2));
