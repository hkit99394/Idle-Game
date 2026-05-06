export const ACTIVE_TEAM_SIZE = 4;

export const MVP_PLAYER_HERO_IDS = [
  "iron_fist_disciple",
  "azure_palm_monk",
  "white_crane_swordsman",
  "mountain_staff_guardian"
] as const;

export function createDefaultActiveHeroIds(heroIds: string[]): string[] {
  const knownHeroIds = new Set(heroIds);
  const defaults = MVP_PLAYER_HERO_IDS.filter((heroId) =>
    knownHeroIds.has(heroId)
  );
  const defaultSet = new Set<string>(defaults);
  const fallbackHeroIds = heroIds.filter((heroId) => !defaultSet.has(heroId));

  return [...defaults, ...fallbackHeroIds].slice(0, ACTIVE_TEAM_SIZE);
}
