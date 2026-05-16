# Stage 3.0 Backlog: Cognitive Intrusion Prototype

## Current Status

Stage 3.0 is the active post-migration mechanic milestone. It implements Epics 95 and 96 from [Path Of Neon Retheme Migration Plan](retheme-migration-plan.md): Cognitive Intrusion Contract and Cognitive Intrusion Prototype.

[Archived Stage 2.9 Backlog](archive/stage-2.9-backlog.md) closed the cleanup and handoff work. Stage 2.9 kept compatibility-sensitive transition fields stable, refreshed [Cognitive Intrusion Prototype Contract](cognitive-intrusion-prototype-contract.md), and confirmed the first implementation should be one small data-driven status mechanic with no save, export, event, taxonomy, storage-key, or internal-id migration.

Slices 95.1, 96.1, and 96.2 are complete. Epic 95 found no blocker or contract mismatch; Slice 96.1 added the `cognitiveDamageTakenMultiplier` schema, validation, aggregation, and estimation support; Slice 96.2 applies the aggregate only to Cognitive attack damage.

## Stage Theme

Make Cognitive Art feel like hostile system pressure by adding **Intrusion**, a status that increases Cognitive damage taken and slows Context Rebuild long enough to create clearer AI Overload windows.

The milestone should prove that Path of Neon is more than renamed combat vocabulary while staying conservative about compatibility. It should reuse existing combat status, battle summary, counterplay, simulator, and report surfaces rather than opening a broader systems rewrite.

## Source Contracts And Carry-Forward Decisions

- Use [Cognitive Intrusion Prototype Contract](cognitive-intrusion-prototype-contract.md) as the implementation boundary.
- Implement one new static status id: `cognitive_intrusion`.
- Implement one new status effect modifier: `cognitiveDamageTakenMultiplier`.
- Reuse the existing `contextRebuildMultiplier` modifier on the same status.
- Use `dispelTags: ["debuff"]` for the first status; do not introduce a new cognitive-specific dispel tag.
- Attach Intrusion through Azure Pulse Monk's `context_shock_refinement` upgrade, preferably as an `add_skill_effect` unlock at level 3.
- Preserve Stage 2.9 keep decisions for tactic comparison legacy damage columns, engine-level `outerDamage` / `innerDamage` replay/accounting payload fields, static taxonomy keys, upgrade `art` buckets, and the existing `inner` tag.
- Keep known Black Iron Foundry and Redline Outpost balance debt visible. Do not accidentally retune it away as part of this milestone.

## Scope

- Status schema, validation, aggregation, and combat estimation support for `cognitiveDamageTakenMultiplier`.
- Cognitive-only damage-package integration.
- One static status definition and one existing upgrade hook.
- Existing UI/status/counterplay/battle summary visibility.
- Focused simulator and combat regression coverage that proves the mechanic changes outcomes through Cognitive pressure and AI Overload timing.
- Docs updates that mark Stage 3.0 as active and record any tuning decisions.

## Non-Goals

- No District Heat, Trace, Firewall, Calibration Debt, hostile Intrusion, AI Raid, augment loadout, protocol deck, network operation, or countermeasure economy implementation.
- No save schema migration, save-version bump, storage-key migration, backend/cloud-save contract change, or persisted battle-status field.
- No new battle event type, report/export field, tactic comparison schema version, status category, or status taxonomy migration.
- No broad Redline, Black Iron Foundry, or full combat rebalance.
- No rename of existing status ids, skill ids, tactic ids, save fields, report compatibility aliases, static taxonomy keys, or engine replay/accounting fields.

## Exit Criteria

- `cognitive_intrusion` exists in static status data and validates through the canonical content bundle.
- Status modifier aggregation multiplies `cognitiveDamageTakenMultiplier` with a default of `1`.
- Intrusion increases Cognitive damage only. Kinetic damage, status ticks, feedback, and AI Overload burst damage are unchanged by the new modifier.
- Intrusion slows Context Rebuild through the existing `contextRebuildMultiplier`.
- Azure Pulse Monk applies Intrusion only after the selected `context_shock_refinement` unlock level.
- Existing status chips, cleanse/purge paths, battle summaries, simulator output, and tactic comparison rows make the mechanic observable without new exported fields.
- Save fixture/import tests pass without a schema migration or save-version bump.
- `npm run simulate` still reports known Black Iron Foundry and Redline Outpost budget debt by stable ids.
- Active docs point to Stage 3.0 while archived Stage 2.9 remains the closed handoff record.

## Epic Summary

| Slice | Epic | Title | Status |
| --- | --- | --- | --- |
| 95.1 | 95 | Cognitive Intrusion Contract Adoption | Complete |
| 96.1 | 96 | Status Modifier Schema And Validation | Complete |
| 96.2 | 96 | Cognitive Damage Application | Complete |
| 96.3 | 96 | Static Data And Upgrade Hook | Planned |
| 96.4 | 96 | Presentation And Counterplay Visibility | Planned |
| 96.5 | 96 | Simulator, Balance, And Regression Review | Planned |
| 96.6 | 96 | Release Hardening And Archive Readiness | Planned |

## Slice 95.1: Cognitive Intrusion Contract Adoption

Confirm the refreshed contract is implementation-ready after Stage 2.9 and map the exact files/tests that will own the prototype.

### Tasks

- Re-read [Cognitive Intrusion Prototype Contract](cognitive-intrusion-prototype-contract.md), [Archived Stage 2.9 Backlog](archive/stage-2.9-backlog.md), [Combat Engine V2](combat-engine-v2.md), and status/static-data docs before touching runtime code.
- Identify the current status modifier types, combat aggregation path, static validation path, status metadata path, skill-upgrade effect path, and focused test files.
- Record any discovered mismatch between the contract and current code before implementation.
- Keep the milestone boundary explicit: one status id, one new effect key, reused Context Rebuild modifier, no save/export/event/taxonomy churn.

### Implementation Path

Completed in docs/preflight. The contract matches the current code shape and can proceed without a contract change.

| Concern | Primary files | Notes for Slice 96 |
| --- | --- | --- |
| Status modifier types | `core/combat/types.ts` | Add `cognitiveDamageTakenMultiplier` to `StatusEffectModifiers` and `StatusCombatModifiers`. |
| Status defaults and aggregation | `core/combat/statusEffects.ts` | Add default `1` and multiply through `getStatusCombatModifiers` like `kineticDamageTakenMultiplier` and `contextRebuildMultiplier`. |
| Static status validation | `core/data/validation/combat.ts` | Add the key to `statusEffectKeys`; `validateStatusEffect` already rejects unsupported keys and non-number values. |
| Damage package | `core/combat/damagePackage.ts` | Apply the new aggregate only to `innerDamage`/Cognitive attack damage inside `createAttackDamagePackage`; keep Kinetic, status ticks, feedback, and AI Overload burst unchanged. |
| Context Rebuild | `core/combat/simulator.ts` | Reuse existing `contextRebuildMultiplier` handling in the rebuild loop; no new rebuild key is needed. |
| Data status application | `core/combat/effectPipeline.ts` | Existing `apply_status` handling should apply `cognitive_intrusion` without a new skill-effect type. |
| Static data | `data/statusEffects.json`, `data/skillUpgrades.json` | Add `cognitive_intrusion`; add one `context_shock_refinement` `add_skill_effect` unlock. |
| Skill-upgrade validation | `core/data/validation/growth.ts` | Existing `add_skill_effect` validation delegates to `validateSkillEffect`, so the new status reference should validate after static data is added. |
| Skill-upgrade runtime | `core/progression/skillUpgrades.ts` | Existing `add_skill_effect` unlock-level logic should gate Intrusion after the selected level. |
| Status metadata and UI | `core/combat/statusMetadata.ts`, `web/statusPresentation.ts` | Data-status display names already come from status definitions; no timed status metadata should be added. |
| Estimation and balance signals | `core/combat/statusEstimation.ts`, `core/balance/supportCombatPower.ts`, `core/balance/balanceReportBuilder.ts` | Review Cognitive vulnerability estimation/support scoring when adding the modifier so reports remain useful without export-schema changes. |
| Focused tests | `tests/data/validateData.test.ts`, `tests/combat/statusEffects.test.ts`, `tests/combat/damagePackage.test.ts`, `tests/combat/simulator.test.ts`, `tests/combat/statusEstimation.test.ts`, `tests/progression/upgrades.test.ts`, `tests/web/statusPresentation.test.ts` | Use existing suites; add new files only if these owners become too broad. |

No implementation mismatch was found. The only planning clarification is that upgrade-gating coverage should use the existing progression/combat suites, and status-estimation coverage should be included when the Cognitive vulnerability modifier lands.

### Acceptance

- The implementation path is documented in this backlog or a follow-up note before Slice 96.1 begins.
- Any contract mismatch is resolved by either a tiny contract clarification or a scoped implementation adjustment.
- No runtime behavior changes are included in this slice unless they are documentation-only references.

### Verification

- `git diff --check`
- Markdown link/path spot check for docs touched in the slice.

## Slice 96.1: Status Modifier Schema And Validation

Add schema and aggregation support for `cognitiveDamageTakenMultiplier`.

### Tasks

- Add optional `cognitiveDamageTakenMultiplier?: number` to status effect modifier typing.
- Add aggregate `cognitiveDamageTakenMultiplier: number` to status combat modifiers with default `1`.
- Add the key to static status validation and unsupported-key rejection paths.
- Multiply stacked values in the status aggregation path like existing damage-taken, healing, or Context Rebuild multipliers.
- Update status estimation or preview logic that reads aggregated combat modifiers.
- Add focused validation and aggregation tests.

### Implementation Notes

Completed in runtime code and tests.

- `core/combat/types.ts` now includes optional `StatusEffectModifiers.cognitiveDamageTakenMultiplier` and aggregate `StatusCombatModifiers.cognitiveDamageTakenMultiplier`.
- `core/combat/statusEffects.ts` now defaults the aggregate to `1` and multiplies stacked Cognitive vulnerability modifiers through `getStatusCombatModifiers`.
- `core/data/validation/combat.ts` now accepts `cognitiveDamageTakenMultiplier` while keeping unsupported-key rejection.
- `core/combat/statusEstimation.ts` now estimates Cognitive vulnerability modifier value for balance/support previews without adding report/export fields.
- `tests/data/validateData.test.ts`, `tests/combat/statusEffects.test.ts`, and `tests/combat/statusEstimation.test.ts` cover validation acceptance/rejection, aggregation defaults/multiplication, and Cognitive vulnerability estimation.

### Acceptance

- Static data accepts `cognitiveDamageTakenMultiplier` and still rejects unknown status effect keys.
- Combat modifier aggregation returns `1` when no Intrusion-like status is active.
- Multiple sources multiply predictably if stacking becomes possible later, even though the first status uses `maxStacks: 1`.
- Existing status effects continue to validate and aggregate unchanged.

### Verification

- Passed: `npm test -- tests/data/validateData.test.ts tests/combat/statusEffects.test.ts tests/combat/statusEstimation.test.ts`
- Passed: `npm run typecheck`
- Pending final slice check: `git diff --check`

## Slice 96.2: Cognitive Damage Application

Apply the aggregated modifier only to Cognitive damage.

### Tasks

- Thread `cognitiveDamageTakenMultiplier` into the damage package where Cognitive damage taken is resolved.
- Ensure Kinetic damage, status ticks, feedback/backlash, guard/protection mitigation, and AI Overload burst damage do not use the new multiplier.
- Add combat or damage-package tests that compare the same target with and without Intrusion for Cognitive and Kinetic damage.
- Check battle summary contribution metrics still report current Kinetic/Cognitive names without new legacy aliases.

### Implementation Notes

Completed in runtime code and tests.

- `core/combat/damagePackage.ts` now multiplies `innerDamage` by `targetStatusModifiers.cognitiveDamageTakenMultiplier` inside `createAttackDamagePackage`.
- `AttackDamagePackage` now carries `cognitiveDamageTakenMultiplier` for internal package inspection, mirroring the existing Kinetic multiplier field without adding a battle event, report, export, or save field.
- `tests/combat/damagePackage.test.ts` proves the modifier increases Cognitive attack damage while Kinetic attack damage remains unchanged under the same setup.
- `tests/combat/statusEffects.test.ts` proves status tick damage does not read the Cognitive vulnerability modifier.
- Existing AI Overload and backlash package creation remains independent of status combat modifiers.

### Acceptance

- Intrusion increases Cognitive damage by the configured multiplier.
- Kinetic damage is unchanged under the same setup.
- Status damage, feedback/backlash, and AI Overload burst damage remain unchanged unless they already flow through Cognitive damage by design.
- Existing contribution metrics and report fields remain stable.

### Verification

- Passed: `npm test -- tests/combat/damagePackage.test.ts tests/combat/statusEffects.test.ts`
- Passed: `npm run typecheck`
- Pending final slice check: `git diff --check`

## Slice 96.3: Static Data And Upgrade Hook

Add the live `cognitive_intrusion` status and make Azure Pulse Monk apply it through an existing upgrade path.

### Tasks

- Add `cognitive_intrusion` to static status data with display name **Intrusion**, category `control`, `dispelTags: ["debuff"]`, a short duration, `maxStacks: 1`, `stackPolicy: "refresh"`, `cognitiveDamageTakenMultiplier`, and `contextRebuildMultiplier`.
- Attach the status through Azure Pulse Monk's `context_shock_refinement` upgrade as an `add_skill_effect` unlock at the selected level.
- Keep the first implementation player-side only. Do not add hostile Redline or Veil Intrusion application.
- Update static-data validation references and tests for the new status and upgrade hook.

### Acceptance

- The new status is reachable only through the intended upgrade path.
- The status reference validates through the canonical data bundle.
- Existing status ids and upgrade `art` buckets remain unchanged.
- The first pass uses conservative tuning that does not mask known Black Iron Foundry or Redline Outpost debt.

### Verification

- `npm test -- tests/data/validateData.test.ts tests/combat/simulator.test.ts`
- `npm run simulate`
- `git diff --check`

## Slice 96.4: Presentation And Counterplay Visibility

Prove the mechanic is visible through current UI and report surfaces.

### Tasks

- Verify existing status chips show **Intrusion** from status metadata without new presentation plumbing.
- Verify cleanse/purge and countermeasure preview paths treat `dispelTags: ["debuff"]` correctly.
- Verify battle event views and summaries show status application and outcome signals through existing events.
- Verify simulator/tactic comparison output remains readable without adding columns or bumping schema version.
- Add or update focused status presentation tests if the current coverage does not exercise data-driven status display.

### Acceptance

- Players can see Intrusion on affected targets.
- Existing cleanse/purge affordances can remove or preview the status where applicable.
- Battle summaries and simulator output make the effect diagnosable through existing fields.
- No future-only terms such as Firewall, Trace, or District Heat appear in live UI copy as part of this slice.

### Verification

- `npm test -- tests/web/statusPresentation.test.ts`
- `npm test`
- `npm run typecheck`
- `git diff --check`

## Slice 96.5: Simulator, Balance, And Regression Review

Use simulator and focused combat tests to tune the prototype without turning the slice into a broad rebalance.

### Tasks

- Add or update a focused simulator scenario that proves Intrusion can create or accelerate an AI Overload window.
- Review the effect on Azure Pulse Monk progression and early/mid combat pacing.
- Compare `npm run simulate` output against known Black Iron Foundry and Redline Outpost debt.
- Tune only Intrusion numbers unless a blocking bug is uncovered.
- Document any remaining balance debt and defer broad retuning.

### Acceptance

- A focused regression proves the mechanic has a visible Cognitive/AI Overload effect.
- Known budget debt remains explicit rather than silently fixed by unrelated tuning.
- No hostile Intrusion or District Heat implementation is added to make the mechanic more visible.
- The team has a clear yes/no decision on whether the first prototype is useful enough to close Stage 3.0.

### Verification

- `npm test -- tests/combat/simulator.test.ts`
- `npm run simulate`
- `npm run typecheck`
- `git diff --check`

## Slice 96.6: Release Hardening And Archive Readiness

Close Stage 3.0 with full validation, docs cleanup, and archive prep.

### Tasks

- Run the verification baseline and capture any skipped command with a reason.
- Run stale-term scans for active docs/UI to ensure future-only mechanic names are not accidentally exposed.
- Update [Current Implemented Systems](current-implemented-systems.md), [Combat Engine V2](combat-engine-v2.md), [Content Pipeline Inventory](content-pipeline-inventory.md), [Balance Budget Gates](balance-budget-gates.md), and [Cognitive Intrusion Prototype Contract](cognitive-intrusion-prototype-contract.md) if implementation details changed.
- Add Stage 3.0 closure notes to this backlog.
- Move this backlog to `docs/archive/stage-3.0-backlog.md` only after the milestone is complete.

### Acceptance

- Stage 3.0 implementation and verification are documented.
- Active docs point to the implemented mechanic rather than future-only language.
- No active `docs/stage-3.0-backlog.md` remains after archive closure.
- The next candidate, District Heat, remains explicitly deferred unless a new backlog starts it.

### Verification

- `npm test`
- `npm run typecheck`
- `npm run build`
- `npm run simulate`
- `git diff --check`

## Verification Baseline

Use focused commands per slice, then close with:

```sh
npm test -- tests/data/validateData.test.ts tests/combat/statusEffects.test.ts tests/combat/damagePackage.test.ts tests/combat/simulator.test.ts tests/web/statusPresentation.test.ts
npm test
npm run typecheck
npm run build
npm run simulate
git diff --check
```

If a named focused test file does not exist yet, either add the equivalent focused coverage in the closest existing suite or update this backlog with the correct file path before marking the slice complete.

## Closure Notes

- Stage 3.0 is not complete until Slices 95.1 and 96.1 through 96.6 are all complete.
- Archive target after completion: `docs/archive/stage-3.0-backlog.md`.
- Preferred next prototype after closure remains District Heat, but only after Cognitive Intrusion has been validated as a useful first Path of Neon mechanic.
