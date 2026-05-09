# Current Implemented Systems

This is the quick onboarding snapshot for the current Path of Jianghu implementation as of Stage 1.7. Older planning docs are still useful for intent, but this page is the short current-state reference.

## Platform And Boundaries

- The game is a responsive Vite/React web app.
- The mobile direction is still "same web game in a mobile browser or shell"; no native mobile app exists yet.
- The rules engine lives in `core/` and is reused by web state, tests, balance tools, and future backend callers.
- `core/` has no browser dependency. Browser persistence stays in `web/`, while save parsing, migration, validation, offline reward semantics, and normalization stay in `core/save`.
- Static game data is assembled through the canonical static-data builder before validation and simulation.

## Combat

- Combat is deterministic team-vs-team battle.
- Player and enemy combatants use formation slots: front, middle, and back.
- Targeting supports first living, weakest HP, highest CP, and inner-broken target rules.
- Combatants have Outer HP and Inner Qi. Dropping Outer HP to zero defeats a combatant; dropping Inner Qi to zero triggers Qi Break.
- Qi Break applies burst HP damage, increases damage taken, causes backlash when attacking, and later restores part of Inner Qi.
- Current combat roles are tank, breaker, striker, and support.
- Implemented effect families include direct Outer/Inner damage, healing, regeneration, guard, protect, armor break, wound, cleanse, speed down, inner defense down, and status application.
- Battle summaries track practical carry signals such as damage dealt, Qi breaks, protection, healing, status damage, cleanse activity, medicine use, and contribution metrics.

## Progression And Content

- Implemented regions are Bamboo Road, Mist Valley, Black Iron Fort, Lotus Monastery, and Demon Cult Outpost.
- Stage access is gated by configured region/stage progress. Boss clearing is online play; offline farming uses cleared farmable stages.
- Selecting a map/stage starts continuous fighting or farming behavior without a separate Fight or Set Farm button.
- The player stays on the selected stage after battle instead of being forced to the latest unlocked stage.
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
- `npm run simulate` and `npm run support-decision` are the main tuning tools.
- Completed backlogs through Stage 1.6 live in `docs/archive`.
- Stage closure uses the [Release Readiness Checklist](release-readiness-checklist.md) for required commands, review, browser smoke, save compatibility, and archive steps.

## Current Known Balance Notes

- Stage 1.7 tightened balance reporting, but some budget misses may be intentional tuning notes rather than code failures.
- Use `docs/balance-budget-gates.md` for current budget fields and known target misses.
- Stage 1.8 is planned as Combat Engine V2 before adding a larger new strategy layer.
