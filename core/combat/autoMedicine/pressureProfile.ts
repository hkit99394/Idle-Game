import type { EnemyDefinition, SkillDefinition, StageDefinition } from "../../data";
import type { StatusEffectDefinition } from "../types";
import {
  STATUS_HEAVY_STATUS_CATEGORY_COUNT_THRESHOLD,
  STATUS_HEAVY_STATUS_SKILL_COUNT_THRESHOLD
} from "./types";
import type { StageStatusPressureProfile } from "./types";

export function getStageStatusPressureIds(input: {
  stage: StageDefinition;
  enemies: EnemyDefinition[];
  skills: SkillDefinition[];
}): string[] {
  return getStageStatusPressureProfile(input).statusIds;
}

export function getStageStatusPressureProfile(input: {
  stage: StageDefinition;
  enemies: EnemyDefinition[];
  skills: SkillDefinition[];
  statusDefinitions?: Record<string, StatusEffectDefinition>;
}): StageStatusPressureProfile {
  const enemyById = new Map(input.enemies.map((enemy) => [enemy.id, enemy]));
  const skillById = new Map(input.skills.map((skill) => [skill.id, skill]));
  const statusIds = new Set<string>();
  const statusCategories = new Set<string>();
  let statusSkillCount = 0;
  let hasBossOrEliteEnemy = false;

  for (const enemyId of input.stage.enemyTeam.combatantIds) {
    const enemy = enemyById.get(enemyId);

    if (enemy === undefined) {
      continue;
    }

    if (enemy.type === "elite" || enemy.type === "boss") {
      hasBossOrEliteEnemy = true;
    }

    for (const skillId of enemy.skillIds) {
      const skill = skillById.get(skillId);

      if (skill === undefined) {
        continue;
      }

      for (const effect of skill.effects) {
        if (effect.type === "apply_status" && effect.statusId !== undefined) {
          statusSkillCount += 1;
          statusIds.add(effect.statusId);
          const status = input.statusDefinitions?.[effect.statusId];

          if (status !== undefined) {
            statusCategories.add(status.category);
          }
        }
      }
    }
  }

  const statusCategoryCount = statusCategories.size;

  return {
    statusIds: [...statusIds].sort(),
    statusSkillCount,
    statusCategoryCount,
    isBossOrEliteStage: input.stage.isBoss || hasBossOrEliteEnemy,
    isStatusHeavy:
      statusSkillCount >= STATUS_HEAVY_STATUS_SKILL_COUNT_THRESHOLD ||
      statusCategoryCount >= STATUS_HEAVY_STATUS_CATEGORY_COUNT_THRESHOLD
  };
}
