# Stage 3.5 Backlog: District Attention Route-Card Prototype

## Current Status

Stage 3.5 is complete and archived after [Archived Stage 3.4 Backlog](stage-3.4-backlog.md). Stage 3.4 completed the District Heat warning contract, selected neutral `district attention` copy, chose future route-card placement, kept the warning non-persistent and export-free, and strengthened the live-web source guard so warning copy cannot appear until a named implementation slice amends the contract. Slice 101.1 completed the contract reopen and allowlist preflight. Slice 101.2 added non-persistent route-card warning data to the map view model. Slice 101.3 rendered the compact warning in the route-card UI. Slice 101.4 hardened boundary tests and re-proved compact/tactic exports remain warning-free. Slice 101.5 captured desktop and narrow-mobile browser smoke with no warning spillover into unrelated surfaces. Slice 101.6 completed release hardening, updated active docs, and archived the backlog.

This stage owns **Epic 101: District Attention Route-Card Prototype**. It should build the smallest player-facing warning surface for District Heat without changing rewards, route risk, enemy pressure, offline gains, save data, cloud payloads, compact exports, tactic exports, or full-debug report shape.

Do not start Stage 3.5 by adding a heat meter, severity band, reward modifier, risk modifier, persisted heat state, or export field. The point is to prove whether a quiet informational route-card note is readable before any live District Heat mechanic exists.

## Review Findings

The Stage 3.5 plan starts from the Stage 3.4 closure evidence:

- District Heat remains `report_only` in `npm run simulate` and full debug JSON.
- Compact JSON/CSV exports, tactic exports, saves, cloud envelopes, rewards, route risk, enemy pressure, offline gains, and live web UI remain heat-free after Stage 3.4.
- Approved future player-facing language uses neutral `district attention`, not the report/internal `District Heat` label.
- Approved future route-card label is `Attention rising`.
- Approved future body copy is `Repeated runs are drawing district attention. Rewards, enemy pressure, and offline gains are unchanged.`
- Approved future support text is `Informational only.`
- `tests/web/displayTerms.test.ts` currently blocks those tokens and the likely implementation identifiers until this stage amends the guard with an explicit owner-file allowlist.

## Stage Theme

Make District Heat visible only as a small, non-punitive route-card warning.

Stage 3.5 answered whether a player-facing attention note can exist without implying a new mechanic. The warning is quiet, scoped, reversible, and derived in memory from existing route-card state. It did not become a global meter, a timer, a severity system, a save field, an export schema, or a reward/risk rule.

## Source Contracts And Carry-Forward Decisions

- [District Heat Contract](../district-heat-contract.md) remains the District Heat authority.
- [Path Of Neon Roadmap](../path-of-neon-roadmap.md) names Stage 3.6 as the next District Heat live-decision handoff after the Stage 3.5 route-card prototype.
- [Archived Stage 3.4 Backlog](stage-3.4-backlog.md) records the warning copy, UI placement, no-persistence posture, no-export posture, and guard-rail decision.
- [Web UI Architecture](../web-ui-architecture.md) remains the feature/view-model ownership authority.
- [Save API](../save-api.md) and [Cloud Save Contract](../cloud-save-contract.md) remain the persistence boundary authorities.
- [Progression Pacing Roadmap](../progression-pacing-roadmap.md), [Content Pipeline Inventory](../content-pipeline-inventory.md), [Balance Budget Gates](../balance-budget-gates.md), and `npm run simulate` remain the balance/report authorities.

## Scope

- Reopen [District Heat Contract](../district-heat-contract.md) only enough to approve the Stage 3.5 route-card allowlist and display condition.
- Amend `tests/web/displayTerms.test.ts` with an explicit allowlist for the named owner files instead of removing the future-term guard.
- Add a non-persistent route-card warning data shape only if the UI needs structured view-model data.
- Render the warning only in `web/features/mapIdle/panels.tsx`.
- Prefer existing selected/farmable/offline-farm route-card state as the first display condition. Do not add route history, heat accumulation, acknowledgement state, or player-configurable warning settings.
- Keep the copy compact and secondary: `Attention rising`, the approved body copy, and `Informational only.`
- Run browser smoke because Stage 3.5 changes visible web UI.

## Non-Goals

- No persisted District Heat or district-attention field.
- No `SAVE_DATA_VERSION` bump, migration, browser storage key, save diagnostics field, import/export save normalization, or cloud envelope field.
- No compact JSON/CSV, tactic JSON/CSV, or full-debug JSON warning field.
- No heat reward bonus, heat reward penalty, route-risk modifier, enemy-pressure modifier, boss-gate modifier, assignment modifier, offline reward modifier, or offline farm recommendation scoring change.
- No global meter, top-bar badge, district header badge, offline preview modifier, modal, onboarding copy, warning acknowledgement, severity color, heat band, projected heat value, timer, or number.
- No broad economy retune, new district, augment loadout, network operation, countermeasure economy, AI raid, or hostile Intrusion work.

## Exit Criteria

- The District Heat contract explicitly allows the Stage 3.5 route-card warning surface and no other live surface.
- `tests/web/displayTerms.test.ts` has a narrow owner-file allowlist for approved Stage 3.5 terms and still blocks report-only heat terms elsewhere.
- The route-card warning is non-persistent, non-punitive, compact, and visibly secondary.
- Tests prove save/cloud/export/reward/risk/offline boundaries did not move.
- Browser smoke is recorded for desktop and narrow mobile route-card views.
- Active docs point to Stage 3.6 as the current District Heat live-decision handoff.

## Epic Summary

| Slice | Epic | Title | Status |
| --- | --- | --- | --- |
| 101.1 | 101 | Contract Reopen And Allowlist Preflight | Complete |
| 101.2 | 101 | Non-Persistent Warning View Model | Complete |
| 101.3 | 101 | Route-Card Warning UI | Complete |
| 101.4 | 101 | Boundary Tests And Export Proof | Complete |
| 101.5 | 101 | Browser Smoke And UX Polish | Complete |
| 101.6 | 101 | Release Hardening And Archive Readiness | Complete |

## Slice 101.1: Contract Reopen And Allowlist Preflight

Approve the exact live warning surface before adding player-facing copy.

### Tasks

- Review [Archived Stage 3.4 Backlog](stage-3.4-backlog.md), [District Heat Contract](../district-heat-contract.md), [Path Of Neon Roadmap](../path-of-neon-roadmap.md), [Web UI Architecture](../web-ui-architecture.md), [Save API](../save-api.md), [Cloud Save Contract](../cloud-save-contract.md), and `tests/web/displayTerms.test.ts`.
- Update [District Heat Contract](../district-heat-contract.md) with the Stage 3.5 route-card warning allowlist.
- Decide the exact display condition for the prototype. Default to selected or offline-farm route-card state already available in the map/idle view model.
- Name owner files for any allowed live warning terms.
- Keep report-only field names such as `District Heat`, `districtHeatProjection`, `projectedHeat`, and `heatBand` blocked from live web source.

### Acceptance

- The contract allows only the Stage 3.5 route-card warning surface.
- The display condition does not require persisted route history or live heat accumulation.
- The display-term guard has a clear implementation plan before UI work starts.

### Implementation Notes

- Reviewed the Stage 3.4 archive, District Heat contract, Path Of Neon roadmap, web UI ownership docs, save/cloud contracts, and current `tests/web/displayTerms.test.ts` guard.
- Reopened [District Heat Contract](../district-heat-contract.md) only for the Stage 3.5 route-card warning surface.
- Approved owner files: `web/features/mapIdle/panels.tsx` for the rendered note, plus `web/state/viewModels/map.ts` and `web/state/viewModels/mapTypes.ts` only if Slice 101.2 chooses structured view-model data.
- Chose the display condition: show the warning only on the selected offline farm route card while it remains farmable, using existing `isSelectedOfflineFarmStage` and `canSelectOfflineFarm` view state. No persisted route history, heat accumulation, acknowledgement state, or player-configurable warning setting is needed.
- Approved route-card copy remains `Attention rising`, `Repeated runs are drawing district attention. Rewards, enemy pressure, and offline gains are unchanged.`, and `Informational only.`
- Guard plan for Slice 101.2/101.3: amend `tests/web/displayTerms.test.ts` with a narrow allowlist for the approved owner files and copy terms. If structured view-model data is added, allow only the `attentionWarning` identifier in the approved owner files. Keep `District Heat`, report-only heat field names, `districtAttention`, `district-attention`, and `districtAttentionWarning` blocked from live web source.
- Slice 101.1 made no runtime, save, cloud, export, reward, route-risk, enemy-pressure, offline reward, or web UI behavior changes.

### Verification

- Passed: `npm test -- tests/web/displayTerms.test.ts tests/docs/markdownLinks.test.ts`
- Passed: `git diff --check`

## Slice 101.2: Non-Persistent Warning View Model

Add the smallest in-memory route-card warning shape needed by the UI.

### Tasks

- Add structured warning data to `web/state/viewModels/mapTypes.ts` only if the route-card component should not inline the copy.
- Add the derivation in `web/state/viewModels/map.ts` using existing selected, cleared, farmable, or selected-offline-farm route-card state.
- Keep warning data out of core save data, cloud save data, browser storage, simulator output, and stable exports.
- Prefer a boolean or compact object that carries only approved copy strings and no heat score, band, decay, gain reason, or acknowledgement state.

### Acceptance

- Warning derivation is deterministic, in-memory, and sourced from existing map/idle state.
- No core save, cloud, export, simulator, reward, route-risk, enemy-pressure, or offline reward code changes are needed.
- Existing route-card state remains readable and testable.

### Implementation Notes

- Added `RouteAttentionWarningView` to `web/state/viewModels/mapTypes.ts` and an `attentionWarning` field on each `StageOptionView`.
- Added the approved warning copy in `web/state/viewModels/map.ts`: `Attention rising`, `Repeated runs are drawing district attention. Rewards, enemy pressure, and offline gains are unchanged.`, and `Informational only.`
- Derived the warning only when `isSelectedOfflineFarmStage` and `canSelectOfflineFarm` are both true, so the data appears only for the selected offline farm route card while it remains farmable.
- Amended `tests/web/displayTerms.test.ts` with a narrow allowlist for the approved copy and `attentionWarning` identifier in `web/state/viewModels/map.ts` and `web/state/viewModels/mapTypes.ts`. The guard still blocks `District Heat`, report-only heat field names, `districtAttention`, `district-attention`, and `districtAttentionWarning` in live web source.
- Extended `tests/web/webWorkflowBaselines.test.ts` to assert the selected offline farm route receives the warning and the current selected route does not.
- Slice 101.2 did not render the warning in the UI and did not change core save, cloud, browser storage, simulator output, stable exports, rewards, route risk, enemy pressure, or offline reward logic.

### Verification

- Passed: `npm run typecheck`
- Passed: `npm test -- tests/web/webWorkflowBaselines.test.ts tests/web/displayTerms.test.ts tests/save/saveSchema.factory.test.ts tests/save/cloudSaveContract.test.ts tests/docs/markdownLinks.test.ts`
- Passed: `git diff --check`

## Slice 101.3: Route-Card Warning UI

Render the approved warning in the route list without changing gameplay.

### Tasks

- Update `web/features/mapIdle/panels.tsx` to render the compact warning only on allowed route cards.
- Use the approved label, body, and support text from the contract.
- Keep the warning visually secondary inside the existing route-card layout.
- Avoid severity colors, bars, numbers, timers, band labels, heat meters, and any wording that implies rewards, enemy pressure, route risk, boss difficulty, assignments, or offline returns changed.
- Preserve route-card responsiveness and avoid text overlap on mobile and desktop.

### Acceptance

- The warning appears only in the approved route-card surface.
- The UI reads as informational and does not look like an active penalty/reward mechanic.
- No unrelated map/idle layout refactor is mixed into the slice.

### Implementation Notes

- Rendered `stage.attentionWarning` inside `web/features/mapIdle/panels.tsx` as a compact `stage-attention-note` block below route rewards and above the farmability status chip.
- Kept the route-card copy sourced from the 101.2 view model instead of duplicating strings in the component.
- Styled the note in `web/styles/app.css` with restrained warm panel colors, 6px radius, no severity band, no heat meter, no number, no timer, and wrapping text for narrow cards.
- Extended `tests/web/displayTerms.test.ts` so the `attentionWarning` identifier is allowed in the route-card owner file while approved copy remains owned by the view model and report-only heat terms remain blocked.
- Extended `tests/web/responsivePanelSmoke.test.ts` to protect the route-card warning selector and static styling contract.
- Slice 101.3 did not change core save, cloud, browser storage, simulator output, stable exports, rewards, route risk, enemy pressure, or offline reward logic.

### Verification

- Passed: `npm run typecheck`
- Passed: `npm test -- tests/web/displayTerms.test.ts tests/web/responsivePanelSmoke.test.ts tests/web/webWorkflowBaselines.test.ts tests/docs/markdownLinks.test.ts`
- Passed: `npm run build`
- Passed: browser smoke for desktop route-card view.
- Passed: browser smoke for narrow mobile route-card view.
- Passed: `git diff --check`

## Slice 101.4: Boundary Tests And Export Proof

Prove the warning did not become a live heat mechanic or durable schema.

### Tasks

- Update `tests/web/displayTerms.test.ts` with a narrow allowlist for approved Stage 3.5 owner files and keep all report-only heat field names blocked.
- Add or update tests proving saves and cloud payloads do not include District Heat or district-attention fields.
- Re-run compact JSON/CSV and tactic export checks to confirm stable exports remain warning-free.
- Re-run offline reward tests to confirm rewards and offline gains are unchanged.
- Re-run balance report tests to confirm report-only `districtHeatProjection` and `districtHeatPromotionDecision` remain author-facing.

### Acceptance

- Allowed live warning copy is scoped to named web files only.
- Save/cloud/export/report boundaries remain explicit and verified.
- Rewards, route risk, enemy pressure, offline gains, and simulator balance outputs are unchanged except for any expected doc/test wording.

### Implementation Notes

- Added `tests/helpers/districtAttentionBoundary.ts` as the shared durable-boundary token list for report-only heat fields and Stage 3.5 warning copy.
- Extended `tests/web/displayTerms.test.ts` to use the shared token list, with an explicit owner-file allowlist for `district attention`, `Attention rising`, the approved body prefix, `Informational only.`, and the `attentionWarning` view-model identifier.
- Strengthened `tests/save/saveSchema.factory.test.ts` and `tests/save/cloudSaveContract.test.ts` so current saves, serialized saves, cloud envelopes, and raw cloud save payloads reject both report-only heat fields and route-card warning terms.
- Strengthened `tests/tools/balanceReport.test.ts` so compact balance JSON/CSV exports and tactic JSON/CSV exports reject the same durable-boundary tokens while the full report keeps `districtHeatProjection` and `districtHeatPromotionDecision` author-facing.
- Ran the four simulator export modes and checked the generated compact/tactic export files for District Heat, district-attention, and warning-copy tokens with no matches.
- Slice 101.4 did not change gameplay, view-model derivation, UI layout, save schema, cloud schema, reward math, route risk, enemy pressure, offline rewards, or simulator report shape.

### Verification

- Passed: `npm test -- tests/web/displayTerms.test.ts tests/save/saveSchema.factory.test.ts tests/save/cloudSaveContract.test.ts tests/offline/offlineRewards.test.ts tests/tools/balanceReport.test.ts tests/docs/markdownLinks.test.ts`
- Passed: `npm run --silent simulate -- --export-json`
- Passed: `npm run --silent simulate -- --csv`
- Passed: `npm run --silent simulate -- --tactics-json`
- Passed: `npm run --silent simulate -- --tactics-csv`
- Passed: compact/tactic export token scan for District Heat, district-attention, and warning-copy terms.
- Passed: `npm run typecheck`
- Passed: `git diff --check`

## Slice 101.5: Browser Smoke And UX Polish

Verify the visible warning behaves well in the running app.

### Tasks

- Run the local web app and open the map/idle route list.
- Capture desktop and narrow mobile smoke evidence for a route card with the warning.
- Confirm text does not overlap, clip, or resize route cards unexpectedly.
- Confirm the warning is not present in headers, top bars, offline totals, save diagnostics, modals, or unrelated panels.
- Polish spacing and responsive behavior only within the route-card surface.

### Acceptance

- Browser smoke is recorded for desktop and mobile.
- The warning is compact, readable, and visually secondary.
- No unrelated UI surfaces gain warning copy.

### Implementation Notes

- Ran the local Vite app on `http://127.0.0.1:5173/` and drove the real post-victory farm-target route-card state in headless Chrome.
- Captured route-card evidence for desktop and narrow mobile at `/private/tmp/path-neon-1015-desktop-route-card.png` and `/private/tmp/path-neon-1015-mobile-route-card.png`.
- Confirmed exactly one `.stage-attention-note` appears in both viewports, on `Greenline Route 1` with the `Farm target` status.
- Confirmed the warning copy has no width or height overflow in desktop or narrow mobile card views.
- Confirmed the warning text is absent from `.stage-header`, `.resource-row`, `.offline-farm-panel`, `.offline-summary`, `.battle-summary`, `.status-pressure-list`, `.save-tools`, `.save-diagnostics-panel`, `.save-status`, and `.upgrade-status`.
- No CSS polish was needed; the existing route-card surface stayed compact, readable, and secondary.
- Slice 101.5 did not change gameplay, save/cloud/export boundaries, route risk, enemy pressure, offline rewards, or simulator output.

### Verification

- Passed: `npm run dev -- --port 5173`
- Passed: browser smoke for desktop route-card view.
- Passed: browser smoke for narrow mobile route-card view.
- Passed: unrelated-surface warning text scan.
- Passed: `npm run build`
- Passed: `git diff --check`

## Slice 101.6: Release Hardening And Archive Readiness

Close Stage 3.5 only after docs, tests, reports, and browser smoke agree.

### Tasks

- Update active docs with the final Stage 3.5 behavior and next Stage 3.6 live-decision handoff.
- Run the release-readiness command set for a visible UI warning.
- Record browser smoke status and any residual risks.
- Archive `docs/stage-3.5-backlog.md` only after the stage is complete.

### Acceptance

- Stage 3.5 is ready to archive with all slices complete.
- Active docs clearly say whether the route-card warning shipped, stayed prototype-only, or was deferred.
- The next work is a Stage 3.6 District Heat live decision, not reward/risk/persistence behavior slipped into Stage 3.5.

### Implementation Notes

- Updated active roadmap, current-system, contract, save, cloud, and web UI docs to state that Stage 3.5 shipped a warning-only route-card note.
- Kept the Stage 3.6 handoff explicit: decide whether District Heat stays warning-only or advances through a dedicated live-heat contract.
- Re-ran the release-readiness command set for the visible warning and compact/tactic export boundaries.
- Re-ran desktop and narrow-mobile browser smoke against the route-card warning.
- Archived this backlog after all Epic 101 slices were complete.
- Slice 101.6 did not change gameplay, UI behavior, save/cloud/export schemas, reward math, route risk, enemy pressure, offline rewards, or simulator output.

### Verification

- Passed: `npm run typecheck`
- Passed: `npm test`
- Passed: `npm run build`
- Passed: `npm run simulate`
- Passed: `npm run --silent simulate -- --export-json`
- Passed: `npm run --silent simulate -- --csv`
- Passed: `npm run --silent simulate -- --tactics-json`
- Passed: `npm run --silent simulate -- --tactics-csv`
- Passed: browser smoke for desktop and narrow mobile route-card views.
- Passed: `git diff --check`
