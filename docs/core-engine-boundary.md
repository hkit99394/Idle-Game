# Core Engine Boundary

`core/` is the reusable game engine boundary for Path of Jianghu.

## Entry Points

- `core/index.ts` is the stable package-style entry point for web, tools, tests, and future backend callers.
- `core/combat/index.ts`, `core/data/index.ts`, `core/offline/index.ts`, `core/progression/index.ts`, `core/save/index.ts`, and `core/balance/index.ts` expose focused submodule entry points.
- `core/combat/index.ts` exposes public combat contracts such as `simulateBattle`, combat data types, status display helpers, scheduler helpers, and battle record helpers. It intentionally keeps some lower-level internals private when public callers should use a higher-level contract instead.
- Combat Engine V2 internals such as `core/combat/damagePackage.ts`, `core/combat/defensivePipeline.ts`, and `core/combat/effectPipeline.ts` are documented ownership points for contributors, not web/tool import paths.
- `core/core-balance.ts` is the stable tool-facing balance entry point for simulated balance reports and budget-gate helpers; external tools should use it instead of deep-importing `core/balance/*`.
- `core/data/staticDataBuilder.ts` owns the canonical static-data builder. `data/staticGameData.ts` is the canonical assembled bundle; web, tools, and tests should use those paths instead of hand-assembling `StaticGameData` objects.
- `core/save/loadTransaction.ts` owns the preferred save-load transaction path for parsing, migration, validation, offline rewards, timestamp advancement, and farm target normalization.

## Dependency Rules

- Core modules can depend on other core modules and serializable static data types.
- Core modules must not import from `web/` or `tools/`.
- Core modules must not use browser runtime APIs such as `window`, `document`, `localStorage`, or `sessionStorage`.
- Core modules must not rely on Vite-only globals or React runtime behavior.
- Web save/storage code owns browser persistence. Core save code owns schema, migration, validation, cloning, normalization, and offline reward semantics.
- Tools may import from `core/`, `data/`, and their own `tools/` helpers, but reusable rules should move back into `core/`.
- Tests should prefer core entry points and the canonical static-data builder so fixture behavior matches web/tool behavior.

## Save Boundary

- Browser storage is an adapter around raw save strings.
- Import/export, startup load, and future backend load should route through the core save transaction path.
- Save migrations belong in `core/save/migrations.ts` and should be covered by migration fixtures.
- Offline rewards must advance the relevant save timestamps during the transaction so reloads cannot duplicate the same interval.

## Static Data Boundary

- Raw JSON lives in `data/`.
- Static data assembly lives in the core data builder.
- Static data validation lives in `core/data/validation`.
- Web and tools can choose when to fail loudly, but they should validate the same assembled shape.

## Combat Boundary

- `simulateBattle` is the public combat simulation contract. Keep browser, storage, React, CLI formatting, and progression mutation out of `core/combat`.
- `resolveStageBattle` in progression is the adapter that builds player/enemy teams, calls combat, and applies rewards. Combat modules should not mutate player progress directly.
- Combat Engine V2 extension points are documented in [Combat Engine V2](combat-engine-v2.md).
- Scheduling rules live in `core/combat/scheduler.ts`; target selection lives in `core/combat/targeting.ts`.
- Damage-like behavior should enter through `core/combat/damagePackage.ts` and `defensivePipeline.ts` so metrics, contribution attribution, guard/protection prevention, Qi Break, and backlash stay aligned.
- Skill effects should route through `core/combat/effectPipeline.ts` handlers and matching static-data validation, not through new branches in the simulator loop.
- Status behavior belongs in `statusEffects.ts`, `statusMetadata.ts`, and `cleansePolicy.ts`; public consumers should use battle record helpers for event status metadata instead of deriving status ids from raw events.
- Stable battle event metadata for web and tools is exposed through `BattleEventRecord`, `createBattleEventRecord`, and `createBattleEventRecords`.
- Tests may deep-import focused combat helpers when they are asserting module behavior, but web, tools, and progression should prefer public core entry points.

## Balance And Tooling Boundary

- Balance target definitions and scoring helpers belong in `core/balance`.
- Tool-facing balance reports should be imported through `core/core-balance.ts` or tool shims, not deep `core/balance/*` paths.
- CLI formatting, report printing, and developer workflow concerns belong in `tools/`.
- Balance reports should simulate configured regions from static data order rather than hard-coded region assumptions.
- Tool-only output formats must not leak back into core combat or progression logic.

## Backend Readiness

The backend can reuse battle simulation, progression, offline rewards, save migration, and static data validation by importing from `core/index.ts`. Account storage, cloud sync, authentication, and websocket delivery should wrap the engine instead of moving browser or server concerns into `core/`.
