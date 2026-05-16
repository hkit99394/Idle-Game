# Stage 2.8 Combat Save And Symbol Preflight

## Status

Slice 93.1 is complete. This preflight is the implementation contract for Stage 2.8 combat save/stat and combat/report symbol migration.

This document does not rename schema code. It classifies current combat save, static-data, runtime, web, tooling, report, and test surfaces; locks target terminology; defines compatibility behavior; confirms the save-version decision; and records stale-scan expectations before Slice 93.2 starts alias work.

## Source Contracts

- [Stage 2.8 Backlog](stage-2.8-backlog.md) owns Epics 93 and 94.
- [Path Of Neon Internal Id Migration](path-of-neon-internal-id-migration.md) defines the combat stat naming split, report transition period, and post-migration cleanup path.
- [Path Of Neon Terminology Map](path-of-neon-terminology-map.md) defines Body Integrity, Context Stability, AI Overload, Context Rebuild, Kinetic Art, Cognitive Art, Breach Power, and Overload Resist.
- [Save API](save-api.md) defines save-version, import/export, validation, migration, and cloud-envelope behavior.
- [Combat Engine V2](combat-engine-v2.md) defines battle event, metric, contribution, and deterministic combat-extension contracts.
- [Archived Stage 2.7 Backlog](archive/stage-2.7-backlog.md) completed resource/progress save-field migration and explicitly deferred combat fields to Stage 2.8.

## Inventory Summary

The Stage 2.8 inventory used these scans:

```sh
rg --count-matches "outerHp|innerQi|maxOuterHp|maxInnerQi|outerAttack|innerAttack|outerDefense|innerDefense|breakPower|breakResist|qiBreak|qi_break|qi_recover|isQiBroken|inner_broken|innerRecovery" core/save core/progression core/combat core/balance web data tools tests/fixtures tests/save tests/combat tests/balance tests/data tests/web
rg -n "outerHp|innerQi|maxOuterHp|maxInnerQi|outerAttack|innerAttack|outerDefense|innerDefense|breakPower|breakResist|qiBreak|qi_break|qi_recover|isQiBroken|inner_broken|innerRecovery" core/save tests/fixtures tests/save
rg -n "outerHp|innerQi|maxOuterHp|maxInnerQi|outerAttack|innerAttack|outerDefense|innerDefense|breakPower|breakResist|innerRecovery" data core/data tests/data
rg -n "qiBreak|qi_break|qi_recover|isQiBroken|inner_broken|innerRecovery|innerQiRestored" core/combat core/balance web tools tests/combat tests/balance tests/web
```

Key findings:

- `core/save`, `tests/fixtures`, and `tests/save` have no direct hits for the combat stat/event symbols. Current `SaveData` stores `PlayerProgress`, and `PlayerProgress` does not persist live combatant HP, stability, overload, or recovery state.
- Static authoring schemas use legacy combat stat keys heavily through `BaseStats`, `data/heroes.json`, `data/enemies.json`, `data/equipment.json`, `data/equipmentSets.json`, `data/upgrades.json`, `data/styles.json`, `data/skills.json`, `data/skillUpgrades.json`, `data/statusEffects.json`, `data/tactics.json`, and `core/data/validation`.
- Runtime combat uses legacy symbols in `BaseStats`, `CombatantState`, formula constants, event types, metrics, contributions, targeting, damage packages, effect pipeline, status effects, battle recorder, and simulator modules.
- Web battle view models and panels still expose legacy field names such as `outerHp`, `innerQi`, `isQiBroken`, and `qi_break`, while display text already uses Body Integrity, Context Stability, and AI Overload.
- Balance and support tooling use a mixed surface: full debug report data contains `qiBreaks`, `outerHealing`, `innerQiRestored`, and `playerOuterDamage` / `playerInnerDamage`; clean tactic comparison exports include `player_outer_damage` and `player_inner_damage`; clean stage authoring CSV does not currently export `qiBreaks`.

## Save-Version Decision

Stage 2.8 does not start with a save-version bump.

Current saves do not persist live combat stat fields such as `outerHp`, `innerQi`, `isQiBroken`, `qiBreakEndsAt`, or event history. Static stat keys such as `maxOuterHp` and `innerRecoveryRate` are authored content schema and runtime inputs, not `SaveData` payload fields.

Slice 93.2 should keep `SAVE_DATA_VERSION` at `13` unless implementation discovers a real persisted combat field not found by 93.1. If that happens, stop and update this preflight before changing save migration code.

## Owned Surfaces

| Surface | Current examples | Primary owners | Stage 2.8 decision |
| --- | --- | --- | --- |
| Persisted save payload | No direct `outerHp`, `innerQi`, `qiBreak*`, or recovery hits in `core/save`, `tests/fixtures`, or `tests/save` | `core/save/saveTypes.ts`, `core/progression/types.ts` | Keep save version `13`; no combat save alias foundation is needed unless new persisted evidence appears. |
| Static base stats | `maxOuterHp`, `maxInnerQi`, `outerAttack`, `innerAttack`, `outerDefense`, `innerDefense`, `breakPower`, `breakResist`, `innerRecoveryRate` | `core/combat/types.ts`, `core/data/types.ts`, `core/data/validation/shared.ts`, `data/heroes.json`, `data/enemies.json` | Migrate with static aliases after runtime target names are locked. |
| Static stat modifiers | Equipment, sets, styles, upgrades, support fixtures using `stat: keyof BaseStats` | `data/equipment.json`, `data/equipmentSets.json`, `data/styles.json`, `data/upgrades.json`, `tools/fixtures` | Migrate with the same BaseStats alias map. |
| Static skill damage schema | `outerMultiplier`, `innerMultiplier`, `outer_multiplier`, `inner_multiplier` | `core/data/types.ts`, `data/skills.json`, `data/skillUpgrades.json`, combat damage pipeline | Migrate to Kinetic/Cognitive terms with static aliases. |
| Static recovery/effect schema | `outer_heal_percent`, `inner_heal_percent`, `outer_regeneration_percent`, `inner_regeneration_percent`, `inner_defense_down`, `lowest_outer_hp_ally`, `lowest_inner_qi_ally` | `core/data/types.ts`, `core/data/validation/combat.ts`, `core/combat/effectPipeline.ts`, skills and skill upgrades | Migrate to Body Integrity / Context Stability / Cognitive Defense terms with aliases. |
| Static tactic schema | `inner_broken`, `outer_damage_multiplier`, `inner_damage_multiplier`, `break_power_multiplier` | `data/tactics.json`, `core/data/types.ts`, `core/combat/targeting.ts`, `core/combat/damagePackage.ts` | Migrate to AI Overload, Kinetic, Cognitive, and Breach terms with aliases. |
| Status effect schema | `innerRecoveryMultiplier`, `outerDamagePerSecond`, `outerDamageTakenMultiplier`, `attackBacklashOuterHpPercent` | `data/statusEffects.json`, `core/combat/statusEffects.ts`, validation | Migrate only modifier keys tied to Stage 2.8 combat terms; keep categories and ids unless already migrated by Stage 2.6. |
| Transient combatant state | `outerHp`, `innerQi`, `isQiBroken`, `qiBreakEndsAt`, `lastInnerDamageAt` | `core/combat/types.ts`, `core/combat/simulator.ts`, targeting, damage packages, web view models | Migrate runtime field names; no save migration required. |
| Battle events | `qi_break`, `qi_recover`, `outerDamage`, `innerDamage`, `outerHealing`, `innerQiRestored` | `core/combat/types.ts`, `battleRecorder.ts`, simulator/effect pipeline/damage package | Migrate event strings and payload fields, with report/web tests proving continuity. |
| Metrics and contributions | `playerOuterDamage`, `playerInnerDamage`, `qiBreaksTriggeredByPlayer`, `playerInnerQiRestored`, `qiBreakBurstDamageDealt` | `battleRecorder.ts`, `core/combat/types.ts`, web view models, balance reports | Migrate after events; add temporary legacy report fields only where exported schemas need them. |
| Web battle surfaces | `BattleCombatantView.outerHp`, `.innerQi`, `.isQiBroken`, event category CSS | `web/state/viewModels/battle*.ts`, `web/features/battle/panels.tsx`, `web/styles/app.css` | Migrate view model fields after core runtime/event names; display copy remains current. |
| Tooling and reports | `qiBreaks`, `innerQiRestored`, `player_outer_damage`, `player_inner_damage`, formatted "Qi Breaks" text | `core/balance`, `tools/balance`, `tools/supportDecision`, tests | Migrate with schema-version bumps and temporary legacy columns where clean exports expose renamed fields. |

## Target Matrix

Decision meanings:

- **Migrate**: move the owned code/schema/report surface to the target name in Stage 2.8, preserving aliases where the surface accepts external data.
- **Keep**: leave the current name because it is not a legacy martial/internal term or is a generic mechanic term.
- **Defer**: leave the surface for Stage 2.9 cleanup or a later mechanic stage.

### Combat Stats And Runtime State

| Current field | Target field | Decision | Reason |
| --- | --- | --- | --- |
| `maxOuterHp` | `maxBodyIntegrity` | Migrate | Max durability pool should use the Body Integrity display term. |
| `outerHp` | `bodyIntegrity` | Migrate | Live durability pool should use Body Integrity. |
| `maxInnerQi` | `maxContextStability` | Migrate | Max stability pool should use the Context Stability display term. |
| `innerQi` | `contextStability` | Migrate | Live stability pool should use Context Stability. |
| `outerAttack` | `kineticAttack` | Migrate | Attack channel maps to Kinetic Art, not Body Integrity. |
| `innerAttack` | `cognitiveAttack` | Migrate | Attack channel maps to Cognitive Art. |
| `outerDefense` | `kineticDefense` | Migrate | Defense channel maps to Kinetic Art. |
| `innerDefense` | `cognitiveDefense` | Migrate | Defense channel maps to Cognitive Art. |
| `breakPower` | `breachPower` | Migrate | Display term is Breach Power. |
| `breakResist` | `overloadResist` | Migrate | Display term is Overload Resist. |
| `innerRecoveryRate` | `contextRebuildRate` | Migrate | Baseline restoration is Context Rebuild. |
| `lastInnerDamageAt` | `lastCognitiveDamageAt` | Migrate | Timer is keyed by the cognitive damage channel that delays rebuild. |
| `speed`, `critChance`, `critDamage`, `statusAccuracy`, `statusResistance` | Same | Keep | Already neutral technical terms. |

### Damage, Healing, And Restoration Fields

| Current field family | Target family | Decision | Reason |
| --- | --- | --- | --- |
| `outerDamage` | `kineticDamage` | Migrate | Damage channel is Kinetic, even though it reduces Body Integrity. |
| `innerDamage` | `cognitiveDamage` | Migrate | Damage channel is Cognitive, even though it reduces Context Stability. |
| `outerDamageTaken` / `outerDamageDealt` | `kineticDamageTaken` / `kineticDamageDealt` | Migrate | Contribution fields track damage channel totals. |
| `innerDamageTaken` / `innerDamageDealt` | `cognitiveDamageTaken` / `cognitiveDamageDealt` | Migrate | Contribution fields track damage channel totals. |
| `outerHealing`, `playerOuterHealing`, `outerHealingDone` | `bodyIntegrityRestored`, `playerBodyIntegrityRestored`, `bodyIntegrityRestoredDone` | Migrate | Pool restoration should use Body Integrity, not HP. |
| `innerQiRestored`, `playerInnerQiRestored` | `contextStabilityRestored`, `playerContextStabilityRestored` | Migrate | Pool restoration should use Context Stability. |
| `overhealing` | Same | Keep | Generic healing accounting term; not martial-specific. |
| `recoveryPrevented` | Same | Keep | Generic cross-pool anti-heal/anti-rebuild accounting; only rename if a later slice narrows it to Context Rebuild. |

### AI Overload Events And State

| Current field or value | Target field or value | Decision | Reason |
| --- | --- | --- | --- |
| `qi_break` event type/category | `ai_overload` | Migrate | Display term is AI Overload. |
| `qi_recover` event type/category | `context_rebuild` | Migrate | Event restores Context Stability after overload. |
| `isQiBroken` | `isOverloaded` | Migrate | Runtime state should match AI Overload. |
| `qiBreakEndsAt` | `overloadEndsAt` | Migrate | Runtime state should match AI Overload. |
| `qiBreaksTriggered*` | `aiOverloadsTriggered*` | Migrate | Metric and contribution counters should match AI Overload. |
| `qiBreakBurstDamage*` | `aiOverloadBurstDamage*` | Migrate | Burst damage is caused by AI Overload. |
| `qiBreakPressure` | `aiOverloadPressure` | Migrate | Balance pressure field should match AI Overload. |
| `QiBreakBurstInput` | `AiOverloadBurstInput` | Migrate | Formula input should match AI Overload. |
| `targetIsQiBroken` | `targetIsOverloaded` | Migrate | Damage input should match AI Overload. |
| `qiBrokenOuterDamageTakenMultiplier` | `overloadedKineticDamageTakenMultiplier` | Migrate | Overload modifies incoming Kinetic damage. |
| `qiBrokenInnerDamageTakenMultiplier` | `overloadedCognitiveDamageTakenMultiplier` | Migrate | Overload modifies incoming Cognitive damage. |
| `qiBreakBacklashPercent` | `aiOverloadFeedbackPercent` | Migrate | Backlash should become Feedback when tied to overload. |
| `qiBreakRecoveryPercent` | `aiOverloadContextRebuildPercent` | Migrate | Recovery amount rebuilds Context Stability after overload. |
| `qiBreakDurationSeconds` | `aiOverloadDurationSeconds` | Migrate | Duration belongs to AI Overload. |

### Static Skill, Targeting, Status, And Tactic Schema

| Current field or value | Target field or value | Decision | Reason |
| --- | --- | --- | --- |
| `outerMultiplier` | `kineticMultiplier` | Migrate | Skill damage channel is Kinetic. |
| `innerMultiplier` | `cognitiveMultiplier` | Migrate | Skill damage channel is Cognitive. |
| `outer_multiplier` | `kinetic_multiplier` | Migrate | Skill upgrade effect channel is Kinetic. |
| `inner_multiplier` | `cognitive_multiplier` | Migrate | Skill upgrade effect channel is Cognitive. |
| `outer_heal_percent` | `body_integrity_restore_percent` | Migrate | Skill effect restores Body Integrity. |
| `inner_heal_percent` | `context_stability_restore_percent` | Migrate | Skill effect restores Context Stability. |
| `outer_regeneration_percent` | `body_integrity_regeneration_percent` | Migrate | Timed pool restoration is Body Integrity regeneration. |
| `inner_regeneration_percent` | `context_stability_regeneration_percent` | Migrate | Timed pool restoration is Context Stability regeneration. |
| `inner_defense_down` | `cognitive_defense_down` | Migrate | Debuff targets the Cognitive Defense stat. |
| `lowest_outer_hp_ally` | `lowest_body_integrity_ally` | Migrate | Targeting surface should match Body Integrity. |
| `lowest_inner_qi_ally` | `lowest_context_stability_ally` | Migrate | Targeting surface should match Context Stability. |
| `inner_broken` | `overloaded` | Migrate | Targeting priority should match AI Overload. |
| `outer_damage_multiplier` | `kinetic_damage_multiplier` | Migrate | Tactic modifier should match Kinetic damage. |
| `inner_damage_multiplier` | `cognitive_damage_multiplier` | Migrate | Tactic modifier should match Cognitive damage. |
| `break_power_multiplier` | `breach_power_multiplier` | Migrate | Tactic modifier should match Breach Power. |
| `innerRecoveryMultiplier` | `contextRebuildMultiplier` | Migrate | Status modifier affects baseline Context Rebuild. |
| `outerDamagePerSecond` | `bodyIntegrityDamagePerSecond` | Migrate | Status tick damages the Body Integrity pool. |
| `outerDamageTakenMultiplier` | `kineticDamageTakenMultiplier` | Migrate | Status modifier affects the Kinetic damage channel. |
| `attackBacklashOuterHpPercent` | `feedbackBodyIntegrityPercent` | Migrate | Backlash damage should become Feedback against Body Integrity. |
| Status category `"recovery"` | Same | Keep | Generic category for healing/rebuild support; not legacy-specific. |
| Status dispel tag `"inner"` | Same for Stage 2.8 | Defer | Tag taxonomy is low-value churn before Cognitive Intrusion defines future status groups. |

### Report, Export, And Web Fields

| Current field or column | Target field or column | Decision | Reason |
| --- | --- | --- | --- |
| `BattleCombatantView.outerHp` / `.innerQi` / max fields | Body Integrity / Context Stability fields | Migrate | Web view model should stop exposing legacy pool names after runtime migration. |
| `BattleCombatantView.outerAttack` / `.innerAttack` | Kinetic / Cognitive fields | Migrate | Web view model should match current stat names. |
| `BattleCombatantView.isQiBroken` | `isOverloaded` | Migrate | Web state should match AI Overload. |
| Battle event category CSS `.qi_break`, `.qi_recover` | `.ai_overload`, `.context_rebuild` | Migrate | Event category styling should match new event strings. |
| Formatted "Qi Breaks" report text | "AI Overloads" | Migrate | User/tool text should use current terminology. |
| `GameBalanceReport.stageResults[].qiBreaks` | `aiOverloads` | Migrate | Full report data should match current event terms. |
| `GameBalanceReport.recoveryEvents.innerQiRestored` | `contextStabilityRestored` | Migrate | Full report data should match current restoration terms. |
| Tactic CSV `player_outer_damage` / `player_inner_damage` | `player_kinetic_damage` / `player_cognitive_damage` | Migrate with temporary legacy columns | Clean CSV exports are downstream contracts. |
| Tactic JSON `contributionMetrics.playerOuterDamage` / `playerInnerDamage` | `playerKineticDamage` / `playerCognitiveDamage` | Migrate with temporary legacy fields | Clean JSON exports are downstream contracts. |
| Stage authoring CSV reward columns | `reward_silver`, `reward_cultivation`, `reward_combat_experience` | Keep | Static reward schema is not a combat-symbol surface. |

## Compatibility Behavior

### Saves And Cloud Envelopes

- Keep `SAVE_DATA_VERSION` at `13` for 93.2.
- Do not add combat save migrations or save fixtures unless a later slice proves a real persisted combat field exists.
- Cloud envelope behavior is unchanged because `rawSave` does not contain live combat stat/event state.
- If new combat state becomes persisted in a future feature, it must be treated as a new save-schema slice, not slipped into Stage 2.8 cleanup.

### Static Data Aliases

Stage 2.8 should add static schema aliases before rewriting authored data:

- If only the legacy field/value is present, normalize it to the target field/value before validation and runtime assembly.
- If only the target field/value is present, keep it.
- If both legacy and target fields are present with equivalent values, keep the target field and report or test the normalization where practical.
- If both are present with conflicting values, fail validation with an explicit conflicting-alias error.
- Alias normalization must be deterministic and data-local. It should not change ids, stage references, save references, reward schema names, or balance tuning values.

Suggested conflict error shape:

```text
conflicting combat schema aliases: <target field> and <legacy field>
```

### Reports And Exports

- Internal full report JSON may rename fields in place once tests are updated.
- Clean JSON/CSV exports should bump their schema version if exported field names change.
- Where clean exports rename existing downstream fields, include temporary legacy fields or columns for one transition period.
- Stage 2.8 should not remove Stage 2.5/2.6 temporary legacy id columns.
- Formatted human-readable report text can move directly to current display terms.

## Fixture And Test Plan

No save-version fixture is required for 93.2 because 93.1 found no persisted combat stat fields in current saves.

Focused coverage for later slices:

| Test surface | Required coverage |
| --- | --- |
| `tests/data/validateData.test.ts` | Static aliases for BaseStats, skill effects, target rules, status effect keys, tactic modifier types, equivalent alias acceptance, and conflicting alias rejection. |
| `tests/combat/formulas.test.ts` | Renamed formula inputs/constants preserve current numeric behavior. |
| `tests/combat/damagePackage.test.ts` | Kinetic/Cognitive damage and AI Overload package names preserve current event and metric values. |
| `tests/combat/simulator.test.ts` | `ai_overload` and `context_rebuild` events replace `qi_break` and `qi_recover` without behavior drift. |
| `tests/combat/battleRecorder.test.ts` | Event records, metrics, and contributions use current symbols. |
| `tests/combat/targeting.test.ts` | `overloaded` target rule aliases `inner_broken` during transition. |
| `tests/combat/skillEffects.test.ts` and `tests/combat/statusEffects.test.ts` | Body Integrity / Context Stability effect aliases and Context Rebuild modifiers preserve behavior. |
| `tests/web/*` | Battle view models, event categories, panels, and display text remain coherent. |
| `tests/tools/balanceReport.test.ts` | Full reports, formatted reports, tactic comparison JSON/CSV, schema versions, and temporary legacy columns are updated intentionally. |
| `npm run simulate` and `npm run support-decision` | Existing known balance notes remain behaviorally unchanged after symbol migration. |

## Stale Scan Expectations

After each implementation slice, scan active code and docs for the owned legacy combat symbols:

```sh
rg "outerHp|innerQi|maxOuterHp|maxInnerQi|outerAttack|innerAttack|outerDefense|innerDefense|breakPower|breakResist|innerRecoveryRate"
rg "qiBreak|qi_break|qi_recover|isQiBroken|inner_broken|qiBroken"
rg "outer_damage_multiplier|inner_damage_multiplier|break_power_multiplier|outer_heal_percent|inner_heal_percent|lowest_outer_hp|lowest_inner_qi|innerRecoveryMultiplier"
rg "Outer HP|Inner Qi|Qi Break"
```

Expected remaining hits after Stage 2.8 implementation should be limited to:

- static schema alias helpers and migration/normalization tests;
- legacy static-data fixtures used to prove alias compatibility;
- temporary legacy report/export columns approved by this preflight;
- active Stage 2.8 docs until archive;
- archived historical docs;
- Stage 2.9 cleanup notes for intentionally deferred tag/category or generic recovery terms.

Owned legacy combat symbols should not remain in current runtime combat state, current authored static data, current web battle view models, current formatted reports, or new clean export primary fields after Stage 2.8 closes.

## 93.2 Handoff

Slice 93.2 should implement alias foundations without changing save version:

- Add combat/static schema alias helpers near static data loading and validation, not under `core/save`.
- Keep `SAVE_DATA_VERSION` at `13`.
- Start with `BaseStats`, skill damage multipliers, skill effect types, target rules, status effect modifier keys, and tactic modifier aliases approved here.
- Add focused validation tests for equivalent aliases and conflicts before rewriting canonical `data/*.json`.
- Leave runtime renames for 93.3 and report/export renames for Epic 94 slices.
- Update [Stage 2.8 Backlog](stage-2.8-backlog.md) as each later slice completes.
