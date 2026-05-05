# Stage 1.2 Backlog

This is the active roadmap backlog for **Path of Jianghu** after the completed Stage 1.1 release.

Stage 1.2 should make the game feel less like a linear prototype and more like a growing idle RPG. The recommended focus is **Black Iron Fort**, a defensive region that introduces armor pressure, protection mechanics, style branch choices, deeper equipment, and simple offline assignments.

## Current Baseline

Stage 1.1 completed:

- Bamboo Road tutorial region.
- Mist Valley post-tutorial region.
- Continuous map route fighting.
- Clickable map route cards that select active fighting and valid offline farm targets.
- Player and enemy formations.
- Targeting rules: `first_living`, `weakest_hp`, `highest_cp`, `inner_broken`.
- Hero roles, CP, levels, equipment, skill refinement, and style mastery.
- Offline farming preview, presets, recommendations, and safe reward application.
- Save migrations, core engine boundary, scenario tests, and multi-region balance reports.

## Stage 1.2 Goal

Deliver the next meaningful layer of content and player choice:

- Add **Black Iron Fort** as the next region after Mist Valley. Completed in Epic 13.
- Make defense, armor, and protection readable in battle.
- Turn style branches from hidden data scaffolding into real player choices.
- Make equipment more interesting without building a full random loot system yet.
- Add simple patrols or training grounds so offline play has more than one assignment path.
- Keep the reusable core engine and balance tools ready for more regions.

## Recommended Scope

| Epic | Status | Lane | Goal |
| --- | --- | --- | --- |
| Epic 13: Black Iron Fort Region | Completed | Content Expansion | Add the next region with defensive enemy identity |
| Epic 14: Defensive Combat Mechanics | Completed | Combat Depth | Add armor, guard, protection, and armor-break behavior |
| Epic 15: Style Branch Choices | Completed | Martial Arts Growth | Let heroes unlock and select early style branches |
| Epic 16: Equipment Affixes And Sets | Planned | Loot And Equipment | Add deterministic item depth and clearer gear decisions |
| Epic 17: Patrols And Training Grounds | Planned | Offline And Idle | Add simple hero assignment systems for offline progress |
| Epic 18: Stage 1.2 Technical Foundation | Planned | Technical Foundation | Add migrations, simulator coverage, and balance reports for new systems |

## Epic 13: Black Iron Fort Region

Status: Completed

Goal:

- Add a defensive region after Mist Valley that teaches the player to counter armor, guards, and slower high-defense fights.

Theme:

- Black Iron Fort is a weapon-and-armor stronghold.
- Enemies use Blade, Staff, and heavy armor styles.
- Encounters should pressure Outer Art more than Mist Valley did.
- Counterplay should encourage Qi Breaks, armor break, Inner pressure, and formation protection.

Implementation:

- Added Black Iron Fort as the third configured region after Mist Valley.
- Added seven Black Iron Fort stages, including six farmable non-boss stages and one non-farmable boss.
- Added Iron Fort Sentry, Shieldwall Guard, Black Iron Saber, Forge Chain Hook, Iron Armor Captain, and Black Fort Commander.
- Added defensive-flavored enemy skills using existing combat primitives and target rules.
- Tuned non-boss stages to clear in the balance progression while the boss remains a visible gate.
- Extended the balance report target ranges for Black Iron Fort's slower defensive fights.

Tasks:

### 13.1 Region And Stage Data

Status: Completed

Add Black Iron Fort after Mist Valley.

Acceptance:

- `regions.json` includes Black Iron Fort after Mist Valley.
- Black Iron Fort unlocks after clearing the Mist Valley boss.
- Region has 6-8 stages, including one boss.
- Stage rewards are tuned above Mist Valley without breaking early upgrades.
- Stages include offline-farmable non-boss targets and a non-farmable boss.

### 13.2 Enemy Family

Status: Completed

Add Black Iron Fort enemies.

Acceptance:

- Add at least four normal/elite enemies and one boss.
- Enemies have distinct formation slots and combat roles.
- Enemy skills express defensive identity: guard, armor, counter, or pressure.
- Enemy levels and CP are consistent with post-Mist progression.

### 13.3 Region Balance Identity

Status: Completed

Define Black Iron Fort targets.

Acceptance:

- Normal stage fights land in an intended duration range.
- Elite fights are slower and more defensive than Mist Valley.
- Boss fight creates a clear training or gear gate.
- Balance report includes Black Iron Fort stage table, farm recommendation, mastery milestone, and boss gate.

## Epic 14: Defensive Combat Mechanics

Status: Completed

Goal:

- Make defensive enemies feel different from simply having larger HP numbers.

Implementation:

- Added timed `guard`, `protect`, and `armor_break` skill effects.
- Guard reduces incoming Outer damage and emits guard/absorb battle events.
- Protection redirects attacks to a living ally in an ahead formation slot and reduces redirected damage.
- Armor Break temporarily reduces target Outer Defense and guard strength.
- White Crane Slash now provides player armor-break counterplay.
- Mountain Staff Guardian can protect allies with Sweeping Staff.
- Black Iron Fort defensive enemies now use guard and protection-flavored skills.
- Battle logs and the balance report show defensive events distinctly from Qi Breaks.
- Scenario tests cover guard mitigation, front/middle/back protection behavior, living protector rules, and armor-break clear-time improvement.

Tasks:

### 14.1 Armor Or Guard Stat Layer

Status: Completed

Add a lightweight defensive mechanic.

Recommended first version:

- Use an `armor` or `guard` effect that reduces incoming Outer damage for a limited duration or until broken.

Acceptance:

- Mechanic is represented in core combat state or battle events.
- Damage formulas remain deterministic and testable.
- Existing Bamboo Road and Mist Valley tuning does not shift unexpectedly.
- Battle logs summarize defensive events clearly.

### 14.2 Protection Skill Effect

Status: Completed

Allow tank/support units to protect allies.

Acceptance:

- A skill can redirect or reduce damage for protected allies.
- Protection respects formation and living-state rules.
- Battle events show who protected whom.
- Tests cover protection with front, middle, and back targets.

### 14.3 Armor Break Or Defense Reduction

Status: Completed

Add counterplay to defensive enemies.

Acceptance:

- A skill effect can temporarily reduce armor, guard, or defense.
- Qi Break and armor break have distinct readable effects.
- At least one player style or skill can counter Black Iron Fort defense.
- Scenario tests show armor break improves clear time against a defensive enemy.

## Epic 15: Style Branch Choices

Status: Completed

Goal:

- Turn style branch data from future-proofing into an actual player decision.

Implementation:

- Added saved style branch selections by style track.
- Bumped the save schema to version 3 and migrated older saves with an empty branch-selection default.
- Added static branch effects with modest stat multipliers.
- Added branch selection helpers that reject missing, mismatched, and locked branches.
- Applied selected branch effects only to heroes using the matching style.
- Updated branch unlocks so early hero-level, style-mastery, and stage-clear paths all exist.
- Added a compact branch selection UI inside the Martial Styles panel.
- Added tests for unlocks, selection, save validation, migration, UI state, and stat application.

Tasks:

### 15.1 Branch Unlock Rules

Status: Completed

Enable early branches for selected heroes.

Acceptance:

- Branches can unlock by hero level, style mastery, or cleared stage.
- Unlock state is derived from progress and static data.
- Locked branches explain their requirement in the UI.
- Existing fixed hero identity remains the default before branch selection.

### 15.2 Branch Selection Save State

Status: Completed

Persist selected style branches.

Acceptance:

- Save data stores selected branch per hero or style track.
- Migration defaults older saves safely.
- Invalid branch selections are rejected or normalized.
- Branch choice affects only eligible heroes or skills.

### 15.3 Branch Effects

Status: Completed

Add small branch bonuses.

Acceptance:

- Branches can grant stat, skill, targeting, or mastery bonuses.
- Effects are intentionally modest for Stage 1.2.
- Tests prove branch effects apply only when selected and eligible.

### 15.4 Branch UI

Status: Completed

Add a simple branch selection panel.

Acceptance:

- UI shows locked, unlocked, selected, and available branches.
- Player can select an unlocked branch.
- Branch change persists immediately.
- Branch display remains compact on mobile.

## Epic 16: Equipment Affixes And Sets

Goal:

- Make equipment choices more meaningful while keeping loot deterministic enough for balance and tests.

Tasks:

### 16.1 Deterministic Affixes

Add predefined affixes to equipment definitions.

Acceptance:

- Affixes can modify stats such as Outer Attack, Inner Damage, Break Power, recovery, or defense.
- Affixes contribute to CP.
- Data validation catches invalid affix stats or modes.
- Existing equipment continues to load without affixes.

### 16.2 Region Gear Identity

Add Black Iron Fort gear.

Acceptance:

- Black Iron Fort drops at least one weapon, armor, manual, and medicine item.
- Gear supports the region counterplay: armor break, defense, protection, or Outer Art.
- Drop rewards remain deterministic.

### 16.3 Simple Set Bonuses

Add optional two-piece set bonuses.

Acceptance:

- Equipment can declare a set id.
- Equipping enough pieces grants a small bonus.
- Set bonuses are visible in the UI.
- Tests cover CP and stat changes from set bonuses.

## Epic 17: Patrols And Training Grounds

Goal:

- Give offline progress a second layer beyond one selected farm target.

Recommended first version:

- Keep assignments simple, deterministic, and low-risk.
- Do not require real-time timers per hero yet unless needed.
- Use the existing offline timestamp and idempotency model.

Tasks:

### 17.1 Assignment Data Model

Add assignment definitions.

Acceptance:

- Assignment data supports id, name, type, unlock condition, duration bucket, allowed roles/styles, and reward profile.
- Supported types include `patrol` and `training_ground`.
- Data validation catches invalid assignment references.

### 17.2 Assignment Save State

Persist assignment choices.

Acceptance:

- Save data stores active assignments and assigned hero ids.
- Migration defaults older saves to no assignments.
- A hero cannot be assigned to multiple active assignments.
- Invalid saved assignments are rejected or normalized safely.

### 17.3 Assignment Rewards

Apply offline assignment rewards safely.

Acceptance:

- Patrols can grant silver, equipment chances, map mastery, or Combat XP.
- Training grounds can grant style mastery, hero level catch-up, or cultivation.
- Rewards use the same anti-duplication timestamp pattern as offline farming.
- Tests prove a second reload cannot duplicate assignment rewards.

### 17.4 Assignment UI

Add a simple assignment panel.

Acceptance:

- Player can assign and unassign eligible heroes.
- UI shows expected rewards and assigned hero status.
- Locked assignments explain requirements.
- Assignment controls remain usable on mobile.

## Epic 18: Stage 1.2 Technical Foundation

Goal:

- Keep new Stage 1.2 systems safe to extend.

Tasks:

### 18.1 Save Migration For Stage 1.2

Add migration support for new fields.

Acceptance:

- Saves from Stage 1.1 migrate into Stage 1.2.
- New branch, affix/set, and assignment fields have safe defaults.
- Invalid saves fail with clear validation messages.

### 18.2 Balance Report Expansion For New Mechanics

Extend the balance report as Stage 1.2 mechanics are added.

Note:

- Black Iron Fort base region coverage was completed with Epic 13.

Acceptance:

- Report keeps every configured region in configured region order.
- Report highlights defensive event counts, armor breaks, and protection events when present.
- Report still includes farm recommendation, mastery milestone, and boss gate per region.

### 18.3 Scenario Tests

Add focused tests for new mechanics.

Acceptance:

- Tests cover guard/armor, protection, armor break, branch effects, set bonuses, and assignment rewards.
- Tests remain deterministic and fast.
- Existing Stage 1.1 scenarios remain stable.

### 18.4 Browser Smoke Coverage

Add broader web interaction coverage.

Acceptance:

- Smoke flow covers route card selection.
- Smoke flow covers branch selection, equipment changes, and assignment setup.
- Save/reload preserves new choices.

## Recommended Delivery Order

1. Epic 16: equipment affixes and set bonuses.
2. Epic 17: patrols and training grounds.
3. Epic 18 final: migration, browser smoke, full verification.

## Out Of Scope For Stage 1.2

- Full backend accounts.
- Cloud save.
- WebSocket multiplayer or online boss co-op.
- Randomized loot generation.
- Lotus Monastery and Demon Cult Outpost as playable regions.
- Full hero recruitment or replacement.
- Complex assignment timers with many simultaneous reward clocks.

## Exit Criteria

Stage 1.2 is complete when:

- Black Iron Fort is playable after Mist Valley.
- Defensive enemies use at least one new readable defensive mechanic.
- The player has at least one counterplay path through armor break, Qi Break, branch choice, or equipment.
- Style branches are visible, selectable, saved, and mechanically meaningful.
- Equipment has deterministic affix or set depth.
- Offline assignments exist for patrols or training grounds.
- Save migration supports Stage 1.1 saves.
- Balance report covers every configured region.
- Tests cover new combat, progression, save, offline, and UI state behavior.
- `npm test`, `npm run build`, `npm run simulate`, and `git diff --check` pass.
