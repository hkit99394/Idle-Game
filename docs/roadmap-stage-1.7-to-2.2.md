# Recommended Roadmap: Stage 1.7 To 2.2

## Purpose

Stage 1.6 completed the Lotus support and Demon Cult counterplay slice and is archived at [Stage 1.6 Backlog](archive/stage-1.6-backlog.md). Stage 1.7 completed foundation hardening and is archived at [Stage 1.7 Backlog](archive/stage-1.7-backlog.md). Stage 1.8 completed Combat Engine V2 and is archived at [Stage 1.8 Backlog](archive/stage-1.8-backlog.md). Stage 1.9 completed UI modularization and is archived at [Stage 1.9 Backlog](archive/stage-1.9-backlog.md). Stage 2.0 completed the content pipeline and is archived at [Stage 2.0 Backlog](archive/stage-2.0-backlog.md). Stage 2.1 completed tactic presets as the first deeper player strategy layer and is archived at [Stage 2.1 Backlog](archive/stage-2.1-backlog.md). Stage 2.2 is active at [Stage 2.2 Backlog](stage-2.2-backlog.md), focused on backend/PWA readiness.

The recommended sequence is:

1. Stage 1.8: Combat Engine V2
2. Stage 1.9: UI Modularization
3. Stage 2.0: Content Pipeline
4. Stage 2.1: Deeper Player Strategy
5. Stage 2.2: Backend And PWA Readiness

## Stage 1.7: Foundation Hardening

Status: completed and archived at [Stage 1.7 Backlog](archive/stage-1.7-backlog.md).

### Goal

Clean up the project foundation before adding more systems. This stage should reduce duplicated logic, stale docs, and hidden balance rules.

### Why This Comes Next

The current game has enough combat, progression, save, offline, equipment, medicine, and content systems to become hard to change safely. Stage 1.7 should strengthen the base so later stages move faster.

### Milestones

- Keep save code consolidated around the current exported save schema.
- Add future save migrations only through the current save API and migration fixture path.
- Update active docs so implemented regions, systems, and archives are accurate.
- Keep Stage 1.6 historical context linked through `docs/archive/stage-1.6-backlog.md`.
- Keep a short current-system onboarding page for contributors.
- Expand the shared balance target data with stricter boss, reward, and pressure budgets.
- Add balance gate coverage for every configured region.
- Add a short release-readiness checklist for future stages.

### Exit Criteria

- There is one clear save API for web, tools, tests, and future backend callers.
- No active docs point to missing or stale backlog paths.
- Balance reports explain target misses with shared data-driven criteria.
- `npm test`, `npm run build`, `npm run simulate`, and `npm run support-decision` pass.

### Stage 1.7 Progress Snapshot

- Epic 43 completed the core save-load transaction path and migration fixtures.
- Epic 44 completed static-data builder consolidation.
- Epic 45 completed shared balance budget gates.
- Epic 46 updates active docs and archived-stage references.
- Epic 47 adds a reusable release-readiness checklist for future stage closure.
- Epic 48 adds foundation regression coverage for battle ordering, auto medicine, save replay prevention, static data parity, and balance/status parity.

## Stage 1.8: Combat Engine V2

Status: completed and archived at [Stage 1.8 Backlog](archive/stage-1.8-backlog.md).

### Goal

Refactor combat resolution into a cleaner pipeline so new skill effects, advanced statuses, and richer formations can be added without turning the simulator into one large fragile function.

### Why This Matters

Before Stage 1.8, the simulator already handled targeting, damage, Qi Break, protection, guard, armor break, wound, cleanse, regeneration, metrics, and contributions. Stage 2 systems will need more effects, so the engine needed clearer extension points.

### Milestones

- Completed: split combat into action scheduling, target selection, damage calculation, effect application, status ticking, and metric recording.
- Completed: introduced a damage package model for Outer damage, Inner damage, Qi Break burst, backlash, protection, and prevention.
- Completed: created a skill effect dispatcher so new effect types do not require editing the main action loop.
- Completed: added golden battle trace tests for representative fights.
- Completed: added deterministic scenario fixtures for tank, breaker, striker, support, and status-heavy encounters.
- Completed: preserved current battle outcomes unless a balance change is intentionally approved.

### Exit Criteria

- Simulator behavior is covered by golden traces and focused unit tests.
- Adding a new skill effect mostly means adding an effect handler and validation.
- Battle summary metrics still match existing UI needs.
- No browser or tool code enters `core/`.

### Stage 1.8 Progress Snapshot

- Epic 49 completed combat baselines and scenario fixtures.
- Epic 50 extracted deterministic scheduler helpers and battle runtime setup.
- Epic 51 routed attack, Qi Break, backlash, guard, protection, and attribution through damage packages.
- Epic 52 completed the skill effect dispatcher and status hook split.
- Epic 53 stabilized battle event records, metrics, contribution summaries, and the progression adapter contract.
- Epic 54 closed the stage with Combat Engine V2 docs, archive cleanup, and release-readiness notes.

## Stage 1.9: UI Modularization

Status: completed and archived at [Stage 1.9 Backlog](archive/stage-1.9-backlog.md).

### Goal

Break the web UI and web state into feature modules so future panels and interactions can be added without making the main app harder to scan.

### Why This Matters

The current web state and app shell are functional, but large. Splitting by feature will make later UX work, mobile polish, and debugging much easier.

### Milestones

- Completed: split web view models by feature: battle, map, roster, formation, equipment, upgrades, assignments, counterplay, and save tools.
- Completed: split React panels into feature folders with local components and view-model types.
- Completed: kept core state transitions testable without rendering React through domain action, reducer, command, and save-tool tests.
- Completed: used `BattleEventRecord` and existing progression result contracts as the stable combat/UI boundary while moving web battle presentation into feature modules.
- Completed: recorded browser smoke coverage for continuous fighting, stage selection, save tools, counterplay settings, and 390px narrow viewport checks.
- Completed: added static responsive smoke contracts for the busiest panels.
- Completed: collapsed save diagnostics behind a `Save Diagnostics` panel that opens automatically for errors.

### Exit Criteria

- `web/App.tsx` is mainly composition, not feature implementation.
- `web/state/gameState.ts` no longer owns every view model.
- Main idle loop and save tools are covered by smoke tests.
- UI remains mobile-safe at narrow widths.

### Stage 1.9 Progress Snapshot

- Epic 55 completed web workflow baselines, module inventory, and manual smoke notes.
- Epic 56 moved app panel composition and shell status/save helpers out of `web/App.tsx`.
- Epic 57 split web actions, reducer branches, hook commands, and save-tool commands by domain.
- Epic 58 moved feature view-model builders and view types behind feature-owned boundaries.
- Epic 59 moved panels into `web/features/*`, grouped styling ownership, collapsed diagnostics, and added responsive smoke coverage.
- Epic 60 closed the stage with web UI architecture docs, release-readiness verification, browser smoke results, and archive cleanup.

## Stage 2.0: Content Pipeline

### Goal

Completed: make new regions, enemies, skills, rewards, and balance budgets easier to author and validate.

### Why This Matters

The game can support more regions, and Stage 2.0 made the content pipeline safer before adding several more maps. New content should now move through the documented checklist, static validation, balance reports, compact JSON export, and CSV review output.

### Milestones

- Completed: add region and stage budget data for expected clear-time range, reward curve, status pressure, defense pressure, healing pressure, and boss gate criteria.
- Completed: validate reward progression so later farm stages do not accidentally become worse than earlier farm stages unless intentionally marked.
- Completed: validate stage difficulty curve by region.
- Completed: extend `npm run simulate` to report every region against configured budgets.
- Completed: add compact JSON and CSV balance exports intended for spreadsheet or chart review.
- Completed: add a content readiness checklist for new regions.

### Exit Criteria

- Completed: new region data has a documented authoring checklist before UI work begins.
- Completed: normal, elite, boss, farm, pressure, and boss-gate budgets are validated or explicitly deferred.
- Completed: balance misses, difficulty spikes, boss assumptions, farm recommendation reasons, and reward regressions are visible as report/export lines.
- Completed: content authors can tune data through `npm run simulate`, compact JSON, and CSV exports without reading core combat code.

## Stage 2.1: Deeper Player Strategy

### Goal

Completed: add meaningful strategic choices now that the technical foundation can support them. Stage 2.1 shipped tactic presets and keeps formation bonuses as a later expansion.

### Candidate Features

- Formation bonuses by slot and weapon style.
- Tactic presets such as balanced, focus inner, focus outer, protect support, boss burst.
- Manual medicine use or limited battle-control actions.
- Skill branch decisions that change cooldown, target rule, Outer/Inner ratio, or status behavior.
- Better battle summary showing carry, top damage, top breaker, top protector, top healer, and most threatened hero.
- More visible hero identity for Fist, Palm, Leg, Sword, Blade, Staff, Hidden Weapons, and support styles.

### Milestones

- Completed: choose tactic presets as the main Stage 2.1 feature.
- Completed: add data schema and validation for tactic presets.
- Completed: add core tests proving tactic choices change combat outcomes.
- Completed: route tactic behavior through Stage 1.8 combat extension points in [Combat Engine V2](combat-engine-v2.md): targeting, damage packages, recovery/status resistance, and related metric surfaces.
- Completed: add compact UI that makes the choice understandable without a large explanatory page.
- Completed: update balance tooling so tactic outcomes can be measured through opt-in JSON and CSV exports.

### Exit Criteria

- Completed: players have a real saved tactic choice that affects battle outcomes.
- Completed: the choice is visible in the Strategy panel and battle summary.
- Completed: the system does not require backend support.
- Completed: existing content remains playable without broad retuning; known Black Iron Fort and Demon Cult budget debt remains documented.

## Stage 2.2: Backend And PWA Readiness

### Goal

Prepare the game for cloud save, accounts, mobile install, and optional online boss features without forcing a backend too early.

### Why This Comes After Stage 2.1

The local web prototype should prove the loop and strategy first. Backend work becomes valuable once save integrity, content cadence, and player progression need persistence beyond local storage.

### Milestones

- Define a headless engine API for battle, save validation, offline rewards, and progression actions.
- Package `core/` so it can be imported by a server without web dependencies.
- Add save migration fixtures for every supported save version.
- Add PWA install basics: manifest, icons, offline shell, and safe local save behavior.
- Design a cloud-save model: account id, save slot, version, checksum, updated timestamp, conflict policy.
- Decide whether online boss play needs polling, WebSocket, or turn/result submission.
- Keep WebSocket optional unless live shared combat, chat, or real-time boss state is introduced.

### Exit Criteria

- The same core engine can run in web and backend contexts.
- Save import/export and migration rules are documented enough for cloud save.
- PWA shell works for the local web game.
- Backend scope is clear before implementation begins.

## Suggested Stage Order

| Stage | Theme | Primary Outcome |
| --- | --- | --- |
| 1.7 | Foundation Hardening | Cleaner save/docs/balance foundations |
| 1.8 | Combat Engine V2 | Extensible combat pipeline |
| 1.9 | UI Modularization | Maintainable web feature structure |
| 2.0 | Content Pipeline | Faster and safer region creation |
| 2.1 | Deeper Player Strategy | More meaningful player choices |
| 2.2 | Backend And PWA Readiness | Path toward cloud save and mobile install |

## Recommended Next Action

Begin Epic 75 in the [Stage 2.2 Backlog](stage-2.2-backlog.md): harden save migration coverage and define the cloud-save payload/conflict contract on top of the now-guarded headless core boundary.
