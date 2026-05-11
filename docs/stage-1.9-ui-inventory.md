# Stage 1.9 UI Inventory

This inventory captures the web UI/module shape after Stage 1.9's feature-boundary work. Keep it lightweight: update it when a feature changes ownership, not for every local helper rename.

## Current Feature Areas

| Feature Area | Current Files | Protected Workflows |
| --- | --- | --- |
| App shell | `web/App.tsx`, `web/app/AppPanels.tsx`, `web/app/statusText.ts`, `web/app/useSaveTools.ts`, `web/components/GamePanels.tsx`, `web/state/viewModel.ts`, `web/state/viewModels/webGameViewModel.ts` | Startup, auto-run loop, panel composition, status labels, save tool local state, view model assembly |
| Battle | `web/features/battle/panels.tsx`, `web/state/viewModels/battle.ts`, `web/state/viewModels/battleTypes.ts` | Battle status, team cards, battle log, battle summary |
| Map and idle | `web/features/mapIdle/panels.tsx`, `web/state/offlineRewardSummary.ts`, `web/state/viewModels/map.ts`, `web/state/viewModels/mapTypes.ts`, `web/state/viewModels/offline.ts`, `web/state/viewModels/offlineTypes.ts` | Stage selection, offline farm target, offline summary |
| Roster and formation | `web/features/rosterFormation/panels.tsx`, `web/state/viewModels/roster.ts`, `web/state/viewModels/rosterTypes.ts` | Active team, formation slots |
| Strategy | `web/features/strategy/panels.tsx`, `web/state/viewModels/tactics.ts`, `web/state/viewModels/tacticsTypes.ts` | Tactic selection |
| Equipment and assignments | `web/features/equipmentAssignments/panels.tsx`, `web/state/viewModels/assignments.ts`, `web/state/viewModels/assignmentTypes.ts`, `web/state/viewModels/equipment.ts`, `web/state/viewModels/equipmentTypes.ts` | Equipment inventory, hero equipment, assignments |
| Growth and mastery | `web/features/growthMastery/panels.tsx`, `web/state/viewModels/progression.ts`, `web/state/viewModels/progressionTypes.ts` | Upgrades, skill upgrades, mastery, style mastery |
| Counterplay and save | `web/features/counterplaySave/panels.tsx`, `web/state/viewModels/counterplay.ts`, `web/state/viewModels/counterplayTypes.ts`, `web/state/viewModels/saveDiagnostics.ts`, `web/state/viewModels/saveDiagnosticsTypes.ts`, `web/state/saveStorage.ts` | Counterplay settings, save tools, diagnostics |
| Shared UI | `web/features/shared/ui.tsx`, `web/statusPresentation.ts`, `web/styles/app.css` | Formatting, status presentation, layout |

## Baseline Coverage

- `docs/web-ui-architecture.md` is the contributor map for where to add panels, view models, reducer commands, save workflows, styling, and smoke checks.
- `tests/helpers/webWorkflowBaselines.ts` owns the reusable Stage 1.9 baseline state and module inventory.
- `tests/web/webWorkflowBaselines.test.ts` checks the current feature domains from one state: selected stage, recent battle, offline summary, roster/formation, strategy, equipment, assignment, upgrades/mastery, counterplay, and save diagnostics.
- `tests/web/gameStateDomains.test.ts` checks the Stage 1.9 web-state command surface: grouped action domains, command action factories, reducer domain behavior, and save reset fallback behavior.
- `tests/web/viewModelAssembler.test.ts` checks that the stable public `getWebGameViewModel` wrapper stays aligned with the feature-oriented assembler and representative feature outputs.
- `tests/web/viewModelBoundaries.test.ts` checks that feature-owned view-model builders do not import sibling feature builders directly.
- Existing web tests still protect deeper command paths:
  - `tests/web/gameState.progression.test.ts`
  - `tests/web/gameState.idle.test.ts`
  - `tests/web/gameState.systems.test.ts`
  - `tests/web/mvpSmoke.test.ts`
  - `tests/web/saveStorage.test.ts`
  - `tests/web/offlineRewardIdempotency.test.ts`
  - `tests/web/offlineTimeTravel.test.ts`
  - `tests/web/battleEventView.test.ts`
  - `tests/web/statusPresentation.test.ts`

## Browser Smoke Status

There is no browser automation dependency in the repo at the start of Stage 1.9. Epic 59 adds source-level responsive smoke coverage in `tests/web/responsivePanelSmoke.test.ts`, which checks the narrow viewport CSS contracts and the panel selectors for stage routes, battle log rows, roster/formation, strategy, equipment, counterplay, and save tools.

Epic 59 browser smoke was also run in the Codex in-app browser at 1120x900 and 390x900. The smoke checked protected panel selectors, save diagnostics expansion, screenshots, and browser console errors; all protected panels were present and no console errors were reported.

Until a later stage adds true browser screenshots, use this repeatable manual smoke list after visible UI changes:

- Start the app with `npm run dev`.
- Confirm startup reaches the main game without a data-error state.
- Select an unlocked stage and confirm the battle status, combatants, battle log, and route selection update.
- Wait for at least two auto-run intervals and confirm continuous fighting keeps updating battle status, battle log, stage progress, or rewards without manual clicks.
- Select a cleared non-boss route as the offline farm target and confirm the preview changes.
- Toggle auto medicine, a medicine row, and pre-battle resistance mode.
- Exercise save export, import, reset-new-game, and offline time travel controls.
- Check a narrow viewport around 390px wide for stage routes, battle log, roster/formation, strategy tactics, equipment, counterplay, and save tools.

If a later stage adds automated browser smoke, record the command here and in that stage's active backlog.
