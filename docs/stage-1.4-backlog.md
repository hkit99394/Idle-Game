# Stage 1.4 Backlog

## Current Status

Stage 1.4 is planned and not started.

The recommended theme is **Demon Cult Outpost And Status Combat**. The goal is to add a new region whose enemies pressure the player through burst damage, wounds, Qi suppression, and debuffs, while giving the Lotus support and medicine systems a clear combat purpose.

## Stage Goals

- Add a new Demon Cult Outpost region after Lotus Monastery.
- Introduce status effects as a first-class combat system.
- Add counterplay through support heroes, medicine, resist stats, and targeted upgrades.
- Make battle summaries explain debuff pressure, cleansing, and burst deaths.
- Keep save migration, simulator coverage, and balance reports current.

## Non-Goals

- No PvP.
- No account backend or cloud save.
- No prestige/reset system.
- No fully random affix crafting.
- No open-ended skill tree redesign.

## MVP Exit Criteria For Stage 1.4

- The player can clear into Demon Cult Outpost through normal stage progression.
- Status effects are data-driven and covered by combat tests.
- Demon Cult enemies use at least three status patterns.
- Lotus support/medicine can counter at least one meaningful debuff pattern.
- The web UI clearly shows active statuses and cleanses.
- Offline farming works safely for Demon Cult cleared non-boss stages.
- Save migration accepts older saves and rejects impossible Stage 1.4 progress.
- `npm test`, `npm run build`, and `npm run simulate` pass.

## Epic Summary

| Epic | Title | Status | Purpose |
| --- | --- | --- | --- |
| 25 | Status Effect Engine | In Progress | Add reusable combat statuses, ticking effects, cleanses, and telemetry |
| 26 | Demon Cult Outpost Region | Not Started | Add region, stages, enemies, rewards, and boss gate |
| 27 | Counterplay Growth | Not Started | Add upgrades, medicine, and support hooks that answer status pressure |
| 28 | Battle UI And Summary Polish | Not Started | Make statuses readable during and after battle |
| 29 | Offline, Save, And Migration Safety | Not Started | Keep imported saves, offline farming, and diagnostics safe |
| 30 | Simulator And Balance Pass | Not Started | Validate the new region and all-region balance reports |

---

## Epic 25: Status Effect Engine

### Goal

Create a small, data-driven status effect system that can support poison, wound, vulnerability, Qi suppression, and cleanse effects without hard-coding Demon Cult logic into combat resolution.

### Tasks

- Add status effect types to combat/data schemas.
- Add status state to combatants.
- Apply statuses from skills and enemy actions.
- Process tick effects on combat timeline.
- Support duration, stack policy, max stacks, and dispel tags.
- Emit combat events for apply, tick, expire, cleanse, and resisted status.
- Add formulas for status chance and resistance.

### Suggested Statuses

| Status | Combat Effect | Counterplay |
| --- | --- | --- |
| Poison | Outer HP damage over time | Cleanse, poison resist, medicine |
| Wound | Reduces healing received | Cleanse, support upgrade, wound resist |
| Qi Suppression | Slows Inner Qi recovery or increases inner damage taken | Inner resist, Palm/Inner Art counter |
| Vulnerable | Increases Outer HP damage taken | Guard/protect, armor, cleanse |
| Burning Blood | Small backlash when attacking | Cleansing medicine, burst race |

### Acceptance Criteria

- Statuses can be defined in data and applied by skills/enemies.
- Status ticks are deterministic in tests.
- Expired statuses no longer affect formulas.
- Cleanses remove only matching dispel tags.
- Bosses can have reduced status duration or chance through data.
- Combat summary records status damage, resisted statuses, and cleanses.

### Test Coverage

- Applying a status updates combatant state.
- Poison deals expected tick damage.
- Wound reduces healing but does not block non-healing resource rewards.
- Qi Suppression changes inner flow without corrupting outer HP.
- Cleanse removes the correct status and leaves unrelated statuses intact.
- Replaying the same simulation seed gives the same status event order.

### Progress Notes

- Added core status definitions, active status state, application, ticking, cleanse, chance, duration, and combat modifier helpers.
- Added data-driven status definitions for Poison, Wound, Qi Suppression, Vulnerable, and Burning Blood.
- Updated skill effects so Palm and Staff techniques can reference status ids through data.
- Added static validation for status definitions and skill status references.
- Added deterministic combat/status tests for stacking, ticking, expiration, cleanse rules, resistance formulas, and modifiers.
- Remaining integration work: apply status effects inside the full battle timeline and feed status events into battle summaries once the battle resolver expands beyond formula-level simulation.

---

## Epic 26: Demon Cult Outpost Region

### Goal

Add a new region after Lotus Monastery that teaches the player to answer burst and debuff pressure.

### Tasks

- Add Demon Cult Outpost to region data.
- Add 7 to 10 Demon Cult stages.
- Add new enemy teams and formations.
- Add at least one elite status-heavy encounter.
- Add one boss gate that requires either stronger burst, cleansing, or resistance.
- Add reward tuning for silver, cultivation, herbs, Combat Experience, and first-clear items.
- Add map mastery thresholds and farm recommendation behavior.

### Enemy Concepts

| Enemy | Role | Pressure |
| --- | --- | --- |
| Blood Candle Acolyte | Backline caster | Poison and Qi Suppression |
| Red Sash Blade | Front/middle striker | Vulnerable into burst |
| Hex Seal Adept | Middle breaker | Inner damage and debuff extension |
| Ash Vial Rogue | Backline hidden weapon | Wound and poison spread |
| Demon Banner Captain | Boss support | Buffs allies and punishes uncleansed statuses |

### Acceptance Criteria

- Demon Cult unlocks only after the configured Lotus boss clear.
- Locked Demon Cult stages cannot be selected or farmed.
- Clearing Demon Cult stages updates current/highest stage correctly.
- Boss clears remain online-only.
- New stages appear in the map list and battle flow.
- Region data can be reordered without breaking simulator coverage.

### Test Coverage

- Lotus boss clear unlocks Demon Cult stage 1.
- Re-clearing older regions does not move current stage backward.
- Demon Cult boss remains locked until prior stages are cleared.
- Farm recommendation selects the best cleared farmable Demon Cult stage.
- Enemy teams spawn with configured formation slots.

---

## Epic 27: Counterplay Growth

### Goal

Make the new debuff pressure feel fair by giving the player visible, upgradeable answers.

### Tasks

- Add status resistance or status mitigation stat to core formulas.
- Add medicine items that cleanse or reduce poison/wound effects.
- Add Lotus support skill upgrade path for cleansing.
- Add one or two Demon Cult-focused equipment/manual rewards.
- Add CP contribution for resistance and support upgrades.
- Add data-driven unlocks for counterplay rewards.

### Candidate Rewards

| Reward | Type | Purpose |
| --- | --- | --- |
| Clear Heart Pill | Medicine | Cleanses poison or wound before next battle |
| Lotus Purity Method | Manual | Improves cleanse chance or cooldown |
| Black Veil Charm | Equipment | Adds status resistance |
| Blood-Seal Counterform | Style branch/manual | Bonus damage against debuffed enemies |

### Acceptance Criteria

- Counterplay effects are applied in combat, not only displayed in UI.
- Medicine inventory updates safely when consumed.
- Support cleanse contributes to battle summary.
- Resistance affects status chance or duration through a documented formula.
- CP includes meaningful but not dominant value from resistance/support stats.

### Test Coverage

- Cleanse medicine removes configured statuses and decrements inventory once.
- Lotus support cleanse can fire in combat and is deterministic under test.
- Resistance reduces status pressure without reaching full immunity by default.
- CP changes when counterplay equipment is equipped.

---

## Epic 28: Battle UI And Summary Polish

### Goal

Make status combat understandable without adding heavy tutorial text.

### Tasks

- Show active status chips near each combatant.
- Use color/rank indicators for status severity.
- Add status rows to battle summary.
- Add "most status damage", "most cleanses", and "most debuffed" summary callouts.
- Add concise failure hints when a boss loss is mostly caused by statuses.
- Make mobile layout handle status chips without overlap.

### Acceptance Criteria

- Status indicators fit on mobile and desktop.
- Status text does not overlap bars, formation slots, or battle controls.
- The player can tell when poison, wound, or Qi Suppression is active.
- Battle summary names the major status source and counterplay used.
- No visible explanatory wall of text is added to the main battle screen.

### Test Coverage

- View model exposes active statuses and severity.
- Summary groups status damage and cleanses by combatant.
- Smoke test covers a Demon Cult status battle and reload.

---

## Epic 29: Offline, Save, And Migration Safety

### Goal

Keep Stage 1.4 safe for existing saves and offline farming.

### Tasks

- Bump save data version if new persisted fields are added.
- Migrate old saves with default status/counterplay fields.
- Validate Demon Cult map progress against configured stage count.
- Reject unknown region/map keys in imported saves.
- Ensure offline farming cannot apply boss-only status rewards.
- Add diagnostics for selected farm target, map progress, and save version.

### Acceptance Criteria

- Existing Stage 1.3 saves load and migrate.
- Imported saves cannot unlock Demon Cult with oversized map progress.
- Offline rewards update timestamp/idempotency guards after grant.
- Selected offline farm target must be cleared, non-boss, and farmable.
- Save diagnostics identify invalid map ids and invalid stage indices.

### Test Coverage

- Stage 1.3 fixture migrates into Stage 1.4 defaults.
- Unknown map id is rejected.
- Fractional or oversized highest-cleared stage values are rejected.
- Offline Demon Cult reward applies once across repeated reloads.
- Offline rewards do not clear Demon Cult boss.

---

## Epic 30: Simulator And Balance Pass

### Goal

Keep balance data trustworthy as the fourth region and status pressure arrive.

### Tasks

- Extend balance report to include Demon Cult in configured region order.
- Add status metrics to simulator output.
- Add boss gate report for Demon Cult.
- Add farm recommendation report for Demon Cult.
- Add scenario tests for baseline, trained, cleanse-focused, and resistance-focused teams.
- Add failure thresholds for impossible or too-short stage clears.

### Suggested Metrics

- Clear time.
- Win/loss.
- Qi Break count.
- Status applications.
- Status damage.
- Healing denied by wound.
- Cleanses.
- Resistance/prevention events.
- Boss failure reason.

### Acceptance Criteria

- Simulator reads region order from data, not hard-coded Demon Cult placement.
- Every configured stage appears in the report.
- Missing stage ids fail loudly.
- Demon Cult normal stages land in target clear-time bands.
- Demon Cult boss blocks baseline and clears with intended counterplay.
- Report output remains readable in CLI and JSON.

### Test Coverage

- Balance report includes all configured regions.
- Removing or renaming Demon Cult fails tests with a useful error.
- Status metrics are nonzero in Demon Cult scenarios.
- JSON output includes status summaries.

---

## Open Questions Before Implementation

- Should status resistance reduce application chance, duration, or tick damage?
- Should medicine be consumed automatically before battle, manually selected, or both?
- Should Demon Cult introduce a new hero, or should Lotus support remain the main counterplay?
- Should the new region have 7 stages like recent regions or return to 10 stages?
- Should debuffs affect only combat or also reduce offline farm efficiency?
- Should status icons use fixed colors by category: damage, control, vulnerability, cleanse?

## Recommended Implementation Order

1. Epic 25: Status Effect Engine.
2. Epic 26: Demon Cult Outpost Region.
3. Epic 30: Simulator And Balance Pass for early tuning.
4. Epic 27: Counterplay Growth.
5. Epic 28: Battle UI And Summary Polish.
6. Epic 29: Offline, Save, And Migration Safety.

## Final Stage 1.4 Checklist

- [ ] Status engine implemented and tested.
- [ ] Demon Cult region implemented.
- [ ] Counterplay rewards implemented.
- [ ] Battle UI and summary updated.
- [ ] Offline and save migration safety verified.
- [ ] Simulator and balance report updated.
- [ ] Stage 1.4 backlog reviewed.
- [ ] Stage 1.4 backlog moved to archive after completion.
