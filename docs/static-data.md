# Static Data Loading

Stage and balance data is loaded through one canonical bundle:

- `data/staticGameData.ts` imports the configured JSON files and exports `staticGameDataParts` plus `staticGameData`.
- `core/data/staticDataBuilder.ts` is the only boundary that casts JSON-shaped input into `StaticGameData`.
- `web/gameData.ts`, `tools/staticData.ts`, and `tests/helpers/staticData.ts` re-export the canonical bundle instead of importing JSON directly.

Core code should keep depending on typed `StaticGameData` passed by callers. It should not import from `data/staticGameData.ts`, because `core/` must remain browser-independent and usable as a library.

## Validation

The builder only assembles and types the JSON bundle. Static reference checks still run through `validateStaticGameData(data)`.

Use validation in tests, release checks, and tools that need to fail loudly when configured data is inconsistent. `tests/data/staticDataBuilder.test.ts` confirms the canonical bundle validates cleanly and that representative missing references are caught by validation.

## Adding A Static Data File

When adding a new configured JSON file:

1. Add the file under `data/`.
2. Add the corresponding field to `StaticGameData` in `core/data/types.ts`.
3. Add the field to `staticGameDataPartKeys` in `core/data/staticDataBuilder.ts`.
4. Import and include the JSON file in `data/staticGameData.ts`.
5. Extend `validateStaticGameData` when the new data has references, ranges, or invariants.
6. Add or update focused tests for the new data behavior.

After that, web, CLI tools, and shared tests receive the new data from the same bundle.
