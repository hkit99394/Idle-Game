# Current Implemented Systems

This is the quick onboarding snapshot for the current Path of Neon implementation after Stage 3.2 closure. The project was previously called Path of Jianghu; older planning docs are still useful for intent, but this page is the short current-state reference.

## Platform And Boundaries

- The game is a responsive Vite/React web app.
- The mobile direction is still "same web game in a mobile browser or shell"; no native mobile app exists yet.
- The rules engine lives in `core/` and is reused by web state, tests, balance tools, and future backend callers.
- `core/` has no browser dependency. Browser persistence stays in `web/`, while save parsing, migration, validation, offline reward semantics, and normalization stay in `core/save`.
- Static game data is assembled through the canonical static-data builder before validation and simulation.
- Stage 2.0 completed the content pipeline pass: region budgets, reward-curve validation, difficulty/boss-gate reporting, authoring exports, and content readiness docs.
- Stage 2.1 completed tactic presets as the first deeper player strategy layer.
- Stage 2.2 completed backend-safe core boundaries, cloud-save contracts, PWA readiness, and online boss scope decisions.
- Path of Neon is the active product/theme direction. The retheme plan is documented in [Path Of Neon Theme Bible](path-of-neon-theme-bible.md), [Path Of Neon Terminology Map](path-of-neon-terminology-map.md), and [Path Of Neon Retheme Migration Plan](retheme-migration-plan.md).
- The retheme has its first deeper mechanic beyond copy replacement: Stage 3.0 implemented Intrusion through the [Cognitive Intrusion Prototype Contract](cognitive-intrusion-prototype-contract.md), Stage 3.1 closed District Heat contract and pacing hardening at [Archived Stage 3.1 Backlog](archive/stage-3.1-backlog.md), Stage 3.2 closed pacing parity and heat readiness at [Archived Stage 3.2 Backlog](archive/stage-3.2-backlog.md), and Stage 3.3 is active at [Stage 3.3 Backlog](stage-3.3-backlog.md) for offline parity, Black Iron visible-debt cleanup, and the heat promotion recheck.
- District Heat remains report-only in simulator/default report/full debug JSON. Slice 99.5 chooses a non-punitive warning contract as the next heat milestone, but live heat UI, save state, compact export fields, tactic export fields, reward modifiers, augment loadouts, network operations, countermeasure economy, and AI raid events remain deferred until their contracts and verification gates are ready.
- Existing internal ids and save fields remain legacy-compatible until the dedicated [Path Of Neon Internal Id Migration](path-of-neon-internal-id-migration.md) changes them. Browser storage now uses the Path of Neon key with legacy-key read/copy support.
- The Stage 2.2 headless engine contract is tracked in [Stage 2.2 Headless Engine Boundary Audit](stage-2.2-headless-engine-audit.md).
- PWA install/offline shell behavior is tracked in [PWA Readiness](pwa-readiness.md).
- The first online boss transport decision is HTTP attempt submission plus lightweight polling, with server-side deterministic simulation; see [Online Boss Transport Decision](online-boss-transport-decision.md).

## Combat

- Combat is deterministic team-vs-team battle.
- Player and enemy combatants use formation slots: front, middle, and back.
- Targeting supports first living, weakest HP, highest CP, and overloaded target rules.
- Combatants have Body Integrity and Context Stability. Dropping Body Integrity to zero defeats a combatant; dropping Context Stability to zero triggers AI Overload.
- AI Overload applies burst Body Integrity damage, increases damage taken, causes backlash when attacking, and later restores part of Context Stability.
- Current combat roles are tank, breaker, striker, and support.
- Implemented effect families include direct Kinetic/Cognitive damage, healing, regeneration, guard, protect, armor break, wound, cleanse, speed down, Cognitive Defense Down, and status application.
- Intrusion is the first implemented Cognitive Intrusion prototype: `cognitive_intrusion` increases Cognitive attack damage taken, slows Context Rebuild through the existing status modifier, and is applied by Azure Pulse Monk's `context_shock_refinement` upgrade path after the level 3 unlock.
- Battle summaries track practical carry signals such as damage dealt, AI Overloads, protection, healing, status damage, cleanse activity, medicine use, and contribution metrics.
- Stage 1.8 split the combat engine into named core modules:
  - `core/combat/scheduler.ts` owns deterministic action timing and speed-down-adjusted rescheduling.
  - `core/combat/targeting.ts` owns target selection rules.
  - `core/combat/damagePackage.ts` owns attack, AI Overload, and backlash damage packages plus guard/protection mitigation commits.
  - `core/combat/effectPipeline.ts` owns skill-effect dispatch for timed status, data status, recovery, regeneration, and cleanse behavior.
  - `core/combat/statusEffects.ts`, `statusMetadata.ts`, and `cleansePolicy.ts` own timed/data-driven status application, ticking, resistance, and cleanse metadata.
  - `core/combat/autoMedicine/` owns battle cleanse and pre-battle resistance medicine automation.
  - `core/combat/battleRecorder.ts` owns metrics, contributions, defeat records, and stable `BattleEventRecord` metadata for web and tooling consumers.
- `simulateBattle` remains the orchestration entry point. `resolveStageBattle` remains the progression adapter that builds teams, calls combat, and applies rewards.
- New combat work should start from [Combat Engine V2](combat-engine-v2.md), which maps extension points for skill effects, statuses, damage/defense behavior, scheduler rules, and battle event contracts.

## Progression And Content

- Implemented districts are Greenline Approach, Veil District, Black Iron Foundry, Lotus Clinic, and Redline Outpost; their legacy region ids remain compatibility keys.
- Stage access is gated by configured region/stage progress. Boss clearing is online play; offline farming uses cleared farmable stages.
- Selecting a map/stage starts continuous fighting or farming behavior without a separate Fight or Set Farm button.
- The player stays on the selected stage after battle instead of being forced to the latest unlocked stage.
- Stage 2.1 tactic presets are authored in static data, validated with the content bundle, applied by core combat, saved as one global `selectedRoutineId`, surfaced in the Strategy panel, and reported in recent battle summaries.
- Heroes gain levels from accumulated Combat XP. Level requirements increase by level, and enemy definitions also carry level data.
- CP is calculated from hero stats, level, equipment, formation, and other active bonuses, then shown as a quick strength indicator.
- Map mastery and style mastery grant staged bonuses from repeated play and assignment rewards.

## Heroes, Styles, And Growth

- Current roster includes Iron Fist Initiate, Azure Pulse Monk, White Crane Edge Runner, Mountain Brace Guardian, and Lotus Stabilizer.
- Early initiates keep fixed lineage identities while style branches, skill upgrades, and equipment create build growth.
- Supported style-family display includes Impact, Pulse, Edge, Brace, and region-specific weapon/protocol equipment. Rend and Ghostware content remains roadmap space.
- Style branches and skill upgrades adjust ratios, cooldowns, defenses, healing, status counterplay, and role identity.
- Lotus support counterplay is implemented through deterministic sect/manual-style upgrades and support tools, not a separate random recruit system.

## Equipment, Assignments, And Idle Rewards

- Equipment supports weapon, armor, manual, and medicine slots, with rarity colors, affixes, set bonuses, and CP contribution.
- Stages can drop equipment and medicine-related rewards.
- Assignments let eligible heroes patrol or train while offline. Rewards can include Credits, Resonance, reagents, Combat XP, style mastery XP, and equipment.
- Offline rewards are applied through the save-load transaction path and advance reward timestamps to prevent repeated reload grants.

## Medicine And Status Counterplay

- Redline Outpost introduces heavier corruption/status pressure and makes countermeasure/support counterplay visible.
- Countermeasures unlock when their configured unlock condition is met or when inventory exists, but automatic use still requires inventory.
- Auto countermeasures have global settings plus per-countermeasure disable controls.
- Pre-battle resistance countermeasure policy is configurable, including boss/elite/status-heavy style thresholds.
- Status resistance reduces application reliability, effective duration, and tick impact through the combat status pipeline.
- Status UI uses fixed category colors for damage, control, vulnerability, and cleanse/support signals.

## Save, Tools, And Validation

- Saves are versioned local JSON with export, import, reset-new-game, diagnostics, migration fixtures, and strict validation.
- Cloud-save readiness is a wrapped envelope contract over current `SaveData`; see [Cloud Save Contract](cloud-save-contract.md).
- PWA shell caching is limited to app-shell/static assets and deliberately excludes local save storage and future `/api/` calls.
- Online boss readiness is a decision contract only: future boss attempts should submit account/save metadata and a team snapshot over HTTP, then poll authoritative server-simulated results.
- Imported map progress is bounded to configured regions and stage counts.
- The balance report simulates every configured region in region order and checks data-driven budget gates.
- Balance tooling also exposes compact authoring exports through `npm run --silent simulate -- --export-json`, spreadsheet-ready stage rows through `npm run --silent simulate -- --csv`, and opt-in tactic comparison rows through `npm run --silent simulate -- --tactics-json` or `--tactics-csv`.
- The recommended long-form stage, power, economy, and milestone timing model is tracked in [Progression Pacing Roadmap](progression-pacing-roadmap.md). It is planning guidance, not an implemented balance change.
- The current content file inventory, validation coverage map, report-only gaps, and known budget debt are tracked in [Content Pipeline Inventory](content-pipeline-inventory.md).
- The practical checklist for adding or changing regions is [Content Authoring Checklist](content-authoring-checklist.md).
- `npm run simulate` and `npm run support-decision` are the main tuning tools.
- Stage 2.4 product/storage key migration is closed and archived at [Archived Stage 2.4 Backlog](archive/stage-2.4-backlog.md), including package metadata, browser save storage, PWA cache/icon identity, and shared alias-map helpers.
- Stage 2.5 region/stage static id migration is closed and archived at [Archived Stage 2.5 Backlog](archive/stage-2.5-backlog.md), including save-version fixtures, `progress.maps`, selected/current stage ids, simulator report ids, and compatibility aliases.
- Stage 2.6 static content id migration is closed and archived at [Archived Stage 2.6 Backlog](archive/stage-2.6-backlog.md), with the target matrix retained in [Archived Stage 2.6 Content Id Preflight](archive/stage-2.6-content-id-preflight.md). Save version `12` normalizes save-stored content aliases, static hostile/status/initiate/protocol/style/augment/countermeasure/operation/routine ids now use their canonical Path of Neon ids, and report exports keep canonical ids primary with temporary legacy comparison columns.
- Stage 2.7 save resource/progress field migration is closed and archived at [Archived Stage 2.7 Backlog](archive/stage-2.7-backlog.md), with the target matrix retained in [Archived Stage 2.7 Save Field Preflight](archive/stage-2.7-save-field-preflight.md). Save version `13` serializes current owned save fields such as `credits`, `resonance`, `reagents`, `districts`, `combatData`, `highestClearedRouteIndex`, `currentRouteId`, `selectedOfflineFarmRouteId`, `selectedRoutineId`, and `technoSect`; legacy save fields remain import-compatible through core save aliases.
- Stage 2.3 is closed and archived at [Stage 2.3 Backlog](archive/stage-2.3-backlog.md), covering the display-safe Path of Neon design pivot.
- Completed backlogs through Stage 3.1 live in `docs/archive`.
- Stage 1.9 is closed and archived at [Stage 1.9 Backlog](archive/stage-1.9-backlog.md); `docs/stage-1.9-backlog.md` should not exist as an active backlog unless Stage 1.9 is explicitly reopened.
- Stage 2.0 is closed and archived at [Stage 2.0 Backlog](archive/stage-2.0-backlog.md); `docs/stage-2.0-backlog.md` should not exist as an active backlog unless Stage 2.0 is explicitly reopened.
- Stage 2.1 is closed and archived at [Stage 2.1 Backlog](archive/stage-2.1-backlog.md); `docs/stage-2.1-backlog.md` should not exist as an active backlog unless Stage 2.1 is explicitly reopened.
- Stage 2.2 is closed and archived at [Stage 2.2 Backlog](archive/stage-2.2-backlog.md); `docs/stage-2.2-backlog.md` should not exist as an active backlog unless Stage 2.2 is explicitly reopened.
- Stage 2.3 is closed and archived at [Stage 2.3 Backlog](archive/stage-2.3-backlog.md); `docs/stage-2.3-backlog.md` should not exist as an active backlog unless Stage 2.3 is explicitly reopened.
- Stage 2.4 is closed and archived at [Archived Stage 2.4 Backlog](archive/stage-2.4-backlog.md); `docs/stage-2.4-backlog.md` should not exist as an active backlog unless Stage 2.4 is explicitly reopened.
- Stage 2.5 is closed and archived at [Archived Stage 2.5 Backlog](archive/stage-2.5-backlog.md); `docs/stage-2.5-backlog.md` should not exist as an active backlog unless Stage 2.5 is explicitly reopened.
- Stage 2.6 is closed and archived at [Archived Stage 2.6 Backlog](archive/stage-2.6-backlog.md); `docs/stage-2.6-backlog.md` should not exist as an active backlog unless Stage 2.6 is explicitly reopened.
- Stage 2.7 is closed and archived at [Archived Stage 2.7 Backlog](archive/stage-2.7-backlog.md); `docs/stage-2.7-backlog.md` should not exist as an active backlog unless Stage 2.7 is explicitly reopened.
- Stage 2.8 combat save/stat and report-symbol migration is closed and archived at [Archived Stage 2.8 Backlog](archive/stage-2.8-backlog.md), with the target matrix retained in [Archived Stage 2.8 Combat Save And Symbol Preflight](archive/stage-2.8-combat-save-symbol-preflight.md). Stage 2.8 confirmed current saves do not persist live combat stat/event state, so save version `13` did not change; static combat schema aliases live in `core/data/combatSchemaAliases.ts`; runtime combat stats, authored static combat schema, web battle surfaces, simulator metrics, and tactic comparison exports now expose current Body Integrity, Context Stability, Kinetic/Cognitive, AI Overload, Context Rebuild, Breach Power, and Overload Resist vocabulary with documented transition fields where compatibility needs them.
- Stage 2.9 cleanup and Cognitive Intrusion handoff is closed and archived at [Archived Stage 2.9 Backlog](archive/stage-2.9-backlog.md). Slice 2.9.1 kept temporary tactic comparison legacy damage columns for one more review cycle, Slice 2.9.2 kept engine-level `outerDamage` / `innerDamage` replay/accounting payload fields stable while public/report surfaces continue to use current Kinetic/Cognitive or Body Integrity/Context Stability wording, Slice 2.9.3 kept static taxonomy ids/buckets stable while updating safe display/docs language, Slice 2.9.4 refreshed the Cognitive Intrusion contract around one new `cognitive_intrusion` status and one new `cognitiveDamageTakenMultiplier` status modifier with no save/export/event/taxonomy churn, and Slice 2.9.5 ran stale-scan/release-readiness hardening before archival. `docs/stage-2.9-backlog.md` should not exist as an active backlog unless Stage 2.9 is explicitly reopened.
- Stage 3.0 Cognitive Intrusion Prototype is closed and archived at [Archived Stage 3.0 Backlog](archive/stage-3.0-backlog.md). It completed Epics 95 and 96: contract adoption plus the smallest useful Intrusion implementation. The milestone added no save/export/event/taxonomy churn, hostile Intrusion, District Heat, or broad balance retuning. `docs/stage-3.0-backlog.md` should not exist as an active backlog unless Stage 3.0 is explicitly reopened.
- Stage 3.1 District Heat Contract And Pacing Hardening is closed and archived at [Archived Stage 3.1 Backlog](archive/stage-3.1-backlog.md). It completed Epic 97: contract-first District Heat preparation, offline/pacing proof, known debt classification, report-only heat projection, and save/UI/export boundary proof. District Heat remains author-facing only in simulator/default report/full debug JSON; no live heat UI, save field, compact export field, or reward modifier shipped. `docs/stage-3.1-backlog.md` should not exist as an active backlog unless Stage 3.1 is explicitly reopened.
- Stage 3.2 Pacing Parity And Heat Readiness is closed and archived at [Archived Stage 3.2 Backlog](archive/stage-3.2-backlog.md). It completed Epic 98: offline parity reporting, offline formula decision, Redline live-heat blocker triage/tuning, District Heat promotion decision, and release hardening. Slice 98.5 resolved the default Redline live-heat blockers. Slice 98.6 chose the `report_only` District Heat posture, so Stage 3.3 should keep offline parity resolved and finish visible Black Iron debt before any player-facing heat UI or reward behavior. `docs/stage-3.2-backlog.md` should not exist as an active backlog unless Stage 3.2 is explicitly reopened.
- Stage 3.3 Offline Parity And Visible Debt Cleanup is active at [Stage 3.3 Backlog](stage-3.3-backlog.md). It owns Epic 99: re-baseline parity/debt evidence, implement the target-derived offline formula path, clean up `black_iron_foundry_4`, and recheck District Heat promotion before any player-facing heat behavior. Slice 99.3 moved current recommended farms to `acceptable` parity with no save/export/cloud/live-heat schema changes. Slice 99.4 resolved the remaining Black Iron visible debt with a stage-local sentry tune. Slice 99.5 reran promotion, kept current heat runtime report-only, and handed Stage 3.4 to a non-punitive warning contract before any live reward or route-risk behavior.
- Stage closure uses the [Release Readiness Checklist](release-readiness-checklist.md) for required commands, review, browser smoke, save compatibility, and archive steps.

## Web UI And State Modules

- The web app shell is split across `web/App.tsx`, `web/app/AppPanels.tsx`, `web/app/statusText.ts`, and `web/app/useSaveTools.ts`.
- React panels live under `web/features/*/panels.tsx` by feature: battle, map/idle, roster/formation, strategy, equipment/assignments, growth/mastery, counterplay/save, and shared display helpers.
- `web/components/GamePanels.tsx` is a small compatibility barrel over feature panels. New panel logic should go in `web/features/*`.
- Feature view-model builders and feature view types live under `web/state/viewModels/*` and `*Types.ts`, with `web/state/viewModels/webGameViewModel.ts` assembling the full web view model.
- Web actions, command factories, reducer branches, hook commands, and save-tool commands are split by domain under `web/state/`.
- The current contributor map for panel, view model, reducer, save, style, and smoke-check ownership is [Web UI Architecture](web-ui-architecture.md).

## Current Known Balance Notes

- Stage 1.9 preserved the known balance-budget posture while modularizing web UI and web state; some budget misses may be intentional tuning notes rather than code failures.
- Use [Balance Budget Gates](balance-budget-gates.md) for current budget fields and [Content Pipeline Inventory](content-pipeline-inventory.md) for current validation coverage, manual gaps, and known target misses.
- Stage 2.0 kept current content playable while making future region authoring safer. Known Black Iron Foundry and Redline Outpost tuning misses remain documented debt, not silent report noise.
- Stage 2.1 added tactic presets and strategy visibility without retuning known Black Iron Foundry or Redline Outpost budget debt. Stage 2.2 completed backend and PWA readiness without mixing in content retunes.
