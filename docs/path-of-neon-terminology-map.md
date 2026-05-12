# Path Of Neon Terminology Map

## Purpose

This map is the display-language contract for the Path of Neon retheme. It keeps mechanics recognizable while allowing player-facing copy, content names, and visual design to move away from pure martial fantasy.

Internal identifiers remain stable until a dedicated migration explicitly changes them. The project direction is to migrate them, but not during casual UI copy replacement. In particular, save fields, storage keys, static ids, test fixture keys, and API envelope fields may keep legacy names such as `cultivation`, `silver`, `sect`, `innerQi`, `bamboo_road`, or `path-of-jianghu.save.v1` until the migration plan in [Path Of Neon Internal Id Migration](path-of-neon-internal-id-migration.md) is implemented.

Use this map in three different ways:

- **Approved display terms** may be used in player-facing copy once the relevant UI/content epic starts.
- **Technical contract terms** must stay literal in schema, save, data, and backend docs until the dedicated internal-id migration changes them.
- **Future mechanic vocabulary** is conceptual only. Do not use those terms in player-facing UI until the mechanic exists.

## Product And World

| Current Term | Path of Neon Term | Migration Rule |
| --- | --- | --- |
| Path of Jianghu | Path of Neon | Product/app display name. |
| Jianghu | Path of Neon / neon underworld | Use Path of Neon for product/world identity. "Neon underworld" is only a descriptive setting phrase; do not use "Neon Jianghu". |
| Martial idle RPG | Cyber-sect idle RPG / Path of Neon idle RPG | README/marketing language. |
| Sect | Techno-sect / sect | Keep `sect` until save-field migration; compact UI may still use "sect". |
| Disciple | Initiate | Primary character-role display term. |
| Master | Operator / master | Keep "master" where it preserves Jianghu flavor. |

## Resources And Growth

| Current Term | Path of Neon Term | Migration Rule |
| --- | --- | --- |
| Silver | Credits | Use display term first; migrate `silver` to `credits` during save-field migration. |
| Cultivation | Resonance | Use display term first; migrate `cultivation` to `resonance` during save-field migration. |
| Herbs | Reagents | Use display term first; migrate `herbs` to `reagents` during save-field migration. |
| Combat XP | Combat Data | Preferred main UI display term; migrate `combatExperience` to `combatData` during save-field migration. |
| CP | CP / Combat Power | Keep CP in compact UI. |
| Hero level | Initiate level | Display rename only. |
| Sect upgrades | Techno-sect upgrades | Keep `progress.sect` until save-field migration. |
| Skill upgrades | Protocol upgrades | Keep skill upgrade ids until static id migration. |
| Style mastery | Protocol Mastery | Display term first; migrate ids/fields during the internal-id migration. |
| Map mastery | District Mastery | Display term first; migrate map/district fields during the internal-id migration. |
| Realm breakthroughs | System breakthroughs | Future content term. |

## Combat

| Current Term | Path of Neon Term | Migration Rule |
| --- | --- | --- |
| Outer Art | Kinetic Art | Display rename. |
| Inner Art | Cognitive Art | Display rename. |
| Outer HP | Body Integrity | Display term first; migrate `outerHp` / `maxOuterHp` only after combat stat naming is final. |
| Inner Qi | Context Stability | Display term first; migrate `innerQi` / `maxInnerQi` only after combat stat naming is final. |
| Qi Break | AI Overload | Display term first; migrate event/internal names during combat-symbol migration. |
| Qi Broken | Overloaded | Display rename. |
| Qi Suppression | Context Suppression | Display rename. |
| Inner Defense Down | Context Defense Down | Display rename. |
| Break Power | Breach Power | Display rename. |
| Break Resistance | Overload Resist | Display rename. |
| Inner Recovery | Context Rebuild | Baseline post-overload recovery. |
| Inner recovery boost | Cognitive Reboot | Skill, protocol, or countermeasure effect that accelerates Context Rebuild. |
| Backlash | Feedback | Optional display rename. |
| Armor Break | Plating Break | Display rename. |
| Wound | Trauma | Optional display rename. |
| Guard | Guard | Keep for clarity. |
| Protect | Intercept / Protect | Use "intercept" in flavor, "protect" in compact UI. |
| Cleanse | Purge | Display rename for counterplay. |
| Regeneration | Regen / Stabilization | Contextual. |

## Content And Items

| Current Term | Path of Neon Term | Migration Rule |
| --- | --- | --- |
| Region | District | Keep `regionId` until static id/save-field migration. |
| Stage | Route / node | Keep `stageId` until static id/save-field migration; "route" fits current UI. |
| Boss | Gatekeeper / boss | Boss can stay in compact UI. |
| Enemy | Rival / hostile | Contextual. |
| Hero | Initiate / operative | "Hero" can stay in technical docs. |
| Weapon | Weapon | No required rename. |
| Armor | Plating / armor | Display rename by item flavor. |
| Manual | Protocol manual / combat script | Keep equipment slot `manual` until equipment-slot migration. |
| Medicine | Countermeasure / stim | Keep equipment slot `medicine` until equipment-slot migration. |
| Equipment set | Loadout set | Optional display rename. |
| Assignment | Operation | Display rename. |
| Patrol assignment | Sweep operation | Display rename. |
| Training assignment | Calibration operation | Display rename. |
| Tactic preset | Tactic / routine | Keep tactic ids until static id migration; migrate to routines only if the UI/data term is approved. |

## Styles And Roles

| Current Term | Path of Neon Term | Migration Rule |
| --- | --- | --- |
| Fist | Needs style naming pass | Do not lock to Impact yet; preserve old-style mapping and combat readability. |
| Palm | Needs style naming pass | Do not lock to Pulse yet; preserve old-style mapping and combat readability. |
| Sword | Needs style naming pass | Do not lock to Edge yet; preserve old-style mapping and combat readability. |
| Staff | Needs style naming pass | Do not lock to Ward/Brace yet; preserve guardian/support readability. |
| Blade | Blade | Can stay. |
| Hidden weapon | Ghostware / hidden weapon | Future content. |
| Tank | Anchor | Optional role flavor. |
| Breaker | Breacher | Display rename. |
| Striker | Striker | Can stay. |
| Support | Support / Stabilizer | Use "stabilizer" for Lotus/clinic content. |

## District And Faction Candidates

| Current Display Name | Path of Neon Candidate | Internal Id Rule |
| --- | --- | --- |
| Bamboo Road | Bamboo Line / Greenline Approach | Keep `bamboo_road`. |
| Mist Valley | Veil District / Mistline | Keep `mist_valley`. |
| Black Iron Fort | Black Iron Foundry / Ironwall Node | Keep `black_iron_fort`. |
| Lotus Monastery | Lotus Clinic / Lotus Sanctuary | Keep `lotus_monastery`. |
| Demon Cult Outpost | Redline Outpost / Redline Cult | Keep `demon_cult_outpost`; reserve Null Context for doctrine/status flavor. |
| Black Iron Guard | Ironwall Guard | Keep enemy ids. |
| Lotus Mending Disciple | Lotus Stabilizer | Keep hero ids. |

## Contract Terms That Should Stay Technical

Do not retheme these in schema docs until a migration changes them:

- `SaveData`, `PlayerProgress`, `StaticGameData`
- `silver`, `cultivation`, `herbs`, `combatExperience`
- `sect`, `maps`, `selectedFarmStageId`, `selectedTacticId`
- `outerHp`, `innerQi`, `maxOuterHp`, `maxInnerQi`
- All static JSON `id` fields and all save/static reference fields ending in `Id`, including `regionId`, `stageId`, `enemyId`, `heroId`, `skillId`, `styleId`, `equipmentId`, `equipmentSetId`, `assignmentId`, `medicineId`, `statusId`, and `tacticId`
- Exported constants such as `WEB_SAVE_STORAGE_KEY`
- Browser save key `path-of-jianghu.save.v1`
- Existing PWA cache prefix `path-of-jianghu-shell-` until a cache migration handles old and new prefixes

Migration targets and ordering are tracked in [Path Of Neon Internal Id Migration](path-of-neon-internal-id-migration.md).

## Deeper Mechanic Vocabulary

These terms are not replacements for existing UI copy. They are candidates for future mechanics once the display retheme is safe.

Do not ship these terms in player-facing UI, manifest copy, onboarding text, or marketing blurbs until the corresponding mechanic is implemented or explicitly announced as planned. Otherwise the retheme will promise systems the game does not yet have.

| New Term | Meaning | Possible Mechanic |
| --- | --- | --- |
| District Heat | Attention generated by repeated or risky route operations. | Higher rewards and higher enemy/status pressure, or temporary farming penalties. |
| Cognitive Intrusion | Offensive Cognitive Art that disrupts an enemy system before damage lands. | Status family that reduces Context Stability, delays Context Rebuild, or opens AI Overload windows. |
| Firewall | Defensive context layer on enemies or bosses. | Cognitive damage reduction, context status resistance, or required breach threshold. |
| Trace | Consequence of failed or noisy operations. | Increases district heat or triggers elite encounters. |
| Augment Loadout | Character equipment identity beyond weapon/armor/manual. | Implants, plating, protocol manuals, countermeasure kits. |
| Protocol Deck | Configured combat routine set. | Future expansion of tactic presets and skill upgrades. |
| Black-Market Contact | Non-combat unlock track. | Vendors, countermeasure recipes, event access, or operation bonuses. |
| AI Raid | Online boss/event framing. | Async server-authoritative boss attempts with polling and leaderboard contribution. |
| Purge Window | Support/countermeasure timing. | Strong cleanse or resistance effect after AI Overload/status events. |
| Calibration Debt | Cost of overusing risky augments. | Future balancing lever if augment power needs tradeoffs. |

## UI Copy Inventory

Before changing player-facing copy, inventory these sources:

- Hard-coded app/status text in `web/app/*`.
- View-model formatted labels in `web/state/viewModels/*`.
- Feature panel headings, aria labels, buttons, and empty states in `web/features/*`.
- Static data `name`, `description`, `role`, and display fields in `data/*.json`.
- Product-shell strings in `package.json`, `index.html`, `public/manifest.webmanifest`, `public/service-worker.js`, `public/icons/*`, and `web/state/saveStorage.ts`.
- Tool and report output under `tools/`, plus docs that quote simulator/report text.
- Tests that assert display strings, especially PWA, view-model, responsive smoke, save tool, data, and tooling tests.

Prefer a small theme vocabulary/formatter layer before broad string replacement so repeated terms like Body Integrity, Context Stability, AI Overload, Context Rebuild, Resonance, Credits, and District Mastery stay consistent.

## Stage 2.3 Handoff

[Stage 2.3 Backlog](stage-2.3-backlog.md) is the active execution plan for this terminology map. Use this document as the display-language source while Epics 80, 82, 83, and 84 change product-shell, vocabulary, UI, and static-data display text.

Epic 81 must settle the style rows marked "Needs style naming pass" before broad style-bearing copy changes. Until then, preserve legacy style ids and avoid replacing every style reference with provisional names such as Impact, Pulse, Edge, or Ward.

Epic 85 must settle the first neon-native prototype contract before future mechanic terms appear in live UI. Cognitive Intrusion is the preferred first candidate; District Heat should remain the preferred second candidate unless the prototype review changes that order.
