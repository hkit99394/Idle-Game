# Path Of Neon Terminology Map

## Purpose

This map is the display-language contract for the Path of Neon retheme. It keeps mechanics recognizable while allowing player-facing copy, content names, and visual design to move away from pure martial fantasy.

Internal identifiers remain stable until a dedicated migration explicitly changes them. The project direction is to migrate them in compatibility-backed slices, not during casual UI copy replacement. Stage 2.5 has migrated region and route id values such as `greenline_approach` and `redline_outpost`; Stage 2.6 has migrated static content ids such as `greenline_cutter`, `corruption`, `iron_fist_initiate`, `impact_combo`, `impact_training_wraps`, `clear_heart_countermeasure`, `greenline_sweep`, and `balanced_routine`; Stage 2.7 has started migrating owned save resource/progress fields. Static-data fields, test fixture compatibility inputs, API envelope fields, and combat fields may still keep technical names such as `cultivation`, `silver`, `sect`, or `innerQi` until their owning migration stage lands. Legacy storage keys such as `path-of-jianghu.save.v1` remain compatibility aliases after the canonical product/storage key migration.

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
| Sect | Techno-sect / sect | Current saves use `technoSect`; static upgrade scopes and compact UI may still use "sect". |
| Disciple | Initiate | Primary character-role display term. |
| Master | Operator / master | Keep "master" where it preserves Jianghu flavor. |

## Resources And Growth

| Current Term | Path of Neon Term | Migration Rule |
| --- | --- | --- |
| Silver | Credits | Use display term first; current saves use `credits`; static reward fields can still use `silver`. |
| Cultivation | Resonance | Use display term first; current saves use `resonance`; static reward fields can still use `cultivation`. |
| Herbs | Reagents | Use display term first; current saves use `reagents`; static reward fields can still use `herbs`. |
| Combat XP | Combat Data | Preferred main UI display term; current district progress saves use `combatData`; static reward fields can still use `combatExperience`. |
| CP | CP / Combat Power | Keep CP in compact UI. |
| Hero level | Initiate level | Display rename only. |
| Sect upgrades | Techno-sect upgrades | Current saves use `progress.technoSect`; static upgrade ids and `scope: "sect"` remain deferred. |
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
| Fist | Impact Style | Canonical style id is `impact`; legacy alias `fist` remains save/import-compatible. |
| Palm | Pulse Style | Canonical style id is `pulse`; legacy alias `palm` remains save/import-compatible. |
| Leg | Vector Style | Canonical style id is `vector`; legacy alias `leg` remains save/import-compatible. |
| Sword | Edge Style | Canonical style id is `edge`; legacy alias `sword` remains save/import-compatible. |
| Blade | Rend Style | Canonical style id is `rend`; legacy alias `blade` remains save/import-compatible. |
| Staff | Brace Style | Canonical style id is `brace`; legacy alias `staff` remains save/import-compatible. |
| Hidden weapon | Ghostware Style | Canonical style id is `ghostware`; legacy alias `hidden_weapons` remains save/import-compatible. |
| Tank | Anchor | Optional role flavor. |
| Breaker | Breacher | Display rename. |
| Striker | Striker | Can stay. |
| Support | Support / Stabilizer | Use "stabilizer" for Lotus/clinic content. |

Style families and combat roles are separate. Do not use Anchor, Breacher, Striker, or Stabilizer as style names; they describe team jobs. If transitional copy needs old and new terms together, use `Display Family / legacy id` or "Display Family (old lineage)" wording, for example "Impact Style / `fist`" in technical docs or "Impact Style, Iron Fist lineage" in player-facing copy.

## District And Faction Candidates

| Current Display Name | Path of Neon Candidate | Internal Id Rule |
| --- | --- | --- |
| Bamboo Road | Greenline Approach | Canonical region id is `greenline_approach`; legacy alias `bamboo_road` remains import-compatible. |
| Mist Valley | Veil District | Canonical region id is `veil_district`; legacy alias `mist_valley` remains import-compatible. |
| Black Iron Fort | Black Iron Foundry | Canonical region id is `black_iron_foundry`; legacy alias `black_iron_fort` remains import-compatible. |
| Lotus Monastery | Lotus Clinic | Canonical region id is `lotus_clinic`; legacy alias `lotus_monastery` remains import-compatible. |
| Demon Cult Outpost | Redline Outpost | Canonical region id is `redline_outpost`; legacy alias `demon_cult_outpost` remains import-compatible. Reserve Null Context for doctrine/status flavor. |
| Black Iron Guard | Ironwall Guard | Canonical hostile id is `ironwall_guard`; legacy alias `black_iron_guard` remains save/import-compatible. |
| Lotus Mending Disciple | Lotus Stabilizer | Canonical initiate id is `lotus_stabilizer`; legacy alias `lotus_mending_disciple` remains save/import-compatible. |

## Contract Terms That Should Stay Technical

Do not retheme these in schema docs until a migration changes them:

- `SaveData`, `PlayerProgress`, `StaticGameData`
- Static reward fields such as `silver`, `cultivation`, `herbs`, and `combatExperience`
- Legacy save/import compatibility fields such as `sect`, `maps`, `selectedFarmStageId`, and `selectedTacticId`
- `outerHp`, `innerQi`, `maxOuterHp`, `maxInnerQi`
- Static content JSON `id` fields and all save/static reference field names ending in `Id`, including `regionId`, `stageId`, `enemyId`, `heroId`, `skillId`, `styleId`, `equipmentId`, `equipmentSetId`, `assignmentId`, `medicineId`, `statusId`, and `tacticId`. Stage 2.5 migrated region/stage values, but the field names remain technical.
- Exported constants such as `WEB_SAVE_STORAGE_KEY`
- Legacy browser save key `path-of-jianghu.save.v1`, which remains a read/copy compatibility key after the canonical `path-of-neon.save.v1` migration
- Legacy PWA cache prefix `path-of-jianghu-shell-`, which remains a cleanup compatibility prefix after the canonical `path-of-neon-shell-` migration

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

[Archived Stage 2.3 Backlog](archive/stage-2.3-backlog.md) records how this terminology map was applied during the completed display-safe pivot. Use this document as the active display-language source for future copy changes.

Epic 81 settled the first style taxonomy: Impact, Pulse, Vector, Edge, Rend, Brace, and Ghostware are display families for Fist, Palm, Leg, Sword, Blade, Staff, and Hidden Weapons. Preserve legacy style ids and do not rename save/static references until the internal-id migration.

Epic 85 selected Cognitive Intrusion as the first neon-native prototype and District Heat as the preferred second candidate. Future implementation should follow [Cognitive Intrusion Prototype Contract](cognitive-intrusion-prototype-contract.md) before adding these terms to live UI.
