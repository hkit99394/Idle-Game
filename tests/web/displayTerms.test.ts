import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  displayTerms,
  formatCombatRoleLabel,
  formatEquipmentSlotLabel,
  formatInternalStatName,
  formatOperationTypeLabel,
  formatResourceLabel,
  formatStyleFamilyName,
  formatTacticModifierLabel
} from "../../web/displayTerms";

const webRootUrl = new URL("../../web/", import.meta.url);
const futureOnlyMechanicSourceTokens = [
  "District Heat",
  "districtHeat",
  "districtHeatProjection",
  "districtHeatPromotionDecision",
  "projectedHeat",
  "heatBand",
  "district attention",
  "District attention",
  "districtAttention",
  "district-attention",
  "districtAttentionWarning",
  "attentionWarning",
  "Attention rising",
  "Trace",
  "Firewall",
  "Calibration Debt",
  "AI Raid"
] as const;

const futureOnlyMechanicTokenAllowlist: Partial<
  Record<(typeof futureOnlyMechanicSourceTokens)[number], string[]>
> = {
  "district attention": ["/web/state/viewModels/map.ts"],
  attentionWarning: [
    "/web/features/mapIdle/panels.tsx",
    "/web/state/viewModels/map.ts",
    "/web/state/viewModels/mapTypes.ts"
  ],
  "Attention rising": ["/web/state/viewModels/map.ts"]
};

function collectWebSourceFiles(directoryUrl: URL): URL[] {
  return readdirSync(directoryUrl, { withFileTypes: true }).flatMap((entry) => {
    const entryUrl = new URL(
      `${entry.name}${entry.isDirectory() ? "/" : ""}`,
      directoryUrl
    );

    if (entry.isDirectory()) {
      return collectWebSourceFiles(entryUrl);
    }

    return /\.(?:ts|tsx)$/.test(entry.name) ? [entryUrl] : [];
  });
}

describe("Path of Neon display terms", () => {
  it("maps compatibility resource keys to player-facing labels", () => {
    expect(formatResourceLabel("silver")).toBe("Credits");
    expect(formatResourceLabel("cultivation")).toBe("Resonance");
    expect(formatResourceLabel("herbs")).toBe("Reagents");
    expect(formatResourceLabel("combatExperience")).toBe("Combat Data");
    expect(formatResourceLabel("styleMastery")).toBe("Protocol Mastery");
  });

  it("formats internal combat stats without renaming contracts", () => {
    expect(formatInternalStatName("kineticAttack")).toBe("Kinetic Attack");
    expect(formatInternalStatName("cognitiveAttack")).toBe("Cognitive Attack");
    expect(formatInternalStatName("maxBodyIntegrity")).toBe("Max Body Integrity");
    expect(formatInternalStatName("maxContextStability")).toBe("Max Context Stability");
    expect(formatInternalStatName("breachPower")).toBe("Breach Power");
  });

  it("formats style and tactic ids through the vocabulary layer", () => {
    expect(formatStyleFamilyName("impact")).toBe("Impact Style");
    expect(formatStyleFamilyName("ghostware")).toBe("Ghostware Style");
    expect(formatTacticModifierLabel("kinetic_damage_multiplier")).toBe(
      displayTerms.combat.kineticDamage
    );
    expect(formatTacticModifierLabel("breach_power_multiplier")).toBe(
      displayTerms.combat.breachPower
    );
  });

  it("formats operations, augments, and team roles through the vocabulary layer", () => {
    expect(formatOperationTypeLabel("patrol")).toBe("Sweep operation");
    expect(formatOperationTypeLabel("training_ground")).toBe(
      "Calibration operation"
    );
    expect(formatEquipmentSlotLabel("armor")).toBe("Plating");
    expect(formatEquipmentSlotLabel("manual")).toBe("Protocol");
    expect(formatEquipmentSlotLabel("medicine")).toBe("Countermeasure");
    expect(formatCombatRoleLabel("tank")).toBe("Anchor");
    expect(formatCombatRoleLabel("breaker")).toBe("Breacher");
    expect(formatCombatRoleLabel("support")).toBe("Stabilizer");
  });

  it("keeps unknown compatibility keys readable", () => {
    expect(formatResourceLabel("selected_tactic")).toBe("Selected Tactic");
    expect(formatStyleFamilyName("customStyleId")).toBe("Custom Style Id");
  });

  it("does not ship future-only mechanic terms in live web source", () => {
    const sourceByFile = collectWebSourceFiles(webRootUrl).map((fileUrl) => ({
      file: fileUrl.pathname,
      source: readFileSync(fileUrl, "utf8")
    }));

    for (const term of futureOnlyMechanicSourceTokens) {
      const allowedPathSuffixes = futureOnlyMechanicTokenAllowlist[term] ?? [];
      const matches = sourceByFile
        .filter(({ source }) => source.includes(term))
        .map(({ file }) => file)
        .filter(
          (file) =>
            !allowedPathSuffixes.some((pathSuffix) => file.endsWith(pathSuffix))
        );

      expect(matches, `${term} should stay out of live UI source`).toEqual([]);
    }
  });
});
