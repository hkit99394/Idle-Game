# Save API

## Purpose

Save loading should be owned by `core/` so web storage, tools, tests, and a future backend use the same migration, validation, normalization, offline reward, and timestamp behavior.

Theme note: Stage 2.7 migrated owned resource/progress save fields with compatibility adapters and fixture coverage. Current saves now emit fields such as `credits`, `resonance`, `reagents`, `districts`, `combatData`, `currentRouteId`, `selectedOfflineFarmRouteId`, `selectedRoutineId`, and `technoSect`; legacy fields such as `silver`, `cultivation`, `herbs`, `maps`, `combatExperience`, `currentStageId`, `selectedOfflineFarmStageId`, `selectedTacticId`, and `sect` remain import compatibility contracts. Combat stat symbol migration is owned by the active [Stage 2.8 Backlog](stage-2.8-backlog.md); [Stage 2.8 Combat Save And Symbol Preflight](stage-2.8-combat-save-symbol-preflight.md) confirmed current saves do not persist live combat stat/event state, and Slices 93.3 through 94.4 moved transient runtime, static authoring, web, and report/export fields toward `bodyIntegrity`, `contextStability`, `playerKineticDamage`, and `playerCognitiveDamage` without a save-version bump.

## Preferred Core Entry Points

| Use Case | API | Notes |
| --- | --- | --- |
| Create or autosave a current save | `createSaveData` | Preserves `createdAtMs`, `lastOfflineRewardAtMs`, offline preset, and auto-medicine preferences from `previousSave` when supplied. |
| Parse an imported save without offline rewards | `parseSaveData` | Migrates once, validates the migrated result, and returns a cloned current-version `SaveData`. |
| Load a save and apply offline rewards | `loadSaveTransaction` | Preferred load path for web startup, future backend load, and tests that need full load semantics. |
| Apply load semantics to an already parsed save | `applySaveLoadTransaction` | Use when the caller already has validated `SaveData`. Normalizes farm metadata and applies offline rewards. |
| Validate user-supplied save data for diagnostics | `validateSaveData` | Returns validation strings. Runtime load should prefer `parseSaveData` or `loadSaveTransaction`. |
| Wrap and load cloud saves | `createCloudSaveEnvelope`, `loadCloudSaveEnvelopeTransaction` | Cloud envelopes add account, slot, checksum, and conflict metadata around current `SaveData`; see [Cloud Save Contract](cloud-save-contract.md). |

## Load Semantics

`loadSaveTransaction` performs this sequence:

1. Migrate raw save data to the current save version.
2. Validate the migrated save.
3. Normalize offline farm preset and selected farm target.
4. Apply offline farm and assignment rewards from `updatedAtMs` to `nowMs`.
5. Advance `updatedAtMs` and `lastOfflineRewardAtMs` when rewards are granted.
6. Return `changed` plus ordered `writeReasons` so persistence adapters know both
   whether to write and why the write is required.

This timestamp update prevents the same offline interval from being granted again on a reload.

`changed` is the broad compatibility flag. New load adapters should prefer
`writeReasons` because it preserves intent:

- `migrated` means raw storage was an older supported save version.
- `normalizedSave` means a current-version save was accepted after schema-level
  defaults or normalization were applied during parse.
- `normalizedFarmTarget` and `normalizedPreset` mean load-time farm metadata was
  repaired after parse.
- `offlineRewardsApplied` and `offlineAssignmentsApplied` mean load granted
  rewards and advanced reward timestamps.

`parseSaveData` and the raw-save `loadSaveTransaction` path also return
migration metadata with the source version, target version, migration flag,
normalization flag, and the list of normalized fields. `applySaveLoadTransaction`
accepts an already parsed current-schema save, so its success result does not
include migration metadata. A migrated save can also include normalizations; in
that case `writeReasons` uses `migrated` as the persistence reason rather than
adding a separate `normalizedSave` reason.

## Web Storage Responsibilities

`web/state/saveStorage.ts` should stay a persistence adapter:

- Read raw JSON from storage.
- Call `loadSaveTransaction`, `parseSaveData`, or `createSaveData`.
- Write the candidate `SaveData` back when the core transaction reports
  `writeReasons`.
- Preserve migration metadata from raw-load results when returning adapter
  diagnostics.
- Show storage-key compatibility separately from save-schema migration metadata
  so diagnostics can distinguish old-key copies from legacy field normalization.
- Convert storage/JSON failures into UI-friendly error reasons.

It should not own migration, offline reward calculation, farm-target normalization, or timestamp rules.

The canonical browser storage key is `path-of-neon.save.v1`. The web adapter still reads the legacy `path-of-jianghu.save.v1` key when the canonical key is missing, then copies valid legacy saves forward without deleting the old key.

On failed persistence, adapters must keep the concepts separate:

- The loaded normalized save is the current-schema value returned by core after
  parse, migration, and schema normalization.
- The candidate save is the value the adapter attempted to persist.
- The active save is the current-schema value the caller may safely use in
  memory after the failed write. Web startup uses the loaded normalized save so
  failed offline reward writes are not applied in memory.
- The persisted save is only known when the underlying storage still contains a
  current-schema `SaveData`. If a migration or `normalizedSave` rewrite fails,
  storage still contains the original raw payload, so adapters should report no
  current-schema persisted save instead of treating the loaded normalized save
  as committed.

## Migration Fixtures

Supported legacy versions are listed in `SUPPORTED_SAVE_DATA_VERSIONS`. Tests should cover every legacy version through fixture data, then assert:

- Migration reaches `SAVE_DATA_VERSION`.
- Validation passes after migration.
- Required defaults such as resources, active team, equipment, assignments, auto medicine, and offline preset exist.
- Timestamps remain valid.

When a save version is added, add or update the migration fixture path before changing import/export behavior.

Save version `12` adds content-id alias normalization for Stage 2.6 without renaming save fields. The migration covers save-stored hero, style, style-branch, skill-upgrade, equipment, medicine, assignment, tactic, and auto-medicine disabled ids. Normalization is data-aware: it writes whichever alias side is configured by the active static data, so current imports can be repaired before and after the static content id rename slices land.

Save version `13` adds the Stage 2.7 save-field alias foundation. Current save JSON serializes resources as `credits`, `resonance`, and `reagents`; district progress as `districts`, `combatData`, and `highestClearedRouteIndex`; route/routine fields as `currentRouteId`, `selectedOfflineFarmRouteId`, and `selectedRoutineId`; techno-sect progress as `technoSect`; and resource-named offline farm preset values as `credits`, `resonance`, and `combatData`. Legacy version `12` saves and current-version imports with legacy field names still normalize through core migration. Ambiguous imports that provide conflicting legacy and target aliases fail validation instead of silently choosing one. Runtime progression and save state now use the current Stage 2.7 names for owned resource, district, route, farm, routine, and techno-sect fields.

Simulator, support-decision, and future backend tooling should use those current runtime progress/save fields whenever they read save-shaped data. Generated balance authoring reports remain separate from save JSON: static stage rewards and budget columns such as `reward_silver`, `reward_cultivation`, `reward_herbs`, and `reward_combat_experience` are content-report metrics, not persisted save fields. Tactic comparison exports are also report contracts rather than save contracts; schema version `4` exposes current `playerKineticDamage` / `playerCognitiveDamage` JSON fields and `player_kinetic_damage` / `player_cognitive_damage` CSV columns while keeping temporary legacy damage-channel aliases for before-and-after review.

## Import And Future Versions

Imported saves with unsupported future versions must fail validation. The game should not try to downgrade future saves or grant offline rewards to invalid imports.

Cloud envelopes follow the same rule: `saveVersion` must match the current `SAVE_DATA_VERSION`, and `rawSave` still routes through core load validation before rewards or normalization are accepted.

## Backend And Online Boss Notes

Backend save adapters should compare account, slot, checksum, and timestamp metadata before accepting cloud writes or online boss attempts. Competitive online boss attempts should use the save metadata and team snapshot only as input to server-side deterministic simulation; client-submitted battle results are diagnostics, not authoritative rewards or leaderboard state. See [Cloud Save Contract](cloud-save-contract.md) and [Online Boss Transport Decision](online-boss-transport-decision.md).
