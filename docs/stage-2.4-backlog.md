# Stage 2.4 Backlog

## Current Status

Stage 2.4 is in progress. Stage 2.3 completed the display-safe Path of Neon pivot and is archived at [Stage 2.3 Backlog](archive/stage-2.3-backlog.md).

This backlog turns the first post-retitle compatibility slice from [Path Of Neon Internal Id Migration](path-of-neon-internal-id-migration.md) into an implementation-ready plan. Stage 2.4 should migrate product and storage runtime identity while proving old local players, installed PWAs, exported saves, and tooling remain safe.

## Theme

**Product And Storage Key Migration**

Stage 2.4 should make Path of Neon the canonical runtime identity for package metadata, browser save storage, PWA cache naming, and icon paths. It should also add the first shared alias-map helper shape so later static-id migrations can reuse tested compatibility patterns.

This stage is deliberately narrower than the full internal-id migration. It should not rename region ids, stage ids, content ids, save resource fields, combat stat fields, report columns, or backend payload names.

## Decisions Carried Forward

- Stage 2.3 changed display surfaces but intentionally preserved compatibility keys.
- The browser save key should migrate from `path-of-jianghu.save.v1` to a Path of Neon key through dual-read/copy behavior.
- New-key saves should win when both old and new keys exist.
- A valid old-key save should copy to the new key only after load validation succeeds.
- The old browser save key should not be deleted until the new write succeeds.
- Browser storage migration must not grant offline rewards twice or advance timestamps without a committed write.
- Service-worker cache migration should delete stale old and new shell caches except the current cache.
- The service worker must not read or write browser save storage.
- Old icon paths should remain available or cached for one compatibility release after the canonical icon path changes.
- Alias maps should be explicit data, not project-wide string replacement scripts.

## Stage Goals

- Confirm canonical product/runtime targets for package name, browser save key, service-worker cache name, cache cleanup prefix, and icon path.
- Add a shared alias-map helper foundation that can represent legacy and target keys for product/runtime migration now and static ids later.
- Migrate browser save storage to a Path of Neon key with dual-read/copy behavior, failed-write safety, import/export compatibility, reset semantics, and diagnostics.
- Migrate PWA cache naming and icon paths while retaining installed-PWA compatibility.
- Rename package/tooling identity only where tests prove build, dev, reports, and docs remain coherent.
- Update active docs so contributors know Stage 2.4 owns product/storage keys and Stage 2.5 owns region/stage static ids.
- Close the stage with focused compatibility tests, build checks, docs links, and stale runtime-name scans.

## Non-Goals

- No static id migration for regions, stages, heroes, enemies, equipment, statuses, tactics, assignments, skills, styles, or medicines.
- No persisted save resource/progress field rename such as `silver`, `cultivation`, `herbs`, `maps`, or `combatExperience`.
- No combat stat field rename for `outer*`, `inner*`, `qiBreak*`, or recovery fields.
- No save schema version bump unless the browser storage migration changes payload shape, which it should avoid.
- No deletion of old browser save data unless a later compatibility policy explicitly approves cleanup.
- No backend API field rename or production storage migration.
- No Cognitive Intrusion implementation; use [Cognitive Intrusion Prototype Contract](cognitive-intrusion-prototype-contract.md) for that later slice.
- No broad stale-name cleanup outside product/runtime keys; legacy internal ids remain expected after this stage.

## Exit Criteria

- Active docs point to this Stage 2.4 backlog for product/storage key migration and to [Path Of Neon Internal Id Migration](path-of-neon-internal-id-migration.md) for later id/schema slices.
- Canonical product/runtime keys are documented and covered by tests.
- Browser save storage reads the new key first, falls back to the old key, copies valid old saves to the new key, and preserves the old key if the copy fails.
- Import/export behavior remains schema-based and accepts old exported saves after browser storage has moved.
- Reset and diagnostics behavior are explicit when both old and new save keys exist.
- PWA activation cleans stale `path-of-jianghu-shell-*` and stale `path-of-neon-shell-*` caches without touching browser save storage.
- Canonical icon paths work while old icon paths remain compatible for installed PWAs.
- Shared alias-map helper coverage exists without migrating static ids.
- `npm run typecheck`, `npm test`, `npm run build`, relevant PWA/browser storage smoke, `git diff --check`, markdown path checks, and stale runtime-name scans pass before archival.

## Epic Summary

Stage 2.4 implements Epic 89 from the retheme migration plan as focused slices.

| Slice | Title | Status | Purpose |
| --- | --- | --- | --- |
| 89.1 | Product And Storage Migration Preflight | Complete | Confirm target keys, current references, fixtures, and guard tests before edits |
| 89.2 | Shared Alias Map Helper Foundation | Complete | Add reusable alias-map shape and tests without migrating static ids |
| 89.3 | Browser Save Key Migration | Complete | Add dual-read/copy behavior for old and new save keys |
| 89.4 | PWA Cache And Icon Path Migration | Planned | Rename cache/icon runtime identity with installed-PWA compatibility |
| 89.5 | Package And Tooling Identity Rename | Planned | Rename package/tool display identity while keeping reports/builds coherent |
| 89.6 | Product/Storage Compatibility Hardening | Planned | Prove old saves, new saves, PWA caches, docs, and stale scans are safe |

---

## Slice 89.1: Product And Storage Migration Preflight

### Goal

Make the compatibility surface explicit before changing runtime keys.

### Tasks

- Audit current references to `path-of-jianghu`, `path-of-jianghu.save.v1`, `path-of-jianghu-shell-v1`, `path-of-jianghu-shell-`, and `/icons/path-of-jianghu.svg`.
- Confirm canonical targets for package name, save key, cache name, cache cleanup prefix, and icon path.
- Identify tests that intentionally guard old compatibility keys from Stage 2.3.
- Decide which tests should change in Stage 2.4 and which should become legacy-compatibility tests.
- Confirm whether browser storage migration can reuse the current save schema version because payload shape stays unchanged.
- Define failure cases for old-key copy, quota/storage exceptions, invalid old saves, and both-key conflicts.

### Acceptance Criteria

- Contributors can see exactly which runtime keys Stage 2.4 owns.
- Guard tests are classified as target-key tests or legacy-compatibility tests.
- No static ids or save payload fields are scheduled for this stage.
- Browser storage migration risks are listed before implementation begins.

### Test Coverage

- Markdown path/link check if docs change.
- `git diff --check`.
- Source scan for current product/runtime key references.

### Preflight Decisions

Canonical Stage 2.4 product/runtime targets:

| Surface | Current value | Target value | Owning slice |
| --- | --- | --- | --- |
| Package name | `path-of-jianghu` | `path-of-neon` | 89.5 |
| Browser save key | `path-of-jianghu.save.v1` | `path-of-neon.save.v1` | 89.3 |
| Service-worker cache name | `path-of-jianghu-shell-v1` | `path-of-neon-shell-v1` | 89.4 |
| Service-worker cleanup prefix | `path-of-jianghu-shell-` | clean both `path-of-jianghu-shell-` and `path-of-neon-shell-` | 89.4 |
| Canonical icon path | `/icons/path-of-jianghu.svg` | `/icons/path-of-neon.svg` | 89.4 |
| Legacy icon path | `/icons/path-of-jianghu.svg` | retained as a compatibility alias for one release | 89.4 |

Browser save migration can reuse the current save schema version because Stage 2.4 changes the storage key, not the save payload shape. No `SAVE_DATA_VERSION` bump is expected in this stage.

Current implementation references:

| Surface | Active files |
| --- | --- |
| Package identity | `package.json`, `package-lock.json` |
| Browser save key | `web/state/saveStorage.ts`, `web/state/viewModels/saveDiagnostics.ts` |
| PWA shell/icon identity | `index.html`, `public/manifest.webmanifest`, `public/service-worker.js`, `public/icons/path-of-jianghu.svg` |
| Contributor docs | `docs/save-api.md`, `docs/pwa-readiness.md`, `docs/web-ui-architecture.md`, `docs/path-of-neon-terminology-map.md`, `docs/path-of-neon-internal-id-migration.md`, this backlog |

Current guard tests and how they should move:

| Test area | Current role | Stage 2.4 treatment |
| --- | --- | --- |
| `tests/compatibility/rethemeCompatibility.test.ts` | Proves Stage 2.3 did not change package, save key, icon path, or cache key. | Split expectations: canonical runtime identity should move to Path of Neon, while legacy keys remain covered through explicit compatibility adapters and stale-name classifications. |
| `tests/web/saveStorage.test.ts` | Exercises current-key save load, save, import, export, reset, migration rewrite, write failure, diagnostics, and invalid storage paths through `WEB_SAVE_STORAGE_KEY`. | Keep current-key tests on the new canonical key, then add explicit old-key-only, new-key-only, both-key, invalid old-key, and failed old-key-copy cases. |
| `tests/web/offlineRewardIdempotency.test.ts` and `tests/web/offlineTimeTravel.test.ts` | Prove offline reward timestamps remain safe through current-key storage. | Add or adapt cases where old-key migration attempts offline rewards and a failed copy must not claim rewards twice. |
| `tests/web/pwa.test.ts` | Proves retained icon path, legacy cache name, shell-only caching, and save-storage isolation. | Update canonical cache/icon expectations to Path of Neon, then add legacy icon availability and old/new cache cleanup coverage. |

Browser save-key failure cases for Slice 89.3:

| Case | Expected behavior |
| --- | --- |
| New key exists and old key exists | Load the new key. Do not overwrite it from the old key. Diagnostics should make both-key compatibility visible. |
| New key exists and old key is invalid | Load the new key. Do not fail because a legacy backup is bad. |
| New key is missing and old key is valid | Load and validate the old save, then copy the normalized/current payload to the new key. Keep the old key. |
| New key is missing and old-key copy fails | Keep the old key, surface startup diagnostics, and avoid treating migrated state as durable. Offline rewards must remain pending rather than claimed twice. |
| New key is missing and old key is invalid JSON | Follow existing invalid-save behavior and do not write the new key. |
| New key is missing and old key has invalid save data | Follow existing invalid-save behavior and do not write the new key. |
| New-key read throws a storage error | Return a storage error instead of falling through to old-key migration, because storage availability is unreliable. |
| Old-key read throws after new key is missing | Return a storage error and do not write the new key. |
| Reset after migration lands | Write the canonical new key and do not silently erase the old-key backup. |
| Import after migration lands | Write imported saves to the canonical new key while still accepting old-schema payloads. |
| Export after migration lands | Export the active canonical save; old-key-only storage should load through the migration path first. |

### Progress Notes

- Audited active product/runtime key references across package metadata, browser save storage, save diagnostics, PWA manifest/service worker/icon paths, PWA tests, save-storage tests, offline reward tests, compatibility tests, and active docs.
- Confirmed Stage 2.4 should target `path-of-neon`, `path-of-neon.save.v1`, `path-of-neon-shell-v1`, `path-of-neon-shell-`, and `/icons/path-of-neon.svg` while retaining legacy read/cleanup/icon compatibility.
- Classified Stage 2.3 guard tests into target-key expectations and legacy-compatibility expectations for the next slices.
- Confirmed the browser storage key migration should avoid a save schema version bump because the payload shape remains unchanged.
- Defined old/new save-key conflict, invalid-save, storage-error, failed-copy, reset, import, export, and offline reward idempotency cases for Slice 89.3.

---

## Slice 89.2: Shared Alias Map Helper Foundation

### Goal

Add a small compatibility helper shape that can support product/runtime key aliases now and static id aliases later.

### Tasks

- Define an alias entry shape aligned with [Path Of Neon Internal Id Migration](path-of-neon-internal-id-migration.md): legacy id, target id, display name or label, reference fields, and owning phase.
- Add product/runtime alias entries for package name, browser save key, service-worker cache name, cache cleanup prefix, and icon path.
- Keep region, stage, content, and save-field aliases as documented future data, not active migrations.
- Add helper tests for lookup by legacy id, lookup by target id, duplicate detection, missing alias behavior, and phase filtering.
- Decide whether the helper belongs in `core/`, `web/state`, or a narrow shared migration module based on who needs it in Stage 2.4.
- Document that alias helpers do not authorize blind text replacement.

### Acceptance Criteria

- Product/runtime aliases are represented as data with tests.
- Later static-id migrations can extend the shape without changing the Stage 2.4 API.
- No static data ids, save payload keys, or report ids are renamed by this slice.
- Duplicate and missing alias cases fail loudly in tests or validation.

### Test Coverage

- Focused alias helper unit tests.
- `npm run typecheck`.
- `git diff --check`.

### Implementation Decisions

- The generic alias helper lives in `core/compatibility` so later save/schema and static-id migrations can reuse it without depending on browser or PWA modules.
- Stage 2.4 product/runtime alias data lives in `web/runtimeIdentityAliases.ts` because package, browser storage, service-worker cache, and icon paths are runtime shell concerns rather than gameplay data.
- The helper intentionally returns `null` for missing aliases so callers can decide whether a miss is acceptable lookup behavior or a validation failure.
- Duplicate `legacyId` and `targetId` entries throw immediately when the index is built.
- Product/runtime aliases are limited to package name, browser save key, service-worker cache name, service-worker cache cleanup prefix, and PWA icon path. Region, stage, content, save-field, and report aliases remain later-stage work.

### Progress Notes

- Added `CompatibilityAliasEntry` and `buildCompatibilityAliasIndex` in `core/compatibility/aliasMap.ts`.
- Exported the compatibility helper from `core/index.ts` for future backend-safe migration callers.
- Added `PRODUCT_RUNTIME_ALIASES` and `PRODUCT_RUNTIME_ALIAS_INDEX` in `web/runtimeIdentityAliases.ts` for the Stage 2.4 product/runtime migration targets.
- Added focused tests covering product/runtime target data, lookup by legacy id, lookup by target id, phase filtering, missing alias behavior, duplicate legacy ids, and duplicate target ids.

---

## Slice 89.3: Browser Save Key Migration

### Goal

Move the canonical browser save key to Path of Neon without losing existing local saves.

### Tasks

- Introduce the new canonical save key, likely `path-of-neon.save.v1`.
- On load, read the new key first.
- If no new-key save exists, read the old `path-of-jianghu.save.v1` key.
- Validate and normalize old-key saves before copying them to the new key.
- Preserve the old key if the new-key write fails.
- Ensure old-key migration is idempotent and does not grant offline rewards twice.
- Define reset behavior after migration lands: reset should write the canonical new key and should not silently erase old-key backups.
- Keep import/export based on save schema payloads, not browser storage key names.
- Update save diagnostics so both-key states are understandable.

### Acceptance Criteria

- New-key saves win when both keys exist.
- Valid old-key saves load and copy to the new key.
- Invalid old-key saves follow existing invalid-save behavior without poisoning the new key.
- Failed new-key writes do not delete old-key data.
- Offline reward timestamps and rewards remain idempotent during migration.
- Export/import works for old exported saves regardless of current browser storage key.

### Test Coverage

- Focused web save-storage tests for old-only, new-only, both-key, invalid old-key, and failed-copy cases.
- Offline reward idempotency/time-travel tests where old-key migration can affect timestamps.
- Save diagnostics tests.
- `npm run typecheck`.

### Implementation Decisions

- `WEB_SAVE_STORAGE_KEY` is now the canonical `path-of-neon.save.v1` key.
- `LEGACY_WEB_SAVE_STORAGE_KEY` preserves the old `path-of-jianghu.save.v1` key for fallback reads and copy-forward compatibility.
- Default storage callers read the canonical key first. They only fall back to the legacy key when the canonical key is missing; invalid or unreadable canonical storage does not fall through to legacy.
- Explicit key arguments still target the provided key, which keeps focused tests and future compatibility probes possible.
- Legacy-key startup loads write the validated/current save to the canonical key and retain the legacy key.
- Failed legacy-key copies keep the legacy key, avoid creating a partial canonical key, and surface startup diagnostics.
- Save diagnostics now show the canonical key, active key, and whether a legacy backup exists.

### Progress Notes

- Updated `web/state/saveStorage.ts` so the canonical save key is `path-of-neon.save.v1`, with legacy fallback to `path-of-jianghu.save.v1` when the canonical key is missing.
- Added `storageKeyMigrated` as a web startup persistence reason so failed copy-forward attempts are visible without changing the core save schema.
- Updated save diagnostics and the Save Tools panel to distinguish canonical, active, and legacy backup keys.
- Added focused tests for old-key copy-forward, canonical-key precedence, invalid legacy saves, failed legacy copies, offline reward idempotency on failed copies, and canonical read errors.
- Updated compatibility and runtime-alias tests so Stage 2.4 now treats the Path of Neon save key as canonical while preserving the legacy key as an explicit adapter.

---

## Slice 89.4: PWA Cache And Icon Path Migration

### Goal

Make Path of Neon the canonical PWA shell identity while protecting installed PWAs.

### Tasks

- Rename the service-worker cache name to a Path of Neon value, likely `path-of-neon-shell-v1`.
- Update cache cleanup so activation deletes stale `path-of-jianghu-shell-*` and stale `path-of-neon-shell-*` caches except the current cache.
- Confirm non-GET requests and `/api/` requests remain outside the shell cache.
- Ensure the service worker does not read or write `localStorage`, `sessionStorage`, or IndexedDB.
- Add the canonical icon path, likely `/icons/path-of-neon.svg`.
- Keep `/icons/path-of-jianghu.svg` available or cached for one release so installed shortcuts do not break.
- Update manifest, PWA tests, and browser smoke notes for icon-path compatibility.

### Acceptance Criteria

- PWA install metadata and app shell use canonical Path of Neon runtime identity.
- Old and stale new shell caches are cleaned safely during activation.
- Save storage remains outside service-worker responsibility.
- Both old and new icon paths work during the compatibility window.
- PWA tests prove cache exclusions and icon availability.

### Test Coverage

- PWA unit/static tests for manifest, cache name, cleanup prefixes, API/non-GET exclusions, and icon paths.
- Build and static smoke against the built app if implementation touches PWA assets.
- `npm run build`.
- `git diff --check`.

---

## Slice 89.5: Package And Tooling Identity Rename

### Goal

Rename package and tooling display identity to Path of Neon without breaking local scripts or report interpretation.

### Tasks

- Rename `package.json` package identity if package publishing constraints allow it.
- Update package-lock metadata consistently.
- Check script output, CLI/report headers, app startup text, and docs that quote package/runtime names.
- Keep report field names and static ids unchanged unless explicitly covered by later stages.
- Update tests that assert package or runtime display identity.
- Confirm `npm install`, `npm run typecheck`, `npm test`, `npm run build`, `npm run simulate`, and `npm run support-decision` still run with the new package identity.

### Acceptance Criteria

- Package/tooling identity reads as Path of Neon where it is product/runtime metadata.
- Build, test, simulator, and support-decision commands are unaffected.
- Report columns and static ids remain stable.
- Any remaining `path-of-jianghu` hits outside archive are intentional compatibility references.

### Test Coverage

- `npm install` only if lockfile/package metadata requires regeneration.
- `npm run typecheck`.
- `npm test`.
- `npm run build`.
- `npm run simulate`.
- `npm run support-decision`.
- Stale runtime-name scan.

---

## Slice 89.6: Product/Storage Compatibility Hardening

### Goal

Close Stage 2.4 with proof that product/runtime migration is safe and later id migrations remain isolated.

### Tasks

- Run the full focused browser-save and PWA compatibility suite.
- Run stale-name scans and classify remaining hits as aliases, legacy fixtures, archive docs, compatibility tests, or comments.
- Update [Path Of Neon Internal Id Migration](path-of-neon-internal-id-migration.md) with Stage 2.4 closure notes.
- Update active docs with the next recommended stage: Stage 2.5 region/stage static id migration.
- Confirm [Archived Stage 2.3 Backlog](archive/stage-2.3-backlog.md) stays historical and this backlog is the only active Stage 2.4 plan.
- Prepare archive notes and release-readiness evidence when the stage is complete.

### Acceptance Criteria

- Product/runtime compatibility behavior is documented and tested.
- Old browser saves, new browser saves, installed-PWA shell behavior, exports, imports, and diagnostics remain coherent.
- Static ids and save payload fields remain unchanged.
- Stage 2.5 can begin from a clean product/storage baseline.

### Test Coverage

- `npm run typecheck`.
- `npm test`.
- `npm run build`.
- `npm run simulate`.
- `npm run support-decision`.
- Relevant PWA/browser smoke.
- `git diff --check`.
- Markdown path/link check.
- Stale runtime-name scan.

## Carried Forward

- Stage 2.5 should own region and stage static id migration, starting with alias helpers and `progress.maps` compatibility.
- Later stages should own content ids, save resource/progress fields, combat stat fields, code/report symbols, and legacy cleanup.
- Cognitive Intrusion implementation should remain separate from product/storage migration and start from [Cognitive Intrusion Prototype Contract](cognitive-intrusion-prototype-contract.md).

## Suggested Implementation Order

1. Slice 89.1: Product And Storage Migration Preflight
2. Slice 89.2: Shared Alias Map Helper Foundation
3. Slice 89.3: Browser Save Key Migration
4. Slice 89.4: PWA Cache And Icon Path Migration
5. Slice 89.5: Package And Tooling Identity Rename
6. Slice 89.6: Product/Storage Compatibility Hardening

This order inventories the current compatibility surface first, adds reusable alias structure before behavior changes, migrates local save storage before the PWA shell cleanup, then closes with package/tooling identity and full compatibility proof.
