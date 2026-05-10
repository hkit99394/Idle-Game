# Web UI Architecture

This page is the Stage 1.9 contributor map for the React web app. Use it when adding a panel, view model, reducer command, save workflow, or UI smoke check.

## Composition

- `web/App.tsx` owns static data bootstrap, the app error state, the auto-run loop, and the public web-state hook.
- `web/app/AppPanels.tsx` owns the visible panel order through `appFeaturePanels` and `appFeaturePanelOrder`.
- `web/app/statusText.ts` owns app-shell status labels derived from the assembled view model.
- `web/app/useSaveTools.ts` owns local import/export text state and save-tool status messages.
- `web/components/GamePanels.tsx` is a compatibility barrel over feature panels. New panel implementation should go in `web/features/*`, not in `web/components`.

## Feature Panels

Feature panels live beside their feature name and import feature-owned view types from `web/state/viewModels`.

| Feature | Panel Module | Primary View Model Modules |
| --- | --- | --- |
| Battle | `web/features/battle/panels.tsx` | `web/state/viewModels/battle.ts`, `battleTypes.ts` |
| Map and idle | `web/features/mapIdle/panels.tsx` | `map.ts`, `mapTypes.ts`, `offline.ts`, `offlineTypes.ts` |
| Roster and formation | `web/features/rosterFormation/panels.tsx` | `roster.ts`, `rosterTypes.ts` |
| Equipment and assignments | `web/features/equipmentAssignments/panels.tsx` | `equipment.ts`, `equipmentTypes.ts`, `assignments.ts`, `assignmentTypes.ts` |
| Growth and mastery | `web/features/growthMastery/panels.tsx` | `progression.ts`, `progressionTypes.ts` |
| Counterplay and save | `web/features/counterplaySave/panels.tsx` | `counterplay.ts`, `counterplayTypes.ts`, `saveDiagnostics.ts`, `saveDiagnosticsTypes.ts` |
| Shared display helpers | `web/features/shared/ui.tsx` | Formatting helpers and stat bars used by multiple features |

Keep feature panels behind web feature boundaries. Panels should use feature view types or small feature-local input shapes, not direct `core/` imports or the global `web/state/gameState` barrel.

## View Models

- `web/state/viewModel.ts` is the stable public wrapper.
- `web/state/viewModels/webGameViewModel.ts` assembles the feature view models.
- Feature builders such as `battle.ts`, `progression.ts`, `counterplay.ts`, and `saveDiagnostics.ts` own their local display shape.
- Feature view type modules are named `*Types.ts`. Do not re-export feature view types from the state compatibility barrel unless a future public API explicitly needs it.

Boundary tests in `tests/web/viewModelBoundaries.test.ts` guard sibling feature builder imports, feature panel paths, and panel imports from core/global state barrels.

## Commands, Reducers, And Saves

- `web/state/actions.ts` groups `WebGameAction` by stage/idle, progression, equipment, roster/formation, assignments, counterplay, and save-state domains.
- `web/state/commandActions.ts` owns action factory helpers.
- `web/state/reducerBranches.ts` owns domain transition logic while `web/state/reducer.ts` remains the public reducer surface.
- `web/state/useWebGameCommandDomains.ts` and `useWebGameCommands.ts` keep hook commands grouped by workflow while preserving the public hook shape.
- `web/state/saveToolCommands.ts` and `saveToolMessages.ts` own export, import, reset, and offline time-travel side effects and messages.
- `web/state/saveStorage.ts` remains the browser persistence adapter. Core save parsing, migration, validation, offline rewards, and timestamp advancement stay under `core/save`.

## Styling And Smoke Coverage

- `web/styles/app.css` remains the single app stylesheet for now, grouped with feature-owner comments and a responsive contract section.
- `tests/web/responsivePanelSmoke.test.ts` checks narrow viewport CSS contracts and protected panel selectors for stage routes, battle log rows, roster/formation, equipment, counterplay, and save tools.
- `docs/stage-1.9-ui-inventory.md` records the current UI ownership table, baseline tests, and browser smoke notes.
- Browser smoke for visible UI changes should follow `docs/release-readiness-checklist.md`. Stage 1.9 closure used Codex in-app browser smoke at 1120x900 and 390x900.
