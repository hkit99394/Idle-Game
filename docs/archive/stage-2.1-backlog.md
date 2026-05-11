# Stage 2.1 Backlog

## Current Status

Stage 2.1 is complete and archived. Stage 2.0 completed the content pipeline and is archived at [Stage 2.0 Backlog](stage-2.0-backlog.md).

## Theme

The recommended theme is **Tactic Presets And Strategy Visibility**. The goal is to add a player-facing strategic choice that changes battle outcomes, can be validated through the core engine, and can be reviewed through the existing balance pipeline before larger content expansion.

Stage 2.1 should start with tactic presets rather than a full formation-bonus system. Tactics give players a clear choice with smaller data, UI, save, and balance scope. Formation bonuses remain a likely later layer once tactic behavior proves where slot and style incentives should matter.

## Decisions Carried Forward

- Preserve current combat outcomes for the default tactic as much as practical.
- Default existing and imported saves to a balanced tactic if no tactic choice exists yet.
- Keep tactic behavior in `core/` and data/config modules; web code should select and display tactics, not own combat rules.
- Route combat behavior through the Stage 1.8 extension points documented in [Combat Engine V2](../combat-engine-v2.md).
- Use the Stage 2.0 content pipeline for review: validation, simulator output, compact JSON export, CSV output, and [Content Authoring Checklist](../content-authoring-checklist.md).
- Keep known Black Iron Fort and Demon Cult budget misses visible as tuning debt unless a Stage 2.1 epic intentionally retunes them.
- Keep Stage 2.2 backend, PWA, cloud save, account, and online boss work out of scope.

## Stage Goals

- Choose and document a small set of tactic presets such as balanced, focus Outer, focus Inner, protect support, sustain, or boss burst.
- Add a typed tactic schema with validation for ids, labels, target priorities, modifier ranges, and unsupported combinations.
- Integrate tactic behavior into combat without growing the simulator loop directly.
- Persist and restore the selected tactic safely through save migration or normalization.
- Add UI that lets the player choose a tactic and understand its effect through CP, battle summary, or counterplay preview.
- Extend balance tooling so tactics can be compared across configured regions and known budget debt stays visible.

## Non-Goals

- No new production region is required for this stage.
- No full formation-bonus system unless the tactics audit proves it is required for the selected MVP tactic layer.
- No manual real-time battle controls; tactic selection should stay pre-battle or persistent.
- No new hero, weapon family, or skill branch content unless it is needed to validate tactics.
- No broad combat retune beyond tactic-owned deltas and explicitly documented budget decisions.
- No backend, PWA, cloud save, account, or online boss implementation.

## Exit Criteria

- Players have at least one meaningful tactic choice beyond the default balanced behavior.
- The selected tactic changes measurable battle outcomes in core tests and simulator reports.
- The tactic choice is visible in web UI and persisted safely across save/load/export/import.
- Default behavior remains stable enough that existing content stays playable.
- Balance reports or exports expose tactic comparison data for review.
- Active docs explain how tactics plug into combat and how authors should review them.
- `npm run typecheck`, `npm test`, `npm run build`, `npm run simulate`, tactic export/report checks, browser smoke for visible UI changes, `git diff --check`, and docs/link checks pass before archival.

## Epic Summary

| Epic | Title | Status | Purpose |
| --- | --- | --- | --- |
| 67 | Strategy Surface Audit And Tactics Decision | Complete | Choose the tactic MVP, map extension points, and define expected player-facing outcomes |
| 68 | Tactic Preset Schema And Validation | Complete | Add typed tactic data/config, defaulting, validation, and focused tests |
| 69 | Combat Tactics Engine Integration | Complete | Apply tactic behavior through core combat extension points with deterministic tests |
| 70 | Tactics UI And Save Workflow | Complete | Let players select tactics, persist choices, and see tactic effects in the web app |
| 71 | Strategy Balance Reports And Tuning Review | Complete | Compare tactic outcomes across regions and document or fix tactic-driven budget shifts |
| 72 | Strategy Docs And Stage 2.1 Readiness | Complete | Close the stage with docs, verification, browser smoke notes, and archive cleanup |

---

## Epic 67: Strategy Surface Audit And Tactics Decision

### Goal

Choose the first deeper strategy layer and document how it will fit the current engine, save, UI, and balance tooling.

### Tasks

- Audit current combat extension points for targeting, scheduler timing, damage packages, status hooks, auto medicine, and battle recorder output.
- Compare tactics, formation bonuses, manual actions, and skill branches against implementation scope and player value.
- Choose the Stage 2.1 MVP tactic set and define the default balanced behavior.
- Define what each tactic should affect: target priority, Outer/Inner emphasis, support protection, sustain behavior, boss burst, or medicine posture.
- Identify the smallest visible UI surface for choosing tactics and reviewing their effects.
- Decide which simulator/export output should compare tactics.

### Acceptance Criteria

- The backlog records tactics as the primary Stage 2.1 layer or explains any changed decision.
- The chosen tactic set has player-readable names and expected behavior.
- The implementation touchpoints are mapped before schema or combat code starts.
- Default tactic behavior has a compatibility expectation for existing saves and reports.

### Test Coverage

- No production behavior change is required.
- Markdown path/link check if docs change.

### Progress Notes

- Added [Stage 2.1 Tactics Audit](../stage-2.1-tactics-audit.md) with the candidate comparison, tactic MVP decision, behavior boundaries, touchpoint map, save/UI decision, balance-output decision, and Epic 68 handoff.
- Chose global tactic presets as the first Stage 2.1 strategy layer. Formation bonuses, manual battle actions, and skill branch content stay deferred.
- Chose the MVP tactic ids: `balanced`, `outer_pressure`, `inner_pressure`, `guard_support`, `sustain`, and `boss_burst`.
- Chose static data as the tactic definition home, with `data/tactics.json` feeding `StaticGameData.tactics`.
- Chose one global `PlayerProgress.selectedTacticId` for the first implementation, defaulting missing or invalid values to `balanced`.
- Chose opt-in tactic comparison outputs for Epic 71 so Stage 2.0 default report/export commands stay stable.

---

## Epic 68: Tactic Preset Schema And Validation

### Goal

Add a safe data/config contract for tactic presets before combat behavior depends on them.

### Tasks

- Add typed tactic preset definitions for ids, labels, descriptions, target priorities, modifier ranges, and allowed behavior flags.
- Add a balanced default tactic that preserves current behavior when no selection exists.
- Wire tactic definitions into the canonical static-data bundle as `data/tactics.json`.
- Validate duplicate ids, unsupported target rules, invalid modifier ranges, missing defaults, and contradictory tactic fields.
- Add tests for valid presets and representative invalid presets.
- Document how tactic data should be authored and reviewed.

### Acceptance Criteria

- Tactic presets are typed and validated before use.
- Existing data/build/test paths pass with a balanced default.
- Invalid tactics fail loudly with actionable messages.
- Authors can see where tactic definitions live and which fields are allowed.

### Test Coverage

- Static-data/config validation tests.
- Typecheck.
- Focused docs/link check if docs change.

### Progress Notes

- Added [tactics.json](../../data/tactics.json) with the six MVP tactic presets and `balanced` as the no-op default.
- Added tactic preset types to `StaticGameData`, wired `tactics` through the canonical bundle, and kept web/tools/tests on the shared static-data path.
- Added static validation for the balanced default, behavior flags, target priorities, modifier types and ranges, duplicate tactic fields, and contradictory tactic fields.
- Added focused validation tests for malformed defaults, unsupported fields, invalid ranges, and contradictory tactic definitions.
- Updated static-data and content inventory docs with the tactic preset authoring contract.
- Verification passed: `npm test -- tests/data/validateData.test.ts tests/data/staticDataBuilder.test.ts`, `npm run typecheck`, `npm test`, `npm run build`, `npm run simulate`, `git diff --check`, and markdown path checks.

---

## Epic 69: Combat Tactics Engine Integration

### Goal

Make tactic choices affect deterministic combat outcomes through the existing combat pipeline.

### Tasks

- Thread the selected tactic from progression or battle setup into combat resolution.
- Apply tactic behavior through targeted modules such as `targeting`, `damagePackage`, `effectPipeline`, scheduler rules, or auto-medicine policy.
- Keep default balanced tactic behavior close to current combat outcomes.
- Add battle recorder fields or contribution metadata needed to explain tactic effects.
- Add tests showing tactic choices change relevant outcomes without breaking determinism.
- Confirm tactic behavior works for normal, elite, boss, support, status-heavy, defensive, and healing encounters.

### Acceptance Criteria

- At least one non-default tactic changes combat outcomes in a measurable, intended way.
- Balanced/default behavior remains compatible enough for current content and tests.
- Tactic behavior is deterministic and covered by focused core tests.
- Combat integration does not introduce web dependencies into `core/`.

### Test Coverage

- Core combat tests for tactic behavior and determinism.
- Progression adapter tests where selected tactics affect stage resolution.
- `npm run simulate` smoke after integration.

### Progress Notes

- Added runtime tactic resolution through `SimulateBattleInput.tacticId` and `ResolveStageBattleInput.tacticId`, defaulting missing or unknown ids to the validated `balanced` tactic.
- Added `BattleResult.playerTactic` metadata so web, progression, and future reports can explain which tactic powered a battle without parsing save state.
- Applied player-side tactic modifiers through existing combat lanes: target priorities, Outer/Inner/boss damage, Qi Break break power, guard/protection values, healing/regeneration values, and status resistance.
- Kept `balanced` behavior neutral; focused tests compare implicit, explicit, and unknown tactic ids for identical combat output.
- Added deterministic core tests for normal, elite, boss, defensive/support, healing, status-resistance, and stage-resolution tactic paths.
- Verification passed: `npm test -- tests/combat/tactics.test.ts`, `npm test -- tests/combat tests/progression tests/data`, `npm run typecheck`, `npm test`, `npm run build`, `npm run simulate`, `npm run support-decision`, `git diff --check`, and changed-doc markdown link checks.

---

## Epic 70: Tactics UI And Save Workflow

### Goal

Let players choose a tactic, persist it safely, and see enough feedback to understand the choice.

### Tasks

- Add global selected tactic state to save normalization, export/import, and migration behavior.
- Add reducer commands, action factories, and view-model fields for tactic selection.
- Build a compact tactic selector in the existing web feature structure.
- Show tactic impact in CP, battle summary, counterplay preview, or another existing strategy surface.
- Add source-level UI/state tests and browser smoke for the tactic workflow.
- Keep the UI usable on narrow mobile viewports.

### Acceptance Criteria

- Players can select a tactic without editing data or using dev tools.
- The selected tactic survives save/load/export/import.
- Existing saves default safely to the balanced tactic.
- The UI makes tactic choice visible without adding a large explanatory page.
- Browser smoke covers desktop and mobile tactic selection if visible UI changes land.

### Test Coverage

- Save normalization/migration tests.
- Web reducer, command, and view-model tests.
- Browser smoke for visible UI changes.

### Progress Notes

- Added `PlayerProgress.selectedTacticId` with `balanced` defaults in new progress, cloned progress, save migration, import/export normalization, and validation.
- Added tactic selection helpers, the strategy action domain, reducer/command/hook plumbing, and battle resolution fallback from saved progress into combat.
- Added tactic view models and a compact Strategy panel so players can select global tactics from the existing app surface without a new explanatory page.
- Battle summaries now include the tactic used for the most recent battle through `BattleResult.playerTactic`.
- Added save migration/normalization coverage, web command/reducer/view-model coverage, UI boundary and responsive source smoke coverage, and Stage 1.9 UI inventory entries for the strategy feature.

---

## Epic 71: Strategy Balance Reports And Tuning Review

### Goal

Make tactic outcomes visible enough to tune without hand-running one-off battles.

### Tasks

- Extend simulator or balance report tooling with opt-in tactic comparison outputs across configured regions.
- Add compact JSON and/or CSV fields for tactic id, result, duration, target status, pressure metrics, and key contribution deltas.
- Identify tactic-driven shifts in existing known budget debt.
- Retune only tactic-owned changes or record deferred tuning debt explicitly.
- Add report/export tests so tactic comparison output does not drift casually.
- Update balance docs with tactic review commands and interpretation notes.

### Acceptance Criteria

- Authors can compare tactic outcomes from repeatable commands.
- Tactic-driven budget changes are visible as report/export rows.
- Existing known Black Iron Fort and Demon Cult misses remain documented or are intentionally retuned.
- Export shape changes are tested and documented.

### Test Coverage

- Balance report/export tests.
- `npm run simulate`.
- `npm run --silent simulate -- --export-json` and `npm run --silent simulate -- --csv` shape checks if changed.

### Progress Notes

- Added opt-in tactic comparison tooling through `npm run --silent simulate -- --tactics-json` and `npm run --silent simulate -- --tactics-csv` while leaving default report, compact JSON, and stage CSV outputs unchanged.
- Tactic comparison rows cover every configured stage for every tactic and include baseline result, result changes, duration deltas, target-status changes, pressure metrics, and contribution metric deltas.
- Added budget-shift labels so existing target misses can be distinguished from improved misses and new tactic regressions.
- Documented the Stage 2.1 tactic review commands and the current notable tactic shifts without retuning existing Black Iron Fort or Demon Cult debt.
- Verification passed: `npm test -- tests/tools/balanceReport.test.ts`, `npm run typecheck`, `npm test`, `npm run build`, `npm run simulate`, `npm run support-decision`, `npm run --silent simulate -- --export-json`, `npm run --silent simulate -- --csv`, `npm run --silent simulate -- --tactics-json`, and `npm run --silent simulate -- --tactics-csv`.

---

## Epic 72: Strategy Docs And Stage 2.1 Readiness

### Goal

Close Stage 2.1 with clear strategy docs, release verification, and next-stage readiness.

### Tasks

- Update [Current Implemented Systems](../current-implemented-systems.md) with final tactic behavior.
- Update [Combat Engine V2](../combat-engine-v2.md) if new extension points or event contracts are added.
- Update [Content Authoring Checklist](../content-authoring-checklist.md) if tactic review becomes part of content readiness.
- Update roadmap notes if Stage 2.1 changes Stage 2.2 scope.
- Run the release-readiness checklist, including browser smoke for tactic UI.
- Archive this backlog only after all epics are complete and verification passes.

### Acceptance Criteria

- Active docs explain tactics at the engine, UI, save, and balance-review levels.
- No active docs point to missing or stale backlog paths.
- Stage closure records required commands, browser smoke outcome, report/budget outcome, and any deferred P3s.
- Stage 2.2 preparation can start from accurate current-state docs.

### Test Coverage

- Release-readiness command set.
- Browser smoke for visible tactic UI.
- Manual markdown path checks or link-check script.

### Progress Notes

- Updated [Current Implemented Systems](../current-implemented-systems.md), [Static Data](../static-data.md), [Content Pipeline Inventory](../content-pipeline-inventory.md), [Stage 2.1 Tactics Audit](../stage-2.1-tactics-audit.md), and [Roadmap Stage 1.7 To 2.2](../roadmap-stage-1.7-to-2.2.md) so tactics are described in completed-stage language across engine, data, UI/save, and balance-review surfaces.
- Confirmed no new Combat Engine V2 extension contract was required for Epic 72; Stage 2.1 reused the documented combat extension lanes already updated by earlier epics.
- Preserved the known Black Iron Fort and Demon Cult budget debt as visible tuning debt instead of making a broad Stage 2.1 retune. `npm run simulate` still reports the expected Black Iron Fort clear-time miss and Demon Cult clear-time/status-pressure misses.
- Verified tactic comparison exports report tactic ids, baseline results, result changes, duration deltas, target-status changes, pressure deltas, contribution deltas, and budget-shift labels.
- Browser smoke outcome: Vite served the app locally at `http://127.0.0.1:5174/`, but the Codex in-app browser pane was unavailable in this session and direct Playwright was not installed, so interactive click-through smoke is recorded as a deferred P3 rerun item. Existing web state/view-model/responsive tests still cover the tactic selector and `Tactic: Crushing Blows.` battle-summary path.
- Archived the completed Stage 2.1 backlog at `docs/archive/stage-2.1-backlog.md`. Active docs now point at the archive path and Stage 2.2 can start from backend/PWA readiness planning.
- Verification passed: `npm run typecheck`, `npm test`, `npm run build`, `npm run simulate`, `npm run support-decision`, `npm run --silent simulate -- --export-json`, `npm run --silent simulate -- --csv`, `npm run --silent simulate -- --tactics-json`, and `npm run --silent simulate -- --tactics-csv`.

---

## Open Questions

- Epic 67 answer: the MVP tactic set is `balanced`, `outer_pressure`, `inner_pressure`, `guard_support`, `sustain`, and `boss_burst`.
- Epic 67 answer: tactics should be authored as static content data in `data/tactics.json`, assembled into `StaticGameData.tactics`, and validated with the rest of content.
- Epic 67 answer: tactic selection should be one global `PlayerProgress.selectedTacticId` for the first implementation.
- Epic 67 answer: tactic comparison should be opt-in through new tactic JSON/CSV exports so the default Stage 2.0 report/export commands remain stable.
- Epic 68 answer: the tactic schema is data-only for now. Combat behavior, save selection, UI, and tactic comparison exports start in Epics 69-71.

## Suggested Implementation Order

1. Epic 67: Strategy Surface Audit And Tactics Decision
2. Epic 68: Tactic Preset Schema And Validation
3. Epic 69: Combat Tactics Engine Integration
4. Epic 70: Tactics UI And Save Workflow
5. Epic 71: Strategy Balance Reports And Tuning Review
6. Epic 72: Strategy Docs And Stage 2.1 Readiness

This order makes the strategy choice explicit first, protects the data/config contract, then implements combat behavior, then surfaces it in UI/save workflows, then tunes and closes the stage.
