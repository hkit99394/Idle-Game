# Stage 1.3 Backlog

This is the active roadmap backlog for **Path of Jianghu** after the completed Stage 1.2 release.

Stage 1.3 should make the game feel more like a living martial sect instead of only a combat ladder. The recommended focus is **Lotus Monastery**, a sustain and support region that introduces healing, recovery pressure, wounds, cleanse, a first limited recruit path, and medicine-flavored idle depth.

## Current Baseline

Stage 1.2 completed:

- Bamboo Road tutorial region.
- Mist Valley Inner Qi pressure region.
- Black Iron Fort defensive armor and guard region.
- Continuous map route fighting.
- Clickable route cards that select active fighting and valid offline farm targets.
- Player and enemy formations.
- Targeting rules: `first_living`, `weakest_hp`, `highest_cp`, `inner_broken`.
- Hero roles, CP, levels, equipment, deterministic affixes, set bonuses, skill refinement, style mastery, and style branches.
- Defensive combat mechanics: guard, protection, armor break, and defensive battle event reporting.
- Offline farming preview, presets, recommendations, assignments, deterministic reward application, and save idempotency.
- Save migrations, core engine boundary, scenario tests, smoke coverage, and multi-region balance reports.

## Stage 1.3 Goal

Deliver the next meaningful layer of sustain, roster choice, and idle planning:

- Add **Lotus Monastery** as the next region after Black Iron Fort.
- Make healing and recovery readable without allowing endless battles.
- Add counter-sustain through wound, anti-heal, burst windows, or target-priority play.
- Introduce a limited first recruit or guest hero path so formation choices matter more.
- Add herbs and medicine as deterministic support resources.
- Expand simulator and save coverage for recovery and status-heavy fights.

## Recommended Scope

| Epic | Status | Lane | Goal |
| --- | --- | --- | --- |
| Epic 19: Lotus Monastery Region | Not Started | Content Expansion | Add the next region with healing and support enemy identity |
| Epic 20: Recovery And Wound Mechanics | Not Started | Combat Depth | Add healing, regeneration, cleanse, wound, and anti-recovery behavior |
| Epic 21: Limited Recruitment And Support Roles | Not Started | Hero Growth | Add a first recruit path and make support formation choices meaningful |
| Epic 22: Herbs And Medicine Progression | Not Started | Loot And Idle | Add deterministic herb rewards, medicine items, and medicine assignments |
| Epic 23: Status Effect Foundation | Not Started | Technical Combat | Normalize buffs, debuffs, durations, and battle event summaries |
| Epic 24: Stage 1.3 Technical Foundation | Not Started | Technical Foundation | Add migrations, simulator coverage, smoke coverage, and balance reports for new systems |

## Recommended Build Order

1. Build Lotus Monastery data first with existing combat mechanics where possible.
2. Add recovery and wound mechanics only as needed to make Lotus fights distinct.
3. Add limited recruitment once the region has a clear support identity.
4. Add herbs and medicine after rewards and region pacing are stable.
5. Refactor status effects only where repeated recovery, wound, guard, and branch logic justify it.
6. Finish with migration, simulator, smoke, and backlog cleanup.

## Epic 19: Lotus Monastery Region

Status: Not Started

Goal:

- Add a sustain-focused region after Black Iron Fort that teaches the player to identify healers, control recovery, and build burst windows.

Theme:

- Lotus Monastery is a secluded sect that uses Palm, Staff, Sword, and Medicine arts.
- Enemies use healing, cleansing, Inner recovery, shielding, and support formations.
- Encounters should pressure target selection more than raw damage.
- Counterplay should encourage targeting healers, using Qi Breaks, adding wound effects, and improving burst timing.

Tasks:

### 19.1 Region And Stage Data

Status: Not Started

Add Lotus Monastery after Black Iron Fort.

Acceptance:

- `regions.json` includes Lotus Monastery after Black Iron Fort.
- Lotus Monastery unlocks after clearing the Black Iron Fort boss.
- Region has 6-8 stages, including one boss.
- Stage rewards are tuned above Black Iron Fort without trivializing existing upgrades.
- Stages include offline-farmable non-boss targets and a non-farmable boss.
- Region cards and balance reports show Lotus Monastery in configured region order.

### 19.2 Enemy Family

Status: Not Started

Add Lotus Monastery enemies.

Acceptance:

- Add at least four normal or elite enemies and one boss.
- Enemies have distinct formation slots and combat roles.
- Enemy skills express recovery identity: heal, regen, cleanse, shield, or support.
- Enemy levels and CP are consistent with post-Black-Iron progression.
- At least one enemy punishes ignoring the backline or middle support slot.

### 19.3 Region Balance Identity

Status: Not Started

Define Lotus Monastery pacing targets.

Recommended first targets:

```text
Normal sustain fights: 18s to 60s
Elite sustain fights: 35s to 80s
Boss gate: baseline should hold or barely clear, trained/counter-built team should clear
Healing share warning: healer output above 25% of player damage should be visible in report
```

Acceptance:

- Normal stages land in intended duration ranges.
- Elite fights are longer because of recovery, not only larger HP.
- Boss fight creates a clear training, targeting, branch, or medicine gate.
- Balance report includes Lotus stage table, farm recommendation, mastery milestone, boss gate, and recovery summary.

## Epic 20: Recovery And Wound Mechanics

Status: Not Started

Goal:

- Make healing and counter-healing a readable combat layer.

Recommended first version:

- Use deterministic skill effects rather than random healing.
- Keep healing capped by missing HP or missing Inner Qi.
- Add wound as a short anti-recovery debuff.
- Avoid permanent damage-over-time systems until Demon Cult or later.

Tasks:

### 20.1 Heal And Regeneration Effects

Status: Not Started

Add direct healing and short regeneration.

Acceptance:

- Skills can restore Outer HP, Inner Qi, or both.
- Healing cannot exceed max bars and records effective healing separately from overheal.
- Regeneration ticks are deterministic and duration-based.
- Battle logs summarize healing and overheal clearly.
- Tests cover healing a damaged ally, no-op healing at full HP, and Inner Qi recovery.

### 20.2 Wound And Anti-Recovery

Status: Not Started

Add counterplay against sustain.

Acceptance:

- Skills can apply wound or anti-recovery for a limited duration.
- Wound reduces healing and regeneration by a configured multiplier.
- Wound does not affect non-recovery damage formulas.
- At least one player skill, branch, or equipment path can apply wound.
- Scenario tests show wound improves clear time against a healer team.

### 20.3 Cleanse And Recovery Protection

Status: Not Started

Add support counterplay for debuffs.

Acceptance:

- Skills can remove one or more negative statuses from an ally.
- Cleanse has clear target rules and does not remove positive buffs.
- Wound and armor break remain distinct statuses.
- Battle events show who cleansed whom and which status was removed.

### 20.4 Recovery Battle Summary

Status: Not Started

Expose sustain in battle results.

Acceptance:

- Battle summary includes top healer and effective healing.
- Battle summary includes wound uptime or recovery prevented when present.
- UI can show healing and wound events without overwhelming the log.
- Balance report can aggregate healing, overheal, cleanse, and recovery prevented.

## Epic 21: Limited Recruitment And Support Roles

Status: Not Started

Goal:

- Add one controlled roster expansion so support and formation choices matter more, without building a full hero gacha or recruitment economy.

Recommended first version:

- Add one recruitable Lotus support hero unlocked by stage clear or boss clear.
- Keep existing four heroes as the default core team.
- Let the player choose a small active team from the available roster only if the UI can stay compact.

Tasks:

### 21.1 Recruitable Hero Data

Status: Not Started

Add a Lotus support hero.

Acceptance:

- Add one support hero with clear style identity, likely Palm, Staff, or Medicine-adjacent support.
- Hero has base stats, CP, level progression, role, style mastery linkage, formation preference, and skills.
- Hero is locked until the configured Lotus stage or boss requirement is met.
- Data validation catches missing hero references in unlocks, skills, equipment compatibility, and assignments.

### 21.2 Roster Save State

Status: Not Started

Persist unlocked heroes safely.

Acceptance:

- Save data tracks hero unlock state or derives it safely from progress.
- Older saves migrate with the original MVP heroes unlocked and new heroes locked.
- Invalid saves cannot unlock missing heroes.
- Tests cover migration and validation.

### 21.3 Active Team Selection

Status: Not Started

Allow basic team choice if roster size exceeds active slots.

Acceptance:

- Player can select which unlocked heroes are active in combat.
- Active team selection respects max team size and formation slot rules.
- Duplicate heroes and locked heroes are rejected.
- Offline assignments cannot use heroes currently assigned in another incompatible activity if that rule is introduced.
- UI remains usable on mobile.

### 21.4 Support Role Readability

Status: Not Started

Make support contribution visible.

Acceptance:

- Battle summary can identify top healer, top protector, or support carry.
- Hero cards show support role and relevant contribution stats.
- CP includes support stats such as healing, recovery, cleanse, or buff strength where applicable.

## Epic 22: Herbs And Medicine Progression

Status: Not Started

Goal:

- Add a simple medicine-flavored reward layer that supports sustain fights and future sect systems.

Recommended first version:

- Add `herbs` as a resource.
- Add deterministic medicine equipment or consumable-like passive items.
- Do not add inventory-consuming battle items yet unless the UI has a clean command surface.

Tasks:

### 22.1 Herb Resource

Status: Not Started

Add herbs as a deterministic resource.

Acceptance:

- Save data stores herbs in resources.
- Lotus stages and assignments can grant herbs.
- Existing saves migrate with zero herbs.
- Resource header formats herbs consistently with other resources.
- Tests cover reward application, save validation, and formatting.

### 22.2 Medicine Items

Status: Not Started

Add medicine-flavored deterministic equipment or passive items.

Acceptance:

- Add medicine items that support healing, Inner recovery, wound application, or cleanse.
- Items use existing equipment slots where possible.
- Item effects contribute to CP and combat through the shared stat path.
- Rarity colors and inventory display remain consistent.

### 22.3 Medicine Assignment

Status: Not Started

Add a medicine pavilion or herb-gathering assignment.

Acceptance:

- Assignment unlocks through Lotus progression.
- Assignment can grant herbs, cultivation, medicine items, or style mastery.
- Offline reward application remains idempotent.
- Tests prove repeat reloads do not duplicate medicine assignment rewards.

### 22.4 Farm And Assignment Recommendations

Status: Not Started

Help the player choose between combat farming and support assignments.

Acceptance:

- Offline preview includes herbs when relevant.
- Farm recommendations can explain herb value without hiding the existing silver, cultivation, and Combat XP priorities.
- Assignment panel shows expected herb or medicine reward rates.

## Epic 23: Status Effect Foundation

Status: Not Started

Goal:

- Keep combat effects maintainable as healing, wound, cleanse, guard, armor break, protection, and future debuffs grow.

Recommended first version:

- Refactor only where the current implementation becomes repetitive.
- Preserve deterministic battle output and existing test expectations.
- Do not introduce a generic engine that makes simple effects harder to read.

Tasks:

### 23.1 Status Data Shape

Status: Not Started

Normalize active statuses.

Acceptance:

- Statuses have id, source, target, duration, stack behavior, and effect payload where needed.
- Existing guard, armor break, protect, branch, and future wound effects can be represented consistently or bridged cleanly.
- Status duration updates are deterministic and tested.

### 23.2 Status Application Rules

Status: Not Started

Centralize apply, refresh, stack, expire, and cleanse behavior.

Acceptance:

- Applying an existing status follows explicit refresh or stack rules.
- Expired statuses cannot affect later damage or healing.
- Cleanse uses shared status metadata instead of special-case string checks where reasonable.
- Tests cover refresh, stacking, expiration, and cleanse.

### 23.3 Status Event Reporting

Status: Not Started

Make combat logs and reports consistent.

Acceptance:

- Battle events use consistent names for status applied, refreshed, expired, cleansed, prevented, and triggered.
- UI can group noisy status events.
- Balance report aggregates healing, wound, cleanse, guard, protection, and armor-break counts from shared event categories.

## Epic 24: Stage 1.3 Technical Foundation

Status: Not Started

Goal:

- Keep new Stage 1.3 systems safe to extend into Demon Cult, backend save sync, and future mobile polish.

Tasks:

### 24.1 Save Migration For Stage 1.3

Status: Not Started

Add migration support for new fields.

Acceptance:

- Saves from Stage 1.2 migrate into Stage 1.3.
- New roster, herb, medicine, and status-related fields have safe defaults.
- Invalid saves fail with clear validation messages.
- Migration tests include at least one Stage 1.2 save fixture.

### 24.2 Balance Report Expansion For Recovery

Status: Not Started

Extend reports for sustain fights.

Acceptance:

- Report keeps every configured region in configured region order.
- Report highlights healing, overheal, cleanse, wound uptime, recovery prevented, and boss gate behavior when present.
- Report still includes farm recommendation, mastery milestone, defensive events, and boss gate per region.
- Report fails loudly if configured region or stage data is missing.

### 24.3 Scenario Tests

Status: Not Started

Add focused tests for new mechanics.

Acceptance:

- Tests cover heal, regeneration, wound, cleanse, support targeting, recruit unlock, herbs, medicine rewards, and offline idempotency.
- Tests remain deterministic and fast.
- Existing Stage 1.2 scenarios remain stable.

### 24.4 Browser Smoke Coverage

Status: Not Started

Add broader web interaction coverage.

Acceptance:

- Smoke flow reaches Lotus Monastery after Black Iron Fort.
- Smoke flow covers route selection, support/recruit state if included, medicine rewards, and save/reload.
- Save/reload preserves new choices and resources.
- Offline rewards do not duplicate on repeated reloads.

## Out Of Scope For Stage 1.3

- Full backend accounts.
- Cloud save.
- WebSocket multiplayer or online boss co-op.
- Randomized loot generation.
- Full gacha-style hero recruitment.
- Demon Cult Outpost as a playable region.
- Complex consumable battle commands.
- Large sect building system.
- Realm breakthrough and prestige reset.

## Risks And Open Questions

- Healing can create long or stalled fights if recovery is not capped and visible.
- Wound should counter healing without becoming mandatory for every future region.
- A new recruit increases UI complexity; active team selection should stay simple.
- Herbs should add planning value without becoming a fourth number that feels disconnected from combat.
- Status refactoring should happen after mechanics prove the repetition is real.

## Exit Criteria

Stage 1.3 is complete when:

- Lotus Monastery is playable after Black Iron Fort.
- Recovery enemies use at least one readable healing or cleanse mechanic.
- The player has at least one counterplay path through targeting, wound, burst, branch choice, equipment, or medicine.
- Healing, overheal, cleanse, and recovery prevention are visible in battle summaries or reports.
- Limited recruitment or support-role growth is visible if Epic 21 remains in scope.
- Herbs and medicine rewards exist if Epic 22 remains in scope.
- Save migration supports Stage 1.2 saves.
- Balance report covers every configured region.
- Tests cover new combat, progression, save, offline, and UI state behavior.
- `npm test`, `npm run build`, `npm run simulate`, and `git diff --check` pass.
