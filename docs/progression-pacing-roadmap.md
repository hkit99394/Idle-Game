# Progression Pacing Roadmap

This document records the recommended planning model for how Path of Neon should relate stages, hero/team power, upgrade economy, offline farming, and milestone timing. It is a design and tooling roadmap, not an implemented balance change.

The current implementation already has strong balance tooling: region `balanceTargets`, static validation, `npm run simulate`, compact JSON/CSV exports, boss-gate assumptions, farm recommendations, and tactic comparison exports. The missing layer is a target player timeline that says when a player should reach each major stage band.

## Design Goal

Progression should feel like an idle RPG economy rather than a pure level list:

- Stages test whether the current team can convert power into clear time and survival.
- Farming produces the resources needed to cross planned gates.
- Offline progress should be meaningful, but active play should remain the fastest way to push new progression.
- Bosses should be explicit checkpoints with readable preparation paths.
- CP should help the player understand strength, but simulator outcomes should remain the tuning authority.

## Current Formula Surface

The current formulas are split between code and authored data:

| Surface | Current owner | Notes |
| --- | --- | --- |
| Level stat growth | [core/combat/formulas.ts](../core/combat/formulas.ts) | HP, Context Stability, attacks, and defenses scale by `LEVEL_STAT_GROWTH = 1.06`. |
| Combat Power display | [core/combat/formulas.ts](../core/combat/formulas.ts) | Combines durability, offense, speed, control, recovery, and resistance. Useful as a player signal, not enough as a balance truth. |
| Level XP | [core/progression/levels.ts](../core/progression/levels.ts) | Total XP is triangular: `100 * (level - 1) * level / 2`. |
| Upgrade cost | [core/progression/upgrades.ts](../core/progression/upgrades.ts) | Silver costs use `floor(baseCost * costGrowth ^ currentLevel)`. |
| Offline rewards | [core/offline/offlineRewards.ts](../core/offline/offlineRewards.ts) | Defaults to 8 hour cap, 10 second estimated clear, 5 second minimum clear, and 60% efficiency. |
| Region budgets | [data/regions.json](../data/regions.json) | Clear-time bands, reward curve rules, pressure budgets, boss gates, and budget exceptions. |
| Stage rewards | [data/stages.json](../data/stages.json) | Silver, cultivation, herbs, Combat XP, drops, farmability, and boss flags. |
| Mastery | [data/mastery.json](../data/mastery.json) | Current thresholds are 100, 500, and 3000 Combat XP. |

## Recommended Model

Use a target-time anchored, piecewise exponential model.

Do not use a single global linear curve. Linear growth is easy to author early, but it breaks once levels, upgrades, equipment, mastery, style mastery, tactics, and medicine all compound.

Do not use pure exponential growth everywhere either. Pure exponential player power against pure exponential enemy power is brittle: small differences in rates can create either runaway clearing or hard walls.

The best fit is:

- Piecewise exponential enemy difficulty and reward growth per region or content band.
- Explicit clear-time targets as the release authority.
- Boss gates authored as intentional checkpoints.
- Diminishing-return or capped formulas for volatile systems such as status resistance, speed, offline efficiency, drop boosts, and reward multipliers.
- Simulator reports as the tuning authority, with CP calibrated against simulator outcomes.

Practical planning formulas:

```text
TargetPlayerPower(stage) = RegionEntryPower * RegionGrowth ^ StageIndex

EnemyBudget(stage) = TargetPlayerEffectiveDps(stage) * TargetClearSeconds

RewardBudget(stage) = NextMeaningfulUpgradeCost / TargetClearsToAfford

BossGateFarms = ceil(
  (RequiredPower - CurrentPowerAfterNormalStages) / PowerGainPerFarmClear
)
```

For this project, `TargetPlayerPower` should be measured from simulator-visible output, not just displayed CP:

- clear time;
- player effective DPS;
- enemy effective DPS;
- survival margin;
- AI Overload frequency;
- status damage;
- medicine consumed;
- guard, protect, heal, and cleanse events;
- farm clears needed;
- training cost consumed;
- mastery threshold distance.

## Current Pacing Observation

The current configured content is prototype-paced. The simulator can move through most configured regions in tens of minutes of active play, not in a Day 1 to Day 7 idle calendar.

That is acceptable for the current prototype. It means long-form pacing must come from explicit budgets around:

- farm gates;
- upgrade affordability;
- offline reward rate;
- assignment rewards;
- equipment and set acquisition;
- mastery goals;
- boss preparation;
- implemented Path of Neon mechanics such as Cognitive Intrusion;
- report-only or deferred Path of Neon systems such as District Heat, augment loadouts, countermeasure economy, and AI raid events.

One important tuning risk was offline farming's old fixed `estimatedClearTimeSeconds` of `10`, which could make a 25s active route too efficient offline after the 60% offline modifier. Stage 3.2 Slice 98.3 deliberately kept the live formula fixed while reporting `inversion`, `watch`, or `acceptable` parity classifications. Stage 3.3 Slice 99.3 now implements the target-derived formula chosen in Slice 99.2: use the selected route's normal/elite clear-time target midpoint with the existing minimum-clear floor, keep preview and apply on the same helper, and avoid save/export schema changes. Current recommended farm parity rows are all `acceptable`.

Stage 3.2 Slice 98.5 applied that region-aware Redline treatment: `redline_outpost_1` now uses an `18-25s` normal target, Redline elites use a `19-40s` band, default Redline status pressure is below cap, and the Redline boss remains a baseline clear inside its `80-140s` gate. Slice 98.6 confirms default Redline blocker cleanup is not the live-heat blocker anymore.

Stage 3.1 closed District Heat as an author-facing projection only. Stage 3.2 is archived at [Archived Stage 3.2 Backlog](archive/stage-3.2-backlog.md), and Slice 98.6 keeps that posture: `npm run simulate` and full debug JSON can show projected heat plus the `report_only` promotion decision, but the stable compact JSON/CSV exports, tactic exports, save state, cloud payloads, and web UI remain heat-free. Stage 3.3 is active at [Stage 3.3 Backlog](stage-3.3-backlog.md); Slice 99.5 keeps current heat runtime report-only after parity and Black Iron debt cleanup, and chooses a non-punitive warning contract as the next pacing step before any live heat reward/risk change.

## Milestone Pacing Targets

These targets describe the desired player journey once the game moves beyond prototype pacing.

| Milestone | Player outcome | Suggested budget |
| --- | --- | --- |
| 5 minutes | First 3 to 5 stages cleared and first upgrade bought. | Normal clears around 5 to 15 seconds; first upgrade in 1 to 3 clears. |
| 15 minutes | First boss discovered and either blocked or barely beaten. | Boss baseline should hold or feel dangerous; preparation path should be 5 to 15 minutes. |
| 60 minutes | Region 2 opened and the offline farm loop understood. | 1 to 2 regions visible; first meaningful idle return; at least one equipment or skill-upgrade decision. |
| Day 1 | Region 3 or first major counterplay wall reached. | 1 to 3 hours of combined active and idle progress; the wall should be a planned boss or system check. |
| Day 3 | Midgame systems start carrying progression. | Tactics, equipment sets, assignments, and mastery rank 2 should matter. |
| Day 7 | Late prototype content reached. | Status, healing, defense, and medicine/countermeasure choices should be required rather than cosmetic. |
| Long term | Expansion cadence begins. | New region packs should ship with milestone targets, timeline simulations, and budget checks. |

## Stage And Gate Guidelines

Use three pacing layers when authoring or retuning content.

### 1. Active Combat Readability

Suggested clear-time ranges:

| Content type | Early | Midgame | Late prototype |
| --- | ---: | ---: | ---: |
| Normal stage | 8 to 20s | 20 to 45s | 30 to 60s |
| Elite stage | 20 to 45s | 35 to 90s | 60 to 120s |
| Boss expected to clear | 45 to 120s | 60 to 150s | 90 to 180s |
| Boss expected to hold | 20 to 90s | 30 to 120s | 45 to 150s |

Avoid "slow but still clears" normal stages. Those feel stale quickly in an idle loop.

### 2. Economy Pacing

For every region, define:

```text
TargetClearsToNextPurchase
TargetPurchasesBeforeNextBoss
TargetFarmClearsToBeatBoss
ExpectedActiveRewardPerHour
ExpectedOfflineRewardPerHour
```

Then tune costs from the intended play pattern:

```text
UpgradeCost(level) ~= FarmStageRewardPerClear * TargetClearsToAfford
```

Silver, cultivation, herbs, Combat XP, mastery XP, equipment drops, and assignment rewards should each have a distinct job. If a resource does not affect the next decision, it risks becoming visual noise.

### 3. Boss Gate Contracts

Every boss should declare:

- baseline result: `player_clear` or `enemy_hold`;
- trained or farmed expected result;
- max farm clears;
- max training cost;
- expected clear time after preparation;
- expected status damage and medicine use;
- expected offline contribution;
- required player action such as train, farm, equip, skill upgrade, tactic, medicine, mastery, or countermeasure.

Bosses are good walls only when the player can read the path through the wall.

## Reports To Add

The existing balance report is a strong base. Add these reports before large economy retunes:

| Report | Purpose |
| --- | --- |
| Progression Timeline Report | Simulate active and idle sessions and report expected stage, resources, upgrades, mastery, equipment, and boss outcomes at 5m, 15m, 1h, Day 1, Day 3, and Day 7. |
| Economy Affordability Report | Show clears-to-upgrade, cultivation-to-skill-upgrade, and boss-prep training cost by region. |
| Offline Parity Report | Available in Stage 3.2 simulator/default report/full debug JSON. Compare active rewards per hour using actual simulated clear time against offline rewards per hour and classify rows as `acceptable`, `watch`, or `inversion`. |
| Power Contribution Report | Break down effective team power from levels, upgrades, sect upgrades, skill upgrades, equipment, mastery, style mastery, tactics, medicine, and future Path of Neon systems. |
| CP Calibration Report | Compare displayed team CP to clear result, survival margin, and clear time so CP remains directionally useful. |
| Backsolve Authoring Tool | Suggest enemy HP, defense, attack, rewards, or upgrade costs from target clear time and target farm clears. |
| Milestone Regression Tests | Protect first-upgrade timing, first mastery timing, boss-gate farm counts, offline parity, and timeline snapshots. |

## Risks To Watch

- Runaway compounding: small buffs can erase a region when many multipliers stack.
- Offline inflation: target-derived clear-time assumptions must stay aligned with route pacing so offline rewards do not creep above active play.
- Hard walls without guidance: a boss hold must imply productive player actions.
- Repeated stale farming: "farm one stage 20 times" can work once in onboarding, but repeated loops need equipment, mastery, assignments, or build decisions.
- CP lying: CP should not claim a fight is safe when status, healing, formation, or AI Overload mechanics decide the outcome.
- Permanent exceptions: boss clear-time exceptions and known budget misses should remain visible until fixed or intentionally reclassified.
- Authored data drift: a stage can pass local clear-time budgets while the whole game fails Day 1 or Day 7 pacing.

## Suggested Backlog

1. Progression Pacing Model
   - Define milestone targets for first session, first hour, Day 1, Day 3, and Day 7.
   - Add a canonical pacing table for region length, farm gates, target purchases, and unlocks.

2. Timeline Simulation Tool
   - Simulate active and idle sessions over time.
   - Output expected stage, resources, levels, upgrades, mastery, equipment, and boss outcomes.

3. Offline Reward Recalibration
   - Keep the target-derived offline estimate covered by active-vs-offline parity checks.
   - Revisit stage-authored or simulated estimates only if target-band midpoint evidence proves too coarse.

4. Economy Affordability Gates
   - Add report rows or tests for clears-to-upgrade, cultivation-to-skill-upgrade, and boss-prep training cost.

5. Boss Gate Contract Cleanup
   - Remove boss clear-time exceptions where possible.
   - Require every boss gate to declare expected clear, hold, farm, and training behavior.

6. Power Contribution And CP Calibration
   - Report team CP and contribution breakdown per stage or boss.
   - Tune CP against simulator outcomes rather than treating it as the tuning authority.

7. Redline Retune Pass
   - Address the current clear-time and status-pressure misses.
   - Use tactic comparison rows to decide whether sustain, status resistance, or countermeasure systems should be the intended solution.

8. Region Authoring Backsolve
   - Add helper tooling that suggests enemy stats and rewards from target clear time, target farm clears, and milestone timing.

## External Design References

- [The Math of Idle Games, Part I](https://www.kongregate.com/en/pages/the-math-of-idle-games-part-i): useful for the relationship between exponential costs, production, multipliers, and generator relevance.
- [How to design idle games](https://machinations.io/articles/idle-games-and-how-to-design-them): useful for framing active play, idle rewards, meta loops, and meaningful choices.
- [What are game simulations and why should you care?](https://machinations.io/articles/what-are-game-simulations-and-why-should-you-care): useful support for making simulations part of the balance process before long-form playtesting.
- [GameAnalytics progression events](http://docs.gameanalytics.com/events-metrics-and-filtering/event-types/progression-events/): useful for future analytics events around region, stage, boss, and timing funnels.
- [GameAnalytics retention guide](https://www.gameanalytics.com/blog/how-to-think-about-retention-in-games): useful for treating Day 1, Day 3, Day 7, and longer retention as context-sensitive product signals rather than fixed universal targets.
