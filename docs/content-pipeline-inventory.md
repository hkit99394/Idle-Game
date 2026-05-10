# Content Pipeline Inventory

Stage 2.0 starts from the content pipeline that already exists: JSON content is assembled into `StaticGameData`, validated by core rules, then exercised by simulation and balance reports. This audit records the current surface before later Stage 2.0 epics tighten validation, reports, and export tooling.

Epic 61 does not change tuning or behavior. Known misses below are recorded as tuning debt so stricter gates can be introduced intentionally.

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
| [data/regions.json](../data/regions.json) | `regions` | 5 | Duplicate ids, unlock references, stage references, stage ownership, and `balanceTargets` shape. | Required budget completeness and explicit exceptions are still Stage 2.0 work. |
| [data/stages.json](../data/stages.json) | `stages` | 37 | Duplicate ids, region/enemy/equipment/next-stage references, boss offline-farm guard, non-negative rewards, drop quantity, and enemy formation slot/index checks. | Reward progression, difficulty progression, and farm-target quality are mostly report review. |
| [data/enemies.json](../data/enemies.json) | `enemies` | 26 | Duplicate ids, skill/style references, base stats, level integer, and combat role checks. | Enemy family intent, stage role fit, and difficulty curve are simulation/manual review. |
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
- boss gates for baseline, trained, or farmed states;
- defense and recovery event summaries;
- `Region Budget Gates` with pass/fail reasons from [core/balance/regionBudgetGates.ts](../core/balance/regionBudgetGates.ts).

The region target schema currently lives in `balanceTargets` inside [data/regions.json](../data/regions.json):

- `clearTimeSeconds.normal`, `clearTimeSeconds.elite`, and optional `clearTimeSeconds.boss`;
- `rewardCurve.requireBestFarmRecommendation`;
- `statusPressure`;
- `defensePressure`;
- `healingPressure`;
- `bossGate`.

`npm run simulate -- --json` returns the same report data in machine-readable form, but Stage 2.0 has not yet stabilized a spreadsheet-friendly export contract.

## Known Budget Debt

The current simulator output keeps these misses visible:

| Region | Current miss | Stage 2.0 disposition |
| --- | --- | --- |
| Black Iron Fort | `black_iron_fort_4` clears in `23.4s`, below the configured `25-65s` elite target. | Tuning debt for Epic 64 unless Epic 62 decides an explicit exception is better. |
| Demon Cult Outpost | `demon_cult_outpost_1` clears in `23.4s`, above the configured `5-15s` normal target. | Tuning debt for Epic 64. |
| Demon Cult Outpost | `demon_cult_outpost_3` clears in `45s`, above the configured `20-40s` elite target. | Tuning debt for Epic 64. |
| Demon Cult Outpost | `demon_cult_outpost_4` clears in `66.6s`, above the configured `20-40s` elite target. | Tuning debt for Epic 64. |
| Demon Cult Outpost | `demon_cult_outpost_5` clears in `48s`, above the configured `20-40s` elite target. | Tuning debt for Epic 64. |
| Demon Cult Outpost | Status damage is `1077.06`, above the configured `1000` cap. | Tuning debt for Epic 64. |

These are not accepted silent noise. They are allowed only because the active backlog names them before stricter Stage 2.0 gates land.

## Manual Gaps For Stage 2.0

- Epic 62 should decide which budget fields are required by normal, elite, boss, and farmable stages.
- Epic 62 should add readable exception data if current regions intentionally omit a target.
- Epic 63 should turn reward/farm regressions into validation or report failures with actionable reasons.
- Epic 64 should improve difficulty-trend, spike, and boss-gate reporting before any retune.
- Epic 65 should decide whether JSON-only output is enough or whether a generated CSV/spreadsheet export is required.
- Epic 66 should fold the final content author checklist back into contributor docs.
