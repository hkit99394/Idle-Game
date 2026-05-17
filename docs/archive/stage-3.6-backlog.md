# Stage 3.6 Backlog: District Heat Live Decision

## Current Status

Stage 3.6 is complete and archived after [Archived Stage 3.5 Backlog](stage-3.5-backlog.md). Stage 3.5 shipped a warning-only District Attention route-card note for the selected offline farm route while it remains farmable. The warning is non-persistent, non-punitive, export-free, and scoped to the named route-card owner files. Slice 102.1 completed the handoff evidence review. Slice 102.2 chose the recommended Stage 3.6 posture: keep District Heat warning-only and update stale report/contract handoff language before considering any future live mechanic. Slice 102.3 updated the contract and author-facing promotion report so passing gates now produce `warning_only` with a `warning_only_route_card` web boundary, without changing runtime behavior. Slice 102.4 re-proved save, cloud, compact export, tactic export, offline reward, report, and web-source boundaries. Slice 102.5 updated the roadmap/current-system handoff and named Stage 4.0 Next Neon System Selection as the next backlog target after Stage 3.6 archive. Slice 102.6 completed release hardening, recorded browser-smoke status, and archived the backlog.

This stage owns **Epic 102: District Heat Live Decision**. It has chosen warning-only District Heat for Stage 3.6 closure. Any reward, route-risk, enemy-pressure, save, cloud, export, or new UI behavior change remains outside this stage.

Do not start Stage 3.6 by adding heat rewards, heat penalties, route-risk pressure, enemy-pressure modifiers, save fields, cloud fields, acknowledgement state, timers, numbers, meters, or global UI. The useful move is a decision with evidence, guard rails, and a clean handoff.

## Review Findings

The Stage 3.6 plan starts from the Stage 3.5 closure evidence:

- At Stage 3.6 start, District Heat remained `report_only` in `npm run simulate` and full debug JSON; Slice 102.3 now reports `warning_only` only when the promotion gates pass.
- The only player-facing District Heat-adjacent surface is the neutral `district attention` route-card note.
- The shipped route-card note appears only when a card is the selected offline farm target and remains farmable.
- Saves, cloud envelopes, compact JSON/CSV exports, tactic JSON/CSV exports, rewards, route risk, enemy pressure, and offline gains remain unchanged.
- `tests/web/displayTerms.test.ts` still blocks report-only heat terms and unapproved attention identifiers from live web source.
- `tests/helpers/districtAttentionBoundary.ts` protects save/cloud/export boundaries from report-only heat fields, warning-copy terms, and the Stage 3.6 warning-only posture strings.

## Stage Theme

Close the chosen District Heat posture before changing the game.

Stage 3.6 made the next District Heat decision explicit: keep the shipped warning-only route-card note and defer any future live mechanic to a later dedicated contract. It should not combine release hardening with a broad implementation.

## Source Contracts And Carry-Forward Decisions

- [District Heat Contract](../district-heat-contract.md) remains the District Heat authority.
- [Path Of Neon Roadmap](../path-of-neon-roadmap.md) names Stage 3.6 as warning-only closure and Stage 4.0 as the next backlog target after archive.
- [Archived Stage 3.5 Backlog](stage-3.5-backlog.md) records the shipped warning-only route-card surface and browser smoke.
- [Save API](../save-api.md) and [Cloud Save Contract](../cloud-save-contract.md) remain the persistence boundary authorities.
- [Web UI Architecture](../web-ui-architecture.md) remains the live web owner-file and display-term authority.
- [Progression Pacing Roadmap](../progression-pacing-roadmap.md), [Content Pipeline Inventory](../content-pipeline-inventory.md), [Balance Budget Gates](../balance-budget-gates.md), and `npm run simulate` remain the balance/report authorities.

## Scope

- Review Stage 3.5 warning behavior, source guard rails, browser smoke, report-only heat projections, promotion gates, and export/save/cloud boundaries.
- Compare the Stage 3.6 decision options from [Path Of Neon Roadmap](../path-of-neon-roadmap.md): warning-only, report-only tooling, author-facing recommendation logic, tiny live effect, or persisted heat.
- Select one posture for the next milestone.
- Update [District Heat Contract](../district-heat-contract.md), [Path Of Neon Roadmap](../path-of-neon-roadmap.md), and [Current Implemented Systems](../current-implemented-systems.md) with the chosen posture and handoff.
- If the decision is warning-only or report-only, keep runtime behavior unchanged and prove boundaries remain intact.
- If the decision proposes a live effect or persisted heat later, write the future contract requirements without implementing them in this stage.

## Non-Goals

- No persisted District Heat field, save-version bump, cloud-save envelope change, browser storage migration, or heat import/export normalization.
- No heat reward bonus, heat reward penalty, route-risk modifier, enemy-pressure modifier, boss-gate modifier, assignment modifier, or offline farming heat modifier.
- No global meter, top-bar badge, district header badge, modal, onboarding panel, warning acknowledgement, severity band, heat band, projected heat value, timer, or number.
- No compact JSON/CSV or tactic export schema bump.
- No broad economy retune, new district, augment loadout, network operation, countermeasure economy, AI raid, or hostile Intrusion work.

## Exit Criteria

- Stage 3.6 has one documented District Heat posture and a named next milestone.
- Active docs clearly say whether District Heat remains warning-only, report-only, authoring-only, or needs a future live-effect contract.
- Save, cloud, compact export, tactic export, reward, route-risk, enemy-pressure, offline reward, and web-source boundaries remain explicit.
- Any future live or persisted heat work is separated into a later backlog with focused save/export/UI/simulator requirements.
- Verification commands and browser smoke status are recorded before archive.

## Epic Summary

| Slice | Epic | Title | Status |
| --- | --- | --- | --- |
| 102.1 | 102 | Handoff Evidence Review | Complete |
| 102.2 | 102 | Decision Matrix And Recommended Posture | Complete |
| 102.3 | 102 | Contract Update For Chosen Posture | Complete |
| 102.4 | 102 | Boundary Proof For Chosen Posture | Complete |
| 102.5 | 102 | Roadmap And Next-Milestone Handoff | Complete |
| 102.6 | 102 | Release Hardening And Archive Readiness | Complete |

## Slice 102.1: Handoff Evidence Review

Gather the current District Heat evidence before choosing a posture.

### Tasks

- Review [Archived Stage 3.5 Backlog](stage-3.5-backlog.md), [District Heat Contract](../district-heat-contract.md), [Path Of Neon Roadmap](../path-of-neon-roadmap.md), save/cloud docs, web UI docs, and the current test guards.
- Review current `npm run simulate` District Heat projection and promotion decision output.
- Confirm Stage 3.5 warning behavior: selected offline farm route card only, no persistence, no stable export fields, no reward/risk behavior.
- Identify any stale docs that still describe Stage 3.5 as active or the warning copy as future-only.

### Acceptance

- Stage 3.6 starts from current evidence, not assumptions.
- Any stale doc wording is listed before edits.
- No runtime behavior changes are made.

### Implementation Notes

- Reviewed the Stage 3.5 archive, District Heat contract, roadmap, current-system summary, save/cloud docs, web UI docs, `tests/web/displayTerms.test.ts`, and `tests/helpers/districtAttentionBoundary.ts`.
- Confirmed the Stage 3.5 route-card warning is the only player-facing District Heat-adjacent surface: selected offline farm route card only, backed by `isSelectedOfflineFarmStage` and `canSelectOfflineFarm`.
- Confirmed the warning remains non-persistent and export-free in the active save/cloud docs: no save-version bump, no browser storage key, no migration, no save diagnostics output, no cloud metadata, and no raw-save heat or warning state.
- Confirmed the active web-source guard still allowlists only the Stage 3.5 owner files and continues blocking report-only heat terms plus unapproved attention identifiers.
- Reviewed `npm run simulate`: District Heat projection remains report-only, all promotion gates pass, and live boundaries still report save/cloud/compact/tactic/reward as unchanged.
- Stale wording to address in later Stage 3.6 slices before closure:
  - `npm run simulate` District Heat Promotion Decision still says `after Stage 3.4` and recommends opening a route-card warning prototype, even though Stage 3.5 already shipped that prototype.
  - `docs/district-heat-contract.md` still contains Stage 3.4-era historical wording about future warning copy and a later route-card prototype before the newer Stage 3.5 closure section.
  - `docs/current-implemented-systems.md` still contains Stage 3.4 historical next-step wording about a future route-card prototype in the Stage 3.4 archive summary.
- Slice 102.1 made no runtime, gameplay, save/cloud/export schema, UI, reward, route-risk, enemy-pressure, offline reward, or simulator-output changes.

### Verification

- Passed: `npm test -- tests/docs/markdownLinks.test.ts`
- Passed: `npm run simulate`
- Passed: `git diff --check`

## Slice 102.2: Decision Matrix And Recommended Posture

Choose the Stage 3.6 posture explicitly.

### Tasks

- Compare these options: warning-only, report-only tooling, author-facing recommendation logic, tiny live effect, persisted heat.
- Score each option for player value, implementation risk, save/cloud risk, export risk, UI risk, testing cost, rollback cost, and milestone fit.
- Recommend one posture for Stage 3.6 closure.
- If the recommendation is not warning-only, define why the current warning-only surface is insufficient.

### Acceptance

- The chosen posture is stated in plain language.
- Risks and rejected options are recorded.
- The stage does not implement a live mechanic while deciding the posture.

### Implementation Notes

Chosen posture: **warning-only for Stage 3.6 closure**.

The shipped route-card note should remain informational and non-punitive. Stage 3.6 should use the remaining slices to update stale promotion/contract/roadmap language and re-prove boundaries, not to add gameplay-affecting heat.

Decision matrix:

| Option | Player Value | Implementation Risk | Save/Cloud Risk | Export Risk | UI Risk | Testing Cost | Rollback Cost | Milestone Fit | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Warning-only | Medium: keeps the readable warning shipped in Stage 3.5. | Low | Low | Low | Low | Low | Low | Strong | Recommended |
| Report-only tooling | Medium for authors, low for players. | Low | Low | Low | Low | Medium | Low | Strong, but does not resolve the shipped warning posture by itself. | Defer as support work if needed |
| Author-facing recommendation logic | Medium: could improve future route decisions without changing rewards. | Medium | Low | Medium | Low | Medium | Medium | Possible later slice, but too early before stale handoff language is fixed. | Defer |
| Tiny live effect | High if well designed, but easy to misread as punitive heat. | High | Medium | Medium | High | High | High | Weak for this decision-only stage. | Reject for Stage 3.6 |
| Persisted heat | High long-term system value. | Very High | Very High | High | High | Very High | Very High | Poor without a dedicated save/cloud milestone. | Reject for Stage 3.6 |

Why warning-only wins now:

- Stage 3.5 already proved the route-card note is readable, scoped, and non-persistent.
- `npm run simulate` still has stale promotion-decision wording that points to a route-card prototype already shipped, so contract/report cleanup should happen before new mechanics.
- No current evidence shows the warning-only surface is insufficient for players.
- Live effects would require new save/export/UI/simulator contracts and rollback language, which belongs in a later backlog if chosen.

Rejected risks to carry forward:

- Do not add reward modifiers, route-risk pressure, enemy-pressure modifiers, offline gain changes, persisted heat, acknowledgement state, timers, numbers, or heat meters in Stage 3.6.
- Do not widen the `tests/web/displayTerms.test.ts` allowlist beyond named Stage 3.5 owner files unless a later contract slice explicitly changes the live surface.
- Do not add compact/tactic export fields or cloud metadata as part of wording cleanup.

Next posture handoff:

- Slice 102.3 should update [District Heat Contract](../district-heat-contract.md) and report-decision wording to say Stage 3.5 has shipped and Stage 3.6 keeps the current warning-only posture.
- Slice 102.4 should re-prove save/cloud/export/reward/offline boundaries.
- Slice 102.5 should update roadmap/current-system docs with the warning-only decision and name the next milestone.
- Slice 102.2 made no runtime, gameplay, save/cloud/export schema, UI, reward, route-risk, enemy-pressure, offline reward, or simulator-output changes.

### Verification

- Passed: `npm test -- tests/docs/markdownLinks.test.ts`
- Passed: `git diff --check`

## Slice 102.3: Contract Update For Chosen Posture

Update the District Heat contract to match the chosen posture.

### Tasks

- Update [District Heat Contract](../district-heat-contract.md) with the Stage 3.6 decision.
- If the decision is warning-only or report-only, keep the current no-persistence/no-export/no-reward boundaries.
- If the decision is a future live effect, name the future contract requirements and forbid implementation until a later stage opens them.
- Keep the Stage 3.5 route-card owner-file allowlist narrow.

### Acceptance

- The contract says what is allowed now and what remains forbidden.
- The next implementation step is not ambiguous.
- No save/cloud/export schema is changed in this slice.

### Implementation Notes

- Updated [District Heat Contract](../district-heat-contract.md) with the Stage 3.6 warning-only decision.
- Refreshed stale Stage 3.4 and route-card prototype handoff language now that Stage 3.5 has shipped the route-card note.
- Updated the author-facing promotion decision so passing gates report `warning_only` and the web boundary reports `warning_only_route_card`.
- Kept District Heat out of saves, cloud envelopes, compact exports, tactic exports, rewards, route-risk behavior, enemy-pressure behavior, offline rewards, acknowledgement state, timers, meters, and global UI.
- Slice 102.3 made no gameplay, save/cloud/export schema, reward, route-risk, enemy-pressure, offline reward, or new web UI behavior changes.

### Verification

- Passed: `npm test -- tests/web/displayTerms.test.ts tests/docs/markdownLinks.test.ts`
- Passed: `npm test -- tests/tools/balanceReport.test.ts tests/docs/markdownLinks.test.ts`
- Passed: `npm run simulate`
- Passed: `git diff --check`

## Slice 102.4: Boundary Proof For Chosen Posture

Prove the selected posture did not move runtime boundaries by accident.

### Tasks

- Re-run save and cloud boundary tests.
- Re-run compact JSON/CSV and tactic export checks.
- Re-run offline rewards and balance report tests.
- Re-run or update web-source guards if the chosen posture changes allowed terms.
- Run browser smoke only if the visible warning surface changes.

### Acceptance

- Save/cloud/export boundaries remain explicit.
- Rewards, route risk, enemy pressure, offline gains, and simulator outputs are unchanged unless a later dedicated implementation stage says otherwise.
- Any allowed web-source terms are scoped to named owner files only.

### Implementation Notes

- Expanded `tests/helpers/districtAttentionBoundary.ts` so save/cloud/export boundary checks also catch `warning_only` and `warning_only_route_card`.
- Re-ran the save, cloud, offline reward, balance report, web-source, and doc-link guard suite with the Stage 3.6 warning-only posture.
- Re-ran compact JSON, compact CSV, tactic JSON, and tactic CSV export commands; the boundary tests continue proving District Heat projection, promotion-decision, warning-copy, and posture strings stay out of stable exports.
- Browser smoke was not rerun because Slice 102.4 made no visible route-card, layout, or interaction change.
- Slice 102.4 made no gameplay, save/cloud/export schema, reward, route-risk, enemy-pressure, offline reward, or new web UI behavior changes.

### Verification

- Passed: `npm test -- tests/web/displayTerms.test.ts tests/save/saveSchema.factory.test.ts tests/save/cloudSaveContract.test.ts tests/offline/offlineRewards.test.ts tests/tools/balanceReport.test.ts tests/docs/markdownLinks.test.ts`
- Passed: `npm run --silent simulate -- --export-json`
- Passed: `npm run --silent simulate -- --csv`
- Passed: `npm run --silent simulate -- --tactics-json`
- Passed: `npm run --silent simulate -- --tactics-csv`
- Passed: `git diff --check`

## Slice 102.5: Roadmap And Next-Milestone Handoff

Update active planning docs with the decision and next milestone.

### Tasks

- Update [Path Of Neon Roadmap](../path-of-neon-roadmap.md) with the Stage 3.6 decision.
- Update [Current Implemented Systems](../current-implemented-systems.md) with the current District Heat posture.
- Prepare the next backlog target: Stage 3.7 if more District Heat contract work is needed, or Stage 4.0 if District Heat stays warning-only and the next neon-native system should begin.
- Keep long-term candidates such as Augment Loadouts and Network Operations separate from Stage 3.6.

### Acceptance

- Active docs identify the next stage.
- Readers can tell whether District Heat is warning-only, report-only, authoring-only, or awaiting a later live-effect backlog.
- No archived doc history is rewritten except the Stage 3.6 backlog when it is archived later.

### Implementation Notes

- Updated [Path Of Neon Roadmap](../path-of-neon-roadmap.md) so Stage 3.6 is warning-only closure, not an undecided live-heat decision.
- Updated [Current Implemented Systems](../current-implemented-systems.md) with the current posture: report-only projection evidence, `warning_only` promotion report wording when gates pass, and one warning-only route-card note.
- Updated [District Heat Contract](../district-heat-contract.md) to keep live District Heat behind a later player-facing contract even though current promotion gates pass.
- Updated the author-facing promotion report next action to point at Stage 3.6 release hardening/archive readiness and Stage 4.0 Next Neon System Selection.
- Chose **Stage 4.0: Next Neon System Selection** as the next backlog target after Stage 3.6 archive; Stage 3.7 is not needed unless District Heat is explicitly reopened later.
- Kept Augment Loadouts, Network Operations, Countermeasure Economy, AI Raid Event, Hostile Cognitive Intrusion, and persisted District Heat separated as candidate future milestones.
- Slice 102.5 made no gameplay, save/cloud/export schema, reward, route-risk, enemy-pressure, offline reward, or new web UI behavior changes.

### Verification

- Passed: `npm test -- tests/docs/markdownLinks.test.ts`
- Passed: `npm test -- tests/tools/balanceReport.test.ts tests/docs/markdownLinks.test.ts`
- Passed: `npm run simulate`
- Passed: `npm run typecheck`
- Passed: `git diff --check`

## Slice 102.6: Release Hardening And Archive Readiness

Close Stage 3.6 only after docs, tests, reports, and any needed browser smoke agree.

### Tasks

- Run the release-readiness command set for the chosen posture.
- Record browser smoke status and residual risks.
- Archive `docs/stage-3.6-backlog.md` only after the stage is complete.

### Acceptance

- Stage 3.6 is ready to archive with all slices complete.
- Active docs clearly state the chosen District Heat posture and next milestone.
- Any future live or persisted District Heat work is explicitly out of Stage 3.6 unless the stage contract is reopened.

### Implementation Notes

- Ran the release-readiness command set for the chosen warning-only posture.
- Confirmed `npm run simulate` reports `posture: warning_only`, the `warning_only_route_card` web boundary, no save/cloud/compact/tactic heat fields, and Stage 4.0 Next Neon System Selection as the next action.
- Browser smoke was not rerun in Slice 102.6 because Stage 3.6 did not change the visible route-card warning after the Stage 3.5 desktop and narrow-mobile smoke coverage.
- Residual risk is intentionally deferred: any future live or persisted District Heat work needs a new save/export/UI/simulator contract before implementation.
- Archived the completed backlog at `docs/archive/stage-3.6-backlog.md`.

### Verification

- Passed: `npm run typecheck`
- Passed: `npm test`
- Passed: `npm run build`
- Passed: `npm run simulate`
- Passed: `npm run --silent simulate -- --export-json`
- Passed: `npm run --silent simulate -- --csv`
- Passed: `npm run --silent simulate -- --tactics-json`
- Passed: `npm run --silent simulate -- --tactics-csv`
- Not rerun: browser smoke; no visible warning UI changed in Stage 3.6 after Stage 3.5 smoke coverage.
- Passed: `git diff --check`
