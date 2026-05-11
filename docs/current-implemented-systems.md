# Current Implemented Systems

This is the quick onboarding snapshot for the current Path of Jianghu implementation as of Stage 2.1 planning. Older planning docs are still useful for intent, but this page is the short current-state reference.

## Platform And Boundaries

- The game is a responsive Vite/React web app.
- The mobile direction is still "same web game in a mobile browser or shell"; no native mobile app exists yet.
- The rules engine lives in `core/` and is reused by web state, tests, balance tools, and future backend callers.
- `core/` has no browser dependency. Browser persistence stays in `web/`, while save parsing, migration, validation, offline reward semantics, and normalization stay in `core/save`.
- Static game data is assembled through the canonical static-data builder before validation and simulation.
- Stage 2.0 completed the content pipeline pass: region budgets, reward-curve validation, difficulty/boss-gate reporting, authoring exports, and content readiness docs.

## Combat

- Combat is deterministic team-vs-team battle.
- Player and enemy combatants use formation slots: front, middle, and back.
- Targeting supports first living, weakest HP, highest CP, and inner-broken target rules.
- Combatants have Outer HP and Inner Qi. Dropping Outer HP to zero defeats a combatant; dropping Inner Qi to zero triggers Qi Break.
- Qi Break applies burst HP damage, increases damage taken, causes backlash when attacking, and later restores part of Inner Qi.
- Current combat roles are tank, breaker, striker, and support.
- Implemented effect families include direct Outer/Inner damage, healing, regeneration, guard, protect, armor break, wound, cleanse, speed down, inner defense down, and status application.
- Battle summaries track practical carry signals such as damage dealt, Qi breaks, protection, healing, status damage, cleanse activity, medicine use, and contribution metrics.
- Stage 1.8 split the combat engine into named core modules:
  - `core/combat/scheduler.ts` owns deterministic action timing and speed-down-adjusted rescheduling.
  - `core/combat/targeting.ts` owns target selection rules.
  - `core/combat/damagePackage.ts` owns attack, Qi Break, and backlash damage packages plus guard/protection mitigation commits.
  - `core/combat/effectPipeline.ts` owns skill-effect dispatch for timed status, data status, recovery, regeneration, and cleanse behavior.
  - `core/combat/statusEffects.ts`, `statusMetadata.ts`, and `cleansePolicy.ts` own timed/data-driven status application, ticking, resistance, and cleanse metadata.
  - `core/combat/autoMedicine/` owns battle cleanse and pre-battle resistance medicine automation.
  - `core/combat/battleRecorder.ts` owns metrics, contributions, defeat records, and stable `BattleEventRecord` metadata for web and tooling consumers.
- `simulateBattle` remains the orchestration entry point. `resolveStageBattle` remains the progression adapter that builds teams, calls combat, and applies rewards.
- New combat work should start from [Combat Engine V2](combat-engine-v2.md), which maps extension points for skill effects, statuses, damage/defense behavior, scheduler rules, and battle event contracts.

## Progression And Content

- Implemented regions are Bamboo Road, Mist Valley, Black Iron Fort, Lotus Monastery, and Demon Cult Outpost.
- Stage access is gated by configured region/stage progress. Boss clearing is online play; offline farming uses cleared farmable stages.
- Selecting a map/stage starts continuous fighting or farming behavior without a separate Fight or Set Farm button.
- The player stays on the selected stage after battle instead of being forced to the latest unlocked stage.
- Stage 2.1 tactic preset definitions are present in static data and validation, and core combat can apply a transient selected tactic during battle resolution. Save selection and UI are not active yet.
- Heroes gain levels from accumulated Combat XP. Level requirements increase by level, and enemy definitions also carry level data.
- CP is calculated from hero stats, level, equipment, formation, and other active bonuses, then shown as a quick strength indicator.
- Map mastery and style mastery grant staged bonuses from repeated play and assignment rewards.

## Heroes, Styles, And Growth

- Current roster includes Iron Fist Disciple, Azure Palm Monk, White Crane Swordsman, Mountain Staff Guardian, and Lotus Mending Disciple.
- Early heroes keep fixed martial identities while style branches, skill upgrades, and equipment create build growth.
- Supported martial identity includes Fist, Palm, Sword, Staff, and region-specific weapon/manual equipment. Blade and hidden-weapon content remains roadmap space.
- Style branches and skill upgrades adjust ratios, cooldowns, defenses, healing, status counterplay, and role identity.
- Lotus support counterplay is implemented through deterministic sect/manual-style upgrades and support tools, not a separate random recruit system.

## Equipment, Assignments, And Idle Rewards

- Equipment supports weapon, armor, manual, and medicine slots, with rarity colors, affixes, set bonuses, and CP contribution.
- Stages can drop equipment and medicine-related rewards.
- Assignments let eligible heroes patrol or train while offline. Rewards can include silver, cultivation, herbs, Combat XP, style mastery XP, and equipment.
- Offline rewards are applied through the save-load transaction path and advance reward timestamps to prevent repeated reload grants.

## Medicine And Status Counterplay

- Demon Cult Outpost introduces heavier status pressure and makes medicine/support counterplay visible.
- Medicine unlocks when its configured unlock condition is met or when inventory exists, but automatic use still requires inventory.
- Auto medicine has global settings plus per-medicine disable controls.
- Pre-battle resistance medicine policy is configurable, including boss/elite/status-heavy style thresholds.
- Status resistance reduces application reliability, effective duration, and tick impact through the combat status pipeline.
- Status UI uses fixed category colors for damage, control, vulnerability, and cleanse/support signals.

## Save, Tools, And Validation

- Saves are versioned local JSON with export, import, reset-new-game, diagnostics, migration fixtures, and strict validation.
- Imported map progress is bounded to configured regions and stage counts.
- The balance report simulates every configured region in region order and checks data-driven budget gates.
- Balance tooling also exposes compact authoring exports through `npm run --silent simulate -- --export-json` and spreadsheet-ready stage rows through `npm run --silent simulate -- --csv`.
- The current content file inventory, validation coverage map, report-only gaps, and known budget debt are tracked in [Content Pipeline Inventory](content-pipeline-inventory.md).
- The practical checklist for adding or changing regions is [Content Authoring Checklist](content-authoring-checklist.md).
- `npm run simulate` and `npm run support-decision` are the main tuning tools.
- Completed backlogs through Stage 2.0 live in `docs/archive`.
- Stage 1.9 is closed and archived at [Stage 1.9 Backlog](archive/stage-1.9-backlog.md); `docs/stage-1.9-backlog.md` should not exist as an active backlog unless Stage 1.9 is explicitly reopened.
- Stage 2.0 is closed and archived at [Stage 2.0 Backlog](archive/stage-2.0-backlog.md); `docs/stage-2.0-backlog.md` should not exist as an active backlog unless Stage 2.0 is explicitly reopened.
- Stage 2.1 is active at [Stage 2.1 Backlog](stage-2.1-backlog.md) and focuses on tactic presets as the first deeper player strategy layer.
- Stage closure uses the [Release Readiness Checklist](release-readiness-checklist.md) for required commands, review, browser smoke, save compatibility, and archive steps.

## Web UI And State Modules

- The web app shell is split across `web/App.tsx`, `web/app/AppPanels.tsx`, `web/app/statusText.ts`, and `web/app/useSaveTools.ts`.
- React panels live under `web/features/*/panels.tsx` by feature: battle, map/idle, roster/formation, equipment/assignments, growth/mastery, counterplay/save, and shared display helpers.
- `web/components/GamePanels.tsx` is a small compatibility barrel over feature panels. New panel logic should go in `web/features/*`.
- Feature view-model builders and feature view types live under `web/state/viewModels/*` and `*Types.ts`, with `web/state/viewModels/webGameViewModel.ts` assembling the full web view model.
- Web actions, command factories, reducer branches, hook commands, and save-tool commands are split by domain under `web/state/`.
- The current contributor map for panel, view model, reducer, save, style, and smoke-check ownership is [Web UI Architecture](web-ui-architecture.md).

## Current Known Balance Notes

- Stage 1.9 preserved the known balance-budget posture while modularizing web UI and web state; some budget misses may be intentional tuning notes rather than code failures.
- Use [Balance Budget Gates](balance-budget-gates.md) for current budget fields and [Content Pipeline Inventory](content-pipeline-inventory.md) for current validation coverage, manual gaps, and known target misses.
- Stage 2.0 kept current content playable while making future region authoring safer. Known Black Iron Fort and Demon Cult tuning misses remain documented debt, not silent report noise.
- The active Stage 2.1 roadmap focus is tactic presets and strategy visibility, using the Stage 2.0 content pipeline before adding larger content slices.
