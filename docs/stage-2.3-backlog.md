# Stage 2.3 Backlog

## Current Status

Stage 2.3 is ready to start. Stage 2.2 completed backend/PWA readiness and is archived at [Stage 2.2 Backlog](archive/stage-2.2-backlog.md).

This backlog translates [Path Of Neon Retheme Migration Plan](retheme-migration-plan.md) into an implementation-ready Stage 2.3 plan. The stage is intentionally display-safe first: it should make Path of Neon visible and coherent without changing persisted save fields, static ids, browser storage keys, package names, or PWA cache ownership.

## Theme

**Path Of Neon Design Pivot**

Stage 2.3 should turn the current Path of Neon direction into a visible product identity and a safer implementation contract. The first pass should update docs, product-shell display copy, web UI terminology, static display names, and visual identity while preserving legacy compatibility keys. It should also choose one small neon-native system prototype so the retheme is not only copy replacement.

Epics 79-88 are in scope for this stage. Epics 89-97 from the retheme migration plan are later compatibility and internal-id migration work unless the team deliberately reopens scope.

## Decisions Carried Forward

- Use **Path of Neon** as the product and world identity.
- Keep legacy internal ids, save fields, browser save key, package name, and service-worker cache prefix stable until a dedicated migration changes them.
- Treat display terms and internal contract names separately in docs, tests, reports, and future backend payloads.
- Do not rewrite archived backlogs beyond fixing broken links caused by file moves.
- Use **Combat Data** as the main UI term for Combat XP while technical docs may still mention `combatExperience`.
- Do not lock style names to a simple one-word replacement before the style taxonomy decision is complete.
- Prototype **Cognitive Intrusion** first, with **District Heat** as the preferred second neon-native system.
- Keep known Black Iron Foundry and Redline tuning debt visible; do not mix broad rebalance into the retheme stage.

## Stage Goals

- Establish the Path of Neon theme, terminology, and compatibility contract as the active planning source.
- Rename product-shell display surfaces such as README, app title, manifest metadata, and icon identity without changing storage/package/cache compatibility keys.
- Decide the cyber-native style taxonomy before broad style-bearing content retheme work.
- Add a centralized or consistently testable display vocabulary layer for repeated UI terms.
- Retheme web UI copy and static data display fields while preserving static ids and save schema fields.
- Choose and specify one small neon-native system prototype, likely Cognitive Intrusion.
- Add visual identity updates with responsive/browser smoke coverage.
- Close the stage with compatibility hardening and a narrow internal-id migration contract for future stages.

## Non-Goals

- No save schema field rename in Stage 2.3.
- No static id rewrite for regions, stages, heroes, enemies, equipment, statuses, tactics, assignments, or skills.
- No browser save key migration from `path-of-jianghu.save.v1`.
- No package rename, production backend rename, or backend API field rename.
- No service-worker cache prefix migration unless it is explicitly covered by old-cache cleanup and tests.
- No full Cognitive Intrusion implementation unless the prototype contract is approved and remains small.
- No implementation of every neon-native system candidate in one stage.
- No archived backlog rewrite except broken-link repair.

## Exit Criteria

- Active docs point to the Stage 2.3 backlog, theme bible, terminology map, retheme plan, and internal-id migration plan.
- Product-shell display surfaces say Path of Neon while compatibility keys remain stable.
- Web UI terminology and static data display text are rethemed consistently enough for a player-facing pass.
- Style taxonomy decisions are documented before style-bearing data copy is broadly changed.
- One neon-native system prototype has a focused contract and follow-up implementation scope.
- Visual identity changes pass desktop and narrow mobile smoke checks without overlap or clipped controls.
- Old saves, exported saves, static ids, PWA shell behavior, balance reports, and docs links remain coherent.
- `npm run typecheck`, `npm test`, `npm run build`, `npm run simulate`, `npm run support-decision`, relevant PWA/browser smoke, `git diff --check`, and markdown path checks pass before archival.

## Epic Summary

| Epic | Title | Status | Purpose |
| --- | --- | --- | --- |
| 79 | Path Of Neon Theme And Systems Contract | Complete | Confirm active theme docs, terminology, compatibility rules, and prototype direction |
| 80 | Product Shell Display Rename | Complete | Rename public product-shell display copy while preserving compatibility keys |
| 81 | Style Taxonomy Decision | Complete | Choose cyber-native style names and mappings before style-bearing copy changes |
| 82 | Theme Vocabulary Layer | Complete | Centralize repeated display terms or make them consistently testable |
| 83 | UI Copy Retheme | Complete | Update web surfaces to Path of Neon terminology without renaming internals |
| 84 | District And Faction Display Retheme | Complete | Retheme static data names/descriptions while preserving ids and mechanics |
| 85 | Neon-Native System Prototype Decision | Planned | Choose one small gameplay prototype and define its contract |
| 86 | Visual Identity Pass | Planned | Add Path of Neon palette, icon identity, and responsive/browser smoke notes |
| 87 | Compatibility Hardening | Planned | Prove saves, ids, PWA assets, tests, reports, and docs survived the retheme |
| 88 | Internal Id Migration Contract | Planned | Prepare the later alias-map, save-version, storage-key, and cache migration plan |

---

## Epic 79: Path Of Neon Theme And Systems Contract

### Goal

Make the Path of Neon theme, vocabulary, compatibility rules, and deeper-system direction the active source of truth before runtime retheme work begins.

### Tasks

- Review [Path Of Neon Theme Bible](path-of-neon-theme-bible.md), [Path Of Neon Terminology Map](path-of-neon-terminology-map.md), and [Path Of Neon Retheme Migration Plan](retheme-migration-plan.md) for agreement.
- Confirm active docs link to the retheme docs and this backlog.
- Archive historical planning docs that explicitly describe themselves as old planning artifacts.
- Mark or route older design docs so readers know which parts are pre-retitle context.
- Record open style-taxonomy decisions so Epic 81 is not buried inside copy replacement.
- Confirm Cognitive Intrusion as the preferred first prototype unless this review finds a better low-risk candidate.

### Acceptance Criteria

- Contributors can tell which docs are active guidance and which are historical context.
- The compatibility rules are explicit: display terms can change before ids, save fields, storage keys, package names, and cache prefixes.
- The Stage 2.3 backlog matches the retheme migration plan's display-safe epics.
- Open questions are specific enough to become Epic 81 and Epic 85 decisions.

### Test Coverage

- Markdown path/link check.
- `git diff --check`.

### Progress Notes

- Prepared this backlog from [Path Of Neon Retheme Migration Plan](retheme-migration-plan.md).
- Archived explicit historical planning docs and the completed Stage 2.1 tactics audit under `docs/archive`.
- Reviewed the theme bible, terminology map, migration plan, internal-id migration plan, README, current systems snapshot, web UI architecture, static-data guide, save API, and original design draft for Epic 79 alignment.
- Added README access to [Path Of Neon Internal Id Migration](path-of-neon-internal-id-migration.md) so the active retheme doc cluster includes the future compatibility plan.
- Added Stage 2.3 handoff notes to [Path Of Neon Theme Bible](path-of-neon-theme-bible.md) and [Path Of Neon Terminology Map](path-of-neon-terminology-map.md), keeping style naming with Epic 81 and prototype selection with Epic 85.
- Confirmed the active docs agree on the main contract: Path of Neon is the product identity, display terms may change first, legacy ids/save fields/storage/cache keys remain compatibility contracts, Cognitive Intrusion is the preferred first prototype, and District Heat is the preferred second prototype.
- Verification passed for Epic 79 docs changes: markdown link/path check across active and archived markdown docs, stale top-level historical path scan, and `git diff --check`.

---

## Epic 80: Product Shell Display Rename

### Goal

Make the outer product shell read as Path of Neon while preserving old storage and package compatibility contracts.

### Tasks

- Update public README product-shell copy where it still describes the old title as current.
- Update `index.html` title and visible metadata.
- Update `public/manifest.webmanifest` display `name`, `short_name`, theme metadata, and icon labels as needed.
- Update icon artwork or icon display metadata while keeping file paths stable unless a tested migration says otherwise.
- Update PWA tests that assert player-facing metadata.
- Document any deliberately retained legacy names such as package name, save key, service-worker cache name, or icon paths.

### Acceptance Criteria

- App title, manifest name, short name, icon metadata, and public README present Path of Neon.
- Package name, browser save key, service-worker cache prefix, and icon paths remain unchanged unless a dedicated compatibility test covers the change.
- PWA tests distinguish display metadata from storage/cache compatibility keys.

### Test Coverage

- `npm run typecheck`.
- `npm test -- tests/web/pwa.test.ts`.
- `npm run build`.
- PWA static smoke against the built app.
- `git diff --check`.

### Progress Notes

- Updated `index.html` to use the Path of Neon browser title and Apple web app title while keeping the manifest and icon link paths stable.
- Updated `public/manifest.webmanifest` display metadata to Path of Neon while preserving `id`, `start_url`, `scope`, theme color, background color, and the retained `/icons/path-of-jianghu.svg` path.
- Reworked `public/icons/path-of-jianghu.svg` in place with Path of Neon title/description metadata and neon circuit-route artwork, leaving the filename stable for PWA cache compatibility.
- Updated the app error log label from Path of Jianghu to Path of Neon.
- Expanded `tests/web/pwa.test.ts` to assert Path of Neon manifest/html/icon metadata and the intentionally retained icon path/cache prefix.
- Updated [PWA Readiness](pwa-readiness.md) to document that Stage 2.3 changed display metadata/artwork while retaining the old icon path and service-worker cache key until a later product/storage migration.
- Verification passed: `npm run typecheck`, `npm test -- tests/web/pwa.test.ts`, `npm run build`, `npm test`, `git diff --check`, markdown link/path check, stale runtime display-name scan, and production PWA static smoke against Vite preview at `http://127.0.0.1:4175/`.

---

## Epic 81: Style Taxonomy Decision

### Goal

Choose cyber-native display names and mappings for current and planned style identities before broad content copy changes.

### Tasks

- Decide whether Fist, Palm, Sword, Staff, Blade, and future hidden-weapon identities remain visible as martial roots, protocol families, or role-forward labels.
- Map each style to current combat roles without confusing Anchor, Breacher, Striker, Stabilizer, support, tank, breaker, and striker language.
- Update [Path Of Neon Theme Bible](path-of-neon-theme-bible.md) and [Path Of Neon Terminology Map](path-of-neon-terminology-map.md) with approved mappings.
- Mark any style-bearing skill, mastery, equipment, or tactic copy that should wait for this decision.
- Record whether legacy style terms can appear in lore as old sect lineage while UI labels use Path of Neon terms.

### Acceptance Criteria

- Current style identities have approved display directions or explicit preserve-old-name decisions.
- The mapping is readable in combat, roster, equipment, mastery, and static-data copy.
- Broad static-data retheme work knows which style-bearing strings are approved versus deferred.

### Test Coverage

- Markdown path/link check.
- `git diff --check`.

### Progress Notes

- Reviewed current style-bearing data in `data/styles.json`, `data/heroes.json`, `data/skills.json`, `data/equipment.json`, and the core style/role contracts.
- Chose style families rather than role-forward labels: Fist -> Impact, Palm -> Pulse, Leg -> Vector, Sword -> Edge, Blade -> Rend, Staff -> Brace, and Hidden Weapons -> Ghostware.
- Preserved combat roles as a separate taxonomy: Anchor, Breacher, Striker, and Stabilizer describe team jobs, not style families.
- Updated [Path Of Neon Theme Bible](path-of-neon-theme-bible.md), [Path Of Neon Terminology Map](path-of-neon-terminology-map.md), and [Path Of Neon Internal Id Migration](path-of-neon-internal-id-migration.md) with the approved mapping and migration guardrails.
- Deferred all `styleId`, `styleMastery`, `styleBranches`, equipment `allowedStyles`, branch id, save fixture, and test id renames to the internal-id migration.
- Verification passed: markdown link/path check, stale unresolved-style-decision scan, and `git diff --check`.

---

## Epic 82: Theme Vocabulary Layer

### Goal

Create a small display-term layer or consistent formatting path so common Path of Neon terms do not become scattered string churn.

### Tasks

- Inventory repeated UI terms for resources, combat bars, progression, districts, operations, countermeasures, tactics, and save diagnostics.
- Choose the lightest implementation shape: shared constants, formatter helpers, view-model display fields, or feature-local mappings.
- Keep reducer actions, save fields, event names, static ids, and core contracts unchanged.
- Add tests around the chosen vocabulary path where UI assertions already exist.
- Prevent future mechanic terms such as District Heat, Trace, Firewall, Calibration Debt, or Cognitive Intrusion from appearing as live UI copy before implementation.

### Acceptance Criteria

- Repeated player-facing terms have an obvious owning path.
- UI copy changes are testable without renaming internal contracts.
- Core, save, data, report, and future backend contract names remain literal where compatibility requires them.

### Test Coverage

- Focused view-model or web tests for display terminology.
- `npm test`.
- `npm run typecheck`.

### Progress Notes

- Added `web/displayTerms.ts` as the shared Path of Neon vocabulary owner for resources, combat/stat labels, tactic modifier labels, style families, and compact progression terms.
- Wired the vocabulary layer into web app chrome, battle panels/events/summaries, map and offline panels, growth/mastery panels, assignment/offline/progression/tactic view models, and style-family displays without changing reducer actions, save fields, static ids, or core event names.
- Added `tests/web/displayTerms.test.ts` for resource/stat/style/tactic mappings and a live web-source guard against future mechanic terms before implementation.
- Updated existing UI assertions for Credits, Resonance, Reagents, Combat Data, Body Integrity, Context Stability, AI Overload, District Mastery, Protocol Mastery, and route terminology.
- Verification passed: `npm run typecheck`, focused web tests for display terms/progression/idle/app shell/MVP smoke/battle-event/system copy, `npm test` (63 files, 381 tests), `npm run build`, markdown path/link check, future-mechanic live UI scan, and `git diff --check`.

---

## Epic 83: UI Copy Retheme

### Goal

Move visible web UI copy toward Path of Neon terminology while preserving the existing state, reducer, save, and core contracts.

### Tasks

- Update web view models and panels for resource labels, combat bars, progression labels, districts/routes, operations, countermeasures, tactics, and save diagnostics.
- Update battle summary and status copy where it describes player-facing concepts rather than internal event ids.
- Preserve technical labels where the UI intentionally exposes diagnostics, schema fields, or import/export compatibility.
- Update tests that assert player-facing copy.
- Check narrow and desktop layouts for label wrapping, clipped controls, and overlapping panels after copy expands.

### Acceptance Criteria

- Main web surfaces use Path of Neon display language consistently.
- Internal ids, reducer action names, save fields, event names, and data ids remain stable.
- Diagnostics clearly distinguish internal contract names from display terms when both must appear.
- Responsive UI remains usable after copy changes.

### Test Coverage

- Focused web/view-model tests.
- `npm test`.
- `npm run typecheck`.
- Browser smoke for visible UI changes.

### Progress Notes

- Extended the shared display vocabulary for operations, augments, equipment slots, combat roles, team labels, and routine/tactic panel copy.
- Updated visible web panels for routines, initiate roster, crew formation, augment/loadout equipment, operations, countermeasures, save diagnostics, battle teams, and combat records.
- Updated web view models so style families, operation types, equipment slots/effects, combat roles, status purge summaries, and battle result fallbacks use Path of Neon display language while raw ids and save fields stay literal.
- Preserved static data names/descriptions for Epic 84; current district, initiate, hostile, item, status, and tactic names still come from `data/*.json`.
- Verification passed: `npm run typecheck`, focused web tests for display terms/app shell/status presentation/progression/systems/workflow baselines, `npm test` (63 files, 382 tests), `npm run build`, markdown path/link check, stale visible-copy scan, local Vite HTTP smoke at `http://127.0.0.1:5174/`, and `git diff --check`.

---

## Epic 84: District And Faction Display Retheme

### Goal

Retheme static data display names and descriptions for regions, stages, enemies, heroes, equipment, statuses, assignments, tactics, and skills without changing ids or mechanics.

### Tasks

- Update static data `name`, description, and flavor fields to Path of Neon display language.
- Preserve every static `id` and save/static reference field.
- Apply the style-taxonomy decision before changing style-bearing skill, mastery, equipment, or tactic copy.
- Keep mechanical values unchanged unless a specific copy update requires a validation-safe metadata field.
- Update content authoring docs with the rule that display names may change while ids remain compatibility keys.
- Confirm simulator reports remain comparable because ids and mechanics did not change.

### Acceptance Criteria

- Player-facing static content reads as Path of Neon.
- Static ids and mechanical values remain stable.
- Validation and simulator output still use stable ids where required.
- Known budget debt remains visible and is not hidden by display-copy changes.

### Test Coverage

- `npm test -- tests/data`.
- `npm run simulate`.
- `npm run support-decision`.
- `git diff --check`.

### Progress Notes

- Rethemed static display fields across regions, stages, enemies, heroes, equipment, equipment sets, formations, medicines, skill upgrades, skills, statuses, styles, tactics, assignments, and upgrades while preserving every id, reference field, stat, reward, unlock, budget, and tactic behavior field.
- Applied the Epic 81 style taxonomy to style-bearing content: Impact, Pulse, Vector, Edge, Rend, Brace, and Ghostware now appear in static style, skill, equipment, and tactic display copy while legacy style ids remain compatibility keys.
- Updated active content-authoring and current-system docs so display names may move to Path of Neon while ids remain stable report/save/static anchors.
- Rethemed report/tool fallback labels for Path of Neon balance output, Redline support-decision text, Balanced Routine fallback copy, and timed Trauma metadata without changing underlying combat ids or metric fields.
- Confirmed static-data comparability by checking parsed data JSON before/after with display fields stripped; only `name`, description, role, and flavor fields changed in `data/*.json`.
- Verification passed: `npm test -- tests/data`, `npm test` (63 files, 382 tests), `npm run typecheck`, `npm run build`, `npm run simulate`, `npm run support-decision`, and `git diff --check`.

---

## Epic 85: Neon-Native System Prototype Decision

### Goal

Choose one small gameplay prototype that proves Path of Neon is more than a rename, then define it tightly enough for a later implementation slice.

### Tasks

- Compare Cognitive Intrusion, District Heat, Augment Loadouts, Network Operations, Countermeasure Economy, and AI Raid Event against current core, save, UI, simulator, and balance surfaces.
- Prefer Cognitive Intrusion unless another candidate is clearly smaller and stronger.
- Write a one-page prototype contract covering player value, affected systems, data shape, save impact, simulator visibility, and out-of-scope work.
- Identify required tests and balance/report visibility before code begins.
- Confirm the prototype does not silently invalidate old saves or require internal id migration.

### Acceptance Criteria

- One prototype is selected and documented.
- The contract is small enough for a focused implementation epic after display retheme work.
- Save compatibility, static-data impact, UI footprint, and simulator/report visibility are known before implementation.
- Deferred candidates remain recorded without becoming hidden scope.

### Test Coverage

- Markdown path/link check for the contract.
- `git diff --check`.
- No runtime tests unless helper contracts are added.

---

## Epic 86: Visual Identity Pass

### Goal

Give the web app and install metadata a readable Path of Neon identity without reducing usability.

### Tasks

- Update palette, accents, and status presentation only where readability remains clear.
- Update app icon artwork or generated icon assets as needed.
- Keep status category colors semantically distinct.
- Ensure mobile and desktop layouts avoid clipped labels, overlap, and unstable controls.
- Record browser smoke screenshots or notes for desktop and narrow mobile widths.

### Acceptance Criteria

- The app visually signals Path of Neon in the first viewport.
- Contrast and status meaning remain readable.
- Icon and manifest identity match the product shell.
- UI remains stable at desktop and narrow mobile widths.

### Test Coverage

- `npm run build`.
- Source-level responsive tests.
- Browser smoke at desktop and narrow mobile widths.
- PWA static smoke if manifest or icons change.

---

## Epic 87: Compatibility Hardening

### Goal

Prove that the display retheme did not break old saves, exported saves, static ids, PWA shell behavior, docs, reports, or tests.

### Tasks

- Run save fixture, import/export, reset, offline reward, and load-transaction tests.
- Check static data ids did not change accidentally.
- Check browser storage key and service-worker cache name behavior remains intentional.
- Run simulator and support-decision reports and confirm known debt remains visible.
- Run markdown path checks after archive and doc-link changes.
- Add any stale-name scans that are useful without rewriting historical archive content.

### Acceptance Criteria

- Existing local saves still load.
- Existing exported saves still import.
- Static ids and saved fields remain compatibility keys.
- PWA shell behavior does not disturb local save storage.
- Active docs use current paths and archive paths only where historical context is useful.

### Test Coverage

- Save fixture and save workflow tests.
- Static data validation tests.
- `npm run simulate`.
- `npm run support-decision`.
- `npm run build`.
- Markdown path/link check.
- `git diff --check`.

---

## Epic 88: Internal Id Migration Contract

### Goal

Prepare the later internal-id migration without doing the full rename inside the display-safe retheme stage.

### Tasks

- Review [Path Of Neon Internal Id Migration](path-of-neon-internal-id-migration.md) against actual retheme changes from Stage 2.3.
- Draft alias-map expectations for product/storage keys, regions, stages/routes, enemies/hostiles, heroes/initiates, skills/protocols, equipment/augments, countermeasures, statuses, operations, and tactics/routines.
- Define save-version strategy for resources, district progress, selected farm route, combat data, and combat stat fields.
- Define browser storage key migration strategy from `path-of-jianghu.save.v1` to a Path of Neon key.
- Define PWA cache cleanup strategy for old and new cache prefixes.
- Split implementation into later narrow epics so no one performs a risky all-project mechanical rename.

### Acceptance Criteria

- Later migration work has an approved order and test gate list.
- Old saves and exports have a documented migration path before any persisted field or id changes.
- Product/storage key migration, static id migration, save field migration, combat stat migration, and code/report symbol migration are separable.
- Stage 2.3 closes without changing compatibility keys by accident.

### Test Coverage

- Markdown path/link check.
- `git diff --check`.
- No runtime tests unless migration helpers are introduced.

## Open Questions

- Does product-shell icon artwork change in Stage 2.3, or only icon metadata?
- Which UI diagnostics should keep literal legacy schema terms visible?
- What is the smallest Cognitive Intrusion contract that proves the new theme without forcing a save schema migration?
- Which stale-name scans should ignore archived docs by default?

## Suggested Implementation Order

1. Epic 79: Path Of Neon Theme And Systems Contract
2. Epic 80: Product Shell Display Rename
3. Epic 81: Style Taxonomy Decision
4. Epic 82: Theme Vocabulary Layer
5. Epic 83: UI Copy Retheme
6. Epic 84: District And Faction Display Retheme
7. Epic 85: Neon-Native System Prototype Decision
8. Epic 86: Visual Identity Pass
9. Epic 87: Compatibility Hardening
10. Epic 88: Internal Id Migration Contract

This order locks docs and public shell identity first, avoids broad copy churn before the style decision, makes UI terminology testable before large display text edits, then finishes with compatibility proof and the next migration contract.
