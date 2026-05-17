# Stage 3.3 Backlog: Offline Parity And Visible Debt Cleanup

## Current Status

Stage 3.3 is the active next milestone after [Archived Stage 3.2 Backlog](archive/stage-3.2-backlog.md). Stage 3.2 kept District Heat report-only because offline reward parity still has inversion risk and `black_iron_foundry_4` remains visible balance debt.

This stage owns **Epic 99: Offline Parity And Visible Debt Cleanup**. It should resolve or explicitly re-contract the remaining blockers before any player-facing District Heat UI, reward pressure, route-risk modifier, or offline-farming heat behavior.

Do not start Stage 3.3 by adding live heat rewards. The useful next move is to make offline farming and known debt boring, measured, and hard to accidentally hide.

## Review Findings

The Stage 3.3 plan starts from the current Stage 3.2 closure evidence:

- District Heat remains `report_only`: `npm run simulate` and full debug JSON expose `districtHeatProjection` and `districtHeatPromotionDecision`, while compact JSON/CSV exports, tactic exports, saves, cloud envelopes, live rewards, and live web UI stay heat-free.
- The live offline reward formula still uses the fixed `estimatedClearTimeSeconds: 10`, `minimumClearTimeSeconds: 5`, and `offlineEfficiency: 0.6` defaults.
- Four recommended farm routes remain offline/active `inversion`: `greenline_approach_8`, `black_iron_foundry_6`, `lotus_clinic_6`, and `redline_outpost_6`.
- `veil_district_5` remains near parity as `watch`, which is useful as a regression check when formula candidates change.
- Redline default clear-time, status-pressure, reward-curve, and boss-gate budget checks pass after Slice 98.5, but tactic comparison caution remains for `redline_outpost_7`.
- `black_iron_foundry_4` remains below its elite clear-time target and must not be masked by live District Heat pressure.

## Stage Theme

Clean up the last economy and tuning blockers that make live District Heat risky.

Stage 3.3 should answer whether offline farming can move away from the fixed 10s estimate without destabilizing saves, previews, reports, or progression pacing. It should also either tune `black_iron_foundry_4` or explicitly reclassify it with a current reason before the next heat promotion decision.

## Source Contracts And Carry-Forward Decisions

- [District Heat Contract](district-heat-contract.md) remains the District Heat authority.
- [Progression Pacing Roadmap](progression-pacing-roadmap.md) remains the pacing formula authority.
- [Content Pipeline Inventory](content-pipeline-inventory.md), [Balance Budget Gates](balance-budget-gates.md), configured `balanceTargets`, and `npm run simulate` remain the known-debt authority.
- [Save API](save-api.md), [Cloud Save Contract](cloud-save-contract.md), and `tests/web/displayTerms.test.ts` remain boundary guards for save/cloud/web exposure.
- Stage 3.2 keep decisions still apply until this stage explicitly changes them: no heat save field, no heat cloud envelope field, no live heat UI/copy, no compact export heat fields, no tactic export heat fields, and no heat reward modifier.

## Scope

- Re-baseline current offline parity, budget debt, tactic comparisons, and export boundaries after Stage 3.2 archival.
- Decide whether the live offline reward formula should use stage-specific simulated or target clear-time estimates, keep the fixed 10s estimate, or add an intermediate guard rail.
- If approved, update the offline reward path and offline preview semantics without changing save shape.
- Tune or explicitly reclassify `black_iron_foundry_4` so visible balance debt is no longer vague handoff text.
- Re-run the District Heat promotion decision after parity and Black Iron cleanup.
- Decide whether Stage 3.4 should remain report-only, open a non-punitive warning contract, or start a tiny player-facing heat slice.

## Non-Goals

- No persisted District Heat field, save-version bump, cloud-save envelope change, browser storage migration, or heat import/export normalization unless a slice explicitly reopens save posture.
- No player-facing heat meter, route heat badge, reward penalty, route-risk modifier, or live heat copy before parity and debt cleanup are complete and rechecked.
- No broad economy rebalance hidden inside the offline formula work.
- No new district, roster expansion, augment loadout, protocol deck, network operation, AI raid, or countermeasure economy implementation.
- No compact JSON/CSV or tactic export schema bump unless a slice explicitly decides parity or warning fields belong in stable exports.

## Exit Criteria

- Offline parity inversions are resolved, reduced to documented `watch` risk, or explicitly deferred with a current formula decision and tests.
- `black_iron_foundry_4` is tuned, target-reclassified, or carried forward with a named release rationale that active docs also record.
- District Heat promotion posture is rechecked after Stage 3.3 evidence.
- Save, cloud, compact export, tactic export, and live web UI boundaries remain explicit.
- Active docs point to the Stage 3.3 decision and the next implementation step.
- Verification commands and skipped browser smoke, if any, are recorded before archive.

## Epic Summary

| Slice | Epic | Title | Status |
| --- | --- | --- | --- |
| 99.1 | 99 | Parity And Debt Baseline | Complete |
| 99.2 | 99 | Offline Formula Decision | Complete |
| 99.3 | 99 | Offline Formula Implementation Or Guard Rails | Planned |
| 99.4 | 99 | Black Iron Visible Debt Cleanup | Planned |
| 99.5 | 99 | District Heat Re-Promotion And Warning Contract Decision | Planned |
| 99.6 | 99 | Release Hardening And Archive Readiness | Planned |

## Slice 99.1: Parity And Debt Baseline

Confirm the current evidence before changing formulas or tuning data.

### Tasks

- Run `npm run simulate`, `npm run --silent simulate -- --export-json`, `npm run --silent simulate -- --csv`, `npm run --silent simulate -- --tactics-json`, and `npm run --silent simulate -- --tactics-csv`.
- Compare current misses against [Content Pipeline Inventory](content-pipeline-inventory.md), [Balance Budget Gates](balance-budget-gates.md), [District Heat Contract](district-heat-contract.md), and [Progression Pacing Roadmap](progression-pacing-roadmap.md).
- Record the current offline parity rows and verify the known Stage 3.2 classifications still hold.
- Confirm no live heat, save heat, cloud heat, compact export heat, tactic export heat, or web heat copy appeared after Stage 3.2 closure.

### Acceptance

- The baseline identifies the exact offline parity and Black Iron work Stage 3.3 will address.
- The stage confirms it is parity/debt cleanup, not a live heat implementation.
- No runtime or data changes are mixed into this preflight slice unless they are documentation-only corrections.

### Implementation Notes

- Ran the baseline simulator and export commands without changing runtime code, static data, save schema, export schema, or live heat behavior.
- Confirmed the Stage 3.2 offline parity classifications still hold:

| Recommended farm | Offline/active ratio | Classification | Status |
| --- | ---: | --- | --- |
| `greenline_approach_8` | `1.51x` | `inversion` | `offline_faster` |
| `veil_district_5` | `0.97x` | `watch` | `near_parity` |
| `black_iron_foundry_6` | `2.70x` | `inversion` | `offline_faster` |
| `lotus_clinic_6` | `2.45x` | `inversion` | `offline_faster` |
| `redline_outpost_6` | `1.92x` | `inversion` | `offline_faster` |

- Confirmed the only current default budget miss remains `black_iron_foundry_4`: clear time `23.4s`, below the configured `25-65s` elite target.
- Confirmed `districtHeatPromotionDecision` remains `report_only`. Promotion gates are unchanged: `report_projection` pass, `offline_parity` blocker, `redline_budget` pass, `known_debt` watch, and `save_ui_export_boundaries` pass.
- Confirmed stable compact authoring export remains schema version `3` and contains no `districtHeatProjection`, `districtHeatPromotionDecision`, `projectedHeat`, or `heatBand` keys.
- Confirmed tactic comparison export remains schema version `4` and contains no heat keys. The Redline boss caution remains visible: `context_break` and `gatekeeper_burst` still turn `redline_outpost_7` from baseline `player_clear` into `enemy_hold` with `budgetShift: new_miss`.
- Slice 99.1 made no data or runtime changes. Stage 3.3 remains formula/report/tuning work, not a live heat implementation.

### Verification

- Passed: `npm run simulate`
- Passed: `npm run --silent simulate -- --export-json`
- Passed: `npm run --silent simulate -- --csv`
- Passed: `npm run --silent simulate -- --tactics-json`
- Passed: `npm run --silent simulate -- --tactics-csv`
- Passed: JSON/export boundary summary over full debug JSON, compact export JSON, and tactic JSON.
- Passed: `npm test -- tests/tools/balanceReport.test.ts tests/web/displayTerms.test.ts tests/save/saveSchema.factory.test.ts tests/save/cloudSaveContract.test.ts tests/docs/markdownLinks.test.ts`
- Passed: `git diff --check`

## Slice 99.2: Offline Formula Decision

Choose the smallest safe offline reward formula path.

### Tasks

- Compare fixed 10s, simulated clear-time, target clear-time, and stage-authored estimate options against current recommended farm routes.
- Decide how offline preview output should stay consistent with live offline rewards.
- Decide whether formula changes need new report-only fields, tests only, or a compact export schema decision.
- Record save posture: formula changes should not require a save-version bump unless persisted per-stage estimates or player choices are introduced.

### Acceptance

- Stage 3.3 has a written offline formula decision.
- The decision names owner files and tests before implementation.
- District Heat remains blocked from live reward/risk changes if parity remains unresolved.

### Implementation Notes

- Decision: implement a target-derived stage estimate in Slice 99.3. For the selected offline farm route, derive the clear estimate from the route's region `balanceTargets.clearTimeSeconds` band and the route's normal/elite classification, using the midpoint of the target band and the existing `minimumClearTimeSeconds` floor.
- Keep simulated clear-time evidence in reports, not in live save-load reward application. The simulator proves the parity direction, but the live offline path should not run balance-report simulation or depend on precomputed report output during save load.
- Defer stage-authored per-route estimates. They would add stage schema, validation, authoring-export, and data maintenance surface before the target-derived path has been tried.
- Keep fixed 10s only as a fallback for missing target evidence, not as the intended farm-route estimate after Slice 99.3.
- Offline preview must use the same helper as live offline reward application so the UI preview and save-load transaction cannot drift.
- No save-version bump, cloud-envelope change, browser storage migration, compact export schema bump, tactic export schema bump, or live heat field is approved by this decision.
- District Heat remains `report_only` until Slice 99.3 proves parity moved in the intended direction and Slice 99.4 resolves or reclassifies `black_iron_foundry_4`.

| Option | Current recommended-farm ratio evidence | Decision |
| --- | --- | --- |
| Keep fixed 10s estimate | `1.51x`, `0.97x`, `2.70x`, `2.45x`, `1.92x`; four `inversion` rows remain. | Reject as the Stage 3.3 target path because it leaves the blocker unchanged. |
| Simulated clear time | Approximately `0.60x` active for every current recommended farm because it uses the same clear duration as active play with `60%` offline efficiency. | Keep as report evidence only; do not make live save load depend on simulator output. |
| Target-band midpoint | `0.50x`, `0.56x`, `0.60x`, `0.43x`, `0.65x` for the current recommended farms. | Approve for Slice 99.3 implementation because it uses existing authored target bands and resolves current inversions without new data schema. |
| Stage-authored estimate | Can match the simulated path if every farm route gets a maintained estimate. | Defer until target-derived estimates prove insufficient. |

### Owner Files For 99.3

- `core/offline/offlineRewards.ts`: derive the selected farm route estimate and feed it into `calculateOfflineRewards` for apply and preview.
- `core/balance/targets.ts`: reuse or expose target-band selection logic for normal/elite farm routes if needed.
- `web/state/viewModels/offline.ts`: keep preview wired through `previewOfflineRewards`; update only if input data typing changes.
- `core/save/loadTransaction.ts`: verify save-load application still passes full static data needed by the target-derived helper.
- `tests/offline/offlineRewards.test.ts`: update the default formula guard from fixed 10s to target-derived estimates and prove preview/apply consistency.
- `tests/save/loadTransaction.test.ts` and `tests/web/offlineTimeTravel.test.ts`: cover save-load and browser offline reward behavior if the default reward totals change.
- `tests/tools/balanceReport.test.ts`: update parity expectations after 99.3 changes the report's live formula assumptions.

### Verification

- Passed: candidate comparison over full debug JSON plus compact export targets.
- Passed: `npm test -- tests/docs/markdownLinks.test.ts`
- Passed: `git diff --check`

## Slice 99.3: Offline Formula Implementation Or Guard Rails

Implement the approved formula path, or strengthen guard rails if the formula stays fixed.

### Tasks

- If a live formula change is approved, update `core/offline/offlineRewards.ts` and the matching offline preview path.
- Add focused tests for active/offline reward-rate expectations on the current recommended farm routes.
- Re-run balance reports and verify the parity classifications moved in the intended direction.
- Keep save data, cloud envelopes, compact exports, tactic exports, and live heat surfaces unchanged unless Slice 99.2 explicitly reopened them.
- If no live formula change is approved, add a stronger report/test guard that prevents the inversion risk from disappearing silently.

### Acceptance

- Offline formula behavior matches the Slice 99.2 decision.
- Current parity rows are either no longer inverted or are explicitly carried forward with updated evidence.
- Save/cloud/export/web heat boundaries still pass.

## Slice 99.4: Black Iron Visible Debt Cleanup

Tune or reclassify `black_iron_foundry_4` before live heat can add pressure.

### Tasks

- Review `black_iron_foundry_4` clear-time evidence, surrounding Black Iron route pacing, boss-gate assumptions, and tactic comparisons.
- Decide whether the route should be data-tuned, target-reclassified, or carried forward as intentional fast elite pacing.
- If tuning is approved, update the smallest useful data surface, likely `data/enemies.json`, `data/stages.json`, or `data/regions.json`.
- Preserve Black Iron boss-gate clarity and avoid broad power creep that erases earlier route pacing.
- Update [Content Pipeline Inventory](content-pipeline-inventory.md), [Balance Budget Gates](balance-budget-gates.md), and [District Heat Contract](district-heat-contract.md) with the new disposition.

### Acceptance

- `black_iron_foundry_4` has a current Stage 3.3 disposition.
- Any data tune keeps Black Iron progression and boss-gate evidence readable.
- District Heat promotion can no longer use this miss as vague blocker text.

## Slice 99.5: District Heat Re-Promotion And Warning Contract Decision

Re-run the promotion gates after parity and visible debt cleanup.

### Tasks

- Review Slice 99.1 through 99.4 evidence against [District Heat Contract](district-heat-contract.md).
- Re-run or update `districtHeatPromotionDecision` expectations if parity or known-debt gates changed.
- Choose one next posture:
  - keep District Heat report-only;
  - prepare a non-punitive player-facing warning contract;
  - prepare a tiny live heat slice with explicit save/UI/export/reward boundaries.
- If a warning contract is chosen, document copy scope, UI placement, save posture, export posture, and verification before any implementation.
- Keep live heat rewards and route-risk modifiers out of this slice unless every boundary is explicitly reopened.

### Acceptance

- Stage 3.3 has a clear next heat posture.
- The decision is reflected in active docs and report expectations.
- Deferred mechanic terms remain out of live UI unless this slice explicitly opens a player-facing UI task.

## Slice 99.6: Release Hardening And Archive Readiness

Close Stage 3.3 with full validation, docs cleanup, and a clear Stage 3.4 handoff.

### Tasks

- Run the verification baseline and capture any skipped command with a reason.
- Run stale-term scans for active docs/UI and confirm future-only mechanics remain absent from live web source unless explicitly shipped.
- Update [Current Implemented Systems](current-implemented-systems.md), [Progression Pacing Roadmap](progression-pacing-roadmap.md), [Content Pipeline Inventory](content-pipeline-inventory.md), [Balance Budget Gates](balance-budget-gates.md), and [District Heat Contract](district-heat-contract.md) with final Stage 3.3 decisions.
- Add Stage 3.3 closure notes to this backlog.
- Move this backlog to `docs/archive/stage-3.3-backlog.md` only after the milestone is complete.

### Acceptance

- Stage 3.3 decisions and verification are documented.
- Active docs point to the current District Heat posture and next implementation step.
- No active `docs/stage-3.3-backlog.md` remains after archive closure.
- The next implementation step is clear: remain report-only, open a warning contract, or start a tiny live heat slice.

## Verification Baseline

Use focused commands per slice, then close with:

```sh
npm run typecheck
npm test
npm run build
npm run simulate
npm run support-decision
git diff --check
```

For report/export work, also run:

```sh
npm run --silent simulate -- --export-json
npm run --silent simulate -- --csv
npm run --silent simulate -- --tactics-json
npm run --silent simulate -- --tactics-csv
```

Browser smoke is required only after visible UI or web-state changes. Until then, record browser smoke as skipped because Stage 3.3 starts as formula/report/tuning work.

## Closure Notes

- Stage 3.3 is not complete until Slices 99.1 through 99.6 are all complete.
- Archive target after completion: `docs/archive/stage-3.3-backlog.md`.
- The preferred next implementation path should be chosen by parity and visible debt evidence, not by District Heat theme pressure alone.
