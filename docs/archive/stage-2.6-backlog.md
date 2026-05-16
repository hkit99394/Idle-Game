# Stage 2.6 Backlog

## Current Status

Stage 2.6 is complete. Stage 2.5 region/stage static id migration is complete and archived at [Archived Stage 2.5 Backlog](stage-2.5-backlog.md). Slices 91.1 through 91.8 are complete: the content-id preflight, alias data, save-version migration, hostile/status static rename, initiate/protocol/style static rename, augment/countermeasure/operation/routine static rename, report/tooling/web continuity work, and closure hardening are now in place.

This backlog turns Epic 91 from [Path Of Neon Retheme Migration Plan](../retheme-migration-plan.md) into an implementation-ready static content id migration. It should migrate Path of Neon content ids while preserving old saves, imports, fixtures, reports, browser storage compatibility, and simulator continuity.

## Theme

**Static Content Id Migration**

Stage 2.6 should migrate static content ids after the region/stage baseline is canonical. It owns enemy, hero, skill, skill-upgrade, style, style-branch, equipment, equipment-set, assignment, medicine, status, and tactic ids, plus direct references to those ids.

This stage is broader than Stage 2.5 and must stay split into focused slices. It should not rename persisted resource/progress field names, combat stat fields, report/code symbols, product/runtime keys, or region/stage ids.

## Decisions Carried Forward

- Stage 2.5 already made region and route ids canonical and keeps explicit region/stage aliases for compatibility.
- Stage 2.6 content id migration needs explicit alias data before changing static data.
- `SAVE_DATA_VERSION` is now `12` because supported saves store content ids in progress maps such as heroes, skill upgrades, style mastery, style branches, equipment inventory/equipped slots, medicine inventory, assignment progress, auto-medicine disabled lists, active team ids, formation slots, and selected tactic values.
- Current save field names remain technical. `selectedTacticId` may store a migrated routine id, but the field name should not become `selectedRoutineId` until the save resource/progress field stage.
- Static validation should reject legacy content ids in canonical static data after their owning slice lands.
- Reports and exports may need temporary legacy content-id context only where downstream users compare old and new outputs.
- Do not use broad string replacement across the repo. Use explicit alias data, targeted migrations, and tests.

## Content Id Inventory

Slice 91.1 classified the owned ids, references, save fields, test surfaces, report/export continuity needs, and migrate/keep/defer decisions in [Stage 2.6 Content Id Preflight](stage-2.6-content-id-preflight.md). The summary inventory is:

| Category | Source | Count | Save/static references |
| --- | --- | ---: | --- |
| Hostile families | `data/enemies.json` | 5 | enemy `family`, battle/simulator grouping, mastery family modifiers |
| Hostiles | `data/enemies.json` | 26 | `data/stages.json` `enemyTeam.combatantIds`, battle/simulator reports, fixtures |
| Initiates | `data/heroes.json` | 5 | `progress.heroes`, `activeHeroIds`, `formation`, assignment hero lists, hero unlock refs |
| Protocols | `data/skills.json`, `data/skillUpgrades.json` | 28 skills, 5 upgrades | hero/enemy `skillIds`, `progress.skillUpgrades`, upgrade `skillId`, status effects in upgrade payloads |
| Styles | `data/styles.json` | 7 styles, 7 branch ids | hero/enemy `style`, equipment and assignment `allowedStyles`, `progress.styleMastery`, `progress.styleBranches` keys and values |
| Augments | `data/equipment.json`, `data/equipmentSets.json` | 14 equipment, 1 set | stage drops, assignment equipment rewards, inventory keys, equipped slots, `setId` |
| Countermeasures | `data/medicines.json` | 3 | `progress.medicineInventory`, auto-medicine inventory, disabled medicine ids |
| Statuses | `data/statusEffects.json` | 5 | skill effects, budget expected status ids, battle records, web status presentation |
| Operations | `data/assignments.json` | 4 | `progress.assignments`, assignment reward/apply tests, operation view models |
| Routines | `data/tactics.json` | 6 | `progress.selectedTacticId`, tactic comparison exports, simulator CLI/options |

## Initial Target Draft

The initial draft is now superseded by the full target matrix in [Stage 2.6 Content Id Preflight](stage-2.6-content-id-preflight.md). It covers 116 ids and family buckets: 98 migrate decisions and 18 keep decisions.

Important 91.1 decisions:

- `burning_blood`, `burning_blood_captain`, and `burning_blood_edict` remain Redline doctrine/status flavor and do not receive no-op aliases.
- `lotus_mender` targets `lotus_clinic_stabilizer` to avoid colliding with the initiate target `lotus_stabilizer`.
- `white_crane_sword` targets `white_crane_edge_branch` to avoid colliding with the protocol target `white_crane_edge`.
- `SkillEffect.type = "wound"`, cleanse `dispelTags`, battle event/status symbols, resource/save field names, and combat stat fields are deferred to later save-field or combat-symbol stages.

## Stage Goals

- Add explicit content alias data using the existing compatibility alias-helper pattern.
- Bump the save version and normalize old content ids in every supported save path.
- Rename canonical static content ids and direct content references in focused slices.
- Keep old save imports, browser saves, fixtures, simulator reports, web workflows, and tool exports coherent.
- Keep region/stage compatibility from Stage 2.5 unchanged.
- Document remaining legacy ids as save-field, combat-symbol, report-field, or cleanup work for later stages.

## Non-Goals

- No region or stage id migration. Stage 2.5 owns that and is closed.
- No persisted resource/progress field rename such as `silver`, `cultivation`, `herbs`, `maps`, `combatExperience`, `selectedOfflineFarmStageId`, or `selectedTacticId`.
- No combat stat field rename for `outer*`, `inner*`, `qiBreak*`, or recovery fields.
- No product/runtime key migration for browser storage keys, PWA cache names, package metadata, or icon paths.
- No removal of Stage 2.4 or Stage 2.5 compatibility aliases.
- No Cognitive Intrusion implementation.
- No rebalance unless a content id rename exposes a validation/reporting bug.

## Exit Criteria

- Canonical static data emits Path of Neon content ids for all categories owned by this stage.
- Legacy saves and imports with old content ids migrate to canonical ids.
- Current-version imports with old content ids normalize to canonical ids, matching the tightened Stage 2.5 behavior.
- Static validation rejects legacy content ids in canonical data after the owning slice lands.
- Reports, web views, save diagnostics, imports/exports, and simulator outputs remain readable and schema-based.
- Remaining legacy content ids outside `docs/archive` are limited to alias maps, compatibility fixtures/tests, migration docs, temporary legacy report columns, or later-stage save-field/combat-symbol work.
- `npm run typecheck`, `npm test`, `npm run build`, `npm run simulate`, `npm run support-decision`, markdown link checks, `git diff --check`, and stale-name scans pass before archival.

## Epic Summary

Stage 2.6 implements Epic 91 from the retheme migration plan as focused slices.

| Slice | Title | Status | Purpose |
| --- | --- | --- | --- |
| 91.1 | Content Id Migration Preflight | Complete | Inventory every content id/reference and finalize migrate-or-keep target table |
| 91.2 | Content Alias Data | Complete | Add explicit aliases and shared normalization helpers without changing canonical ids |
| 91.3 | Save Version And Content Id Migration | Complete | Bump save version and migrate old content ids in saves/imports/browser storage |
| 91.4 | Hostile And Status Static Rename | Complete | Rename enemy/family/status ids and battle/status static references |
| 91.5 | Initiate, Protocol, And Style Static Rename | Complete | Rename hero, skill, skill-upgrade, style, and style-branch ids plus direct references |
| 91.6 | Augment, Countermeasure, Operation, And Routine Static Rename | Complete | Rename equipment, set, medicine, assignment, and tactic ids plus direct references |
| 91.7 | Report, Tooling, And Web Continuity | Complete | Keep simulator exports, web state, diagnostics, and workflows coherent |
| 91.8 | Content Compatibility Hardening | Complete | Run full compatibility proof, stale scans, docs updates, and archive readiness |

---

## Slice 91.1: Content Id Migration Preflight

Status: complete.

### Goal

Make the content-id compatibility surface explicit before alias or static-data edits.

### Tasks

- Inventory every content id and reference across `data/`, `core/`, `web/`, `tools/`, `tests/`, and active docs.
- Expand the target table to cover every owned id, including enemy families and style branch ids.
- Classify each id as migrate, keep, or defer with a reason.
- Classify tests as canonical-id tests, compatibility tests, or later-stage legacy tests.
- Identify all save fields that store content ids.
- Decide which reports/exports need temporary legacy content-id context.
- Confirm whether `burning_blood` remains a doctrine/status id or migrates to a different Path of Neon term.

### Acceptance Criteria

- Contributors can see exactly which content surfaces Stage 2.6 owns.
- The target id list covers every configured static content id and save-stored content id.
- No save-field names, combat stat fields, or region/stage ids are accidentally scheduled for this stage.

### Test Coverage

- Markdown link check if docs change.
- `git diff --check`.
- Stale content-id scan.

### Completion Notes

- Added [Stage 2.6 Content Id Preflight](stage-2.6-content-id-preflight.md) with the owned-surface inventory, persisted content-id fields, target matrix, defer list, test classification, report/export continuity plan, and 91.2 handoff.
- Confirmed every configured Stage 2.6 content id and hostile family has a migrate or keep decision before alias/static-data edits begin.
- Confirmed `burning_blood` remains Redline doctrine/status flavor.

---

## Slice 91.2: Content Alias Data

Status: complete.

### Goal

Add explicit content alias data before behavior changes.

### Tasks

- Add content alias modules using `CompatibilityAliasEntry`.
- Include alias phases for `hostile_ids`, `initiate_ids`, `protocol_ids`, `style_ids`, `augment_ids`, `countermeasure_ids`, `status_ids`, `operation_ids`, and `routine_ids`.
- Include reference fields for every static/save/report surface each alias can appear in.
- Add lookup helpers for normalizing ids and map-key dictionaries by category.
- Add tests for duplicate alias rejection, legacy lookup, target lookup, normalization, reverse legacy lookup, and missing-id behavior.
- Keep existing static data unchanged in this slice.

### Acceptance Criteria

- Alias data covers every id classified as migrate in Slice 91.1.
- Static validation can use the alias data without migrating ids yet.
- Later save/static-data slices can call shared helpers instead of duplicating string maps.

### Test Coverage

- New compatibility alias tests.
- Static coverage tests proving every migrated category has an alias or a documented keep decision.
- `npm run typecheck`.

### Completion Notes

- Added `core/compatibility/contentIdAliases.ts` with 98 content aliases from the 91.1 target matrix.
- Split alias data by kind and phase: hostile family, hostile, initiate, protocol, skill upgrade, style, style branch, augment, augment set, countermeasure, status, operation, and routine.
- Added category-aware helpers for legacy lookup, target lookup, normalization, equivalent-id checks, alias sets, and map-key normalization with collision reporting.
- Kept static data unchanged; `tests/compatibility/contentIdAliases.test.ts` proves aliases match the 91.1 preflight matrix and keep decisions.

---

## Slice 91.3: Save Version And Content Id Migration

Status: complete.

### Goal

Migrate old content ids in persisted saves without changing unrelated save fields.

### Tasks

- Bump `SAVE_DATA_VERSION`.
- Normalize content ids in:
  - `progress.heroes` keys;
  - `progress.activeHeroIds`;
  - `progress.formation` slot values;
  - `progress.styleMastery` keys;
  - `progress.styleBranches` keys and selected branch ids;
  - `progress.skillUpgrades` keys;
  - `progress.equipment.inventory` keys;
  - `progress.equipment.equipped[heroId][slot]` hero and equipment ids;
  - `progress.medicineInventory` keys;
  - `progress.assignments` keys and `heroIds`;
  - `progress.selectedTacticId`;
  - `autoMedicinePreferences.disabledMedicineIds`.
- Preserve field names such as `heroes`, `styleMastery`, `skillUpgrades`, `medicineInventory`, `assignments`, and `selectedTacticId`.
- Add fixtures for the immediately previous save version and at least one pre-retheme save with legacy content ids.
- Prove current-version imports with legacy content ids normalize to canonical ids.
- Confirm migration is idempotent and does not grant offline rewards twice.

### Acceptance Criteria

- Legacy saves load into current saves with canonical content ids.
- Current saves are emitted with canonical content ids.
- Existing resources, combat stat fields, region/stage ids, browser storage keys, and report-field names remain unchanged.

### Test Coverage

- Save migration fixture tests for every supported legacy version.
- Focused tests for each save-stored content-id category.
- Browser storage import tests combining old storage-key compatibility and old content ids.
- Offline reward idempotency tests.
- Save diagnostics tests.

### Completion Notes

- Bumped `SAVE_DATA_VERSION` to `12` and retained version `11` as a supported legacy version.
- Added data-aware content-id normalization across every save-stored Stage 2.6 content-id field: heroes, active team ids, formation keys, style mastery, style branches, skill upgrades, equipment inventory/equipped ids, medicine inventory, assignment ids and hero ids, selected tactic values, and auto-medicine disabled medicine ids.
- Kept save field names, resources, combat stat fields, region/stage compatibility, browser storage keys, and report field names unchanged.
- The migration helper supports both sides of each alias during static rename sequencing: before an owning rename lands it can normalize target aliases back to the configured id side, and after the rename lands it normalizes old saves forward to target ids through the same helper path.
- Added focused save migration and browser storage import coverage for content aliases, including current-version import normalization and legacy version `11` migration against target-id static data.

---

## Slice 91.4: Hostile And Status Static Rename

Status: complete.

### Goal

Make hostile and status ids canonical in static data and battle/report references.

### Tasks

- Rename `data/enemies.json` ids and enemy `family` values according to the approved target table.
- Rename `data/statusEffects.json` ids.
- Update `data/stages.json` enemy team refs.
- Update skill/status effect refs and region budget expected status refs.
- Update combat, auto-medicine, balance, web status presentation, and fixture expectations.
- Preserve built-in combat event/status symbols such as `guard`, `protection`, `armor_break`, `inner_defense_down`, and `regeneration` unless Slice 91.1 explicitly schedules them.

### Acceptance Criteria

- Canonical static data has no migrated legacy hostile/status ids outside alias data and compatibility fixtures.
- Battle simulation and report rows use canonical hostile/status ids where those ids are emitted.
- Old saves and imports still accept legacy ids through the save migration.

### Test Coverage

- Static data validation suite.
- Combat status/skill effect tests.
- Auto-medicine tests.
- Balance report tests.
- `npm run simulate`.

### Completion Notes

- Renamed canonical hostile ids, hostile family ids, status ids, stage enemy-team refs, and `apply_status.statusId` refs through the approved 91.1 target table.
- Kept explicit keep decisions unchanged, including `veilstep_needler`, `shieldwall_guard`, `forge_chain_hook`, `blood_brand_duelist`, `marrow_lock_supplicant`, `burning_blood_captain`, and `burning_blood`.
- Preserved timed combat symbols and cleanse taxonomy such as `wound`, `poison`, `guard`, `protection`, `armor_break`, `inner_defense_down`, `regeneration`, and `wounded_or_armor_broken_ally`.
- Kept deterministic status-application rolls stable across id aliases so the rename does not rebalance combat outcomes.
- Updated combat, counterplay, auto-medicine, balance/report, web presentation, support-decision prototype, and compatibility expectations to emit canonical hostile/status ids.
- Added compatibility coverage proving landed hostile/status static ids are canonical while later categories remain on their current configured ids.

---

## Slice 91.5: Initiate, Protocol, And Style Static Rename

Status: complete.

### Goal

Make hero, skill, skill-upgrade, style, and style-branch ids canonical.

### Tasks

- Rename `data/heroes.json` ids, `style`, `skillIds`, and direct unlock refs.
- Rename `data/skills.json` ids.
- Rename `data/skillUpgrades.json` ids and `skillId` refs.
- Rename `data/styles.json` ids and branch ids.
- Update style refs in heroes, enemies, equipment, assignments, unlock conditions, mastery, and tests.
- Update save migration coverage for hero progress, active team, formation, style mastery, style branches, and skill-upgrade progress.

### Acceptance Criteria

- Canonical static data uses Path of Neon ids for initiates, protocols, styles, and branches.
- Old saves with legacy team/style/protocol ids migrate correctly.
- Web team, progression, equipment compatibility, and style branch workflows remain coherent.

### Test Coverage

- Static data validation suite.
- Progression/team/upgrade/style tests.
- Web state workflow tests.
- Save migration tests.
- `npm run typecheck`.

### Completion Notes

- Renamed canonical initiate ids, protocol ids, skill-upgrade ids, style ids, and style-branch ids through the approved 91.1 target table.
- Updated direct references in heroes, enemies, skill upgrades, styles, equipment `allowedStyles`, assignment `allowedStyles`, style branch unlocks, starter roster defaults, formation defaults, fallback combat skill selection, and balance formation scenarios.
- Kept the remaining augment, countermeasure, operation, and routine aliases isolated for the dedicated 91.6 static rename slice.
- Kept legacy save fixtures intentionally legacy so versioned migration coverage proves old teams, formations, style mastery, style branches, and skill-upgrade progress migrate to canonical ids.
- Updated web progression, equipment compatibility, display terms, combat, offline rewards, save storage, and compatibility snapshots to use canonical 91.5 ids.

---

## Slice 91.6: Augment, Countermeasure, Operation, And Routine Static Rename

Status: complete.

### Goal

Make equipment, equipment-set, medicine, assignment, and tactic ids canonical.

### Tasks

- Rename `data/equipment.json` ids and `setId` refs.
- Rename `data/equipmentSets.json` ids.
- Rename stage `equipmentDrops[].equipmentId` and assignment `equipmentRewardsPerHour[].equipmentId`.
- Rename `data/medicines.json` ids and auto-medicine references.
- Rename `data/assignments.json` ids.
- Rename `data/tactics.json` ids while preserving the `selectedTacticId` save field name.
- Update save migration coverage for inventory, equipped items, medicine inventory, auto-medicine disabled ids, assignment progress, and selected tactic values.

### Acceptance Criteria

- Canonical static data uses Path of Neon ids for augments, countermeasures, operations, and routines.
- Old saves with legacy equipment, medicine, assignment, and tactic ids migrate correctly.
- Web equipment, countermeasure, operation, and tactic workflows remain coherent.

### Test Coverage

- Static data validation suite.
- Equipment/progression tests.
- Auto-medicine tests.
- Assignment/offline reward tests.
- Tactic comparison tests.
- Web workflow/save tests.

### Completion Notes

- Renamed canonical augment, augment-set, countermeasure, operation, and routine ids through `data/equipment.json`, `data/equipmentSets.json`, `data/medicines.json`, `data/assignments.json`, and `data/tactics.json`.
- Updated direct static references in stage equipment drops, assignment equipment rewards, equipment `setId`, runtime default tactic selection, static validation, web view models, simulator tactic comparison expectations, and save/import workflows.
- Preserved the persisted `selectedTacticId` save field name while migrating stored values such as `outer_pressure` to `kinetic_crush` and defaulting new progress to `balanced_routine`.
- Kept legacy fixture inputs and alias-map tests intentionally old so equipment inventory, equipped slots, medicine inventory, disabled medicine ids, assignment progress, and selected tactic values continue to prove compatibility.
- Verified focused compatibility/save tests and the broader combat, progression, offline, web, balance, counterplay, and tools suites after the rename.

---

## Slice 91.7: Report, Tooling, And Web Continuity

Status: complete.

### Goal

Keep user workflows and downstream report consumers coherent while content ids change.

### Tasks

- Update simulator text, JSON, CSV, and tactic comparison exports to use canonical content ids.
- Add temporary `legacy*` fields only where useful for report comparison.
- Update web diagnostics, export/import flows, battle summaries, route cards, operation panels, equipment panels, countermeasure panels, and tactic controls as needed.
- Update workflow baselines and browser-save tests.
- Confirm `npm run simulate` and `npm run support-decision` still produce meaningful reports after ids change.
- Document any remaining legacy content-id columns as temporary compatibility output.

### Acceptance Criteria

- Web workflows select, display, export, import, and persist canonical content ids.
- Exports/imports stay schema-based and accept legacy ids through migration.
- Reports remain comparable enough for Stage 2.5/2.6 before-and-after review.

### Test Coverage

- Web workflow/save tests.
- Balance report JSON/CSV/tactic export tests.
- Support decision tests.
- `npm run simulate`.
- `npm run support-decision`.

### Completion Notes

- Balance authoring and tactic comparison exports now use schema version `3`.
- Canonical ids remain the primary report fields while temporary legacy content-id context is included for comparison: stage enemy/status ids and tactic/baseline tactic ids.
- Web save import/export and workflow coverage remains schema-based: current saves persist canonical content ids, while legacy content ids still normalize through the save migration path.
- `npm run simulate` and `npm run support-decision` remain the continuity checks before Stage 2.6 hardening.

---

## Slice 91.8: Content Compatibility Hardening

Status: complete.

### Goal

Close Stage 2.6 with proof that static content id migration is safe and later migration stages remain isolated.

### Tasks

- Run stale-name scans for legacy content ids and classify every remaining hit.
- Confirm remaining old ids outside archive are aliases, fixtures, tests, temporary report columns, or migration docs.
- Update [Path Of Neon Internal Id Migration](../path-of-neon-internal-id-migration.md) with Stage 2.6 closure notes.
- Update active docs with the next recommended stage: Stage 2.7 save resource/progress field migration.
- Prepare archive notes and release-readiness evidence when the stage is complete.

### Acceptance Criteria

- Content id compatibility behavior is documented and tested.
- Old saves, old browser storage keys, new saves, exports, imports, reports, and diagnostics remain coherent.
- Save resource/progress fields, combat stat fields, and report/code symbols remain unchanged except for intentional temporary legacy comparison output.
- Stage 2.7 can begin from a clean static-content id baseline.

### Test Coverage

- `npm run typecheck`.
- `npm test`.
- `npm run build`.
- `npm run simulate`.
- `npm run support-decision`.
- Relevant browser save/import/export smoke.
- `git diff --check`.
- Markdown path/link check.
- Stale content-id scan.

### Implementation Decisions

- Stage 2.6 closure keeps the content alias map, save normalization, old-save fixtures, current-version import normalization, and temporary legacy report columns. Removing those adapters belongs to Stage 2.9 or a later compatibility cleanup, not this stage.
- The exact static-data scan over all 98 legacy content aliases has only intentional hits: `black_iron_saber` is now the canonical augment id while also being the legacy hostile id for `ironwall_saber`, and `poison`/`wound` remain deferred combat/dispel taxonomy symbols.
- Browser smoke is covered by source-level save import/export workflow tests for this docs/tooling closure slice. No visible UI or web-state transition changed in 91.8, so in-app browser smoke is not required by the release checklist.
- Stage 2.7 should begin with save resource/progress field migration. Stage 2.6 intentionally leaves field names such as `silver`, `cultivation`, `herbs`, `maps`, `combatExperience`, `selectedOfflineFarmStageId`, and `selectedTacticId` unchanged.

### Stale-Scan Classification

Remaining legacy content-id hits outside `docs/archive` are intentional in these buckets:

| Bucket | Expected locations | Disposition |
| --- | --- | --- |
| Content aliases | `core/compatibility/contentIdAliases.ts` and alias tests | Required compatibility surface for old saves/imports/report comparison. |
| Region/stage aliases inherited from Stage 2.5 | `core/compatibility/regionStageAliases.ts` and region/stage compatibility tests | Required compatibility surface for old route saves/imports/report comparison. |
| Legacy save fixtures and import tests | `tests/fixtures/`, `tests/save/`, `tests/web/saveStorage.test.ts`, and compatibility tests | Required proof that pre-Stage 2.6 and current-version legacy content ids normalize to canonical ids. |
| Temporary legacy export columns | `tools/balance/exportReport.ts` and `tests/tools/balanceReport.test.ts` | Intentional schema v3 comparison fields from Slice 91.7. |
| Deferred combat/dispel taxonomy | `core/combat/**`, `data/skillUpgrades.json`, `data/statusEffects.json`, `data/medicines.json`, related tests, and battle view models | `SkillEffect.type = "wound"` and `StatusDispelTag` values such as `poison` and `wound` are combat-symbol work for Stage 2.8, not static content ids. |
| Alias collision | `data/equipment.json` and `data/stages.json` for `black_iron_saber` | Intentional: the old hostile id maps to `ironwall_saber`, while `black_iron_saber` is the canonical augment id after Slice 91.6. |
| Migration, planning, and historical prose docs | this backlog, [Path Of Neon Internal Id Migration](../path-of-neon-internal-id-migration.md), [Path Of Neon Retheme Migration Plan](../retheme-migration-plan.md), [Path Of Neon Terminology Map](../path-of-neon-terminology-map.md), [Stage 2.6 Content Id Preflight](stage-2.6-content-id-preflight.md), and older design/reference docs | Intentional history, alias mapping, ordinary prose such as "balanced" or "sustain", and next-stage planning. |

### Progress Notes

- Ran an alias-derived scan over all 98 Stage 2.6 legacy content aliases and classified remaining hits as compatibility aliases, fixtures/tests, temporary report columns, deferred combat/dispel symbols, the `black_iron_saber` cross-category alias collision, migration docs, or ordinary prose.
- Ran an exact static-data scan over all 98 legacy aliases and confirmed no stale migrated static content ids remain; the only exact hits are the intentional `black_iron_saber` canonical augment id and deferred `poison`/`wound` combat/dispel taxonomy.
- Confirmed focused compatibility, save migration, web save workflow, and balance export tests pass after the 91.7 export schema changes.
- Updated the internal-id migration, retheme planning, onboarding, and current-system docs to mark Stage 2.6 closed and set Stage 2.7 save resource/progress field migration as the next recommended stage.

### Release Readiness Evidence

Validated for Stage 2.6 closure:

- `npm run typecheck` passed.
- `npm test` passed.
- `npm run build` passed.
- `npm run simulate` passed and reports canonical content ids with the expected known balance debt still visible.
- `npm run support-decision` passed.
- Export smoke passed for `npm run --silent simulate -- --export-json`, `--csv`, `--tactics-json`, and `--tactics-csv`: authoring JSON and tactic exports have `schemaVersion: 3`, canonical ids remain primary, and temporary legacy comparison fields are present.
- Focused compatibility smoke passed for content aliases, retheme compatibility, save migrations, web save storage, web workflow baselines, and balance report exports.
- Markdown path/link check passed after archival.
- `git diff --check` passed.
- Stale content-id scans passed by classification: remaining hits outside `docs/archive` are aliases, fixtures/tests, temporary legacy export fields, migration docs, the intentional `black_iron_saber` alias collision, deferred combat/dispel symbols, or ordinary prose.

## Carried Forward

- Stage 2.7 should own save resource/progress field migration, including `silver`, `cultivation`, `herbs`, `maps`, `combatExperience`, and the `selectedOfflineFarmStageId` and `selectedTacticId` field-name decisions.
- Stage 2.8 should own combat stat fields and code/report symbol migration.
- Stage 2.9 should own cleanup of temporary legacy adapters and report columns after compatibility policy allows.
- Cognitive Intrusion implementation remains separate from id migration and should start from [Cognitive Intrusion Prototype Contract](../cognitive-intrusion-prototype-contract.md) once naming and compatibility churn is stable.
