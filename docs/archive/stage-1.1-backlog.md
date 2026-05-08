# Stage 1.1 Backlog

Stage 1.1 is complete.

This document is now a cleaned completion record for the first post-MVP stage of **Path of Jianghu**. It replaces the working task list with the shipped scope, verification state, and follow-up ideas for later stages.

## Summary

Stage 1.1 deepened the MVP from a single-region idle battle loop into a broader martial arts prototype with team formations, richer growth, equipment, intentional offline farming, and stronger technical foundations.

Current prototype state:

- Bamboo Road remains the tutorial region.
- Mist Valley is implemented as the first post-tutorial region.
- The player team uses four fixed heroes with explicit roles, styles, levels, CP, equipment, and formation slots.
- Enemy stages can contain teams with front, middle, and back formation placement.
- Combat supports Outer HP, Inner Qi, Qi Breaks, targeting rules, role labels, and contribution summaries.
- The web app continuously fights the selected map route while open.
- Clicking an unlocked map route card selects where the team fights; if that stage is a cleared non-boss stage, it also becomes the offline farm target.
- Offline farming includes preview rewards, presets, recommendations, validation, idempotent reward application, and save persistence.
- Save export/import, reset, diagnostics, and offline time travel testing are available.
- The core engine boundary is documented and tested for future backend reuse.

## Completed Epics

| Epic | Status | Result |
| --- | --- | --- |
| Epic 7: Formation And Targeting | Completed | Front/middle/back formations, role identity, targeting rules, enemy formations, and battle contribution summaries |
| Epic 8: Martial Arts Growth | Completed | Outer Art, Inner Art, style mastery, style branch data, and skill refinement |
| Epic 9: Region Content Expansion | Completed | Mist Valley, multi-region progression, farming, mastery, and stage routing |
| Epic 10: Loot And Equipment | Completed | Equipment data, deterministic drops, inventory, compatible equip flow, rarity display, and CP contribution |
| Epic 11: Offline And Idle Depth | Completed | Offline preview, best farm recommendations, farm presets, mastery gain, and later assignment planning |
| Epic 12: Technical Foundation | Completed | Save migrations, core engine boundary, scenario tests, and multi-region balance reports |

## Shipped Systems

### Combat And Formation

- Formation slots: `front`, `middle`, `back`.
- Targeting rules: `first_living`, `weakest_hp`, `highest_cp`, `inner_broken`.
- Combat roles: `tank`, `breaker`, `striker`, `support`.
- Battle summaries identify top damage, Qi breaker, and carry contribution.
- Player formation changes persist in save data and affect future battles.
- Enemy formation data is validated and affects target selection.

### Martial Arts Growth

- Outer Art affects Outer HP, Outer Attack, and Outer Defense.
- Inner Art affects Inner Qi, Inner Attack, Inner Defense, and recovery.
- Style mastery supports Fist, Palm, Leg, Sword, Blade, Staff, and Hidden Weapons.
- Style branch data supports future unlocks by stage, hero level, or mastery.
- Skill refinement can tune cooldown, Outer ratio, Inner ratio, and future effects.

### Region Content

- Bamboo Road is the tutorial region.
- Mist Valley adds Inner Qi pressure enemies and formation-aware encounters.
- Region progression can move from Bamboo Road into Mist Valley.
- Stage selection lists configured regions in region order.
- Mastery summaries and offline farm options work across multiple regions.

Planned later region identities:

| Region | Theme | Counterplay |
| --- | --- | --- |
| Black Iron Fort | Armor, Blade guards, defensive formations | Build Outer Art, use Qi Breaks, and add bypass pressure |
| Lotus Monastery | Healing, sustain, support enemies | Target healers, add anti-recovery effects, improve burst windows |
| Demon Cult Outpost | Burst damage, debuffs, backline pressure | Protect carries, strengthen formation, use breaker/control roles |

### Loot And Equipment

- Equipment definitions include id, name, slot, rarity, allowed styles, and stat effects.
- Stage drops grant deterministic equipment rewards.
- Inventory persists in save data.
- Heroes can equip compatible gear by slot and style.
- Equipment affects derived stats and CP.
- Web UI shows equipment slots, inventory, effects, rarity colors, and equip controls.

### Offline And Idle

- Offline rewards are previewable before they are applied.
- Preview and application share the same validation, cap, efficiency, reward multiplier, clear-count, Combat XP, and mastery formulas.
- Farm targets must be cleared, non-boss, and marked farmable.
- Clicking a valid cleared non-boss map route updates the selected offline farm target.
- Farm presets include balanced, silver, cultivation, Combat XP, and mastery.
- Recommendations use shared preset policy rules instead of hidden comparator behavior.
- Offline reward application advances timestamps so reloads cannot duplicate the same interval.

### Save And Tools

- Save data supports migration from older supported versions.
- Migration defaults newer fields such as levels, maps, formation, style mastery, skill upgrades, equipment, farm target, and farm preset.
- `core/` stays browser-free and reusable by web, tools, and future backend services.
- Scenario tests cover boss gates, frontline pressure, Inner Qi pressure, and recovery behavior.
- The balance report runs configured regions in order and includes stage tables, farm recommendations, mastery milestones, and boss gates.
- Bamboo Road's trained boss gate is injected as a seeded report; later regions are not hard-coded.

## Verification

Stage 1.1 is considered complete when these commands pass:

```bash
npm test
npm run build
npm run simulate
git diff --check
```

Latest verification passed with:

- 23 test files passing.
- 147 tests passing.
- Production build passing.
- Stage 1.1 multi-region simulator report passing.
- Whitespace check passing.

## Deferred Work

Carry these into Stage 1.2 or later roadmaps:

- Build Black Iron Fort as the next region.
- Add more enemy mechanics for armor, healing, burst, debuffs, and support.
- Add richer skill effects beyond ratio and cooldown tuning.
- Expand equipment with affixes such as Outer Attack, Inner Damage, Break Power, recovery, or role bonuses.
- Turn style branches from data scaffolding into visible player choices.
- Add patrols and training grounds as hero assignment systems.
- Add optional account, cloud save, and backend service wrappers around the core engine.
- Add broader browser interaction coverage once the UI stabilizes further.

## Exit Criteria

Stage 1.1 is complete because:

- Player and enemy teams fight through formations.
- Front, middle, and back positions affect target selection.
- Four targeting rules are implemented and tested.
- Roles are visible in combat and UI.
- Web UI supports player formation editing.
- Enemy stages define formations.
- Battle summary shows contribution highlights.
- Mist Valley exists after Bamboo Road.
- Region progression, farming, mastery, saves, and balance reports work across multiple regions.
- Map route cards replace separate Fight and Set Farm buttons while preserving keyboard access.
- Equipment drops, inventory, equipping, rarity display, and CP stat effects are implemented.
- Offline preview, farm recommendations, presets, and save persistence are implemented.
- Save migrations, core boundary checks, scenario tests, and multi-region balance report summaries are implemented.
