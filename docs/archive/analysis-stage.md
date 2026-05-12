# Analysis Stage

## Current Status Note

This is a historical analysis artifact from the original MVP planning stage. It explains why the project chose a TypeScript core library, React/Vite web shell, deterministic combat, local save, and simulator-first balance workflow.

The implemented game has since moved through MVP and Stage 1.1 to Stage 2.2. For current systems, use [Current Implemented Systems](../current-implemented-systems.md). For the current engine boundary, use [Core Engine Boundary](../core-engine-boundary.md), and for the current combat pipeline use [Combat Engine V2](../combat-engine-v2.md).

This document starts the analysis stage for **Path of Jianghu**. It turns the planning decisions into requirements, engine boundaries, simulation rules, data schemas, and the first implementation milestones.

## 1. Analysis Goal

The analysis stage should answer how to build the first playable prototype without losing the long-term direction.

The prototype should prove:

- Outer HP and Inner Qi create interesting combat.
- Qi Break is readable, useful, and tunable.
- Fixed-style heroes can form a meaningful team.
- Offline farming works without clearing bosses.
- Map mastery gives useful progress when the player farms.
- The core game engine can be reused outside the web UI.

## 2. Settled Inputs From Planning

| Topic | Analysis Input |
| --- | --- |
| Platform | Responsive web game |
| Mobile | Same web build shown on mobile browser or PWA shell |
| Engine | Core rules must live in a reusable library |
| MVP battle | Four player heroes vs one enemy |
| Engine battle model | Team vs team internally |
| Long-term battle | Team vs team with formations |
| MVP hero styles | Fixed styles |
| Starting heroes | Fist, Palm, Sword, Staff |
| Upgrade model | Hero-specific and sect-wide upgrades |
| Qi Break | 6 seconds, 10% HP burst, +25% HP damage taken, 3% backlash per attack |
| Offline farming | Player chooses cleared non-boss map or stage |
| Offline bosses | Boss clearing requires online play |
| Map mastery | Clearing/farming grants Combat Experience |
| Mastery thresholds | 100, 500, 3000 |
| Reset | No forced reset in MVP; optional late-game reset later |
| Monetization | Excluded from MVP |

## 3. Recommended Technical Stack

Recommended first stack:

```text
Language: TypeScript
Web app: Vite
UI: React
Core engine: TypeScript library module
Data: JSON files loaded by the web app and simulator
Tests: Vitest
Balance tool: Node-based simulator script
Save: Browser localStorage with versioned JSON
```

Why TypeScript:

- The game is formula-heavy.
- Data schemas matter.
- The same logic can run in the browser, tests, and a Node simulator.
- A typed core library makes future mobile or backend validation easier.

The analysis recommendation is to use React for the web surface, but keep the first UI simple. The important early work is the core engine and simulator.

## 4. Project Architecture

Recommended structure:

```text
core/
  combat/
    formulas.ts
    simulator.ts
    targeting.ts
    types.ts
  progression/
    upgrades.ts
    mastery.ts
    rewards.ts
  offline/
    offlineRewards.ts
  save/
    saveSchema.ts
    migrations.ts
  data/
    validateData.ts
web/
  screens/
  components/
  styles/
data/
  heroes.json
  skills.json
  enemies.json
  regions.json
  upgrades.json
  mastery.json
  formations.json
tools/
  simulateBattle.ts
  generateBalanceReport.ts
tests/
  combat/
  progression/
  offline/
```

Core rule:

```text
The core library must not import UI code.
```

The web app can import the core library. The simulator and tests can also import the same core library.

## 5. Core Library Responsibilities

The core library owns deterministic game rules.

Core should handle:

- Static data validation
- Stat derivation
- Combat simulation
- Damage formulas
- Qi Break
- Skill cooldowns
- Targeting rules
- Stage clear rewards
- Combat Experience and map mastery
- Offline reward calculation
- Upgrade purchase validation
- Save validation and migration

Core should not handle:

- Rendering
- Animation
- Button behavior
- CSS
- Browser routing
- Sound
- Local notification behavior

## 6. Web App Responsibilities

The web app owns presentation and input.

Web should handle:

- Battle screen layout
- Hero panels
- Enemy panels
- Outer HP and Inner Qi bars
- Qi Break visual feedback
- Upgrade buttons
- Map selection for farming
- Offline reward summary
- Save/load from browser storage
- Debug panels during development

The web app should call core functions for all rule decisions.

## 7. MVP Feature Requirements

### 7.1 Battle

MVP battle requirements:

- Player team has four heroes.
- Enemy team has one enemy.
- Each hero has fixed style.
- Each unit has Outer HP and Inner Qi.
- Combat runs automatically.
- Each hero has a basic attack.
- Each hero has one active skill.
- Skills trigger automatically on cooldown.
- Battle ends when all units on one side have zero Outer HP.
- Player victory unlocks rewards and next stage.
- Player defeat moves the player back to farming mode.

### 7.2 Heroes

Starting heroes:

| Hero | Style | Role |
| --- | --- | --- |
| Iron Fist Disciple | Fist | Outer bruiser |
| Azure Palm Monk | Palm | Inner breaker |
| White Crane Swordsman | Sword | Hybrid duelist |
| Mountain Staff Guardian | Staff | Defensive support |

MVP hero requirements:

- Fixed style.
- Base stats loaded from data.
- Level affects stats.
- Hero-specific Outer Training upgrade.
- Hero-specific Inner Training upgrade.
- One active skill.
- One passive trait if time allows.

### 7.3 Enemies

MVP enemy archetypes:

| Enemy | Purpose |
| --- | --- |
| Outer-heavy brute | Tests Outer defense and HP |
| Inner-heavy palm user | Tests Inner defense and Qi Break pressure |
| Balanced swordsman | Tests general tuning |
| Defensive boss | Tests longer fight pacing |

Enemies should be loaded from data and scaled by stage.

### 7.4 Stages And Maps

MVP map structure:

```text
Region 1: Bamboo Road
Stages: 10
Boss: Stage 10
```

Recommended first prototype:

- Implement one region first.
- Add more regions only after combat tuning is stable.
- Boss stages can be replayed online, but not cleared offline.

### 7.5 Progression

MVP progression:

- Silver
- Cultivation
- Hero levels
- Hero Outer Training
- Hero Inner Training
- Sect-wide Outer Training
- Sect-wide Inner Training
- Combat Experience
- Map mastery thresholds

MVP non-goals:

- Equipment affixes
- Complex crafting
- PvP
- Guilds
- Gacha
- Monetization
- Forced reset prestige

## 8. Combat Simulation

### 8.1 Simulation Style

Recommended MVP simulation:

```text
Fixed time-step simulation
Step size: 0.1 seconds
Max battle length: 180 seconds for normal simulation
```

Why fixed step:

- Easy to reason about.
- Easy to debug in a visual UI.
- Good enough for the MVP.
- Can produce timeline events for battle logs.

Later, the engine can move to an event queue if performance requires it.

### 8.2 Simulation Inputs

```ts
type SimulateBattleInput = {
  staticData: StaticGameData;
  playerTeam: TeamInstance;
  enemyTeam: TeamInstance;
  stageId: string;
  mode: "deterministic" | "seeded";
  seed?: number;
  maxDurationSeconds: number;
};
```

### 8.3 Simulation Outputs

```ts
type BattleResult = {
  winner: "player" | "enemy" | "timeout";
  durationSeconds: number;
  events: BattleEvent[];
  finalPlayerTeam: CombatantState[];
  finalEnemyTeam: CombatantState[];
  metrics: BattleMetrics;
};
```

Important metrics:

```ts
type BattleMetrics = {
  playerOuterDamage: number;
  playerInnerDamage: number;
  enemyOuterDamage: number;
  enemyInnerDamage: number;
  qiBreaksTriggeredByPlayer: number;
  qiBreaksTriggeredByEnemy: number;
  backlashDamageToEnemies: number;
  backlashDamageToPlayers: number;
  playerEffectiveDps: number;
  enemyEffectiveDps: number;
};
```

### 8.4 Combatant Runtime State

```ts
type CombatantState = {
  id: string;
  team: "player" | "enemy";
  outerHp: number;
  innerQi: number;
  maxOuterHp: number;
  maxInnerQi: number;
  stats: DerivedStats;
  nextBasicAttackAt: number;
  skillCooldowns: Record<string, number>;
  isQiBroken: boolean;
  qiBreakEndsAt: number | null;
  lastInnerDamageAt: number | null;
};
```

### 8.5 Derived Stats

```ts
type DerivedStats = {
  maxOuterHp: number;
  maxInnerQi: number;
  outerAttack: number;
  innerAttack: number;
  outerDefense: number;
  innerDefense: number;
  speed: number;
  critChance: number;
  critDamage: number;
  breakPower: number;
  breakResist: number;
  innerRecoveryRate: number;
};
```

Stats should be derived from:

- Base hero/enemy stats
- Level
- Hero upgrades
- Sect upgrades
- Map mastery bonuses
- Passive skill bonuses
- Formation bonuses later

## 9. Combat Formulas

### 9.1 Attack Interval

```text
AttackInterval = clamp(BaseAttackInterval / (1 + Speed / 100), 0.45, 4.0)
```

Recommended MVP:

```text
BaseAttackInterval = 2.0 seconds
```

### 9.2 Outer Damage

```text
RawOuterDamage =
  OuterAttack
  * SkillOuterMultiplier
  * StyleMultiplier
  * CritMultiplier
```

```text
OuterMitigation = 100 / (100 + TargetOuterDefense)
FinalOuterDamage = RawOuterDamage * OuterMitigation
```

When target is Qi Broken:

```text
FinalOuterDamage = FinalOuterDamage * 1.25
```

### 9.3 Inner Damage

```text
RawInnerDamage =
  InnerAttack
  * SkillInnerMultiplier
  * StyleMultiplier
```

```text
InnerMitigation = 100 / (100 + TargetInnerDefense)
FinalInnerDamage = RawInnerDamage * InnerMitigation
```

When target is Qi Broken:

```text
FinalInnerDamage = FinalInnerDamage * 0.50
```

This prevents Inner damage from chaining Qi Break too easily.

### 9.4 Critical Hits

For balance simulation, use deterministic expected crits:

```text
ExpectedCritMultiplier = 1 + CritChance * (CritDamage - 1)
```

For real battle playback, use seeded random rolls later.

### 9.5 Qi Break

Trigger:

```text
If InnerQi <= 0 and target is not already Qi Broken, apply Qi Break.
```

MVP effect:

```text
Duration: 6 seconds
Instant damage: 10% target max Outer HP
Outer damage taken: +25%
Inner damage taken: -50%
Backlash when broken target attacks: 3% target max Outer HP
Inner Qi after recovery: 35% target max Inner Qi
```

If a broken unit attacks:

```text
BacklashDamage = AttackerMaxOuterHp * 0.03
```

When Qi Break ends:

```text
InnerQi = MaxInnerQi * 0.35
```

### 9.6 Inner Recovery

Recommended MVP:

```text
InnerRecoveryRate = 0.005
RecoveryDelayAfterInnerDamage = 3 seconds
```

Formula:

```text
If not Qi Broken and timeSinceLastInnerDamage >= 3:
  InnerQi += MaxInnerQi * InnerRecoveryRate * DeltaSeconds
```

## 10. Targeting Rules

MVP targeting should stay simple.

Default:

```text
Heroes target the first living enemy.
Enemy targets the first living hero.
```

This supports team data without needing formation complexity.

Future targeting:

- Frontline first
- Lowest Outer HP
- Lowest Inner Qi
- Highest threat
- Backline targeting
- Style-specific targeting

## 11. Skill Automation

MVP rule:

```text
Each unit uses its active skill automatically when cooldown is ready.
If skill is not ready, the unit uses basic attack.
```

Skill priority:

- Not player-controlled in MVP.
- Can be added later as a formation or tactics feature.

## 12. Rewards

### 12.1 Stage Clear Rewards

On active stage clear:

```text
SilverReward = StageBaseSilver * RewardMultipliers
CultivationReward = StageBaseCultivation * RewardMultipliers
CombatExperienceReward = StageBaseCombatExperience * MasteryMultipliers
```

Boss clear:

- Grants larger rewards.
- Unlocks next map or region.
- Requires online play.

### 12.2 Combat Experience

Combat Experience is gained by clearing or farming maps.

Initial values:

```text
Normal stage clear: 5
Elite stage clear: 20
Boss clear: 100
```

Mastery thresholds:

| Combat Experience | Rank | MVP Bonus |
| --- | --- | --- |
| 100 | Familiar | +1% Outer Attack and Inner Attack on that map |
| 500 | Trained | +2% silver and cultivation from that map |
| 3000 | Mastered | +3% damage against that map's enemy family |

MVP recommendation:

- Store Combat Experience by map id.
- Apply Familiar and Trained bonuses only on that map.
- Apply Mastered bonus to enemy family if enemy family exists in data.

## 13. Offline Farming

### 13.1 Offline Rules

Offline farming:

- Uses a player-selected cleared non-boss stage or map.
- Does not clear new stages.
- Does not clear bosses.
- Does not unlock regions.
- Grants silver, cultivation, drops if implemented, and Combat Experience.

### 13.2 Offline Formula

```text
OfflineSeconds = min(CurrentTime - LastSavedAt, OfflineCapSeconds)
OfflineClearTime = EstimatedClearTimeForSelectedMap
OfflineClears = floor(OfflineSeconds / OfflineClearTime)
OfflineEfficiency = 0.50 to 0.80
```

Rewards:

```text
OfflineSilver =
  ActiveSilverPerClear
  * OfflineClears
  * OfflineEfficiency
```

```text
OfflineCultivation =
  ActiveCultivationPerClear
  * OfflineClears
  * OfflineEfficiency
```

```text
OfflineCombatExperience =
  ActiveCombatExperiencePerClear
  * OfflineClears
  * OfflineEfficiency
```

Recommended MVP:

```text
OfflineEfficiency = 0.60
OfflineCap = 8 hours
MinimumEstimatedClearTime = 5 seconds
```

### 13.3 Offline Safety

Offline reward calculation must use stored player state and selected map id.

It should not:

- Simulate boss wins.
- Unlock new stages.
- Advance map progress.
- Use current UI state.

## 14. Save System

### 14.1 Save Data

Use a versioned JSON save object.

```ts
type SaveData = {
  version: number;
  createdAt: number;
  updatedAt: number;
  resources: ResourceState;
  heroes: Record<string, HeroProgress>;
  sect: SectProgress;
  maps: Record<string, MapProgress>;
  currentStageId: string;
  selectedOfflineFarmStageId: string | null;
};
```

### 14.2 Save Rules

MVP save rules:

- Save after every meaningful purchase.
- Autosave every 10 to 30 seconds.
- Save when tab visibility changes if possible.
- Store in browser localStorage.
- Include save version from day one.

Future:

- Export/import save file.
- Cloud sync.
- Save migrations.

## 15. Static Data Schemas

### 15.1 Hero

```ts
type HeroDefinition = {
  id: string;
  name: string;
  style: "fist" | "palm" | "sword" | "staff";
  role: string;
  baseStats: BaseStats;
  skillIds: string[];
  passiveIds: string[];
  unlock: UnlockCondition;
};
```

### 15.2 Skill

```ts
type SkillDefinition = {
  id: string;
  name: string;
  cooldownSeconds: number;
  outerMultiplier: number;
  innerMultiplier: number;
  targetRule: TargetRule;
  effects: SkillEffect[];
};
```

### 15.3 Enemy

```ts
type EnemyDefinition = {
  id: string;
  name: string;
  family: string;
  type: "normal" | "elite" | "boss";
  style: string;
  baseStats: BaseStats;
  skillIds: string[];
  traitIds: string[];
};
```

### 15.4 Region And Stage

```ts
type RegionDefinition = {
  id: string;
  name: string;
  stageIds: string[];
  unlockCondition: UnlockCondition;
};
```

```ts
type StageDefinition = {
  id: string;
  regionId: string;
  index: number;
  name: string;
  enemyTeam: TeamDefinition;
  isBoss: boolean;
  rewards: StageRewards;
  nextStageId: string | null;
};
```

### 15.5 Mastery

```ts
type MasteryDefinition = {
  thresholds: MasteryThreshold[];
};
```

```ts
type MasteryThreshold = {
  experience: number;
  rank: "familiar" | "trained" | "mastered";
  bonuses: MasteryBonus[];
};
```

## 16. Data Validation

Before the game starts, validate static data.

Validation checks:

- Every hero skill id exists.
- Every enemy skill id exists.
- Every stage enemy id exists.
- Every region stage id exists.
- No duplicate ids.
- Required stats are positive.
- Boss stages are not marked as offline farm targets.
- Mastery thresholds are sorted.

The simulator should fail loudly if data is invalid. Quiet data errors make balance work miserable.

## 17. UI Flow Requirements

### 17.1 First Play Screen

The first screen should be the playable battle screen, not a landing page.

Visible areas:

- Battle area
- Player team list
- Enemy panel
- Stage/map selector
- Upgrade panel
- Resource bar
- Battle log or debug panel during development

### 17.2 Battle Display

Each combatant should show:

- Name
- Style
- Outer HP bar
- Inner Qi bar
- Qi Break state if active
- Skill cooldown indicator if practical

Outer HP should be visually dominant. Inner Qi should be a secondary bar.

### 17.3 Farming Selection

The player should be able to:

- See cleared maps or stages.
- Select one for offline farming.
- See estimated offline rewards.
- See Combat Experience progress toward the next mastery threshold.

## 18. Balance Analysis Requirements

The first simulator should output:

- Winner
- Fight duration
- Player Outer DPS
- Player Inner DPS
- Enemy Outer DPS
- Enemy Inner DPS
- Qi Break count
- Backlash damage
- Expected silver per minute
- Expected cultivation per minute
- Expected Combat Experience per minute

Target early values:

```text
Normal enemy: 10 to 15 seconds
Elite enemy: 25 to 40 seconds
Boss: 60 to 120 seconds
First upgrade: within 10 seconds
First boss: within 15 to 25 minutes
First major mastery or realm breakthrough: within 1.5 to 3 hours
```

## 19. Prototype Milestones

### Milestone A: Core Data And Formulas

Deliverables:

- TypeScript project setup
- Core stat types
- Formula functions
- JSON data loading
- Static data validation

Acceptance:

- Tests can calculate Outer damage, Inner damage, attack interval, and Qi Break burst.

### Milestone B: Combat Simulator

Deliverables:

- Team vs team runtime model
- Four heroes vs one enemy battle
- Auto attacks
- One skill per hero
- Qi Break
- Battle result metrics
- CLI or script simulation

Acceptance:

- Simulator can run 100 sample fights.
- Fight duration and Qi Break count are reported.
- Qi Break applies burst, vulnerability, backlash, and recovery.

### Milestone C: Progression And Rewards

Deliverables:

- Stage clear rewards
- Hero upgrades
- Sect upgrades
- Combat Experience
- Map mastery thresholds

Acceptance:

- Clearing a stage grants silver, cultivation, and Combat Experience.
- Reaching 100, 500, and 3000 Combat Experience grants expected bonuses.

Implementation status:

- Core progression state exists for resources, heroes, sect upgrades, and map progress.
- Stage clear rewards can be applied by stage id.
- Hero and sect upgrade purchases spend silver and increase upgrade levels.
- Hero stats can be derived from hero upgrades, sect upgrades, and map mastery.
- Map mastery exposes reached ranks, next threshold, attack bonus, and reward bonus helpers.

### Milestone D: Web Prototype

Deliverables:

- Battle screen
- Resource bar
- Hero panels
- Enemy panel
- Upgrade panel
- Stage selection

Acceptance:

- User can watch auto-battle.
- User can buy upgrades.
- UI reflects Outer HP, Inner Qi, and Qi Break.

### Milestone E: Save And Offline Farming

Deliverables:

- Versioned save data
- Autosave
- Load on start
- Offline reward calculation
- Player-selected farming map

Acceptance:

- Closing and reopening preserves progress.
- Offline rewards do not clear bosses.
- Offline Combat Experience is granted to the selected map.

## 20. Test Plan

Core tests:

- Outer damage mitigation works.
- Inner damage mitigation works.
- Speed lowers attack interval within clamps.
- Qi Break triggers at zero Inner Qi.
- Qi Break burst deals 10% max Outer HP.
- Qi Broken target takes 25% more Outer damage.
- Qi Broken target takes backlash when attacking.
- Qi Break restores 35% Inner Qi after 6 seconds.
- Offline rewards respect cap and efficiency.
- Offline rewards cannot clear bosses.
- Mastery thresholds apply once.
- Save version is present.

Simulation tests:

- Normal stage resolves within target fight range using baseline data.
- Boss stage lasts longer than normal stage.
- Inner-focused hero contributes through Qi Break.
- Outer-focused hero contributes through HP damage.

## 21. Risks And Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Inner builds dominate combat | Outer styles feel useless | Reduce Inner-to-Outer conversion, increase Inner recovery, lower break burst |
| Outer builds ignore Inner system | Signature mechanic feels optional | Add bosses with high Outer defense and lower Inner defense |
| Offline farming too strong | Online boss gates feel weak | Keep bosses online only and use offline efficiency below active |
| Engine gets overbuilt | Prototype slows down | Build only APIs needed by simulator and first UI |
| Map mastery snowballs too hard | Farming old maps becomes mandatory | Keep early bonuses small and map-specific |
| Mobile UI feels cramped | Web-first design fails on phone | Use responsive layout from the first battle screen |

## 22. Analysis Exit Criteria

The analysis stage is complete when these artifacts exist:

- MVP requirements accepted.
- Technical stack chosen.
- Core library API shape accepted.
- Combat simulator rules accepted.
- Static data schemas accepted.
- Save/offline rules accepted.
- First implementation milestones accepted.

After that, the project can move to implementation.

## 23. Immediate Next Step

The best next technical step is:

```text
Create the TypeScript project skeleton with a core library, data folder, simulator script, and tests.
```

The first implemented behavior should be formula tests, then a four-hero vs one-enemy combat simulator.
