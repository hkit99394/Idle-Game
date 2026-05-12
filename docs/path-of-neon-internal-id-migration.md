# Path Of Neon Internal Id Migration

This document defines how Path of Neon should migrate legacy internal ids and persisted field names after the display-safe retheme is complete.

Internal id migration is a real product direction, but it must be handled as a compatibility migration. It should not be mixed into casual UI copy changes, because ids and field names are used by saves, static data references, tests, reports, browser storage, PWA caches, and future backend payloads.

## Decision

Migrate legacy Path of Jianghu internal names to Path of Neon internal names through a dedicated migration phase.

Until that phase lands, existing ids and save fields remain valid. After the phase lands, old saves, exports, fixtures, and browser storage must still load through compatibility adapters.

## Stage 2.3 Closure Snapshot

Stage 2.3 completed the display-safe retheme without changing compatibility keys.

- Product shell, manifest display metadata, live web copy, static display names, and visual identity now say Path of Neon.
- Static ids still use legacy keys such as `bamboo_road`, `demon_cult_outpost`, `iron_fist_disciple`, `balanced`, and `qi_suppression`.
- Persisted save fields still use legacy keys such as `silver`, `cultivation`, `herbs`, `maps`, `combatExperience`, and `selectedOfflineFarmStageId`.
- The browser save key now uses `path-of-neon.save.v1` while still reading/copying the legacy `path-of-jianghu.save.v1` key. The PWA shell now uses `path-of-neon-shell-v1` and `/icons/path-of-neon.svg` while still cleaning old `path-of-jianghu-shell-*` caches and retaining `/icons/path-of-jianghu.svg` for installed-PWA compatibility. The package name still uses `path-of-jianghu`.
- Epic 87 added guard tests for these keys, so the later migration should update those tests intentionally rather than bypassing them.

## Scope

Internal names include three different categories.

| Category | Examples | Migration risk |
| --- | --- | --- |
| Static ids | `bamboo_road`, `demon_cult_outpost`, `hero_outer_training`, `inner_defense_down`, `balanced` | Breaks stage unlock refs, save refs, reports, tests, and data validation if renamed without aliasing. |
| Persisted save fields | `silver`, `cultivation`, `herbs`, `combatExperience`, `sect`, `maps`, `innerQi`, `selectedOfflineFarmStageId` | Requires a save schema version bump and fixture coverage. |
| Product/runtime keys | `path-of-jianghu.save.v1`, `path-of-jianghu-shell-v1`, `path-of-jianghu.svg`, package/app metadata | Requires dual-read/write or cleanup behavior so existing local players and installed PWAs do not lose state. |

## Migration Principles

- Add explicit alias maps before changing data ids.
- Bump the save schema before changing persisted save fields.
- Preserve legacy import support for all supported save versions.
- Keep archived docs historical unless a link path breaks.
- Prefer compatibility adapters over deleting old names immediately.
- Keep report output comparable during the transition by showing migrated ids and, where useful, legacy aliases.
- Run static validation, save fixtures, web storage tests, simulator reports, and PWA tests in the same migration stage.

## Alias Map Expectations

Every migration slice should start by adding explicit aliases. Alias maps should be data, not string-replacement scripts, and every entry should include the legacy id, target id, target display name, affected references, and the migration phase that owns it.

Minimum alias entry shape:

| Field | Purpose |
| --- | --- |
| `legacyId` | Existing id accepted from saves, exports, fixtures, static refs, reports, and old URLs if any. |
| `targetId` | New canonical id emitted by current saves, exports, static data, and reports after the owning phase. |
| `displayName` | Current player-facing name used to confirm the target id matches Stage 2.3 vocabulary. |
| `referenceFields` | Fields that can contain this id, such as `stageId`, `regionId`, `heroId`, `skillId`, `equipmentId`, `statusId`, `selectedTacticId`, or map keys. |
| `phase` | One of `product_keys`, `region_stage_ids`, `content_ids`, `save_fields`, or `combat_symbols`. |

The first implementation should expose alias maps through reusable helpers, then route save migration, static-data validation, report formatting, and import normalization through the same source of truth.

### Product And Runtime Key Aliases

| Current key/path | Target key/path | Required migration behavior |
| --- | --- | --- |
| `path-of-jianghu` package name | `path-of-neon` | Rename only after build/test tooling and report labels are verified. |
| `path-of-jianghu.save.v1` | `path-of-neon.save.v1` | Dual-read old and new keys; write the new key only after old-key load succeeds. |
| `path-of-jianghu-shell-v1` | `path-of-neon-shell-v1` | Delete stale old and new prefix caches during activation except the current cache. |
| `/icons/path-of-jianghu.svg` | `/icons/path-of-neon.svg` | Keep the old asset path available until installed PWAs have had one cleanup release. |

### Static Id Alias Slices

Start static ids with region and stage aliases, then move through content ids in smaller follow-up slices.

| Slice | Alias expectation |
| --- | --- |
| Regions | One alias per `regions[].id`; save `progress.maps` keys and report region ids must migrate together. |
| Stages/routes | One alias per `stages[].id`; preserve numeric stage suffixes for the first slice to keep old save refs easy to audit. |
| Hostiles | One alias per enemy id; migrate stage `enemyIds`, battle reports, and fixtures together. |
| Initiates | One alias per hero id; migrate active team ids, hero progress keys, assignment hero lists, equipment owners, and unlock refs together. |
| Protocols | One alias per skill and skill-upgrade id; migrate hero `skillIds`, upgrade refs, report labels, and save upgrade keys together. |
| Augments | One alias per equipment and equipment-set id; migrate inventory keys, equipped slots, drops, assignment rewards, and set refs together. |
| Countermeasures | One alias per medicine id; migrate inventory keys and auto-medicine disabled lists together. |
| Statuses | One alias per status id and a separate decision for battle event ids such as `qi_break`. |
| Operations | One alias per assignment id; migrate assignment progress keys and unlock refs together. |
| Routines | One alias per tactic id; migrate `selectedTacticId` only when the save-field phase owns the field rename. |

Representative content alias targets from the Stage 2.3 display retheme:

| Category | Legacy id | Target id |
| --- | --- | --- |
| Region | `bamboo_road` | `greenline_approach` |
| Region | `mist_valley` | `veil_district` |
| Region | `black_iron_fort` | `black_iron_foundry` |
| Region | `lotus_monastery` | `lotus_clinic` |
| Region | `demon_cult_outpost` | `redline_outpost` |
| Hostile | `bamboo_bandit` | `greenline_cutter` |
| Hostile | `black_fort_commander` | `black_foundry_commander` |
| Hostile | `demon_cult_ritualist` | `redline_ritualist` |
| Hostile | `demon_cult_overseer` | `redline_overseer` |
| Initiate | `iron_fist_disciple` | `iron_fist_initiate` |
| Initiate | `azure_palm_monk` | `azure_pulse_monk` |
| Initiate | `white_crane_swordsman` | `white_crane_edge_runner` |
| Initiate | `mountain_staff_guardian` | `mountain_brace_guardian` |
| Initiate | `lotus_mending_disciple` | `lotus_stabilizer` |
| Protocol | `iron_fist_combo` | `impact_combo` |
| Protocol | `meridian_shock` | `context_shock` |
| Protocol | `sweeping_staff` | `brace_sweep` |
| Protocol | `lotus_mending_vow` | `lotus_stabilizer_vow` |
| Augment | `willow_palm_manual` | `willow_pulse_protocol` |
| Augment | `calming_breath_pill` | `calming_context_stim` |
| Augment | `lotus_dew_pill` | `lotus_dew_countermeasure` |
| Countermeasure | `clear_heart_pill` | `clear_heart_countermeasure` |
| Countermeasure | `quiet_meridian_powder` | `quiet_context_powder` |
| Status | `poison` | `corruption` |
| Status | `wound` | `trauma` |
| Status | `qi_suppression` | `context_suppression` |
| Status | `vulnerable` | `exposed` |
| Operation | `bamboo_road_patrol` | `greenline_sweep` |
| Operation | `mist_valley_meditation` | `veil_district_calibration` |
| Operation | `black_iron_drill_yard` | `black_foundry_calibration_yard` |
| Operation | `lotus_medicine_pavilion` | `lotus_countermeasure_pavilion` |
| Routine | `balanced` | `balanced_routine` |
| Routine | `outer_pressure` | `kinetic_crush` |
| Routine | `inner_pressure` | `context_break` |
| Routine | `guard_support` | `guard_the_stabilizer` |
| Routine | `sustain` | `long_stabilization` |
| Routine | `boss_burst` | `gatekeeper_burst` |

The table is a target draft, not a license to rename every file at once. Each content slice must expand the table to cover every id in that category before editing static data.

## Proposed Migration Order

### 1. Product And Storage Keys

Migrate shell/runtime identity first because it is narrow and easy to test.

| Current | Target |
| --- | --- |
| `package.json` name `path-of-jianghu` | `path-of-neon` |
| `path-of-jianghu.save.v1` | `path-of-neon.save.v1` with old-key read and migration |
| `path-of-jianghu-shell-v1` | `path-of-neon-shell-v1` with old-cache cleanup |
| `public/icons/path-of-jianghu.svg` | `public/icons/path-of-neon.svg` |

Required behavior:

- On load, read the new save key first.
- If no new-key save exists, read the old key.
- If the old key loads successfully, write the migrated or copied save to the new key.
- Do not delete the old key until the new write succeeds.
- Keep import/export behavior schema-based, not storage-key-based. Pasted old exports should still parse even if browser storage has already moved to the new key.
- Keep load transactions idempotent: old-key migration must not grant offline rewards twice or advance timestamps without a committed write.
- Service-worker activation must delete stale old and new shell caches except the current cache.
- The service worker must not read or write `localStorage`, `sessionStorage`, or IndexedDB during cache migration.
- If the icon path changes, cache both old and new icon paths for one release or keep a network fallback for the old path so installed shortcuts do not show a broken icon.

### 2. Static Content Ids

Migrate static ids after display names are stable.

First confirmed region targets:

| Current id | Target id |
| --- | --- |
| `bamboo_road` | `greenline_approach` |
| `mist_valley` | `veil_district` |
| `black_iron_fort` | `black_iron_foundry` |
| `lotus_monastery` | `lotus_clinic` |
| `demon_cult_outpost` | `redline_outpost` |

Stage ids should migrate with their region prefix and preserve the numeric suffix in the first migration slice:

```text
bamboo_road_1 -> greenline_approach_1
mist_valley_6 -> veil_district_6
demon_cult_outpost_7 -> redline_outpost_7
```

Named boss stages can receive more expressive ids in a later cleanup only after the numeric migration is stable. The first static-id slice should prioritize predictable save compatibility over perfect naming.

Data migration needs alias maps for:

- region ids;
- stage ids;
- enemy ids;
- hero ids;
- skill ids;
- style ids;
- equipment ids;
- equipment set ids;
- assignment ids;
- medicine ids;
- status ids;
- tactic ids.

Do not migrate all of these in one blind text replacement. Start with region/stage ids, then migrate combat/content ids in smaller slices once display names are final.

Approved display-family targets for style ids after the Stage 2.3 taxonomy decision:

| Current id | Display family | Likely future id |
| --- | --- | --- |
| `fist` | Impact Style | `impact` |
| `palm` | Pulse Style | `pulse` |
| `leg` | Vector Style | `vector` |
| `sword` | Edge Style | `edge` |
| `blade` | Rend Style | `rend` |
| `staff` | Brace Style | `brace` |
| `hidden_weapons` | Ghostware Style | `ghostware` |

These are target directions for the later migration only. Stage 2.3 copy may use the display family names, but `styleId`, `styleMastery`, `styleBranches`, equipment `allowedStyles`, branch unlocks, save fixtures, and tests must keep legacy ids until alias maps and save migration fixtures exist.

### 3. Save Schema Fields

Persisted save fields should migrate after static ids.

Likely target fields:

| Current field | Target field |
| --- | --- |
| `silver` | `credits` |
| `cultivation` | `resonance` |
| `herbs` | `reagents` |
| `combatExperience` | `combatData` |
| `sect` | `technoSect` |
| `maps` | `districts` |
| `selectedOfflineFarmStageId` | `selectedOfflineFarmRouteId` |
| `selectedTacticId` | `selectedRoutineId` only if tactics become routines in UI and data |

Save-version strategy:

- Product/storage-key migration can reuse the current save schema if the payload shape does not change; it still needs browser-storage tests proving old-key saves copy to the new key safely.
- Static id migration needs a new `SAVE_DATA_VERSION` because persisted fields store ids in `currentStageId`, `selectedOfflineFarmStageId`, `progress.maps`, hero progress keys, active team ids, assignment hero ids, equipment inventory/equipped ids, disabled medicine ids, and `selectedTacticId`.
- Resource and progress field migration should be a separate `SAVE_DATA_VERSION` after static ids are stable. It owns `silver` -> `credits`, `cultivation` -> `resonance`, `herbs` -> `reagents`, `maps` -> `districts`, and map-level `combatExperience` -> `combatData`.
- Selected farm route migration should happen with the resource/progress field migration unless stage ids have not landed yet. Do not rename `selectedOfflineFarmStageId` while it still stores legacy stage ids.
- Combat stat field migration should be later than resource/progress fields. It touches broader combat, reports, and possible future backend payloads, and should not be coupled to storage-key migration.
- Every version bump needs fixtures for the immediately previous version and for at least one old pre-retheme save that still uses legacy ids and fields.

Combat stat field migration is larger and should be its own sub-phase:

| Current field family | Target direction |
| --- | --- |
| `outer*` | `body*` or `kinetic*`, depending on whether the field is durability or damage. |
| `inner*` / `*InnerQi` | `context*` or `cognitive*`, depending on whether the field is stability or damage. |
| `qiBreak*` | `aiOverload*`. |
| `innerRecovery*` | `contextRebuild*` or `cognitiveReboot*`, depending on baseline versus boost behavior. |

Do not rename combat stat fields until the naming split is final. `outerAttack` maps more naturally to `kineticAttack`, while `outerHp` maps better to `bodyIntegrity`; a single prefix replacement would make the model less clear.

### 4. Code Symbols And Report Fields

After save and static data migration, code symbols can be renamed in focused modules:

- `core/combat` formula constants and event types;
- `core/progression` resource and stage helper names;
- `core/offline` reward input/output names;
- `core/balance` report row fields;
- `web/state` action and view-model field names;
- `tools/balance` export columns.

For tool exports, consider one transition release where JSON/CSV includes both new and legacy id columns:

```text
stageId, legacyStageId, districtId, legacyRegionId
```

Then remove legacy columns only after downstream docs/tests stop relying on them.

## Save Migration Requirements

The internal id migration must add:

- a new `SAVE_DATA_VERSION`;
- fixture coverage for every supported legacy save version;
- tests proving old region/stage ids migrate to new ids;
- tests proving old resource fields migrate to new fields;
- tests proving invalid old ids are still rejected or normalized intentionally;
- tests proving old-key browser saves migrate to the new browser key without losing offline reward timestamps;
- tests proving export/import supports old saves and emits current-schema saves.

## Browser Storage Migration Requirements

The browser key migration from `path-of-jianghu.save.v1` to a Path of Neon key must prove:

- new-key saves win when both keys exist;
- old-key saves load when the new key is missing;
- a valid old-key save is copied to the new key before the app presents migrated state as durable;
- the old key is retained if the new-key write fails;
- offline rewards are applied at most once during the copy;
- reset writes only the new key after migration lands, unless a temporary dual-write period is explicitly chosen;
- export reads the active new-key save but import still accepts old schema payloads;
- save diagnostics clearly label storage-key compatibility if both keys exist.

## PWA Cache Migration Requirements

The PWA cache migration from `path-of-jianghu-shell-v1` to a Path of Neon cache name must prove:

- activation deletes old `path-of-jianghu-shell-*` caches and stale `path-of-neon-shell-*` caches except the current cache;
- app shell URLs include the current manifest and icon paths;
- old icon paths remain available or cached for one release if installed PWAs may still reference them;
- non-GET and `/api/` requests stay outside the shell cache;
- the service worker does not touch browser save storage.

## Validation Requirements

Before marking the migration complete:

```sh
npm run typecheck
npm test
npm run build
npm run simulate
npm run support-decision
git diff --check
```

Additional focused checks:

```sh
rg "path-of-jianghu|bamboo_road|demon_cult_outpost|innerQi|outerHp|cultivation|silver"
```

Expected remaining hits after migration should be limited to:

- migration alias tables;
- legacy save fixtures;
- archived historical docs;
- compatibility tests;
- comments explaining legacy behavior.

## Follow-Up Epic Split

Keep implementation slices narrow. A safe backlog shape:

1. Product/storage key migration: package name, browser save key dual-read/copy, PWA cache prefix cleanup, icon path compatibility, and PWA tests.
2. Region/stage alias migration: alias helpers, region/stage static ids, save `currentStageId`, `selectedOfflineFarmStageId`, `progress.maps`, simulator report ids, and fixtures.
3. Content id migration: hostiles, initiates, protocols, augments, countermeasures, statuses, operations, and routines in small batches with static validation and save/import coverage.
4. Save resource/progress field migration: resources, districts, Combat Data, selected farm route field, diagnostics labels, the legacy schema term visibility decision, and export/import fixtures.
5. Combat symbol/report migration: combat stat fields, event names, balance CSV/JSON columns, and one transition period with `legacy*` report columns where downstream consumers need them.
6. Legacy cleanup: stale-name scans, docs cleanup outside `docs/archive`, and removal of temporary dual-write behavior only after old-key import/read tests prove enough compatibility time has passed.

Cognitive Intrusion implementation is separate from these migration slices. It should begin from [Cognitive Intrusion Prototype Contract](cognitive-intrusion-prototype-contract.md) once the naming and compatibility surface is stable enough to avoid churn.

## Recommended Backlog Placement

Do not fold the full migration into the display-safe retheme. Stage 2.3 intentionally completed without changing compatibility keys. The next stage should begin with the product/storage key migration or with a small alias-helper implementation, not with a project-wide replacement.

[Stage 2.4 Backlog](stage-2.4-backlog.md) is the active plan for the first slice: product/storage key migration plus shared alias-map helper foundation. It should close before region/stage static ids move.

Recommended sequence:

1. Stage 2.3: display-safe Path of Neon pivot, completed with compatibility keys preserved.
2. Stage 2.4: product/storage key migration and shared alias-map helpers.
3. Stage 2.5: region/stage static id migration.
4. Stage 2.6: content id migration for hostiles, initiates, protocols, augments, countermeasures, statuses, operations, and routines.
5. Stage 2.7: save resource/progress field migration.
6. Stage 2.8: combat-symbol and report-field migration.
7. Stage 2.9: cleanup of temporary legacy adapters when compatibility policy allows.
8. Prototype implementation: Cognitive Intrusion, starting from the completed Stage 2.3 contract once it can avoid naming or compatibility churn.

If the team wants a faster route, combine stages 2.4 and 2.5, but keep save-field and combat-symbol migration separate. That is the highest-risk layer.
