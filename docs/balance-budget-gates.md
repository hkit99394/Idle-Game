# Balance Budget Gates

Region-level budget gates were added in Stage 1.7 to make `npm run simulate` explain tuning misses instead of only printing `ok` or `miss`. Stage 1.8 preserved that budget posture while refactoring combat internals.

Stage 2.0 tracks the current authoring surface and known tuning debt in [Content Pipeline Inventory](content-pipeline-inventory.md) while tightening the static validation contract for future content. Use [Content Authoring Checklist](content-authoring-checklist.md) for the practical region-addition workflow.

## Configuration

Budgets live in each region's required `balanceTargets` entry in `data/regions.json`.

- `clearTimeSeconds`: stage clear-time bands for normal, elite, and optional boss stages.
- `rewardCurve.requireBestFarmRecommendation`: checks the reported farm target against the shared farm recommendation policy.
- `rewardCurve.allowedRegressions`: records intentional farm reward dips by stage, metric, and reason.
- `statusPressure`: checks enemy-applied status applications, player status tick damage, and medicine consumption.
- `defensePressure`: checks guard, armor break, and damage-prevention expectations for defensive regions.
- `healingPressure`: checks healing, cleanse, and recovery-denial expectations for sustain regions.
- `bossGate`: checks expected baseline, trained, or farmed boss outcomes plus optional farm count, training cost, clear-time, medicine, and status-damage limits.
- `budgetExceptions`: named, reasoned deferrals for budget targets that are intentionally not configured yet.

Unsupported budget fields fail static validation. Pressure sections are optional by content style, but any pressure section that is present must define at least one recognized budget field.

## Static Validation Contract

`validateStaticGameData` now derives required budget guidance from the region's configured stages and enemies:

| Content shape | Required budget guidance |
| --- | --- |
| Any region | `balanceTargets` and `clearTimeSeconds` object |
| Normal non-boss stages | `clearTimeSeconds.normal` |
| Elite non-boss stages | `clearTimeSeconds.elite` |
| Farmable non-boss stages | `rewardCurve.requireBestFarmRecommendation: true` |
| Enemy skills that apply statuses | `statusPressure` |
| Boss stages | `bossGate` with at least one of `baselineResult`, `trainedResult`, or `farmedResult` |
| Any boss result expected to clear | `bossGate.clearTimeSeconds`, `clearTimeSeconds.boss`, or an explicit `boss_clear_time_target` exception |

Contradictory budgets fail validation:

- `rewardCurve.requireBestFarmRecommendation: true` is invalid when the region has no farmable stages.
- Later farmable stages cannot regress on weighted farm score, silver, cultivation, herbs, Combat XP, or mastery yield unless the exact stage and metric are listed in `rewardCurve.allowedRegressions`.
- `bossGate.maxFarmClears` and `bossGate.maxTrainingCost` require `bossGate.farmedResult`.
- `bossGate.clearTimeSeconds` requires at least one boss result to expect `player_clear`.
- `min` values cannot exceed `max` values, and all numeric budget limits must be finite and non-negative where applicable.

Use `rewardCurve.allowedRegressions` for reward dips that are part of the authored curve:

```json
{
  "stageId": "greenline_approach_9",
  "metrics": ["farmScore", "combatExperience", "mastery"],
  "reason": "Pre-boss normal stage trades lower Combat XP and mastery yield for higher silver and cultivation."
}
```

Regression allowances must reference farmable non-boss stages, use supported metrics, include a reason, and match a real regression. Stale allowances fail validation.

Use `budgetExceptions` only for named deferrals that should remain visible in data:

```json
{
  "type": "boss_clear_time_target",
  "stageId": "black_iron_foundry_7",
  "reason": "Farmed counterplay timing remains tuning debt until Epic 64 reviews boss gate reports."
}
```

An exception must reference a boss stage in the same region, include a non-empty reason, and is rejected once a boss clear-time target is configured.

The simulator counts status pressure from enemy-applied `status_apply` events and `status_tick` damage against player combatants. Player-applied effects such as armor break are still shown in defensive summaries, but they do not inflate enemy status-pressure gates.

## Current Gate Intent

- Greenline Approach should pass tutorial timing, recommend the best farm route, and keep the gatekeeper blocked until trained.
- Veil District should pass timing and status-pressure budgets while clearing its gatekeeper baseline.
- Black Iron Foundry should exercise defense mechanics and require farmed/trained counterplay for the gatekeeper. The current report intentionally calls out `black_iron_foundry_4` as below its elite clear-time band, and the boss clear-time target remains deferred tuning debt.
- Lotus Clinic should exercise healing and purge mechanics and then clear through farmed support growth. The boss clear-time target remains deferred tuning debt.
- Redline Outpost should show status-heavy corruption pressure. Current tuning intentionally reports clear-time misses on several stages and a status-damage budget miss so the next balance pass has precise handles.

## Reading Report Sections

`npm run simulate` includes a `Region Difficulty Curve` section before the boss-gate summaries. Each region line reports the clear trend, hold/unresolved counts, target issues, and detected spikes. `issues` are target failures that should be fixed or explicitly tracked. `spikes` are large clear-time jumps between targeted player clears; `fail` spikes also miss their configured target, while `watch` spikes are useful tuning handles that still fit the target band.

The `Region Boss Gate Assumptions` section expands each evaluated boss scenario:

- `baseline` is the immediate boss attempt before extra farming or training.
- `trained` is an explicit training-plan attempt, currently used by Greenline Approach.
- `farmed` is the region farm-and-affordable-training attempt used when a later boss blocks progression.
- `medicine`, `status damage`, `farms`, and `training` show the counterplay assumptions behind the result.

Use the assumptions section when a boss gate passes technically but feels suspicious: a clear with high training cost, high status damage, or unexpected medicine use is still a tuning signal.

## Release Use

Run:

```sh
npm run simulate
```

Review `Region Difficulty Curve`, `Region Boss Gate Assumptions`, and `Region Budget Gates` together. Use active sources as the release authority for known tuning debt: [Content Pipeline Inventory](content-pipeline-inventory.md), this budget-gates guide, configured `balanceTargets`, and the simulator budget output must agree on the accepted miss. Archived backlogs are historical closure evidence only; they do not authorize a current release exception by themselves. Otherwise, treat the failure as a balance regression.

For the full debug JSON used by low-level checks, run:

```sh
npm run --silent simulate -- --json
```

Each region includes `budgetChecks` with `id`, `label`, `status`, and `reason`.
Each region also includes `difficultyCurve` and `bossGateAssumptions` for authoring tools that need stage-level issue lines or boss-gate tuning inputs.

For stable authoring JSON, run:

```sh
npm run --silent simulate -- --export-json
```

This compact export has `schemaVersion: 3` and four top-level tables:

- `regions` for region totals, farm recommendations, mastery milestones, and pressure summaries.
- `stages` for stage timing, rewards, farm recommendation markers, difficulty issues, difficulty spikes, and pressure fields.
- `budgetChecks` for one row per configured region budget check.
- `bossGateAssumptions` for baseline, trained, and farmed boss-gate rows.

Stage 2.6 schema version 3 keeps canonical ids as primary fields and adds temporary legacy id context for report comparison. Region/stage rows retain legacy region/stage ids from Stage 2.5, and stage rows now include temporary legacy enemy/status id columns while the tactic comparison export includes temporary legacy tactic/baseline tactic id columns.

For spreadsheet review, run:

```sh
npm run --silent simulate -- --csv
```

The CSV is a generated stage-row export. [Balance Template CSV](balance-template.csv) remains a hand-authored reference template for planning fields and notes, not the generated review artifact.

For a complete region-readiness pass, follow [Content Authoring Checklist](content-authoring-checklist.md) after reviewing these budget sections.
