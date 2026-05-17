# Stage 3.4 Backlog: District Heat Warning Contract

## Current Status

Stage 3.4 is complete and archived after [Archived Stage 3.3 Backlog](stage-3.3-backlog.md). Stage 3.3 resolved the current offline parity and visible Black Iron debt blockers, reran the District Heat promotion decision, and kept the current runtime report-only. Stage 3.4 turns that handoff into a bounded non-punitive warning contract before any player-facing heat reward, route-risk pressure, persisted heat state, compact export field, tactic export field, save/cloud field, or live web UI behavior ships. Slice 100.1 completed the preflight evidence pass, Slice 100.2 selected neutral copy scope plus future route-card placement, Slice 100.3 selected no-persistence/no-export warning boundaries, Slice 100.4 selected stronger report-only guard rails, and Slice 100.5 completed release hardening; none of those slices made gameplay, save, export, cloud, or web UI changes.

This stage owns **Epic 100: District Heat Warning Contract**. It should write the exact player-facing promise and boundary tests for a future warning, then choose the next safe implementation step.

Do not start Stage 3.4 by adding a live heat meter or reward modifier. The useful next move is to make the warning boring, reversible, and impossible to confuse with punitive heat.

## Review Findings

The Stage 3.4 plan starts from the current Stage 3.3 closure evidence:

- District Heat remains `report_only`: `npm run simulate` and full debug JSON expose `districtHeatProjection` and `districtHeatPromotionDecision`, while compact JSON/CSV exports, tactic exports, saves, cloud envelopes, live rewards, and live web UI stay heat-free.
- Current recommended farm routes are all offline/active `acceptable` after the target-derived offline reward formula.
- The visible Black Iron debt row is resolved; `black_iron_foundry_4` now clears inside its elite target.
- All current District Heat promotion gates pass, but passing gates do not authorize live heat rewards, route-risk pressure, or persisted heat state by themselves.
- The next District Heat step should be a non-punitive warning contract that defines copy scope, UI placement, save posture, export posture, report relationship, and verification before any player-facing heat copy appears.

## Stage Theme

Define the smallest player-facing District Heat warning promise without changing gameplay.

Stage 3.4 should decide what a warning is allowed to say, where it may appear later, what it must not imply, and which tests prevent report-only heat terms from leaking into live UI before implementation. The warning should explain attention or pressure only as a non-punitive heads-up until a later milestone separately approves reward, risk, or persistence behavior.

## Source Contracts And Carry-Forward Decisions

- [District Heat Contract](../district-heat-contract.md) remains the District Heat authority.
- [Progression Pacing Roadmap](../progression-pacing-roadmap.md) remains the pacing formula authority.
- [Content Pipeline Inventory](../content-pipeline-inventory.md), [Balance Budget Gates](../balance-budget-gates.md), configured `balanceTargets`, and `npm run simulate` remain the known-debt authority.
- [Save API](../save-api.md), [Cloud Save Contract](../cloud-save-contract.md), [Web UI Architecture](../web-ui-architecture.md), and `tests/web/displayTerms.test.ts` remain boundary guards for save/cloud/web exposure.
- Stage 3.3 keep decisions still apply until this stage explicitly changes them: no heat save field, no heat cloud envelope field, no compact export heat fields, no tactic export heat fields, no heat reward modifier, no route-risk modifier, and no live heat UI/copy.

## Scope

- Review current report-only heat projection, promotion decision, offline parity evidence, known-debt evidence, and display-term guards.
- Define the warning's copy scope: allowed player-facing vocabulary, forbidden claims, and relationship to report-only `projectedHeat` and `heatBand` terms.
- Decide the warning's future UI placement: route card, offline preview, district/map detail, report-only tooling, or no live UI yet.
- Decide save, cloud, compact export, tactic export, and full debug JSON posture for a warning.
- Decide whether Stage 3.4 should end with docs-only guard rails, a tiny non-persistent player-facing warning prototype plan, or a follow-up implementation slice.
- Keep the current live runtime heat-free unless a slice explicitly approves a tiny non-persistent warning prototype and adds focused tests.

## Non-Goals

- No persisted District Heat field, save-version bump, cloud-save envelope change, browser storage migration, or heat import/export normalization.
- No heat reward bonus, heat reward penalty, route-risk modifier, enemy-pressure modifier, boss-gate modifier, assignment modifier, or offline farming heat modifier.
- No player-facing heat meter, route badge, warning copy, tooltip, or onboarding text before the contract names the exact allowed surface and tests.
- No compact JSON/CSV or tactic export schema bump unless a slice explicitly decides warning fields belong in stable exports.
- No broad economy retune, new district, roster expansion, augment loadout, protocol deck, network operation, AI raid, or countermeasure economy implementation.

## Exit Criteria

- A written District Heat warning contract defines allowed copy, forbidden claims, UI placement, save posture, export posture, report relationship, and verification.
- Active docs point to the Stage 3.4 decision and the next implementation step.
- Save, cloud, compact export, tactic export, and live web UI boundaries remain explicit.
- `tests/web/displayTerms.test.ts` still protects future-only heat terms unless a slice deliberately amends the guard for a named live warning surface.
- Verification commands and skipped browser smoke, if any, are recorded before archive.

## Epic Summary

| Slice | Epic | Title | Status |
| --- | --- | --- | --- |
| 100.1 | 100 | Warning Contract Preflight | Complete |
| 100.2 | 100 | Copy Scope And UI Placement Decision | Complete |
| 100.3 | 100 | Save Export And Report Boundary Decision | Complete |
| 100.4 | 100 | Warning Prototype Decision Or Guard Rails | Complete |
| 100.5 | 100 | Release Hardening And Archive Readiness | Complete |

## Slice 100.1: Warning Contract Preflight

Confirm the current boundaries before drafting player-facing warning language.

### Tasks

- Review [Archived Stage 3.3 Backlog](stage-3.3-backlog.md), [District Heat Contract](../district-heat-contract.md), [Progression Pacing Roadmap](../progression-pacing-roadmap.md), [Content Pipeline Inventory](../content-pipeline-inventory.md), [Save API](../save-api.md), [Cloud Save Contract](../cloud-save-contract.md), and [Web UI Architecture](../web-ui-architecture.md).
- Run `npm run simulate` and confirm report-only `districtHeatProjection` plus `districtHeatPromotionDecision` still exist only in the default report and full debug JSON.
- Confirm compact JSON/CSV exports, tactic exports, save data, cloud envelopes, browser storage, and live web source remain heat-free.
- Re-run the stale live-web term guard for District Heat copy and record any intentional author-facing exceptions.

### Acceptance

- The preflight records the current report-only heat surfaces and forbidden live surfaces.
- The stage confirms it is warning-contract work, not a reward/risk/persistence implementation.
- No runtime, save, export, or web UI changes are mixed into this preflight slice unless they are documentation-only corrections.

### Implementation Notes

- Reviewed the Stage 3.3 archive, District Heat contract, pacing roadmap, content inventory, save/cloud contracts, and web UI architecture boundaries.
- `npm run simulate` still prints author-facing `District Heat Projection` rows for all five current districts:

| District | Route | Band | Projected heat |
| --- | --- | --- | ---: |
| Greenline Approach | `greenline_approach_8` | `lockdown` | `100` |
| Veil District | `veil_district_5` | `lockdown` | `100` |
| Black Iron Foundry | `black_iron_foundry_6` | `hot` | `71.25` |
| Lotus Clinic | `lotus_clinic_6` | `hot` | `78.75` |
| Redline Outpost | `redline_outpost_6` | `lockdown` | `100` |

- Full debug JSON still exposes one `districtHeatProjection` object per `regionBalances` entry and a top-level `districtHeatPromotionDecision`.
- The promotion decision remains `report_only`. Current gates are all `pass`: `report_projection`, `offline_parity`, `redline_budget`, `known_debt`, and `save_ui_export_boundaries`.
- Current promotion boundaries remain unchanged: save `no_persistence`, cloud `no_heat_fields`, web UI `no_player_facing_heat`, compact export `no_heat_fields`, tactic export `no_heat_fields`, and live rewards `unchanged`.
- Compact authoring JSON remains schema version `3` and contains no heat keys. Tactic comparison JSON remains schema version `4` and contains no heat keys.
- Stage CSV and tactic CSV contain no `districtHeat`, `projectedHeat`, `heatBand`, or related heat columns.
- Live `web/` source has no `District Heat`, `districtHeat`, `districtHeatProjection`, `districtHeatPromotionDecision`, `projectedHeat`, or `heatBand` matches.
- Current save/browser storage owner files checked clean for those heat state keys: `core/save/saveTypes.ts`, `core/save/saveSchema.ts`, `core/save/migrations.ts`, and `web/state/saveStorage.ts`.
- The only intentional heat terminology remains in docs, tests, and author-facing balance/report code. Slice 100.1 did not add runtime behavior, save fields, export fields, cloud fields, or web UI copy.
- The promotion decision's author-facing summary still describes the Stage 3.3 handoff, while its `nextAction` already names the Stage 3.4 warning contract. That wording is acceptable preflight evidence for Slice 100.1 and should be finalized with the copy/report posture in Slice 100.2 or Slice 100.4.

### Verification

- Passed: `npm run simulate`
- Passed: full debug JSON boundary probe over `npm run --silent simulate -- --json`
- Passed: compact/tactic export heat-key probe over `npm run --silent simulate -- --export-json` and `npm run --silent simulate -- --tactics-json`
- Passed: CSV heat-column probe over `npm run --silent simulate -- --csv` and `npm run --silent simulate -- --tactics-csv`
- Passed: live web source stale-term scan for `District Heat`, `districtHeat`, `districtHeatProjection`, `districtHeatPromotionDecision`, `projectedHeat`, and `heatBand`
- Passed: save/browser storage owner-file heat-key scan
- Passed: `npm test -- tests/web/displayTerms.test.ts tests/save/saveSchema.factory.test.ts tests/save/cloudSaveContract.test.ts tests/docs/markdownLinks.test.ts`
- Passed: `git diff --check`

## Slice 100.2: Copy Scope And UI Placement Decision

Decide what the warning is allowed to say and where it may appear later.

### Tasks

- Draft allowed copy language for a non-punitive warning that does not promise bonuses, penalties, enemy pressure, or persisted heat.
- Name forbidden player-facing claims, including any implication that heat already changes rewards, route risk, boss difficulty, assignments, or offline returns.
- Choose the future UI placement category: route card, offline preview, district/map detail, report-only tooling, or no live UI yet.
- Decide whether live web source may contain any heat terms after this stage, and if so, list the exact owner files and test changes required.

### Acceptance

- The contract names the approved warning vocabulary and forbidden vocabulary.
- The contract names the allowed UI placement or explicitly keeps warning copy out of live UI.
- The decision keeps warning copy non-punitive and reversible.

### Implementation Notes

- Decision: Slice 100.2 is contract-only. It does not add warning copy to live web source, does not amend `tests/web/displayTerms.test.ts`, and does not relax the existing future-only mechanic term guard.
- Approved future warning concept: use neutral **district attention** language rather than the report/internal **District Heat** label in player-facing copy.
- Approved future compact label: `Attention rising`.
- Approved future body copy: `Repeated runs are drawing district attention. Rewards, enemy pressure, and offline gains are unchanged.`
- Approved future supporting copy: `Informational only.`
- Allowed vocabulary for a later warning prototype: `district attention`, `attention rising`, `repeated runs`, `route activity`, `informational only`, and explicit unchanged-outcome text.
- Forbidden player-facing vocabulary without a later contract amendment: `District Heat`, `heat`, `projectedHeat`, `heatBand`, `cool`, `watched`, `hot`, `lockdown`, `risk`, `danger`, `penalty`, `bonus`, `multiplier`, `cooldown`, `decay`, `threat level`, or any copy that implies current rewards, enemy pressure, boss difficulty, assignments, or offline returns change.
- Future UI placement category: a compact route-card note in the district route list, scoped to `web/features/mapIdle/panels.tsx`. If the warning later needs view data, the owner path is `web/state/viewModels/map.ts` plus `web/state/viewModels/mapTypes.ts`.
- Placement rules: show the note only on a route card that is currently selected, farmable, or recommended for offline farming; do not add a global meter, top-bar badge, modal, onboarding panel, district header, offline summary total, offline reward preview modifier, or save diagnostics field.
- The route-card warning must not use severity colors, bars, numbers, timers, or band labels that make the warning feel like an active mechanic. Use the existing compact route-card information density and keep it visually secondary.
- Future implementation tests should keep `tests/web/displayTerms.test.ts` banning the current future-only tokens. If a later slice wants to expose `District Heat` or report field names in live source, that slice must amend the test with an explicit allowlist and update this contract first.

### Verification

- Passed: `npm test -- tests/web/displayTerms.test.ts tests/docs/markdownLinks.test.ts`
- Passed: live web source scan for `District Heat`, `districtHeat`, `districtHeatProjection`, `districtHeatPromotionDecision`, `projectedHeat`, and `heatBand`
- Passed: `git diff --check`

## Slice 100.3: Save Export And Report Boundary Decision

Decide how warning state relates to saves, exports, and author-facing report data.

### Tasks

- Decide save posture: no persistence, derived-only display, or a later dedicated save-version slice.
- Decide cloud posture: no envelope field, `rawSave` field, or cloud conflict behavior unless a later save slice is approved.
- Decide compact authoring export and tactic export posture for warning fields.
- Decide whether full debug JSON should gain any warning-oriented report field or keep existing `districtHeatProjection` and `districtHeatPromotionDecision` unchanged.
- Update save/cloud/export docs if the contract tightens or amends the current boundary.

### Acceptance

- The contract states whether the warning has any durable state. The expected Stage 3.4 default is no durable state.
- Compact JSON/CSV and tactic export schema posture is explicit.
- Any future save-version, cloud-contract, or export-schema work is named as a separate follow-up, not slipped into warning copy.

### Implementation Notes

- Decision: the Stage 3.4 warning has no durable state. A later warning prototype may be derived in memory for display, but it must not persist player, route, district, projected, or acknowledged warning state.
- Save posture: no `SaveData` field, no `SAVE_DATA_VERSION` bump beyond `13`, no migration, no browser storage key, no import/export save JSON normalization, and no save diagnostics field for the warning.
- Cloud posture: no cloud envelope field, no `rawSave` field, no conflict-resolution metadata, and no cloud adapter behavior for District Heat or district attention. A future persisted mechanic needs a dedicated save-version and cloud-contract slice before cloud stores accept heat or warning state.
- Compact authoring export posture: keep schema version `3`; do not add `districtHeatProjection`, `districtHeatPromotionDecision`, `projectedHeat`, `heatBand`, `districtAttention`, warning copy, warning booleans, or warning placement fields.
- Tactic comparison export posture: keep schema version `4`; do not add heat, warning, attention, route-risk, reward-pressure, or district-attention fields.
- CSV posture: stage CSV and tactic CSV stay heat-free and warning-free.
- Full debug JSON posture: keep the existing report-only `districtHeatProjection` and `districtHeatPromotionDecision` fields unchanged. Slice 100.3 does not add warning-oriented fields such as `districtAttentionWarning`, copy strings, placement metadata, acknowledgement state, or display booleans.
- Report relationship: author-facing heat bands may continue to explain simulator evidence, but player-facing warning copy must not use those band names or expose report field names.
- Any future need for durable state, stable export fields, cloud conflict behavior, warning acknowledgement, or a changed debug JSON contract is a separate follow-up slice with focused tests.

### Verification

- Passed: `npm test -- tests/save/saveSchema.factory.test.ts tests/save/cloudSaveContract.test.ts tests/docs/markdownLinks.test.ts`
- Passed: compact export heat/warning-key probe over `npm run --silent simulate -- --export-json`
- Passed: tactic export heat/warning-key probe over `npm run --silent simulate -- --tactics-json`
- Passed: CSV heat/warning-column probe over `npm run --silent simulate -- --csv` and `npm run --silent simulate -- --tactics-csv`
- Passed: `git diff --check`

## Slice 100.4: Warning Prototype Decision Or Guard Rails

Choose whether Stage 3.4 hands off a tiny warning prototype or strengthens no-live-UI guard rails.

### Tasks

- Choose one posture:
  - docs-only warning contract with no runtime implementation;
  - tiny non-persistent player-facing warning prototype in a named surface;
  - stronger report-only guard rails that continue blocking live warning copy.
- If a prototype is chosen, name owner files, test suites, copy strings, and the exact condition that shows the warning.
- If guard rails are chosen, strengthen docs/tests so future heat copy cannot appear in web source without amending the contract.
- Confirm the choice still excludes rewards, route risk, enemy pressure, save state, cloud state, and stable export changes.

### Acceptance

- Stage 3.4 has a precise next-step decision, not a vague "add heat UI later" handoff.
- Any prototype path is non-persistent, non-punitive, and covered by focused tests.
- Any guard-rail path keeps District Heat author-facing only until the next explicit implementation slice.

### Implementation Notes

- Decision: choose the stronger report-only guard-rail path. Stage 3.4 does not hand off a runtime warning prototype.
- District Heat remains author-facing only in `npm run simulate` and full debug JSON until a later implementation slice amends this contract.
- Expanded `tests/web/displayTerms.test.ts` so live `web/` source must not contain the approved future copy tokens `district attention`, `District attention`, or `Attention rising`.
- The same guard also blocks likely implementation identifiers before the contract is reopened: `districtAttention`, `district-attention`, `districtAttentionWarning`, and `attentionWarning`.
- A later tiny route-card prototype is still allowed only after a dedicated slice updates this contract, names owner files, amends the web-source guard with an explicit allowlist, and adds focused tests for non-persistence and unchanged rewards/enemy pressure/offline gains.
- The chosen guard-rail path continues excluding rewards, route risk, enemy pressure, save state, cloud state, stable exports, warning acknowledgements, and full-debug warning fields.

### Verification

- Passed: `npm test -- tests/web/displayTerms.test.ts tests/docs/markdownLinks.test.ts`
- Passed: live web source scan through `tests/web/displayTerms.test.ts` for existing heat terms and the new future warning copy/id tokens.
- Passed: `git diff --check`

## Slice 100.5: Release Hardening And Archive Readiness

Close the contract stage only after docs, tests, and boundaries agree.

### Tasks

- Update active docs with the Stage 3.4 decision, next implementation step, and any remaining blocked surfaces.
- Run the release-readiness command set appropriate to the final posture.
- Record browser smoke status. Browser smoke is required if Stage 3.4 adds or changes visible web UI; otherwise record that it was skipped because the stage was docs/report-only.
- Archive `docs/stage-3.4-backlog.md` only after the stage is complete.

### Acceptance

- Stage 3.4 is ready to archive with all slices complete.
- Active docs clearly say whether the next work is warning implementation, stronger report-only heat tooling, or another prerequisite.
- No stale active backlog link points to a completed stage after archive.

### Implementation Notes

- Updated active docs with the final Stage 3.4 decision: stronger report-only guard rails won, so no player-facing warning copy, save field, cloud field, compact export field, tactic export field, route-risk modifier, reward modifier, or live web UI changed in this stage.
- Refreshed the author-facing `districtHeatPromotionDecision` summary and `nextAction` so simulator output no longer says Stage 3.4 still needs preparation. The next step is now a dedicated route-card warning prototype slice, if player-facing copy is desired.
- Reconfirmed the guard-rail handoff: a future route-card warning prototype must update [District Heat Contract](../district-heat-contract.md), name owner files, amend `tests/web/displayTerms.test.ts` with an explicit allowlist, and prove rewards, route risk, saves, cloud payloads, compact exports, tactic exports, and offline gains remain unchanged.
- Archived this backlog to `docs/archive/stage-3.4-backlog.md` after updating active docs to point at the archived milestone.
- Browser smoke was skipped because Stage 3.4 made no visible web UI changes.

### Verification

- Passed: `npm run typecheck`
- Passed: `npm test`
- Passed: `npm run build`
- Passed: `npm run simulate`
- Passed: `npm run --silent simulate -- --export-json`
- Passed: `npm run --silent simulate -- --csv`
- Passed: `npm run --silent simulate -- --tactics-json`
- Passed: `npm run --silent simulate -- --tactics-csv`
- Passed after report wording refresh: `npm test -- tests/tools/balanceReport.test.ts tests/web/displayTerms.test.ts tests/docs/markdownLinks.test.ts`
- Passed: `git diff --check`
- Skipped: browser smoke, because Stage 3.4 stayed docs/report-only and changed no visible web UI.
