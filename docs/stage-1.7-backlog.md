# Stage 1.7 Backlog

## Current Status

Stage 1.7 is in progress. Stage 1.6 has been archived, and the post-1.6 refactor review found no blocking issues after the worker/reviewer pass. Epics 43-45 are complete.

The recommended theme is **Foundation Hardening**. This is a cleanup and readiness stage, not a new content stage. The goal is to make saves, static data, balance gates, documentation, and release checks reliable before Stage 1.8 expands the combat engine further.

## Decisions Carried Forward

- Do not add a new region, hero, or major combat feature in Stage 1.7.
- Treat save, static data, and balance tooling as core foundation work for future backend and content expansion.
- Keep the existing local web game as the primary platform.
- Keep `core/` usable without browser dependencies.
- Use the recently added canonical static-data and save-load helpers as the foundation, then harden and document them.
- Preserve current battle outcomes unless a balance change is explicitly part of a budget-gate task.

## Stage Goals

- Make the save API clear for web, tools, tests, and future backend callers.
- Ensure future migrations go through a tested fixture path.
- Make static data loading consistent across web, tools, and tests.
- Improve balance reports so target misses are explained by shared budget data.
- Add release-readiness checks for future stages.
- Update active docs so they describe the implemented game and archived backlogs accurately.
- Add regression coverage for foundation behavior that should not silently drift.

## Non-Goals

- No new combat region.
- No new production hero.
- No account backend or cloud save implementation.
- No PWA implementation yet.
- No full Combat Engine V2 rewrite; that belongs to Stage 1.8.
- No large UI modularization; that belongs to Stage 1.9.
- No new player strategy layer; that belongs to Stage 2.1.

## Exit Criteria

- There is one documented save loading/validation path for web, tools, tests, and future backend callers.
- Save migration fixtures cover supported save versions and timestamp/offline reward behavior.
- Static data is assembled through one canonical builder in web, tools, and tests where practical.
- Balance reports cover every configured region and explain target misses with shared budget criteria.
- Active docs no longer point to stale Stage 1.6 paths or old system assumptions.
- A release-readiness checklist exists and can be reused for future stage closures.
- `npm test`, `npm run build`, `npm run simulate`, and `npm run support-decision` pass.

## Epic Summary

| Epic | Title | Status | Purpose |
| --- | --- | --- | --- |
| 43 | Save API And Migration Fixtures | Completed | Harden save load, migration, validation, and offline reward semantics |
| 44 | Static Data Builder Consolidation | Completed | Make static data loading consistent across app, tools, and tests |
| 45 | Balance Budget Gates | Completed | Add shared budget targets and region gate explanations |
| 46 | Documentation And Archive Cleanup | Not Started | Update active docs and preserve completed backlog history |
| 47 | Release Readiness Checklist | Not Started | Define reusable stage closure checks and command gates |
| 48 | Foundation Regression Coverage | Not Started | Add golden/parity coverage for critical foundation behavior |

---

## Epic 43: Save API And Migration Fixtures

### Goal

Make save loading, validation, migration, offline reward application, and timestamp updates flow through a clear core API instead of being split between core and web storage behavior.

### Tasks

- Audit current save entrypoints and document which API web, tools, tests, and future backend callers should use.
- Ensure parsing/migration does not run duplicate migrations during normal load.
- Add migration fixtures for every supported save version.
- Add focused tests for offline reward application advancing `updatedAt` or `lastOfflineRewardAt`.
- Add tests proving a second load does not duplicate the same offline rewards.
- Keep web storage as a persistence adapter rather than the owner of save semantics.
- Document how import/export should handle invalid, old, or future save versions.

### Acceptance Criteria

- Core exposes one preferred save-load transaction path.
- Web storage delegates migration, validation, normalization, and offline reward semantics to core helpers.
- A save loaded twice without additional elapsed time does not grant duplicate offline rewards.
- Invalid imported saves fail with actionable validation errors.
- Migration tests make future save changes harder to break silently.

### Test Coverage

- Core save load transaction fixture tests.
- Old-version migration fixture tests.
- Offline reward timestamp replay-prevention test.
- Web import/load smoke test using the preferred save path.

### Progress Notes

- The post-1.6 refactor introduced a core save-load transaction helper. Stage 1.7 should review, document, and harden that helper rather than creating another path.
- Added `docs/save-api.md` to identify the preferred save entrypoints and storage responsibilities.
- Web offline load now routes raw stored saves through `loadSaveTransaction`, keeping migration, validation, farm target normalization, offline rewards, and timestamp semantics in core.
- Save import now normalizes selected farm target and preset through `applySaveLoadTransaction` instead of duplicating that logic in web storage.
- Added `tests/fixtures/saveVersionFixtures.ts` and migration coverage for every supported legacy save version.
- Expanded core transaction tests for migration/load, replay prevention, farm target normalization, and future-version rejection.
- Verified with `npm run typecheck`, `npm test`, `npm run build`, `npm run simulate`, `npm run support-decision`, and `git diff --check`.

---

## Epic 44: Static Data Builder Consolidation

### Goal

Use one canonical static-data builder so web, tools, and tests stop hand-assembling JSON bundles with repeated casts.

### Tasks

- Audit all imports of data JSON and `StaticGameData` assembly.
- Move remaining static-data assembly call sites onto the canonical builder where practical.
- Ensure the builder works in Vite/browser code, Node tools, and Vitest.
- Add data validation at the builder boundary or clearly document where validation runs.
- Add a test that the web/tool/test data fixtures all agree on region, stage, medicine, and skill counts.
- Document the correct path for adding a new static data file.

### Acceptance Criteria

- Web game data uses the canonical builder.
- Balance and support-decision tools use the canonical builder.
- Tests use a shared fixture from the canonical builder.
- Adding a new configured data file requires changing one builder module rather than several scattered call sites.
- Type casts are limited to the builder boundary.

### Test Coverage

- Static data builder shape/count test.
- Data validation test for a representative missing reference.
- Tool smoke tests continue to run through the builder-loaded data.

### Progress Notes

- The post-1.6 refactor added `core/data/staticDataBuilder.ts`. Stage 1.7 should finish adoption and add enough tests/docs to make it the obvious default.
- Added `data/staticGameData.ts` as the canonical JSON bundle and `tools/staticData.ts` as the CLI-facing re-export.
- Web game data, balance simulation, support-decision tooling, and shared test fixtures now re-export the canonical bundle instead of hand-importing every JSON file.
- Removed remaining full `StaticGameData` hand assembly from counterplay and stage progression tests.
- Added `tests/data/staticDataBuilder.test.ts` to prove web/tool/test fixtures share the same bundle, counts agree, builder keys match configured parts, the canonical bundle validates, and a representative missing reference is still caught by validation.
- Added `docs/static-data.md` to document the builder boundary, validation responsibility, and the path for adding a future static data file.
- Verified with `npm run typecheck`, `npm test`, `npm run build`, `npm run simulate`, `npm run support-decision`, and `git diff --check`.

---

## Epic 45: Balance Budget Gates

### Goal

Make balance reports explain why content passes or misses target budgets using shared, data-driven criteria for every configured region.

### Tasks

- Define region/stage budgets for expected clear time, reward curve, status pressure, defense pressure, healing pressure, and boss gate targets.
- Move hard-coded target bands into shared balance target data where practical.
- Add region gate coverage for Bamboo Road, Mist Valley, Black Iron Fort, Lotus Monastery, and Demon Cult Outpost.
- Report target misses with clear reasons instead of only `ok` or `miss`.
- Add parity tests for status-heavy and Demon Cult counterplay scenarios where balance estimates could drift from actual battle simulation.
- Keep farm recommendation and reward progression checks aligned with budget data.

### Acceptance Criteria

- `npm run simulate` reports every region against configured budgets.
- Boss gate output explains pass/fail and near-clear conditions.
- Reward or farm-value regressions are caught by tests or report checks.
- Status pressure and medicine counterplay assumptions are covered by shared helpers or parity tests.
- Balance misses are actionable enough to tune data without reading combat code.

### Test Coverage

- Balance report tests for every configured region.
- Demon Cult boss/counterplay parity test.
- Reward curve/farm-value non-regression test.
- Status pressure classification test using shared helpers.

### Progress Notes

- Recent refactors shared more status-pressure logic between combat and balance. Stage 1.7 should turn that into explicit gates and reporting expectations.
- Expanded `RegionBalanceTargets` with reward, status, defense, healing, and boss-gate budgets, with validation for invalid budget values.
- Added configured budget targets for Bamboo Road, Mist Valley, Black Iron Fort, Lotus Monastery, and Demon Cult Outpost in `data/regions.json`.
- Shared clear-time assessment, boss-gate criteria, Demon Cult criteria, and reward scoring through `core/balance/targets.ts`.
- Updated `npm run simulate` output with a `Region Budget Gates` section that reports pass/fail reasons per region.
- Added simulated enemy status-pressure metrics so status budgets count enemy-applied statuses and status tick damage against the player.
- Added tests for budget gate output, validation errors, farm recommendation alignment, and Demon Cult simulated-vs-estimated status-pressure parity.
- Added `docs/balance-budget-gates.md` to document the budget fields and current known tuning misses.
- Verified with `npm run typecheck`, `npm test`, `npm run build`, `npm run simulate`, `npm run support-decision`, and `git diff --check`.

---

## Epic 46: Documentation And Archive Cleanup

### Goal

Make active docs match the current game and keep completed stage history in `docs/archive`.

### Tasks

- Update `docs/martial-idle-design.md` to describe current implemented systems: formations, enemy teams, CP, levels, equipment, assignments, medicine, Demon Cult, and support counterplay.
- Update `docs/core-engine-boundary.md` to reflect current core/web/tool boundaries after refactors.
- Review `docs/analysis-stage.md` and `docs/planning-questions.md` for stale decisions or outdated uncertainty.
- Ensure Stage 1.6 is archived and active docs link to the archived path only where historical context is useful.
- Add a short "Current Implemented Systems" section or doc for quick onboarding.
- Keep roadmap docs aligned with what Stage 1.7 actually completes.

### Acceptance Criteria

- No active doc points to missing backlog files.
- Completed backlog files through Stage 1.6 live in `docs/archive`.
- The design doc describes the current game accurately enough for a new contributor.
- Core boundary docs mention the static-data builder, save transaction path, and no-browser-dependency rule.
- Stage 1.7 completion updates this backlog with progress notes before archival.

### Test Coverage

- No automated tests required beyond link/path checks if a doc-check script is added.
- Manual doc review is acceptable for this epic.

### Progress Notes

- Stage 1.6 backlog has been moved to `docs/archive/stage-1.6-backlog.md`.

---

## Epic 47: Release Readiness Checklist

### Goal

Create a repeatable closure checklist so future stages finish with consistent review, verification, docs, and archive steps.

### Tasks

- Add a release-readiness checklist document or section.
- Include required commands: `npm run typecheck`, `npm test`, `npm run build`, `npm run simulate`, `npm run support-decision`, and `git diff --check`.
- Include review expectations: self-review, optional subagent review, and fix-all loop for P1/P2 findings.
- Include browser smoke expectations when UI changes are included.
- Include docs/archive expectations for stage closure.
- Include save compatibility checks when save schema changes.

### Acceptance Criteria

- Future stages can use the checklist without rediscovering closure steps.
- Checklist distinguishes required commands from optional UI/browser checks.
- Checklist includes what to do before archiving a stage backlog.
- Stage 1.7 final review uses the checklist before archival.

### Test Coverage

- No code tests required.
- The checklist itself should be exercised manually at Stage 1.7 closure.

### Progress Notes

- Recent worker/reviewer loops and verification commands provide the template for this checklist.

---

## Epic 48: Foundation Regression Coverage

### Goal

Add targeted regression tests for behavior that recent refactors made safer but still risky to change.

### Tasks

- Add a golden or parity test for representative battle event ordering.
- Add a view-model test for `auto_medicine` event presentation.
- Add a test proving changed auto-medicine preferences affect the actual web battle command path.
- Add a static-data builder parity test for web/tool/test data consumers.
- Add save transaction replay-prevention coverage if not already completed in Epic 43.
- Add a balance parity test that compares a status-heavy scenario against actual `resolveStageBattle` behavior.

### Acceptance Criteria

- Critical battle event ordering has at least one deterministic trace test.
- Auto-medicine event rendering is covered outside the browser.
- Web battle command helpers cannot drift from hook behavior.
- Static data builder adoption has a regression test.
- Save load/offline reward replay prevention is covered.

### Test Coverage

- Combat golden trace or event-order test.
- Web battle view-model test.
- Web state command test.
- Static data builder test.
- Save load transaction test.
- Balance parity test.

### Progress Notes

- The post-refactor reviewer called out the lack of full battle event ordering parity and browser visual smoke coverage. This epic covers the code-level part; browser visual smoke can move to Stage 1.9 unless Stage 1.7 changes UI.

---

## Open Questions

- Should Stage 1.7 add a lightweight `npm run check` script that runs the required readiness commands, or keep commands separate for speed?
- Should balance budgets live in JSON data, TypeScript constants, or a CSV-derived file aligned with `docs/balance-template.csv`?
- Should documentation checks be manual, or should we add a small script to detect missing internal doc paths?
- Should browser smoke be required for Stage 1.7 closure if no UI layout changes are made?
- Should save migration fixtures start from MVP save versions only, or include one fixture per archived stage that changed save shape?

## Suggested Implementation Order

1. Epic 43: Save API And Migration Fixtures
2. Epic 44: Static Data Builder Consolidation
3. Epic 45: Balance Budget Gates
4. Epic 48: Foundation Regression Coverage
5. Epic 46: Documentation And Archive Cleanup
6. Epic 47: Release Readiness Checklist

This order hardens the highest-risk runtime foundations first, then uses the resulting facts to update docs and checklist material.
