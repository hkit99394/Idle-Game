# Stage 1.9 UI Inventory

This inventory captures the current web UI/module shape before Stage 1.9 starts moving files. Keep it lightweight: update it when a feature changes ownership, not for every local helper rename.

## Current Feature Areas

| Feature Area | Current Files | Protected Workflows |
| --- | --- | --- |
| App shell | `web/App.tsx`, `web/app/AppPanels.tsx`, `web/app/statusText.ts`, `web/app/useSaveTools.ts`, `web/components/GamePanels.tsx` | Startup, auto-run loop, panel composition, status labels, save tool local state |
| Battle | `web/components/gamePanels/battle.tsx`, `web/state/viewModels/battle.ts` | Battle status, team cards, battle log, battle summary |
| Map and idle | `web/components/gamePanels/idleMap.tsx`, `web/state/viewModels/map.ts`, `web/state/viewModels/offline.ts` | Stage selection, offline farm target, offline summary |
| Roster and formation | `web/components/gamePanels/rosterFormation.tsx` | Active team, formation slots |
| Equipment and assignments | `web/components/gamePanels/equipmentAssignment.tsx`, `web/state/viewModels/equipment.ts` | Equipment inventory, hero equipment, assignments |
| Growth and mastery | `web/components/gamePanels/masteryGrowth.tsx`, `web/state/viewModels/progression.ts` | Upgrades, skill upgrades, mastery, style mastery |
| Counterplay and save | `web/components/gamePanels/counterplaySave.tsx`, `web/state/viewModels/counterplay.ts`, `web/state/viewModels/saveDiagnostics.ts`, `web/state/saveStorage.ts` | Counterplay settings, save tools, diagnostics |
| Shared UI | `web/components/gamePanels/shared.tsx`, `web/statusPresentation.ts`, `web/styles/app.css` | Formatting, status presentation, layout |

## Baseline Coverage

- `tests/helpers/webWorkflowBaselines.ts` owns the reusable Stage 1.9 baseline state and module inventory.
- `tests/web/webWorkflowBaselines.test.ts` checks the current feature domains from one state: selected stage, recent battle, offline summary, roster/formation, equipment, assignment, upgrades/mastery, counterplay, and save diagnostics.
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

There is no browser automation dependency in the repo at the start of Stage 1.9. Until Epic 55 adds or chooses a runner, use this repeatable manual smoke list after visible UI changes:

- Start the app with `npm run dev`.
- Confirm startup reaches the main game without a data-error state.
- Select an unlocked stage and confirm the battle status, combatants, battle log, and route selection update.
- Wait for at least two auto-run intervals and confirm continuous fighting keeps updating battle status, battle log, stage progress, or rewards without manual clicks.
- Select a cleared non-boss route as the offline farm target and confirm the preview changes.
- Toggle auto medicine, a medicine row, and pre-battle resistance mode.
- Exercise save export, import, reset-new-game, and offline time travel controls.
- Check a narrow viewport around 390px wide for stage routes, battle log, roster/formation, equipment, counterplay, and save tools.

If a later Epic 55 change adds automated browser smoke, record the command here and in `docs/stage-1.9-backlog.md`.
