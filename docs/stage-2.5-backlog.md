# Stage 2.5 Backlog

## Current Status

Stage 2.5 is planned. Stage 2.4 product/storage key migration is complete and archived at [Archived Stage 2.4 Backlog](archive/stage-2.4-backlog.md).

This backlog turns Epic 90 from [Path Of Neon Retheme Migration Plan](retheme-migration-plan.md) into an implementation-ready region/stage static-id migration. It should make Path of Neon district and route ids canonical while preserving old saves, exports, fixtures, reports, and local browser storage compatibility.

## Theme

**Static Region And Route Id Migration**

Stage 2.5 should migrate region ids and stage ids from legacy Path of Jianghu identifiers to Path of Neon identifiers. It should not migrate enemy, hero, skill, style, equipment, assignment, medicine, status, tactic, resource, combat-stat, or report-field names beyond the region/stage references required to keep data coherent.

This stage is deliberately narrower than the full internal-id migration. It owns ids such as `bamboo_road`, `mist_valley`, `black_iron_fort`, `lotus_monastery`, `demon_cult_outpost`, and their `*_1` route ids. Later stages own content ids, save resource/progress field names, combat stat fields, and cleanup of temporary legacy adapters.

## Decisions Carried Forward

- Stage 2.4 already moved package metadata, browser save storage, PWA cache naming, and icon paths to Path of Neon runtime identity.
- Shared alias-map helpers exist in `core/compatibility` and should be reused for region/stage aliases.
- Static id migration needs a new `SAVE_DATA_VERSION` because persisted saves store region/stage ids in `progress.maps`, `currentStageId`, and `selectedOfflineFarmStageId`.
- The first stage-id migration should preserve numeric suffixes for predictable save compatibility.
- Reports and exports should stay comparable during the transition by including legacy id context where downstream users may need it.
- Old region/stage ids must still load from saves, imports, fixtures, and browser storage after canonical ids change.
- Do not use broad string replacement across the repo; use explicit alias data and targeted migrations.

## Target Ids

Canonical Stage 2.5 region targets:

| Legacy region id | Target region id | Display name |
| --- | --- | --- |
| `bamboo_road` | `greenline_approach` | Greenline Approach |
| `mist_valley` | `veil_district` | Veil District |
| `black_iron_fort` | `black_iron_foundry` | Black Iron Foundry |
| `lotus_monastery` | `lotus_clinic` | Lotus Clinic |
| `demon_cult_outpost` | `redline_outpost` | Redline Outpost |

Stage ids should migrate by prefix while preserving the numeric suffix:

| Legacy example | Target example |
| --- | --- |
| `bamboo_road_1` | `greenline_approach_1` |
| `mist_valley_6` | `veil_district_6` |
| `black_iron_fort_7` | `black_iron_foundry_7` |
| `lotus_monastery_7` | `lotus_clinic_7` |
| `demon_cult_outpost_7` | `redline_outpost_7` |

Named boss route ids can become more expressive only in a later cleanup stage after numeric migration has been stable for at least one compatibility pass.

## Stage Goals

- Add explicit region/stage alias data using the existing compatibility alias helper shape.
- Bump the save version and migrate old region/stage ids in every supported save path.
- Rename canonical region and stage ids in static data and all region/stage references.
- Keep old save imports, browser saves, fixtures, simulator reports, exports, and tests coherent.
- Keep product/runtime compatibility from Stage 2.4 unchanged.
- Document remaining legacy ids as intentional content/save-field/combat-symbol work for later stages.

## Non-Goals

- No enemy, hero, skill, style, equipment, equipment-set, assignment, medicine, status, or tactic id migration except for region/stage references inside their unlock conditions or fixtures.
- No persisted resource/progress field rename such as `silver`, `cultivation`, `herbs`, `maps`, or `combatExperience`.
- No rename of `selectedOfflineFarmStageId`; this stage may migrate the value stored in that field, but the field name stays until the save resource/progress field stage.
- No combat stat field rename for `outer*`, `inner*`, `qiBreak*`, or recovery fields.
- No backend API field rename or cloud-save envelope shape change beyond accepting current save-version payloads.
- No removal of `path-of-jianghu.save.v1`, `path-of-jianghu-shell-*`, or `/icons/path-of-jianghu.svg` compatibility.
- No Cognitive Intrusion implementation.

## Exit Criteria

- Canonical static data emits Path of Neon region/stage ids.
- Legacy saves with old `progress.maps`, `currentStageId`, and `selectedOfflineFarmStageId` values migrate to canonical ids.
- Old imported saves and browser saves still load through the Stage 2.4 storage key path.
- Static-data validation rejects mixed or unmapped region/stage ids.
- Simulator text/JSON/CSV reports remain readable and include legacy id context during the transition where useful.
- Web route selection, offline farm selection, diagnostics, reset, export, and import use canonical ids after migration.
- Remaining legacy region/stage ids outside archive are limited to alias maps, compatibility fixtures/tests, migration docs, and optional legacy report columns.
- `npm run typecheck`, `npm test`, `npm run build`, `npm run simulate`, `npm run support-decision`, markdown link checks, `git diff --check`, and stale-name scans pass before archival.

## Epic Summary

Stage 2.5 implements Epic 90 from the retheme migration plan as focused slices.

| Slice | Title | Status | Purpose |
| --- | --- | --- | --- |
| 90.1 | Region/Stage Migration Preflight | Complete | Inventory region/stage references, fixtures, reports, and tests before edits |
| 90.2 | Region/Stage Alias Data | Complete | Add explicit aliases and validation coverage without changing canonical ids |
| 90.3 | Save Version And Id Migration | Planned | Bump save version and migrate old region/stage ids in saves/imports/browser storage |
| 90.4 | Static Data Region/Stage Rename | Planned | Rename canonical region/stage ids and all static references |
| 90.5 | Report, Tooling, And Web Continuity | Planned | Keep simulator exports, web state, diagnostics, and workflows coherent |
| 90.6 | Region/Stage Compatibility Hardening | Planned | Run full compatibility proof, stale scans, docs updates, and archive readiness |

---

## Slice 90.1: Region/Stage Migration Preflight

### Goal

Make the region/stage compatibility surface explicit before changing canonical ids.

### Tasks

- Audit references to all legacy region ids and stage ids across `data/`, `core/`, `web/`, `tools/`, `tests/`, and active docs.
- Classify every hit as static data, save migration, report/export output, web state, fixture, test expectation, docs history, or later-stage content id.
- Confirm the target id table and numeric stage-id rule.
- Identify all static data fields that store stage refs: `regions[].stageIds`, `regions[].unlockCondition.stageId`, budget exceptions, `stages[].regionId`, `stages[].nextStageId`, hero/style/assignment/medicine unlocks, and test fixtures.
- Identify all save fields that store region/stage refs: `progress.maps`, `currentStageId`, `selectedOfflineFarmStageId`, and any save diagnostics or fixtures derived from them.
- Decide which report/export outputs need temporary `legacyRegionId` and `legacyStageId` columns.

### Acceptance Criteria

- Contributors can see exactly which region/stage surfaces Stage 2.5 owns.
- The target id list covers every configured region and stage.
- Tests are classified as canonical-id tests, compatibility tests, or later-stage legacy tests.
- No content ids or save-field names are accidentally scheduled for this stage.

### Test Coverage

- Markdown link check if docs change.
- `git diff --check`.
- Stale region/stage id scan.

### Preflight Decisions

- Stage 2.5 owns only region ids and stage ids, plus direct references to those ids.
- Content ids that merely contain old region words are not part of this stage. Examples include `bamboo_road_patrol`, `mist_valley_acolyte`, and `demon_cult_ritualist`; these stay for Stage 2.6 content id migration.
- The target id table is confirmed: five region aliases and one stage alias per configured route, using prefix migration with numeric suffixes preserved.
- Save migration must bump `SAVE_DATA_VERSION` because `progress.maps`, `progress.currentStageId`, and `selectedOfflineFarmStageId` store region/stage ids.
- Report/export compatibility should add temporary legacy id context to structured outputs. `buildBalanceAuthoringExport`, `formatBalanceStageExportCsv`, and tactic comparison exports should carry `legacyRegionId` and/or `legacyStageId` where they currently emit canonical `regionId` and `stageId`. Human-readable report text may show legacy ids only where it helps compare before/after simulator output.

### Reference Inventory

Static data fields owned by Stage 2.5:

- `data/regions.json`: `id`, `stageIds`, `unlockCondition.stageId`, `balanceTargets.rewardCurve.allowedRegressions[].stageId`, and `balanceTargets.budgetExceptions[].stageId`.
- `data/stages.json`: `id`, `regionId`, and `nextStageId`.
- `data/heroes.json`, `data/styles.json`, `data/assignments.json`, and `data/medicines.json`: stage unlock refs only.
- `tools/fixtures/supportIdentityPrototypes.ts` and test helpers: region/stage fixture refs only.

Save and browser-storage fields owned by Stage 2.5:

- `progress.maps` keys.
- `progress.currentStageId`.
- `selectedOfflineFarmStageId` values.
- Save migration, validation, load transaction, factory, browser storage, diagnostics, and import/export paths that normalize or display those values.

Report, tooling, and web surfaces owned by Stage 2.5:

- `core/balance/balanceReportBuilder.ts`, `core/balance/simulatedBalanceReport.ts`, and report formatters that emit region/stage ids.
- `tools/balance/exportReport.ts` JSON/CSV exports and tactic comparison rows.
- `tools/supportDecision/decision.ts` and its prototype fixture references to Redline routes.
- Web route selection, offline farm selection, save diagnostics, and workflow baselines.

Test classification:

- Canonical-id tests should move static-data, progression, web workflow, and balance expectations to Path of Neon region/stage ids after canonical data changes.
- Compatibility tests should keep old region/stage ids in save fixtures, import/browser-storage tests, alias tests, and stale-scan classification.
- Later-stage legacy tests should keep content ids, resource fields, combat stat fields, and tactic ids unchanged unless they directly reference migrated region/stage ids.

### Progress Notes

- Ran stale region/stage id scans across `data/`, `core/`, `web/`, `tools/`, `tests/`, and active docs.
- Confirmed current legacy region/stage hits are concentrated in static data, save fixtures/tests, progression/offline/web tests, balance reports/exports, support-decision fixtures, and migration docs.
- Confirmed `data/enemies.json` and assignment ids contain old region words as content ids; those are explicitly out of scope for Stage 2.5.
- Confirmed Stage 2.5 should not start with static data edits until alias data and save migration behavior exist.

---

## Slice 90.2: Region/Stage Alias Data

### Goal

Add explicit alias data for region and stage ids before behavior changes.

### Tasks

- Add a region/stage alias module using `CompatibilityAliasEntry` with phase `region_stage_ids`.
- Include one alias per region id and one alias per stage id.
- Include reference fields that name where each alias can appear, such as `regionId`, `stageId`, `nextStageId`, `currentStageId`, `selectedOfflineFarmStageId`, and `progress.maps`.
- Add lookup helpers for normalizing region ids, stage ids, and map-key dictionaries.
- Add tests for duplicate alias rejection, region lookup, stage lookup, target lookup, and missing-id behavior.
- Keep existing static data unchanged in this slice.

### Acceptance Criteria

- Alias data covers every current configured region and stage.
- Static validation can use the alias data without migrating ids yet.
- Later save/static-data slices can call shared helpers instead of duplicating string maps.

### Test Coverage

- New compatibility alias tests.
- Static data coverage test proving every configured region/stage has an alias.
- `npm run typecheck`.

### Implementation Decisions

- Region/stage aliases live in `core/compatibility/regionStageAliases.ts` so save migration, static validation, reports, and web state can share the same source of truth.
- The alias phase is `region_stage_ids`, separate from Stage 2.4 `product_keys` aliases.
- Region aliases cover the five configured regions; stage aliases cover every configured route with numeric suffixes preserved.
- `normalizeRegionId` and `normalizeStageId` accept legacy, canonical, or unknown ids. Legacy ids normalize to target ids, while canonical and unknown ids remain stable.
- `normalizeRegionMapKeys` reports collisions when both legacy and canonical keys are present and preserves the canonical entry instead of overwriting it.
- Static data remains unchanged in this slice; canonical id migration starts in later slices after save migration behavior is ready.

### Progress Notes

- Added `REGION_ALIASES`, `STAGE_ALIASES`, `REGION_STAGE_ALIASES`, and lookup indexes.
- Added helper coverage for region id normalization, stage id normalization, and region-keyed map normalization.
- Added compatibility tests proving every current configured region and stage has an alias.
- Confirmed `npm run typecheck` and focused alias tests pass with static ids still unchanged.

---

## Slice 90.3: Save Version And Id Migration

### Goal

Migrate old region/stage ids in persisted saves without changing unrelated save fields.

### Tasks

- Bump `SAVE_DATA_VERSION`.
- Add migration logic for legacy region keys in `progress.maps`.
- Migrate `progress.currentStageId` and top-level `selectedOfflineFarmStageId` values through the stage alias map.
- Preserve field names such as `maps`, `combatExperience`, and `selectedOfflineFarmStageId`; only their region/stage id values move in this stage.
- Add fixtures for the immediately previous save version and at least one pre-retheme save that still uses legacy region/stage ids.
- Prove invalid old ids are rejected or normalized intentionally.
- Prove old-key browser saves from `path-of-jianghu.save.v1` still migrate through Stage 2.4 storage compatibility and then through the Stage 2.5 save migration.
- Confirm migration is idempotent and does not grant offline rewards twice.

### Acceptance Criteria

- Legacy saves load into current saves with canonical region/stage ids.
- Current saves are emitted with canonical ids.
- Existing resource, combat, team, equipment, assignment, and tactic fields remain unchanged.
- Browser storage copy-forward behavior still preserves old-key data when writes fail.

### Test Coverage

- Save migration fixture tests for every supported legacy version.
- Focused tests for `progress.maps` key migration.
- Focused tests for `currentStageId` and `selectedOfflineFarmStageId` migration.
- Browser storage migration tests combining legacy storage key and legacy region/stage ids.
- Offline reward idempotency tests.
- Save diagnostics tests.

---

## Slice 90.4: Static Data Region/Stage Rename

### Goal

Make Path of Neon region/stage ids canonical in static data and static references.

### Tasks

- Rename `data/regions.json` ids and `stageIds`.
- Rename `data/stages.json` ids, `regionId`, and `nextStageId`.
- Update region unlock conditions, budget exceptions, and reward-curve exception stage refs.
- Update stage unlock refs in heroes, styles, medicines, assignments, and other static files without changing those content ids.
- Update static-data validation to reject mixed legacy/canonical region and stage ids unless an explicit alias-normalization path owns the input.
- Update tests that assert canonical region/stage ids.

### Acceptance Criteria

- Static data has no legacy region/stage ids outside alias data and compatibility fixtures.
- All configured stages point to canonical region ids and canonical next-stage ids.
- Unlock conditions and budget exceptions refer to canonical stage ids.
- Content ids remain unchanged.

### Test Coverage

- Static data validation suite.
- Balance report tests.
- Progression stage/unlock tests.
- `npm run typecheck`.

---

## Slice 90.5: Report, Tooling, And Web Continuity

### Goal

Keep user workflows and downstream report consumers coherent while canonical ids change.

### Tasks

- Update simulator text, JSON, CSV, and authoring exports to use canonical region/stage ids.
- Add temporary `legacyRegionId` and `legacyStageId` report/export fields where useful for comparing old reports.
- Update web route selection, offline farm target selection, diagnostics, save tools, and import/export flows to display/use canonical ids after migration.
- Update workflow baselines and browser-save tests.
- Confirm `npm run simulate` and `npm run support-decision` still produce meaningful reports after ids change.
- Document any remaining legacy id columns as temporary compatibility output.

### Acceptance Criteria

- Web workflows select and persist canonical stage ids.
- Exports/imports stay schema-based and accept legacy ids through migration.
- Reports are comparable enough for Stage 2.4/2.5 before-and-after review.
- No product/storage key behavior regresses.

### Test Coverage

- Web workflow/save tests.
- Balance report text/JSON/CSV tests.
- Support decision tests.
- `npm run simulate`.
- `npm run support-decision`.

---

## Slice 90.6: Region/Stage Compatibility Hardening

### Goal

Close Stage 2.5 with proof that region/stage id migration is safe and later id migrations remain isolated.

### Tasks

- Run stale-name scans for legacy region/stage ids and classify every remaining hit.
- Confirm remaining `bamboo_road`, `mist_valley`, `black_iron_fort`, `lotus_monastery`, and `demon_cult_outpost` hits outside archive are aliases, fixtures, tests, report legacy columns, or migration docs.
- Update [Path Of Neon Internal Id Migration](path-of-neon-internal-id-migration.md) with Stage 2.5 closure notes.
- Update active docs with the next recommended stage: Stage 2.6 content id migration.
- Confirm [Archived Stage 2.4 Backlog](archive/stage-2.4-backlog.md) stays historical and this backlog is the only active Stage 2.5 plan.
- Prepare archive notes and release-readiness evidence when the stage is complete.

### Acceptance Criteria

- Product/runtime and region/stage compatibility behavior is documented and tested.
- Old saves, old browser storage keys, new saves, exports, imports, reports, and diagnostics remain coherent.
- Content ids, save resource/progress fields, combat stat fields, and report field names remain unchanged except for temporary legacy id columns.
- Stage 2.6 can begin from a clean region/stage id baseline.

### Test Coverage

- `npm run typecheck`.
- `npm test`.
- `npm run build`.
- `npm run simulate`.
- `npm run support-decision`.
- Relevant browser save/import/export smoke.
- `git diff --check`.
- Markdown path/link check.
- Stale region/stage id scan.

## Carried Forward

- Stage 2.6 should own static content id migration for enemies, heroes, skills, styles, equipment, equipment sets, assignments, medicines, statuses, and tactics.
- Stage 2.7 should own save resource/progress field migration, including `silver`, `cultivation`, `herbs`, `maps`, `combatExperience`, and the `selectedOfflineFarmStageId` field-name decision.
- Stage 2.8 should own combat stat fields and code/report symbol migration.
- Stage 2.9 should own legacy cleanup after compatibility policy allows temporary adapters and legacy report columns to be removed.
- Cognitive Intrusion implementation remains separate from id migration and should start from [Cognitive Intrusion Prototype Contract](cognitive-intrusion-prototype-contract.md) once naming and compatibility churn is stable.
