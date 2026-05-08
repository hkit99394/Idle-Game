# Save API

## Purpose

Save loading should be owned by `core/` so web storage, tools, tests, and a future backend use the same migration, validation, normalization, offline reward, and timestamp behavior.

## Preferred Core Entry Points

| Use Case | API | Notes |
| --- | --- | --- |
| Create or autosave a current save | `createSaveData` | Preserves `createdAtMs`, `lastOfflineRewardAtMs`, offline preset, and auto-medicine preferences from `previousSave` when supplied. |
| Parse an imported save without offline rewards | `parseSaveData` | Migrates once, validates the migrated result, and returns a cloned current-version `SaveData`. |
| Load a save and apply offline rewards | `loadSaveTransaction` | Preferred load path for web startup, future backend load, and tests that need full load semantics. |
| Apply load semantics to an already parsed save | `applySaveLoadTransaction` | Use when the caller already has validated `SaveData`. Normalizes farm metadata and applies offline rewards. |
| Validate user-supplied save data for diagnostics | `validateSaveData` | Returns validation strings. Runtime load should prefer `parseSaveData` or `loadSaveTransaction`. |

## Load Semantics

`loadSaveTransaction` performs this sequence:

1. Migrate raw save data to the current save version.
2. Validate the migrated save.
3. Normalize offline farm preset and selected farm target.
4. Apply offline farm and assignment rewards from `updatedAtMs` to `nowMs`.
5. Advance `updatedAtMs` and `lastOfflineRewardAtMs` when rewards are granted.
6. Return whether the save changed so persistence adapters know whether to write it back.

This timestamp update prevents the same offline interval from being granted again on a reload.

## Web Storage Responsibilities

`web/state/saveStorage.ts` should stay a persistence adapter:

- Read raw JSON from storage.
- Call `loadSaveTransaction`, `parseSaveData`, or `createSaveData`.
- Write the returned `SaveData` back when the core transaction reports changes.
- Convert storage/JSON failures into UI-friendly error reasons.

It should not own migration, offline reward calculation, farm-target normalization, or timestamp rules.

## Migration Fixtures

Supported legacy versions are listed in `SUPPORTED_SAVE_DATA_VERSIONS`. Tests should cover every legacy version through fixture data, then assert:

- Migration reaches `SAVE_DATA_VERSION`.
- Validation passes after migration.
- Required defaults such as resources, active team, equipment, assignments, auto medicine, and offline preset exist.
- Timestamps remain valid.

When a save version is added, add or update the migration fixture path before changing import/export behavior.

## Import And Future Versions

Imported saves with unsupported future versions must fail validation. The game should not try to downgrade future saves or grant offline rewards to invalid imports.
