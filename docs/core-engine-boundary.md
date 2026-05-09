# Core Engine Boundary

`core/` is the reusable game engine boundary for Path of Jianghu.

## Entry Points

- `core/index.ts` is the stable package-style entry point for web, tools, tests, and future backend callers.
- `core/combat/index.ts`, `core/data/index.ts`, `core/offline/index.ts`, `core/progression/index.ts`, `core/save/index.ts`, and `core/balance/index.ts` expose focused submodule entry points.
- `core/data/staticData.ts` owns the canonical static-data builder. Web, tools, and tests should use that builder instead of hand-assembling `StaticGameData` objects.
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

## Balance And Tooling Boundary

- Balance target definitions and scoring helpers belong in `core/balance`.
- CLI formatting, report printing, and developer workflow concerns belong in `tools/`.
- Balance reports should simulate configured regions from static data order rather than hard-coded region assumptions.
- Tool-only output formats must not leak back into core combat or progression logic.

## Backend Readiness

The backend can reuse battle simulation, progression, offline rewards, save migration, and static data validation by importing from `core/index.ts`. Account storage, cloud sync, authentication, and websocket delivery should wrap the engine instead of moving browser or server concerns into `core/`.
