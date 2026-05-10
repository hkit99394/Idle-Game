# Stage 1.9 Backlog

## Current Status

Stage 1.9 is ready to begin. Stage 1.8 completed Combat Engine V2 and is archived at [Stage 1.8 Backlog](archive/stage-1.8-backlog.md).

The recommended theme is **UI Modularization**. This is a structure and confidence stage, not a visual redesign stage. The goal is to make the web UI and web state easier to extend for future panels, mobile polish, and strategy features while preserving current gameplay behavior.

## Decisions Carried Forward

- Preserve current gameplay, combat outcomes, save behavior, and balance reports unless a task explicitly approves a behavior change.
- Treat `BattleEventRecord`, `ResolveStageBattleResult`, save transactions, and progression command results as stable web/core contracts.
- Keep `core/` free of browser, React, Vite UI, local storage, and tool formatting dependencies.
- Keep web persistence in `web/state/saveStorage.ts` unless a task extracts a browser adapter behind the same behavior.
- Prefer small feature-module moves with web-state and browser smoke coverage over a broad rewrite.
- Avoid landing-page, marketing, or decorative redesign work; this stage is about maintainability and safe panel boundaries.

## Stage Goals

- Make `web/App.tsx` read as application composition instead of a central wiring file for every panel and status string.
- Split web feature surfaces by domain: battle, map/idle, roster/formation, equipment/assignments, growth/mastery/upgrades, counterplay, and save/diagnostics.
- Split shared web view types and view-model builders so feature code can move without importing one large type file for every panel.
- Clarify the web state command surface around reducer actions, hook commands, save adapters, and view model assembly.
- Add focused web-state and browser smoke coverage before and after moving visible workflows.
- Keep mobile/narrow viewport safety in scope for the busiest panels without doing a full visual redesign.

## Non-Goals

- No new region, hero, enemy family, skill line, equipment set, or balance retune.
- No new combat mechanics; Stage 2.1 owns deeper tactics and formation bonuses.
- No save schema change unless a modularization task uncovers an unavoidable compatibility fix.
- No backend, PWA, cloud save, or account work; that belongs to Stage 2.2.
- No broad CSS theme rewrite, landing page, or hero/marketing surface.
- No core combat refactor except tiny import-boundary fixes needed to keep web feature modules clean.

## Exit Criteria

- `web/App.tsx` primarily composes feature panels, status summaries, and command handlers instead of owning every workflow detail.
- Feature panels and feature view-model builders have clear folder ownership and minimal cross-feature imports.
- `web/state/types.ts`, `web/state/viewModel.ts`, `web/state/reducer.ts`, and `web/state/useWebGameState.ts` are reduced or split enough that new feature work has an obvious home.
- Main idle loop, stage selection, battle summary/log, roster/formation, equipment/assignments, upgrades/mastery, counterplay settings, and save tools keep current behavior.
- Browser smoke coverage exists for continuous fighting, stage selection, save export/import/reset, counterplay settings, and at least one narrow viewport.
- Active docs describe the web UI/module boundaries accurately.
- `npm run typecheck`, `npm test`, `npm run build`, `npm run simulate`, `npm run support-decision`, `git diff --check`, and required browser smoke checks pass before archival.

## Epic Summary

| Epic | Title | Status | Purpose |
| --- | --- | --- | --- |
| 55 | Web Baselines And Smoke Fixtures | Complete | Lock current web workflows before moving UI and state boundaries |
| 56 | App Shell Composition And Feature Registry | Complete | Turn `App.tsx` into composition over feature modules |
| 57 | Web State Command And Reducer Slices | In Progress | Split command handling and reducer logic by domain without changing behavior |
| 58 | Feature View Models And Types | Complete | Move view-model builders and view types behind feature-owned boundaries |
| 59 | Panel Modules, Styling, And Mobile Safety | Planned | Finish feature panel ownership and protect narrow viewport layout |
| 60 | UI Docs And Release Readiness | Planned | Document web boundaries, run smoke coverage, and close Stage 1.9 cleanly |

---

## Epic 55: Web Baselines And Smoke Fixtures

### Goal

Capture current UI and web-state behavior before moving components, command handlers, and view-model ownership.

### Tasks

- Audit existing web tests and identify coverage for idle loop, stage selection, battle result display, offline summary, roster/formation, equipment, assignments, upgrades, counterplay, and save tools.
- Add or consolidate web-state fixtures for selected stage, recent battle, offline rewards, equipment action, assignment action, medicine settings, and save diagnostics.
- Add browser smoke coverage for startup, continuous fighting, stage selection, save export/import/reset, counterplay settings, and a narrow viewport.
- Record any workflows that remain manual smoke checks if a browser automation path is not practical yet.
- Add a lightweight UI/module inventory so later epics can track which files moved and which workflows they own.

### Acceptance Criteria

- Current visible workflows have enough coverage to catch accidental breaks during file moves.
- Browser smoke instructions or automated checks are explicit and repeatable.
- Baseline tests do not rely on brittle pixel snapshots for every panel.
- The backlog records any missing smoke coverage before structural work begins.

### Test Coverage

- Web state tests.
- Browser smoke or Playwright-style workflow tests where available.
- Existing save storage and offline reward tests.
- `npm run build` for production compile safety.

### Progress Notes

- Added `tests/helpers/webWorkflowBaselines.ts` with a reusable selected-stage/recent-battle/offline/equipment/assignment/counterplay/save-diagnostics baseline state and current UI module inventory.
- Added `tests/web/webWorkflowBaselines.test.ts` to protect current feature domains from one state before file moves begin.
- Added [Stage 1.9 UI Inventory](stage-1.9-ui-inventory.md) with current feature-area ownership, baseline coverage, and manual browser smoke steps.
- Browser smoke remains manual for now because the repo does not yet include a browser automation dependency or script.

---

## Epic 56: App Shell Composition And Feature Registry

### Goal

Reduce `web/App.tsx` to a readable shell that composes feature panels and delegates workflow-specific rendering to feature modules.

### Tasks

- Extract top-level battle status, purchase/action status labels, and save tool local input state into small shell or feature helpers.
- Introduce a feature panel composition layer or registry around the existing `GamePanels` exports.
- Keep current panel order and visible behavior stable.
- Keep the auto-run interval behavior unchanged and easy to find.
- Ensure app-level error boundary and static-data loading remain simple and central.

### Acceptance Criteria

- `App.tsx` is mostly shell layout, feature composition, and global lifecycle behavior.
- Feature modules own their own panel prop assembly where practical.
- Existing React components remain deterministic and behavior-preserving.
- No core imports are added directly to UI panels when a web view model already owns the translation.

### Test Coverage

- Existing web smoke tests.
- Focused render or state tests for any moved shell helpers.
- Browser smoke for startup and continuous fighting.

### Progress Notes

- Moved panel assembly into `web/app/AppPanels.tsx` with a single ordered feature panel descriptor list while preserving the current visible panel sequence.
- Moved top-level status label derivation into `web/app/statusText.ts`, save-tool local input/status state into `web/app/useSaveTools.ts`, and pure battle result presentation into `web/statusPresentation.ts`.
- Kept the app panel stack behind a narrow app-shell contract instead of passing the entire web-state hook result through feature composition.
- Kept `web/App.tsx` focused on static data bootstrapping, the app error boundary, and the unchanged 1200ms auto-run interval.
- Added `tests/web/appShell.test.ts` for panel order, shell status text, action reason formatting, and save-tool status formatting.
- Updated [Stage 1.9 UI Inventory](stage-1.9-ui-inventory.md) to include the new app-shell helper files.

---

## Epic 57: Web State Command And Reducer Slices

### Goal

Make web state transitions easier to scan by splitting action definitions, reducer branches, hook commands, and save side effects by domain.

### Tasks

- Group `WebGameAction` by domain: stage/idle, progression purchases, equipment, roster/formation, assignments, counterplay, save/import/export/reset, and diagnostics.
- Extract reducer branch helpers for domains that currently crowd `web/state/reducer.ts`.
- Extract `useWebGameState` command creators by workflow while preserving the same public hook return shape until callers are moved.
- Keep save storage and load transaction behavior unchanged.
- Preserve offline reward idempotency and reset-new-game behavior.

### Acceptance Criteria

- Reducer and hook files are smaller or domain-sectioned enough for new workflow changes to land in a clear place.
- Command results and error messages stay stable.
- Save and offline reward behavior is unchanged.
- Tests prove moved reducer paths still handle locked stages, purchases, equipment, assignments, counterplay, and save actions.

### Test Coverage

- `tests/web/gameState.*.test.ts`.
- Save storage tests.
- Offline idempotency and time-travel tests.
- Typecheck for action/result discriminants.

### Progress Notes

- Added `web/state/actions.ts` to group `WebGameAction` by stage/idle, progression, equipment, roster/formation, assignments, counterplay, and save-state domains from one action-type-to-domain map.
- Added `web/state/reducerBranches.ts` so reducer domain branches own their local transition logic while `web/state/reducer.ts` remains the public state factory/reducer surface.
- Added `web/state/commandActions.ts`, `web/state/useWebGameCommandDomains.ts`, and `web/state/useWebGameCommands.ts` so the React hook keeps the same public return shape while command action creation is split by workflow/domain.
- Added `web/state/saveToolCommands.ts` and `web/state/saveToolMessages.ts` for export/import/reset/offline time-travel save side effects, preserving existing save tool result messages without loading the view-model assembler.
- Kept `web/state/gameState.ts` as the stable public barrel while the new action, command, and save-command seams stay directly imported by focused tests.
- Added `tests/web/gameStateDomains.test.ts` to cover action-domain grouping, command action factories, reducer behavior for locked stages/purchases/equipment/assignments/counterplay, and the reset save command fallback.

---

## Epic 58: Feature View Models And Types

### Goal

Move view-model builders and feature view types behind clear feature-owned boundaries.

### Tasks

- Split `web/state/types.ts` into feature type modules or feature-owned exports while preserving public imports.
- Split `web/state/viewModel.ts` into a thin assembler over feature view-model builders.
- Keep battle view models aligned with `BattleEventRecord` from Combat Engine V2.
- Keep status presentation helpers shared only where multiple features need the same display model.
- Avoid circular dependencies between feature view models, panel components, and state commands.

### Acceptance Criteria

- Feature view-model files own their feature's view types or import them from a small local type file.
- The top-level view model assembler is easy to scan and has minimal business logic.
- Battle, map, offline, equipment, progression, counterplay, and save diagnostics view models keep current outputs.
- Web tests import feature builders through stable paths or documented local paths.

### Test Coverage

- Battle event view tests.
- Status presentation tests.
- Web game state tests that consume assembled view models.
- Typecheck to catch stale cross-feature imports.

### Progress Notes

- Added feature-owned view type modules under `web/state/viewModels/*Types.ts`, with `web/state/types.ts` kept as the stable state and compatibility barrel for existing `gameState` imports.
- Kept `OfflineRewardSummary` in a neutral state-owned module at `web/state/offlineRewardSummary.ts` while the offline view model owns only the display extension.
- Moved assignment view assembly into `web/state/viewModels/assignments.ts` so the equipment/assignment ownership documented in the Stage 1.9 inventory matches the builder boundary.
- Moved roster view assembly into `web/state/viewModels/roster.ts` so roster/formation ownership has both local types and a local builder.
- Moved formation view types and formation view assembly into the roster feature boundary while battle still supplies combatant display state.
- Moved battle-specific final-combatant display assembly into the battle view-model builder and kept `web/state/viewModels/webGameViewModel.ts` focused on wiring feature outputs.
- Stopped re-exporting feature view types from the state compatibility barrel; panels now import feature view types from their feature-owned type modules.
- Added `tests/web/viewModelBoundaries.test.ts` to prevent feature-owned view-model builders from importing sibling feature builders directly.
- Added `web/state/viewModels/webGameViewModel.ts` for feature-oriented view-model assembly and reduced `web/state/viewModel.ts` to the public wrapper/re-export surface.
- Added `tests/web/viewModelAssembler.test.ts` to guard the public `getWebGameViewModel` wrapper against the feature assembler and sample battle, map, offline, equipment, and counterplay outputs.
- Updated the Stage 1.9 UI inventory and baseline helper so the new feature type and assembler files are documented by ownership area.

---

## Epic 59: Panel Modules, Styling, And Mobile Safety

### Goal

Finish panel ownership by feature and protect the busiest layouts on desktop and mobile viewports.

### Tasks

- Move panel components into feature folders when their state/view-model ownership is clear.
- Keep shared formatting, stat bars, and badges in a small shared UI module.
- Audit `web/styles/app.css` for feature-specific selectors that should move or be grouped by panel.
- Add narrow viewport smoke checks for stage map, battle log, roster/formation, equipment, counterplay, and save tools.
- Decide whether diagnostics/debug surfaces should stay visible, collapse behind a diagnostics panel, or become dev-only.

### Acceptance Criteria

- Panel files are organized by feature and do not depend on unrelated panel internals.
- Shared UI helpers are genuinely shared and not a dumping ground for feature logic.
- Existing visual hierarchy and workflow order remain familiar.
- Narrow viewport smoke checks show no clipped controls, overlapping text, or unusable panels.

### Test Coverage

- Browser smoke screenshots or assertions for desktop and narrow viewport.
- Existing web state tests.
- Build verification for CSS/module imports.

### Progress Notes

- Not started.

---

## Epic 60: UI Docs And Release Readiness

### Goal

Close Stage 1.9 with clear web feature boundaries, smoke coverage notes, and release-readiness verification.

### Tasks

- Update `docs/current-implemented-systems.md` with the final web feature module structure.
- Update `docs/core-engine-boundary.md` if any web/core boundary guidance changes.
- Add or update a dedicated web UI architecture doc if the module layout needs more than a short onboarding note.
- Update roadmap notes if Stage 1.9 changes Stage 2.0, 2.1, or 2.2 scope.
- Run the release-readiness checklist, including browser smoke, before marking Stage 1.9 complete.
- Archive this backlog only after all epics are complete and verification passes.

### Acceptance Criteria

- New contributors can find where to add a panel, view model, reducer command, save workflow, or browser smoke check.
- Active docs describe the implemented web module boundaries accurately.
- No active docs point to missing or stale backlog paths.
- Stage closure records required commands, browser smoke outcome, review outcome, and any deferred P3s.

### Test Coverage

- Release-readiness command set.
- Browser smoke checks required by this stage.
- Manual markdown path checks or link-check script.

### Progress Notes

- Not started.

---

## Open Questions

- Should Stage 1.9 introduce an automated browser smoke script, or are manual browser checks acceptable until a stable runner exists?
- Should `web/state/types.ts` split by feature immediately, or should it first become a barrel over feature type files?
- Should `useWebGameState` keep one public hook through Stage 1.9, or should feature-specific hooks be introduced after `App.tsx` composition is simplified?
- Should save diagnostics stay always visible, collapse behind a diagnostics panel, or become dev-only?
- How much CSS should move with panels versus remain in one app stylesheet until a design-system stage?
- Which narrow viewport widths should become required smoke checks?

## Suggested Implementation Order

1. Epic 55: Web Baselines And Smoke Fixtures
2. Epic 56: App Shell Composition And Feature Registry
3. Epic 57: Web State Command And Reducer Slices
4. Epic 58: Feature View Models And Types
5. Epic 59: Panel Modules, Styling, And Mobile Safety
6. Epic 60: UI Docs And Release Readiness

This order protects current workflows first, then reduces the shell and state pressure points, then finishes feature ownership and browser-readiness before archival.
