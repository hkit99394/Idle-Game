# Stage 2.7 Backlog

## Current Status

Stage 2.7 is the active planning backlog for Epic 92: Save Resource And Progress Field Migration.

[Archived Stage 2.6 Backlog](archive/stage-2.6-backlog.md) and [Archived Stage 2.6 Content Id Preflight](archive/stage-2.6-content-id-preflight.md) are the completed closure records for static content id migration. Stage 2.7 begins from that canonical static-content baseline and should not reopen Stage 2.6 id decisions.

This backlog turns the save-field migration guidance from [Path Of Neon Retheme Migration Plan](retheme-migration-plan.md), [Path Of Neon Internal Id Migration](path-of-neon-internal-id-migration.md), and [Save API](save-api.md) into focused implementation slices.

## Stage Theme

Migrate persisted save resource and progress field names from legacy Path of Jianghu schema terms to Path of Neon schema terms while keeping old saves, current-version imports, cloud envelopes, diagnostics, export/import, tests, and tooling safe.

## Decisions Carried Forward

- Stage 2.4 completed product/package/storage-key migration. Browser storage uses `path-of-neon.save.v1` with legacy key read/copy support.
- Stage 2.5 completed region and route id value migration. Region/stage id aliases stay in compatibility helpers.
- Stage 2.6 completed static content id migration. `SAVE_DATA_VERSION` is currently `12`, and content-id save normalization is data-aware.
- Stage 2.7 should bump `SAVE_DATA_VERSION` to `13` when save field names change.
- Current-version imports that still use legacy save field names should either normalize to current schema or fail with explicit diagnostics. Slice 92.1 must make that rule concrete before implementation.
- Old save fixtures must keep proving every value in `SUPPORTED_SAVE_DATA_VERSIONS` migrates to the current schema.
- Combat stat fields such as `outerHp`, `innerQi`, max fields, recovery fields, and AI Overload state are not part of Stage 2.7. They belong to the later combat save/stat migration.
- Broad code/report symbol cleanup is not part of Stage 2.7 unless a rename is required to express the current save schema safely.

## Candidate Field Targets

Slice 92.1 owns the final decision, but the expected target set is:

| Current field | Candidate target | Notes |
| --- | --- | --- |
| `progress.resources.silver` | `progress.resources.credits` | UI already displays Credits. |
| `progress.resources.cultivation` | `progress.resources.resonance` | UI already displays Resonance. |
| `progress.resources.herbs` | `progress.resources.reagents` | UI already displays Reagents. |
| `progress.maps` | `progress.districts` | Values already use canonical district ids after Stage 2.5. |
| `progress.maps.*.combatExperience` | `progress.districts.*.combatData` | UI already displays Combat Data. |
| `progress.maps.*.highestClearedStageIndex` | `progress.districts.*.highestClearedRouteIndex` | Decide in 92.1. This is a farm-route progress field, not a static id value. |
| `progress.currentStageId` | `progress.currentRouteId` | Values are already canonical route ids. |
| `selectedOfflineFarmStageId` | `selectedOfflineFarmRouteId` | Values are already canonical route ids. |
| `progress.selectedTacticId` | `progress.selectedRoutineId` | Static values are routine ids after Stage 2.6; field-name migration belongs here if accepted. |
| `progress.sect` | `progress.technoSect` | Decide in 92.1 with diagnostics and training-upgrade naming. |
| `offlineFarmPreset` | Keep or rename after 92.1 | Preset values are UX policy, not static route ids. Do not rename casually. |

## Non-Goals

- No static content id rename, alias target change, or Stage 2.6 matrix edit.
- No region/stage id value migration.
- No browser storage-key migration.
- No combat stat field migration for `outer*`, `inner*`, `qiBreak*`, recovery, or future overload state.
- No balance tuning or reward economy retune.
- No Cognitive Intrusion implementation.
- No removal of Stage 2.4, Stage 2.5, or Stage 2.6 compatibility adapters.

## Exit Criteria

- New saves emit only Stage 2.7 canonical save field names for owned resource/progress surfaces.
- Old saves from every supported legacy save version migrate to the current schema and preserve player progress.
- Import/export accepts supported legacy saves and exports the current schema.
- Save diagnostics report current schema labels while preserving enough compatibility detail for troubleshooting.
- Cloud save envelope behavior remains stable: envelope `saveVersion` matches the current `SAVE_DATA_VERSION`, and `rawSave` still routes through core validation.
- Focused tests cover migration, validation, current-version legacy-field normalization, import/export, offline reward behavior, and web storage diagnostics.
- Stale legacy save-field scans are classified, with remaining hits limited to compatibility adapters, fixtures/tests, docs, or explicitly deferred stages.
- Active docs point to this backlog; completed Stage 2.6 docs stay in `docs/archive`.

## Epic Summary

Stage 2.7 implements Epic 92 from the retheme migration plan as focused slices.

| Slice | Title | Status | Goal |
| --- | --- | --- | --- |
| 92.1 | Save Field Migration Preflight | Planned | Lock target names, compatibility behavior, test fixtures, and stale-scan rules before code changes. |
| 92.2 | Save Schema Alias Foundation | Planned | Add save-field alias helpers, bump the save version, and prove legacy/current imports normalize safely. |
| 92.3 | Resources And District Progress Rename | Planned | Rename resource and district progress fields through core save/progression/offline paths. |
| 92.4 | Route, Farm, Routine, And Techno-Sect Fields | Planned | Rename selected/current route, routine, and techno-sect save fields where 92.1 approves them. |
| 92.5 | Web Save, Diagnostics, And Import/Export | Planned | Keep browser save tools, diagnostics, reset, export, and import coherent on the current schema. |
| 92.6 | Tooling, Reports, And Compatibility Continuity | Planned | Update simulations, support-decision output, cloud docs, and temporary legacy report context. |
| 92.7 | Hardening And Archive Readiness | Planned | Run stale scans, full validation, docs closure, and prepare Stage 2.7 for archive. |

## Slice 92.1: Save Field Migration Preflight

Classify every owned save field and decide migrate, keep, or defer before editing schema code.

### Tasks

- Inventory save-field names in `core/save`, `core/progression`, `core/offline`, `web/state`, `web/features`, tests, fixtures, and tools.
- Produce a migrate/keep/defer matrix for the candidate target fields.
- Decide whether current-version imports with legacy field names normalize or fail with explicit diagnostics.
- Decide whether `highestClearedStageIndex`, `offlineFarmPreset`, `selectedTacticId`, and `progress.sect` are in scope.
- Define the exact `normalizedFields` labels for legacy field normalization.
- Define fixture coverage for version `12`, pre-retheme legacy versions, and current-version legacy-field imports.
- Define stale-scan expectations and allowed remaining legacy hits.

### Acceptance

- Contributors can see every Stage 2.7 field decision before implementation begins.
- No schema code changes are needed to complete 92.1.
- Stage 2.8 combat save/stat fields are clearly deferred.

### Verification

- Markdown link/path check.
- `git diff --check`.

## Slice 92.2: Save Schema Alias Foundation

Add the compatibility plumbing for save-field renames without mixing in every caller update.

### Tasks

- Add structured save-field alias helpers for resource, district progress, route/farm, routine, and techno-sect fields approved by 92.1.
- Bump `SAVE_DATA_VERSION` from `12` to `13`.
- Keep `12` in `SUPPORTED_SAVE_DATA_VERSIONS`.
- Add or update migration fixture coverage for version `12`.
- Normalize supported legacy save field names to current schema during migration.
- Add current-version import normalization or explicit diagnostic behavior according to 92.1.
- Preserve content-id alias normalization from Stage 2.6 while adding field-name normalization.

### Acceptance

- Version `12` saves migrate to version `13`.
- Supported older saves still migrate through all previous id and field migrations.
- Migration metadata reports useful `normalizedFields` for renamed save fields.
- No owned legacy field is emitted by `createSaveData` after the foundation lands, unless 92.1 keeps it.

### Verification

- `npm test -- tests/save`
- `npm test -- tests/fixtures`
- `npm run typecheck`
- `git diff --check`

## Slice 92.3: Resources And District Progress Rename

Move the core resource and map-progress schema to the approved Path of Neon save field names.

### Tasks

- Rename `ResourceState` fields approved by 92.1, likely `silver` to `credits`, `cultivation` to `resonance`, and `herbs` to `reagents`.
- Rename district progress fields approved by 92.1, likely `maps` to `districts` and `combatExperience` to `combatData`.
- Update progression creation, battle resolution, offline farming, assignment rewards, and upgrade purchase paths.
- Update validators so legacy fields normalize before validation and malformed combinations fail clearly.
- Preserve numeric balances and reward semantics.
- Update focused unit tests around rewards, progression, save migration, and validation.

### Acceptance

- Core state uses current schema names for owned resource/district fields.
- Old saves preserve resource totals, district unlock progress, mastery progress, and offline reward timestamps.
- Runtime reward application and previews match pre-migration behavior.

### Verification

- `npm test -- tests/offline`
- `npm test -- tests/progression`
- `npm test -- tests/save`
- `npm run typecheck`
- `git diff --check`

## Slice 92.4: Route, Farm, Routine, And Techno-Sect Fields

Rename the approved route/farm/routine/techno-sect save fields after the main resource-progress path is stable.

### Tasks

- Rename `progress.currentStageId` if 92.1 selects `currentRouteId`.
- Rename `selectedOfflineFarmStageId` if 92.1 selects `selectedOfflineFarmRouteId`.
- Rename `progress.selectedTacticId` if 92.1 selects `selectedRoutineId`.
- Rename `progress.sect` if 92.1 selects `progress.technoSect`.
- Decide and apply any approved `offlineFarmPreset` treatment.
- Update offline farm target normalization, route selection, strategy defaults, growth/mastery state, and save diagnostics.
- Keep static id value aliases separate from field-name aliases.

### Acceptance

- Selected/current route fields store canonical route ids under canonical field names.
- Routine and techno-sect fields, if migrated, stay compatible with old saves and reset-new-game state.
- Offline farming, current route persistence, and strategy selection survive export/import round trips.

### Verification

- `npm test -- tests/offline`
- `npm test -- tests/web`
- `npm test -- tests/save`
- `npm run typecheck`
- `git diff --check`

## Slice 92.5: Web Save, Diagnostics, And Import/Export

Make the user-facing save tools coherent after the schema rename.

### Tasks

- Update web state, reducers, command factories, view models, and save-tool commands for approved current schema fields.
- Update diagnostics panels to show current schema labels and useful legacy normalization messages.
- Update reset-new-game, export, import, and failed-persistence diagnostics.
- Update browser save storage tests for old-key plus old-schema interactions.
- Smoke the built app save tools after schema changes.

### Acceptance

- Save export emits the current Stage 2.7 schema.
- Save import accepts supported legacy saves and rewrites to current schema when persistence succeeds.
- Diagnostics distinguish storage-key compatibility from save-field migration.
- User-facing copy stays display-term based and does not leak old schema names except in intentional diagnostics.

### Verification

- `npm test -- tests/web`
- `npm run typecheck`
- `npm run build`
- Browser smoke for save diagnostics, export, import, and reset when practical.
- `git diff --check`

## Slice 92.6: Tooling, Reports, And Compatibility Continuity

Update non-web consumers and docs without starting the broader Stage 2.8 symbol migration.

### Tasks

- Update simulator, balance, support-decision, and authoring export paths that read save/progress fields.
- Keep report field changes narrowly tied to Stage 2.7 save/progress schema needs.
- Add temporary legacy context columns only if downstream comparison needs them.
- Update [Save API](save-api.md), [Cloud Save Contract](cloud-save-contract.md), [Content Pipeline Inventory](content-pipeline-inventory.md), and [Balance Budget Gates](balance-budget-gates.md) where behavior changes.
- Confirm static data validation remains independent from save-field migration.

### Acceptance

- Tooling works against the current schema.
- Temporary legacy report context is documented if added.
- Stage 2.8 combat symbol/report work remains explicitly deferred.

### Verification

- `npm run simulate`
- `npm run support-decision`
- `npm test`
- `npm run typecheck`
- `git diff --check`

## Slice 92.7: Hardening And Archive Readiness

Close Stage 2.7 with compatibility proof and docs cleanup.

### Tasks

- Run stale scans for legacy save field names and classify every remaining hit.
- Confirm old fixtures, current-version legacy-field imports, export/import, browser storage, and cloud-envelope tests pass.
- Update active docs with the completed Stage 2.7 state and the next recommended stage.
- Move this backlog to `docs/archive` after closure validation passes.
- Keep compatibility adapters in place unless a later cleanup stage explicitly removes them.

### Acceptance

- Stage 2.7 can be archived with no active owned field migrations left open.
- Remaining legacy field hits are compatibility adapters, fixtures/tests, docs/history, or deferred Stage 2.8/2.9 work.
- Stage 2.8 can start from a stable save resource/progress schema.

### Verification

- `npm test`
- `npm run typecheck`
- `npm run build`
- `npm run simulate`
- `npm run support-decision`
- Markdown link/path check.
- `git diff --check`

## Carried Forward After Stage 2.7

- Stage 2.8 should own combat save/stat fields such as `outerHp`, `innerQi`, max fields, recovery fields, AI Overload naming, and related report/code symbols.
- Stage 2.9 should own compatibility cleanup after old-save support policy allows temporary adapters or legacy comparison columns to retire.
- Cognitive Intrusion implementation should still begin from [Cognitive Intrusion Prototype Contract](cognitive-intrusion-prototype-contract.md) once naming and compatibility churn is low enough.
