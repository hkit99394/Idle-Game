# Stage 2.8 Backlog

## Current Status

Stage 2.8 is complete and archived for Epics 93 and 94: Combat Save Stat Field Migration and Code And Report Symbol Migration. Slices 93.1, 93.2, 93.3, 94.1, 94.2, 94.3, 94.4, and 94.5 are complete. [Stage 2.8 Combat Save And Symbol Preflight](stage-2.8-combat-save-symbol-preflight.md) confirmed current `SaveData` does not persist live combat stat, event, overload, or recovery state, so Stage 2.8 completed without a save-version bump. Slice 93.2 added the static/combat schema alias foundation without changing `SAVE_DATA_VERSION`; Slice 93.3 moved owned combat runtime stat fields to the approved Path of Neon names; Slice 94.1 moved AI Overload event and aggregate symbols to current names; Slice 94.2 moved Context Rebuild and restoration payload/report symbols to current names; Slice 94.3 migrated authored static combat schema keys to current names while keeping legacy aliases; Slice 94.4 updated web/tooling/report exports with current Kinetic/Cognitive damage-channel fields and temporary legacy comparison aliases; Slice 94.5 classified remaining legacy hits, ran release-readiness validation, updated active docs, and prepared the Stage 2.9 cleanup handoff.

[Archived Stage 2.7 Backlog](stage-2.7-backlog.md) completed save resource/progress field migration and left combat stat fields, combat event names, battle metrics, and report/code symbols explicitly deferred. Stage 2.8 starts from that save version `13` baseline and should not reopen Stage 2.7 resource/progress decisions.

This backlog turned the combat migration guidance from [Path Of Neon Retheme Migration Plan](../retheme-migration-plan.md), [Path Of Neon Internal Id Migration](../path-of-neon-internal-id-migration.md), [Path Of Neon Terminology Map](../path-of-neon-terminology-map.md), [Save API](../save-api.md), and [Combat Engine V2](../combat-engine-v2.md) into focused implementation slices.

## Stage Theme

Migrate owned combat stat, combat event, battle metric, and report/code symbols from legacy martial/internal terms toward Path of Neon terms while preserving old saves, static data compatibility, deterministic combat behavior, simulator/report continuity, web battle display, and downstream export comparison.

## Decisions Carried Forward

- Stage 2.4 completed product/package/storage-key migration. Browser storage uses `path-of-neon.save.v1` with legacy key read/copy support.
- Stage 2.5 completed region and route id value migration.
- Stage 2.6 completed static content id migration, with temporary legacy report columns still allowed where comparison needs them.
- Stage 2.7 completed owned save resource/progress field migration and bumped `SAVE_DATA_VERSION` to `13`.
- Stage 2.7 explicitly deferred combat stat fields such as `outerHp`, `innerQi`, max fields, recovery fields, and AI Overload state to Stage 2.8.
- Slice 93.1 confirmed those combat fields are currently static authoring, transient runtime, event/report, web view-model, or tooling fields rather than persisted save payload fields.
- Slice 93.2 added `core/data/combatSchemaAliases.ts`; Slice 93.3 flipped the BaseStats and status-modifier alias direction so legacy authored stat fields normalize forward into the current runtime contract.
- Combat runtime `BaseStats`, `DerivedStats`, `CombatantState`, formula inputs/constants, progression stat derivation, support/balance stat callers, and battle combatant view models now use fields such as `maxBodyIntegrity`, `contextStability`, `kineticAttack`, `cognitiveDefense`, `breachPower`, `overloadResist`, and `contextRebuildRate`.
- Slice 94.1 moved event types to `ai_overload` and `context_rebuild`, renamed AI Overload metrics/contributions/formula helpers, and preserves legacy `qi_break` / `qi_recover` event record normalization.
- Slice 94.2 renamed baseline rebuild helpers, restoration event payloads, recovery metrics/contributions, canonical recovery skill effect types/targets, and the recovery pressure budget target; legacy recovery/static payloads still normalize through `core/data/combatSchemaAliases.ts`.
- Slice 94.3 migrated authored static JSON for combat stats, stat references, skill damage multipliers, skill recovery effects/targets, tactic modifiers/target rules, skill-upgrade multipliers, status modifier fields, and healing pressure targets. Legacy authored payloads remain accepted by `core/data/combatSchemaAliases.ts`.
- Runtime targeting now uses `overloaded`; legacy static `inner_broken` target rules still normalize through `core/data/combatSchemaAliases.ts`.
- Slice 94.4 bumped tactic comparison export schema version to `4`; JSON rows now expose `playerKineticDamage` / `playerCognitiveDamage`, CSV rows expose `player_kinetic_damage` / `player_cognitive_damage`, and temporary legacy `playerOuterDamage` / `playerInnerDamage` plus `player_outer_damage` / `player_inner_damage` remain for one comparison period.
- Slice 94.5 classified remaining legacy combat-symbol hits as compatibility adapters/tests, engine transition fields, temporary legacy export columns, deferred static taxonomy, docs/history, or Stage 2.9 cleanup.
- Current combat display terms already use Body Integrity, Context Stability, AI Overload, Context Rebuild, Kinetic Art, and Cognitive Art in player-facing UI where appropriate.
- Combat event records and metrics are stable tooling contracts. Any symbol rename must either preserve legacy compatibility, add temporary legacy report columns, or record an explicit keep/defer decision.
- Authored static JSON now uses current combat schema keys such as `maxBodyIntegrity`, `maxContextStability`, `kineticMultiplier`, `body_integrity_restore_percent`, `contextRebuildMultiplier`, and `minBodyIntegrityRestored`; legacy aliases remain import/validation compatibility, not the canonical authoring style.

## Target Families

Slice 93.1 locked the final Stage 2.8 directions in [Stage 2.8 Combat Save And Symbol Preflight](stage-2.8-combat-save-symbol-preflight.md).

| Current family | Target | Notes |
| --- | --- | --- |
| `outerHp`, `maxOuterHp` | `bodyIntegrity`, `maxBodyIntegrity` | Durability/current-state field direction. |
| `innerQi`, `maxInnerQi` | `contextStability`, `maxContextStability` | Stability/current-state field direction. |
| `outerAttack`, `outerDefense` | `kineticAttack`, `kineticDefense` | Damage/defense stat direction. |
| `innerAttack`, `innerDefense` | `cognitiveAttack`, `cognitiveDefense` | Cognitive pressure/defense stat direction. |
| `breakPower`, `breakResist` | `breachPower`, `overloadResist` | Display terms already exist; schema/report rename needs preflight. |
| `qi_break`, `qiBreak*`, `isQiBroken`, `qiBreakEndsAt` | `ai_overload`, `aiOverload*`, `isOverloaded`, `overloadEndsAt` | Event, metric, and runtime state direction. |
| `innerRecoveryRate`, `innerQiRestored`, `outerHealing`, recovery effect fields | `contextRebuildRate`, `contextStabilityRestored`, `bodyIntegrityRestored`, `contextRebuild*` for baseline rebuild | Split baseline rebuild from generic recovery behavior. |
| `inner_broken` targeting | `overloaded` targeting | Preserve the legacy target-rule alias during transition. |

## Non-Goals

- No Cognitive Intrusion implementation. Use [Cognitive Intrusion Prototype Contract](../cognitive-intrusion-prototype-contract.md) only as a future consumer of the stabilized combat vocabulary.
- No combat balance retune, difficulty retune, reward economy retune, or CP formula behavior change beyond symbol names.
- No removal of Stage 2.4, Stage 2.5, Stage 2.6, or Stage 2.7 compatibility adapters.
- No legacy export/report column removal unless the same slice proves downstream comparison no longer needs it.
- No broad player-facing copy pass unless a view model or report symbol rename requires it.
- No static id or content id migration outside the combat stat/effect fields approved by 93.1.
- No Stage 2.8 save-version bump unless a later slice proves a persisted combat payload field that 93.1 did not find; update the preflight before changing save migration code.

## Exit Criteria

- Slice 93.1 records a migrate/keep/defer matrix for combat save payloads, transient combat state, static stat schema, battle events, metrics, web view models, balance reports, export rows, and tests.
- If combat stat fields are persisted in saves or cloud envelopes, supported old saves migrate to the current schema and current exports emit only the approved current fields for owned Stage 2.8 surfaces.
- If combat stat fields are not persisted save fields, Stage 2.8 records that evidence and does not bump `SAVE_DATA_VERSION` for save-shaped changes alone.
- Core combat behavior remains deterministic and numerically unchanged outside intentional naming adapters.
- Battle event records, metrics, contributions, simulator reports, tactic comparison exports, and web battle view models use approved current terms or documented transition fields.
- Stale legacy combat-symbol scans are classified, with remaining hits limited to compatibility adapters, fixtures/tests, archived docs, static authoring fields intentionally kept by 93.1, or Stage 2.9 cleanup.
- Active docs point to this archived backlog and to [Archived Stage 2.9 Backlog](stage-2.9-backlog.md) for cleanup follow-up.

## Epic Summary

Stage 2.8 implements Epics 93 and 94 from the retheme migration plan as focused slices.

| Slice | Title | Status | Goal |
| --- | --- | --- | --- |
| 93.1 | Combat Save And Symbol Preflight | Complete | Locked target names, compatibility behavior, fixture needs, stale-scan rules, and confirmed no save-version bump is required. |
| 93.2 | Combat Save Alias Foundation | Complete | Added static/combat schema alias normalization without a save-version bump. |
| 93.3 | Combat Runtime Stat Fields | Complete | Moved owned combat runtime/view model stat fields to approved current names without changing combat math. |
| 94.1 | AI Overload Event And Metric Symbols | Complete | Renamed AI Overload event, metric, contribution, and report symbols with compatibility where needed. |
| 94.2 | Context Rebuild And Recovery Symbols | Complete | Renamed baseline recovery/restoration symbols while keeping boost/status behavior clear. |
| 94.3 | Static Data And Validation Continuity | Complete | Applied static stat/effect schema key migration with data validation and aliases. |
| 94.4 | Web, Tooling, And Export Continuity | Complete | Keep web battle panels, diagnostics, simulator output, JSON/CSV exports, and support tooling coherent. |
| 94.5 | Hardening And Archive Readiness | Complete | Ran stale scans, full validation, docs closure, and prepared Stage 2.8 for archive. |

## Slice 93.1: Combat Save And Symbol Preflight

Classify every combat stat, event, metric, and report symbol before editing schema or runtime code.

Completed in [Stage 2.8 Combat Save And Symbol Preflight](stage-2.8-combat-save-symbol-preflight.md).

### Tasks

- Inventory `outer*`, `inner*`, `qiBreak*`, `qi_break`, `qi_recover`, `isQiBroken`, `inner_broken`, recovery, and restoration symbols across `core/combat`, `core/progression`, `core/balance`, `web/displayTerms.ts`, `web/features`, `web/state/viewModels`, `data/*.json`, `tools`, tests, fixtures, and docs.
- Separate persisted save/cloud fields from transient combat state, static authoring schema keys, web view-model fields, and generated report/export fields.
- Decide exact target names for durability, stability, kinetic damage, cognitive damage, AI Overload, baseline Context Rebuild, and boost-style Cognitive Reboot.
- Decide whether `SAVE_DATA_VERSION` should remain `13` or bump for actual persisted save-field changes.
- Define alias and conflict behavior for any current-version import or static data payload that provides both legacy and target fields.
- Define temporary legacy report/export columns if downstream comparison needs both old and new names.
- Define fixture coverage for old saves, current-version imports, static data validation, battle event snapshots, report exports, and web battle view models.
- Define stale-scan commands and allowed remaining legacy hits.

### Acceptance

- Contributors can see every Stage 2.8 migrate/keep/defer decision before implementation begins.
- 93.1 records whether combat stat fields are actually persisted save payload fields today.
- No schema or combat runtime code changes are needed to complete 93.1.
- Cognitive Intrusion remains deferred until Stage 2.8 closes or explicitly hands off a stable surface.

### Verification

- Markdown link/path check.
- `git diff --check`.

## Slice 93.2: Combat Save Alias Foundation

Add compatibility plumbing for any approved combat save/static schema rename without mixing in broad runtime cleanup.

Completed in code: `core/data/combatSchemaAliases.ts` accepts Stage 2.8 combat schema aliases for base stats, skill damage multipliers, skill effect types and targets, tactic target/modifier values, status effect modifier keys, equipment/set/style/upgrade stat references, and skill-upgrade effect types. After 93.3, BaseStats and status-modifier aliases normalize legacy authored content forward into the current runtime shape; skill/tactic/effect aliases remain compatibility bridges for later 94.x schema slices. `validateStaticGameData` reports conflicting legacy/current alias pairs. No save-version bump was needed.

### Tasks

- Add structured alias helpers for every combat save or static schema field approved by 93.1.
- Keep `SAVE_DATA_VERSION` at `13` because 93.1 found no persisted combat save payload fields; stop and update the preflight if new persisted evidence appears.
- Keep every previously supported save version in `SUPPORTED_SAVE_DATA_VERSIONS`.
- Add static-data alias fixtures/tests rather than save-version fixtures unless a real save payload field appears.
- Normalize supported Stage 2.8 target combat schema aliases into the current runtime shape during static data loading and validation.
- Fail ambiguous imports with conflicting legacy and target aliases instead of silently choosing one.
- Keep runtime combat math and balance results unchanged.

### Acceptance

- Static combat schema payloads with legacy/current aliases normalize or fail according to 93.1.
- Current save serialization remains unchanged unless Stage 2.8 discovers a real persisted combat field.
- Static data aliases are data-aware and do not break existing authored content.
- Static validation reports useful errors for conflicting legacy/current combat schema aliases.

### Verification

- `npm test -- tests/save`
- `npm test -- tests/fixtures`
- `npm test -- tests/data`
- `npm run typecheck`
- `git diff --check`

## Slice 93.3: Combat Runtime Stat Fields

Move owned transient combat/runtime stat symbols to approved Path of Neon names after alias foundations are safe.

Completed in code: `BaseStats`/`DerivedStats`, `CombatantState`, damage and overload formula inputs/constants, Context Rebuild runtime fields, progression stat derivation, support/balance callers, and battle combatant view models now use the current Body Integrity, Context Stability, Kinetic/Cognitive, Breach Power, Overload Resist, and Context Rebuild symbols. Battle damage-channel payload names such as `outerDamage` and `innerDamage` remain as engine-level transition fields; report/export surfaces expose current aliases after Slice 94.4. Static JSON authored with legacy stat fields still validates through the alias bridge and normalizes to the current runtime shape.

### Tasks

- Rename approved `BaseStats`, `DerivedStats`, `CombatantState`, damage input, recovery input, and formula fields.
- Keep old type aliases or adapter helpers where 93.1 requires a transition period.
- Update progression stat derivation, equipment effects, upgrade effects, style bonuses, CP calculation, and support growth callers.
- Update focused combat tests and helpers without changing numeric expectations.
- Keep player-facing display names centralized through `web/displayTerms.ts`.

### Acceptance

- Combat runtime code uses approved current stat symbols for owned Stage 2.8 surfaces.
- Deterministic battle outcomes, CP values, status behavior, recovery timing, and contribution totals remain unchanged unless a test explicitly proves only a field name changed.
- Legacy static data or save inputs still work through the approved aliases.

### Verification

- `npm test -- tests/combat`
- `npm test -- tests/progression`
- `npm test -- tests/data`
- `npm run typecheck`
- `git diff --check`

## Slice 94.1: AI Overload Event And Metric Symbols

Rename Qi Break event and aggregate symbols to AI Overload after the combat stat target names are stable.

Completed in code: `BattleEvent` now emits `ai_overload` and `context_rebuild`; `BattleMetrics` and `BattleContribution` use `aiOverload*` aggregate fields; damage-package/formula helpers use AI Overload names; battle view models, web event rows, balance summaries, and simulator reports show AI Overload. `BattleEventRecord` accepts legacy `qi_break` and `qi_recover` event objects and normalizes them to current record categories. Runtime target rules use `overloaded`, with legacy static `inner_broken` accepted by the alias bridge.

### Tasks

- Rename approved event type strings, event payload fields, metrics, contributions, and formatter fields from `qi_break` / `qiBreak*` to AI Overload equivalents.
- Preserve `BattleEventRecord` compatibility for replay/report consumers according to 93.1.
- Update targeting terms such as `inner_broken` only if compatibility can be preserved clearly.
- Add temporary legacy report/export fields if downstream comparison needs them.
- Update tests around battle recording, simulator events, balance reports, and tactic comparison output.

### Acceptance

- New event/report surfaces use approved AI Overload symbols.
- Legacy replay/report fixtures either normalize or remain intentionally supported with documented transition fields.
- Battle summaries continue to report the same overload windows and burst damage totals.

### Verification

- `npm test -- tests/combat/battleRecorder.test.ts tests/combat/simulator.test.ts`
- `npm test -- tests/balance`
- `npm run simulate`
- `git diff --check`

## Slice 94.2: Context Rebuild And Recovery Symbols

Rename recovery/restoration symbols while preserving the distinction between baseline rebuild and boosted reboot behavior.

Completed in code: baseline rebuild helpers now use `ContextRebuildInput`, `calculateContextRebuild`, and `rebuildContextStability`; `context_rebuild` events carry `contextStability`; heal/regeneration events, battle metrics, contributions, balance summaries, and web battle details use `bodyIntegrityRestored` and `contextStabilityRestored`; regeneration `restores` values use `body_integrity` and `context_stability`; canonical skill effect types/targets use Body Integrity and Context Stability names; `minOuterHealing` normalizes to `minBodyIntegrityRestored`; `innerRecoveryMultiplier` remains a Context Rebuild modifier through the `contextRebuildMultiplier` alias.

### Tasks

- Rename approved baseline recovery fields such as `innerRecoveryRate`, recovery delay constants, and restoration event payloads.
- Decide whether status/effect modifiers such as `innerRecoveryMultiplier` should become Context Rebuild or Cognitive Reboot fields.
- Update regeneration, healing, recovery-prevention, status effect, and contribution paths.
- Update validation for status effect schemas if 93.1 approves a static data effect rename.
- Preserve recovery timing and restoration totals.

### Acceptance

- Baseline Context Rebuild and boost-style Cognitive Reboot are not conflated in code, reports, or docs.
- Existing status and recovery behavior remains numerically stable.
- Legacy static data/status effect payloads stay accepted through approved aliases if renamed.

### Verification

- `npm test -- tests/combat/statusEffects.test.ts tests/combat/skillEffects.test.ts tests/combat/defensiveEffects.test.ts`
- `npm test -- tests/data`
- `npm run typecheck`
- `git diff --check`

## Slice 94.3: Static Data And Validation Continuity

Apply or explicitly defer static combat stat/effect schema key migration.

Completed in code: authored static JSON now uses current Stage 2.8 combat schema names for base stats and stat refs (`maxBodyIntegrity`, `kineticAttack`, `breachPower`, `contextRebuildRate`), skill damage multipliers (`kineticMultiplier`, `cognitiveMultiplier`), tactic modifiers (`kinetic_damage_multiplier`, `cognitive_damage_multiplier`, `breach_power_multiplier`), skill upgrade multiplier effects (`kinetic_multiplier`, `cognitive_multiplier`), recovery skill effect types/targets, status modifier fields, `overloaded` target priorities, and `minBodyIntegrityRestored`. Validation errors and display labels now use the current authoring names, while legacy payloads still normalize and conflicts still fail. Remaining active static legacy-like terms are intentionally deferred because they are not this slice's stat/effect schema: upgrade art buckets (`outer`/`inner`), timed status ids such as `inner_defense_down`, status dispel tags, `map_outer_and_inner_attack_multiplier`, and damage-channel docs/report fields.

### Tasks

- Update `data/heroes.json`, `data/enemies.json`, `data/equipment.json`, `data/upgrades.json`, `data/styles.json`, and related fixtures only for static schema keys approved by 93.1.
- Update static data validation and authoring errors to use current schema names while accepting legacy fields where approved.
- Preserve canonical static ids from Stage 2.6.
- Keep balance authoring reward columns separate from combat stat/report symbols.
- Document any static fields kept for Stage 2.9 cleanup.

### Acceptance

- Authored static data validates with approved Stage 2.8 schema names or documented legacy-compatible names.
- Invalid mixed legacy/current static payloads fail clearly.
- Static id aliases and Stage 2.6 decisions stay untouched.

### Verification

- `npm test -- tests/data`
- `npm run simulate`
- `npm run support-decision`
- `npm run typecheck`
- `git diff --check`

## Slice 94.4: Web, Tooling, And Export Continuity

Keep non-core consumers coherent after combat symbol migration.

Completed in code: full simulator stage metrics now include current `playerKineticDamage`, `playerCognitiveDamage`, `enemyKineticDamage`, and `enemyCognitiveDamage` fields alongside transition legacy aggregate fields. Tactic comparison export schema version `4` adds current JSON fields and CSV columns for Kinetic/Cognitive player damage while retaining temporary legacy `playerOuterDamage` / `playerInnerDamage` JSON fields and `player_outer_damage` / `player_inner_damage` CSV columns. Web battle status-tick copy now describes status ticks as Body Integrity damage instead of Kinetic damage. [Save API](../save-api.md), [Balance Budget Gates](../balance-budget-gates.md), [Content Pipeline Inventory](../content-pipeline-inventory.md), and [Combat Engine V2](../combat-engine-v2.md) document the current report/export contract and transition fields.

### Tasks

- Update web battle panel props, view models, summaries, aria labels, diagnostics, and display helpers for approved current terms.
- Update simulator, balance, tactic comparison, support-decision, and authoring export paths.
- Add temporary legacy JSON/CSV columns where 93.1 requires a transition period.
- Update [Save API](../save-api.md), [Balance Budget Gates](../balance-budget-gates.md), [Content Pipeline Inventory](../content-pipeline-inventory.md), and [Combat Engine V2](../combat-engine-v2.md) where behavior or contract names change.
- Smoke the built app battle panel after runtime/view-model changes.

### Acceptance

- Web battle surfaces continue to show Body Integrity, Context Stability, AI Overload, and Context Rebuild consistently.
- Tooling exports are stable enough for before-and-after comparison.
- Report docs distinguish current combat report fields from any temporary legacy comparison columns.

### Verification

- `npm test -- tests/web`
- `npm test -- tests/balance`
- `npm run simulate`
- `npm run support-decision`
- `npm run typecheck`
- `npm run build`
- Browser smoke for the battle panel when practical.
- `git diff --check`

## Slice 94.5: Hardening And Archive Readiness

Close Stage 2.8 with compatibility proof, stale-scan classification, and docs cleanup.

Completed in code/docs: remaining active legacy combat-symbol hits were classified, active docs were updated to treat Stage 2.8 as complete, [Archived Stage 2.9 Backlog](stage-2.9-backlog.md) was prepared for cleanup and Cognitive Intrusion handoff, and release-readiness validation passed during archive closure.

Remaining active hits are intentional:

- `core/data/combatSchemaAliases.ts` and static validation tests retain legacy static schema aliases.
- `core/combat/battleRecorder.ts` and battle recorder tests retain `qi_break` / `qi_recover` replay normalization.
- Core combat damage package, event, metric, and contribution payloads retain `outerDamage` / `innerDamage` transition fields behind current report/export aliases.
- Tactic comparison exports retain temporary legacy damage fields and CSV columns for one comparison period.
- `inner_defense_down`, `innerDefenseDown`, `inner` dispel tags, `outer` / `inner` upgrade art buckets, and `map_outer_and_inner_attack_multiplier` are deferred static taxonomy cleanup.
- Archived or historical docs retain old terms as closure evidence.

### Tasks

- Run stale scans for legacy combat stat, event, metric, recovery, and report names.
- Classify every remaining active hit as compatibility adapter, fixture/test, static authoring field intentionally kept, temporary legacy report field, docs/history, or Stage 2.9 cleanup.
- Run the full release-readiness validation set.
- Update [Current Implemented Systems](../current-implemented-systems.md), [Path Of Neon Retheme Migration Plan](../retheme-migration-plan.md), [Path Of Neon Internal Id Migration](../path-of-neon-internal-id-migration.md), [Path Of Neon Terminology Map](../path-of-neon-terminology-map.md), [Save API](../save-api.md), and any touched tooling docs with closure status.
- Move completed Stage 2.8 active docs into `docs/archive` only after validation passes.
- Prepare the Stage 2.9 cleanup handoff and Cognitive Intrusion prototype handoff.

### Acceptance

- Stage 2.8 docs name completed slices and validation evidence.
- Active docs no longer describe Stage 2.8 as merely upcoming.
- Remaining legacy combat-symbol hits are intentional and classified.
- Completed Stage 2.8 docs live in `docs/archive` after closure.

### Verification

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run simulate`
- `npm run support-decision`
- Markdown link/path check.
- `git diff --check`
