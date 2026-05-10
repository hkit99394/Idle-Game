# Recommended Roadmap: Stage 1.7 To 2.2

## Purpose

Stage 1.6 completed the Lotus support and Demon Cult counterplay slice and is archived at [Stage 1.6 Backlog](archive/stage-1.6-backlog.md). Stage 1.7 completed foundation hardening and is archived at [Stage 1.7 Backlog](archive/stage-1.7-backlog.md). Stage 1.8 completed Combat Engine V2 and is archived at [Stage 1.8 Backlog](archive/stage-1.8-backlog.md). Stage 1.9 completed UI modularization and is archived at [Stage 1.9 Backlog](archive/stage-1.9-backlog.md). The next roadmap focus is Stage 2.0 content pipeline, then strategy, and backend/PWA readiness.

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

Make new regions, enemies, skills, rewards, and balance budgets easier to author and validate.

### Why This Matters

The game can now support more regions, but content tuning is still partly manual. Before adding several more maps, the project needs stronger content rules and tooling.

### Milestones

- Add region and stage budget data for expected clear-time range, reward curve, status pressure, defense pressure, healing pressure, and boss gate criteria.
- Validate reward progression so later farm stages do not accidentally become worse than earlier farm stages unless intentionally marked.
- Validate stage difficulty curve by region.
- Extend `npm run simulate` to report every region against configured budgets.
- Add a JSON balance export intended for spreadsheet or chart review.
- Add a content readiness checklist for new regions.

### Exit Criteria

- New region data can be checked automatically before UI work begins.
- Normal, elite, and boss stages each have clear budget expectations.
- Balance misses are visible as actionable report lines.
- Content authors can tune data without reading core combat code.

## Stage 2.1: Deeper Player Strategy

### Goal

Add meaningful strategic choices now that the technical foundation can support them.

### Candidate Features

- Formation bonuses by slot and weapon style.
- Tactic presets such as balanced, focus inner, focus outer, protect support, boss burst.
- Manual medicine use or limited battle-control actions.
- Skill branch decisions that change cooldown, target rule, Outer/Inner ratio, or status behavior.
- Better battle summary showing carry, top damage, top breaker, top protector, top healer, and most threatened hero.
- More visible hero identity for Fist, Palm, Leg, Sword, Blade, Staff, Hidden Weapons, and support styles.

### Milestones

- Choose one strategic layer as the main Stage 2.1 feature, preferably tactics or formation bonuses.
- Add data schema and validation for the selected layer.
- Add core tests proving choices change combat outcomes.
- Route new combat behavior through the Stage 1.8 extension points in [Combat Engine V2](combat-engine-v2.md): scheduler rules, targeting rules, damage packages, effect handlers, or status hooks.
- Add UI that makes the choice understandable without heavy explanation text.
- Update balance tooling so new strategy can be measured.

### Exit Criteria

- Players have a real choice that affects battle outcomes.
- The choice is visible in CP, battle summary, or counterplay preview.
- The system does not require backend support.
- Existing content remains playable after retuning.

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

Prepare the Stage 2.0 content-pipeline backlog: define the content budget schema, validation coverage, balance export shape, and authoring checklist before adding more regions.
