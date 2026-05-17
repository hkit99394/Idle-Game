# Content Pipeline Inventory

Stage 2.0 closed with a content pipeline where JSON content is assembled into `StaticGameData`, validated by core rules, then exercised by simulation, balance reports, compact JSON exports, and generated CSV review output. This inventory records the current authoring surface and remaining tuning debt.

Known misses below are recorded as tuning debt so future tuning passes can handle them intentionally.

Stage 3.0 added the first post-migration mechanic as data-driven combat content: the `cognitive_intrusion` status and Azure Pulse Monk's `context_shock_refinement` upgrade hook. The addition uses existing status, skill-upgrade, simulator, and report surfaces rather than changing save or export schemas.

Stage 3.1 added the first District Heat authoring proof as report-only balance projection. It appears in `npm run simulate` and full debug JSON, while stable compact JSON/CSV exports, save data, cloud save payloads, and live web UI remain heat-free until a later schema and player-facing mechanic decision.

Stage 3.2 Slice 98.2 added report-only Offline Parity evidence for recommended farm routes. Slice 98.3 classified those rows as `inversion`, `watch`, or `acceptable` and deferred live offline formula changes. Slice 98.4 triaged Redline live-heat blockers, Slice 98.5 applied the approved Redline target, enemy, stage, and status-pressure tuning, Slice 98.6 chose the `report_only` District Heat promotion posture, and Slice 98.7 archived the milestone. Stage 3.3 Slice 99.3 now implements the target-derived offline reward estimate chosen in Slice 99.2, moving current recommended farms to `acceptable` while keeping parity evidence report-only and stable compact/tactic exports unchanged. Slice 99.5 keeps current heat runtime report-only, and [Stage 3.4 Backlog](stage-3.4-backlog.md) is active for the non-punitive warning contract.

## Current Authoring Contract

- [data/staticGameData.ts](../data/staticGameData.ts) imports the configured JSON files and exports the canonical bundle.
- [core/data/staticDataBuilder.ts](../core/data/staticDataBuilder.ts) defines the part-key list used by web, tools, and tests.
- [core/data/types.ts](../core/data/types.ts) defines the `StaticGameData` schema and content field types.
- [core/data/validateData.ts](../core/data/validateData.ts) is the static validation entry point.
- [core/balance/simulatedBalanceReport.ts](../core/balance/simulatedBalanceReport.ts) and `npm run simulate` are the current dynamic balance gate.
- [docs/static-data.md](static-data.md) documents the canonical bundle workflow.
- [docs/balance-budget-gates.md](balance-budget-gates.md) documents the current region budget fields and release posture.
- [docs/progression-pacing-roadmap.md](progression-pacing-roadmap.md) records the target-time roadmap for stages, power, offline pacing, boss gates, and milestone timing.

## Data Inventory

| Source | Field | Count | Current automated coverage | Manual or report-only gap |
| --- | --- | ---: | --- | --- |
| [data/regions.json](../data/regions.json) | `regions` | 5 | Duplicate ids, unlock references, stage references, stage ownership, required `balanceTargets`, stage-derived budget fields, unsupported budget keys, and explicit budget exceptions. | Reward and difficulty quality are protected by validation plus balance report/export review. |
| [data/stages.json](../data/stages.json) | `stages` | 37 | Duplicate ids, region/enemy/equipment/next-stage references, boss offline-farm guard, non-negative rewards, drop quantity, and enemy formation slot/index checks. | Reward progression, difficulty progression, and farm-target quality are reviewed through validation, reports, and generated exports. |
| [data/enemies.json](../data/enemies.json) | `enemies` | 26 | Duplicate ids, skill/style references, base stats, level integer, and combat role checks. | Enemy family intent, stage role fit, and difficulty curve are reviewed through simulation output. |
| [data/heroes.json](../data/heroes.json) | `heroes` | 5 | Duplicate ids, skill/style references, base stats, combat role, and unlock references. | Roster composition, CP curve, and `passiveIds` are not tied to a passive catalog yet. |
| [data/skills.json](../data/skills.json) | `skills` | 28 | Duplicate ids, cooldown/multiplier ranges, target rules, skill effect types, status refs, chance, stacks, duration, and effect targets. | Skill power identity and cross-skill progression are only visible through combat and balance reports. |
| [data/tactics.json](../data/tactics.json) | `tactics` | 6 | Duplicate ids, balanced default, names, descriptions, behavior flags, target priorities, modifier types/ranges, and contradictory fields. | Combat behavior is reviewed through tactic tests and opt-in tactic comparison exports; player selection persists through save migration and web state. |
| [data/statusEffects.json](../data/statusEffects.json) | `statusEffects` | 6 | Duplicate ids, category, duration, stacks, stack policy, dispel tags, tick interval, and effect keys including `cognitiveDamageTakenMultiplier`. | Status-pressure severity and Intrusion pacing are judged through simulation budgets and focused combat regressions. |
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
| Combat content | [core/data/validation/combat.ts](../core/data/validation/combat.ts) | Hero/enemy skill and style refs, enemy levels, skills, tactics, status effects, and medicines. |
| Progression content | [core/data/validation/progression.ts](../core/data/validation/progression.ts) | Region-stage links, stage refs, stage rewards/drops, enemy formations, formations, and region balance-target shape. |
| Growth content | [core/data/validation/growth.ts](../core/data/validation/growth.ts) | Assignments, upgrades, skill upgrades, style definitions, and added skill effects. |
| Equipment content | [core/data/validation/equipment.ts](../core/data/validation/equipment.ts) | Equipment slots, rarity, style/set refs, item effects, affixes, and set bonuses. |
| Bundle alignment | [tests/data/staticDataBuilder.test.ts](../tests/data/staticDataBuilder.test.ts) | Canonical bundle sharing across data, web, tools, and tests. |
| Detailed validation coverage | [tests/data/validateData.test.ts](../tests/data/validateData.test.ts) | Representative validation failures across static content domains. |

## Balance And Simulation Coverage

`npm run simulate` is the current author-facing budget report. It uses [core/balance/simulatedBalanceReport.ts](../core/balance/simulatedBalanceReport.ts), formats through [tools/balance/formatReport.ts](../tools/balance/formatReport.ts), and includes:

- stage results, clear times, formations, rewards, and target bands;
- region farm recommendations;
- report-only Offline Parity rows with active/offline reward-rate ratios and `inversion`, `watch`, or `acceptable` classifications for recommended farm routes;
- report-only District Heat projection by district and recommended farm route;
- report-only District Heat promotion decision with promotion gates and save/cloud/web/export/reward boundaries;
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

`npm run simulate -- --json` returns the full debug report data in machine-readable form, including the region-level report-only `offlineParity`, region-level `districtHeatProjection`, and report-only `districtHeatPromotionDecision`. For review tooling, `npm run --silent simulate -- --export-json` returns a stable compact authoring export with `schemaVersion`, `regions`, `stages`, `budgetChecks`, and `bossGateAssumptions`. `npm run --silent simulate -- --csv` returns spreadsheet-friendly stage rows with the fields authors compare most often. Stage 2.6 authoring export schema version `3` keeps canonical content ids primary and adds temporary legacy enemy/status id context for before-and-after review. Stage 3.3 Slice 99.3 keeps Offline Parity and District Heat out of compact JSON/CSV exports, while the live offline reward formula now uses the selected route's target-band midpoint. Slice 98.5 resolved the default Redline blockers; Slice 99.4 resolved the remaining Black Iron visible debt; Slice 99.5 keeps current District Heat runtime report-only; Stage 3.4 is active to decide warning copy and boundaries before any stable export or live UI change.

Stage 2.7 save-field migration does not change the static content reward schema or generated balance export reward columns. Simulator and support-decision tooling should consume current runtime progress/save fields when they read progress, but authored rewards and report columns such as `reward_silver`, `reward_cultivation`, `reward_herbs`, and `reward_combat_experience` remain static authoring metrics until a later balance/report schema migration explicitly changes them.

The tactic comparison exports remain opt-in and separate from the default report and stage-row authoring export:

- `npm run --silent simulate -- --tactics-json` returns stable rows for every configured stage and tactic.
- `npm run --silent simulate -- --tactics-csv` returns the same rows for spreadsheet review.
- Tactic rows include canonical tactic ids, temporary legacy tactic/baseline tactic ids, baseline result, result changes, duration deltas, target-status changes, `budgetShift`, pressure metrics, and contribution metric deltas.
- Stage 2.8 tactic comparison schema version `4` uses current `playerKineticDamage` / `playerCognitiveDamage` JSON fields and `player_kinetic_damage` / `player_cognitive_damage` CSV columns as the primary damage-channel contract. Stage 2.9.1 kept temporary legacy `playerOuterDamage` / `playerInnerDamage` fields and `player_outer_damage` / `player_inner_damage` columns for one more review cycle because no current-only downstream comparison artifact is recorded yet.

The active balance report is stage and region focused. It does not yet answer the longer-form pacing question of where a player should be after 5 minutes, 15 minutes, 1 hour, Day 1, Day 3, or Day 7. Use [Progression Pacing Roadmap](progression-pacing-roadmap.md) as the planning authority for that next layer until timeline simulation tooling exists.

## Known Budget Debt

The current simulator output has no active known budget miss carried as visible debt:

| Region | Current result | Current disposition |
| --- | --- | --- |
| Black Iron Foundry | `black_iron_foundry_4` clears in `45s`, inside the configured `25-65s` elite target. | Resolved by Slice 99.4 with a stage-local `ironwall_sentry` backline tune; no current miss. |

This section is still the active authority for any future known debt, alongside [balance-budget-gates.md](balance-budget-gates.md), the configured `balanceTargets`, and the current simulator `Region Difficulty Curve` and `Region Budget Gates` output. The archived [Stage 2.0 Backlog](archive/stage-2.0-backlog.md) and [Stage 2.1 Backlog](archive/stage-2.1-backlog.md) are historical closure evidence that the old Black Iron miss was deliberately carried forward until Slice 99.4 resolved it.

Stage 3.0 did not retune these budgets. Its simulator review confirmed the same Black Iron Foundry and Redline Outpost misses remain visible while Intrusion's focused regression proves the new mechanic changes AI Overload timing.

Stage 3.1 Slice 97.3 classified the Black Iron and Redline misses as acceptable for report-only District Heat projection, provided they remained visible by stable ids in the same simulator/export run. Slice 98.5 resolved the Redline blockers, Slice 99.3 resolved current offline parity inversions with a target-derived formula, and Slice 99.4 resolved the remaining Black Iron debt. Slice 99.5 reruns the promotion gates and keeps the current runtime report-only; Stage 3.4 now owns the non-punitive warning contract.

Stage 3.2 Slice 98.5 resolved the Redline live-heat blocker set:

| Region | Current result | Current disposition |
| --- | --- | --- |
| Redline Outpost | `redline_outpost_1` clears in `23.4s` against the reclassified `18-25s` normal target. | Resolved as a late-region status opener, not tutorial-speed normal pacing. |
| Redline Outpost | `redline_outpost_3` clears in `40s` against the `19-40s` elite target. | Resolved through Marrow Lock enemy tuning. |
| Redline Outpost | `redline_outpost_4` clears in `22s` against the `19-40s` elite target. | Resolved through the approved Burning Blood Hall formation trim plus Redline enemy tuning. |
| Redline Outpost | `redline_outpost_5` clears in `40s` against the `19-40s` elite target. | Resolved through shared Burning Blood tuning. |
| Redline Outpost | Status damage is `785.81`, below the configured `1000` cap. | Resolved through the Corruption tick tune; no medicine is consumed. |

## Tactic Comparison Notes

Epic 71 did not retune content. The tactic comparison export keeps known debt visible and adds row-level shift labels:

- After Slice 98.5, `redline_outpost_3` baseline is `targetStatus: pass`; `context_break` and `gatekeeper_burst` also pass it, but they are no longer needed to fix the default route.
- `redline_outpost_7` is untargeted by clear-time budgets, but `context_break` and `gatekeeper_burst` currently change the baseline `player_clear` into `enemy_hold`, marked as `budgetShift: new_miss`.
- `long_stabilization` preserves the Redline boss clear while reducing Redline total status damage from `785.81` to `583.77` with no `new_miss`, making it the safest benchmark for future status-pressure review.
- `kinetic_crush` no longer creates Redline tactic-comparison misses after the `19s` elite lower-bound reclassification, but it also no longer reduces Redline total status damage, so it is not a status-pressure fix.

## Stage 2.0 Closure Notes

- Epic 62 defined the required budget fields for normal, elite, boss, and farmable stages.
- Epic 62 added readable `boss_clear_time_target` exceptions for current boss clear-time deferrals.
- Epic 63 turned unmarked reward/farm regressions into validation failures and added farm recommendation reasons to reports.
- Epic 64 added difficulty-trend, spike, and boss-gate assumption reporting before any retune.
- Epic 65 added compact JSON and generated CSV review exports while keeping `docs/balance-template.csv` as a hand-authored reference template.
- Epic 66 folded the final [Content Authoring Checklist](content-authoring-checklist.md) back into contributor docs and archived the Stage 2.0 backlog.
- The remaining manual gap is tuning judgment: current Black Iron Foundry debt stays visible in reports until a later balance pass retunes or explicitly reclassifies it, and future Redline regressions should be treated the same way.
