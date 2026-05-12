import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const cssSource = readFileSync(
  new URL("../../web/styles/app.css", import.meta.url),
  "utf8"
);

const appPanelSource = readFileSync(
  new URL("../../web/app/AppPanels.tsx", import.meta.url),
  "utf8"
);

const featurePanelSources = {
  battle: readFeaturePanel("battle"),
  counterplaySave: readFeaturePanel("counterplaySave"),
  equipmentAssignments: readFeaturePanel("equipmentAssignments"),
  mapIdle: readFeaturePanel("mapIdle"),
  rosterFormation: readFeaturePanel("rosterFormation"),
  strategy: readFeaturePanel("strategy")
} as const;

function readFeaturePanel(featureName: string): string {
  return readFileSync(
    new URL(`../../web/features/${featureName}/panels.tsx`, import.meta.url),
    "utf8"
  );
}

function getMediaBlock(maxWidthPx: number): string {
  const marker = `@media (max-width: ${maxWidthPx}px) {`;
  const start = cssSource.indexOf(marker);

  if (start === -1) {
    throw new Error(`Missing ${marker}`);
  }

  let depth = 1;
  for (let index = start + marker.length; index < cssSource.length; index += 1) {
    const character = cssSource[index];

    if (character === "{") {
      depth += 1;
    }

    if (character === "}") {
      depth -= 1;
    }

    if (depth === 0) {
      return cssSource.slice(start + marker.length, index);
    }
  }

  throw new Error(`Unclosed ${marker}`);
}

function getRule(source: string, selector: string): string {
  const searchableSource = source.replace(/\/\*[\s\S]*?\*\//g, "");

  for (const match of searchableSource.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = match[1].split(",").map((value) => value.trim());

    if (selectors.includes(selector)) {
      return match[2].replace(/\s+/g, " ").trim();
    }
  }

  throw new Error(`Missing CSS rule for ${selector}`);
}

function expectDeclaration(
  source: string,
  selector: string,
  property: string,
  value: string
) {
  expect(getRule(source, selector), `${selector} ${property}`).toContain(
    `${property}: ${value}`
  );
}

function readDeclaration(source: string, selector: string, property: string): string {
  const rule = getRule(source, selector);
  const declaration = rule
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${property}: `));

  if (!declaration) {
    throw new Error(`Missing ${selector} ${property}`);
  }

  return declaration.slice(`${property}: `.length);
}

describe("responsive panel smoke contracts", () => {
  it("keeps narrow viewport panel layouts on a single readable column", () => {
    const tabletBlock = getMediaBlock(720);
    const phoneBlock = getMediaBlock(480);

    expectDeclaration(tabletBlock, ".battle-grid", "grid-template-columns", "1fr");
    expectDeclaration(
      tabletBlock,
      ".offline-farm-grid",
      "grid-template-columns",
      "1fr"
    );
    expectDeclaration(tabletBlock, ".stage-list", "grid-template-columns", "1fr");
    expectDeclaration(
      tabletBlock,
      ".formation-slots",
      "grid-template-columns",
      "1fr"
    );
    expectDeclaration(
      tabletBlock,
      ".tactics-grid",
      "grid-template-columns",
      "1fr"
    );
    expectDeclaration(
      tabletBlock,
      ".equipment-layout",
      "grid-template-columns",
      "1fr"
    );
    expectDeclaration(
      tabletBlock,
      ".counterplay-settings-grid",
      "grid-template-columns",
      "1fr"
    );
    expectDeclaration(
      tabletBlock,
      ".save-text-grid",
      "grid-template-columns",
      "1fr"
    );
    expectDeclaration(
      tabletBlock,
      ".event-row",
      "grid-template-columns",
      "44px minmax(0, 1fr)"
    );

    expectDeclaration(phoneBlock, ".event-row", "grid-template-columns", "1fr");
    expectDeclaration(
      phoneBlock,
      ".save-diagnostics-grid",
      "grid-template-columns",
      "1fr"
    );
    expectDeclaration(phoneBlock, ".save-actions button", "width", "100%");
    expectDeclaration(
      phoneBlock,
      ".counterplay-toggle-row",
      "grid-template-columns",
      "auto minmax(0, 1fr)"
    );
    expectDeclaration(
      phoneBlock,
      ".medicine-toggle-row",
      "grid-template-columns",
      "auto minmax(0, 1fr)"
    );
    expectDeclaration(phoneBlock, ".medicine-toggle-row em", "width", "100%");
  });

  it("keeps dense panel surfaces shrink-safe and grouped by owner", () => {
    expectDeclaration(cssSource, "html", "overflow-x", "hidden");
    expectDeclaration(cssSource, "body", "overflow-x", "hidden");
    expectDeclaration(cssSource, ".stage-card", "min-width", "0");
    expectDeclaration(cssSource, ".roster-card", "min-width", "0");
    expectDeclaration(cssSource, ".tactic-option", "min-width", "0");
    expectDeclaration(cssSource, ".combatant-card", "min-width", "0");
    expectDeclaration(cssSource, ".save-diagnostics-panel", "min-width", "0");
    expectDeclaration(
      cssSource,
      ".roster-grid",
      "grid-template-columns",
      "repeat(auto-fit, minmax(min(100%, 220px), 1fr))"
    );
    expectDeclaration(
      cssSource,
      ".equipment-layout",
      "grid-template-columns",
      "minmax(0, 0.9fr) minmax(0, 1.1fr)"
    );

    for (const ownershipComment of [
      "/* App shell and shared layout */",
      "/* Map and idle panels */",
      "/* Growth and mastery panels */",
      "/* Stage selector */",
      "/* Shared feature panel chrome */",
      "/* Roster and formation panels */",
      "/* Shared feature panel headings */",
      "/* Equipment and assignments panels */",
      "/* Battle panels */",
      "/* Counterplay and save panels */",
      "/* Responsive panel contracts */"
    ]) {
      expect(cssSource).toContain(ownershipComment);
    }
  });

  it("keeps the Path of Neon visual identity readable and status-coded", () => {
    for (const token of [
      "--neon-cyan",
      "--neon-acid",
      "--neon-magenta",
      "--neon-amber",
      "--neon-red"
    ]) {
      expect(cssSource).toContain(token);
    }

    expect(getRule(cssSource, ".app-shell")).toContain("#101418");
    expect(getRule(cssSource, ".app-shell")).toContain("repeating-linear-gradient");
    expectDeclaration(cssSource, ".stage-header h1", "color", "#f4fff9");
    expect(cssSource).toContain("color: #e9fff8;");
    expectDeclaration(cssSource, ".stage-card", "color", "var(--neon-ink)");
    expectDeclaration(
      cssSource,
      ".status-pressure-list .status-backlash",
      "color",
      "#fff2ee"
    );

    const statusBorderColors = [
      ".status-pressure-list .status-damage",
      ".status-pressure-list .status-control",
      ".status-pressure-list .status-vulnerability",
      ".status-pressure-list .status-recovery",
      ".status-pressure-list .status-backlash"
    ].map((selector) => readDeclaration(cssSource, selector, "border-color"));

    expect(new Set(statusBorderColors).size).toBe(statusBorderColors.length);
  });

  it("keeps the Epic 59 smoke workflows wired to the protected selectors", () => {
    expect(appPanelSource).toContain('className="battle-grid"');
    expect(featurePanelSources.battle).toContain("event-row");
    expect(featurePanelSources.mapIdle).toContain('className="stage-list"');
    expect(featurePanelSources.mapIdle).toContain('className="offline-farm-grid"');
    expect(featurePanelSources.rosterFormation).toContain(
      'className="roster-grid"'
    );
    expect(featurePanelSources.rosterFormation).toContain(
      'className="formation-slots"'
    );
    expect(featurePanelSources.strategy).toContain('className="tactics-grid"');
    expect(featurePanelSources.equipmentAssignments).toContain(
      'className="equipment-layout"'
    );
    expect(featurePanelSources.counterplaySave).toContain(
      'className="counterplay-settings-grid"'
    );
    expect(featurePanelSources.counterplaySave).toContain(
      'className="save-text-grid"'
    );
    expect(featurePanelSources.counterplaySave).toContain(
      'className="save-diagnostics-panel"'
    );
  });
});
