import type {
  ClearTimeTargetRange,
  EnemyDefinition,
  RegionDefinition,
  StageDefinition
} from "../data";

export type StageClearTimeTargetInput = {
  region: Pick<RegionDefinition, "balanceTargets"> | null | undefined;
  stage: Pick<StageDefinition, "isBoss">;
  enemies: Array<Pick<EnemyDefinition, "type">>;
};

export const defaultClearTimeTargets: NonNullable<
  RegionDefinition["balanceTargets"]
>["clearTimeSeconds"] = {
  normal: {
    min: 5,
    max: 15
  },
  elite: {
    min: 20,
    max: 40
  }
};

export function getStageClearTimeTargetRange(
  input: StageClearTimeTargetInput
): ClearTimeTargetRange | null {
  const clearTimeSeconds =
    input.region?.balanceTargets?.clearTimeSeconds ?? defaultClearTimeTargets;

  if (input.stage.isBoss) {
    return clearTimeSeconds.boss ?? null;
  }

  return input.enemies.some((enemy) => enemy.type === "elite")
    ? clearTimeSeconds.elite
    : clearTimeSeconds.normal;
}

export function isWithinClearTimeTarget(
  clearTimeSeconds: number,
  target: ClearTimeTargetRange
): boolean {
  return clearTimeSeconds >= target.min && clearTimeSeconds <= target.max;
}
