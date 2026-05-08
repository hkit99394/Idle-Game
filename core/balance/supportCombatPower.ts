import {
  createStatusDictionary,
  estimateStatusApplication,
  estimateStatusHealingDenied,
  estimateStatusModifierDamage,
  estimateStatusTickDamage
} from "../combat";
import type { DerivedStats } from "../combat";
import type { StaticGameData } from "../data";

export function calculateSkillSupportCombatPower(
  data: StaticGameData,
  skillIds: string[],
  stats: DerivedStats
): number {
  const skillsById = new Map(data.skills.map((skill) => [skill.id, skill]));
  const statusDefinitions = createStatusDictionary(data.statusEffects);

  return skillIds.reduce((total, skillId) => {
    const skill = skillsById.get(skillId);

    if (!skill) {
      return total;
    }

    const effectPower = skill.effects.reduce((effectTotal, effect) => {
      const durationMultiplier = Math.max(1, effect.durationSeconds ?? 1);

      switch (effect.type) {
        case "outer_heal_percent":
          return effectTotal + stats.maxOuterHp * effect.value * 0.5;
        case "inner_heal_percent":
          return effectTotal + stats.maxInnerQi * effect.value * 0.45;
        case "outer_regeneration_percent":
          return effectTotal +
            stats.maxOuterHp * effect.value * durationMultiplier * 0.35;
        case "inner_regeneration_percent":
          return effectTotal +
            stats.maxInnerQi * effect.value * durationMultiplier * 0.32;
        case "cleanse":
          return effectTotal + 80 * Math.max(1, effect.value);
        case "guard":
        case "protect":
          return effectTotal + stats.maxOuterHp * effect.value * 0.25;
        case "apply_status": {
          const definition = statusDefinitions[effect.statusId];

          if (definition === undefined) {
            return effectTotal;
          }

          const application = estimateStatusApplication({
            effect,
            definition,
            attackerStats: stats,
            targetStats: { statusResistance: 0 },
            casts: 1
          });
          const statusValue =
            estimateStatusTickDamage({
              definition,
              resistedDurationSeconds: application.resistedDurationSeconds,
              targetMaxOuterHp: stats.maxOuterHp,
              targetStatusResistance: 0,
              stacks: application.stacks,
              expectedApplications: application.expectedApplications
            }) *
              0.3 +
            estimateStatusHealingDenied({
              definition,
              stacks: application.stacks,
              expectedApplications: application.expectedApplications,
              durationSeconds: application.durationSeconds,
              resistedDurationSeconds: application.resistedDurationSeconds
            }) *
              1.5 +
            estimateStatusModifierDamage({
              definition,
              stacks: application.stacks,
              expectedApplications: application.expectedApplications,
              resistedDurationSeconds: application.resistedDurationSeconds,
              targetMaxOuterHp: stats.maxOuterHp,
              enemyDps: stats.outerAttack * 0.25,
              playerAttackEventsPerSecond: 0.35
            });

          return effectTotal + statusValue;
        }
        default:
          return effectTotal;
      }
    }, 0);

    return total + effectPower;
  }, 0);
}
