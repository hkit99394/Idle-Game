# Stage 2.2 Headless Engine Boundary Audit

## Purpose

Epic 73 defines the core surface that a backend, worker, CLI, or future API layer can call without knowing about React, browser storage, local UI state, or transport details.

This audit is intentionally a contract document. It does not add HTTP handlers, server packages, database models, or new behavior to `core/`.

## Approved Entry Points

Backend and worker callers should start from these public entry points:

| Entry Point | Approved Use |
| --- | --- |
| `core/index.ts` | Package-style barrel for battle, progression, save, offline, data, counterplay, and balance contracts. |
| `core/data/index.ts` | Static data types, assembly, and validation. |
| `core/save/index.ts` | Save schema, creation, parsing, migration, validation, and load transactions. |
| `core/offline/index.ts` | Offline farm and assignment reward preview/application helpers. |
| `core/combat/index.ts` | Pure battle simulation contracts such as `simulateBattle`, battle types, targeting, records, status helpers, and auto-medicine helpers. |
| `core/progression/index.ts` | Progression state, stage resolution, rewards, equipment, assignments, tactics, skill upgrades, levels, roster, and mastery helpers. |
| `core/balance/index.ts` | Structured balance report builders and budget-gate helpers. |
| `core/counterplay/index.ts` | Counterplay preview data builders that are pure, but more presentation-oriented than backend critical. |
| `core/core-balance.ts` | Stable tool-facing balance entry point for scripts and reports. |

Deep imports below focused module indexes should stay out of backend and worker code unless a follow-up epic promotes the helper. Existing focused tests may still deep-import internals when asserting module behavior.

## Current Boundary Findings

- `core/index.ts` re-exports `balance`, `combat`, `counterplay`, `data`, `offline`, `progression`, and `save`.
- Focused `core/*/index.ts` modules expose the current public module surfaces.
- `core/save/index.ts` re-exports `saveSchema`, which re-exports save types, factory helpers, load transactions, migrations, progress validation, and validation helpers.
- A source scan found no `window`, `document`, `localStorage`, `sessionStorage`, `navigator`, React, Vite-only globals, `Date.now`, `new Date`, or `Math.random` usage in `core/`.
- Web state imports core mostly through `../../core`; browser storage and clock calls stay in `web/state/saveStorage.ts`, `web/state/saveToolCommands.ts`, `web/state/reducer.ts`, and web hooks.
- Tools use `core/core-balance.ts`, `core/combat`, and `core/data` for simulations and reports.
- Current deep imports are test-focused combat internals such as `core/combat/damagePackage`, `core/combat/effectPipeline`, and `core/combat/battleRecorder`.

## Headless Workflow Matrix

| Workflow | Current Core API | Pure Core Call | Required Adapter Inputs | Request Shape | Result Shape |
| --- | --- | --- | --- | --- | --- |
| Assemble static data | `buildStaticGameData` from `core/data` | Yes | Static data source chosen by caller | Serializable static data parts keyed by `staticGameDataPartKeys` | `StaticGameData` |
| Validate static data | `validateStaticGameData` from `core/data` | Yes | Static data bundle | `StaticGameData` | `string[]` validation errors |
| Create a new progress state | `createInitialPlayerProgress` from `core/progression` | Yes | Static data bundle | `StaticGameData` | `PlayerProgress` |
| Create current save data | `createSaveData` from `core/save` | Yes | Clock and persistence adapter | `progress`, `nowMs`, optional previous save and save preferences | Current-version `SaveData` |
| Parse/import save without offline rewards | `parseSaveData` from `core/save` | Yes | Raw payload source and error presentation | `SaveValidationData`, raw unknown save payload | Success with cloned current-version `SaveData` and migration metadata, or validation failure |
| Load save with offline rewards | `loadSaveTransaction` from `core/save` | Yes | Clock, raw storage, and persistence write adapter | `SaveLoadTransactionData`, `rawSave`, `nowMs` | Success with candidate `SaveData`, previous save, `changed`, `writeReasons`, offline results, and migration metadata, or validation failure |
| Apply load semantics to parsed save | `applySaveLoadTransaction` from `core/save` | Yes | Clock and persistence write adapter | `SaveLoadTransactionData`, current-version `SaveData`, `nowMs` | Success with candidate `SaveData`, previous save, `changed`, `writeReasons`, and offline results |
| Preview offline farm rewards | `previewOfflineRewards` from `core/offline` | Yes | Caller decides preview duration | Static data slice, progress, selected farm stage, `previewSeconds`, optional config | Success with rewards and multiplier, or missing/invalid farm reason |
| Apply offline farm rewards directly | `applyOfflineRewards` from `core/offline` | Yes | Clock and persistence adapter | Static data slice, progress, selected farm stage, `lastSavedAtMs`, `currentTimeMs`, optional config | Updated progress and rewards, or missing/invalid farm reason |
| Apply offline assignment rewards | `applyOfflineAssignmentRewards` from `core/offline` | Yes | Clock and persistence adapter | Static data slice, progress, `lastSavedAtMs`, `currentTimeMs`, optional config | Updated progress and assignment reward summary |
| Simulate a battle | `simulateBattle` from `core/combat` | Yes | Caller supplies teams and optional seed-like scenario data if added later | `StaticGameData`, player team, enemy team, tactic id, max duration, optional auto-medicine context | `BattleResult` with winner, events, metrics, medicine state, and summaries |
| Resolve a stage battle | `resolveStageBattle` from `core/progression` | Yes | Persistence adapter saves returned progress | `StaticGameData`, `PlayerProgress`, stage id, optional tactic id, max duration, auto-medicine preferences | Success with battle, updated progress, rewards, mastery/equipment changes, or typed failure reason |
| Apply progression commands | Individual `core/progression` functions such as `purchaseUpgrade`, `purchaseSkillUpgrade`, `equipHeroEquipment`, `selectStyleBranch`, `selectPlayerTactic`, `setAssignmentHeroes`, and `setActiveHeroTeam` | Yes | Caller owns command authorization, sequencing, and persistence | Static data slice plus `PlayerProgress` and command-specific ids | Typed success/failure result with returned `PlayerProgress` |
| Generate balance report data | `buildGameBalanceReport`, `buildTacticComparisonReport`, and budget helpers from `core/balance` or `core/core-balance.ts` | Yes | CLI/backend decides formatting, storage, and scheduling | Static data bundle and report options | Structured report data suitable for JSON, CSV, or diagnostics |
| Build counterplay preview data | `buildStageCounterplayPreview` and `buildMedicineCounterplayViewModels` from `core/counterplay` | Yes | Caller owns UI copy placement and presentation | Static data slice, progress/inventory/preferences, stage | Serializable preview/view-model data |

## Adapter Boundaries

Clock adapters own `nowMs`. Core accepts explicit timestamps and should not read wall-clock time. Load adapters should capture one transaction timestamp and pass that same value through parsing, offline reward application, and persistence decisions.

Storage adapters own raw save reads and writes. Core returns a candidate save, `changed`, and ordered `writeReasons`; the adapter decides whether the candidate was committed successfully and how to report failures.

Account identity stays outside `core/`. A backend may associate saves with account ids, device ids, slots, or sessions, but those identifiers should wrap `SaveData` instead of being added to core progress or combat types.

Persistence and idempotency stay outside `core/`. Future cloud adapters must treat `loadSaveTransaction` output as a candidate write. If offline rewards were applied but the write fails, the adapter must avoid presenting uncommitted reward state as durable.

Transport stays outside `core/`. HTTP routes, WebSocket messages, queue payloads, authentication, rate limits, and database models should translate into the request shapes above, call core, then serialize the result.

Static data source selection stays outside `core/`. Backends and workers can choose a bundled data version or loaded data artifact, but should validate the assembled bundle with `validateStaticGameData` before trusting it for simulation or save loading.

## Public Entry Points To Consider Next

- A small `core/progression` command facade may be useful if backend callers need replayable command envelopes. Today the public core functions are backend-safe, but web action names and reducer branches are not a headless API.
- Epic 74 added import-boundary tests for `core/index.ts`, focused `core/*/index.ts` modules, and `core/core-balance.ts`.
- Epic 74 added a Node-like import smoke test that fails if approved core surfaces pull browser, React, Vite, web, or tool dependencies.
- Epic 75 should define the cloud-save envelope around `SaveData`, including account id, save slot id, checksum, created timestamp, updated timestamp, conflict policy, and migration metadata expectations.
- If a future backend needs lower-level combat helpers currently used only by tests, promote those helpers through `core/combat/index.ts` before importing internals from service code.

## Risks And Guardrails

- Deterministic time: offline farm and assignment rewards depend on `updatedAtMs`, `lastOfflineRewardAtMs`, and caller-provided `nowMs`; one load operation should use one timestamp.
- Offline reward replay: core advances reward timestamps in the candidate save when rewards are granted, but persistence failure handling is adapter responsibility.
- Save conflict handling: local/cloud comparisons need a wrapped cloud-save contract before any sync implementation can safely merge or overwrite saves.
- Trust boundary: online boss or leaderboard systems should not trust client-submitted battle results. Epic 77 chose HTTP attempt submission plus polling with server-side deterministic simulation; see [Online Boss Transport Decision](online-boss-transport-decision.md).
- CPU placement: battle simulation and balance reports are pure but can be heavier than simple validation; workers or backends should choose scheduling and timeout policy outside `core/`.
- Deep imports: backend code should not depend on internals that tests currently import for focused assertions. Promote missing APIs before use.

## Epic 74 Handoff

Epic 74 turns this audit into mechanical guarantees:

- `tests/core/engineBoundary.test.ts` import-smokes all approved entry points in a Node-like test runtime.
- The same test fails on browser, React, Vite/test runtime, `web/`, `tools/`, wall-clock, and ambient-random dependencies in `core/`.
- Web, data, and tool callers are guarded to use approved core entry points rather than backend-unsafe deep imports.
- `package.json` remains unchanged while the package is private; docs and tests are the current import guidance.
