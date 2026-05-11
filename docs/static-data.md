# Static Data Loading

Stage and balance data is loaded through one canonical bundle:

- `data/staticGameData.ts` imports the configured JSON files and exports `staticGameDataParts` plus `staticGameData`.
- `core/data/staticDataBuilder.ts` is the only boundary that casts JSON-shaped input into `StaticGameData`.
- `web/gameData.ts`, `tools/staticData.ts`, and `tests/helpers/staticData.ts` re-export the canonical bundle instead of importing JSON directly.

Core code should keep depending on typed `StaticGameData` passed by callers. It should not import from `data/staticGameData.ts`, because `core/` must remain browser-independent and usable as a library.

## Validation

The builder only assembles and types the JSON bundle. Static reference checks still run through `validateStaticGameData(data)`.

Use validation in tests, release checks, and tools that need to fail loudly when configured data is inconsistent. `tests/data/staticDataBuilder.test.ts` confirms the canonical bundle validates cleanly and that representative missing references are caught by validation.

For the current file-by-file content inventory and validation ownership map, see [Content Pipeline Inventory](content-pipeline-inventory.md). For a practical region-change workflow, see [Content Authoring Checklist](content-authoring-checklist.md).

## Content Authoring Workflow

When adding or changing playable content:

1. Update JSON data through the canonical bundle path described above.
2. Add or update static validation for new references, ranges, invariants, reward rules, and budget rules.
3. Add focused tests for new validation behavior.
4. Run `npm run simulate` to review timing, farm recommendations, difficulty spikes, boss gates, and budget checks.
5. Use `npm run --silent simulate -- --export-json` for compact authoring rows, `npm run --silent simulate -- --csv` for spreadsheet review, and `npm run --silent simulate -- --tactics-json` or `--tactics-csv` when tactic outcomes may change.
6. Document any intentional budget miss as an explicit exception or tracked tuning debt.

Do not bypass `StaticGameData` or import raw JSON directly from web, tools, or tests. The builder, validation entry point, simulator, and exports are the shared authoring contract.

## Tactic Presets

Stage 2.1 tactic presets live in [tactics.json](../data/tactics.json) and are part of the canonical `StaticGameData` bundle.

- `balanced` must be the single default tactic and must not define behavior flags, target priorities, or modifiers.
- Non-default tactics must define behavior flags such as `targeting`, `damage`, `defense`, `recovery`, or `medicine`.
- `targetPriorities` must use supported combat target rules.
- `modifiers` must use supported tactic modifier types and validated value ranges.
- A tactic cannot declare a behavior flag without the matching target priority or modifier.

Stage 2.1 completed the full tactic flow: static schema and validation, runtime combat behavior, saved selection, web UI, and tactic comparison exports.

## Adding A Static Data File

When adding a new configured JSON file:

1. Add the file under `data/`.
2. Add the corresponding field to `StaticGameData` in `core/data/types.ts`.
3. Add the field to `staticGameDataPartKeys` in `core/data/staticDataBuilder.ts`.
4. Import and include the JSON file in `data/staticGameData.ts`.
5. Extend `validateStaticGameData` when the new data has references, ranges, or invariants.
6. Add or update focused tests for the new data behavior.

After that, web, CLI tools, and shared tests receive the new data from the same bundle. Before considering the slice ready, run the verification commands in [Content Authoring Checklist](content-authoring-checklist.md).
