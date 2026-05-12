export type CompatibilityAliasEntry<Phase extends string = string> = Readonly<{
  legacyId: string;
  targetId: string;
  displayName: string;
  referenceFields: readonly string[];
  phase: Phase;
}>;

export type CompatibilityAliasIndex<
  Entry extends CompatibilityAliasEntry = CompatibilityAliasEntry
> = Readonly<{
  entries: readonly Entry[];
  getByLegacyId: (legacyId: string) => Entry | null;
  getByTargetId: (targetId: string) => Entry | null;
  getByPhase: (phase: Entry["phase"]) => readonly Entry[];
}>;

function assertUniqueAliasId<Entry extends CompatibilityAliasEntry>(
  byId: Map<string, Entry>,
  id: string,
  fieldName: "legacyId" | "targetId"
): void {
  if (byId.has(id)) {
    throw new Error(`Duplicate ${fieldName} alias: ${id}`);
  }
}

export function buildCompatibilityAliasIndex<
  Entry extends CompatibilityAliasEntry
>(entries: readonly Entry[]): CompatibilityAliasIndex<Entry> {
  const byLegacyId = new Map<string, Entry>();
  const byTargetId = new Map<string, Entry>();
  const byPhase = new Map<Entry["phase"], Entry[]>();

  for (const entry of entries) {
    assertUniqueAliasId(byLegacyId, entry.legacyId, "legacyId");
    assertUniqueAliasId(byTargetId, entry.targetId, "targetId");

    byLegacyId.set(entry.legacyId, entry);
    byTargetId.set(entry.targetId, entry);

    const phaseEntries = byPhase.get(entry.phase) ?? [];
    phaseEntries.push(entry);
    byPhase.set(entry.phase, phaseEntries);
  }

  return {
    entries,
    getByLegacyId: (legacyId) => byLegacyId.get(legacyId) ?? null,
    getByTargetId: (targetId) => byTargetId.get(targetId) ?? null,
    getByPhase: (phase) => byPhase.get(phase) ?? []
  };
}
