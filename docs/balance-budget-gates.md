# Balance Budget Gates

Region-level budget gates were added in Stage 1.7 to make `npm run simulate` explain tuning misses instead of only printing `ok` or `miss`. Stage 1.8 preserved that budget posture while refactoring combat internals.

Stage 2.0 tracks the current authoring surface and known tuning debt in [Content Pipeline Inventory](content-pipeline-inventory.md) before adding stricter content-pipeline gates.

## Configuration

Budgets live in each region's `balanceTargets` entry in `data/regions.json`.

- `clearTimeSeconds`: stage clear-time bands for normal, elite, and optional boss stages.
- `rewardCurve.requireBestFarmRecommendation`: checks the reported farm target against the shared farm recommendation policy.
- `statusPressure`: checks enemy-applied status applications, player status tick damage, and medicine consumption.
- `defensePressure`: checks guard, armor break, and damage-prevention expectations for defensive regions.
- `healingPressure`: checks healing, cleanse, and recovery-denial expectations for sustain regions.
- `bossGate`: checks expected baseline, trained, or farmed boss outcomes plus optional farm count, training cost, clear-time, medicine, and status-damage limits.

The simulator counts status pressure from enemy-applied `status_apply` events and `status_tick` damage against player combatants. Player-applied effects such as armor break are still shown in defensive summaries, but they do not inflate enemy status-pressure gates.

## Current Gate Intent

- Bamboo Road should pass tutorial timing, recommend the best farm stage, and keep the boss blocked until trained.
- Mist Valley should pass timing and status-pressure budgets while clearing its boss baseline.
- Black Iron Fort should exercise defense mechanics and require farmed/trained counterplay for the boss. The current report intentionally calls out `black_iron_fort_4` as below its elite clear-time band.
- Lotus Monastery should exercise healing and cleanse mechanics and then clear through farmed support growth.
- Demon Cult Outpost should show status-heavy pressure. Current tuning intentionally reports clear-time misses on several stages and a status-damage budget miss so the next balance pass has precise handles.

## Release Use

Run:

```sh
npm run simulate
```

Review the `Region Budget Gates` section. A failed budget is acceptable only when the stage backlog records it as known tuning debt. Otherwise, treat the failure as a balance regression.

For machine-readable checks, run:

```sh
npm run simulate -- --json
```

Each region includes `budgetChecks` with `id`, `label`, `status`, and `reason`.
