# Core Engine Boundary

`core/` is the reusable game engine boundary for Path of Jianghu.

## Entry Points

- `core/index.ts` is the stable package-style entry point for web, tools, and future backend callers.
- `core/combat/index.ts`, `core/data/index.ts`, `core/offline/index.ts`, `core/progression/index.ts`, and `core/save/index.ts` expose focused submodule entry points.

## Dependency Rules

- Core modules can depend on other core modules and serializable static data types.
- Core modules must not import from `web/` or `tools/`.
- Core modules must not use browser runtime APIs such as `window`, `document`, `localStorage`, or `sessionStorage`.
- Web save/storage code owns browser persistence. Core save code owns schema, migration, validation, and cloning.

## Backend Readiness

The backend can reuse battle simulation, progression, offline rewards, save migration, and static data validation by importing from `core/index.ts`. Account storage, cloud sync, authentication, and websocket delivery should wrap the engine instead of moving browser or server concerns into `core/`.
