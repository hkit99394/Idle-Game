import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createInitialPlayerProgress, createSaveData } from "../../core";
import { staticGameData } from "../../data/staticGameData";
import {
  LEGACY_WEB_SAVE_STORAGE_KEY,
  WEB_SAVE_STORAGE_KEY
} from "../../web/state/saveStorage";

const serviceWorkerSource = readFileSync(
  new URL("../../public/service-worker.js", import.meta.url),
  "utf8"
);
const manifest = JSON.parse(
  readFileSync(new URL("../../public/manifest.webmanifest", import.meta.url), "utf8")
) as { icons: Array<{ src: string }> };
const packageMetadata = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8")
) as { name: string };
const liveSurfaceRoots = ["index.html", "public", "web", "data"].map((path) =>
  filePath(path)
);
const liveSurfaceExtensions = new Set([
  ".css",
  ".html",
  ".json",
  ".js",
  ".svg",
  ".ts",
  ".tsx",
  ".webmanifest"
]);

function filePath(relativePath: string): string {
  return fileURLToPath(new URL(`../../${relativePath}`, import.meta.url));
}

function collectLiveSurfaceFiles(path: string): string[] {
  const stats = statSync(path);

  if (stats.isDirectory()) {
    return readdirSync(path).flatMap((entry) =>
      collectLiveSurfaceFiles(join(path, entry))
    );
  }

  return liveSurfaceExtensions.has(extname(path)) ? [path] : [];
}

function ids(collection: readonly { id: string }[] | undefined): string[] {
  return (collection ?? []).map((entry) => entry.id);
}

describe("Path of Neon retheme compatibility keys", () => {
  it("uses canonical static region and stage ids while later-stage ids stay stable", () => {
    expect({
      assignments: ids(staticGameData.assignments),
      enemies: ids(staticGameData.enemies),
      equipment: ids(staticGameData.equipment),
      equipmentSets: ids(staticGameData.equipmentSets),
      formations: ids(staticGameData.formations),
      heroes: ids(staticGameData.heroes),
      medicines: ids(staticGameData.medicines),
      regions: ids(staticGameData.regions),
      skillUpgrades: ids(staticGameData.skillUpgrades),
      skills: ids(staticGameData.skills),
      stages: ids(staticGameData.stages),
      statusEffects: ids(staticGameData.statusEffects),
      styles: ids(staticGameData.styles),
      tactics: ids(staticGameData.tactics),
      upgrades: ids(staticGameData.upgrades)
    }).toEqual({
      assignments: [
        "bamboo_road_patrol",
        "mist_valley_meditation",
        "black_iron_drill_yard",
        "lotus_medicine_pavilion"
      ],
      enemies: [
        "greenline_cutter",
        "veil_pulse_bruiser",
        "ironwall_guard",
        "veil_district_acolyte",
        "veilstep_needler",
        "fogline_brace_ward",
        "veil_pulse_adept",
        "veil_district_elder",
        "ironwall_sentry",
        "shieldwall_guard",
        "ironwall_saber",
        "forge_chain_hook",
        "iron_plating_captain",
        "black_foundry_commander",
        "lotus_kinetic_initiate",
        "lotus_clinic_stabilizer",
        "lotus_brace_keeper",
        "jade_needle_operator",
        "lotus_edge_warden",
        "lotus_clinic_director",
        "miasma_pulse_apprentice",
        "blood_brand_duelist",
        "marrow_lock_supplicant",
        "burning_blood_captain",
        "redline_ritualist",
        "redline_overseer"
      ],
      equipment: [
        "training_wraps",
        "willow_palm_manual",
        "crane_edge_sword",
        "guardian_staff",
        "woven_travel_robe",
        "calming_breath_pill",
        "mist_needle_case",
        "veil_palm_manual",
        "iron_thread_armor",
        "black_iron_saber_blade",
        "fortress_guard_manual",
        "tempered_meridian_pill",
        "lotus_dew_pill",
        "mending_poultice"
      ],
      equipmentSets: ["black_iron_ward"],
      formations: ["mvp_line"],
      heroes: [
        "iron_fist_initiate",
        "azure_pulse_monk",
        "white_crane_edge_runner",
        "mountain_brace_guardian",
        "lotus_stabilizer"
      ],
      medicines: [
        "clear_heart_pill",
        "quiet_meridian_powder",
        "purity_draught"
      ],
      regions: [
        "greenline_approach",
        "veil_district",
        "black_iron_foundry",
        "lotus_clinic",
        "redline_outpost"
      ],
      skillUpgrades: [
        "impact_combo_refinement",
        "context_shock_refinement",
        "white_crane_edge_refinement",
        "brace_sweep_refinement",
        "lotus_stabilizer_vow_refinement"
      ],
      skills: [
        "baseline_strike",
        "impact_combo",
        "context_shock",
        "white_crane_edge",
        "brace_sweep",
        "cutter_strike",
        "guarding_saber",
        "veil_pulse_jab",
        "needle_flurry",
        "fogline_brace_guard",
        "cloud_context_press",
        "valley_context_seal",
        "shieldwall_chop",
        "fortress_brace_lock",
        "black_iron_counter",
        "chain_hook_pressure",
        "iron_wall_command",
        "black_foundry_edict",
        "lotus_stabilizer_pulse",
        "lotus_brace_shelter",
        "jade_needle_flurry",
        "tranquil_bloom_seal",
        "director_lotus_vow",
        "lotus_stabilizer_vow",
        "miasma_pulse",
        "blood_brand_cut",
        "marrow_lock_hex",
        "burning_blood_edict"
      ],
      stages: [
        "greenline_approach_1",
        "greenline_approach_2",
        "greenline_approach_3",
        "greenline_approach_4",
        "greenline_approach_5",
        "greenline_approach_6",
        "greenline_approach_7",
        "greenline_approach_8",
        "greenline_approach_9",
        "greenline_approach_10",
        "veil_district_1",
        "veil_district_2",
        "veil_district_3",
        "veil_district_4",
        "veil_district_5",
        "veil_district_6",
        "black_iron_foundry_1",
        "black_iron_foundry_2",
        "black_iron_foundry_3",
        "black_iron_foundry_4",
        "black_iron_foundry_5",
        "black_iron_foundry_6",
        "black_iron_foundry_7",
        "lotus_clinic_1",
        "lotus_clinic_2",
        "lotus_clinic_3",
        "lotus_clinic_4",
        "lotus_clinic_5",
        "lotus_clinic_6",
        "lotus_clinic_7",
        "redline_outpost_1",
        "redline_outpost_2",
        "redline_outpost_3",
        "redline_outpost_4",
        "redline_outpost_5",
        "redline_outpost_6",
        "redline_outpost_7"
      ],
      statusEffects: [
        "corruption",
        "trauma",
        "context_suppression",
        "exposed",
        "burning_blood"
      ],
      styles: [
        "impact",
        "pulse",
        "vector",
        "edge",
        "rend",
        "brace",
        "ghostware"
      ],
      tactics: [
        "balanced",
        "outer_pressure",
        "inner_pressure",
        "guard_support",
        "sustain",
        "boss_burst"
      ],
      upgrades: [
        "hero_outer_training",
        "hero_inner_training",
        "sect_outer_training",
        "sect_inner_training",
        "lotus_purity_training"
      ]
    });
  });

  it("keeps internal compatibility fields stable and tracks runtime key migration", () => {
    const save = createSaveData({
      progress: createInitialPlayerProgress(staticGameData),
      selectedOfflineFarmStageId: null,
      nowMs: 1_000
    });

    expect(packageMetadata.name).toBe("path-of-neon");
    expect(WEB_SAVE_STORAGE_KEY).toBe("path-of-neon.save.v1");
    expect(LEGACY_WEB_SAVE_STORAGE_KEY).toBe("path-of-jianghu.save.v1");
    expect(Object.keys(save.progress.resources)).toEqual([
      "silver",
      "cultivation",
      "herbs"
    ]);
    expect(Object.keys(save.progress.maps.greenline_approach)).toContain(
      "combatExperience"
    );
    expect(manifest.icons.map((icon) => icon.src)).toEqual([
      "/icons/path-of-neon.svg"
    ]);
    expect(serviceWorkerSource).toContain(
      'const CACHE_NAME = "path-of-neon-shell-v1"'
    );
    expect(serviceWorkerSource).toContain(
      '"/icons/path-of-neon.svg"'
    );
    expect(serviceWorkerSource).toContain(
      '"/icons/path-of-jianghu.svg"'
    );
    expect(serviceWorkerSource).toContain(
      '"path-of-jianghu-shell-"'
    );
    expect(serviceWorkerSource).toContain(
      '"path-of-neon-shell-"'
    );
  });

  it("keeps stale product labels out of live app surfaces", () => {
    const stalePhrases = ["Path of Jianghu", "Neon Jianghu"];
    const matches = liveSurfaceRoots
      .flatMap(collectLiveSurfaceFiles)
      .flatMap((path) => {
        const source = readFileSync(path, "utf8");

        return stalePhrases
          .filter((phrase) => source.includes(phrase))
          .map((phrase) => `${path}: ${phrase}`);
      });

    expect(matches).toEqual([]);
  });
});
