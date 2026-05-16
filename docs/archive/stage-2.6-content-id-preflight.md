# Stage 2.6 Content Id Preflight

## Status

Slice 91.1 is complete, and Stage 2.6 is complete. This archived preflight records the implementation contract used by the alias, save-migration, static-data, report, and compatibility slices.

This document does not rename data. It classifies the current configured content ids, the target ids, the persisted fields that can contain those ids, and the legacy terms that must stay deferred to later save-field or combat-symbol stages.

## Owned Surfaces

| Category | Configured ids | Static references | Persisted/report references |
| --- | ---: | --- | --- |
| Hostile families | 5 | `data/enemies.json:family` | Battle report grouping and mastery family modifiers |
| Hostiles | 26 | `data/enemies.json:id`, `data/stages.json:enemyTeam.combatantIds` | Battle events, simulator reports, fixtures |
| Initiates | 5 | `data/heroes.json:id`, style branch hero unlocks | `progress.heroes`, `activeHeroIds`, `formation`, equipment owners, assignment hero lists |
| Protocols | 28 | `data/skills.json:id`, hero/enemy `skillIds`, upgrade `skillId` refs | Battle events and simulator/report rows |
| Skill upgrades | 5 | `data/skillUpgrades.json:id` | `progress.skillUpgrades` |
| Styles | 7 | `data/styles.json:id`, hero/enemy `style`, equipment/assignment `allowedStyles`, branch style unlocks | `progress.styleMastery`, `progress.styleBranches` keys |
| Style branches | 7 | `data/styles.json:branches[].id` | `progress.styleBranches` selected branch values |
| Augments | 14 | `data/equipment.json:id`, stage drops, assignment equipment rewards | `progress.equipment.inventory`, `progress.equipment.equipped` values |
| Augment sets | 1 | `data/equipmentSets.json:id`, equipment `setId` refs | Derived loadout/set reporting |
| Countermeasures | 3 | `data/medicines.json:id` | `progress.medicineInventory`, `autoMedicinePreferences.disabledMedicineIds`, auto-medicine reports |
| Statuses | 5 | `data/statusEffects.json:id`, skill `apply_status.statusId`, balance expected status ids | Battle records, status presentation, simulator/balance reports |
| Operations | 4 | `data/assignments.json:id` | `progress.assignments` keys |
| Routines | 6 | `data/tactics.json:id` | `progress.selectedTacticId`, explicit battle inputs, simulator exports |

## Persisted Content-Id Fields

Stage 2.6 save migration should normalize values in these fields and preserve their field names:

| Save path | Stored content id |
| --- | --- |
| `progress.heroes` keys | Initiate ids |
| `progress.activeHeroIds[]` | Initiate ids |
| `progress.formation` values | Initiate ids |
| `progress.styleMastery` keys | Style ids |
| `progress.styleBranches` keys | Style ids |
| `progress.styleBranches` values | Style branch ids |
| `progress.skillUpgrades` keys | Skill upgrade ids |
| `progress.equipment.inventory` keys | Augment ids |
| `progress.equipment.equipped` keys | Initiate ids |
| `progress.equipment.equipped[heroId][slot]` values | Augment ids |
| `progress.medicineInventory` keys | Countermeasure ids |
| `progress.assignments` keys | Operation ids |
| `progress.assignments[assignmentId].heroIds[]` | Initiate ids |
| `progress.selectedTacticId` | Routine ids |
| `autoMedicinePreferences.disabledMedicineIds[]` | Countermeasure ids |

These persisted fields are deferred and must not be renamed in Stage 2.6: `progress.heroes`, `progress.sect`, `progress.maps`, `progress.currentStageId`, `progress.resources.silver`, `progress.resources.cultivation`, `progress.resources.herbs`, `combatExperience`, `selectedOfflineFarmStageId`, `offlineFarmPreset`, and `selectedTacticId`.

## Target Matrix

Decision meanings:

- **Migrate**: create a compatibility alias and later move canonical static/save values to the target id.
- **Keep**: no alias is required for this id in Stage 2.6; the current id is already acceptable or intentionally retained.
- **Defer**: not a configured content id for Stage 2.6; leave it for a later save-field, combat-symbol, or cleanup slice.

### Hostile Families

| Current id | Target id | Decision | Reason |
| --- | --- | --- | --- |
| `bandit` | `greenline` | Migrate | Old faction bucket for Greenline enemies. |
| `mist_valley` | `veil_district` | Migrate | Old district family. |
| `iron_fort` | `ironwall` | Migrate | Old fort family; current display uses Ironwall. |
| `lotus_monastery` | `lotus_clinic` | Migrate | Region migrated to Lotus Clinic. |
| `demon_cult` | `redline` | Migrate | Redline is the approved faction direction. |

### Hostiles

| Current id | Target id | Decision | Reason |
| --- | --- | --- | --- |
| `bamboo_bandit` | `greenline_cutter` | Migrate | Display name already Greenline Cutter. |
| `mist_palm_thug` | `veil_pulse_bruiser` | Migrate | Old style term. |
| `black_iron_guard` | `ironwall_guard` | Migrate | Display name already Ironwall Guard. |
| `mist_valley_acolyte` | `veil_district_acolyte` | Migrate | Old district prefix. |
| `veilstep_needler` | `veilstep_needler` | Keep | Already Path of Neon. |
| `fog_staff_ward` | `fogline_brace_ward` | Migrate | Old style term. |
| `mist_palm_adept` | `veil_pulse_adept` | Migrate | Old district/style terms. |
| `mist_valley_elder` | `veil_district_elder` | Migrate | Old district prefix. |
| `iron_fort_sentry` | `ironwall_sentry` | Migrate | Old fort prefix. |
| `shieldwall_guard` | `shieldwall_guard` | Keep | Already approved display term. |
| `black_iron_saber` | `ironwall_saber` | Migrate | Aligns with the Ironwall enemy line. |
| `forge_chain_hook` | `forge_chain_hook` | Keep | Already Path of Neon. |
| `iron_armor_captain` | `iron_plating_captain` | Migrate | Display name already Iron Plating Captain. |
| `black_fort_commander` | `black_foundry_commander` | Migrate | Representative Epic 91 target. |
| `lotus_outer_disciple` | `lotus_kinetic_initiate` | Migrate | Old role/art term. |
| `lotus_mender` | `lotus_clinic_stabilizer` | Migrate | Avoids colliding with the initiate target `lotus_stabilizer`. |
| `lotus_staff_keeper` | `lotus_brace_keeper` | Migrate | Old style term. |
| `jade_needle_sister` | `jade_needle_operator` | Migrate | Display role changed. |
| `lotus_sword_warden` | `lotus_edge_warden` | Migrate | Old style term. |
| `lotus_abbot` | `lotus_clinic_director` | Migrate | Display name already Lotus Clinic Director. |
| `miasma_palm_apprentice` | `miasma_pulse_apprentice` | Migrate | Old style term. |
| `blood_brand_duelist` | `blood_brand_duelist` | Keep | Already Redline-compatible. |
| `marrow_lock_supplicant` | `marrow_lock_supplicant` | Keep | Already Redline-compatible. |
| `burning_blood_captain` | `burning_blood_captain` | Keep | Burning Blood stays Redline doctrine/status flavor. |
| `demon_cult_ritualist` | `redline_ritualist` | Migrate | Representative Epic 91 target. |
| `demon_cult_overseer` | `redline_overseer` | Migrate | Representative Epic 91 target. |

### Initiates

| Current id | Target id | Decision | Reason |
| --- | --- | --- | --- |
| `iron_fist_disciple` | `iron_fist_initiate` | Migrate | Keeps lineage flavor and changes the role term. |
| `azure_palm_monk` | `azure_pulse_monk` | Migrate | Old style term. |
| `white_crane_swordsman` | `white_crane_edge_runner` | Migrate | Old role/style term. |
| `mountain_staff_guardian` | `mountain_brace_guardian` | Migrate | Old style term. |
| `lotus_mending_disciple` | `lotus_stabilizer` | Migrate | Representative Epic 91 target. |

### Protocols

| Current id | Target id | Decision | Reason |
| --- | --- | --- | --- |
| `basic_strike` | `baseline_strike` | Migrate | Display name already Baseline Strike. |
| `iron_fist_combo` | `impact_combo` | Migrate | Representative Epic 91 target. |
| `meridian_shock` | `context_shock` | Migrate | Representative Epic 91 target. |
| `white_crane_slash` | `white_crane_edge` | Migrate | Old attack verb. |
| `sweeping_staff` | `brace_sweep` | Migrate | Representative Epic 91 target. |
| `bandit_cut` | `cutter_strike` | Migrate | Old faction term. |
| `guarding_saber` | `guarding_saber` | Keep | No approved display rename yet. |
| `mist_palm_jab` | `veil_pulse_jab` | Migrate | Old district/style terms. |
| `needle_flurry` | `needle_flurry` | Keep | Already acceptable Ghostware flavor. |
| `fog_staff_guard` | `fogline_brace_guard` | Migrate | Old style term. |
| `cloud_meridian_press` | `cloud_context_press` | Migrate | Old energy term. |
| `valley_heart_seal` | `valley_context_seal` | Migrate | Old energy term. |
| `shieldwall_chop` | `shieldwall_chop` | Keep | Already approved display term. |
| `fortress_staff_lock` | `fortress_brace_lock` | Migrate | Old style term. |
| `black_iron_counter` | `black_iron_counter` | Keep | Black Iron remains a lore/location noun. |
| `chain_hook_pressure` | `chain_hook_pressure` | Keep | Already Path of Neon. |
| `iron_wall_command` | `iron_wall_command` | Keep | Display name still Iron Wall Command. |
| `black_fort_edict` | `black_foundry_edict` | Migrate | Representative Epic 91 target. |
| `lotus_recovery_palm` | `lotus_stabilizer_pulse` | Migrate | Old style term. |
| `lotus_staff_shelter` | `lotus_brace_shelter` | Migrate | Old style term. |
| `jade_needle_flurry` | `jade_needle_flurry` | Keep | Already Path of Neon. |
| `tranquil_bloom_seal` | `tranquil_bloom_seal` | Keep | Lotus flavor, no technical conflict. |
| `abbot_lotus_vow` | `director_lotus_vow` | Migrate | Display role changed. |
| `lotus_mending_vow` | `lotus_stabilizer_vow` | Migrate | Representative Epic 91 target. |
| `miasma_palm` | `miasma_pulse` | Migrate | Old style term. |
| `blood_brand_cut` | `blood_brand_cut` | Keep | Already Redline-compatible. |
| `marrow_lock_hex` | `marrow_lock_hex` | Keep | Already Redline-compatible. |
| `burning_blood_edict` | `burning_blood_edict` | Keep | Burning Blood stays Redline doctrine/status flavor. |

### Skill Upgrades

| Current id | Target id | Decision | Reason |
| --- | --- | --- | --- |
| `iron_fist_combo_refinement` | `impact_combo_refinement` | Migrate | Follows migrated protocol id. |
| `meridian_shock_refinement` | `context_shock_refinement` | Migrate | Follows migrated protocol id. |
| `white_crane_slash_refinement` | `white_crane_edge_refinement` | Migrate | Follows migrated protocol id. |
| `sweeping_staff_refinement` | `brace_sweep_refinement` | Migrate | Follows migrated protocol id. |
| `lotus_mending_vow_refinement` | `lotus_stabilizer_vow_refinement` | Migrate | Follows migrated protocol id. |

### Styles

| Current id | Target id | Decision | Reason |
| --- | --- | --- | --- |
| `fist` | `impact` | Migrate | Approved style family. |
| `palm` | `pulse` | Migrate | Approved style family. |
| `leg` | `vector` | Migrate | Approved style family. |
| `sword` | `edge` | Migrate | Approved style family. |
| `blade` | `rend` | Migrate | Approved style family. |
| `staff` | `brace` | Migrate | Approved style family. |
| `hidden_weapons` | `ghostware` | Migrate | Approved style family. |

### Style Branches

| Current id | Target id | Decision | Reason |
| --- | --- | --- | --- |
| `iron_body_fist` | `iron_body_impact` | Migrate | Follows migrated style id. |
| `cloud_meridian_palm` | `cloud_context_pulse` | Migrate | Follows migrated style id. |
| `wind_step_leg` | `wind_step_vector` | Migrate | Follows migrated style id. |
| `white_crane_sword` | `white_crane_edge_branch` | Migrate | Avoids colliding with protocol target `white_crane_edge`. |
| `black_iron_blade` | `black_iron_rend` | Migrate | Follows migrated style id. |
| `mountain_guard_staff` | `mountain_guard_brace` | Migrate | Follows migrated style id. |
| `rain_needle_art` | `rain_needle_ghostware` | Migrate | Follows migrated style id. |

### Augments

| Current id | Target id | Decision | Reason |
| --- | --- | --- | --- |
| `training_wraps` | `impact_training_wraps` | Migrate | Display name already Impact Training Wraps. |
| `willow_palm_manual` | `willow_pulse_protocol` | Migrate | Representative Epic 91 target. |
| `crane_edge_sword` | `crane_edge_cutter` | Migrate | Display name already Crane Edge Cutter. |
| `guardian_staff` | `guardian_brace_staff` | Migrate | Old style term. |
| `woven_travel_robe` | `woven_travel_plating` | Migrate | Display name already Woven Travel Plating. |
| `calming_breath_pill` | `calming_context_stim` | Migrate | Representative Epic 91 target. |
| `mist_needle_case` | `veil_needle_case` | Migrate | Old district term. |
| `veil_palm_manual` | `veil_pulse_protocol` | Migrate | Old style term. |
| `iron_thread_armor` | `iron_thread_plating` | Migrate | Display name already Iron Thread Plating. |
| `black_iron_saber_blade` | `black_iron_saber` | Migrate | Display name already Black Iron Saber. |
| `fortress_guard_manual` | `fortress_guard_protocol` | Migrate | Manual becomes protocol. |
| `tempered_meridian_pill` | `tempered_context_stim` | Migrate | Old energy/item term. |
| `lotus_dew_pill` | `lotus_dew_countermeasure` | Migrate | Representative Epic 91 target. |
| `mending_poultice` | `mending_patch` | Migrate | Display name already Mending Patch. |

### Augment Sets

| Current id | Target id | Decision | Reason |
| --- | --- | --- | --- |
| `black_iron_ward` | `ironwall_ward` | Migrate | Representative Epic 91 target. |

### Countermeasures

| Current id | Target id | Decision | Reason |
| --- | --- | --- | --- |
| `clear_heart_pill` | `clear_heart_countermeasure` | Migrate | Representative Epic 91 target. |
| `quiet_meridian_powder` | `quiet_context_powder` | Migrate | Representative Epic 91 target. |
| `purity_draught` | `purity_countermeasure` | Migrate | Representative Epic 91 target. |

### Statuses

| Current id | Target id | Decision | Reason |
| --- | --- | --- | --- |
| `poison` | `corruption` | Migrate | Approved display term. |
| `wound` | `trauma` | Migrate | Approved display term for the data status id. |
| `qi_suppression` | `context_suppression` | Migrate | Representative Epic 91 target. |
| `vulnerable` | `exposed` | Migrate | Representative Epic 91 target. |
| `burning_blood` | `burning_blood` | Keep | Confirmed as Redline doctrine/status flavor. |

### Operations

| Current id | Target id | Decision | Reason |
| --- | --- | --- | --- |
| `bamboo_road_patrol` | `greenline_sweep` | Migrate | Representative Epic 91 target. |
| `mist_valley_meditation` | `veil_district_calibration` | Migrate | Representative Epic 91 target. |
| `black_iron_drill_yard` | `black_foundry_calibration_yard` | Migrate | Representative Epic 91 target. |
| `lotus_medicine_pavilion` | `lotus_countermeasure_pavilion` | Migrate | Representative Epic 91 target. |

### Routines

| Current id | Target id | Decision | Reason |
| --- | --- | --- | --- |
| `balanced` | `balanced_routine` | Migrate | Representative Epic 91 target. |
| `outer_pressure` | `kinetic_crush` | Migrate | Representative Epic 91 target. |
| `inner_pressure` | `context_break` | Migrate | Representative Epic 91 target. |
| `guard_support` | `guard_the_stabilizer` | Migrate | Representative Epic 91 target. |
| `sustain` | `long_stabilization` | Migrate | Representative Epic 91 target. |
| `boss_burst` | `gatekeeper_burst` | Migrate | Representative Epic 91 target. |

## Explicit Defer List

The following legacy names are intentionally out of scope for Stage 2.6 even when they look related to migrated content ids:

| Surface | Examples | Reason |
| --- | --- | --- |
| Resource and save field names | `silver`, `cultivation`, `herbs`, `maps`, `combatExperience`, `selectedTacticId` | Owned by the save resource/progress field migration. |
| Core combat stat and event symbols | `outerHp`, `innerQi`, `inner_broken`, `qi_break`, `armor_break`, `inner_defense_down`, `speed_down`, `guard`, `protection`, `regeneration` | Owned by the combat-symbol migration after static ids settle. |
| Direct effect and cleanse taxonomy | `SkillEffect.type = "wound"`, `wounded_or_armor_broken_ally`, `StatusDispelTag` values such as `poison`, `wound`, `inner`, `vulnerability`, and `debuff` | These are engine behavior symbols, not configured content ids. Status ids can migrate while cleanse tags remain technical. |
| Product/runtime keys | `path-of-jianghu.save.v1`, `path-of-jianghu-shell-*`, old icon paths | Stage 2.4 completed the canonical key migration and keeps old keys as compatibility aliases. |
| Fixture-local ids | `scenario_*`, `test_*`, `prototype_*`, `web_*`, `res_*` | These are test/prototype local identifiers. Only their references to configured content ids need to follow the owning migration slice. |
| Static upgrade ids | `hero_outer_training`, `hero_inner_training`, `sect_outer_training`, `sect_inner_training`, `lotus_purity_training` | These are upgrade/resource/combat-schema ids, not Stage 2.6 content ids. |

## Test Classification

| Test/document surface | Classification | Required handling |
| --- | --- | --- |
| Static data validation and content tests | Canonical-id tests | Update to target ids in the owning static rename slice. |
| Combat, progression, offline, balance, web state, and view-model tests | Canonical-id tests when they use configured static ids | Update normal fixtures to canonical ids after static data migrates. |
| Save migration, browser import, and compatibility alias tests | Compatibility tests | Keep legacy ids as raw old inputs and assert canonical output. |
| `tests/compatibility/rethemeCompatibility.test.ts` | Transitional compatibility test | Convert from "ids are still old" assertions to alias/keep-decision coverage as slices land. |
| Scenario/local test ids under `tests/helpers`, focused combat tests, and support prototypes | Later-stage or fixture-local tests | Preserve local ids unless they reference migrated configured ids such as status ids. |
| Active migration docs | Migration docs | May mention legacy ids with explicit old-to-new context. |
| `docs/archive/**` | Historical archive | Do not rewrite. |

## Report And Export Continuity

The following outputs should use canonical ids after their owning static slice lands and may optionally include legacy aliases for comparison during Stage 2.6:

| Output | Canonical fields | Temporary legacy context |
| --- | --- | --- |
| Balance report JSON/CSV | stage, region, hostile, status, reward, and tactic fields that emit content ids | Legacy content id columns only where old-vs-new report diffing is useful. |
| Simulator and support-decision reports | combatant ids, skill ids, status ids, tactic ids | Optional legacy aliases in diagnostic text; avoid changing schema field names. |
| Web save diagnostics/import messages | save version, normalized fields, selected ids | Mention normalized legacy ids only as compatibility diagnostics. |
| Browser save exports/imports | Current `SaveData` schema with canonical content ids | Old imports remain accepted through migration and current-version normalization. |

## 91.2 Handoff

Slice 91.2 should add alias data for all rows marked **Migrate** in the target matrix. Rows marked **Keep** should be covered by tests or documented as keep decisions, but they should not receive no-op aliases.

The alias helper should support category-specific indexes so duplicate-looking concepts across categories stay unambiguous. The target matrix avoids known cross-category target collisions by using `lotus_clinic_stabilizer` for the hostile and `white_crane_edge_branch` for the style branch.

## 91.1 Verification Checklist

- Full target matrix covers 116 ids and family buckets: 98 migrate decisions and 18 keep decisions.
- `burning_blood`, `burning_blood_captain`, and `burning_blood_edict` are confirmed keep decisions.
- No region/stage id, resource/save field name, combat stat field, browser storage key, or product runtime key is scheduled for Stage 2.6.
- Current-version saves with content-id aliases now normalize through Slice 91.3. While current static data still uses legacy content ids, target aliases normalize back to the configured legacy side; after the owning static rename slices land, old save ids normalize forward to target ids through the same compatibility path.
