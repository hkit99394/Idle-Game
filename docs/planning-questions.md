# Planning Questions Before Analysis Stage

## Current Status Note

This is a historical planning artifact. The questions here were resolved enough to start MVP implementation and should not be read as the current feature backlog.

The current implementation snapshot is [Current Implemented Systems](current-implemented-systems.md), and completed stage backlogs through Stage 1.8 are archived under [docs/archive](archive/).

This document captures the remaining planning decisions before moving into the analysis stage.

The goal of the planning stage is not to answer every future design question. The goal is to define enough direction that the analysis stage can turn the idea into requirements, data models, combat simulations, technical architecture, and prototype tasks.

## 1. What The Analysis Stage Should Produce

The next stage should answer how the game can be built and balanced.

Expected analysis outputs:

- Combat simulation design
- Core data model
- MVP feature requirements
- Screen and UI flow requirements
- Save/load requirements
- Balance spreadsheet structure
- Technical stack recommendation
- First prototype task list
- Shared game-engine library boundary

## 2. Current Planning Decisions

These are the current decisions from the planning conversation.

| Topic | Decision |
| --- | --- |
| Platform | Responsive web game |
| Mobile | Same web game shown on mobile browser or PWA shell |
| Engine | Core combat and progression engine should be a reusable library |
| Long-term combat | Team vs team |
| Formations | Add later, but design engine to support them |
| MVP hero styles | Fixed styles |
| Outer and Inner upgrades | Both hero-specific and sect-wide |
| Qi Break | 6 seconds, 10% HP burst, +25% HP damage taken, 3% backlash per attack |
| Offline farming | Player chooses cleared map or stage |
| Offline boss progress | Bosses require online play |
| Map mastery | Clearing or farming maps grants Combat Experience |
| Mastery thresholds | Start with 100, 500, 3000 |
| Forced reset prestige | Not for MVP |
| Optional reset | Allowed as a future late-game system |
| Monetization | Excluded from MVP |

Remaining planning uncertainty:

- None that blocks the analysis stage.

## 3. Must Answer Before Analysis

These questions affect the shape of the whole game and should be decided before analysis begins.

### 3.1 Platform

Question:

- Is the first version a web game, mobile game, desktop game, or engine-based game?

Recommended default:

- Start as a responsive web game. Mobile uses the same web game through a mobile browser or PWA shell.
- Keep the battle engine, progression formulas, and offline reward logic in a reusable core library instead of tying them directly to the UI.

Why it matters:

- Platform affects UI layout, save storage, offline reward logic, performance limits, and deployment.
- Keeping the engine as a library makes it easier to reuse the same rules for web, mobile shell, tests, simulators, and future backend validation.

### 3.2 MVP Battle Format

Question:

- Does the MVP use one hero fighting one enemy, a team fighting one enemy, or a team fighting an enemy team?

Recommended default:

- Start with a player team of 4 heroes fighting one enemy at a time.
- Long term, support team vs team battles and formations.
- The MVP engine should still represent both sides as teams internally so formations can be added later without rewriting combat.

Why it matters:

- Targeting, skill logic, UI complexity, enemy balance, and simulation complexity all depend on this.

### 3.3 Hero Ownership

Question:

- Are heroes fixed characters with fixed styles, or can the player change a hero's weapon/style?

Recommended default:

- Start with fixed heroes and fixed styles.

Why it matters:

- Flexible styles create more build freedom, but make balance and UI more complex.

### 3.4 Outer Art And Inner Art Upgrade Model

Question:

- Are Outer Art and Inner Art upgraded per hero, globally through sect buildings, or both?

Recommended default:

- Use both, but keep MVP simple:
  - Hero upgrades improve individual stats.
  - Sect buildings give global Outer and Inner bonuses.

Why it matters:

- This affects progression pacing, economy design, and how often the player makes decisions.

### 3.5 Qi Break Rules

Question:

- What exactly happens when Inner Qi reaches zero?

Recommended MVP rule:

```text
Qi Break duration: 6 seconds
Instant Outer HP damage: 10% max Outer HP
Outer damage taken while broken: +25%
Backlash when attacking while broken: 3% max Outer HP
Inner Qi restored after break: 35% max Inner Qi
```

Why it matters:

- Qi Break is the signature combat mechanic. The analysis stage needs a stable version to simulate.

### 3.6 Offline Progress Rules

Question:

- Can offline progress clear new stages and bosses, or only farm the best cleared stage?

Recommended default:

- Offline progress farms the best cleared non-boss stage.
- The player can choose which cleared map or stage to farm.
- Boss clearing requires online play.

Why it matters:

- Letting offline progress clear bosses can weaken boss gates and progression pacing.

### 3.7 Long-Term Progression Reset Rules

Question:

- Does the game need a reset-based prestige system, or should long-term progression avoid resets?

Current direction:

- Do not use a forced reset for MVP.
- Replace reset prestige with non-reset progression such as Sect Reputation, Realm Breakthrough, or Mastery.
- Optional reset-based Sect Ascension is allowed later as a late-game system.

If a reset system is added later, keep:

- Unlocked heroes
- Manual collection
- Ascension Marks
- Permanent bonuses
- Highest reached region record

Why it matters:

- Reset prestige can be powerful in idle games, but it can also feel punishing. A non-reset path fits better until the core loop proves it needs a larger long-term cycle.

### 3.8 Monetization Boundary

Question:

- Is this planned as a paid game, free game, ad-supported game, or free-to-play with purchases?

Definition:

- Monetization means how the game makes money, such as paid download, ads, cosmetics, battle pass, premium currency, convenience purchases, or expansion packs.

Recommended default:

- Exclude monetization from MVP.

Why it matters:

- Monetization can affect timers, rewards, upgrade pacing, and player trust. It is better not to mix it into the first prototype unless it is a product requirement.

### 3.9 Map Mastery And Combat Experience

Question:

- Should clearing and farming maps grant experience against enemy types or stages?

Current direction:

- Yes. Clearing a map grants Combat Experience for that enemy, stage, or map.
- Reaching mastery thresholds grants small stat bonuses.
- Example thresholds: 100, 500, 3000.

Why it matters:

- This gives farming a second purpose beyond silver and cultivation.
- It lets players feel progress even when they are not ready to beat the next boss.

## 4. Should Answer During Analysis

These do not block moving forward, but the analysis stage should resolve them.

### 4.1 Technical Stack

Questions:

- Should the prototype use plain HTML/CSS/JavaScript, React, another frontend framework, or a game engine?
- Should game logic be fully client-side at first?
- Should data be stored in JSON?

Recommended default:

- Use a web stack with data-driven JSON files and client-side simulation first.
- Keep core game rules in a library module that has no UI dependency.

### 4.2 Save System

Questions:

- Should saves use browser local storage, indexed storage, files, or cloud sync?
- How often should autosave happen?
- Should the save format be versioned from the beginning?

Recommended default:

- Use local browser save with a versioned JSON save object.

### 4.3 Combat Simulator

Questions:

- Should the simulator be deterministic or use random rolls?
- Should the prototype include a debug panel showing DPS, break timing, and expected fight length?

Recommended default:

- Use deterministic simulation first, then add randomness after balance feels stable.

### 4.4 Enemy Archetypes

Questions:

- Which enemy types should appear in the first prototype?
- Should enemies have their own Outer/Inner style identity?

Recommended default:

- Use four early archetypes:
  - Outer-heavy brute
  - Inner-heavy palm user
  - Balanced swordsman
  - Defensive boss

### 4.5 Skill Automation

Questions:

- Do heroes use skills automatically on cooldown?
- Can the player set skill priority?
- Are skills active, passive, or both?

Recommended default:

- Heroes use one active skill automatically on cooldown, plus one passive trait.

### 4.6 Defeat Rules

Questions:

- What happens when the player team loses?
- Does the game move back a stage, retry the same stage, or farm the previous stage?

Recommended default:

- On defeat, automatically farm the highest cleared stage until upgraded.

### 4.7 UI Requirements

Questions:

- What information must be visible during battle?
- How should Outer HP and Inner Qi be shown?
- How should Qi Break be communicated?

Recommended default:

- Show Outer HP as the main bar and Inner Qi as a thinner secondary bar.
- Show a clear Qi Break state label and short animation.

## 5. Can Decide Later

These are useful but should not delay analysis.

- Final game title
- Full hero roster
- Exact realm names
- Long-term region list
- Equipment rarity tiers
- Gacha or recruitment system
- PvP
- Guilds
- Live events
- Cloud saves
- Premium currency
- Advanced crafting
- Voice, music, and advanced animation

## 6. Recommended Planning Decisions

If we want to move quickly, use this planning baseline:

```text
Platform: Responsive web game, mobile through web/PWA
Engine: Shared core game library
MVP battle format: Four-player hero team vs one enemy, represented as team vs team internally
Long-term battle format: Team vs team with formations
Hero styles: Fixed hero styles
Starting heroes: Fist, Palm, Sword, Staff
Combat bars: Outer HP and Inner Qi
Signature mechanic: Qi Break
Progression: Silver, cultivation, hero upgrades, sect buildings, map mastery
Offline rule: Player-selected cleared map farming, bosses online only
Prestige: No forced reset for MVP
Optional reset: Future late-game system only
Monetization: Excluded from MVP
Data format: JSON
First analysis artifact: Combat simulator requirements
```

## 7. Planning Exit Checklist

Before moving to analysis, confirm these:

- Platform is chosen.
- MVP battle format is chosen.
- Starting hero styles are chosen.
- Qi Break rule is accepted for prototype testing.
- Offline progress rule is chosen.
- Long-term progression reset rule is chosen.
- Map mastery rule is chosen.
- Monetization is excluded from MVP.
- Analysis outputs are agreed.

Once these are confirmed, the planning stage is complete enough to move forward.

## 8. Suggested Next Step

The next best step is to create an **analysis document** that defines:

1. MVP requirements.
2. Combat simulation rules.
3. Data schemas.
4. Balance inputs and outputs.
5. Prototype architecture.
6. First implementation milestones.

The first technical artifact should be a simple combat simulator because it will validate whether Outer Art, Inner Art, and Qi Break create fun fight pacing before building the full game UI.
