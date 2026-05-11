# Content Pipeline Inventory

Stage 2.0 closed with a content pipeline where JSON content is assembled into `StaticGameData`, validated by core rules, then exercised by simulation, balance reports, compact JSON exports, and generated CSV review output. This inventory records the current authoring surface and remaining tuning debt.

Known misses below are recorded as tuning debt so future tuning passes can handle them intentionally.

## Current Authoring Contract

- [data/staticGameData.ts](../data/staticGameData.ts) imports the configured JSON files and exports the canonical bundle.
- [core/data/staticDataBuilder.ts](../core/data/staticDataBuilder.ts) defines the part-key list used by web, tools, and tests.
- [core/data/types.ts](../core/data/types.ts) defines the `StaticGameData` schema and content field types.
- [core/data/validateData.ts](../core/data/validateData.ts) is the static validation entry point.
- [core/balance/simulatedBalanceReport.ts](../core/balance/simulatedBalanceReport.ts) and `npm run simulate` are the current dynamic balance gate.
- [docs/static-data.md](static-data.md) documents the canonical bundle workflow.
- [docs/balance-budget-gates.md](balance-budget-gates.md) documents the current region budget fields and release posture.

## Data Inventory

| Source | Field | Count | Current automated coverage | Manual or report-only gap |
| --- | --- | ---: | --- | --- |
| [data/regions.json](../data/regions.json) | `regions` | 5 | Duplicate ids, unlock references, stage references, stage ownership, required `balanceTargets`, stage-derived budget fields, unsupported budget keys, and explicit budget exceptions. | Reward and difficulty quality are protected by validation plus balance report/export review. |
| [data/stages.json](../data/stages.json) | `stages` | 37 | Duplicate ids, region/enemy/equipment/next-stage references, boss offline-farm guard, non-negative rewards, drop quantity, and enemy formation slot/index checks. | Reward progression, difficulty progression, and farm-target quality are reviewed through validation, reports, and generated exports. |
| [data/enemies.json](../data/enemies.json) | `enemies` | 26 | Duplicate ids, skill/style references, base stats, level integer, and combat role checks. | Enemy family intent, stage role fit, and difficulty curve are reviewed through simulation output. |
| [data/heroes.json](../data/heroes.json) | `heroes` | 5 | Duplicate ids, skill/style references, base stats, combat role, and unlock references. | Roster composition, CP curve, and `passiveIds` are not tied to a passive catalog yet. |
| [data/skills.json](../data/skills.json) | `skills` | 28 | Duplicate ids, cooldown/multiplier ranges, target rules, skill effect types, status refs, chance, stacks, duration, and effect targets. | Skill power identity and cross-skill progression are only visible through combat and balance reports. |
| [data/statusEffects.json](../data/statusEffects.json) | `statusEffects` | 5 | Duplicate ids, category, duration, stacks, stack policy, dispel tags, tick interval, and effect keys. | Status-pressure severity is judged through simulation budgets. |
| [data/medicines.json](../data/medicines.json) | `medicines` | 3 | Duplicate ids, stage unlock refs, max carry, effect type, cleanse tags, max count, resistance value, and duration. | Auto-use policy, inventory pressure, and expected medicine spend are report-driven. |
| [data/equipment.json](../data/equipment.json) | `equipment` | 14 | Duplicate ids, slot, rarity, allowed styles, set refs, effects, and affixes. | Drop economy, CP value, and set/item pacing are not strict validation gates. |
| [data/equipmentSets.json](../data/equipmentSets.json) | `equipmentSets` | 1 | Duplicate ids, set names, piece counts, duplicate piece tiers, and bonus effects. | Set power curve and region placement remain manual. |
| [data/upgrades.json](../data/upgrades.json) | `upgrades` | 5 | Duplicate ids, art, cost ranges, effect stats, effect mode, flat-mode limits, and value checks. | Cost affordability and pacing are balance-report concerns. |
| [data/skillUpgrades.json](../data/skillUpgrades.json) | `skillUpgrades` | 5 | Duplicate ids, skill refs, cultivation cost resource, cost ranges, max level, numeric effects, and added skill-effect validation. | Upgrade-curve quality is not validated beyond shape and references. |
| [data/assignments.json](../data/assignments.json) | `assignments` | 4 | Duplicate ids, type, duration bucket, unlock refs, roles, styles, reward refs, reward quantities, and at least one reward. | Offline reward economy and assignment usefulness remain manual/simulation review. |
| [data/mastery.json](../data/mastery.json) | `mastery` | 1 | Threshold experience is sorted by increasing value. | Bonus type semantics and target pacing are not strict validation gates. |
| [data/formations.json](../data/formations.json) | `formations` | 1 | Duplicate ids, supported slots, and duplicate slots. | Tactical value and UI usefulness are manual/combat review. |
| [data/styles.json](../data/styles.json) | `styles` | 7 | Duplicate ids, style id enum, bonus numeric values, branch unlock refs, hidden flag, branch effects, stats, and effect values. | Branch identity and style progression quality are manual review. |

## Validation Map

| Area | Validation owner | Protected content |
| --- | --- | --- |
| Shared ids and references | [core/data/validateData.ts](../core/data/validateData.ts), [core/data/validation/shared.ts](../core/data/validation/shared.ts) | Duplicate ids, lookup indexes, base stats, combat roles, and unlock conditions. |
| Combat content | [core/data/validation/combat.ts](../core/data/validation/combat.ts) | Hero/enemy skill and style refs, enemy levels, skills, status effects, and medicines. |
| Progression content | [core/data/validation/progression.ts](../core/data/validation/progression.ts) | Region-stage links, stage refs, stage rewards/drops, enemy formations, formations, and region balance-target shape. |
| Growth content | [core/data/validation/growth.ts](../core/data/validation/growth.ts) | Assignments, upgrades, skill upgrades, style definitions, and added skill effects. |
| Equipment content | [core/data/validation/equipment.ts](../core/data/validation/equipment.ts) | Equipment slots, rarity, style/set refs, item effects, affixes, and set bonuses. |
| Bundle alignment | [tests/data/staticDataBuilder.test.ts](../tests/data/staticDataBuilder.test.ts) | Canonical bundle sharing across data, web, tools, and tests. |
| Detailed validation coverage | [tests/data/validateData.test.ts](../tests/data/validateData.test.ts) | Representative validation failures across static content domains. |

## Balance And Simulation Coverage

`npm run simulate` is the current author-facing budget report. It uses [core/balance/simulatedBalanceReport.ts](../core/balance/simulatedBalanceReport.ts), formats through [tools/balance/formatReport.ts](../tools/balance/formatReport.ts), and includes:

- stage results, clear times, formations, rewards, and target bands;
- region farm recommendations;
- mastery milestones;
- difficulty-curve summaries with trend counts, target misses, and spike reasons;
- boss gates for baseline, trained, or farmed states;
- boss-gate assumptions with medicine use, status damage, farm clears, and training cost;
- defense and recovery event summaries;
- `Region Budget Gates` with pass/fail reasons from [core/balance/regionBudgetGates.ts](../core/balance/regionBudgetGates.ts).

The region target schema currently lives in `balanceTargets` inside [data/regions.json](../data/regions.json):

- `clearTimeSeconds.normal`, `clearTimeSeconds.elite`, and optional `clearTimeSeconds.boss`;
- `rewardCurve.requireBestFarmRecommendation` and `rewardCurve.allowedRegressions`;
- `statusPressure`;
- `defensePressure`;
- `healingPressure`;
- `bossGate`.
- `budgetExceptions`.

`npm run simulate -- --json` returns the full debug report data in machine-readable form. For review tooling, `npm run --silent simulate -- --export-json` returns a stable compact authoring export with `schemaVersion`, `regions`, `stages`, `budgetChecks`, and `bossGateAssumptions`. `npm run --silent simulate -- --csv` returns spreadsheet-friendly stage rows with the fields authors compare most often.

## Known Budget Debt

The current simulator output keeps these misses visible:

| Region | Current miss | Stage 2.0 disposition |
| --- | --- | --- |
| Black Iron Fort | `black_iron_fort_4` clears in `23.4s`, below the configured `25-65s` elite target. | Deferred tuning debt; visible in `Region Difficulty Curve` and `Region Budget Gates`. |
| Demon Cult Outpost | `demon_cult_outpost_1` clears in `23.4s`, above the configured `5-15s` normal target. | Deferred tuning debt; visible in `Region Difficulty Curve` and `Region Budget Gates`. |
| Demon Cult Outpost | `demon_cult_outpost_3` clears in `45s`, above the configured `20-40s` elite target. | Deferred tuning debt; visible in `Region Difficulty Curve` and `Region Budget Gates`. |
| Demon Cult Outpost | `demon_cult_outpost_4` clears in `66.6s`, above the configured `20-40s` elite target. | Deferred tuning debt; visible in `Region Difficulty Curve` and `Region Budget Gates`. |
| Demon Cult Outpost | `demon_cult_outpost_5` clears in `48s`, above the configured `20-40s` elite target. | Deferred tuning debt; visible in `Region Difficulty Curve` and `Region Budget Gates`. |
| Demon Cult Outpost | Status damage is `1077.06`, above the configured `1000` cap. | Deferred tuning debt; visible in `Region Budget Gates` and boss-gate assumption status-damage fields. |

These are not accepted silent noise. They are allowed only because the archived Stage 2.0 backlog names them as deferred tuning debt.

## Stage 2.0 Closure Notes

- Epic 62 defined the required budget fields for normal, elite, boss, and farmable stages.
- Epic 62 added readable `boss_clear_time_target` exceptions for current boss clear-time deferrals.
- Epic 63 turned unmarked reward/farm regressions into validation failures and added farm recommendation reasons to reports.
- Epic 64 added difficulty-trend, spike, and boss-gate assumption reporting before any retune.
- Epic 65 added compact JSON and generated CSV review exports while keeping `docs/balance-template.csv` as a hand-authored reference template.
- Epic 66 folded the final [Content Authoring Checklist](content-authoring-checklist.md) back into contributor docs and archived the Stage 2.0 backlog.
- The remaining manual gap is tuning judgment: current Black Iron Fort and Demon Cult misses stay visible in reports until a later balance pass retunes or explicitly reclassifies them.
