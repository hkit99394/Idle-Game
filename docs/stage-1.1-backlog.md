# Stage 1.1 Backlog

This backlog starts the first post-MVP stage for **Path of Jianghu**.

Stage 1.1 should deepen team-vs-team combat now that the MVP has enemy teams, CP, levels, continuous stage fighting, save utilities, and offline farming.

## Current Status

Stage 1.1 starting point:

- MVP web loop is complete.
- Bamboo Road is the tutorial region.
- Player team uses four fixed heroes.
- Enemy stages can contain multiple enemies.
- Combatants have CP and levels.
- Offline farming and save utilities are available.
- Epic 7 formation and targeting is complete; the next planned epic is martial arts growth.

## Recommended Roadmap

### Combat Depth

Goal: make team-vs-team combat meaningful beyond raw stat comparison.

Backlog:

- Formation slots: front, middle, back.
- Targeting rules: first living, weakest HP, highest CP, inner-broken target.
- Role identity: tank, breaker, striker, support.
- Better battle summary: top damage dealer, Qi breaker, and carry hero.

### Hero And Martial Arts Growth

Goal: make growth feel strongly connected to Chinese martial arts themes.

Backlog:

- Separate Outer Art and Inner Art training.
- Weapon and style mastery: Fist, Palm, Leg, Sword, Blade, Staff, Hidden Weapons.
- Fixed hero styles early, unlock style branches later.
- Skill upgrades: reduce cooldown, increase outer/inner ratio, add effects.

### Formation System

Goal: make player and enemy teams readable, positional, and tactical.

Backlog:

- Player chooses hero positions.
- Frontline takes attacks first.
- Some weapons prefer certain slots.
- Staff and Blade heroes protect.
- Palm and Hidden Weapon heroes pressure Inner Qi.
- Sword and Fist heroes burst Outer HP.
- Enemy teams also use formations.

### Content Expansion

Goal: add new maps after formation behavior works.

Backlog:

- Bamboo Road remains tutorial.
- Mist Valley: Inner Qi enemies.
- Black Iron Fort: armor and defense enemies.
- Lotus Monastery: healing and recovery enemies.
- Demon Cult Outpost: burst and debuff enemies.

### Loot And Equipment

Goal: add loot after formations, not before.

Backlog:

- Weapon equipment by weapon type.
- Armor, manuals, and medicine.
- Simple rarity colors.
- Equipment CP contribution.
- Later affixes: Outer Attack, Inner Damage, Break Power.

### Offline And Idle Depth

Goal: make offline farming feel intentional.

Backlog:

- Estimated offline rewards preview.
- Best farm recommendation.
- Farm presets.
- Offline mastery gain.
- Later assignments: patrols or training grounds.

### Technical Foundation

Goal: keep the codebase ready for backend, mobile, and more regions.

Backlog:

- Save migrations and version upgrades.
- Core engine package boundary.
- More scenario simulator tests.
- Balance report for every region.
- Optional backend later for accounts and cloud save.

## Completed Epic

### Epic 7: Formation And Targeting

Why this epic comes next:

- Enemy teams now exist.
- CP and levels give combatants clearer identity.
- Formation is the natural next layer for team-vs-team combat.
- Targeting rules make roles and martial styles matter.

Goal:

- Add positional team combat with explicit targeting behavior while keeping the MVP battle loop stable.

## Stage 1.1 Epic Roadmap

| Epic | Status | Roadmap lane | Goal |
| --- | --- | --- | --- |
| Epic 7: Formation And Targeting | Completed | Combat Depth / Formation System | Make team position and target choice matter |
| Epic 8: Martial Arts Growth | Not started | Hero And Martial Arts Growth | Split growth into Outer Art, Inner Art, style mastery, and skill upgrades |
| Epic 9: Region Content Expansion | Not started | Content Expansion | Add the next map identity after Bamboo Road |
| Epic 10: Loot And Equipment | Not started | Loot And Equipment | Add simple equipment progression after formation behavior is stable |
| Epic 11: Offline And Idle Depth | Not started | Offline And Idle Depth | Make farming choices previewable and intentional |
| Epic 12: Technical Foundation | Not started | Technical Foundation | Prepare saves, core engine boundaries, and balance tools for larger content |

Stage 1.1 completed Epic 7 first. Epics 8-12 are sequenced follow-up epics so the roadmap has owners, but they can be split into later stage versions as needed.

## Epic 7 Tasks

### 7.1 Formation Data Model

Status: Completed

Task:

- Add a core formation model with front, middle, and back slots.

Acceptance:

- Formation data can represent player and enemy positions.
- A combatant has a stable formation slot during battle setup.
- Empty slots are allowed.
- Existing MVP teams can be converted into a default formation.
- Data validation catches duplicate combatant placement and invalid slots.

Notes:

- Core now uses `front`, `middle`, and `back` formation slots.
- Stage enemy teams can place duplicate enemy ids by combatant index.
- Validation covers invalid slots, duplicate placement, and invalid indexes.

### 7.2 Combatant Position In Battle

Status: Completed

Task:

- Carry formation position into simulator combatant state.

Acceptance:

- `CombatantInstanceDefinition` supports a formation slot.
- `CombatantState` exposes the resolved slot.
- Battle logs and summaries can reference position when useful.
- Existing battles without explicit formation still run through default positions.

Notes:

- Simulator combatant state now carries resolved formation slot.
- Web combatant cards display the resolved slot.
- Battle log rows now include formation slot labels when naming combatants.
- Battle summaries include contribution callouts with position and role labels.

### 7.3 Targeting Rules

Status: Completed

Task:

- Add targeting rules beyond `first_living`.

Acceptance:

- Supported targeting rules include `first_living`, `weakest_hp`, `highest_cp`, and `inner_broken`.
- `first_living` respects formation order: front before middle before back.
- `weakest_hp` targets the living enemy with the lowest HP percent.
- `highest_cp` targets the living enemy with the highest combat power.
- `inner_broken` targets a Qi Broken enemy when one exists, then falls back safely.
- Targeting behavior is covered by unit tests.

Notes:

- Core targeting supports `first_living`, `weakest_hp`, `highest_cp`, and `inner_broken`.
- `first_living` now follows front, middle, then back priority instead of raw array order.
- Focused targeting tests cover every supported rule.

### 7.4 Role Identity

Status: Completed

Task:

- Add lightweight combat role identity for heroes and enemies.

Acceptance:

- Supported roles include tank, breaker, striker, and support.
- Role data is visible in core definitions.
- MVP heroes keep their current identity while gaining explicit roles.
- Roles can influence default targeting or UI labels without changing balance by accident.

Notes:

- Heroes and enemies now carry explicit `combatRole` data.
- Supported roles are validated as tank, breaker, striker, and support.
- The web combatant cards show combat role tags while keeping the existing flavor role text.

### 7.5 Player Formation UI

Status: Completed

Task:

- Show the player formation in the web UI and allow choosing positions.

Acceptance:

- Player can view front, middle, and back slots.
- Player can move MVP heroes between valid slots.
- Formation changes persist in save data.
- The selected formation affects battle setup.
- The UI remains usable on mobile.

Notes:

- Save progress now stores optional hero formation slots with default formation fallbacks.
- The web UI includes a player formation panel with front, middle, and back controls.
- Formation changes persist immediately and affect the next battle setup.

### 7.6 Enemy Formations

Status: Completed

Task:

- Add enemy formation data to stage encounters.

Acceptance:

- Stage data can place enemy combatants into formation slots.
- Bamboo Road enemies receive simple default formations.
- Enemy formation affects target selection.
- Missing or invalid enemy placement fails validation.

Notes:

- Bamboo Road stage data now declares enemy formation slots.
- Targeting is now formation-aware through task 7.3.

### 7.7 Battle Summary Improvements

Status: Completed

Task:

- Add battle contribution summaries.

Acceptance:

- Summary identifies the top damage dealer.
- Summary identifies who triggered Qi Breaks.
- Summary identifies a carry combatant using damage, survival, or break contribution.
- Summary works for both player and enemy teams.
- The web UI shows the summary without cluttering the battle log.

Notes:

- Battle results now include per-combatant contribution records.
- Web summaries call out top damage, Qi breaker, and carry contribution.

### 7.8 Simulator And Balance Report Updates

Status: Completed

Task:

- Update simulation tools for formation and targeting scenarios.

Acceptance:

- Balance report includes formation-aware battle results.
- At least one scenario proves frontline targeting.
- At least one scenario proves non-front targeting rules.
- Bamboo Road timing remains within intended MVP ranges or records explicit retune tasks.

Notes:

- Balance report stage rows include enemy formation slots.
- Balance report includes frontline and non-front targeting scenarios.
- Bamboo Road timing remains inside the existing target ranges.

### 7.9 Formation Test Coverage

Status: Completed

Task:

- Add focused unit and integration coverage for formation behavior.

Acceptance:

- Formation validation tests cover valid, missing, duplicate, and invalid-slot cases.
- Targeting tests cover every supported targeting rule.
- Battle resolution tests prove formation survives from stage/team setup into simulation.
- Web state tests cover saving and applying player formation.

Notes:

- Coverage now spans data validation, target selection, team builders, save schema, simulator contributions, web state, and balance report scenarios.

## Epic 8: Martial Arts Growth

Goal:

- Make hero progression feel like martial arts training, not only generic stat upgrades.

### 8.1 Outer Art And Inner Art Training

Status: Not started

Task:

- Split current generic training into Outer Art and Inner Art growth concepts.

Acceptance:

- Outer Art clearly affects Outer HP, Outer Attack, and Outer Defense.
- Inner Art clearly affects Inner Qi, Inner Attack, Inner Defense, and recovery.
- Existing hero and sect upgrades map cleanly into the new terminology.
- UI labels avoid mixing Outer Art and Inner Art with generic upgrade language.

### 8.2 Weapon And Style Mastery

Status: Not started

Task:

- Add mastery tracks for Fist, Palm, Leg, Sword, Blade, Staff, and Hidden Weapons.

Acceptance:

- Each style has a stable id and display name.
- MVP heroes keep fixed starting styles.
- Style mastery can grant small typed bonuses without affecting unrelated styles.
- Tests prove style mastery only applies to matching heroes or skills.

### 8.3 Style Branch Unlocks

Status: Not started

Task:

- Plan future style branches without requiring full branching in Stage 1.1.

Acceptance:

- Data model can represent locked and unlocked style branches.
- MVP keeps branches locked or hidden by default.
- Branch unlock requirements can reference level, mastery, or stage progress.
- No existing hero loses its fixed early-game identity.

### 8.4 Skill Upgrades

Status: Not started

Task:

- Add a skill upgrade model for cooldown, damage ratio, and effect tuning.

Acceptance:

- Skill upgrades can reduce cooldown.
- Skill upgrades can change outer and inner damage ratios.
- Skill upgrades can later add effects without rewriting skill data.
- Battle simulator tests prove upgraded skills change combat output.

## Epic 9: Region Content Expansion

Goal:

- Add post-tutorial map identities that reuse the formation and targeting systems.

### 9.1 Region Plan And Enemy Families

Status: Not started

Task:

- Define the next region set and enemy family themes.

Acceptance:

- Mist Valley focuses on Inner Qi pressure.
- Black Iron Fort focuses on armor and defense.
- Lotus Monastery focuses on healing and recovery.
- Demon Cult Outpost focuses on burst and debuffs.
- Each region has a short balance identity and expected counterplay.

### 9.2 Mist Valley Prototype

Status: Not started

Task:

- Add Mist Valley as the first post-Bamboo Road region.

Acceptance:

- Mist Valley has stage data, enemies, rewards, and balance targets.
- Mist Valley enemies use formation and targeting rules.
- Mist Valley unlocks after Bamboo Road boss clear.
- Balance report includes Mist Valley.

### 9.3 Multi-Region Progression

Status: Not started

Task:

- Make progression, farming, mastery, and battle reports work across multiple regions.

Acceptance:

- Current stage can advance from one region into the next.
- Offline farming can select valid stages across unlocked regions.
- Mastery summaries are scoped to the selected region.
- Save/load preserves multi-region progress.

## Epic 10: Loot And Equipment

Goal:

- Add simple, readable loot progression after formations make combat roles matter.

### 10.1 Equipment Data Model

Status: Not started

Task:

- Add equipment definitions for weapons, armor, manuals, and medicine.

Acceptance:

- Equipment has id, name, slot, rarity, allowed styles, and stat effects.
- Weapon equipment can be restricted by weapon or style type.
- Equipment can contribute to CP.
- Data validation catches invalid slots, rarities, and stat keys.

### 10.2 Equipment Rewards And Inventory

Status: Not started

Task:

- Add basic equipment drops and player inventory.

Acceptance:

- Stages can define equipment reward pools.
- Player inventory persists in save data.
- Duplicate equipment behavior is defined.
- Rewards are deterministic enough for tests.

### 10.3 Equip Flow

Status: Not started

Task:

- Allow heroes to equip compatible gear.

Acceptance:

- Equipment affects derived hero stats.
- Incompatible gear cannot be equipped.
- Web UI shows equipped items and simple rarity colors.
- Tests cover CP changes from equipment.

## Epic 11: Offline And Idle Depth

Goal:

- Make offline farming a meaningful strategic choice instead of a hidden background reward.

### 11.1 Offline Reward Preview

Status: Not started

Task:

- Show estimated offline rewards before selecting or changing farm targets.

Acceptance:

- Preview shows silver, cultivation, Combat XP, and mastery gain.
- Preview uses the same formula as reward application.
- Preview handles locked, boss, and invalid stages safely.
- UI makes the selected farm target obvious.

### 11.2 Best Farm Recommendation

Status: Not started

Task:

- Explain why a farm target is recommended.

Acceptance:

- Recommendation describes reward priority.
- Recommendation uses the shared farm ranking policy.
- UI distinguishes best value from latest cleared stage.
- Tests cover recommendations across mixed reward stages.

### 11.3 Farm Presets

Status: Not started

Task:

- Add preset farming intents.

Acceptance:

- Supported presets include balanced, silver, cultivation, Combat XP, and mastery.
- Each preset maps to a deterministic recommendation policy.
- Preset choice persists in save data.
- Offline rewards still validate the selected target before applying.

### 11.4 Patrols And Training Grounds Planning

Status: Not started

Task:

- Draft the later assignment system for heroes.

Acceptance:

- Patrols and training grounds are documented as future systems.
- The plan identifies which data and save schema changes are required.
- Stage 1.1 does not need to implement assignments.

## Epic 12: Technical Foundation

Goal:

- Keep the project easy to grow as more regions, saves, and optional backend work arrive.

### 12.1 Save Migrations

Status: Not started

Task:

- Add versioned save migration support.

Acceptance:

- Save parser can migrate older supported versions.
- Migration tests cover MVP save data into the current schema.
- Invalid saves still fail safely.
- New fields introduced by formations and equipment have defaults.

### 12.2 Core Engine Boundary

Status: Not started

Task:

- Clarify the reusable backend-safe core engine boundary.

Acceptance:

- Core modules avoid browser-only dependencies.
- Web state imports core through stable package-like entry points.
- Simulator tools use the same core APIs as the web app.
- Future backend use does not require rewriting battle, rewards, or progression rules.

### 12.3 Scenario Simulator Tests

Status: Not started

Task:

- Add focused scenario tests for balance-critical combat cases.

Acceptance:

- Scenario tests cover boss gate, frontline pressure, Inner Qi enemies, and healing enemies.
- Scenarios are deterministic.
- Failures explain which balance expectation changed.
- Tests are fast enough for normal `npm test`.

### 12.4 Multi-Region Balance Reports

Status: Not started

Task:

- Extend the balance report beyond Bamboo Road.

Acceptance:

- Report can run every region in region order.
- Missing region or stage data fails loudly.
- Report includes boss gates, farm recommendations, and mastery milestones per region.
- CLI output remains readable.

## Stage 1.1 Exit Criteria

Stage 1.1 core scope is complete when:

- Player and enemy teams can fight through formations.
- Front, middle, and back positions affect target selection.
- At least four targeting rules are implemented and tested.
- Roles are visible enough to guide future martial arts growth.
- Web UI supports viewing and editing player formation.
- Enemy stages can define formations.
- Battle summary shows contribution highlights.
- Tests, typecheck, build, and simulate pass.

Stage 1.1 roadmap planning is complete when:

- Epics 8-12 have enough tasks and acceptance criteria to begin after Epic 7.
- Any epic that is too large for Stage 1.1 is explicitly carried into a later stage version.
