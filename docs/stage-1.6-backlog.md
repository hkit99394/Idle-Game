# Stage 1.6 Backlog

## Current Status

Stage 1.6 is planned.

The recommended theme is **Lotus Support And Medicine Control**. Stage 1.5 proved that status resistance, automatic medicine, scenario balance gates, and Lotus/support identity can carry Demon Cult counterplay without adding a new production hero. Stage 1.6 should make that counterplay visible, configurable, and trustworthy in the web UI.

## Decisions Carried Forward

- Auto medicine unlocks when the player obtains or unlocks the first medicine, not globally at game start.
- Players should be able to disable auto use per medicine type.
- Pre-battle resistance medicine behavior should be configurable.
- A small UI settings panel should be added now rather than waiting for a richer battle UI.
- Demon Cult support direction should stay centered on Mountain Staff Guardian and Lotus purity training.
- No new anti-Demon Cult production hero is planned for this stage.

## Boss Balance Recommendation

Suggested target for the Demon Cult boss under intended combined counterplay:

```text
target clear time: 90-120 seconds
acceptable tuning band: 80-140 seconds
too fast: below 70 seconds
too slow: above 150 seconds
boss gate pass: player clears, or simulator reports near-clear with survival ratio >= 0.9 while the estimator remains approximate
```

Why this target:

- Current support-decision output estimates the boss clear time around 100 seconds, which is already in the target band.
- A 90-120 second boss gives status pressure enough time to matter without making an idle-map boss feel stalled.
- The current report still treats combined counterplay as near-clear, so Stage 1.6 should tune survival ratio upward before forcing a full-clear requirement.

## Stage Goals

- Unlock auto medicine only after medicine exists in progression.
- Add per-medicine auto-use controls.
- Add configurable pre-battle resistance rules.
- Make Lotus/support contribution visible in counterplay, battle summaries, and simulator reports.
- Tune Demon Cult boss combined counterplay toward the 90-120 second target band.
- Preserve save/import safety for all new settings.

## Non-Goals

- No PvP.
- No account backend or cloud save.
- No new full region.
- No production anti-Demon Cult hero.
- No random affix crafting.
- No full manual equipment system unless a Lotus purity manual is implemented as a simple deterministic upgrade.

## Exit Criteria

- Auto medicine settings unlock only after first medicine availability.
- The player can disable or re-enable each medicine type for automatic use.
- Pre-battle resistance policy can be changed between supported modes.
- The settings panel is compact, mobile-safe, and persists through save/reload/import.
- Lotus support contribution has a visible identity in UI and simulator output.
- Demon Cult boss intended combined counterplay lands in the target or acceptable tuning band.
- `npm test`, `npm run build`, `npm run simulate`, and `npm run support-decision` pass.

## Epic Summary

| Epic | Title | Status | Purpose |
| --- | --- | --- | --- |
| 37 | Auto Medicine Unlock Rules | Completed | Unlock auto medicine when medicine becomes available |
| 38 | Per-Medicine Auto Policy | Completed | Let players disable automatic use for each medicine type |
| 39 | Pre-Battle Resistance Policy | Completed | Make resistance medicine consumption mode configurable |
| 40 | Counterplay Settings Panel | Not Started | Add compact UI controls for medicine automation |
| 41 | Lotus Purity Support Growth | Not Started | Make support identity visible without adding a new hero |
| 42 | Demon Cult Boss Tuning Gates | Not Started | Tune intended counterplay toward the target boss window |

---

## Epic 37: Auto Medicine Unlock Rules

### Goal

Auto medicine should become available only after the player has a meaningful medicine system, instead of appearing as a global default before medicine exists.

### Tasks

- Add a core helper that determines whether auto medicine settings are unlocked from progress, inventory, and configured medicine unlocks.
- Treat the first unlocked or owned medicine as the unlock trigger.
- Keep default preferences safe for old saves, but hide/disable controls until unlocked.
- Add UI copy/state for locked automation.
- Ensure auto use does not run before the unlock condition is met.

### Acceptance Criteria

- A new save with no unlocked medicine does not auto-consume medicine.
- Auto medicine unlocks when the first medicine is unlocked or obtained.
- Existing saves migrate with safe default preferences but respect the unlock gate.
- The UI does not show confusing per-medicine controls before the feature is unlocked.

### Test Coverage

- Core unlock helper returns false for no unlocked/owned medicine.
- Core unlock helper returns true for first unlocked medicine.
- Auto medicine helpers are skipped when automation is locked.
- Save migration keeps preferences valid without bypassing the unlock gate.

### Progress Notes

- Added `isAutoMedicineUnlocked` as the core unlock gate for automatic medicine.
- The gate unlocks from either owned medicine inventory or configured medicine stage unlocks.
- Auto cleanse and pre-battle resistance helpers now skip with `automation_locked` before selecting or consuming medicine.
- Save schema now stores and migrates safe default auto medicine preferences without bypassing the unlock gate.
- Added focused tests for locked, stage-unlocked, and owned-medicine unlock states plus locked auto-use safety.
- Restored the medicine/status helper exports needed by the existing auto medicine tests.

---

## Epic 38: Per-Medicine Auto Policy

### Goal

Players should be able to disable automatic use per medicine type while keeping the rest of auto medicine active.

### Tasks

- Extend auto medicine preferences if needed so each medicine id can be enabled/disabled clearly.
- Keep disabled medicine ids validated against configured medicines.
- Ensure disabled medicine is ignored by battle cleanse, post-battle cleanse, and pre-battle resistance selectors.
- Add stable view-model labels for "auto on" and "auto off".
- Preserve existing disabled medicine behavior through save/load/import.

### Acceptance Criteria

- Disabling Clear Heart Pill prevents automatic Clear Heart Pill use while other medicine can still trigger.
- Re-enabling a medicine makes it eligible again.
- Invalid disabled medicine ids are rejected during import.
- Disabled medicine remains manually usable later if manual use is added.

### Test Coverage

- Auto cleanse skips a disabled matching medicine and uses the next eligible medicine when available.
- Auto pre-battle resistance skips disabled resistance medicine.
- Save validation rejects unknown disabled medicine ids.
- UI view models expose per-medicine auto state.

### Progress Notes

- Added shared per-medicine auto policy helpers for toggling, checking eligibility, and exposing stable "Auto On" / "Auto Off" labels.
- Battle cleanse, post-battle cleanse, and pre-battle resistance now have explicit tests proving disabled medicine ids are skipped and can be re-enabled.
- Save validation and web import now reject disabled medicine ids that are not present in configured medicine data.
- Counterplay medicine view models expose disabled state, auto-use enabled state, and stable auto-use labels for the upcoming settings panel.

---

## Epic 39: Pre-Battle Resistance Policy

### Goal

Pre-battle resistance medicine should be configurable so players can decide how aggressively to spend limited resources.

### Policy Modes

| Mode | Behavior |
| --- | --- |
| Off | Never auto-use resistance medicine before battle |
| Boss And Elite | Use before boss or elite stages with status pressure |
| Status Heavy | Use before any stage with meaningful status pressure |
| Always When Recommended | Use whenever the selector recommends resistance medicine |

Recommended default after unlock: **Boss And Elite**.

### Tasks

- Add a `preBattleResistanceMode` preference.
- Update the resistance selection helper to respect stage type and policy mode.
- Define status-heavy threshold using enemy status skill count, status category count, or expected applications from the simulator.
- Add clear skip reasons for "policy disabled" and "stage below policy threshold".
- Surface the selected mode through the counterplay view model for the settings panel.

### Acceptance Criteria

- Off mode never consumes pre-battle resistance medicine.
- Boss And Elite mode uses medicine only for boss/elite status-pressure stages.
- Status Heavy mode includes normal stages when status pressure crosses the threshold.
- Always When Recommended preserves current aggressive behavior.
- Policy changes persist through save/reload/import.

### Test Coverage

- Each policy mode has a deterministic selector test.
- Normal status-light stages do not consume under Boss And Elite or Status Heavy.
- Demon Cult boss consumes resistance medicine under Boss And Elite.
- Imported invalid policy mode is rejected or migrated safely.

### Progress Notes

- Added `preBattleResistanceMode` with `off`, `boss_and_elite`, `status_heavy`, and `always_when_recommended` modes.
- Default mode is now `boss_and_elite`; the previous aggressive behavior remains available through `always_when_recommended`.
- Defined status-heavy pressure as at least two status-applying skill effects or at least two status categories.
- Added policy skip reasons for disabled policy and stages below the selected policy threshold.
- Save/load/import now persists the policy mode and rejects unknown imported modes.
- Counterplay preview exposes the selected mode and label for the upcoming settings panel.

---

## Epic 40: Counterplay Settings Panel

### Goal

Add a small web UI settings panel so medicine automation feels intentional without turning the battle surface into a management screen.

### UI Direction

- Place the panel inside or near the existing Counterplay surface.
- Use compact toggles for global automation and per-medicine automation.
- Use a segmented control or select-like control for pre-battle resistance mode.
- Show locked state until first medicine unlock.
- Keep mobile layout to one column with no overlapping text.

### Tasks

- Add settings view models for unlock state, global enabled state, per-medicine toggles, and resistance mode.
- Add UI controls that update local game state/preferences.
- Persist preference changes.
- Add concise helper text for locked automation and resistance mode.
- Verify layout at mobile and desktop widths.

### Acceptance Criteria

- Player can toggle global auto medicine.
- Player can toggle each medicine type.
- Player can change pre-battle resistance mode.
- Locked settings show why automation is unavailable.
- Settings persist after reload.
- Text does not overflow on mobile.

### Test Coverage

- View model exposes locked and unlocked states.
- View model marks disabled medicine rows correctly.
- Web smoke or component-level test covers toggling settings and reload persistence.
- Mobile-safe text/layout is checked through existing frontend verification flow.

---

## Epic 41: Lotus Purity Support Growth

### Goal

Make Lotus/support counterplay feel like a martial arts identity, not just invisible resistance math.

### Design Direction

Stage 1.6 should strengthen **Mountain Staff Guardian** and Lotus purity training rather than adding a new production hero.

Possible deterministic growth hooks:

- Lotus Purity Training: support upgrade that grants team status resistance.
- Purifying Staff Method: support/manual node that improves cleanse reliability.
- Guardian's Vow: support contribution shown in battle summaries.
- Lotus counterplay preview: explains how much status pressure is mitigated.

### Tasks

- Add one deterministic Lotus/support upgrade or manual-style data item.
- Connect the support bonus to status resistance or cleanse reliability through the same capped resistance formula.
- Include support contribution in simulator and support-decision output.
- Add a battle summary or counterplay row showing support mitigation.
- Keep CP contribution meaningful but not dominant.

### Acceptance Criteria

- Lotus/support bonus affects Demon Cult status pressure through core formulas.
- Player can see why the support path helps.
- Support contribution appears in at least one summary or preview surface.
- CP increases when Lotus support growth is active.
- No new hero is added to production roster.

### Test Coverage

- Support upgrade/manual applies resistance through the shared cap.
- Simulator status applications or duration decrease with support active.
- CP contribution changes when support growth is active.
- UI view model shows support contribution text.

---

## Epic 42: Demon Cult Boss Tuning Gates

### Goal

Tune the Demon Cult boss so intended combined counterplay feels like a hard but fair gate.

### Tasks

- Update simulator criteria to track the 90-120 second target and 80-140 second acceptable band.
- Add pass/fail reasons for clear time, survival ratio, medicine use, and status damage.
- Tune Demon Cult boss stats, status accuracy, or support counterplay values based on the report.
- Keep baseline boss blocked.
- Keep medicine-only and resistance-only routes below combined route.
- Update support-decision output if support growth changes the expected path.

### Acceptance Criteria

- Baseline Demon Cult boss remains blocked.
- Combined counterplay reaches survival ratio >= 0.9 or full clear.
- Combined boss estimated clear time is inside 80-140 seconds, with 90-120 seconds preferred.
- Status damage is lower with Lotus support than without it.
- Medicine consumed stays predictable and not excessive.

### Test Coverage

- Balance report flags boss clear time outside target bands.
- Combined route passes the intended boss gate.
- Baseline route fails the boss gate.
- Support-decision report remains aligned with updated balance criteria.

---

## Recommended Implementation Order

1. Epic 37: Auto Medicine Unlock Rules.
2. Epic 38: Per-Medicine Auto Policy.
3. Epic 39: Pre-Battle Resistance Policy.
4. Epic 40: Counterplay Settings Panel.
5. Epic 41: Lotus Purity Support Growth.
6. Epic 42: Demon Cult Boss Tuning Gates.

## Open Questions Before Implementation

- Should first medicine unlock mean "medicine item appears in configured unlocks" or "inventory count becomes greater than zero"? Recommended: either condition unlocks UI, but auto-use requires inventory.
- Should disabled medicine rows remain visible when inventory is zero? Recommended: yes, if unlocked.
- Should support growth be an upgrade, a manual, or a hero refinement label? Recommended for Stage 1.6: deterministic upgrade/manual data, not a new hero.
- Should manual use of medicine be added now? Recommended: defer unless needed for testing/debugging.

## Final Stage 1.6 Checklist

- [x] Auto medicine unlocks after first medicine availability.
- [x] Per-medicine auto toggles implemented and persisted.
- [x] Pre-battle resistance policy modes implemented.
- [ ] Counterplay settings panel added and mobile-safe.
- [ ] Lotus/support contribution visible in UI and simulator.
- [ ] Demon Cult boss tuning criteria updated.
- [ ] `npm test`, `npm run build`, `npm run simulate`, and `npm run support-decision` pass.
- [ ] Stage 1.6 backlog reviewed.
- [ ] Stage 1.6 backlog moved to archive after completion.
