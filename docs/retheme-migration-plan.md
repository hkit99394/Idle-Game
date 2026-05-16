# Path Of Neon Retheme Migration Plan

## Goal

Move the project from Path of Jianghu to **Path of Neon** without breaking existing saves, static data references, PWA caches, tests, or archived project history.

The first retheme pass should be display-safe, but the product plan must be deeper than a rename. Internal identifiers are compatibility contracts until a specific migration says otherwise; player-facing design should move toward cyber-native systems such as cognitive intrusion, augmentation loadouts, district heat, network operations, protocol decks, countermeasure economy, and AI raid events.

Internal ids should migrate to Path of Neon names, but only through the dedicated compatibility plan in [Path Of Neon Internal Id Migration](path-of-neon-internal-id-migration.md). As each migration slice lands, canonical data may move while legacy ids and persisted fields remain valid through explicit compatibility adapters.

## Non-Goals

These are non-goals for the display-safe retheme pass, not permanent product decisions:

- No save schema rename during the first retheme pass.
- No static id rewrite for regions, stages, heroes, enemies, equipment, statuses, tactics, or assignments.
- No archived backlog rewrite.
- No combat rebalance as part of naming.
- No backend API field rename before backend adapters exist.

## Compatibility Rules

- Keep reading the legacy `path-of-jianghu.save.v1` browser key after `WEB_SAVE_STORAGE_KEY` moves to `path-of-neon.save.v1`; old-key saves must copy forward safely before any cleanup policy is considered.
- If the PWA cache name changes to a Path of Neon prefix, service-worker activation must delete both `path-of-jianghu-shell-*` and `path-of-neon-shell-*` caches except the current cache.
- Static data `id` values and all save/static `*Id` reference fields stay stable until their dedicated internal-id migration slice. Stage 2.5 migrated region and route id values, Stage 2.6 migrated static content id values, Stage 2.7 migrated owned save resource/progress fields, and Stage 2.8 migrated owned combat stat/schema/report fields with compatibility aliases where needed.
- Save/cloud/core docs should describe persisted field names literally, then point to the display terminology map when needed.
- Tests should only update expected strings when they assert player-facing copy. Tests asserting ids or schema fields should keep legacy names.
- Future mechanic terms such as District Heat, Trace, Firewall, and Calibration Debt should stay out of player-facing UI until the selected prototype exists.

Internal identifiers means the stable machine-readable names used by saves, static data, tests, reports, and future backend payloads. Examples include JSON ids such as `greenline_approach`, `redline_outpost`, `hero_outer_training`, and `balanced_routine`, plus reference fields such as `stageId`, `regionId`, `heroId`, `skillId`, and saved or report fields such as `credits`, `resonance`, `contextStability`, and `selectedRoutineId`. These can display as Path of Neon terms before the dedicated internal-id migration changes the underlying ids for their category.

## Recommended Stage 2.3 Theme

**Stage 2.3: Path Of Neon Design Pivot**

The stage should establish the retheme contract, then make the first visible product-shell and UI-language changes while planning one small neon-native system prototype. The goal is not to rewrite the game immediately; it is to stop the retheme from being only copy replacement.

The numbered sections below are implementation phases inside Stage 2.3, not project stages after Stage 2.2. "Stage 0" means the docs-only preflight phase for Stage 2.3: it was completed before runtime retheme work started, and it is tracked as Epic 79 in [Archived Stage 2.3 Backlog](archive/stage-2.3-backlog.md).

## Suggested Epics

| Epic | Title | Purpose |
| --- | --- | --- |
| 79 | Path Of Neon Theme And Systems Contract | Create theme bible, terminology map, migration rules, UI copy inventory, and deeper cyber-native system targets. |
| 80 | Product Shell Display Rename | Rename README/app title/PWA manifest display copy and icon artwork while preserving package name, save key, and cache prefix for now. |
| 81 | Style Taxonomy Decision | Choose cyber-native style names and mappings for Fist, Palm, Sword, Staff, Blade, and future hidden-weapon content before broad data retheme. |
| 82 | Theme Vocabulary Layer | Add a small web display vocabulary or formatter path before replacing scattered UI strings. |
| 83 | UI Copy Retheme | Rename combat bars, resources, districts, operations, and countermeasure copy in web surfaces. |
| 84 | District And Faction Display Retheme | Rename data `name`/description fields for regions, stages, enemies, heroes, equipment, statuses, assignments, and tactics while preserving ids. Gate style-bearing skill/mastery copy on Epic 81. |
| 85 | Neon-Native System Prototype Decision | Choose one small mechanic prototype: district heat, cognitive intrusion, augment loadouts, network operations, or countermeasure economy. |
| 86 | Visual Identity Pass | Add Path of Neon palette, status accents, icon artwork, and responsive/browser smoke. |
| 87 | Compatibility Hardening | Prove old local saves, fixture saves, static ids, PWA shell, and docs remain coherent after the display retheme. |
| 88 | Internal Id Migration Contract | Prepare alias maps, save-version strategy, storage-key migration, static-id migration order, and test gates before changing persisted ids. |
| 89 | Product And Storage Key Migration | Rename package, icon paths, PWA cache prefix, and browser save key with dual-read migration and old-cache cleanup. |
| 90 | Static Region And Route Id Migration | Migrate region and stage ids with alias maps, save normalization, validation, and simulator/report continuity. |
| 91 | Static Content Id Migration | Migrate enemy, hero, skill, style, equipment, equipment-set, assignment, medicine, status, and tactic ids in focused slices. |
| 92 | Save Resource And Progress Field Migration | Migrate persisted resource/progress fields such as `silver`, `cultivation`, `herbs`, `combatExperience`, `maps`, and farm-stage fields with a save-version bump. |
| 93 | Combat Save Stat Field Migration | Migrate combat stat/static schema fields such as Body Integrity, Context Stability, Kinetic/Cognitive stats, Breach Power, Overload Resist, and Context Rebuild after confirming current saves do not persist live combat state. |
| 94 | Code And Report Symbol Migration | Rename AI Overload, Context Rebuild, recovery, static schema, web, tooling, and report/export symbols after persisted fields and terminology are final. |
| 95 | Cognitive Intrusion Contract | Define the first neon-native mechanic, including status ids, counterplay, simulator visibility, and balance gates. |
| 96 | Cognitive Intrusion Prototype | Implement the smallest useful Cognitive Intrusion slice with focused tests and simulator/report visibility. |
| 97 | Post-Migration Compatibility Hardening | Prove old saves, exports, fixtures, reports, PWA caches, docs, and stale-name scans still work after id/schema migration. |

Epics 79-88 belong in the display-safe Stage 2.3 pivot. Epics 89-97 should be split into later stages unless the team deliberately accepts a larger migration stage. [Archived Stage 2.4 Backlog](archive/stage-2.4-backlog.md) completed Epic 89 as focused product/storage key migration slices. [Archived Stage 2.5 Backlog](archive/stage-2.5-backlog.md) completed Epic 90 as the region/stage static id migration. [Archived Stage 2.6 Backlog](archive/stage-2.6-backlog.md) completed Epic 91 as static content id migration, with slices 91.1 through 91.8 complete and the migrate/keep/defer matrix recorded in [Archived Stage 2.6 Content Id Preflight](archive/stage-2.6-content-id-preflight.md). [Archived Stage 2.7 Backlog](archive/stage-2.7-backlog.md) completed Epic 92 as save resource/progress field migration. [Archived Stage 2.8 Backlog](archive/stage-2.8-backlog.md) completed Epics 93 and 94 as combat save/stat field plus combat/report symbol migration, with the 93.1 target matrix retained in [Archived Stage 2.8 Combat Save And Symbol Preflight](archive/stage-2.8-combat-save-symbol-preflight.md). [Archived Stage 2.9 Backlog](archive/stage-2.9-backlog.md) completed cleanup and final Cognitive Intrusion handoff decisions; Slice 2.9.4 refreshed the contract before Epic 95/96 implementation work.

## Stage 2.3 Phase 0: Docs Contract

Deliverables:

- [Path Of Neon Theme Bible](path-of-neon-theme-bible.md)
- [Path Of Neon Terminology Map](path-of-neon-terminology-map.md)
- This migration plan
- README and current docs pointing to the retheme plan
- Historical design docs marked as pre-retitle or superseded where useful

Acceptance:

- Product name is chosen as Path of Neon.
- Display terms are chosen for combat bars, resources, progression, content, and factions.
- Deeper system targets are selected so the retheme has gameplay consequences, not only renamed labels.
- Compatibility rules explicitly say which legacy identifiers remain.
- No runtime behavior changes are required.

Verification:

- Markdown link/path check.
- `git diff --check`.

## Stage 2.3 Phase 1: Product Shell Display Rename

Likely files:

- `README.md`
- `index.html`
- `public/manifest.webmanifest`
- `public/icons/*`
- `tests/web/pwa.test.ts`

Acceptance:

- App title, manifest name, short name, icon metadata, icon artwork, and public README use Path of Neon.
- Package name, browser save key, service-worker cache prefix, and icon file paths remain unchanged until the product/storage key migration.
- PWA tests cover the new display metadata without changing runtime storage behavior.

Verification:

- `npm run typecheck`
- `npm test -- tests/web/pwa.test.ts`
- `npm run build`
- PWA static smoke against the built app
- `git diff --check`

## Stage 2.3 Phase 2: Style Taxonomy Decision

Likely files:

- [Path Of Neon Theme Bible](path-of-neon-theme-bible.md)
- [Path Of Neon Terminology Map](path-of-neon-terminology-map.md)
- This migration plan
- [Archived Stage 2.3 Backlog](archive/stage-2.3-backlog.md)

Acceptance:

- Fist, Palm, Sword, Staff, Blade, and future hidden-weapon display directions have approved Path of Neon names or a deliberate decision to preserve specific old names.
- Each style has a role-readable mapping that does not confuse combat roles such as Anchor, Breacher, Striker, or Stabilizer.
- Broad static-data copy retheme avoids final style-bearing skill, mastery, and equipment flavor until this decision is complete.

Verification:

- Markdown link/path check.
- `git diff --check`.

## Stage 2.3 Phase 3: Theme Vocabulary Layer

Likely files:

- `web/app/*`
- `web/state/viewModels/*`
- `web/features/*`
- New optional `web/theme` or `web/displayTerms` module
- Tests that assert display strings

Acceptance:

- Repeated terms such as Credits, Resonance, Body Integrity, Context Stability, AI Overload, Context Rebuild, Districts, Operations, and Countermeasures are centralized or consistently formatted.
- Existing reducer actions, save fields, event types, static ids, and core contracts are not renamed.
- Future mechanic vocabulary is not exposed as product copy until implemented.
- UI copy changes are testable without broad mechanical churn.

Verification:

- Focused view-model/web tests
- `npm test`
- `npm run typecheck`

## Stage 2.3 Phase 4: Static Data Display Retheme

Likely files:

- `data/regions.json`
- `data/stages.json`
- `data/heroes.json`
- `data/enemies.json`
- `data/skills.json`
- `data/statuses.json`
- `data/equipment*.json`
- `data/assignments.json`
- `data/tactics.json`

Acceptance:

- Player-facing `name`, description, and role fields use Path of Neon flavor.
- Style-bearing skill, mastery, and equipment copy follows the approved style taxonomy or is explicitly deferred.
- Data ids remain stable and validation still passes.
- Balance reports remain comparable because ids and mechanical values are unchanged.
- Content authoring docs explain that display names may retheme while ids remain compatibility keys.

Verification:

- `npm test -- tests/data`
- `npm run simulate`
- `npm run support-decision`
- `git diff --check`

## Stage 2.3 Phase 5: Neon-Native System Prototype Decision

Pick one prototype for the first deeper change. Do not implement all of these in one stage.

| Candidate | Why It Fits | Lowest-Risk Starting Point |
| --- | --- | --- |
| District Heat | Makes route choice and offline farming feel like underworld operations. | Document a heat contract and add report-only fields before changing rewards. |
| Cognitive Intrusion | Makes Cognitive Art more than renamed Inner Art. | Add one status or boss rule that interacts with Context Stability, Context Rebuild, and AI Overload. |
| Augment Loadouts | Makes equipment feel cyber-native. | Retheme item slots first, then add one augment set with a clear tradeoff. |
| Network Operations | Makes assignments deeper. | Add operation flavor and one new operation reward profile. |
| Countermeasure Economy | Makes medicine and Lotus support feel tech-native. | Rename/polish countermeasure UI, then add one anti-overload countermeasure. |
| AI Raid Event | Connects Path of Neon to online boss planning. | Create endpoint/mock contract for async raid attempts without production backend. |

Recommendation: start with **Cognitive Intrusion**, then follow with **District Heat**. Cognitive Intrusion is the smallest strong gameplay proof that Path of Neon is more than renamed copy: it reuses Context Stability, AI Overload, statuses, target rules, and existing simulator visibility. District Heat is still the best second prototype because it changes route and offline-farming decisions, but it touches more progression and economy surfaces. Stage 2.3 recorded the selected implementation boundary in [Cognitive Intrusion Prototype Contract](cognitive-intrusion-prototype-contract.md).

Acceptance:

- The chosen prototype has a one-page contract before code.
- It reuses existing core surfaces where possible.
- It has focused tests and simulator/report visibility if it affects balance.
- It does not silently invalidate old saves.

## Stage 2.3 Phase 6: Visual Identity

Likely files:

- `web/styles/app.css`
- `public/icons/*`
- PWA metadata and tests
- Browser smoke notes

Acceptance:

- Neon palette improves identity without reducing readability.
- Status colors remain semantically clear.
- Icon and manifest represent Path of Neon.
- Mobile and desktop layouts avoid overlap and clipped controls.

Verification:

- `npm run build`
- Source-level responsive tests
- Browser smoke at desktop and narrow mobile widths
- PWA static smoke

## Stage 2.3 Phase 7: Compatibility Hardening

Acceptance:

- Existing local saves still load.
- Existing exported saves still import.
- The old browser storage key is retained or migrated with dual-read coverage.
- Archived docs are left historical.
- Technical docs clearly distinguish display terms from internal contract names.
- No accidental static id rename appears in changed data.

Suggested checks:

- Save fixture tests.
- Save export/import/reset tests.
- Static data validation tests.
- `rg` checks for accidental id renames if a mechanical retheme touches data.
- Manual docs review for `internal field / display term` clarity.

## Stage 2.3 Phase 8: Internal Id Migration Contract

This phase plans the actual internal-id migration, but it should not rename every id in the same pull as the display retheme.

Deliverables:

- [Path Of Neon Internal Id Migration](path-of-neon-internal-id-migration.md)
- Static id alias-map plan for regions, routes, hostiles, initiates, protocols, augments, countermeasures, statuses, operations, and routines.
- Save schema migration strategy for resource fields, district progress, selected farm route, Combat Data, and later combat stat fields.
- Browser storage key migration strategy from `path-of-jianghu.save.v1` to a Path of Neon key.
- PWA cache migration strategy for old and new cache prefixes.
- Verification list covering save fixtures, browser storage, data validation, simulator exports, PWA tests, and stale legacy-name scans.

Acceptance:

- The team has approved target ids for the first static-id slice.
- Old saves and exports have a documented migration path.
- The implementation can be split into narrow follow-up epics instead of one risky mechanical rename.

## Decision Log

- Use **Path of Neon** as the product/world identity. Do not use "Neon Jianghu" as player-facing or lore-facing terminology.
- Use **Combat Data** as the main UI term for Combat XP. Technical docs may still refer to `combatExperience` when describing schema or save fields.
- Stage 2.3 Epic 81 chose style-family display names: Impact, Pulse, Vector, Edge, Rend, Brace, and Ghostware. Treat old martial style terms as lineage flavor and keep style ids stable until the internal-id migration.
- Use **Redline** as the hostile Demon Cult direction. `Redline Outpost` and `Redline Cult` are the current best display candidates; `Null Context` can remain a doctrine/status flavor, not the main faction name.
- Prototype **Cognitive Intrusion** first, with **District Heat** as the preferred second neon-native system.
- Migrate internal ids through a dedicated compatibility phase. Display names can change first; ids and persisted fields should change only after alias maps, save-version migration, storage-key migration, and fixture coverage are ready.

## Style Naming Decision

Epic 81 completed the focused style naming pass. Use **Impact**, **Pulse**, **Vector**, **Edge**, **Rend**, **Brace**, and **Ghostware** as display families for Fist, Palm, Leg, Sword, Blade, Staff, and Hidden Weapons. Old martial terms may remain as lineage flavor, especially in hero, skill, branch, and equipment copy, but role labels such as Anchor, Breacher, Striker, and Stabilizer should not replace style names.

The later internal-id migration can target `impact`, `pulse`, `vector`, `edge`, `rend`, `brace`, and `ghostware` ids after alias maps, save-version migration, storage-key migration, and fixture coverage are ready.
