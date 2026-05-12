import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  displayTerms,
  formatInternalStatName,
  formatResourceLabel,
  formatStyleFamilyName,
  formatTacticModifierLabel
} from "../../web/displayTerms";

const webRootUrl = new URL("../../web/", import.meta.url);
const futureMechanicTerms = [
  "District Heat",
  "Trace",
  "Firewall",
  "Calibration Debt",
  "Cognitive Intrusion",
  "AI Raid"
] as const;

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
    expect(formatInternalStatName("outerAttack")).toBe("Kinetic Attack");
    expect(formatInternalStatName("innerAttack")).toBe("Cognitive Attack");
    expect(formatInternalStatName("maxOuterHp")).toBe("Max Body Integrity");
    expect(formatInternalStatName("maxInnerQi")).toBe("Max Context Stability");
    expect(formatInternalStatName("breakPower")).toBe("Breach Power");
  });

  it("formats style and tactic ids through the vocabulary layer", () => {
    expect(formatStyleFamilyName("fist")).toBe("Impact Style");
    expect(formatStyleFamilyName("hidden_weapons")).toBe("Ghostware Style");
    expect(formatTacticModifierLabel("outer_damage_multiplier")).toBe(
      displayTerms.combat.kineticDamage
    );
    expect(formatTacticModifierLabel("break_power_multiplier")).toBe(
      displayTerms.combat.breachPower
    );
  });

  it("keeps unknown compatibility keys readable", () => {
    expect(formatResourceLabel("selected_tactic")).toBe("Selected Tactic");
    expect(formatStyleFamilyName("customStyleId")).toBe("Custom Style Id");
  });

  it("does not ship future mechanic terms in live web source", () => {
    const sourceByFile = collectWebSourceFiles(webRootUrl).map((fileUrl) => ({
      file: fileUrl.pathname,
      source: readFileSync(fileUrl, "utf8")
    }));

    for (const term of futureMechanicTerms) {
      const matches = sourceByFile
        .filter(({ source }) => source.includes(term))
        .map(({ file }) => file);

      expect(matches, `${term} should stay out of live UI source`).toEqual([]);
    }
  });
});
