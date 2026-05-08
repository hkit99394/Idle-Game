# Stage 1.5 Backlog

## Current Status

Stage 1.5 is in progress.

The recommended theme is **Status Counterplay Automation And Balance**. Stage 1.4 introduced Demon Cult Outpost, status data, medicine, save safety, presentation helpers, and balance reporting. Stage 1.5 should make those systems feel playable by integrating stronger resistance formulas, automatic medicine use, fixed status color rules, and scenario-based balance tuning.

## Decisions Carried Forward

- Status resistance should reduce application chance, duration, and tick damage.
- Medicine should be usable automatically during battle and outside battle.
- Demon Cult does not need a new hero yet; keep this as a decision spike after Lotus/support counterplay is tested.
- Future region length can default to seven stages unless content design needs more.
- Debuffs affect combat only; they should not reduce offline farming efficiency.
- Status icons should use fixed colors by category.

## Stage Goals

- Make status resistance a first-class defensive stat across chance, duration, and tick damage.
- Add auto medicine policies that are inventory-safe and understandable.
- Connect medicine/counterplay into battle preparation and combat resolution.
- Standardize status icon colors and severity indicators for future UI screens.
- Add scenario simulator coverage for baseline, resistance-focused, medicine-focused, and combined counterplay.
- Decide whether Demon Cult needs a new hero or whether Lotus/support systems carry the counterplay fantasy.

## Non-Goals

- No PvP.
- No account backend or cloud save.
- No prestige/reset system.
- No random affix crafting.
- No offline debuff penalties.
- No new full region unless required by balance testing.

## Exit Criteria

- Resistance formulas are documented, deterministic, and tested.
- Auto medicine can trigger in battle and non-battle flows without duplicate consumption.
- The player can configure or at least preview auto medicine behavior.
- Status icons use stable category colors everywhere statuses are rendered.
- Simulator reports compare baseline, resistance, medicine, and combined counterplay scenarios.
- Demon Cult boss gate has a clear intended counterplay route.
- `npm test`, `npm run build`, and `npm run simulate` pass.

## Epic Summary

| Epic | Title | Status | Purpose |
| --- | --- | --- | --- |
| 31 | Resistance Formula Integration | Completed | Apply status resistance to chance, duration, and tick damage |
| 32 | Auto Medicine System | Not Started | Consume medicine safely during battle and non-battle recovery |
| 33 | Counterplay Loadout And Preview | Not Started | Let players understand and manage medicine/counterplay choices |
| 34 | Status Visual Language | Not Started | Standardize fixed category colors, severity, and cleanse display |
| 35 | Scenario Simulator And Balance Gates | Not Started | Tune Demon Cult with baseline and counterplay scenarios |
| 36 | Support Identity Decision | Not Started | Decide whether Lotus support is enough or a new hero is needed |

---

## Epic 31: Resistance Formula Integration

### Goal

Make `statusResistance` reduce application chance, duration, and tick damage with clear caps so resistance feels valuable without creating full immunity by default.

### Proposed Formula

Use one effective resistance value per target:

```text
effectiveResistance = clamp(baseStatusResistance + temporaryMedicineBonus + supportBonus, 0, 0.8)
applicationChance = clamp(baseChance + attackerStatusAccuracy - effectiveResistance, 0.05, 0.95)
durationSeconds = max(1, baseDurationSeconds * (1 - effectiveResistance * 0.75))
tickDamage = rawTickDamage * (1 - effectiveResistance * 0.6)
```

Notes:

- Application chance remains the main effect.
- Duration reduction makes resisted debuffs feel shorter even when they land.
- Tick damage reduction protects against poison-like effects without changing non-damage debuffs.
- Boss or elite modifiers can later reduce the effect of player resistance if needed.

### Tasks

- Extend status formulas to calculate effective resistance from base stats and temporary bonuses.
- Update duration calculation to use the chosen duration scale.
- Update tick damage calculation to accept target resistance.
- Keep minimum application chance and duration caps.
- Add constants for resistance cap, duration scale, and tick damage scale.
- Update simulator estimates to use the same resistance model.
- Document the formula in code comments or balance notes.

### Acceptance Criteria

- Status resistance reduces application chance.
- Status resistance reduces landed status duration.
- Status resistance reduces tick damage for damage statuses.
- Resistance cannot push normal enemies to zero status chance by default.
- Existing status tests still pass with updated expected values.
- Simulator and combat helpers use the same formula constants.

### Test Coverage

- High resistance lowers application chance to the configured minimum.
- High resistance lowers duration but respects the minimum duration.
- Poison tick damage is reduced by target resistance.
- Non-damage statuses are unaffected by tick damage reduction.
- Temporary medicine resistance stacks with base resistance up to the cap.

### Progress Notes

- Added shared status resistance formula constants for max effective resistance, application chance caps, duration scaling, tick damage scaling, and minimum duration.
- Added `calculateEffectiveStatusResistance` so base resistance and temporary medicine/support bonuses use one cap.
- Updated status application duration so landed statuses are shortened by effective resistance.
- Updated status ticking so damage statuses reduce tick damage by effective resistance while non-damage statuses remain at zero tick damage.
- Updated medicine resistance bonus application to cap through the shared effective resistance formula.
- Updated balance report status damage and healing-denied estimates to use the same duration and tick-damage helpers as combat.
- Added tests for resistance caps, duration reduction, poison tick damage reduction, non-damage tick behavior, and medicine bonus caps.

---

## Epic 32: Auto Medicine System

### Goal

Make medicine useful without requiring constant manual clicking. The system should automatically consume medicine when clear rules are met, both in battle and outside battle.

### Auto Use Policy

Recommended MVP policy:

- Auto cleanse in battle when a combatant has a matching debuff and the medicine has inventory.
- Prefer medicine with the narrowest matching cleanse first, then broader `debuff` cleanse.
- Use resistance medicine before battle when entering a stage that is known to apply statuses.
- Use non-battle cleanse when the player has lingering statuses after combat.
- Never consume medicine if it would have no effect.
- Never consume more than one medicine of the same id for the same trigger window.

### Tasks

- Add auto medicine policy types.
- Add helper to pick the best medicine for active statuses.
- Add helper to pick pre-battle resistance medicine for a stage.
- Add battle hook for automatic cleanse.
- Add non-battle helper for automatic cleanup after battle.
- Track medicine consumption in battle summary.
- Ensure inventory updates are immutable and idempotent.

### Acceptance Criteria

- Auto medicine consumes only owned medicine.
- Auto medicine does not consume when there is no matching status or useful resistance target.
- Narrow cleanse is preferred before broad cleanse when both are available.
- Battle summary records consumed medicine and cleansed statuses.
- Re-running the same trigger does not duplicate consumption.
- Medicine can still be used manually later if manual controls are added.

### Test Coverage

- Auto cleanse removes poison/wound using Clear Heart Pill.
- Auto cleanse uses Purity Draught for unmatched debuffs.
- Pre-battle resistance medicine is selected for status-heavy stages.
- No inventory is consumed when the target has no matching status.
- Duplicate trigger windows do not double-consume medicine.

---

## Epic 33: Counterplay Loadout And Preview

### Goal

Give the player enough visibility to understand why medicine and resistance matter, without making the UI heavy.

### Tasks

- Add a medicine inventory panel or compact medicine row.
- Show which medicines are unlocked, owned, and auto-eligible.
- Show the selected/active auto medicine policy.
- Add stage preview hints for expected status pressure.
- Add "recommended counterplay" text from simulator or stage metadata.
- Add save fields for auto medicine preferences if the player can configure them.

### Acceptance Criteria

- The player can see available medicine counts.
- Locked medicine stays visible only if the existing UI pattern supports future unlock previews.
- Demon Cult stages show expected status categories before combat.
- Auto medicine settings persist if settings are user-configurable.
- Import/save validation rejects impossible medicine preference ids.

### Test Coverage

- Medicine view model groups unlocked and locked medicine correctly.
- Stage preview exposes poison/wound/inner/status categories.
- Save migration defaults auto medicine settings safely.
- Invalid configured medicine id is rejected.

---

## Epic 34: Status Visual Language

### Goal

Make statuses instantly readable through fixed category colors and consistent severity indicators.

### Fixed Category Colors

| Category | Suggested Color Role | Use |
| --- | --- | --- |
| Damage | Red | Poison and direct health pressure |
| Control | Blue | Qi Suppression and action/flow disruption |
| Vulnerability | Amber | Increased damage taken |
| Recovery | Purple | Wound and healing reduction |
| Backlash | Brown/Gold | Burning Blood and self-punish effects |
| Cleanse | Green | Medicine and cleanse events |

### Tasks

- Move status category color mapping into one shared presentation constant.
- Add a cleanse color role for summary events.
- Make severity independent from category color.
- Ensure chips, summaries, and future tooltips reuse the same mapping.
- Add accessible labels for status category and severity.
- Check mobile wrapping for long status names.

### Acceptance Criteria

- Every status category has a fixed color role.
- Cleanse events use a distinct fixed color.
- Severity can be shown by border/weight/dot without changing category meaning.
- Unknown statuses fail gracefully in presentation helpers.
- Status text does not overlap on mobile.

### Test Coverage

- Presentation helper maps every configured status category to a color role.
- Cleanse summary uses the cleanse role.
- Unknown status ids are ignored or shown with a safe fallback.
- Severity sort order remains stable.

---

## Epic 35: Scenario Simulator And Balance Gates

### Goal

Use the simulator to tune Demon Cult around intended counterplay instead of raw stat guesses.

### Scenarios

| Scenario | Expected Purpose |
| --- | --- |
| Baseline | Shows how hard Demon Cult is with no special counterplay |
| Resistance | Shows value of resistance upgrades/manuals |
| Medicine | Shows value of auto cleanse and resistance medicine |
| Combined | Intended clear path for boss gate |

### Tasks

- Add scenario input presets to the balance report.
- Run every configured region in every scenario.
- Include application chance, duration, tick damage, cleanses, and medicine consumed.
- Mark stages that are too fast, too slow, or impossible for intended scenario.
- Add explicit Demon Cult boss gate pass/fail criteria.
- Keep JSON output stable for future charting.

### Acceptance Criteria

- `npm run simulate` prints scenario summaries.
- `npm run simulate -- --json` includes scenario ids and totals.
- Baseline Demon Cult boss remains blocked.
- Combined counterplay can clear or nearly clear the intended boss threshold.
- Missing scenario data fails tests loudly.

### Test Coverage

- Report includes all configured regions for each scenario.
- Scenario totals include status duration and reduced tick damage.
- Medicine scenario records expected medicine consumption.
- Boss gate result changes when counterplay is applied.

---

## Epic 36: Support Identity Decision

### Goal

Decide whether Demon Cult counterplay should be carried by existing Lotus support systems or by introducing a new hero.

### Decision Options

| Option | Pros | Risks |
| --- | --- | --- |
| Lotus support remains main counterplay | Reuses existing theme and avoids roster bloat | May feel less exciting if support is mostly passive |
| Add a new anti-Demon Cult hero | Strong fantasy and clear unlock reward | Adds more balance and UI work |
| Add a temporary ally or manual instead | Lower scope than full hero | May feel less personal than a hero |

### Tasks

- Prototype Lotus support cleanse/resistance contribution in simulator.
- Prototype a simple new support hero profile in data only.
- Compare CP, clear time, medicine use, and status damage across options.
- Pick one direction for Stage 1.6 or later.
- Document the decision and rejected alternatives.

### Acceptance Criteria

- Decision is based on scenario report numbers, not guesswork.
- If no new hero is added, Lotus/support counterplay has a visible identity.
- If a new hero is chosen, the backlog captures unlock timing, weapon/style, role, and UI impact.
- No production roster change is required before the decision is made.

### Test Coverage

- Prototype scenario can be run without changing default static data.
- Decision document references simulator outputs.

---

## Recommended Implementation Order

1. Epic 31: Resistance Formula Integration.
2. Epic 32: Auto Medicine System.
3. Epic 35: Scenario Simulator And Balance Gates.
4. Epic 34: Status Visual Language.
5. Epic 33: Counterplay Loadout And Preview.
6. Epic 36: Support Identity Decision.

## Open Questions Before Implementation

- Should auto medicine be globally enabled by default, or unlocked when the first medicine is obtained?
- Should players be able to disable auto use per medicine type?
- Should pre-battle resistance medicine consume only for boss/elite stages, or for any status-heavy stage?
- What is the target Demon Cult boss clear time for combined counterplay?
- Should Stage 1.5 include a small UI settings panel, or keep policy automatic until the battle UI becomes richer?

## Final Stage 1.5 Checklist

- [x] Resistance formula integrated and tested.
- [ ] Auto medicine policy implemented and tested.
- [ ] Counterplay preview/loadout planned or implemented.
- [ ] Status visual language standardized.
- [ ] Scenario simulator reports baseline and counterplay routes.
- [ ] Demon Cult support/new hero decision documented.
- [ ] Stage 1.5 backlog reviewed.
- [ ] Stage 1.5 backlog moved to archive after completion.
