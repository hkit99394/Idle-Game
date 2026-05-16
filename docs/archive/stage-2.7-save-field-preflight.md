# Stage 2.7 Save Field Preflight

## Status

Slice 92.1 is complete. This preflight is the implementation contract for Stage 2.7 save resource/progress field migration.

This document does not rename schema code. It classifies the current save fields, target fields, compatibility behavior, fixture requirements, stale-scan expectations, and explicit defer list before Slice 92.2 starts the save-version bump.

## Source Contracts

- [Stage 2.7 Backlog](stage-2.7-backlog.md) owns Epic 92.
- [Path Of Neon Internal Id Migration](../path-of-neon-internal-id-migration.md) defines the save-version boundary and target terminology.
- [Save API](../save-api.md) defines migration, validation, load, import, export, and cloud-envelope behavior.
- [Archived Stage 2.6 Content Id Preflight](stage-2.6-content-id-preflight.md) records the completed content-id migration and the fields intentionally deferred to Stage 2.7.

## Owned Save Surfaces

| Surface | Current save paths | Primary code owners | Stage 2.7 decision |
| --- | --- | --- | --- |
| Resources | `progress.resources.silver`, `progress.resources.cultivation`, `progress.resources.herbs` | `core/progression/types.ts`, `core/progression/progress.ts`, `core/progression/rewards.ts`, `core/save/progressValidation.ts`, `core/save/migrations.ts` | Migrate field names. |
| District progress collection | `progress.maps` | `core/progression/stages.ts`, `core/save/migrations.ts`, `core/save/progressValidation.ts`, `core/offline/*`, web map/view-model paths | Migrate to `progress.districts`. |
| District progress values | `progress.maps.*.combatExperience`, `progress.maps.*.highestClearedStageIndex` | `core/progression/rewards.ts`, `core/progression/levels.ts`, `core/progression/masterySummary.ts`, `core/offline/*`, save validation/migration | Migrate field names. |
| Current route | `progress.currentStageId` | `core/progression/stages.ts`, `core/progression/battleResolution.ts`, save validation/migration, web reducer/view models | Migrate field name. Values are already canonical route ids after Stage 2.5. |
| Offline farm route | `selectedOfflineFarmStageId` | `core/save/saveTypes.ts`, `core/save/factory.ts`, `core/save/loadTransaction.ts`, `web/state/saveStorage.ts`, web save tools | Migrate field name. Values are already canonical route ids after Stage 2.5. |
| Routine selection | `progress.selectedTacticId` | `core/progression/tactics.ts`, `core/save/migrations.ts`, `core/save/progressValidation.ts`, strategy web state/view models | Migrate field name. Values are routine ids after Stage 2.6. |
| Techno-sect progress | `progress.sect` | `core/progression/types.ts`, `core/progression/upgrades.ts`, `core/progression/supportGrowth.ts`, save validation/migration, progression web state/view models | Migrate field name only. Static upgrade ids and `scope: "sect"` are deferred. |
| Offline farm preset policy | `offlineFarmPreset`; values `balanced`, `silver`, `cultivation`, `combatExperience`, `mastery` | `core/progression/stages.ts`, `core/save/*`, `web/state/viewModels/offline.ts` | Keep the field name. Migrate resource-named preset values. |
| Save diagnostics and tools | `currentRouteId`, `selectedOfflineFarmRouteId`, `highestClearedStageIndex`, `offlineFarmPreset` view fields | `web/state/viewModels/saveDiagnostics.ts`, `web/features/counterplaySave/panels.tsx`, `web/state/saveToolCommands.ts` | Update schema labels and import/export output after core migration. |

## Target Matrix

Decision meanings:

- **Migrate**: current saves should emit the target field/value after Stage 2.7 lands; legacy saves and supported imports should still be accepted through aliases.
- **Keep**: no schema alias is required for the field name in Stage 2.7.
- **Defer**: leave for Stage 2.8, Stage 2.9, or a later cleanup stage.

### Save Field Names

| Current field | Target field | Decision | Reason |
| --- | --- | --- | --- |
| `progress.resources.silver` | `progress.resources.credits` | Migrate | Matches the current display term and removes a legacy resource save key. |
| `progress.resources.cultivation` | `progress.resources.resonance` | Migrate | Matches the current display term and removes a legacy resource save key. |
| `progress.resources.herbs` | `progress.resources.reagents` | Migrate | Matches the current display term and removes a legacy resource save key. |
| `progress.maps` | `progress.districts` | Migrate | Region values are canonical district ids after Stage 2.5, so the collection name can follow. |
| `progress.maps.*.combatExperience` | `progress.districts.*.combatData` | Migrate | Matches the current Combat Data display term. |
| `progress.maps.*.highestClearedStageIndex` | `progress.districts.*.highestClearedRouteIndex` | Migrate | This is route progress; values are route indexes, not legacy stage ids. |
| `progress.currentStageId` | `progress.currentRouteId` | Migrate | Values are canonical route ids after Stage 2.5; the field should stop saying stage. |
| `selectedOfflineFarmStageId` | `selectedOfflineFarmRouteId` | Migrate | Offline farming stores route ids; Stage 2.5 removed the value blocker. |
| `progress.selectedTacticId` | `progress.selectedRoutineId` | Migrate | Values are routine ids after Stage 2.6; the save field should follow the persisted value category. |
| `progress.sect` | `progress.technoSect` | Migrate | Matches current product language while keeping upgrade contents compatible. |
| `offlineFarmPreset` | `offlineFarmPreset` | Keep | The field describes a policy preset, not a legacy stage or resource field. |

### Save Field Values

| Current value | Target value | Decision | Reason |
| --- | --- | --- | --- |
| `offlineFarmPreset: "silver"` | `"credits"` | Migrate | Resource-named preset value should follow `credits`. |
| `offlineFarmPreset: "cultivation"` | `"resonance"` | Migrate | Resource-named preset value should follow `resonance`. |
| `offlineFarmPreset: "combatExperience"` | `"combatData"` | Migrate | Resource-named preset value should follow `combatData`. |
| `offlineFarmPreset: "balanced"` | `"balanced"` | Keep | Already neutral policy language. |
| `offlineFarmPreset: "mastery"` | `"mastery"` | Keep | Already current progression language. |

### Explicit Defer List

| Surface | Examples | Reason |
| --- | --- | --- |
| Static data reward fields | `StageDefinition.rewards.silver`, `cultivation`, `combatExperience`, assignment reward profile fields | These are static-data and tooling schema fields, not save payload fields. Stage 2.7 may adapt at the boundary but should not retheme the full content authoring schema. |
| Upgrade ids and scopes | `sect_outer_training`, `sect_inner_training`, `scope: "sect"` | Static upgrade id and code-symbol migration belongs after save compatibility is stable. |
| Tactic/routine code and data collection names | `data.tactics`, `core/progression/tactics.ts`, `tacticId` function inputs | Stage 2.7 owns the persisted field name. Broad code/data collection cleanup belongs later. |
| Stage/route static-data schema names | `data/stages.json`, `StageDefinition`, `stageId`, `region.stageIds` | Stage 2.5 migrated route id values. Broad static-data schema cleanup belongs later. |
| Combat stat fields | `outerHp`, `innerQi`, max fields, recovery fields, `qiBreak*` | Stage 2.8 owns combat save/stat migration. |
| Report/code symbol cleanup | Balance report column names, simulator local variable names, UI view-model types where not serialized | Rename only where required for Stage 2.7 schema safety; broad cleanup belongs later. |
| Historical docs | `docs/archive/**` | Do not rewrite archived history. |

## Compatibility Behavior

Stage 2.7 should use a new save version:

- Bump `SAVE_DATA_VERSION` from `12` to `13`.
- Keep `12` in `SUPPORTED_SAVE_DATA_VERSIONS`.
- Version `12` and earlier saves migrate to version `13`.
- Current-version imports with legacy Stage 2.7 field names should normalize to the current schema instead of failing, as long as they are not ambiguous.
- Save export should emit only current Stage 2.7 field names after migration.
- Cloud envelope `saveVersion` should continue to match the current `SAVE_DATA_VERSION`; the envelope shape itself does not change.

Alias merge rules for Slice 92.2:

- If only the legacy field is present, move its value to the target field and record a normalization.
- If only the target field is present, keep it.
- If both fields are present and their values are equivalent, keep the target field, drop the legacy field, and record a normalization.
- If both fields are present and their values conflict, reject the save with an explicit conflicting-alias validation error rather than silently choosing one.
- For `progress.maps` and `progress.districts`, merge entries by normalized district id. If both collections contain the same district with conflicting progress values, reject the save.
- Field-name normalization should happen before existing region/stage id alias normalization, content-id alias normalization, defaulting, and validation.
- Existing Stage 2.4, 2.5, and 2.6 compatibility adapters must remain active.

Suggested conflict error shape:

```text
conflicting save field aliases: <target field> and <legacy field>
```

## Normalization Labels

`SaveNormalization.field` should identify the legacy source path. The reason should make the target clear.

Suggested reason strings:

| Legacy source path | Target path | Suggested reason |
| --- | --- | --- |
| `progress.resources.silver` | `progress.resources.credits` | `migrated legacy save field to progress.resources.credits` |
| `progress.resources.cultivation` | `progress.resources.resonance` | `migrated legacy save field to progress.resources.resonance` |
| `progress.resources.herbs` | `progress.resources.reagents` | `migrated legacy save field to progress.resources.reagents` |
| `progress.maps` | `progress.districts` | `migrated legacy save field to progress.districts` |
| `progress.maps.<districtId>.combatExperience` | `progress.districts.<districtId>.combatData` | `migrated legacy save field to progress.districts.<districtId>.combatData` |
| `progress.maps.<districtId>.highestClearedStageIndex` | `progress.districts.<districtId>.highestClearedRouteIndex` | `migrated legacy save field to progress.districts.<districtId>.highestClearedRouteIndex` |
| `progress.currentStageId` | `progress.currentRouteId` | `migrated legacy save field to progress.currentRouteId` |
| `selectedOfflineFarmStageId` | `selectedOfflineFarmRouteId` | `migrated legacy save field to selectedOfflineFarmRouteId` |
| `progress.selectedTacticId` | `progress.selectedRoutineId` | `migrated legacy save field to progress.selectedRoutineId` |
| `progress.sect` | `progress.technoSect` | `migrated legacy save field to progress.technoSect` |
| `offlineFarmPreset` | `offlineFarmPreset` value aliases | `normalized legacy offline farm preset value` |

Defaulting labels should use the target paths after Stage 2.7 lands. For example, missing current resource fields should report `progress.resources.credits`, not `progress.resources.silver`.

## Fixture And Test Plan

Slice 92.2 should add or update these fixtures:

- A version `12` fixture that represents the immediately previous current schema with canonical Stage 2.5/2.6 ids but legacy Stage 2.7 save field names.
- A pre-retheme fixture that still combines old region ids, old static content ids, and legacy save field names, proving migrations compose.
- A current-version import fixture using legacy Stage 2.7 fields, proving current-version normalization works.
- A current-version conflict fixture with both legacy and target fields, proving ambiguous imports fail.
- Offline farm preset value fixtures for `silver`, `cultivation`, and `combatExperience`.

Focused test coverage:

| Test surface | Required coverage |
| --- | --- |
| `tests/save/saveSchema.migrations.test.ts` | Version `12` to `13` migration, old fixture composition, normalizations list, conflict rejection. |
| `tests/save/saveSchema.validation.test.ts` | Target field validation paths, legacy current-version normalization, invalid target field diagnostics. |
| `tests/save/saveSchema.factory.test.ts` | `createSaveData` and `cloneSaveData` emit only target fields. |
| `tests/save/loadTransaction.test.ts` | Offline rewards and assignment rewards still apply once after field migration. |
| `tests/save/cloudSaveContract.test.ts` | Envelope version and raw-save validation still route through core migration. |
| `tests/web/saveStorage.test.ts` | Old storage key plus old save schema copy forward to canonical key and current schema. |
| `tests/web/offlineTimeTravel.test.ts` | Time travel keeps route/farm fields and resource totals current-schema. |
| `tests/web/gameState*.test.ts` | Web state reset, import, export, route selection, routine selection, and diagnostics use current schema. |
| `tests/offline/*` and `tests/progression/*` | Runtime rewards, unlocks, mastery, upgrades, and route progress keep behavior after field rename. |

## Stale Scan Expectations

After Stage 2.7 implementation, scan active code and docs for owned legacy save-field paths:

```sh
rg "progress\\.resources\\.(silver|cultivation|herbs)|progress\\.maps|progress\\.currentStageId|selectedOfflineFarmStageId|progress\\.selectedTacticId|progress\\.sect|highestClearedStageIndex|combatExperience|offlineFarmPreset"
```

Expected remaining hits outside `docs/archive` should be limited to:

- save-field alias helpers and migration code;
- old save fixtures and compatibility tests;
- active Stage 2.7 migration docs;
- deferred static-data reward fields, authoring exports, and balance tooling;
- deferred combat/stat/report/code-symbol work;
- user-facing display term maps that intentionally format old static-data resource keys until their owning schema migration.

Owned legacy save-field paths should not remain in current save exports, reset-new-game saves, cloud raw-save examples, or current-schema validation messages except as explicit compatibility diagnostics.

## 92.2 Handoff

Slice 92.2 should add the save-field alias foundation before broad caller edits:

- Add a save-specific alias helper, likely under `core/save`, instead of extending content-id alias helpers with schema-field behavior.
- Normalize legacy field names near the beginning of `migrateSaveData`, before progress defaults and validation.
- Keep region/stage id aliases and content-id aliases data-aware.
- Bump the save version to `13` in the same slice that proves version `12` fixture migration.
- Update [Stage 2.7 Backlog](stage-2.7-backlog.md) as each later slice completes.
