# Stage 3.2 Backlog: Pacing Parity And Heat Readiness

## Current Status

Stage 3.2 is the active next milestone after [Archived Stage 3.1 Backlog](archive/stage-3.1-backlog.md). Stage 3.1 completed the District Heat contract and report-only projection, but it deliberately left live heat blocked until offline parity and Redline pacing debt are addressed.

This stage owns **Epic 98: Pacing Parity And Heat Readiness**. It should convert the Stage 3.1 blockers into measured report surfaces, decide whether the offline formula should change, handle or reclassify the Redline live-heat blockers, and then make a narrow promotion decision for District Heat.

Do not start Stage 3.2 by adding live District Heat. The safest next move is pacing evidence first, then a decision.

## Review Findings

The Stage 3.2 plan is based on the current simulator and active docs:

- Stage 3.1 report-only District Heat is visible in `npm run simulate` and full debug JSON, and Slice 98.6 now adds a report-only promotion decision. Compact JSON/CSV exports, saves, cloud saves, tactic exports, live rewards, and live web UI remain heat-free.
- The current simulator still reports `black_iron_foundry_4` as below its elite clear-time target.
- Slice 98.5 resolved the Redline live-heat blockers in the default simulator: Redline clear-time, status-pressure, reward-curve, and boss-gate checks now pass.
- The current report-only heat projection reaches `lockdown` for Greenline Approach, Veil District, and Redline Outpost during a one-hour recommended offline-farm window, so heat is sensitive to offline clear-count assumptions.
- The Stage 3.1 offline audit found offline farming can outperform active rewards on four of five recommended farm routes because current offline rewards use a fixed `estimatedClearTimeSeconds: 10`.
- Tactic comparison evidence is useful but not a blanket fix: after Slice 98.5, `context_break` and `gatekeeper_burst` still create `redline_outpost_7` enemy holds; `long_stabilization` remains the safer status-pressure benchmark.
- Slice 98.6 chose `report_only` as the promotion posture. Stage 3.3 should resolve offline parity and visible Black Iron debt first, or open a separate non-punitive warning contract before any live heat UI or reward behavior.

## Stage Theme

Make the next District Heat decision boring in the best way: measured, reversible, and gated by pacing evidence.

Stage 3.2 should answer whether the current offline economy and Redline tuning are stable enough for any player-facing heat mechanic. If they are not, it should leave District Heat report-only and hand off precise tuning work rather than shipping pressure on top of known debt.

## Source Contracts And Carry-Forward Decisions

- [District Heat Contract](district-heat-contract.md) remains the District Heat authority.
- [Progression Pacing Roadmap](progression-pacing-roadmap.md) remains the pacing model authority.
- [Content Pipeline Inventory](content-pipeline-inventory.md), [Balance Budget Gates](balance-budget-gates.md), configured `balanceTargets`, and `npm run simulate` remain the known-debt authority.
- [Cloud Save Contract](cloud-save-contract.md), [Save API](save-api.md), and `tests/web/displayTerms.test.ts` remain boundary guards for save/cloud/web exposure.
- Stage 3.1 keep decisions still apply: no heat save field, no heat cloud envelope field, no live heat UI/copy, and no compact export heat fields without an explicit schema decision.

## Scope

- Add or specify an Offline Parity Report that compares active rewards per hour against offline rewards per hour using simulated or target clear times.
- Decide whether the live offline reward formula should keep the fixed 10s estimate, use stage-specific authored estimates, or remain unchanged while report-only parity warnings mature.
- Triage Redline live-heat blockers with simulator and tactic comparison evidence.
- Retune or explicitly reclassify the smallest useful set of Redline blockers before live heat can modify rewards, risk, offline farming, or route pressure.
- Update the District Heat promotion decision after parity and Redline evidence are in.
- Keep active docs current so the next engineer can tell whether Stage 3.3 should be live heat, more pacing cleanup, or another report-only stage.

## Non-Goals

- No persisted District Heat field, save-version bump, cloud-save envelope change, browser storage migration, or heat import/export normalization unless a slice explicitly reopens save posture.
- No player-facing heat meter, route heat badge, reward penalty, or route-risk modifier until parity and Redline blockers are resolved or explicitly reclassified.
- No broad economy rebalance hidden inside heat readiness.
- No new district, roster expansion, augment loadout, protocol deck, network operation, AI raid, or countermeasure economy implementation.
- No compact JSON/CSV schema bump unless a slice decides parity or heat rows belong in stable authoring exports.

## Exit Criteria

- Offline parity is visible through a report, full debug JSON field, or documented no-code decision with owner files and tests.
- Stage 3.2 records a clear offline formula decision: keep fixed estimate, add stage-specific estimates, or defer live change with report-only guard rails.
- Redline live-heat blockers are tuned, reclassified, or explicitly carried forward with reasons.
- District Heat promotion posture is updated: remain report-only, prepare a non-punitive warning, or prepare a tiny live slice with save/UI/export boundaries.
- Active docs point to Stage 3.2 as the current planning milestone while Stage 3.1 remains archived.
- Verification commands and skipped browser smoke, if any, are recorded before archive.

## Epic Summary

| Slice | Epic | Title | Status |
| --- | --- | --- | --- |
| 98.1 | 98 | Pacing Baseline And Scope Lock | Complete |
| 98.2 | 98 | Offline Parity Report Surface | Complete |
| 98.3 | 98 | Offline Formula Decision And Guard Rails | Complete |
| 98.4 | 98 | Redline Live-Heat Blocker Triage | Complete |
| 98.5 | 98 | Targeted Redline And Status Pressure Tuning | Complete |
| 98.6 | 98 | District Heat Promotion Decision | Complete |
| 98.7 | 98 | Release Hardening And Archive Readiness | Planned |

## Slice 98.1: Pacing Baseline And Scope Lock

Confirm the current evidence before adding reports or tuning data.

### Tasks

- Run `npm run simulate`, `npm run --silent simulate -- --export-json`, `npm run --silent simulate -- --csv`, `npm run --silent simulate -- --tactics-json`, and `npm run --silent simulate -- --tactics-csv`.
- Compare current misses against [Content Pipeline Inventory](content-pipeline-inventory.md), [Balance Budget Gates](balance-budget-gates.md), and [District Heat Contract](district-heat-contract.md).
- Record whether any Stage 3.1 assumption changed before Stage 3.2 implementation begins.
- Confirm no live heat, save heat, cloud heat, compact export heat, or web heat copy sneaked in after Stage 3.1 closure.

### Acceptance

- The baseline identifies the exact blockers Stage 3.2 will address.
- The stage confirms it is still pacing/report/tuning work, not a live heat implementation.
- No runtime or data changes are mixed into this preflight slice unless they are documentation-only corrections.

### Implementation Notes

- Ran the default simulator, compact JSON export, stage CSV export, tactic JSON export, and tactic CSV export before touching runtime or data.
- The same known debt remains visible by stable ids: `black_iron_foundry_4` below its elite target; `redline_outpost_1`, `redline_outpost_3`, `redline_outpost_4`, and `redline_outpost_5` above their clear-time targets; and Redline status damage at `1077.06`, above the configured `1000` cap.
- District Heat remains report-only: the default simulator still prints `District Heat Projection`, while compact JSON, stage CSV, tactic JSON, and tactic CSV stay heat-free.
- Stage 3.1 assumptions are unchanged. No live heat, save heat, cloud heat, compact export heat, tactic export heat, or web heat copy was found after closure.
- Save/cloud/web boundary tests still pass, confirming Stage 3.2 starts from the intended contract posture.
- No runtime behavior, static data, save schema, export schema, web UI, or balance target changed in this slice.

### Verification

- Passed: `npm run simulate`
- Passed: `npm run --silent simulate -- --export-json`
- Passed: `npm run --silent simulate -- --csv`
- Passed: `npm run --silent simulate -- --tactics-json`
- Passed: `npm run --silent simulate -- --tactics-csv`
- Passed: compact/tactic export heat-field scans for `districtHeat`, `districtHeatProjection`, `projectedHeat`, and `heatBand`
- Passed: live web/save heat-token scans
- Passed: `npm test -- tests/web/displayTerms.test.ts tests/save/saveSchema.factory.test.ts tests/save/cloudSaveContract.test.ts`
- Passed: `npm test -- tests/docs/markdownLinks.test.ts`
- Passed: `git diff --check`

## Slice 98.2: Offline Parity Report Surface

Make the active/offline reward-rate mismatch visible in tooling before changing live rewards.

### Tasks

- Review `core/offline/offlineRewards.ts`, `core/balance/simulatedBalanceReport.ts`, `core/balance/districtHeatProjection.ts`, `tools/balance/formatReport.ts`, and `tests/tools/balanceReport.test.ts`.
- Add or specify report-only parity rows for recommended farm routes, including active clear time, active reward rate, offline reward rate, and offline/active ratio.
- Decide whether parity rows live only in the default report and full debug JSON or also in compact JSON/CSV exports.
- If compact JSON/CSV exports remain unchanged, lock that with tests.
- Keep the live offline reward formula unchanged in this slice.

### Acceptance

- Authors can see which recommended farms invert active/offline reward expectations.
- The report distinguishes author-facing parity evidence from live gameplay behavior.
- Export schema posture is explicit and tested.

### Implementation Notes

- Added report-only `offlineParity` rows to each region balance in the full debug report data. The rows compare recommended farm route active clear time, active clears per hour, offline clears per hour, active reward rates, offline reward rates, and offline/active ratio.
- Added an `Offline Parity Report` section to the default simulator output after `Region Farm Recommendations`.
- Left the live offline reward formula unchanged. The parity report reads the current default config: `estimatedClearTimeSeconds: 10`, `minimumClearTimeSeconds: 5`, and `offlineEfficiency: 0.6`.
- Kept stable compact authoring JSON, stage CSV, tactic JSON, and tactic CSV exports unchanged. Parity remains default-report/full-debug evidence until a later explicit schema decision.
- Current ratios after Slice 98.5 tuning: `greenline_approach_8` is `1.51x` offline/active and flagged `offline_faster`; `veil_district_5` is `0.97x` and flagged `near_parity`; `black_iron_foundry_6` is `2.70x`, `lotus_clinic_6` is `2.45x`, and `redline_outpost_6` is `1.92x`, all flagged `offline_faster` except Veil.

### Verification

- Passed: `npm test -- tests/tools/balanceReport.test.ts`
- Passed: `npm run simulate`
- Passed: `npm run --silent simulate -- --export-json`
- Passed: `npm run --silent simulate -- --csv`
- Passed: compact/tactic export parity-field scans for `offlineParity`, `offlineToActive`, `activeRewardsPerHour`, and `offlineRewardsPerHour`
- Passed: `npm test -- tests/docs/markdownLinks.test.ts`
- Passed: `git diff --check`

## Slice 98.3: Offline Formula Decision And Guard Rails

Decide whether to change live offline rewards or defer with better reporting.

### Tasks

- Use the parity report from Slice 98.2 to classify each recommended farm route as acceptable, watch, or inversion.
- Decide between fixed 10s estimate, stage-specific authored estimates, simulated/target-derived estimates, or no live change yet.
- If a live formula change is approved, update `core/offline/offlineRewards.ts` and focused offline tests without changing save shape.
- If no live change is approved, update [District Heat Contract](district-heat-contract.md) and [Progression Pacing Roadmap](progression-pacing-roadmap.md) with the deferral and report guard rails.
- Keep assignment rewards out of live heat behavior unless a separate slice approves them.

### Acceptance

- Stage 3.2 has a written offline formula decision.
- Any live formula change has focused tests and does not require a save-version bump.
- District Heat remains blocked from live reward/risk changes if parity is still unresolved.

### Implementation Notes

- Decision: defer live offline reward formula changes in Stage 3.2 Slice 98.3. The live path keeps the fixed default estimate of `estimatedClearTimeSeconds: 10`, `minimumClearTimeSeconds: 5`, and `offlineEfficiency: 0.6`.
- Reason: four of five recommended farm routes are still offline/active inversions under the current default config, and Redline live-heat blockers are still unresolved. Changing live rewards before Redline triage and the District Heat promotion decision would mix economy tuning with heat readiness.
- Added explicit report-only classifications to `offlineParity`: `inversion`, `watch`, or `acceptable`. Current rows classify `greenline_approach_8`, `black_iron_foundry_6`, `lotus_clinic_6`, and `redline_outpost_6` as `inversion`; `veil_district_5` is `watch`.
- Added an offline reward guard-rail test proving the default live formula still uses the fixed 10s estimate for `greenline_approach_8`.
- Assignment rewards remain outside live heat behavior. Stage 3.2 still treats District Heat as report-only until Redline blockers and promotion posture are resolved.

### Verification

- Passed: `npm test -- tests/offline/offlineRewards.test.ts`
- Passed: `npm test -- tests/tools/balanceReport.test.ts`
- Passed: `npm run simulate`
- Passed: `npm test -- tests/docs/markdownLinks.test.ts`
- Passed: `git diff --check`

## Slice 98.4: Redline Live-Heat Blocker Triage

Choose the smallest Redline tuning path before any heat pressure is allowed.

### Tasks

- Review `redline_outpost_1`, `redline_outpost_3`, `redline_outpost_4`, `redline_outpost_5`, and Redline status-damage cap evidence from simulator and tactic comparison rows.
- Identify whether each blocker should be tuned, target-reclassified, or carried forward.
- Compare tactic rows for `context_break`, `gatekeeper_burst`, and `long_stabilization` without treating any tactic as a blanket fix.
- Record the intended owner files before data changes, likely `data/regions.json`, `data/stages.json`, `data/enemies.json`, `data/tactics.json`, `data/medicines.json`, and focused balance tests.

### Acceptance

- Every Redline live-heat blocker has a Stage 3.2 action.
- Any target reclassification is justified by pacing guidelines, not by hiding failures.
- The triage preserves `redline_outpost_7` caution from Stage 3.1.

### Implementation Notes

- Ran the default simulator and tactic comparison exports before changing docs. No balance data, tactic data, save schema, export schema, or live heat behavior changed in this slice.
- Added a focused balance-report test that locks the Redline tactic comparison evidence used by this triage until Slice 98.5 intentionally updates it.

| Blocker | Current evidence | Slice 98.5 action | Owner files |
| --- | --- | --- | --- |
| `redline_outpost_1` normal target miss | Baseline clears in `23.4s` against `5-15s`; `long_stabilization` improves to `19.8s` but still misses. | Reclassify Redline normal timing to a late-region status opener, likely `18-25s`, instead of forcing this post-Lotus gate into tutorial-speed timing. | `data/regions.json`, `tests/tools/balanceReport.test.ts` |
| `redline_outpost_3` elite target miss | Baseline clears in `45s`; `context_break` clears in `38s` and `gatekeeper_burst` in `39.6s`, both `improved_existing_miss`. | Apply a narrow data tune so the baseline route lands inside `20-40s`; do not treat `context_break` or `gatekeeper_burst` as blanket Redline fixes. | `data/enemies.json`, `data/stages.json`, `tests/tools/balanceReport.test.ts` |
| `redline_outpost_4` severe elite target miss | Baseline clears in `66.6s`; the best reviewed tactic row, `kinetic_crush`, still clears in `55.8s`. | Make this the primary Redline data-tuning target in 98.5 and reduce the severe spike before live heat can add pressure. | `data/enemies.json`, `data/stages.json`, `tests/tools/balanceReport.test.ts` |
| `redline_outpost_5` elite target miss | Baseline clears in `48s`; `kinetic_crush` improves to `41.4s` but still misses. | Apply a secondary light tune or verify it is fixed by shared Redline enemy changes from the stage 4 tune. | `data/enemies.json`, `data/stages.json`, `tests/tools/balanceReport.test.ts` |
| Redline status-damage cap | Baseline Redline total status damage is `1077.06`, above the `1000` cap. `long_stabilization` lowers total status damage to `779.25` with no `new_miss`. | Tune default status pressure or counterplay below cap while using `long_stabilization` as the safe benchmark. Do not make it a blanket default tactic in this slice. | `data/enemies.json`, `data/statusEffects.json`, `data/medicines.json`, `data/tactics.json`, `tests/tools/balanceReport.test.ts` |
| `redline_outpost_7` tactic caution | `context_break` and `gatekeeper_burst` both change the baseline boss `player_clear` into `enemy_hold`, marked `new_miss`. | Preserve this as a hard safety guard for Slice 98.5; any tactic or data tune must keep the boss from regressing. | `data/enemies.json`, `data/tactics.json`, `tests/tools/balanceReport.test.ts` |

### Verification

- Passed: `npm run simulate`
- Passed: `npm run --silent simulate -- --tactics-json`
- Passed: `npm run --silent simulate -- --tactics-csv`
- Passed: `npm test -- tests/tools/balanceReport.test.ts`
- Passed: `npm test -- tests/docs/markdownLinks.test.ts`
- Passed: `git diff --check`

## Slice 98.5: Targeted Redline And Status Pressure Tuning

Apply the smallest approved Redline tuning changes from Slice 98.4.

### Tasks

- Make narrow data or tactic changes for the approved Redline blockers.
- Reclassify `redline_outpost_1` normal timing to the approved late-region status-opener band before judging it as a remaining miss.
- Tune `redline_outpost_3` and `redline_outpost_4` through narrow enemy or stage changes; treat `redline_outpost_4` as the primary severe spike.
- Lightly tune or verify `redline_outpost_5` after shared Redline enemy changes.
- Bring default Redline status pressure below the configured cap while using `long_stabilization` as a safety benchmark, not a blanket default tactic.
- Preserve `redline_outpost_7` boss safety so `context_break` and `gatekeeper_burst` do not become unreviewed default fixes.
- Keep Black Iron Foundry debt visible unless Slice 98.4 explicitly chooses to tune or reclassify it.
- Avoid broad power creep that erases earlier regions, boss gates, or tactic comparison safety.
- Update [Content Pipeline Inventory](content-pipeline-inventory.md), [Balance Budget Gates](balance-budget-gates.md), and [District Heat Contract](district-heat-contract.md) with new dispositions.
- Add or update focused tests only where report schema, validation, or data rules change.

### Acceptance

- Redline clear-time and status-pressure outcomes are either within target or intentionally reclassified.
- Tactic comparison does not create unreviewed new misses.
- Existing known-debt docs match simulator output.

### Implementation Notes

- Reclassified Redline clear-time targets in [data/regions.json](../data/regions.json): normal stages now use `18-25s`, and elite stages now use `19-40s` so late-region status openers and tactic variance are judged against Redline pacing rather than tutorial pacing.
- Narrowed the `redline_outpost_4` formation in [data/stages.json](../data/stages.json) to `burning_blood_captain` plus `marrow_lock_supplicant`, removing the extra Miasma body that created the severe `66.6s` spike.
- Reduced only Redline hostile durability/defense in [data/enemies.json](../data/enemies.json): `marrow_lock_supplicant` and `burning_blood_captain` now land their affected routes inside target without changing earlier regions.
- Lowered `corruption` tick pressure in [data/statusEffects.json](../data/statusEffects.json) from `0.006` to `0.0054` Body Integrity damage per second.
- Current Redline default simulator outcomes: `redline_outpost_1` `23.4s` inside `18-25s`; `redline_outpost_2` `22s`, `redline_outpost_3` `40s`, `redline_outpost_4` `22s`, `redline_outpost_5` `40s`, and `redline_outpost_6` `32s` inside `19-40s`; Redline status pressure passes at `785.81` damage and `89` applications; boss baseline remains `player_clear` in `95.4s` with `339.35` status damage.
- Tactic comparison has no new misses for `balanced_routine`, `kinetic_crush`, `guard_the_stabilizer`, or `long_stabilization`. `context_break` and `gatekeeper_burst` still turn `redline_outpost_7` into `enemy_hold`, preserving the caution for future tactic or heat work.

### Verification

- Passed: `npm test -- tests/data/validateData.test.ts`
- Passed: `npm test -- tests/tools/balanceReport.test.ts`
- Passed: `npm test -- tests/docs/markdownLinks.test.ts`
- Passed: `npm run simulate`
- Passed: `npm run --silent simulate -- --export-json`
- Passed: `npm run --silent simulate -- --csv`
- Passed: `npm run --silent simulate -- --tactics-json`
- Passed: `npm run --silent simulate -- --tactics-csv`
- Passed: `git diff --check`

## Slice 98.6: District Heat Promotion Decision

Decide what District Heat is allowed to do after parity and Redline evidence.

### Tasks

- Review Slice 98.2 through 98.5 evidence against [District Heat Contract](district-heat-contract.md) promotion gates.
- Choose one next posture:
  - keep District Heat report-only;
  - prepare a non-punitive player-facing warning;
  - prepare a tiny live offline-only effect for a later stage.
- If any live posture is chosen, write the save/UI/export boundary before implementation starts.
- Keep Stage 3.2 from half-shipping live heat unless all required tests and docs are updated in the same slice.

### Acceptance

- The next District Heat action is explicit and reversible.
- Save, cloud, web UI, compact export, and tactic export postures are documented.
- Deferred mechanic terms remain out of live UI unless this slice explicitly opens a player-facing UI task.

### Implementation Notes

- Chose `report_only` as the Stage 3.2 District Heat promotion posture. Redline is no longer the blocker after Slice 98.5, but four recommended farm routes are still offline/active inversions and `black_iron_foundry_4` remains visible tuning debt.
- Added `districtHeatPromotionDecision` to the default balance report/full debug JSON through [core/balance/districtHeatPromotion.ts](../core/balance/districtHeatPromotion.ts). It records promotion gates, the selected posture, the next action, and explicit save/cloud/web/export/reward boundaries.
- Kept compact authoring JSON, stage CSV, tactic JSON, and tactic CSV heat-free. The report-only decision does not add live heat UI, save data, cloud envelope fields, reward modifiers, route-risk modifiers, or offline reward formula changes.
- Next action: Stage 3.3 should resolve offline parity and visible Black Iron debt first, or open a separate non-punitive warning contract before any player-facing heat UI or live reward behavior.

### Verification

- Passed: `npm test -- tests/web/displayTerms.test.ts`
- Passed: `npm test -- tests/save/saveSchema.factory.test.ts tests/save/cloudSaveContract.test.ts`
- Passed: `npm test -- tests/tools/balanceReport.test.ts`
- Passed: `npm test -- tests/docs/markdownLinks.test.ts`
- Passed: `npm run simulate`
- Passed: `npm run --silent simulate -- --export-json`
- Passed: `npm run --silent simulate -- --csv`
- Passed: `npm run --silent simulate -- --tactics-json`
- Passed: `npm run --silent simulate -- --tactics-csv`
- Passed: `npm run typecheck`
- Passed: `git diff --check`

## Slice 98.7: Release Hardening And Archive Readiness

Close Stage 3.2 with full validation, docs cleanup, and a clear Stage 3.3 handoff.

### Tasks

- Run the verification baseline and capture any skipped command with a reason.
- Run stale-term scans for active docs/UI and confirm future-only mechanics remain absent from live web source.
- Update [Current Implemented Systems](current-implemented-systems.md), [Progression Pacing Roadmap](progression-pacing-roadmap.md), [Content Pipeline Inventory](content-pipeline-inventory.md), [Balance Budget Gates](balance-budget-gates.md), and [District Heat Contract](district-heat-contract.md) with final Stage 3.2 decisions.
- Add Stage 3.2 closure notes to this backlog.
- Move this backlog to `docs/archive/stage-3.2-backlog.md` only after the milestone is complete.

### Acceptance

- Stage 3.2 decisions and verification are documented.
- Active docs point to the current District Heat posture and next implementation step.
- No active `docs/stage-3.2-backlog.md` remains after archive closure.
- The next implementation step is clear: live heat, more pacing cleanup, or another report-only stage.

### Verification

- `npm run verify`
- `npm run --silent simulate -- --export-json`
- `npm run --silent simulate -- --csv`
- `npm run --silent simulate -- --tactics-json`
- `npm run --silent simulate -- --tactics-csv`
- Stale-term scan over live web source for deferred mechanics.
- `npm test -- tests/docs/markdownLinks.test.ts`
- `git diff --check`

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

Browser smoke is required only after visible UI or web-state changes. Until then, record browser smoke as skipped because Stage 3.2 starts as pacing/report/tuning work.

## Closure Notes

- Stage 3.2 is not complete until Slices 98.1 through 98.7 are all complete.
- Archive target after completion: `docs/archive/stage-3.2-backlog.md`.
- The preferred next implementation path should be chosen by parity and Redline evidence, not by District Heat theme pressure alone.
