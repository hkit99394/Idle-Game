# Stage 2.9 Backlog

## Current Status

Stage 2.9 is active as the post-Stage 2.8 cleanup and Cognitive Intrusion handoff stage. [Archived Stage 2.8 Backlog](archive/stage-2.8-backlog.md) completed Epics 93 and 94: combat save/stat field migration plus combat/report symbol migration. Stage 2.8 confirmed current saves do not persist live combat stat/event state, so no combat save-version bump was needed.

Slices 2.9.1, 2.9.2, and 2.9.3 are complete. Tactic comparison legacy damage fields and CSV columns stay for one more review cycle; `TACTIC_COMPARISON_EXPORT_SCHEMA_VERSION` remains `4`. Engine-level `outerDamage` / `innerDamage` payload keys also stay as stable internal replay/accounting fields for now. Static taxonomy keys such as `inner_defense_down`, upgrade `art` buckets, and mastery bonus type names stay stable after 2.9.3, with safe display/docs cleanup applied. Stage 2.9 should stay conservative: do not remove compatibility adapters, temporary report/export columns, stable engine payload fields, or static taxonomy keys until downstream comparison, replay, and static-schema needs have been checked and the affected schema or event contract has an explicit migration path.

## Stage Theme

Clean up the remaining transition vocabulary from the combat migration, decide which legacy report/export fields can retire, and prepare the Cognitive Intrusion prototype on top of the stabilized Body Integrity, Context Stability, Kinetic/Cognitive, AI Overload, and Context Rebuild vocabulary.

## Carry Forward From Stage 2.8

- Static combat schema aliases live in `core/data/combatSchemaAliases.ts` and remain required for legacy authored payloads and validation fixtures.
- `BattleEventRecord` still normalizes legacy `qi_break` and `qi_recover` replay/report events to `ai_overload` and `context_rebuild`.
- Tactic comparison export schema version `4` uses current `playerKineticDamage` / `playerCognitiveDamage` JSON fields and `player_kinetic_damage` / `player_cognitive_damage` CSV columns, while temporary legacy `playerOuterDamage` / `playerInnerDamage` fields and `player_outer_damage` / `player_inner_damage` columns remain for one comparison period.
- Engine-level damage package, event, metric, and contribution payload fields keep stable internal `outerDamage` / `innerDamage` names after the 2.9.2 decision. Simulator report, web presentation, and clean export surfaces expose current Kinetic/Cognitive or Body Integrity/Context Stability wording where the semantics are unambiguous.
- Static taxonomy terms that stayed out of Stage 2.8 were reviewed in 2.9.3. Upgrade art buckets (`outer` / `inner`), timed status ids such as `inner_defense_down`, status dispel tag `inner`, and `map_outer_and_inner_attack_multiplier` remain stable schema/taxonomy keys for now; player-facing/docs surfaces should use current Kinetic/Cognitive or Cognitive Defense wording where possible.
- Existing known Black Iron Foundry and Redline Outpost tuning debt remains unchanged.

## Remaining Hit Classification

| Hit family | Current classification | Stage 2.9 action |
| --- | --- | --- |
| Base stat and static schema legacy names such as `maxOuterHp`, `outerAttack`, `innerRecoveryRate`, `outer_heal_percent`, and `inner_broken` | Compatibility adapters and alias tests | Keep until compatibility policy says old authored payloads can stop loading. |
| `qi_break` / `qi_recover` | Legacy battle event record compatibility plus focused tests | Keep replay normalization; document removal criteria before deleting. |
| `outerDamage` / `innerDamage`, `playerOuterDamage` / `playerInnerDamage`, and contribution `outerDamage*` / `innerDamage*` | Stable engine replay/accounting payloads; current report/export aliases exist | Keep after 2.9.2; rename only with an explicit event/report contract migration. |
| Tactic comparison legacy damage columns | Temporary downstream comparison fields | Keep through one more review cycle after 2.9.1; remove only with a schema bump after docs/tooling no longer need them. |
| `inner_defense_down`, `innerDefenseDown`, dispel tag `inner`, upgrade art buckets `outer` / `inner`, and `map_outer_and_inner_attack_multiplier` | Stable static taxonomy/status schema keys; display/docs cleanup applied where safe | Keep after 2.9.3; rename only with static-schema aliases, save/reference audit, and cleanse compatibility. |
| Cognitive Intrusion draft status examples | Future mechanic contract | Use current Stage 2.8 terminology before implementation. |

## Slice Plan

| Slice | Title | Status | Goal |
| --- | --- | --- | --- |
| 2.9.1 | Legacy Export Column Retirement Decision | Complete | Decided tactic comparison legacy damage columns stay through another review cycle. |
| 2.9.2 | Engine Damage Channel Internal Rename Decision | Complete | Decided core damage/event/metric internals remain stable internal `outer` / `inner` payload fields for now. |
| 2.9.3 | Deferred Static Taxonomy Cleanup | Complete | Reviewed upgrade art buckets, timed status ids, and dispel tags; kept stable schema keys and cleaned safe display/docs language. |
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

## Slice 2.9.2: Engine Damage Channel Internal Rename Decision

Decide whether core damage/event/metric internals should migrate from `outer` / `inner` to Kinetic/Cognitive names or remain stable internal payload fields behind current public report aliases.

Completed in docs contract. Decision: keep the engine-level `outerDamage` / `innerDamage`, `playerOuterDamage` / `playerInnerDamage`, `enemyOuterDamage` / `enemyInnerDamage`, and contribution `outerDamage*` / `innerDamage*` fields for now. Public presentation, simulator summaries, and clean export surfaces continue to translate those fields to Kinetic/Cognitive or Body Integrity/Context Stability terms where appropriate.

Evidence:

- The fields are part of detailed battle replay and aggregate accounting surfaces, not just local variable names.
- A single rename would be semantically lossy: attack `outerDamage` maps to Kinetic channel damage, but `status_tick.outerDamage` is Body Integrity damage, and prevention payloads mix channel and pool semantics.
- Web view models already display attack damage as Kinetic/Cognitive and status tick damage as Body Integrity damage, so player-facing copy is current without rewriting stable event payloads.
- Simulator report adapters already expose current `playerKineticDamage` / `playerCognitiveDamage` aliases while keeping the engine metrics stable.
- Tactic comparison legacy damage aliases were explicitly retained by 2.9.1, so an engine rename would not remove downstream legacy columns yet.

Future rename criteria:

- Define a versioned battle replay/report payload migration, including compatibility for old event fixtures or any persisted/generated replay artifacts.
- Split the overloaded semantics before renaming: attack channel damage should become Kinetic/Cognitive, status ticks should become Body Integrity damage, and restoration/prevention payloads should use pool or channel names according to their actual behavior.
- Update `BattleEvent`, `BattleMetrics`, `BattleContribution`, web view-model adapters, simulator report adapters, tactic comparison exports, and focused combat/web/tooling tests in one coordinated slice.
- If external reports or spreadsheets consume the current fields, bump the affected export schema and keep temporary aliases for at least one comparison cycle.

### Acceptance

- Stage 2.9 records an explicit keep/rename decision for engine-level damage-channel internals.
- Active docs explain why existing internal `outer` / `inner` payload keys are stable for now even though public/report terminology is current.
- Future rename criteria distinguish Kinetic/Cognitive channel damage from Body Integrity/Context Stability pool damage.

### Verification

- `npm test -- tests/combat/damagePackage.test.ts tests/combat/battleRecorder.test.ts tests/combat/simulator.test.ts tests/web/statusPresentation.test.ts tests/tools/balanceReport.test.ts`
- `npm run typecheck`
- `git diff --check`

## Slice 2.9.3: Deferred Static Taxonomy Cleanup

Review upgrade art buckets, timed status ids, dispel tags, and mastery bonus taxonomy for low-risk cleanup or explicit keep decisions.

Completed in code/docs contract. Decision: keep the static taxonomy keys stable for now. The fixed timed status id `inner_defense_down`, runtime field `innerDefenseDown`, status dispel tag `inner`, upgrade `art` buckets `outer` / `inner`, and mastery bonus type `map_outer_and_inner_attack_multiplier` remain current internal/schema keys until a later compatibility-backed static-schema migration decides otherwise.

Low-risk cleanup applied:

- Timed status display metadata now labels `inner_defense_down` as **Cognitive Defense Down**.
- Active docs now describe implemented damage/effect families with Kinetic/Cognitive and Cognitive Defense wording.
- The Cognitive Intrusion draft no longer proposes the legacy `inner` dispel tag; the first prototype should use the generic `debuff` tag unless a later slice introduces a current cognitive-specific tag with compatibility.

Keep evidence:

- `inner_defense_down` is a fixed timed-status id, battle event type, skill effect type, runtime field owner, battle recorder category, and fixture/test contract. The authored static data is already compatible with the current alias `cognitive_defense_down`, but runtime records still normalize to the stable internal id.
- The dispel tag `inner` participates in cleanse matching for timed and data statuses. Renaming it without tag-alias matching could make old cleanse medicines or fixtures stop matching affected statuses.
- Upgrade `art` buckets `outer` / `inner` are UI grouping/style taxonomy, not player-facing display copy; upgrade names and effects already show Kinetic/Cognitive terms.
- `map_outer_and_inner_attack_multiplier` is a mastery bonus schema type. Its UI label already says Kinetic and Cognitive attack, and renaming the schema type would need static data aliases plus tests.

Future cleanup criteria:

- Add static-schema aliases for any renamed skill effect type, status id, dispel tag, upgrade art bucket, or mastery bonus type before rewriting authored data.
- Preserve or explicitly migrate battle replay/event fixtures if a timed status id changes.
- Add cleanse tag alias matching if `inner` ever becomes `cognitive`, so old medicines and content still cleanse the same statuses.
- Keep UI tone/CSS tokens separate from schema taxonomy; only rename `outer` / `inner` style tokens if the UI layer gets a broader visual-token cleanup.

### Acceptance

- Stage 2.9 records explicit keep/rename decisions for deferred static taxonomy terms.
- Player-facing active docs no longer describe these mechanics as Inner/Outer where current terminology is available.
- Future cleanup criteria explain the alias and compatibility work required before any static taxonomy rename.

### Verification

- `npm test -- tests/data/validateData.test.ts tests/combat/skillEffects.test.ts tests/progression/battleResolution.test.ts tests/web/battleEventView.test.ts`
- `npm run typecheck`
- `git diff --check`

## Verification Baseline

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run simulate`
- `npm run support-decision`
- Markdown link/path check.
- `git diff --check`
