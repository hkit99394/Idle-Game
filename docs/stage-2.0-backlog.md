# Stage 2.0 Backlog

## Current Status

Stage 2.0 is active. Stage 1.9 completed UI modularization and is archived at [Stage 1.9 Backlog](archive/stage-1.9-backlog.md).

## Stage Numbering Decision

This is a real **Stage 2.0** for development planning, not a Stage 1.10 cleanup pass.

Stage 1.x hardened the foundation: save transactions, static-data assembly, balance gates, Combat Engine V2, and web UI modularization. Stage 2.0 changes the project mode from "make the foundation safe to change" to "make future content safe to author." That is a phase boundary even if the shipped prototype does not call itself version 2.0.

A Stage 1.10 would be appropriate only for leftover Stage 1 hygiene: a committed `npm run check`, an automated browser screenshot runner, small UI polish, or docs cleanup without changing content authoring capability.

## Theme

The recommended theme is **Content Pipeline**. The goal is to make new regions, stages, enemies, skills, rewards, and budget targets easier to author, validate, simulate, and review before adding a large content slice.

## Decisions Carried Forward

- Preserve current combat outcomes, save behavior, web workflows, and known balance-budget posture unless a task explicitly approves a tuning change.
- Treat `StaticGameData`, `validateStaticGameData`, `simulateBattle`, and `npm run simulate -- --json` as the current content authoring contract.
- Keep authored content in data files and validation logic in core data/balance modules.
- Keep `core/` free of browser, React, local storage, and CLI formatting dependencies.
- Prefer validation and report improvements before adding more regions or systems.
- Keep Stage 2.1 strategy work out of scope unless content validation uncovers a blocker that must be solved first.

## Stage Goals

- Define a clearer region/stage budget schema for clear time, reward curve, status pressure, defense pressure, healing pressure, and boss gates.
- Validate reward progression so later farm stages do not accidentally become worse than earlier farm stages unless intentionally marked.
- Validate stage difficulty and region ordering before content reaches the web UI.
- Make balance report JSON and exports easier to consume in spreadsheets or review tools.
- Add a practical content readiness checklist for adding or changing regions.
- Keep current regions playable while making future region authoring less hand-inspected.

## Non-Goals

- No new production region is required for this stage.
- No new hero, enemy family, skill line, equipment set, or strategy mechanic unless it is needed to validate the pipeline.
- No broad combat retune beyond documenting or fixing budget gates intentionally owned by this stage.
- No UI redesign; only small tool/report or docs UI changes are in scope.
- No backend, PWA, cloud save, account, or online boss work; that belongs to Stage 2.2.

## Exit Criteria

- New region data has a documented authoring path and automated validation coverage before UI work begins.
- Normal, elite, boss, and farmable stages have clear budget expectations or explicit exceptions.
- Reward and difficulty regressions appear as actionable validation or balance-report failures.
- Balance report JSON/export output is stable enough for spreadsheet or chart review.
- Existing known budget misses are either fixed intentionally or recorded as deferred tuning debt.
- Active docs explain how to add content without reading core combat internals first.
- `npm run typecheck`, `npm test`, `npm run build`, `npm run simulate`, `npm run support-decision`, `git diff --check`, and required docs/link checks pass before archival.

## Epic Summary

| Epic | Title | Status | Purpose |
| --- | --- | --- | --- |
| 61 | Content Pipeline Baselines And Schema Audit | Complete | Inventory current data, budget fields, validation coverage, and authoring pain points |
| 62 | Region And Stage Budget Validation | Complete | Turn content-budget expectations into stricter validation and tests |
| 63 | Reward Curve And Farm Recommendation Gates | Complete | Prevent accidental reward/farm regression when adding stages |
| 64 | Difficulty Curve And Boss Gate Reports | Planned | Make stage difficulty, boss gates, and known misses easier to review |
| 65 | Balance Export And Authoring Tooling | Planned | Produce review-friendly JSON/CSV outputs and repeatable author workflows |
| 66 | Content Docs And Stage 2.0 Readiness | Planned | Close the stage with contributor docs, release checks, and archive cleanup |

---

## Epic 61: Content Pipeline Baselines And Schema Audit

### Goal

Capture the current content authoring surface before changing validation or report behavior.

### Tasks

- Inventory region, stage, enemy, skill, equipment, medicine, assignment, mastery, and balance-target data files.
- Map current `StaticGameData` fields to the validation rules that protect them.
- Identify content fields that are only checked by simulation output or manual review.
- Record known budget misses and decide which are tuning debt versus accepted report noise.
- Add or update a content pipeline inventory doc if the audit does not fit cleanly in existing docs.

### Acceptance Criteria

- Contributors can see which data files feed each content workflow.
- Current validation coverage and manual gaps are documented.
- Known Stage 1.9 balance misses are named before stricter gates are introduced.
- No behavior or tuning changes are required for this epic.

### Test Coverage

- Existing static-data builder and validation tests.
- Existing balance-report tests.
- Markdown path/link check if docs change.

### Progress Notes

- Added [Content Pipeline Inventory](content-pipeline-inventory.md) with the current JSON data inventory, `StaticGameData` field mapping, validation ownership map, report-only gaps, and Stage 2.0 handoffs.
- Confirmed `npm run simulate` still reports the known Black Iron Fort and Demon Cult budget misses.
- Classified current budget misses as tuning debt for Stage 2.0, not accepted silent report noise.
- No behavior or tuning changes were made for this epic.

---

## Epic 62: Region And Stage Budget Validation

### Goal

Make budget expectations explicit enough that new region or stage data fails early when required targets are missing or malformed.

### Tasks

- Define required and optional budget fields by stage type: normal, elite, boss, and farmable.
- Validate clear-time target ranges, reward-curve targets, pressure budgets, and boss-gate fields.
- Add tests for missing, invalid, or contradictory budget configurations.
- Keep intentional exceptions readable in data rather than hidden in code.
- Update `docs/balance-budget-gates.md` with the stricter budget contract.

### Acceptance Criteria

- New regions cannot silently omit required budget guidance.
- Invalid target ranges or unsupported budget fields fail validation.
- Existing configured regions still validate after intentional exceptions are recorded.
- Balance report output remains compatible unless a format change is explicitly documented.

### Test Coverage

- Static-data validation tests.
- Focused budget validation tests.
- `npm run simulate` to confirm report compatibility.

### Progress Notes

- Added stage-derived `balanceTargets` validation so regions cannot omit normal, elite, farmable, status-pressure, or boss-gate guidance silently.
- Added unsupported-field and contradiction checks for budget sections, boss gates, reward-curve gates, and pressure budgets.
- Added explicit `boss_clear_time_target` budget exceptions for current Bamboo Road, Black Iron Fort, and Lotus Monastery boss timing deferrals.
- Updated [Balance Budget Gates](balance-budget-gates.md) with the stricter contract and exception format.

---

## Epic 63: Reward Curve And Farm Recommendation Gates

### Goal

Prevent accidental reward regressions and make farm recommendations more explainable for content authors.

### Tasks

- Validate that later farmable stages do not score worse than earlier farmable stages unless explicitly allowed.
- Validate that boss stages and non-farmable stages do not become offline farm targets accidentally.
- Add report details that explain why a farm stage is recommended.
- Check silver, cultivation, herbs, Combat XP, and mastery reward curves by region.
- Update `docs/balance-template.csv` or replace it with a clearer generated/reference format if needed.

### Acceptance Criteria

- Reward curve regressions are caught before content reaches the UI.
- Farm recommendation misses have actionable reasons.
- Existing known recommendations remain stable or are intentionally retuned.
- Content authors can reason about reward changes without reading simulator internals.

### Test Coverage

- Reward validation tests.
- Balance report tests for farm recommendation reasons.
- `npm run simulate -- --json` fixture or shape checks if export shape changes.

### Progress Notes

- Added farm reward curve validation for weighted farm score, silver, cultivation, herbs, Combat XP, and mastery yield.
- Added reasoned `rewardCurve.allowedRegressions` entries for the intentional Bamboo Road reward dips.
- Added farm recommendation score breakdowns, priority, and reasons to balance report JSON/text output.
- Updated [Balance Template CSV](balance-template.csv) with farm score and recommendation reason columns.

---

## Epic 64: Difficulty Curve And Boss Gate Reports

### Goal

Make stage difficulty, elite spikes, and boss gates easier to inspect before adding more content.

### Tasks

- Add or improve report sections for stage clear-time trend, stage result, and difficulty spikes.
- Surface boss-gate assumptions: baseline, trained, farmed, medicine, status damage, and training cost.
- Decide whether current Black Iron Fort and Demon Cult misses should be fixed now or deferred with clearer notes.
- Add tests for report shape and gate reason generation.
- Update docs with how to interpret difficulty and boss-gate report sections.

### Acceptance Criteria

- Difficulty curve issues are visible as report lines with stage ids and reasons.
- Boss gate output is readable enough to tune without stepping through combat code.
- Existing known misses are either fixed intentionally or tracked as deferred tuning debt.
- Report changes do not break existing release-readiness use.

### Test Coverage

- Balance report formatter/builder tests.
- Simulation smoke through `npm run simulate`.
- JSON output checks if report fields change.

### Progress Notes

- Not started.

---

## Epic 65: Balance Export And Authoring Tooling

### Goal

Make balance output easier to review outside the terminal.

### Tasks

- Add a stable JSON export shape for region, stage, reward, pressure, and budget-check summaries if the current shape is too noisy.
- Add CSV or spreadsheet-friendly output for the fields authors actually compare.
- Document command examples for terminal, JSON, and export workflows.
- Decide whether `docs/balance-template.csv` remains a hand-authored template or becomes generated/reference output.
- Add tests for export headers/shape so downstream review does not break casually.

### Acceptance Criteria

- Authors can export balance data without copy-pasting terminal tables.
- Export output is stable enough to review in a spreadsheet.
- The docs explain which command to run for each review mode.
- Existing report commands still work.

### Test Coverage

- Tool/export tests.
- JSON/CSV shape checks.
- `npm run simulate` and `npm run simulate -- --json`.

### Progress Notes

- Not started.

---

## Epic 66: Content Docs And Stage 2.0 Readiness

### Goal

Close Stage 2.0 with clear content authoring docs, release verification, and next-stage readiness.

### Tasks

- Update `docs/current-implemented-systems.md` with final content pipeline behavior.
- Update `docs/static-data.md` and `docs/balance-budget-gates.md` with the implemented authoring and validation workflow.
- Add or update a content readiness checklist for region additions.
- Update roadmap notes if Stage 2.0 changes Stage 2.1 or Stage 2.2 scope.
- Run the release-readiness checklist before marking Stage 2.0 complete.
- Archive this backlog only after all epics are complete and verification passes.

### Acceptance Criteria

- New contributors can find how to add a region, stage, enemy, skill, reward, and budget gate.
- Active docs describe the implemented content pipeline accurately.
- No active docs point to missing or stale backlog paths.
- Stage closure records required commands, report/budget outcome, review outcome, and any deferred P3s.

### Test Coverage

- Release-readiness command set.
- Manual markdown path checks or link-check script.
- Browser smoke only if visible UI changes land during Stage 2.0.

### Progress Notes

- Not started.

---

## Open Questions

- Epic 61 answer: known Stage 1.9 budget misses are documented as Stage 2.0 tuning debt until Epic 64 decides whether to retune or record explicit exceptions.
- Should balance export use CSV, JSON-only, or both?
- Should `docs/balance-template.csv` remain hand-maintained or become generated from current data?
- How strict should reward-curve validation be for intentional difficulty or reward dips?
- Should Stage 2.0 include a small sample content change to prove the pipeline, or avoid new content until Stage 2.1/2.2 planning is clearer?

## Suggested Implementation Order

1. Epic 61: Content Pipeline Baselines And Schema Audit
2. Epic 62: Region And Stage Budget Validation
3. Epic 63: Reward Curve And Farm Recommendation Gates
4. Epic 64: Difficulty Curve And Boss Gate Reports
5. Epic 65: Balance Export And Authoring Tooling
6. Epic 66: Content Docs And Stage 2.0 Readiness

This order audits the current authoring surface first, then tightens validation, then improves reports and exports, then closes with docs and release readiness.
