# Stage 2.1 Tactics Audit

## Decision

Stage 2.1 implemented **global tactic presets** as the first deeper player strategy layer.

The player-facing version stores one selected tactic in player progress, defaults missing or invalid values to `balanced`, and passes that tactic from `resolveStageBattle` into `simulateBattle`. The balanced tactic is behaviorally neutral so existing saves, reports, and content baselines stay comparable until a player or test selects a non-default tactic.

Epic 69 introduced the combat side first as a transient `tacticId` on `SimulateBattleInput` and `ResolveStageBattleInput`, plus `BattleResult.playerTactic` metadata. Epic 70 promoted that selection into `PlayerProgress.selectedTacticId`, save normalization, import/export, progression battle fallback, and the web selector.

Tactic definitions are authored as static data in `data/tactics.json`, assembled into `StaticGameData`, and validated with the rest of content. Tactics are player-facing authored content, not hidden combat constants, and are reviewable through the same content pipeline that Stage 2.0 established.

## Candidate Comparison

| Candidate | Player value | Implementation shape | Decision |
| --- | --- | --- | --- |
| Tactic presets | Clear pre-battle choice that can change targeting, damage emphasis, sustain, or protection without new content. | Small static-data schema, one saved selection, combat modifiers through existing extension points, compact UI. | Chosen for Stage 2.1. |
| Formation bonuses | Strong martial-fantasy layer, especially once slot/style synergies matter. | Requires slot/style bonus schema, balance retune, and more UI explanation on top of current formation controls. | Defer until tactics reveal which slot/style incentives matter. |
| Manual battle actions | High agency during boss fights. | Requires real-time or queued controls, battle timing UI, stronger input state, and likely mobile-specific interaction work. | Out of scope for Stage 2.1. |
| Skill branch decisions | Strong long-term build identity. | Larger progression/content system touching unlocks, costs, branch balance, and skill documentation. | Keep as later growth content; do not block tactics. |

## MVP Tactic Set

| Id | Player name | Intent | Primary behavior lane |
| --- | --- | --- | --- |
| `balanced` | Balanced Form | Preserve current combat behavior and provide the default for existing saves. | No targeting, damage, scheduler, recovery, or medicine changes. |
| `outer_pressure` | Crushing Blows | Finish wounded targets and convert damage into faster Outer HP clears. | Targeting override toward `weakest_hp`; modest Outer damage emphasis. |
| `inner_pressure` | Meridian Break | Break dangerous enemies and exploit Qi Break windows. | Targeting override toward high-priority enemies and `inner_broken`; modest Inner damage or break-pressure emphasis. |
| `guard_support` | Guard The Healer | Keep support/backline heroes alive during pressure fights. | Protection/guard/recovery targeting and mitigation emphasis. |
| `sustain` | Long Breath | Win longer fights through recovery and safer status pressure. | Recovery, resistance, and auto-medicine posture emphasis. |
| `boss_burst` | Boss Burst | Focus elite or boss-like threats for a decisive clear attempt. | High-CP target priority with a small opening or boss-pressure damage emphasis. |

These names are the implemented Stage 2.1 MVP copy. Future copy tuning should preserve the ids unless a save migration also updates persisted selections.

## Behavior Boundaries

- `balanced` is the compatibility baseline and should not rewrite skill target rules, stats, cooldowns, auto-medicine settings, or battle events.
- Tactics should affect only the player team in the first implementation. Enemy tactics are out of scope.
- Tactics should not mutate skill definitions at load time. Resolve tactic effects at battle runtime so data remains stable and reports can compare tactics cleanly.
- Tactics may override a selected skill's effective target rule, apply small damage/recovery/protection multipliers, or alter auto-medicine policy inputs, but each field must be explicit in the tactic schema.
- Tactics should not create new real-time player input during battle.
- Tactics should not hide existing budget misses. Black Iron Fort and Demon Cult misses remain visible unless a later epic intentionally retunes them.

## Current Ownership And Extension Map

Stage 2.1 tactics are now live. This map records the current owning surfaces and the expected extension path for future tactic work.

| Surface | Current ownership | Extension contract |
| --- | --- | --- |
| Static data | `data/tactics.json`, `data/staticGameData.ts`, `core/data/staticDataBuilder.ts`, `core/data/types.ts` | `data/tactics.json` is the canonical tactic catalog, assembled into `StaticGameData.tactics` and shared through the static data builder. New tactic fields travel through the content type, builder assembly, and data export together. |
| Validation | `core/data/validateData.ts`, `core/data/validation/combat.ts`, `tests/data/*` | Validation owns duplicate ids, the single balanced default, player-facing copy requirements, supported target rules, modifier ranges, and contradictory fields. New behavior fields need validation and representative failure tests before use. |
| Combat input | `core/combat/types.ts`, `core/combat/simulator.ts` | Battle simulation accepts an optional tactic input, falls back to balanced when missing, and exposes the applied tactic id through result/report metadata. |
| Targeting | `core/combat/targeting.ts`, `core/combat/damagePackage.ts` | Tactic target-rule overrides resolve at runtime before `selectTarget`; skill definitions stay unchanged. |
| Damage and defense | `core/combat/damagePackage.ts`, `core/combat/defensivePipeline.ts` | Player-side tactic multipliers belong in package creation or mitigation, keeping combat mutation inside the existing damage/defense commits. |
| Recovery and status | `core/combat/effectPipeline.ts`, `core/combat/statusEffects.ts`, `core/combat/autoMedicine/*` | Sustain and protection posture changes belong where recovery, resistance, cleanse, or medicine policy already resolves. |
| Metrics and events | `core/combat/battleRecorder.ts`, `web/state/viewModels/battle.ts` | Tactic metadata and contribution fields should explain tactic impact while preserving battle replay semantics. |
| Progression adapter | `core/progression/types.ts`, `core/progression/battleResolution.ts` | `resolveStageBattle` sources the selected tactic from `PlayerProgress.selectedTacticId` when no explicit tactic input is supplied. |
| Save loading | `core/save/*`, `tests/save/*`, `web/state/saveStorage.ts` | Save schema v10 persists `selectedTacticId`, migrates missing tactics to `balanced`, validates imported tactic ids, and normalizes invalid ids. |
| Web state | `web/state/actions.ts`, `commandActions.ts`, `reducerBranches.ts`, `useWebGameCommandDomains.ts`, `viewModels/*` | The strategy action domain, tactic command factory, reducer branch, hook command, and tactic view-model builder own selected-tactic state flow. |
| Web UI | `web/app/AppPanels.tsx`, `web/features/*`, `web/styles/app.css` | The compact Strategy panel owns selectable tactic presets and selected state near roster/formation. |
| Balance report | `core/balance/simulatedBalanceReport.ts`, `tools/balance/*`, `tools/simulateBattle.ts` | Default balanced report output remains the release gate. Opt-in tactic comparison exports/reports own tactic-specific rows. |

## Save And UI Decision

The player-facing implementation uses one **global selected tactic** stored on `PlayerProgress` as `selectedTacticId`.

Per-stage, per-region, or saved combat-plan tactics would be more expressive, but they add routing, UI, and import/export complexity before tactics prove their value. Global selection is enough for the first player-facing strategy choice and matches current global systems such as active team, formation, style branches, skill upgrades, and auto-medicine preferences.

The visible UI is a compact tactic selector in the existing app panel flow. It shows the selected tactic alongside the preset choices, and the battle summary includes the tactic used for the most recent battle through `BattleResult.playerTactic`.

## Balance Output Decision

Preserve the Stage 2.0 default outputs:

```sh
npm run simulate
npm run --silent simulate -- --export-json
npm run --silent simulate -- --csv
```

Epic 71 added opt-in tactic comparison outputs rather than changing every default table:

- `npm run --silent simulate -- --tactics-json` for stable comparison rows.
- `npm run --silent simulate -- --tactics-csv` for spreadsheet review.
- A concise terminal tactic comparison can be added only if it stays readable and does not bury the existing budget-gate report.

Comparison rows include tactic id, tactic name, region id, stage id, result, baseline result, duration, target status, budget shift, status damage, medicine consumed, guard/protection/healing pressure, and contribution deltas.

## Historical Epic 68 Schema Handoff

This section is retained as closure history, not active implementation guidance. Epic 68 covered the static data contract before combat behavior shipped:

1. Tactic data types and `StaticGameData.tactics`.
2. `data/tactics.json` with the six MVP ids above and `balanced` marked as the default.
3. Validation for ids, labels, default count, target-rule references, range checks, and contradictory fields.
4. Tests proving valid tactics pass and invalid tactics fail with actionable messages.
5. Minimal schema documentation before Epic 69 documented deeper behavior.

The static-data contract now exists in [tactics.json](../../data/tactics.json), `StaticGameData.tactics`, and `validateStaticGameData`. Epic 69 activated the combat behavior through runtime tactic inputs, and Epic 70 completed persistence and web selection.
