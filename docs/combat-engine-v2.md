# Combat Engine V2

This guide is for new contributors working on the combat engine produced by Stage 1.8. The engine is deterministic, data-driven at the battle boundary, and centered on `simulateBattle` in `core/combat/simulator.ts`.

## Public entry points

- `simulateBattle(staticData, input)` in `core/combat/simulator.ts` is the battle runner. It builds lookups, resolves the optional player tactic, initializes combatants, runs fixed time steps, and returns winner, duration, applied tactic metadata, events, final teams, metrics, contribution rows, and auto-medicine state.
- `resolveStageBattle(staticData, input)` in `core/progression/battleResolution.ts` is the progression adapter. It uses an explicit `input.tacticId` when provided, otherwise reads `PlayerProgress.selectedTacticId` and falls back to `balanced` for missing or invalid saved values.
- `core/index.ts` exports `core/combat/index.ts`, which re-exports the combat API. Prefer importing combat behavior through the core barrel from web, tools, and tests unless a local combat module needs an internal helper.
- `createBattleEventRecords`, `createBattleEventRecord`, `BattleEventRecord`, and `BATTLE_EVENT_TYPES` are the public battle event metadata helpers re-exported by `core/combat/index.ts`.
- Metrics and contribution helpers also live in `battleRecorder.ts`, but they are simulator internals unless a future stage deliberately promotes them through `core/combat/index.ts`.
- `damagePackage.ts`, `defensivePipeline.ts`, and `effectPipeline.ts` are internal extension points. Edit them when adding combat behavior, but do not import them from web, tools, progression, or balance code.
- Static data enters as typed `StaticGameData`. The combat engine does not import JSON directly.

## Pipeline order

`simulateBattle` creates a runtime, then loops from `0` to `maxDurationSeconds` in `stepSeconds` increments.

1. Runtime setup:
   - `createLookup` indexes heroes, enemies, skills, skill upgrades, and status definitions.
   - `resolvePlayerTactic` resolves `input.tacticId` to a validated tactic preset, defaulting missing or unknown ids to `balanced`.
   - `applyPreBattleAutoMedicine` may consume pre-battle resistance medicine before combatants are created.
   - `createCombatantState` derives stats, applies player-side tactic status resistance, initial HP/Qi, cooldown state, formation slot, family multipliers, timed status fields, data status list, and first `nextActionAt`.
2. Step advance phase:
   - `expireStatusEffects` clears expired timed statuses and medicine resistance bonuses.
   - `advanceCombatantDataStatuses` advances `activeStatuses`, applies status tick damage, records `status_tick`/`status_expire`, and marks defeats.
   - `recoverQiBreaks` ends Qi Break windows and restores inner Qi.
   - `recoverInnerQi` restores inner Qi after the configured delay, with data-status recovery modifiers.
   - `tickRegeneration` applies timed regeneration ticks.
3. Action phase:
   - Combatants are visited in runtime array order.
   - `canCombatantActAt` checks living state and `nextActionAt`.
   - `chooseSkill` selects the first ready configured skill, applies skill upgrades, or falls back to `baseline_strike`.
   - `resolveAttackDamageTargets` selects the intended enemy target, applying player tactic target priorities when present, and may redirect damage to a protector.
   - `createAttackDamagePackage` calculates outer/inner damage from attacker stats, effective target stats, family multipliers, player tactic damage modifiers, Qi Break modifiers, and data status modifiers.
   - `applyDamagePackageMitigation` applies guard first, then protection.
   - `commitDamagePackage` mutates target HP/Qi and records attack damage.
   - `applyTimedSkillEffects` handles post-attack timed/status effects.
   - `applyRecoverySkillEffects` handles heals, regeneration setup, and cleanse.
   - `applyQiBreakIfNeeded`, defeat checks, Qi Break backlash, and data-status attack backlash run after skill effects.
   - Skill cooldown and `scheduleNextAction` update the attacker.
   - `applyBattleCleanseAutoMedicine` may cleanse player combatants after each combatant action.
   - Winner is checked after each combatant's action block.

Protection note: Stage 1.8 passes the redirected damage target into post-attack/recovery effect resolution. The attack event still carries `intendedTargetId` when protection redirected the hit.

## Where to add a new skill effect

Skill effects start in static data and end in `core/combat/effectPipeline.ts`.

1. Add the effect type to `SKILL_EFFECT_TYPES` and the `SkillEffect` type shape in `core/data/types.ts`.
2. Add static validation in `core/data/validation/combat.ts`, including value/chance, target, duration, and references.
3. Add the effect to `COMBAT_SKILL_EFFECT_HANDLERS`; this `satisfies Record<SkillEffectType, string>` check catches unclassified types.
4. Add a handler in `effectPipeline.ts` and register it in either `POST_ATTACK_SKILL_EFFECT_HANDLERS` or `RECOVERY_SKILL_EFFECT_HANDLERS`.
5. If the effect emits a battle event, extend `BattleEvent` in `core/combat/types.ts`, `BATTLE_EVENT_TYPES` in `battleRecorder.ts`, and `getBattleEventStatusId` in `statusMetadata.ts` when the event carries a status.
6. Add focused tests under `tests/combat`, plus data validation coverage when the effect can appear in JSON.

Inside `effectPipeline.ts`, use the local `selectEffectTarget`/`selectOffensiveEffectTarget` helpers for effect target semantics. Current supported targets are `self`, `target`, `lowest_outer_hp_ally`, `lowest_inner_qi_ally`, and `wounded_or_armor_broken_ally`.

## Where to add a status hook

There are two status systems.

- Timed combat statuses are fixed fields on `CombatantState`: guard, protection, armor break, wound, speed down, inner defense down, and regeneration. To add one, update the `StatusEffectId` union and `CombatantState` field in `core/combat/types.ts`, metadata in `statusMetadata.ts`, and the `getStatusEffect`, `setStatusEffect`, and `clearStatusEffect` switches in `statusEffects.ts`.
- Data statuses live in `activeStatuses` and are defined by `data/statusEffects.json`. They are applied by the `apply_status` skill effect, advanced by `advanceStatusEffects`, and interpreted through `getStatusCombatModifiers` and `calculateStatusTickOuterDamage`.

Put recurring tick behavior in `advanceStatusEffects` for data statuses or `tickRegeneration` for the timed regeneration status. Put stat multipliers in `getStatusCombatModifiers`. Put application chance, duration, stack, and resistance behavior in `statusEffects.ts`.

Auto-medicine interacts with status hooks through `core/combat/autoMedicine/application.ts`: pre-battle resistance applies timed resistance bonuses, while battle cleanse consumes inventory, clears cleanseable statuses, records `auto_medicine`, and adds any resistance bonus from the medicine used.

## Where to add damage or defense behavior

- Target selection rules belong in `core/combat/targeting.ts`. Add the `TargetRule` type, `TARGET_RULES`, validation, and tests together.
- Raw package creation belongs in `core/combat/damagePackage.ts`. Keep package creation separate from mutation so target/source invariants stay enforceable.
- Target stat reductions before damage belong in `getEffectiveTargetStats` in `core/combat/defensivePipeline.ts`.
- Damage prevention or redirection belongs in `applyDamagePackageMitigation`, `applyGuardReduction`, `findProtector`, or `applyProtectionReduction`.
- HP/Qi mutation and attack/Qi Break/backlash events belong in the commit functions in `damagePackage.ts`.
- Aggregate and per-combatant accounting belongs in `battleRecorder.ts`.

Guard currently reduces outer damage and is countered by armor break. Protection can redirect to a living ally in an earlier formation slot and reduces both outer and inner damage after guard.

Player tactic presets live in static data, are normalized for saves by `core/progression/tactics.ts`, and are resolved at battle runtime by `core/combat/tactics.ts`. Keep tactic behavior player-side for now and route new tactic effects through the existing targeting, damage package, defensive, recovery, status, or auto-medicine owners instead of mutating skill definitions.

## Where to add scheduler rules

Scheduler behavior lives in `core/combat/scheduler.ts`.

- Initial and next action times use `calculateAttackInterval`.
- `getEffectiveActionSpeed` applies active `speed_down`.
- `canCombatantActAt` requires the combatant to be living and `time >= nextActionAt`.
- `scheduleNextAction` writes `nextActionAt` after the action finishes.

Add speed/action gating rules here when they affect turn cadence. Add cooldown-specific rules in `chooseSkill`/the cooldown update in `simulator.ts`.

## Battle event and metric contracts

Battle events are the detailed replay contract; metrics and contributions are aggregate reporting contracts.

- Add every event variant to `BattleEvent` in `core/combat/types.ts`.
- Add every event type string to `BATTLE_EVENT_TYPES` in `battleRecorder.ts`.
- Keep `createBattleEventRecord` stable: event records use index, type, status id, and time.
- Route status-bearing events through `getBattleEventStatusId` in `statusMetadata.ts`.
- Initialize new aggregate fields in `createInitialMetrics` and update `finalizeMetrics` if derived fields depend on them.
- Initialize new per-combatant fields in `createInitialContributions` and finalize survival in `finalizeContributions`.
- Record metrics at the mutation point that owns the behavior: damage packages for damage, defensive pipeline for prevention, effect pipeline for healing/cleanse/status effects, simulator status advancement for data-status ticks.

## Boundary rules

- Combat code accepts `StaticGameData` from callers and must not import from `data/staticGameData.ts`.
- Keep engine modules browser-independent: no DOM, storage, timers, random global state, or UI imports.
- Use deterministic rules for probabilistic combat behavior. `apply_status` uses a deterministic hash from attacker, target, skill, status, and time.
- Preserve package invariants: source, damage target, and intended target are asserted before mitigation/commit.
- Do not bypass static data validation when adding JSON-supported behavior. `validateStaticGameData` in `core/data/validateData.ts` delegates combat checks to `core/data/validation/combat.ts`.

## Verification commands

For a narrow combat change:

```sh
npm test -- tests/combat/simulator.test.ts tests/combat/damagePackage.test.ts tests/combat/skillEffects.test.ts tests/combat/statusEffects.test.ts tests/combat/defensiveEffects.test.ts tests/combat/battleRecorder.test.ts tests/combat/scheduler.test.ts
```

For static data or new effect/status schema changes:

```sh
npm test -- tests/data/validateData.test.ts tests/data/staticDataBuilder.test.ts
```

For a broader confidence pass:

```sh
npm run typecheck
npm test -- tests/combat tests/data
```
