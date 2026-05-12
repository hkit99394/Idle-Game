# Path Of Neon Theme Bible

## Positioning

**Path of Neon** is an idle cyber-sect RPG about building a techno-sect, breaking rival circuits, and surviving the neon underworld.

The retheme should not become generic cyberpunk. The stronger identity is that old hidden-world social order survived into a neon megacity: factions still behave like sects, initiates still train styles, crews still duel over routes and territory, but the visible language is districts, cognitive pressure, augmentation, protocol manuals, black-market clinics, and hostile AI networks.

## Brand Pillars

- **Cyber-sect underworld, not plain sci-fi**: preserve the honor, rivalry, mastery, sect, and hidden-world structure while changing the surface to neon districts and techno-rituals.
- **Readable idle operations**: keep the interface clear and operational. Neon should be an accent and status language, not visual noise.
- **Dual-system combat**: the old Outer/Inner split remains the signature mechanic, rethemed as body integrity versus context stability.
- **Systems should become neon-native**: the retheme should eventually add mechanics that only make sense in Path of Neon: cognitive intrusion, augmentation loadouts, district heat, network operations, black-market protocols, and faction reputation.
- **Compatibility first**: display terms can change before internal ids, save keys, API fields, or static references. Internal ids should still migrate later through a tested compatibility phase.
- **Street-level myth**: factions should feel like old martial lineages wearing new hardware, not anonymous corporations only.

## Design Pivot Mandate

Path of Neon should be a deeper change than a rename. The first implementation pass can be display-safe, but the design direction should move the game toward systems that feel cyber-sect by design.

The old game loop was:

1. Fight stages.
2. Earn silver, cultivation, herbs, equipment, and mastery.
3. Upgrade heroes, sect, skills, medicine, assignments, and tactics.
4. Clear boss gates and unlock regions.

The Path of Neon loop should become:

1. Run routes through contested districts.
2. Extract credits, resonance, reagents, combat data, and protocol fragments.
3. Tune initiates through augment loadouts, cognitive protocols, countermeasure kits, and techno-sect infrastructure.
4. Manage district heat and faction pressure while pushing deeper into hostile networks.
5. Break gatekeepers through coordinated Kinetic/Cognitive tactics.
6. Join future online AI raids where server-authoritative attempts contribute to shared event bosses.

The compatibility plan protects the current engine, but future epics should make the cyber layer real through new player choices and content pressure.

## Neon-Native Systems

These systems are the recommended deeper design targets. They should be introduced in later epics after the safe display retheme is complete.

| System | Player Value | Reuses Current Surface | New Design Work |
| --- | --- | --- | --- |
| Cognitive Intrusion | Makes Cognitive Art feel like hostile AI/context pressure rather than renamed Qi damage. | Inner damage, AI Overload, statuses, target rules. | Add intrusion statuses, firewall-style counterplay, and enemies that punish careless Cognitive builds. |
| Augment Loadouts | Gives equipment a tech identity and creates build choices beyond stat bumps. | Equipment slots, affixes, set bonuses, CP, style branches. | Split gear fantasy into implants, plating, weapons, protocol manuals, and countermeasure kits. |
| District Heat | Makes idle farming and route choice feel like underworld operations. | Regions, stages, offline farms, assignments, boss gates. | Add heat/attention as a district pressure track that changes rewards, risk, or enemy pressure. |
| Network Operations | Turns assignments into more than passive patrol/training. | Assignments, offline rewards, hero eligibility, mastery XP. | Add operation types such as Sweep, Scrape, Jam, Calibrate, and Clinic Shift with different outputs. |
| Protocol Decks | Makes tactics and skill upgrades feel like configured combat routines. | Tactic presets, skill upgrades, selected tactic save field. | Add protocol families or loadout restrictions after the UI copy layer is stable. |
| Countermeasure Economy | Gives medicine a cyber identity and clearer strategic tradeoffs. | Medicines, auto-medicine policy, status counterplay, herbs. | Rename to countermeasures/stims first, then add targeted anti-overload tools. |
| Faction Reputation | Makes districts and sects feel socially alive. | Region progress, boss clears, unlocks. | Add reputation or contact tracks only after current save/cloud contracts are ready. |
| AI Raid Events | Makes online boss direction native to the new theme. | Epic 77 online boss decision, deterministic combat, cloud-save envelope. | Build async server-authoritative event bosses as hostile AI raids, not generic boss fights. |

Prototype order: start with **Cognitive Intrusion**, then follow with **District Heat**. Cognitive Intrusion gives the combat system an immediate Path of Neon identity by making Context Stability, AI Overload, and hostile AI pressure matter. District Heat should follow once route/offline economy pacing is ready for a broader progression change.

## Content Transformation Strategy

Do not only rename Bamboo Road to Bamboo Line. Each district should gain a new job in the game:

| Current Area | Path of Neon Role | Deeper Change Target |
| --- | --- | --- |
| Bamboo Road | Greenline edge route where old training traditions meet neon infrastructure. | Teach route running, credits/resonance, Body Integrity, Context Stability, and first AI Overload. |
| Mist Valley | Veil District, a context-scrambled market of needlers and misdirection crews. | Introduce accuracy, evasion, target manipulation, and context disruption enemies. |
| Black Iron Fort | Black Iron Foundry, an industrial armor and plating syndicate. | Make guard, plating, protection, and Kinetic damage checks more explicit. |
| Lotus Monastery | Lotus Clinic, a legal-illegal stabilization network. | Turn support identity into purge, Context Rebuild, trauma care, and countermeasure craft. |
| Demon Cult Outpost | Redline Outpost, a hostile overload doctrine and corruption cell. | Make status pressure feel like malware, feedback, context burn, and anti-countermeasure pressure. |

## Player-Facing System Promise

When the deeper pivot is working, players should be able to say:

- "I need more Context Stability before I run that district."
- "This route is heating up, so I should switch operations."
- "The Foundry punishes weak plating; bring an Anchor role and Kinetic breach."
- "The Clinic stabilizer build counters Redline corruption."
- "This raid seed wants an AI Overload opener, but the leaderboard rewards clean clear time."

## Tone

Use terse, vivid, technical language with a little ritual edge.

Good tone:

- "AI Overload opens a finishing window."
- "The Lotus Clinic stabilizes corrupted channels."
- "Ironwall crews hold the front route with plated bodies and guard protocols."
- "Resonance lets initiates refine styles and upgrade combat scripts."

Avoid:

- Pure corporate jargon with no sect identity.
- Overexplained cyber terms that make the game sound like enterprise software.
- A one-note noir voice that makes every panel gloomy.
- Replacing every martial term when a compact word like "style", "mastery", or "sect" still carries useful flavor.

## Core Flavor Rules

- Product name: **Path of Neon**.
- World and product identity: use **Path of Neon**. Use **neon underworld** only as a descriptive setting phrase when needed. Do not use "Neon Jianghu" in player-facing or lore-facing copy.
- Player group: **techno-sect** in prose; **sect** is still acceptable in compact UI when space matters.
- Player characters: **initiates** by default, with "runner" or "disciple" available for faction flavor.
- Current internal ids and save fields remain legacy-compatible until the dedicated [Path Of Neon Internal Id Migration](path-of-neon-internal-id-migration.md) changes them.

## Combat Language

| Current Language | Path of Neon Language | Notes |
| --- | --- | --- |
| Outer Art | Kinetic Art | Physical/body pressure. |
| Inner Art | Cognitive Art | AI/context pressure. |
| Outer HP | Body Integrity | Main defeat bar. |
| Inner Qi | Context Stability | Secondary collapse bar. |
| Qi Break | AI Overload | Signature vulnerability window. |
| Qi Suppression | Context Suppression | Status display rename. |
| Break Power | Breach Power | Offensive collapse pressure. |
| Break Resistance | Overload Resist | Defensive collapse resistance. |
| Inner Recovery | Context Rebuild | Baseline restoration after AI Overload. |
| Inner recovery boost | Cognitive Reboot | Skill, protocol, or countermeasure effect that accelerates Context Rebuild. |
| Outer damage | Kinetic damage | UI can still use "damage" where compact. |
| Inner damage | Cognitive damage | UI can still use "context pressure" in flavor. |

## Progression Language

| Current Language | Path of Neon Language | Notes |
| --- | --- | --- |
| Silver | Credits | Currency display first; migrate `silver` to `credits` during save-field migration. |
| Cultivation | Resonance | Growth resource first; migrate `cultivation` to `resonance` during save-field migration. |
| Herbs | Reagents | Countermeasure resource first; migrate `herbs` to `reagents` during save-field migration. |
| Combat XP | Combat Data | Preferred main UI term; "Combat XP" can remain only in technical/schema panels when needed. |
| CP | CP / Combat Power | Keep CP unless a later UI pass needs "Power". |
| Sect upgrades | Techno-sect upgrades | Keep internal `sect` until save-field migration. |
| Hero upgrades | Initiate upgrades | Use when character copy changes. |
| Skill upgrades | Protocol upgrades | Good for cyber-facing panels. |
| Style mastery | Protocol Mastery | Use when style families are rethemed. |
| Map mastery | District Mastery | Regions become districts. |
| Assignments | Operations | Offline jobs. |
| Patrol | Sweep | Assignment flavor. |
| Training | Calibration | Assignment flavor. |

## Content Language

| Current Language | Path of Neon Direction | Notes |
| --- | --- | --- |
| Regions | Districts | Keep `regionId` stable until static id/save-field migration. |
| Stages | Routes / nodes | "Route" already fits current UI. |
| Martial manuals | Protocol manuals / combat scripts | Keep internal `manual` until equipment-slot migration. |
| Medicine | Countermeasures / stims | Keep internal `medicine` until equipment-slot migration. |
| Weapon | Weapon | Can stay direct. |
| Armor | Plating / armor | Use "plating" for cyber sets. |
| Fist | Impact Style | Kinetic body pressure. Keep old Fist lineage in flavor when useful. |
| Palm | Pulse Style | Cognitive/context pressure and support channels. Keep old Palm lineage in flavor when useful. |
| Leg | Vector Style | Speed, positioning, and route control. Keep old Leg lineage in flavor when useful. |
| Sword | Edge Style | Hybrid precision, dueling, and overload exploitation. Keep old Sword lineage in flavor when useful. |
| Blade | Rend Style | Heavy Kinetic burst, trauma, and cleave pressure. Keep Blade lineage visible for weapon flavor. |
| Staff | Brace Style | Guard, intercept, control, and stabilization. Keep Staff lineage in flavor when useful. |
| Hidden Weapons | Ghostware Style | Covert needles, delayed pressure, status, and weak-point attacks. |
| Guard | Guard | Keep for clarity. |
| Protect | Intercept / protect | "Protect" is clear in compact UI. |
| Armor Break | Plating Break | Display rename. |
| Wound | Trauma | Optional display rename. |
| Cleanse | Purge | Strong cyber-countermeasure term. |

## Faction And District Direction

Use these as first-pass display names; do not rename ids until a migration stage explicitly approves it.

| Current Area | Path of Neon Candidate | Identity |
| --- | --- | --- |
| Bamboo Road | Bamboo Line / Greenline Approach | First route, old city edge, accessible training ground. |
| Mist Valley | Veil District / Mistline | Evasion, context disruption, precision pressure. |
| Black Iron Fort | Black Iron Foundry / Ironwall Node | Armor, guard, defense pressure. |
| Lotus Monastery | Lotus Clinic / Lotus Sanctuary | Healing, purge, support counterplay. |
| Demon Cult Outpost | Redline Outpost / Redline Cult | Status pressure, corruption, hostile overload doctrine. `Null Context` can remain doctrine/status flavor. |

## Visual Direction

Use a varied neon palette without turning the app into a single purple/blue gradient:

- Graphite and near-black for structure.
- Off-white or pale green-white for readable text.
- Electric cyan for cognitive/context systems.
- Acid green for recovery/purge.
- Hot magenta for hostile corruption.
- Warning amber for rewards, route attention, and danger.
- Deep red for severe damage/status only.

Cards, dashboards, and repeated controls should stay dense and readable. The game is an idle management surface, not a marketing landing page.

## Copy Rules

- Prefer the new display terms in player-facing text once the UI copy epic starts.
- Keep internal field names in technical docs when describing schema or API contracts.
- If a term is both player-facing and persisted, write it as `internalField` / Display Term in docs.
- Keep future mechanic terms out of player-facing UI until the corresponding mechanic exists.
- Do not rewrite archived backlogs. They are historical records of the Path of Jianghu era.
- Any future data rename must distinguish `id` stability from `name` display changes.

## Style Taxonomy

Stage 2.3 uses **style families** as the player-facing layer and keeps legacy martial style ids as compatibility keys. The family names should feel like cyber-sect protocol lineages, not combat roles. Roles such as Anchor, Breacher, Striker, and Stabilizer describe what a combatant does in a team; style families describe how they express power.

| Legacy Style | Display Family | Combat Read |
| --- | --- | --- |
| Fist | Impact Style | Kinetic body pressure, bruising, plating breaks, and durable close work. |
| Palm | Pulse Style | Cognitive/context pressure, overload setup, recovery channels, and Lotus stabilization. |
| Leg | Vector Style | Speed, positioning, pursuit, evasion, and route-control techniques. |
| Sword | Edge Style | Hybrid precision, dueling, crit windows, and AI Overload exploitation. |
| Blade | Rend Style | Heavy Kinetic burst, trauma, cleave, and Redline/Foundry pressure. |
| Staff | Brace Style | Guard, intercept, control, front-line stability, and protection. |
| Hidden Weapons | Ghostware Style | Needles, covert payloads, delayed pressure, status, and weak-point attacks. |

Use old martial terms as lineage flavor rather than primary UI taxonomy when space allows: "Impact Style: Iron Fist lineage" is clearer than erasing Fist everywhere or exposing only `fist`. Do not rename `styleId`, static style ids, saved style mastery keys, equipment `allowedStyles`, branch ids, or tests until the internal-id migration handles aliases and fixtures.

Style mastery should display as **Protocol Mastery** when the surrounding UI is fully rethemed. If a panel needs both layers during transition, write it as "Protocol Mastery (Impact / Fist lineage)" rather than inventing separate mastery systems.

## Stage 2.3 Contract Handoff

[Archived Stage 2.3 Backlog](archive/stage-2.3-backlog.md) records the completed implementation pass for this theme contract. Epics 79-88 covered the display-safe pivot; later migration work belongs in [Path Of Neon Internal Id Migration](path-of-neon-internal-id-migration.md) unless Stage 2.3 is explicitly reopened.

Epic 81 completed the initial style taxonomy. Broad style-bearing copy should use the style-family display names above, keep old martial terms as lineage flavor where useful, and avoid role-forward labels as style replacements.

Epic 85 selected Cognitive Intrusion first, with District Heat second. Use [Cognitive Intrusion Prototype Contract](cognitive-intrusion-prototype-contract.md) for the implementation boundary: one status/effect path that enriches Context Stability and AI Overload without save-field, storage-key, or internal-id migration.
