# Stage 2.9 Backlog

## Current Status

Stage 2.9 is active as the post-Stage 2.8 cleanup and Cognitive Intrusion handoff stage. [Archived Stage 2.8 Backlog](archive/stage-2.8-backlog.md) completed Epics 93 and 94: combat save/stat field migration plus combat/report symbol migration. Stage 2.8 confirmed current saves do not persist live combat stat/event state, so no combat save-version bump was needed.

Slice 2.9.1 is complete. Tactic comparison legacy damage fields and CSV columns stay for one more review cycle; `TACTIC_COMPARISON_EXPORT_SCHEMA_VERSION` remains `4`. Stage 2.9 should stay conservative: do not remove compatibility adapters or temporary report/export columns until downstream comparison needs have been checked and a removal slice bumps the affected export schema.

## Stage Theme

Clean up the remaining transition vocabulary from the combat migration, decide which legacy report/export fields can retire, and prepare the Cognitive Intrusion prototype on top of the stabilized Body Integrity, Context Stability, Kinetic/Cognitive, AI Overload, and Context Rebuild vocabulary.

## Carry Forward From Stage 2.8

- Static combat schema aliases live in `core/data/combatSchemaAliases.ts` and remain required for legacy authored payloads and validation fixtures.
- `BattleEventRecord` still normalizes legacy `qi_break` and `qi_recover` replay/report events to `ai_overload` and `context_rebuild`.
- Tactic comparison export schema version `4` uses current `playerKineticDamage` / `playerCognitiveDamage` JSON fields and `player_kinetic_damage` / `player_cognitive_damage` CSV columns, while temporary legacy `playerOuterDamage` / `playerInnerDamage` fields and `player_outer_damage` / `player_inner_damage` columns remain for one comparison period.
- Engine-level damage package, event, metric, and contribution payload fields still use transition `outerDamage` / `innerDamage` names internally. Simulator report and clean export surfaces expose current Kinetic/Cognitive aliases.
- Deferred static taxonomy terms remain intentionally outside Stage 2.8: upgrade art buckets (`outer` / `inner`), timed status ids such as `inner_defense_down`, status dispel tag `inner`, and `map_outer_and_inner_attack_multiplier`.
- Existing known Black Iron Foundry and Redline Outpost tuning debt remains unchanged.

## Remaining Hit Classification

| Hit family | Current classification | Stage 2.9 action |
| --- | --- | --- |
| Base stat and static schema legacy names such as `maxOuterHp`, `outerAttack`, `innerRecoveryRate`, `outer_heal_percent`, and `inner_broken` | Compatibility adapters and alias tests | Keep until compatibility policy says old authored payloads can stop loading. |
| `qi_break` / `qi_recover` | Legacy battle event record compatibility plus focused tests | Keep replay normalization; document removal criteria before deleting. |
| `outerDamage` / `innerDamage`, `playerOuterDamage` / `playerInnerDamage`, and contribution `outerDamage*` / `innerDamage*` | Engine transition fields; current report/export aliases exist | Decide whether to migrate engine internals or keep them as technical channel names behind current public report fields. |
| Tactic comparison legacy damage columns | Temporary downstream comparison fields | Keep through one more review cycle after 2.9.1; remove only with a schema bump after docs/tooling no longer need them. |
| `inner_defense_down`, `innerDefenseDown`, dispel tag `inner`, and upgrade art buckets `outer` / `inner` | Deferred static taxonomy/status-id cleanup | Handle only if the cleanup improves clarity without destabilizing static ids or status compatibility. |
| Cognitive Intrusion draft status examples | Future mechanic contract | Use current Stage 2.8 terminology before implementation. |

## Slice Plan

| Slice | Title | Status | Goal |
| --- | --- | --- | --- |
| 2.9.1 | Legacy Export Column Retirement Decision | Complete | Decided tactic comparison legacy damage columns stay through another review cycle. |
| 2.9.2 | Engine Damage Channel Internal Rename Decision | Planned | Decide whether core damage/event/metric internals should migrate from `outer` / `inner` to Kinetic/Cognitive names or remain technical transition fields. |
| 2.9.3 | Deferred Static Taxonomy Cleanup | Planned | Review upgrade art buckets, timed status ids, and dispel tags for low-risk cleanup or explicit keep decisions. |
| 2.9.4 | Cognitive Intrusion Preflight | Planned | Refresh the prototype contract against current combat terminology and decide the minimum static/status schema addition. |
| 2.9.5 | Cleanup Hardening | Planned | Run stale scans, full validation, docs update, and archive any completed Stage 2.9 planning docs. |

## Slice 2.9.1: Legacy Export Column Retirement Decision

Decide whether the temporary Stage 2.8 tactic comparison legacy damage aliases can be removed.

Completed in docs/tests contract. Decision: keep the legacy damage aliases in the opt-in tactic comparison export for one more review cycle. The export remains schema version `4`; JSON rows keep `contributionMetrics.playerOuterDamage`, `contributionMetrics.playerInnerDamage`, and matching delta fields alongside the current Kinetic/Cognitive fields; CSV rows keep `player_outer_damage`, `player_outer_damage_delta`, `player_inner_damage`, and `player_inner_damage_delta` alongside the current Kinetic/Cognitive columns.

Evidence:

- The current repository has no current-only downstream tactic comparison consumer or recorded schema `4` comparison artifact proving the legacy damage aliases are no longer needed.
- Active docs still describe the aliases as comparison aids, and `tests/tools/balanceReport.test.ts` asserts both current and legacy damage columns.
- Legacy tactic and baseline tactic id columns remain in the same opt-in export, so removing only the damage aliases would not make the export current-only.
- Engine-level `playerOuterDamage` / `playerInnerDamage` metrics are still under the later 2.9.2 decision and should not be coupled to this export-column decision.

Removal criteria for a future schema version `5`:

- At least one post-Stage 2.8 tactic comparison review has used schema version `4` with the current Kinetic/Cognitive fields.
- Docs and local tooling no longer describe the legacy damage aliases as required comparison aids.
- The removal slice bumps `TACTIC_COMPARISON_EXPORT_SCHEMA_VERSION`, removes the legacy JSON fields and CSV columns together, and updates `tests/tools/balanceReport.test.ts` to assert their absence.
- If external spreadsheet or report consumers exist, they have moved to `playerKineticDamage` / `playerCognitiveDamage` and `player_kinetic_damage` / `player_cognitive_damage`.

### Acceptance

- Stage 2.9 records an explicit keep/remove decision for tactic comparison legacy damage aliases.
- Tactic comparison schema version `4` remains documented as the active export contract.
- Removal criteria are clear enough for a later cleanup slice to retire the aliases without re-litigating the Stage 2.8 migration.

### Verification

- `npm test -- tests/tools/balanceReport.test.ts`
- `npm run --silent simulate -- --tactics-json`
- `npm run --silent simulate -- --tactics-csv`
- `git diff --check`

## Verification Baseline

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run simulate`
- `npm run support-decision`
- Markdown link/path check.
- `git diff --check`
