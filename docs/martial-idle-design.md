# Martial Idle RPG Design, Roadmap, and Formula Draft

## Current Implementation Note

This document began as the full design draft. The current implementation has advanced beyond the original MVP plan: enemy teams, formations, CP, levels, equipment, assignments, countermeasures, Redline status pressure, and Lotus support counterplay are now implemented.

The product direction is now **Path of Neon**, a cyber-sect retheme of this original Path of Jianghu design. For the active retheme contract, read [Path Of Neon Theme Bible](path-of-neon-theme-bible.md), [Path Of Neon Terminology Map](path-of-neon-terminology-map.md), and [Path Of Neon Retheme Migration Plan](retheme-migration-plan.md).

For quick onboarding, read [Current Implemented Systems](current-implemented-systems.md) first. The sections below remain useful for design intent, formulas, and roadmap context, but older MVP examples may describe where the project started rather than the current game surface.

## 1. Working Summary

Working title: **Path of Jianghu**

This is an idle martial arts RPG where the player grows a small sect of disciples. Disciples automatically travel through the jianghu, defeat enemies, collect silver and cultivation, learn martial manuals, improve weapons, and challenge rival masters.

The first version is a responsive web game. Mobile support should come from the same web build through a mobile browser or PWA shell. The combat engine, progression formulas, offline reward rules, and balance logic should live in a reusable core library so the same rules can power the game UI, tests, simulators, and possible future backend validation.

The main identity of the game is the split between **Outer Art** and **Inner Art**:

- **Outer Art** targets the body, weapons, stamina, armor, and wounds.
- **Inner Art** targets qi, meridians, breath, mental focus, and internal stability.

Every combatant has two bars:

- **Outer HP**: the main health bar. When it reaches zero, the combatant is defeated.
- **Inner Qi**: the internal stability bar. When it reaches zero, the combatant enters **Qi Break**, becoming vulnerable and suffering backlash.

This creates two valid paths to victory:

- Break the enemy body directly with fists, blades, spears, and heavy weapon attacks.
- Break the enemy qi first with palm, needle, qin, talisman, and internal arts, then punish the collapse.

## 2. Design Pillars

### 2.1 Idle First

The game should keep moving even when the player is not constantly clicking. The player makes strategic decisions, then watches the sect progress.

Core idle promises:

- Auto-battle is always active.
- Offline rewards matter.
- Upgrades are simple to understand.
- New systems unlock over time, not all at once.

### 2.2 Martial Arts Identity

Combat should feel different from a standard fantasy idle game. The Outer and Inner split should appear in stats, heroes, enemies, skills, gear, and progression.

Examples:

- A Palm master may deal low Outer damage but quickly destroys Inner Qi.
- A Saber user may ignore Inner Qi and cut down Outer HP directly.
- A Sword user may be balanced and gain bonuses against Qi Broken enemies.
- A Staff user may protect allies and stabilize their Inner Qi.

### 2.3 Easy To Read, Hard To Optimize

The surface rules should be understandable:

- Red bar drops to zero: defeated.
- Blue bar drops to zero: Qi Break.
- Qi Break makes the target easier to kill.

The deeper strategy comes from team building:

- Which heroes attack Outer HP?
- Which heroes attack Inner Qi?
- Who benefits most when the enemy is Qi Broken?
- Who protects the team from enemy Inner attacks?

## 3. Core Game Loop

1. Disciples automatically fight enemies in the current region.
2. Enemies drop silver, cultivation, herbs, equipment, and martial manual fragments.
3. The player trains heroes, upgrades weapons, opens meridians, and improves sect buildings.
4. Stronger heroes push into harder stages.
5. Boss masters block region progress.
6. Defeating bosses unlocks new regions, systems, heroes, and manuals.
7. Farming cleared maps grants Combat Experience and map mastery bonuses.
8. Long-term growth comes from realm breakthroughs, sect reputation, mastery, and optional future ascension mechanics.

## 4. Combat Concepts

### 4.1 Bars

**Outer HP**

Represents body condition, stamina, armor, wounds, and physical endurance.

Outer HP reaching zero means defeat.

**Inner Qi**

Represents meridian stability, breath control, internal force, focus, and ability to safely use martial arts.

Inner Qi reaching zero causes Qi Break.

### 4.2 Qi Break

Qi Break is a temporary state triggered when Inner Qi reaches zero.

Recommended MVP effect:

- Deals instant Outer HP damage.
- Increases Outer HP damage taken.
- Causes backlash damage whenever the broken target attacks.
- Blocks or weakens advanced Inner Art skills.
- Ends after a short duration, then restores a portion of Inner Qi.

Initial values:

```text
Qi Break duration: 6 seconds
Instant Outer HP damage: 10% of target max Outer HP
Outer damage taken while broken: +25%
Backlash when attacking while broken: 3% of target max Outer HP
Inner Qi restored after break: 35% of max Inner Qi
```

### 4.3 Why Qi Break Works

Qi Break should not replace normal HP damage. It should create a timing window where Outer attackers become stronger.

This gives the game a natural team pattern:

1. Inner Art hero pressures Inner Qi.
2. Enemy enters Qi Break.
3. Outer Art hero deals heavy finishing damage.

### 4.4 Battle Format And Formations

The MVP can start with four player heroes fighting one enemy at a time, but the engine should represent both sides as teams from the beginning.

MVP format:

```text
Player team: 4 heroes
Enemy team: 1 enemy
```

Long-term format:

```text
Player team vs enemy team
Formation slots
Frontline and backline targeting
Style bonuses based on position
```

This keeps the first build simple while leaving room for later formation strategy.

### 4.5 Current Combat Engine Pipeline

The implemented Stage 1.8 combat engine keeps `simulateBattle` as the public battle entry point, but the internals now move through named modules:

1. Progression builds player and enemy teams, then calls `simulateBattle`.
2. `scheduler.ts` picks deterministic action times and reschedules living combatants.
3. `targeting.ts` selects the offensive target from the skill target rule.
4. `damagePackage.ts` creates an attack package, applies guard/protection mitigation through the defensive pipeline, commits HP/Inner Qi changes, then records damage and contribution metrics.
5. Qi Break burst and backlash are committed through damage packages so they share attribution and safety checks with normal attacks.
6. `effectPipeline.ts` dispatches post-attack timed/status effects and recovery effects such as heal, regeneration, and cleanse.
7. `statusEffects.ts`, `cleansePolicy.ts`, and auto-medicine modules advance status ticks, resistance, cleanse, and medicine counterplay.
8. `battleRecorder.ts` finalizes metrics, contribution summaries, defeat events, and stable battle event record metadata for web and tooling consumers.

For contributor-facing extension guidance, use [Combat Engine V2](combat-engine-v2.md). Implemented tactic presets and future formation bonuses should plug into these extension points instead of growing the simulator loop directly.

## 5. Hero Styles

| Style | Main Target | Combat Role | Example Effects |
| --- | --- | --- | --- |
| Fist / Punch | Outer | Bruiser | Combo strikes, armor break, steady body damage |
| Palm | Inner | Qi breaker | Meridian shock, Inner damage, Qi Break bonus |
| Leg / Kick | Mixed | Speed attacker | Evasion, interrupts, multi-hit attacks |
| Sword | Mixed | Duelist | Crits, counters, bonus against Qi Broken enemies |
| Blade / Saber | Outer | Heavy DPS | Bleed, cleave, high burst |
| Staff / Stick | Outer / Control | Guardian | Stun, guard, enemy speed reduction |
| Spear | Outer | Frontline burst | Pierce, boss damage, reach advantage |
| Hidden Weapons | Inner / Damage over time | Assassin | Poison, delayed strikes, weak point attacks |
| Qin / Flute | Inner / Support | Controller | Team buffs, enemy qi disruption |
| Talisman / Seal | Inner / Mystic | Debuffer | Seals, curses, shields, spirit pressure |

## 6. Hero Growth

Each hero can grow through separate Outer and Inner paths.

### 6.1 Outer Art Growth

Outer Art upgrades improve physical combat.

Stats affected:

- Outer Attack
- Max Outer HP
- Outer Defense
- Weapon mastery
- Crit chance
- Crit damage
- Bleed or wound effects

### 6.2 Inner Art Growth

Inner Art upgrades improve qi combat and stability.

Stats affected:

- Inner Attack
- Max Inner Qi
- Inner Defense
- Inner recovery
- Break power
- Break resistance
- Healing and shielding
- Buff and debuff strength

### 6.3 Example Hero Kits

**Iron Fist Disciple**

- Main target: Outer HP
- Role: Bruiser
- Skill idea: Three-hit combo, final hit reduces Outer Defense.

**Azure Palm Monk**

- Main target: Inner Qi
- Role: Qi breaker
- Skill idea: Palm shock deals heavy Inner damage and increases Qi Break burst.

**White Crane Swordsman**

- Main target: Mixed
- Role: Duelist
- Skill idea: Counterattack after dodging. Bonus crit chance against Qi Broken enemies.

**Mountain Staff Guardian**

- Main target: Outer / control
- Role: Tank support
- Skill idea: Sweeping staff strike slows enemies and restores ally Inner Qi.

## 7. Resources

| Resource | Purpose |
| --- | --- |
| Silver | Main currency for training, equipment upgrades, and buildings |
| Cultivation | Hero leveling and realm advancement |
| Herbs | Pills, healing, temporary boosts, cultivation boosts |
| Manual Fragments | Unlock or upgrade martial skills |
| Combat Experience | Earned by clearing or farming maps; increases mastery against enemies or regions |
| Spirit Jade | Rare optional late-game resource |
| Mastery Marks | Permanent bonuses earned from mastery milestones or major breakthroughs |

## 8. Progression Systems

### 8.1 Hero Level

Hero level increases basic stats.

Simple early formula:

```text
HeroStat = BaseStat * LevelGrowth ^ (Level - 1)
```

Suggested values:

```text
LevelGrowth = 1.06 to 1.10
```

MVP implementation:

```text
XPToNextLevel = 100 * CurrentLevel
TotalXPRequiredForLevel = 100 * (Level - 1) * Level / 2
LevelGrowth = 1.06
```

Enemy definitions also carry level data and use the same basic stat scaling.

### 8.2 Martial Realm

Realm is a milestone tier above normal level.

Example realms:

1. Body Tempering
2. Qi Sense
3. Meridian Opening
4. Inner Sea
5. Golden Core
6. Spirit Crossing
7. Void Step
8. Martial Saint

Each realm can unlock:

- New passive
- New skill slot
- Higher level cap
- New equipment tier
- Better offline efficiency

### 8.3 Sect Buildings

| Building | Function |
| --- | --- |
| Training Yard | Increases Outer Attack and Max Outer HP |
| Meditation Hall | Increases Inner Attack, Max Inner Qi, and Inner recovery |
| Scripture Hall | Unlocks passive techniques and manual upgrades |
| Blacksmith Forge | Upgrades weapons and armor |
| Medicine Pavilion | Crafts pills and healing resources |
| Recruitment Hall | Unlocks new heroes |
| Duel Arena | Challenge fights, ranking, optional PvE ladder |
| Patrol Gate | Improves offline rewards |

### 8.4 Map Mastery And Combat Experience

Clearing and farming maps grants **Combat Experience**. This represents the sect learning enemy patterns, terrain, counters, and martial weaknesses.

Combat Experience can be tracked by:

- Map
- Region
- Enemy family
- Boss master

Recommended MVP:

- Track Combat Experience by map.
- Grant a small permanent bonus at each threshold.
- Let the player choose which cleared map to farm.

Example thresholds:

| Combat Experience | Mastery Rank | Example Bonus |
| --- | --- | --- |
| 100 | Familiar | +1% Outer Attack and Inner Attack on that map |
| 500 | Trained | +2% silver and cultivation from that map |
| 3000 | Mastered | +3% damage against that map's enemy family |

Example formula:

```text
MapCombatExperienceGain = BaseMapExp * EnemyTypeMultiplier * ClearSpeedMultiplier
```

Suggested starting values:

```text
Normal stage clear: 5 Combat Experience
Elite stage clear: 20 Combat Experience
Boss clear: 100 Combat Experience
Offline farming: 50% to 80% of active Combat Experience rate
```

Combat Experience should not replace silver or cultivation. It should make farming feel productive when the player cannot clear the next boss yet.

### 8.5 Breakthrough And Long-Term Progression

The MVP should avoid forced reset prestige. Instead of asking the player to wipe progress, long-term growth should use non-reset milestones.

Possible systems:

- Realm Breakthrough: raises level caps and unlocks new passives.
- Sect Reputation: gained from first clears, boss victories, and achievements.
- Mastery Marks: gained from map mastery and challenge milestones.
- Optional future Sect Ascension: a late-game reset system, excluded from MVP.

Permanent bonus examples:

- +5% all Outer Attack per Mastery Mark
- +5% all Inner Attack per Mastery Mark
- +3% silver gain
- +3% cultivation gain
- +2% offline reward efficiency
- +1% Qi Break duration

## 9. Combat Formula Draft

### 9.1 Core Stats

Each combatant has:

```text
maxOuterHp
maxInnerQi
outerAttack
innerAttack
outerDefense
innerDefense
speed
critChance
critDamage
breakPower
breakResist
innerRecovery
```

### 9.2 Attack Speed

Use speed to shorten attack interval.

```text
AttackInterval = BaseAttackInterval / (1 + Speed / 100)
```

Recommended constraints:

```text
BaseAttackInterval = 2.0 seconds
MinimumAttackInterval = 0.45 seconds
MaximumAttackInterval = 4.0 seconds
```

Final version:

```text
AttackInterval = clamp(BaseAttackInterval / (1 + Speed / 100), 0.45, 4.0)
```

### 9.3 Outer Damage

```text
RawOuterDamage =
  OuterAttack
  * SkillOuterMultiplier
  * StyleMultiplier
  * CritMultiplier
```

Defense mitigation:

```text
OuterMitigation = 100 / (100 + TargetOuterDefense)

FinalOuterDamage = RawOuterDamage * OuterMitigation
```

### 9.4 Inner Damage

```text
RawInnerDamage =
  InnerAttack
  * SkillInnerMultiplier
  * StyleMultiplier
```

Defense mitigation:

```text
InnerMitigation = 100 / (100 + TargetInnerDefense)

FinalInnerDamage = RawInnerDamage * InnerMitigation
```

### 9.5 Hybrid Skills

Every skill can have both Outer and Inner scaling.

Example skill data:

```json
{
  "id": "white_crane_slash",
  "name": "White Crane Slash",
  "outerMultiplier": 1.20,
  "innerMultiplier": 0.35,
  "cooldown": 4.0,
  "bonusVsBroken": 0.30
}
```

This skill deals strong Outer damage and light Inner pressure.

### 9.6 Critical Hits

Critical hits should affect Outer damage by default.

```text
CritMultiplier = CritRoll ? CritDamage : 1.0
```

Suggested initial values:

```text
BaseCritChance = 5%
BaseCritDamage = 1.5x
```

Optional later rule:

- Sword and Hidden Weapons can crit Inner damage.
- Palm can trigger "Inner Shock" instead of normal crit.

### 9.7 Qi Break Formula

When target Inner Qi reaches zero:

```text
BreakBurstPercent =
  BaseBreakBurst
  + AttackerBreakPower
  - TargetBreakResist
```

Clamp the result:

```text
BreakBurstPercent = clamp(BreakBurstPercent, 0.05, 0.25)
```

Then apply:

```text
BreakBurstDamage = TargetMaxOuterHp * BreakBurstPercent
```

Recommended MVP values:

```text
BaseBreakBurst = 0.10
MinimumBreakBurst = 0.05
MaximumBreakBurst = 0.25
```

### 9.8 Broken State Modifiers

While Qi Broken:

```text
OuterDamageTakenMultiplier = 1.25
InnerDamageTakenMultiplier = 0.50
BacklashDamageOnAttack = TargetMaxOuterHp * 0.03
BrokenDuration = 6 seconds
```

Inner damage taken is reduced while broken because the target is already collapsed. This prevents Inner teams from chaining breaks too easily.

After BrokenDuration ends:

```text
RestoredInnerQi = TargetMaxInnerQi * 0.35
```

### 9.9 Inner Recovery

If not broken and not recently damaged, Inner Qi can recover slowly.

```text
InnerRecoveryPerSecond = MaxInnerQi * InnerRecoveryRate
```

Suggested MVP:

```text
InnerRecoveryRate = 0.005
RecoveryDelayAfterInnerDamage = 3 seconds
```

This means a combatant recovers 0.5% max Inner Qi per second after avoiding Inner damage for 3 seconds.

## 10. Difficulty Control

### 10.1 Balance Around Fight Time

The easiest way to control difficulty is to target expected fight duration.

Suggested targets:

| Enemy Type | Target Fight Time |
| --- | --- |
| Easy enemy | 5 to 8 seconds |
| Normal enemy | 10 to 15 seconds |
| Elite enemy | 25 to 40 seconds |
| Region boss | 60 to 120 seconds |
| Wall boss | 3 to 8 minutes |

### 10.2 Player Effective DPS

Because the game has Outer and Inner bars, player damage is not just Outer DPS.

Estimate:

```text
EffectiveDps =
  OuterDps
  + BreakBurstDps
  + BrokenWindowBonusDps
  + BacklashDps
```

Where:

```text
BreakCycleTime = EnemyInnerQi / PlayerInnerDps

BreakBurstDps = BreakBurstDamage / BreakCycleTime

BrokenWindowBonusDps =
  OuterDps
  * (BrokenDamageTakenMultiplier - 1)
  * (BrokenDuration / BreakCycleTime)

BacklashDps =
  ExpectedEnemyAttacksWhileBroken
  * BacklashDamageOnAttack
  / BreakCycleTime
```

For quick balancing, use a simpler estimate:

```text
EffectiveDps = OuterDps + (InnerDps * InnerToOuterConversion)
```

Suggested starting conversion:

```text
InnerToOuterConversion = 0.35
```

This means 100 Inner DPS is treated as about 35 effective Outer DPS for rough stage tuning.

### 10.3 Enemy Outer HP

Once EffectiveDps is known:

```text
EnemyOuterHp = PlayerEffectiveDps * TargetFightTime
```

Example:

```text
PlayerEffectiveDps = 100
TargetFightTime = 12 seconds
EnemyOuterHp = 1200
```

### 10.4 Enemy Inner Qi

Set Enemy Inner Qi based on how often you want Qi Break to happen.

```text
EnemyInnerQi = PlayerInnerDps * TargetBreakTime
```

Suggested targets:

| Enemy Type | Target Break Timing |
| --- | --- |
| Normal enemy | Break once near 50% to 70% fight progress |
| Elite enemy | Break 1 to 2 times |
| Boss | Break 2 to 5 times |
| Inner-resistant boss | Break rarely, but reward it heavily |

Example:

```text
PlayerInnerDps = 50
TargetBreakTime = 8 seconds
EnemyInnerQi = 400
```

### 10.5 Enemy Attack

Enemy attack should be based on target survival pressure.

First estimate player effective health:

```text
PlayerEffectiveHp = PlayerOuterHp / EnemyDamageMitigation
```

Then:

```text
EnemyDps = PlayerEffectiveHp / TargetPlayerSurvivalTime
```

For idle games, normal enemies should rarely kill a properly upgraded player team. Bosses should create the main survival checks.

Suggested survival targets:

| Enemy Type | Target Player Survival Time |
| --- | --- |
| Normal enemy | 45 to 90 seconds |
| Elite enemy | 30 to 60 seconds |
| Boss | 60 to 150 seconds |
| Wall boss | Player loses until upgraded |

## 11. Scaling Curves

### 11.1 Enemy Scaling

Use exponential growth per stage.

```text
EnemyStat = BaseStat * RegionMultiplier * StageGrowth ^ StageInRegion
```

Suggested values:

```text
StageGrowth = 1.12 to 1.18
RegionMultiplier = 3 to 8
BossMultiplier = 2.5 to 5
```

Example:

```text
BaseOuterHp = 100
StageGrowth = 1.15

Stage 1: 100
Stage 10: 351
Stage 20: 1423
Stage 50: 94225
```

### 11.2 Upgrade Cost Scaling

```text
UpgradeCost = BaseCost * CostGrowth ^ (UpgradeLevel - 1)
```

Suggested values:

```text
CostGrowth = 1.14 to 1.20
```

### 11.3 Upgrade Power Scaling

```text
UpgradePowerMultiplier = 1 + (UpgradeEffect * UpgradeLevel)
```

or:

```text
UpgradePowerMultiplier = PowerGrowth ^ UpgradeLevel
```

Suggested values:

```text
UpgradeEffect = 0.08 to 0.12 per level
PowerGrowth = 1.08 to 1.12
```

### 11.4 Reward Scaling

```text
EnemyReward = BaseReward * RewardGrowth ^ Stage
```

Suggested values:

```text
RewardGrowth = 1.10 to 1.16
```

Good early relationship:

```text
EnemyDifficultyGrowth = 1.15
RewardGrowth = 1.13
CostGrowth = 1.16
HeroPowerGrowth = 1.10
```

This lets the player progress steadily, then slowly hit a wall that asks for better upgrades, better team composition, map mastery, or realm breakthroughs.

## 12. Economy Tuning

### 12.1 Upgrade Purchase Time

A useful balance check:

```text
SecondsToBuyUpgrade = UpgradeCost / SilverPerSecond
```

Suggested early game targets:

| Game Phase | Seconds To Buy Common Upgrade |
| --- | --- |
| First 5 minutes | 5 to 20 seconds |
| Early game | 30 to 90 seconds |
| Mid game | 2 to 8 minutes |
| Late game | 10 to 60 minutes |

### 12.2 Offline Rewards

Offline rewards should be meaningful but less efficient than active progression.

```text
OfflineReward = ActiveRewardRate * OfflineSeconds * OfflineEfficiency
```

Suggested values:

```text
OfflineEfficiency = 0.50 to 0.80
OfflineCap = 8 to 12 hours
```

Sect buildings, map mastery, and realm breakthroughs can increase efficiency and cap.

Offline map farming rules:

- The player can choose any cleared non-boss map or stage as the offline farming target.
- Offline progress does not clear new bosses.
- Offline progress does not unlock new regions.
- Offline farming can grant silver, cultivation, items, and Combat Experience.
- Boss clear rewards require online play.

## 13. Regions And Content

### 13.1 Region Structure

Each region contains:

- 10 to 30 normal stages
- 2 to 4 elite encounters
- 1 boss master
- 1 new unlock or meaningful reward

### 13.2 Example Regions

| Region | Theme | Main Enemies | Unlock |
| --- | --- | --- | --- |
| Bamboo Road | Bandit path, beginner jianghu | Bandits, wild disciples | Training Yard |
| Misty Temple | Monks, inner arts | Monks, palm users | Meditation Hall |
| Black Iron Fort | Weapons and armor | Saber guards, shield fighters | Blacksmith Forge |
| Lotus Waterway | Poison and hidden weapons | Assassins, needle users | Medicine Pavilion |
| Snow Peak Sect | Sword duels and boss checks | Sword masters | Scripture Hall |
| Demon Gate Ruins | Late-game spiritual pressure | Talisman users, corrupted masters | Realm Breakthrough |

## 14. MVP Scope

The MVP should prove the game loop and the Outer / Inner combat identity.

### 14.1 MVP Features

- 4 heroes:
  - Fist
  - Palm
  - Sword
  - Staff
- 3 regions
- 10 stages per region
- Auto-battle
- Outer HP and Inner Qi bars
- Qi Break
- Silver and cultivation rewards
- Combat Experience and map mastery
- Hero level upgrades
- Basic skill upgrades
- Simple offline rewards

### 14.2 MVP Non-Goals

These can wait:

- PvP
- Guilds
- Complex crafting
- Large hero roster
- Live events
- Gacha system
- Deep equipment affix system
- Real-money store
- Monetization

## 15. Roadmap

### Phase 0: Design And Prototype

Goal: prove the core combat idea.

Deliverables:

- Game design document
- Basic stat model
- Simple combat simulator
- Balance spreadsheet or CSV
- First playable auto-battle screen

Success criteria:

- Outer and Inner builds both feel useful.
- Qi Break is easy to understand.
- A basic fight resolves automatically and predictably.

### Phase 1: MVP Combat

Goal: make battles playable and tunable.

Deliverables:

- Heroes and enemies loaded from data
- Auto-attack and skill cooldowns
- Outer damage formula
- Inner damage formula
- Qi Break state
- Victory and defeat handling

Success criteria:

- Fight duration matches expected targets.
- Combat can be tuned without code changes.
- Each starting style has a clear role.

### Phase 2: Progression

Goal: create the idle growth loop.

Deliverables:

- Silver rewards
- Cultivation rewards
- Hero level upgrades
- Skill upgrades
- Stage unlocks
- Region boss gates

Success criteria:

- Player has meaningful decisions after each reward cycle.
- Early upgrades feel fast.
- Bosses create clear walls without feeling random.

### Phase 3: Sect Systems

Goal: add martial arts flavor and long-term growth.

Deliverables:

- Training Yard
- Meditation Hall
- Scripture Hall
- Blacksmith Forge
- Basic equipment
- Manual fragments

Success criteria:

- Outer and Inner progression can be upgraded separately.
- Sect buildings give the game a home base identity.

### Phase 4: Offline And Long-Term Growth

Goal: make the game work as an idle game.

Deliverables:

- Offline reward calculation
- Offline cap
- Patrol Gate upgrade
- Player-selected cleared map farming
- Combat Experience rewards
- Map mastery thresholds
- Realm Breakthrough or Mastery Marks
- Permanent bonus tree

Success criteria:

- Returning after time away feels rewarding.
- Farming cleared maps still feels useful.
- Long-term bonuses give progress without forcing a reset.
- Permanent bonuses are visible and understandable.

### Phase 5: Content Expansion

Goal: make the game last longer.

Deliverables:

- More heroes
- More regions
- More enemy archetypes
- Elite modifiers
- Boss mechanics
- Rare manuals
- Gear rarity tiers

Success criteria:

- Team composition matters more over time.
- New regions introduce new strategic problems.

### Phase 6: Polish And UX

Goal: make the game feel good.

Deliverables:

- Clean battle UI
- Clear bars for Outer HP and Inner Qi
- Qi Break animation and text feedback
- Upgrade comparison UI
- Offline summary
- Balance pass
- Save/load reliability

Success criteria:

- The player can understand combat by watching it.
- Important changes are visible without reading long explanations.

## 16. Data-Driven Implementation Plan

The game should use data files for heroes, enemies, skills, stages, and upgrades. This makes balance easier.

Suggested data files:

```text
data/heroes.json
data/skills.json
data/enemies.json
data/regions.json
data/upgrades.json
data/mastery.json
data/formations.json
```

### 16.0 Core Library Boundary

The game should separate core rules from the web UI.

Suggested structure:

```text
core/
  combat/
  progression/
  offline/
  balance/
  data/
web/
  screens/
  components/
  styles/
```

The core library should own:

- Combat simulation
- Damage formulas
- Qi Break rules
- Map mastery formulas
- Offline reward calculation
- Save data validation
- Stage and enemy scaling

The web app should own:

- Rendering
- Input
- Animation
- Navigation
- Local save storage
- Debug panels

This allows the same engine to be used for the playable game, balance tools, automated tests, and future mobile or backend work.

### 16.1 Hero Data Example

```json
{
  "id": "azure_palm_monk",
  "name": "Azure Palm Monk",
  "style": "Palm",
  "role": "Inner Breaker",
  "baseStats": {
    "maxOuterHp": 120,
    "maxInnerQi": 160,
    "outerAttack": 8,
    "innerAttack": 18,
    "outerDefense": 8,
    "innerDefense": 14,
    "speed": 12,
    "critChance": 0.03,
    "critDamage": 1.4,
    "breakPower": 0.03,
    "breakResist": 0.01,
    "innerRecovery": 0.005
  },
  "skills": ["meridian_shock", "quiet_breath"]
}
```

### 16.2 Enemy Data Example

```json
{
  "id": "black_iron_guard",
  "name": "Black Iron Guard",
  "type": "elite",
  "baseStats": {
    "maxOuterHp": 850,
    "maxInnerQi": 320,
    "outerAttack": 42,
    "innerAttack": 8,
    "outerDefense": 35,
    "innerDefense": 18,
    "speed": 0,
    "breakPower": 0,
    "breakResist": 0.03
  },
  "traits": ["outer_resistant", "slow_attacker"]
}
```

### 16.3 Skill Data Example

```json
{
  "id": "meridian_shock",
  "name": "Meridian Shock",
  "cooldown": 5.0,
  "outerMultiplier": 0.25,
  "innerMultiplier": 1.65,
  "target": "single",
  "effects": [
    {
      "type": "inner_defense_down",
      "value": 0.10,
      "duration": 6.0
    }
  ]
}
```

## 17. Balance Spreadsheet Template

Use these columns in a spreadsheet or CSV:

```text
Region
Stage
EnemyType
EnemyOuterHp
EnemyInnerQi
EnemyOuterAttack
EnemyInnerAttack
EnemyOuterDefense
EnemyInnerDefense
PlayerOuterDps
PlayerInnerDps
EstimatedEffectiveDps
TargetFightTime
EstimatedFightTime
SilverReward
CultivationReward
CombatExperienceReward
UpgradeCost
SecondsToNextUpgrade
Notes
```

Key formulas:

```text
EstimatedEffectiveDps = PlayerOuterDps + PlayerInnerDps * 0.35

EstimatedFightTime = EnemyOuterHp / EstimatedEffectiveDps

SecondsToNextUpgrade = UpgradeCost / SilverPerSecond
```

For bosses, also track:

```text
ExpectedBreaksPerFight
BossDamageTakenDuringBreak
PlayerSurvivalTime
```

## 18. Early Balance Targets

Use these as the first pass before playtesting.

```text
Normal enemy fight: 10 to 15 seconds
Elite fight: 25 to 40 seconds
Boss fight: 60 to 120 seconds
First upgrade purchase: within 10 seconds
First new hero unlock: within 5 to 10 minutes
First region boss: within 15 to 25 minutes
First major mastery or realm breakthrough: within 1.5 to 3 hours
```

## 19. Open Design Questions

These should be answered during prototype testing:

- Should Qi Break affect all enemies the same way, or should bosses have special break rules?
- Should Inner Qi recover during combat for all units, or only for specific styles?
- Should each hero have one fixed weapon style, or can players equip different styles?
- Should equipment affect only Outer Art, or can relics and manuals affect Inner Art too?
- Should the player control skill priority, or should heroes choose automatically?
- How punishing should defeat be?
- Should map mastery bonuses be global, map-specific, or enemy-family-specific after MVP?

## 20. Recommended First Build

Build the smallest version that proves the idea:

1. One battle screen.
2. Four heroes: Fist, Palm, Sword, Staff.
3. One enemy at a time.
4. Outer HP and Inner Qi bars.
5. Auto attacks and one skill per hero.
6. Qi Break with burst damage, vulnerability, and backlash.
7. Silver and cultivation rewards.
8. Combat Experience rewards and simple map mastery thresholds.
9. Upgrade buttons for Outer Training and Inner Training.
10. Ten stages and one boss.
11. Save/load and offline reward calculation.

If this version is fun to watch for five minutes, the larger game has a strong foundation.
