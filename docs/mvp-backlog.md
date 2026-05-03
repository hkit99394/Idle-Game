# MVP Backlog

This backlog tracks the remaining work needed to reach the first playable MVP for **Path of Jianghu**.

The MVP target is a responsive web game where four fixed-style heroes auto-battle through Bamboo Road, earn rewards, buy upgrades, gain Combat Experience, unlock map mastery, save progress, and farm selected cleared stages offline.

## Current Status

Completed:

- Planning documents
- Analysis document
- TypeScript, Vite, React, Vitest skeleton
- Core combat formulas
- Static JSON data
- Static data validation
- Team-vs-team combat simulator
- Basic targeting
- Stage rewards
- Hero and sect upgrade purchases
- Combat Experience and map mastery helpers
- Offline reward formula
- Formula, simulator, progression, data, and offline tests

Still needed:

- Connect progression to battle results
- Add save/load
- Build playable web UI
- Add offline farming flow
- Tune early balance
- Add basic UX polish

## MVP Epics

| Epic | Status | Goal |
| --- | --- | --- |
| Core Engine | In progress | Make battle, rewards, upgrades, mastery, and offline rules work together |
| Data And Balance | In progress | Tune Bamboo Road stages and first boss |
| Web Prototype | Not started | Make the first playable browser UI |
| Save And Offline | Not started | Preserve progress and award offline farming |
| MVP Polish | Not started | Make combat readable and the loop understandable |

## Epic 1: Core Engine Integration

Goal: connect battle simulation, victory handling, rewards, upgrades, and progression into one game-loop API.

### 1.1 Battle Resolution API

Status: Completed

Task:

- Add a core function that runs a stage battle and returns a game result.

Suggested API:

```ts
resolveStageBattle(data, progress, stageId): StageBattleResolution
```

Acceptance:

- Uses current progress to build player team stats.
- Uses stage data to build enemy team.
- Rejects attempts to battle locked stages.
- Runs `simulateBattle`.
- If player wins, applies stage rewards.
- If player wins, updates highest cleared stage for the map.
- If player wins, unlocks or advances to the next stage when one exists.
- If player loses, does not grant clear rewards.
- If player loses, does not unlock the next stage.
- Returns battle result, rewards, and updated progress.

### 1.2 Progress-Based Hero Team Builder

Status: Completed

Task:

- Create a function that builds player combatants from hero data and progress.

Acceptance:

- Applies hero upgrades.
- Applies sect upgrades.
- Applies map mastery attack bonus.
- Applies enemy-family mastery damage bonus during combat resolution.
- Keeps MVP heroes fixed: Fist, Palm, Sword, Staff.
- Produces team input for the simulator.

### 1.3 Mastery Bonus Combat Integration

Status: Completed

Task:

- Ensure all mastery bonuses that affect combat are applied by the core engine, not only displayed in the UI.

Acceptance:

- `map_outer_and_inner_attack_multiplier` affects derived hero attack on the relevant map.
- `enemy_family_damage_multiplier` affects damage against the matching enemy family.
- Combat tests prove mastery bonuses change battle output.
- UI reads active bonuses from core state instead of recalculating them separately.

### 1.4 Stage Enemy Team Builder

Status: Completed

Task:

- Create a function that builds enemy combatants from stage data.

Acceptance:

- Reads `stage.enemyTeam.combatantIds`.
- Supports one enemy now and multiple enemies later.
- Throws or returns a clear error for missing enemy ids.

### 1.5 Stage Unlock And Current Stage State

Status: Completed

Task:

- Add explicit core state and helpers for stage unlocks, current stage, and highest cleared stage.

Acceptance:

- New progress starts at Bamboo Road stage 1.
- Locked stages cannot be battled through the core API.
- Winning a non-final stage unlocks the next stage.
- Winning a boss unlocks the next map or region when one exists.
- Highest cleared stage is updated only on victory.
- Highest cleared stage is used to determine valid offline farming targets.

### 1.6 Defeat Handling

Status: Completed

Task:

- Define and implement what happens when the player loses.

Recommended MVP behavior:

- Stay on the current stage.
- Suggest farming highest cleared non-boss stage.
- Do not grant stage clear rewards.

Acceptance:

- Losing a boss does not unlock next stage.
- Losing does not grant boss rewards.
- Losing does not corrupt progress.

## Epic 2: Data And Balance

Goal: make Bamboo Road progression feel reasonable for a first prototype.

### 2.1 Stage Scaling Pass

Status: Not started

Task:

- Tune Bamboo Road stages 1 to 10 using simulator output.

Target:

- Normal enemies: 5 to 15 seconds.
- Elites: 20 to 40 seconds.
- First boss: player should lose before upgrades, then become beatable after training.

Acceptance:

- `npm run simulate` reports useful stage/boss results.
- Early normal fights are not too slow.
- Boss requires upgrades or mastery.

### 2.2 Qi Break Visibility Tuning

Status: Not started

Task:

- Ensure the first region has at least one enemy or boss where Qi Break happens.

Acceptance:

- Simulator can show at least one Qi Break in a Bamboo Road scenario.
- Palm hero feels useful.
- Outer-only damage is not always the best answer.

### 2.3 Upgrade Economy Pass

Status: Not started

Task:

- Tune reward amounts and upgrade costs.

Target:

- First upgrade within roughly 1 to 3 stage clears.
- First mastery threshold within a short farming session.
- Boss should become beatable through upgrades, mastery, or both.

Acceptance:

- Upgrade costs do not block early play.
- Silver income and costs have clear pacing.
- Combat Experience does not replace silver/cultivation.

### 2.4 Balance Report Tool

Status: Not started

Task:

- Expand `npm run simulate` into a simple balance report.

Acceptance:

- Reports stage id, enemy, winner, duration, Qi Break count, and rewards.
- Can run all Bamboo Road stages.
- Output is readable enough for tuning.

## Epic 3: Web Prototype

Goal: make the game playable in the browser.

### 3.1 App State Container

Status: Not started

Task:

- Add web-side state for current progress, selected stage, and selected offline farm stage.

Acceptance:

- Initializes new progress.
- Can update progress after battle.
- Can update progress after purchases.
- Keeps core logic outside React components.

### 3.2 Battle Screen

Status: Not started

Task:

- Replace placeholder UI with a real battle screen.

Acceptance:

- Shows player heroes.
- Shows enemy.
- Shows Outer HP and Inner Qi bars.
- Shows current stage.
- Shows winner/defeat result.
- Can start or auto-run current stage battle.

### 3.3 Battle Event Playback

Status: Not started

Task:

- Use simulator events to display battle progression.

MVP options:

- Instant result with event log.
- Simple timed playback.

Recommended MVP:

- Start with instant result and readable event log.
- Add animation later.

Acceptance:

- Player can see attacks.
- Player can see Qi Break events.
- Player can understand why a fight was won or lost.

### 3.4 Upgrade Panel

Status: Not started

Task:

- Add UI for hero and sect upgrades.

Acceptance:

- Shows silver.
- Shows upgrade level.
- Shows upgrade cost.
- Disables unaffordable upgrades.
- Purchase updates progress and derived stats.

### 3.5 Stage And Farming Selector

Status: Not started

Task:

- Add UI for current stage and cleared-stage farming target.

Acceptance:

- Shows Bamboo Road stages.
- Locked stages are visually unavailable.
- Cleared non-boss stages can be selected for offline farming.
- Boss stages cannot be selected for offline farming.

### 3.6 Mastery Panel

Status: Not started

Task:

- Show Combat Experience and next mastery threshold.

Acceptance:

- Shows current Combat Experience for Bamboo Road.
- Shows next threshold: 100, 500, or 3000.
- Shows reached ranks.
- Shows active mastery bonuses.

## Epic 4: Save And Offline Farming

Goal: make progress persist and make idle return rewards work.

### 4.1 Save Schema

Status: Not started

Task:

- Add versioned save data type and helpers.

Acceptance:

- Save includes version.
- Save includes resources, heroes, sect, maps, current stage, selected farm stage, and timestamps.
- Invalid saves fail safely.

### 4.2 Local Storage Save/Load

Status: Not started

Task:

- Save progress in browser localStorage.

Acceptance:

- Loads progress on app start.
- Saves after battle resolution.
- Saves after upgrade purchase.
- Autosaves every 10 to 30 seconds.

### 4.3 Offline Reward Application

Status: Not started

Task:

- Apply offline rewards when loading a save.

Acceptance:

- Uses selected cleared non-boss farming stage.
- Respects offline cap.
- Uses offline efficiency.
- Grants silver, cultivation, and Combat Experience.
- Does not clear new stages.
- Does not clear bosses.
- Advances the save timestamp after rewards are applied.
- A second load without additional elapsed time grants zero duplicate offline rewards.

### 4.4 Offline Farm Target Validation

Status: Not started

Task:

- Add a core validator and setter for the selected offline farming stage.

Acceptance:

- Selected farm target must exist.
- Selected farm target must be in a cleared map or stage.
- Selected farm target must be non-boss.
- Selected farm target must have `canFarmOffline: true`.
- Invalid save data with a locked, missing, or boss farm target falls back safely.
- Offline reward calculation refuses invalid farm targets.

### 4.5 Offline Reward Idempotency Test

Status: Not started

Task:

- Add tests proving offline rewards cannot be claimed repeatedly for the same time interval.

Acceptance:

- First load grants rewards for elapsed time.
- Save timestamp is updated after reward application.
- Immediate second load grants no additional rewards.
- Offline rewards remain capped by offline cap.

### 4.6 Offline Summary UI

Status: Not started

Task:

- Show rewards earned while away.

Acceptance:

- Shows time away.
- Shows silver, cultivation, and Combat Experience gained.
- Shows selected farming map/stage.
- Player can dismiss summary.

## Epic 5: MVP Polish

Goal: make the first playable version readable and pleasant enough to test.

### 5.1 Responsive Layout

Status: Not started

Task:

- Make battle, upgrades, and stage selection usable on desktop and mobile widths.

Acceptance:

- No overlapping text.
- Bars remain readable.
- Buttons are tappable on mobile.
- Main loop is usable without horizontal scrolling.

### 5.2 Combat Readability

Status: Not started

Task:

- Improve labels, bars, and battle log.

Acceptance:

- Outer HP and Inner Qi are visually distinct.
- Qi Break stands out.
- Damage numbers are understandable.
- Defeat/victory is clear.

### 5.3 Empty And Error States

Status: Not started

Task:

- Add basic fallback states.

Acceptance:

- Missing save falls back to new game.
- Invalid stage selection is handled.
- Unaffordable upgrades explain why.
- No blank screen on data error.

### 5.4 MVP Smoke Test

Status: Not started

Task:

- Run through a short manual playtest.

Acceptance:

- Start new game.
- Clear first stages.
- Buy first upgrade.
- Gain Combat Experience.
- See mastery progress.
- Lose to boss.
- Farm cleared stage.
- Reload page and keep progress.
- Receive offline rewards.
- Refresh again and confirm offline rewards are not duplicated.

## Recommended Build Order

1. Core battle resolution API.
2. Stage unlock and current stage state.
3. Progress-based team builder.
4. Mastery bonus combat integration.
5. Stage/balance report tool.
6. Save schema.
7. Offline farm target validation.
8. Web app state container.
9. Battle screen.
10. Upgrade panel.
11. Stage and farming selector.
12. Offline save/load and rewards.
13. Offline reward idempotency test.
14. Mastery panel.
15. Balance pass.
16. Responsive polish.
17. MVP smoke test.

## MVP Exit Criteria

The MVP is complete when:

- User can open the web game.
- User can battle through Bamboo Road stages.
- Locked stages cannot be battled early.
- User can earn silver, cultivation, and Combat Experience.
- User can buy hero and sect upgrades.
- User can see Outer HP, Inner Qi, and Qi Break.
- User can lose to and later beat the first boss.
- User can select a cleared non-boss stage for farming.
- User cannot select bosses or locked stages for offline farming.
- User can close and reopen the game with progress preserved.
- User receives offline farming rewards.
- User cannot duplicate offline rewards by refreshing.
- Tests, typecheck, build, simulate, and audit pass.
