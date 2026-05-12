# Path Of Neon Internal Id Migration

This document defines how Path of Neon should migrate legacy internal ids and persisted field names after the display-safe retheme is complete.

Internal id migration is a real product direction, but it must be handled as a compatibility migration. It should not be mixed into casual UI copy changes, because ids and field names are used by saves, static data references, tests, reports, browser storage, PWA caches, and future backend payloads.

## Decision

Migrate legacy Path of Jianghu internal names to Path of Neon internal names through a dedicated migration phase.

Until that phase lands, existing ids and save fields remain valid. After the phase lands, old saves, exports, fixtures, and browser storage must still load through compatibility adapters.

## Scope

Internal names include three different categories.

| Category | Examples | Migration risk |
| --- | --- | --- |
| Static ids | `bamboo_road`, `demon_cult_outpost`, `hero_outer_training`, `inner_defense_down`, `balanced` | Breaks stage unlock refs, save refs, reports, tests, and data validation if renamed without aliasing. |
| Persisted save fields | `silver`, `cultivation`, `herbs`, `combatExperience`, `sect`, `maps`, `innerQi`, `selectedFarmStageId` | Requires a save schema version bump and fixture coverage. |
| Product/runtime keys | `path-of-jianghu.save.v1`, `path-of-jianghu-shell-v1`, `path-of-jianghu.svg`, package/app metadata | Requires dual-read/write or cleanup behavior so existing local players and installed PWAs do not lose state. |

## Migration Principles

- Add explicit alias maps before changing data ids.
- Bump the save schema before changing persisted save fields.
- Preserve legacy import support for all supported save versions.
- Keep archived docs historical unless a link path breaks.
- Prefer compatibility adapters over deleting old names immediately.
- Keep report output comparable during the transition by showing migrated ids and, where useful, legacy aliases.
- Run static validation, save fixtures, web storage tests, simulator reports, and PWA tests in the same migration stage.

## Proposed Migration Order

### 1. Product And Storage Keys

Migrate shell/runtime identity first because it is narrow and easy to test.

| Current | Target |
| --- | --- |
| `package.json` name `path-of-jianghu` | `path-of-neon` |
| `path-of-jianghu.save.v1` | `path-of-neon.save.v1` with old-key read and migration |
| `path-of-jianghu-shell-v1` | `path-of-neon-shell-v1` with old-cache cleanup |
| `public/icons/path-of-jianghu.svg` | `public/icons/path-of-neon.svg` |

Required behavior:

- On load, read the new save key first.
- If no new-key save exists, read the old key.
- If the old key loads successfully, write the migrated save to the new key.
- Do not delete the old key until the new write succeeds.
- Service-worker activation must delete stale old and new shell caches except the current cache.

### 2. Static Content Ids

Migrate static ids after display names are stable.

First confirmed region targets:

| Current id | Target id |
| --- | --- |
| `bamboo_road` | `greenline_approach` or `bamboo_line` |
| `mist_valley` | `veil_district` |
| `black_iron_fort` | `black_iron_foundry` |
| `lotus_monastery` | `lotus_clinic` |
| `demon_cult_outpost` | `redline_outpost` |

The exact Bamboo target should be chosen during the district/faction display retheme. `greenline_approach` reads more like onboarding; `bamboo_line` preserves more history.

Stage ids should migrate with their region prefix:

```text
bamboo_road_1 -> greenline_approach_1
mist_valley_6 -> veil_district_6
demon_cult_outpost_7 -> redline_outpost_7
```

Data migration needs alias maps for:

- region ids;
- stage ids;
- enemy ids;
- hero ids;
- skill ids;
- style ids;
- equipment ids;
- equipment set ids;
- assignment ids;
- medicine ids;
- status ids;
- tactic ids.

Do not migrate all of these in one blind text replacement. Start with region/stage ids, then migrate combat/content ids in smaller slices once display names are final.

Approved display-family targets for style ids after the Stage 2.3 taxonomy decision:

| Current id | Display family | Likely future id |
| --- | --- | --- |
| `fist` | Impact Style | `impact` |
| `palm` | Pulse Style | `pulse` |
| `leg` | Vector Style | `vector` |
| `sword` | Edge Style | `edge` |
| `blade` | Rend Style | `rend` |
| `staff` | Brace Style | `brace` |
| `hidden_weapons` | Ghostware Style | `ghostware` |

These are target directions for the later migration only. Stage 2.3 copy may use the display family names, but `styleId`, `styleMastery`, `styleBranches`, equipment `allowedStyles`, branch unlocks, save fixtures, and tests must keep legacy ids until alias maps and save migration fixtures exist.

### 3. Save Schema Fields

Persisted save fields should migrate after static ids.

Likely target fields:

| Current field | Target field |
| --- | --- |
| `silver` | `credits` |
| `cultivation` | `resonance` |
| `herbs` | `reagents` |
| `combatExperience` | `combatData` |
| `sect` | `technoSect` |
| `maps` | `districts` |
| `selectedFarmStageId` | `selectedFarmRouteId` |
| `selectedOfflineFarmStageId` | `selectedOfflineFarmRouteId` |
| `selectedTacticId` | `selectedRoutineId` only if tactics become routines in UI and data |

Combat stat field migration is larger and should be its own sub-phase:

| Current field family | Target direction |
| --- | --- |
| `outer*` | `body*` or `kinetic*`, depending on whether the field is durability or damage. |
| `inner*` / `*InnerQi` | `context*` or `cognitive*`, depending on whether the field is stability or damage. |
| `qiBreak*` | `aiOverload*`. |
| `innerRecovery*` | `contextRebuild*` or `cognitiveReboot*`, depending on baseline versus boost behavior. |

Do not rename combat stat fields until the naming split is final. `outerAttack` maps more naturally to `kineticAttack`, while `outerHp` maps better to `bodyIntegrity`; a single prefix replacement would make the model less clear.

### 4. Code Symbols And Report Fields

After save and static data migration, code symbols can be renamed in focused modules:

- `core/combat` formula constants and event types;
- `core/progression` resource and stage helper names;
- `core/offline` reward input/output names;
- `core/balance` report row fields;
- `web/state` action and view-model field names;
- `tools/balance` export columns.

For tool exports, consider one transition release where JSON/CSV includes both new and legacy id columns:

```text
stageId, legacyStageId, districtId, legacyRegionId
```

Then remove legacy columns only after downstream docs/tests stop relying on them.

## Save Migration Requirements

The internal id migration must add:

- a new `SAVE_DATA_VERSION`;
- fixture coverage for every supported legacy save version;
- tests proving old region/stage ids migrate to new ids;
- tests proving old resource fields migrate to new fields;
- tests proving invalid old ids are still rejected or normalized intentionally;
- tests proving old-key browser saves migrate to the new browser key without losing offline reward timestamps;
- tests proving export/import supports old saves and emits current-schema saves.

## Validation Requirements

Before marking the migration complete:

```sh
npm run typecheck
npm test
npm run build
npm run simulate
npm run support-decision
git diff --check
```

Additional focused checks:

```sh
rg "path-of-jianghu|bamboo_road|demon_cult_outpost|innerQi|outerHp|cultivation|silver"
```

Expected remaining hits after migration should be limited to:

- migration alias tables;
- legacy save fixtures;
- archived historical docs;
- compatibility tests;
- comments explaining legacy behavior.

## Recommended Backlog Placement

Do not fold the full migration into the first display retheme. Add it after the product shell, vocabulary layer, UI copy retheme, and static display retheme.

Recommended sequence:

1. Stage 2.3: display-safe Path of Neon pivot.
2. Stage 2.4: internal id migration contract and product/storage key migration.
3. Stage 2.5: static id migration.
4. Stage 2.6: save-field and combat-symbol migration.
5. Stage 2.7: first neon-native system prototype if it was not already started.

If the team wants a faster route, combine stages 2.4 and 2.5, but keep save-field and combat-symbol migration separate. That is the highest-risk layer.
