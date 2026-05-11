# Content Authoring Checklist

Use this checklist when adding or changing regions, stages, enemies, skills, rewards, or balance budgets. The goal is to make content review happen through data, validation, and reports before UI work depends on the new content.

## Region Slice

Before opening a region for play:

1. Add or update region data in [regions.json](../data/regions.json).
2. Add all referenced stages in [stages.json](../data/stages.json).
3. Add or update enemies in [enemies.json](../data/enemies.json).
4. Add or update any skills, statuses, medicines, equipment, assignments, upgrades, style entries, and mastery assumptions that the region uses.
5. Keep ids stable and descriptive; region and stage ids are used by saves, reports, docs, and tests.
6. Run static validation through the test suite before trusting simulator output.

## Stage And Enemy Checks

For every stage:

- Confirm the stage belongs to the intended region and appears in the region's `stageIds` order.
- Confirm every enemy id exists, uses the intended combat role, and has a formation slot that matches the encounter shape.
- Mark boss stages with `isBoss: true`; boss stages should not become offline farm targets.
- Mark only repeatable non-boss stages with `canFarmOffline: true`.
- Confirm rewards are non-negative and match the region's reward pacing.
- Add equipment drops only after the referenced equipment exists and is appropriate for that region.

For every enemy or skill change:

- Check skill ids, style ids, status ids, and target rules.
- Confirm status-heavy enemies are covered by `statusPressure` budgets.
- Confirm defensive enemies are covered by `defensePressure` budgets.
- Confirm healers and sustain encounters are covered by `healingPressure` budgets.

## Reward And Farm Checks

For every farmable stage:

- Later farmable stages should not regress on weighted farm score, silver, cultivation, herbs, Combat XP, or mastery yield unless the regression is intentional.
- Intentional reward dips must be recorded in `rewardCurve.allowedRegressions` with the exact stage id, metrics, and reason.
- Boss and non-farmable stages must not be the recommended offline farm target.
- `npm run simulate` should explain why the recommended farm stage wins.

## Budget Gate Checks

Every region needs `balanceTargets` in [regions.json](../data/regions.json):

- `clearTimeSeconds.normal` for normal non-boss stages.
- `clearTimeSeconds.elite` for elite non-boss stages.
- `clearTimeSeconds.boss` or `bossGate.clearTimeSeconds` when a boss is expected to clear within a timing band.
- `rewardCurve.requireBestFarmRecommendation: true` when the region has farmable stages.
- `statusPressure`, `defensePressure`, or `healingPressure` when the region's enemies exercise those mechanics.
- `bossGate` with baseline, trained, or farmed result expectations.
- `budgetExceptions` only for explicit, named deferrals that should stay visible in data.

Do not accept a new budget miss silently. Either fix the content, add a reasoned exception where validation supports it, or record the miss as tuning debt in the active release authority: [Content Pipeline Inventory](content-pipeline-inventory.md), [Balance Budget Gates](balance-budget-gates.md), configured `balanceTargets`, and simulator budget output should agree on the accepted miss.

## Report Review

Run these commands from the repository root:

```sh
npm run simulate
npm run --silent simulate -- --export-json
npm run --silent simulate -- --csv
npm run --silent simulate -- --tactics-json
npm run --silent simulate -- --tactics-csv
```

Review:

- `Region Difficulty Curve` for target misses and large stage spikes.
- `Region Boss Gate Assumptions` for baseline, trained, farmed, medicine, status damage, farm clears, and training cost.
- `Region Budget Gates` for pass/fail reasons.
- The compact JSON export when comparing region, stage, budget, or boss-gate rows in tools.
- The generated CSV when reviewing stage rows in a spreadsheet.
- Tactic comparison JSON/CSV when reviewing tactic-driven target-status shifts, pressure deltas, or contribution deltas.

[Balance Template CSV](balance-template.csv) remains a hand-authored planning reference. Use generated CSV output for current simulator truth.

## Required Verification

Before marking a content slice ready:

```sh
npm run typecheck
npm test
npm run build
npm run simulate
npm run support-decision
git diff --check
```

Browser smoke is required only when the slice changes visible UI, web state, save behavior, or layout. For data, docs, tooling, or validation-only changes, record that browser smoke was skipped as not applicable.
