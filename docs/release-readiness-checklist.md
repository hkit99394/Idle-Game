# Release Readiness Checklist

Use this checklist before closing a stage, archiving a stage backlog, or preparing a release-style handoff. The goal is to make closure boring, repeatable, and hard to fake.

## Required Verification

Run these commands from the repository root before marking a stage complete:

Shortcut: `npm run verify` runs the full required command chain below.

| Command | Purpose | Pass Condition |
| --- | --- | --- |
| `npm run typecheck` | Catches TypeScript drift across core, web, tools, and tests. | Exits 0 with no type errors. |
| `npm test` | Runs unit, integration, save, data, web-state, and tool coverage. | All test files pass. |
| `npm run build` | Confirms the production web build still compiles. | Vite build exits 0. |
| `npm run simulate` | Runs the balance report against configured regions and shared budget gates. | Command exits 0; any reported budget misses are understood and documented. |
| `npm run support-decision` | Confirms support/counterplay decision tooling still runs. | Command exits 0 and the recommendation still matches current design intent. |
| `git diff --check` | Catches trailing whitespace and patch formatting problems. | Exits 0. |

If a command fails, fix the issue or record why the stage cannot close yet. Do not archive the backlog while required verification is failing.

## Required Review

- Self-review the full diff before closure, including docs and data changes.
- Check that implementation matches the active backlog acceptance criteria.
- Fix all P1 and P2 review findings before marking a stage complete.
- For P3 findings, either fix them or record the deferral in the active backlog or next-stage roadmap.
- Use an optional subagent or second reviewer when a stage changes combat, save migration, offline rewards, static-data validation, balance gates, or large UI flows.
- Re-run the relevant verification commands after review fixes.

## UI And Browser Smoke

Browser smoke is required when a stage changes visible UI, web state transitions, save import/export/reset controls, continuous fighting, formation/equipment panels, medicine settings, or mobile layout.

Suggested smoke coverage:

- Open the local web app through the normal dev or preview server.
- Confirm startup load succeeds without console-breaking errors.
- Select a stage and confirm continuous fighting or farming begins.
- Exercise the changed panel or interaction directly.
- If save behavior changed, export, import, reload, and reset a new game.
- If mobile layout changed, check a narrow viewport for overlap and clipped controls.

For docs-only, tooling-only, or pure core refactors with no UI path change, browser smoke can be skipped and noted in the backlog progress notes.

## Save Compatibility

Use this section whenever save schema, migrations, offline load, imports, reset state, map progress, farm target, equipment, assignments, medicine, or hero progress changes.

- Add or update migration fixtures for every supported old save shape affected by the change.
- Validate that imported saves reject unknown or out-of-range progress values instead of unlocking content accidentally.
- Confirm `loadSaveTransaction` remains the preferred path for startup load, import normalization, offline reward application, and timestamp advancement.
- Confirm a second load without elapsed time does not duplicate offline rewards.
- Verify reset-new-game still creates a valid current save.
- Document intentional save-version changes in `docs/save-api.md` or the active backlog.

## Static Data And Balance

Use this section whenever regions, stages, enemies, skills, equipment, medicines, assignments, rewards, or balance targets change.

- Assemble data through the canonical static-data builder.
- Validate static data before trusting new content.
- Confirm new regions or stages are covered by `npm run simulate`.
- Document any intentional budget misses in the active release authority: `docs/content-pipeline-inventory.md`, `docs/balance-budget-gates.md`, configured `balanceTargets`, and simulator budget output should agree on the accepted miss.
- Check farm recommendations, reward curves, and boss gates when rewards or region order changes.

## Documentation And Archive

Before archiving a stage backlog:

- Mark all completed epics with final status and progress notes.
- Record verification commands and any skipped optional checks.
- Update active roadmap docs if the stage changes future direction.
- Update onboarding docs if implemented systems changed.
- Move the completed stage backlog to `docs/archive`.
- Confirm no duplicate active backlog copy remains at `docs/stage-x.y-backlog.md` after archival unless the stage is intentionally reopened.
- Confirm active docs link to archived backlog paths only where historical context is useful.
- Run a markdown link/path check if links changed.

## Closure Summary Template

Use this shape in the final handoff or backlog progress notes:

```text
Stage/Epic:
Scope completed:
Verification:
Browser smoke:
Known budget misses or deferred P3s:
Archive/docs status:
Next recommended epic:
```
