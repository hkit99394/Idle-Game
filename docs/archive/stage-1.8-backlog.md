# Stage 1.8 Backlog

## Current Status

Stage 1.8 is complete. Stage 1.7 completed foundation hardening and is archived at [Stage 1.7 Backlog](stage-1.7-backlog.md).

This file is intentionally archived under `docs/archive`. There should not be an active `docs/stage-1.8-backlog.md` copy after Stage 1.8 closure unless the stage is explicitly reopened.

The recommended theme is **Combat Engine V2**. This is a refactor stage, not a new content stage. The goal is to make combat resolution easier to extend for future skills, statuses, tactics, and formation systems while preserving current battle outcomes unless a balance change is explicitly approved.

## Decisions Carried Forward

- Preserve current combat outcomes and balance reports unless a task explicitly approves a behavior change.
- Keep `core/` usable without browser, tool, or storage dependencies.
- Use Stage 1.7 balance gates, save-load tests, and static-data validation as closure safety rails.
- Treat `simulateBattle` and `resolveStageBattle` as public behavior contracts even if their internals move.
- Prefer small extraction steps with golden/parity coverage over a single broad rewrite.
- Do not add new production content to justify the refactor.

## Stage Goals

- Split combat resolution into clearer phases: context setup, action scheduling, target selection, damage calculation, effect dispatch, status ticking, medicine/recovery, and metrics.
- Introduce a damage package model that can carry Outer damage, Inner damage, Qi Break burst, backlash, prevention, guard/protection reduction, and contribution attribution.
- Create a skill effect dispatcher so new skill effects can be added without editing the main simulator loop.
- Strengthen deterministic scenario fixtures for tank, breaker, striker, healer/support, medicine, and status-heavy fights.
- Add golden trace coverage for representative battles and keep current battle summaries stable.
- Document combat extension points so Stage 2.1 strategy work can build on the pipeline without rediscovering internals.

## Non-Goals

- No new region, hero, enemy family, or production skill line.
- No new player tactics, formation bonus system, or manual combat command layer; that belongs to Stage 2.1.
- No UI modularization; that belongs to Stage 1.9.
- No backend or PWA work; that belongs to Stage 2.2.
- No save schema changes unless a combat result contract truly requires one.
- No broad balance retune outside compatibility fixes needed to preserve existing behavior.

## Exit Criteria

- Combat resolution has named modules for scheduling, damage packages, effect dispatch, status ticking, and battle recording.
- Existing public combat/progression APIs still satisfy current web, tools, balance, and tests.
- Golden/parity tests cover representative combat traces and key battle summary metrics.
- Adding a new skill effect mostly means adding an effect handler plus validation/tests, not editing a large central switch.
- Balance reports and support-decision tooling still run against every configured region.
- No browser, React, web storage, or tool code enters `core/combat`.
- `npm run typecheck`, `npm test`, `npm run build`, `npm run simulate`, `npm run support-decision`, and `git diff --check` pass.

## Epic Summary

| Epic | Title | Status | Purpose |
| --- | --- | --- | --- |
| 49 | Combat Baselines And Scenario Fixtures | Complete | Lock current battle behavior before moving internals |
| 50 | Turn Scheduler And Resolution Context | Complete | Extract action timing and combat context setup from the simulator |
| 51 | Damage Package And Defense Pipeline | Complete | Make damage, Qi Break, prevention, and attribution explicit |
| 52 | Skill Effect Dispatcher And Status Hooks | Complete | Route effects through handlers instead of central simulator branching |
| 53 | Battle Recorder And Progression Adapter Contract | Complete | Keep summaries, metrics, and `resolveStageBattle` stable through the refactor |
| 54 | Combat Docs And Release Readiness | Complete | Document extension points, verify boundaries, and close Stage 1.8 cleanly |

---

## Epic 49: Combat Baselines And Scenario Fixtures

### Goal

Capture the current combat behavior before moving responsibilities out of the simulator.

### Tasks

- Audit current combat tests and identify which behaviors are already covered by deterministic assertions.
- Add or consolidate fixtures for tank, breaker, striker, support/healing, medicine cleanse, resistance, and status-heavy scenarios.
- Add golden trace tests for representative fights that include action order, status application, Qi Break, damage, medicine, and recovery events.
- Add balance/parity assertions that compare battle trace metrics with `npm run simulate` expectations where practical.
- Record any known intentional budget misses in `docs/balance-budget-gates.md` instead of treating them as refactor failures.

### Acceptance Criteria

- At least one deterministic trace protects each major combat subsystem touched by Stage 1.8.
- Current battle outcomes for key progression stages are documented by tests before internals move.
- Fixtures are reusable by core combat, progression, and balance tests without copying large setup blocks.
- Golden tests are stable enough to catch regressions without requiring fragile full-log snapshots for every fight.

### Test Coverage

- Combat golden trace tests.
- Progression battle resolution parity tests.
- Balance report or support-decision parity smoke tests.

### Progress Notes

- Added `tests/helpers/combatScenarios.ts` with reusable deterministic combat builders and a mixed striker, breaker, support, tank, and status-pressure fixture.
- Added `tests/combat/combatBaselines.test.ts` to lock opening action order, guard absorption, Qi Break burst timing, and battle-cleanse medicine ordering around status application.

---

## Epic 50: Turn Scheduler And Resolution Context

### Goal

Separate combat setup and action scheduling from per-action resolution so the simulator loop becomes easier to read and extend.

### Tasks

- Extract combatant lookup, state creation, cooldown initialization, and simulation context setup from `core/combat/simulator.ts`.
- Introduce a small scheduling helper for next-action selection, tie breaking, cooldown advancement, and battle time advancement.
- Keep deterministic ordering identical to current behavior.
- Ensure status ticking and expiration still happen at the same points in the action timeline.
- Add focused tests for scheduling ties, defeat skipping, Qi Break downtime, and max-duration enemy holds.

### Acceptance Criteria

- The main simulator loop reads as orchestration over named scheduling/context helpers.
- Current action order golden tests remain unchanged.
- Scheduler helpers have no dependency on web, tools, static JSON import side effects, or progression state.
- Existing `simulateBattle` callers do not need API changes.

### Test Coverage

- Scheduler unit tests.
- Golden action-order tests.
- Existing simulator and progression tests.

### Progress Notes

- Added `core/combat/scheduler.ts` for initial action timing, readiness checks, speed-down-adjusted action speed, and next-action scheduling.
- Updated `simulateBattle` to use scheduler helpers for combatant initialization, action readiness, and action rescheduling without changing the public API.
- Added `tests/combat/scheduler.test.ts` for initial/next action timing, defeated combatant readiness, and clamped speed-down behavior.

---

## Epic 51: Damage Package And Defense Pipeline

### Goal

Make damage resolution explicit enough to support future mechanics without threading ad hoc numbers through the simulator.

### Tasks

- Define a damage package type for Outer damage, Inner damage, Qi Break burst, backlash, family multipliers, and contribution metadata.
- Route guard, protection, armor break, damage prevention, and Qi Break recording through the package.
- Keep current damage formulas in `core/combat/formulas.ts` unless a behavior-preserving move is needed.
- Preserve battle metrics for damage prevented, guard absorbs, armor breaks, Qi Breaks, backlash, and contribution attribution.
- Add tests proving package resolution matches current direct simulator behavior for normal, guarded, protected, armor-broken, and Qi-broken targets.

### Acceptance Criteria

- Damage, prevention, and contribution updates are handled by a named resolution helper instead of scattered inline mutations.
- Existing damage/defense/recovery tests pass without intentional expectation changes.
- Battle report metrics continue to match Stage 1.7 balance gates.
- Future damage-like effects have a clear path into the package model.

### Test Coverage

- Damage package unit tests.
- Defensive effects tests.
- Combat formula and simulator regression tests.
- Balance budget gate smoke tests.

### Progress Notes

- Added `core/combat/damagePackage.ts` for attack damage package creation, guard/protection mitigation, target mutation, attack event recording, and damage attribution while leaving formulas unchanged.
- Updated `simulateBattle` to route skill attack targeting and damage through the package helper before timed effects, Qi Break checks, and backlash.
- Added package source, target, and intended-target mismatch guards so event history cannot silently drift from the combatants used for HP mutation, mitigation, and contribution state.
- Routed Qi Break burst and backlash damage through package helpers while preserving existing event and metric recording.
- Added `tests/combat/damagePackage.test.ts` for family/vulnerability/armor-break package math, Qi-broken scaling, protector retargeting, guarded/protected attribution, mismatch rejection, Qi Break burst packages, and backlash packages.

---

## Epic 52: Skill Effect Dispatcher And Status Hooks

### Goal

Move skill effect application behind handler registration or dispatch helpers so new effect types stop expanding the central simulator loop.

### Tasks

- Audit current skill effects, timed effects, recovery effects, statuses, cleanse, resistance, wound, regeneration, and medicine interactions.
- Define a dispatcher interface for immediate, timed, recovery, defensive, and status-related effects.
- Move existing effect branches from `effectPipeline.ts` and `simulator.ts` into named handlers where practical.
- Keep static-data validation aligned with supported effect types.
- Add tests proving unsupported or malformed effects fail validation clearly.
- Preserve existing support/counterplay behavior for Lotus, Demon Cult, medicine, wound, regeneration, and resistance.

### Acceptance Criteria

- Adding a new skill effect type has an obvious validation path and handler location.
- Existing effect behavior is covered by parity tests before and after extraction.
- Status metadata, status ticking, cleanse policy, and medicine behavior keep the same public outputs.
- The dispatcher remains core-only and deterministic.

### Test Coverage

- Skill effect tests.
- Status effects tests.
- Auto-medicine cleanse and resistance tests.
- Static data validation tests for effect schemas.

### Progress Notes

- Added post-attack and recovery skill effect dispatcher registries in `core/combat/effectPipeline.ts`, replacing the central effect-type switches for guard/protect/armor break/wound/debuff/status and heal/regeneration/cleanse effects.
- Tightened dispatcher registries so each handler is typed to its registered effect key and timed/status duration gates live with the relevant handlers.
- Kept dispatcher coverage aligned with `SKILL_EFFECT_TYPES` through `tests/combat/skillEffects.test.ts`, including a disjointness check so effects cannot be registered in multiple stages.
- Aligned `apply_status` to the validated runtime contract by making skill-effect duration required in the core data type and status estimation helper.
- Added static-data validation coverage for malformed `apply_status` skill effects, including missing statuses, invalid chance/stacks, invalid targets, and missing positive duration.

---

## Epic 53: Battle Recorder And Progression Adapter Contract

### Goal

Keep combat summaries, metrics, and progression rewards stable while internals are split into smaller modules.

### Tasks

- Audit `BattleEvent`, `BattleMetrics`, and contribution fields used by web, balance reports, support-decision tooling, and progression.
- Make the battle recorder the single place that formats combat events and aggregate metrics where practical.
- Keep `resolveStageBattle` focused on building teams, calling combat, and applying progression rewards.
- Add tests for event presentation data needed by web battle summaries.
- Add parity tests proving progression rewards, mastery, equipment drops, and offline/balance consumers still see the same fields.

### Acceptance Criteria

- Combat internals can change without forcing web view-model rewrites.
- `resolveStageBattle` stays a stable adapter between progression and combat.
- Battle event and metric contracts are documented enough for Stage 1.9 UI modularization.
- Save/offline behavior is unaffected by combat refactors.

### Test Coverage

- Battle event view-model tests.
- Progression battle resolution tests.
- Reward, mastery, and equipment drop tests.
- Web state command-path tests for battle resolution.

### Progress Notes

- Added battle event record helpers in `core/combat/battleRecorder.ts` for stable event ids, categories, status ids, and timestamps consumed by web battle logs.
- Updated web battle event views to use recorder-owned event record metadata while keeping headline/detail presentation in the web layer.
- Added recorder contract coverage for every `BattleEvent` type and progression adapter parity coverage for rewards, mastery arrays, equipment drops, battle metrics, contributions, and event records.

---

## Epic 54: Combat Docs And Release Readiness

### Goal

Close Stage 1.8 with updated docs, clear extension guidance, and the Stage 1.7 release-readiness checklist.

### Tasks

- Update `docs/current-implemented-systems.md` with the final Combat Engine V2 structure.
- Update `docs/core-engine-boundary.md` with any new combat entry points or boundary rules.
- Add a short combat pipeline section to `docs/martial-idle-design.md` or a dedicated combat-engine doc.
- Update roadmap notes if Stage 1.8 changes Stage 1.9, 2.0, or 2.1 scope.
- Run the release-readiness checklist before marking Stage 1.8 complete.
- Archive this backlog only after all epics are complete and verification passes.

### Acceptance Criteria

- New contributors can find where to add a skill effect, status hook, damage behavior, or scheduler rule.
- Active docs describe the implemented combat pipeline accurately.
- No active docs point to missing or stale backlog paths.
- Stage closure records required commands, review outcome, browser smoke decision, and any deferred P3s.

### Test Coverage

- No docs-only tests required unless a link-check script is added.
- Manual markdown path checks are acceptable for Stage 1.8 closure.

### Progress Notes

- Updated active onboarding, engine-boundary, design, and roadmap docs for the implemented Combat Engine V2 module structure.
- Added a dedicated Combat Engine V2 contributor guide for scheduler, targeting, damage package, effect dispatcher, status hook, battle recorder, and progression adapter extension points.
- Ran the release-readiness command set: `npm run typecheck`, `npm test`, `npm run build`, `npm run simulate`, `npm run support-decision`, and `git diff --check`.
- Ran a manual markdown link/path check and confirmed there is no duplicate active `docs/stage-1.8-backlog.md` backlog.
- Browser smoke skipped because Epic 54 is docs/closure work and Stage 1.8 did not change visible UI in this epic.
- No deferred P3s remain from the final reviewer loop.
- Archived Stage 1.8 after verification passed.

---

## Closure Decisions

- Representative deterministic combat traces are strict where action order and event timing matter, while balance reports stay tolerant and data-driven.
- The scheduler remains a simple deterministic scan until a future strategy layer proves that a priority queue is worth the complexity.
- Damage packages stay as focused combat internals for now; future public exposure should happen only when Stage 2.1 tactics need it.
- The skill effect dispatcher uses typed handler maps split by pipeline phase.
- Stage 1.8 guarantees stable battle event metadata through `BattleEventRecord`; raw event payload stability remains tied to combat feature needs.
- Targeted balance and combat tests remain the regression contract. `npm run simulate -- --json` snapshots are deferred until report churn justifies snapshot maintenance.

## Closure Summary

Stage/Epic: Stage 1.8 / Epic 54
Scope completed: Combat Engine V2 docs, core boundary updates, roadmap updates, release-readiness checklist, and backlog archival.
Verification: `npm run typecheck`; `npm test`; `npm run build`; `npm run simulate`; `npm run support-decision`; `git diff --check`; manual markdown link/path check.
Browser smoke: skipped; Epic 54 changed docs and closure notes only.
Known budget misses or deferred P3s: existing Black Iron Fort clear-time miss and Demon Cult clear-time/status-pressure misses remain documented through [Balance Budget Gates](../balance-budget-gates.md) and the balance report posture; no deferred P3s.
Archive/docs status: active docs point to the archived Stage 1.8 backlog and the dedicated Combat Engine V2 guide.
Next recommended epic: Stage 1.9 UI modularization.

## Suggested Implementation Order

1. Epic 49: Combat Baselines And Scenario Fixtures
2. Epic 50: Turn Scheduler And Resolution Context
3. Epic 51: Damage Package And Defense Pipeline
4. Epic 52: Skill Effect Dispatcher And Status Hooks
5. Epic 53: Battle Recorder And Progression Adapter Contract
6. Epic 54: Combat Docs And Release Readiness

This order protects behavior first, then extracts the loop in layers, then documents the final extension points before archival.
