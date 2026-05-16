# Stage 2.9 Backlog

## Current Status

Stage 2.9 is complete and archived as the post-Stage 2.8 cleanup and Cognitive Intrusion handoff stage. [Archived Stage 2.8 Backlog](stage-2.8-backlog.md) completed Epics 93 and 94: combat save/stat field migration plus combat/report symbol migration. Stage 2.8 confirmed current saves do not persist live combat stat/event state, so no combat save-version bump was needed.

Slices 2.9.1, 2.9.2, 2.9.3, 2.9.4, and 2.9.5 are complete. Tactic comparison legacy damage fields and CSV columns stay for one more review cycle; `TACTIC_COMPARISON_EXPORT_SCHEMA_VERSION` remains `4`. Engine-level `outerDamage` / `innerDamage` payload keys also stay as stable internal replay/accounting fields for now. Static taxonomy keys such as `inner_defense_down`, upgrade `art` buckets, and mastery bonus type names stay stable after 2.9.3, with safe display/docs cleanup applied. Cognitive Intrusion's refreshed contract now locks the minimum implementation shape: one new `cognitive_intrusion` status, one new `cognitiveDamageTakenMultiplier` status modifier, reused `contextRebuildMultiplier`, and no save/export/event/taxonomy churn. Stage 2.9 stayed conservative: no compatibility adapters, temporary report/export columns, stable engine payload fields, or static taxonomy keys were removed without downstream comparison, replay, and static-schema migration proof.

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
| Cognitive Intrusion draft status examples | Future mechanic contract | Refreshed in 2.9.4; use `cognitive_intrusion`, add only `cognitiveDamageTakenMultiplier`, reuse `contextRebuildMultiplier`, and avoid save/export/event/taxonomy churn. |

## Slice Plan

| Slice | Title | Status | Goal |
| --- | --- | --- | --- |
| 2.9.1 | Legacy Export Column Retirement Decision | Complete | Decided tactic comparison legacy damage columns stay through another review cycle. |
| 2.9.2 | Engine Damage Channel Internal Rename Decision | Complete | Decided core damage/event/metric internals remain stable internal `outer` / `inner` payload fields for now. |
| 2.9.3 | Deferred Static Taxonomy Cleanup | Complete | Reviewed upgrade art buckets, timed status ids, and dispel tags; kept stable schema keys and cleaned safe display/docs language. |
| 2.9.4 | Cognitive Intrusion Preflight | Complete | Refreshed the prototype contract against current combat terminology and locked the minimum static/status schema addition. |
| 2.9.5 | Cleanup Hardening | Complete | Ran stale scans, full validation, docs update, and archived the completed Stage 2.9 backlog. |

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

## Slice 2.9.4: Cognitive Intrusion Preflight

Refresh the Cognitive Intrusion prototype contract against the current combat vocabulary and the keep decisions from 2.9.1 through 2.9.3.

Completed in docs contract. Decision: the first implementation should be a narrow player-side Intrusion prototype, not a broader combat-schema migration. Add one new static status id, `cognitive_intrusion`, and exactly one new status modifier, `cognitiveDamageTakenMultiplier`. Reuse the existing `contextRebuildMultiplier` on the same status to slow Context Rebuild, and attach Intrusion through Azure Pulse Monk's existing `context_shock_refinement` upgrade, preferably as a level 3 `add_skill_effect` unlock.

Minimum implementation contract:

- `StatusEffectModifiers` adds optional `cognitiveDamageTakenMultiplier?: number`.
- `StatusCombatModifiers` adds aggregate `cognitiveDamageTakenMultiplier: number` with default `1`.
- Static validation accepts `cognitiveDamageTakenMultiplier` as a supported status effect key.
- Status modifier aggregation multiplies stacked `cognitiveDamageTakenMultiplier` values like existing healing, Context Rebuild, and Kinetic damage taken modifiers.
- Cognitive damage calculation applies the aggregate multiplier only to Cognitive damage, not Kinetic damage, feedback, status ticks, or AI Overload burst damage.
- Static data adds `cognitive_intrusion` and one `context_shock_refinement` `add_skill_effect` that applies it.

Evidence:

- `contextRebuildMultiplier` already exists in status effect types, validation, status aggregation, and simulator Context Rebuild handling, so the prototype does not need a second rebuild-related schema key.
- No code path currently implements `cognitiveDamageTakenMultiplier`, so it is the only required new status modifier for the future mechanic.
- Azure Pulse Monk's `context_shock_refinement` upgrade already modifies the Cognitive skill path and is the smallest progression hook for an opt-in player-side prototype.
- The Stage 2.9 compatibility decisions keep `outerDamage` / `innerDamage`, `inner_defense_down`, `innerDefenseDown`, upgrade `art` buckets, and the `inner` dispel tag stable, so the prototype should not rename those contracts.

Non-goals:

- No save version, save field, export schema, battle event type, tactic modifier, status category, dispel tag, timed status id, static taxonomy rename, hostile Redline application, or broad retune belongs in the first implementation.
- Do not rename `inner_defense_down`, `innerDefenseDown`, `outerDamage` / `innerDamage`, upgrade `art` buckets, or the `inner` dispel tag as part of Intrusion.

### Acceptance

- [Cognitive Intrusion Prototype Contract](../cognitive-intrusion-prototype-contract.md) uses current Body Integrity, Context Stability, Kinetic/Cognitive, AI Overload, and Context Rebuild terminology.
- The contract identifies `cognitiveDamageTakenMultiplier` as the only new status modifier required for the first implementation.
- The contract records that `contextRebuildMultiplier` should be reused and that save/export/event/static-taxonomy contracts should stay unchanged.
- The future implementation test list covers validation, Cognitive-only damage behavior, status presentation, AI Overload visibility, skill-upgrade gating, save compatibility, and simulator stability.

### Verification

- `rg -n "cognitiveDamageTakenMultiplier|contextRebuildMultiplier|context_shock_refinement|inner_defense_down|outerDamage|innerDamage" core data docs tests`
- `npm run typecheck`
- `npm test`
- `git diff --check`

## Slice 2.9.5: Cleanup Hardening

Close Stage 2.9 with stale-scan classification, release-readiness verification, active-doc cleanup, and archival.

Completed in docs/validation contract. Decision: Stage 2.9 closes as a conservative cleanup and handoff stage. It did not remove compatibility aliases, report/export transition fields, engine replay/accounting payload fields, or stable static taxonomy keys. Remaining legacy-looking hits are documented compatibility surfaces or intentionally stable schema/internal contracts.

Stale-scan classification:

- Product/storage hits such as `path-of-jianghu` remain only for legacy PWA icon/cache/save compatibility paths and tests.
- Region/stage hits such as `bamboo_road` and `demon_cult_outpost` remain in alias helpers, old-save fixtures, and compatibility tests.
- Resource hits such as `silver`, `cultivation`, and `herbs` remain in static reward authoring, balance reports, alias fixtures/tests, and display-term mapping; active onboarding copy now uses Credits, Resonance, and reagents.
- Combat hits such as `outerDamage`, `innerDamage`, `playerOuterDamage`, `playerInnerDamage`, `qi_break`, and `qi_recover` remain in stable engine replay/accounting payloads, battle-event compatibility normalization, temporary tactic comparison aliases, and tests.
- Static taxonomy hits such as `inner_defense_down`, `innerDefenseDown`, and dispel tag `inner` remain stable internal/static schema keys after the 2.9.3 keep decision.
- Historical context under `docs/archive` is intentionally excluded from cleanup.

Closure notes:

- Browser smoke was skipped because Stage 2.9.5 changes only docs and archive links.
- Save compatibility was not rerun with new fixtures because the slice does not change save schema, migrations, import/export behavior, or runtime data.
- Known Black Iron Foundry and Redline Outpost balance debt remains unchanged and continues to live in the existing balance/content docs.
- Release-readiness validation passed during closure: typecheck, full test suite, production build, active markdown link check, simulator, support-decision tooling, and whitespace diff check all exited 0. The simulator still reports the known Black Iron Foundry clear-time miss and Redline Outpost clear-time/status-pressure misses.
- The next recommended implementation step is Epic 95/96 Cognitive Intrusion work, starting from [Cognitive Intrusion Prototype Contract](../cognitive-intrusion-prototype-contract.md).

### Acceptance

- Stage 2.9 records final keep/remove decisions for remaining transition vocabulary and static taxonomy hits.
- Active docs point to the archived Stage 2.9 backlog instead of a duplicate active backlog.
- No active `docs/stage-2.9-backlog.md` remains after archival.
- Release-readiness validation passes before closure.

### Verification

- `rg -n "path-of-jianghu|bamboo_road|demon_cult_outpost|innerQi|outerHp|cultivation|silver|outerDamage|innerDamage|playerOuterDamage|playerInnerDamage|qi_break|qi_recover|inner_defense_down|innerDefenseDown" core data docs tests --glob '!docs/archive/**'`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run simulate`
- `npm run support-decision`
- `git diff --check`

## Verification Baseline

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run simulate`
- `npm run support-decision`
- Markdown link/path check.
- `git diff --check`
