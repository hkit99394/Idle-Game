import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const featureBuilderModules = [
  "assignments",
  "battle",
  "counterplay",
  "equipment",
  "map",
  "offline",
  "progression",
  "roster",
  "saveDiagnostics"
] as const;

const panelModules = [
  "battle",
  "counterplaySave",
  "equipmentAssignment",
  "idleMap",
  "masteryGrowth",
  "rosterFormation",
  "shared"
] as const;

const featureTypeModules = [
  "assignmentTypes",
  "battleTypes",
  "counterplayTypes",
  "equipmentTypes",
  "mapTypes",
  "offlineTypes",
  "progressionTypes",
  "rosterTypes",
  "saveDiagnosticsTypes"
] as const;

const publicStateBarrelModules = ["gameState", "types", "viewModel"] as const;

const featureTypeOwnershipOverrides = {
  PlayerFormationHeroView: "rosterTypes"
} as const;

const viewModelsDirectoryUrl = new URL(
  "../../web/state/viewModels/",
  import.meta.url
);

function readViewModelModule(moduleName: string): string {
  return readFileSync(
    new URL(`../../web/state/viewModels/${moduleName}.ts`, import.meta.url),
    "utf8"
  );
}

function readStateModule(moduleName: string): string {
  return readFileSync(
    new URL(`../../web/state/${moduleName}.ts`, import.meta.url),
    "utf8"
  );
}

function readFeatureTypeModule(moduleName: string): string {
  return readFileSync(
    new URL(`../../web/state/viewModels/${moduleName}.ts`, import.meta.url),
    "utf8"
  );
}

function readPanelModule(moduleName: string): string {
  return readFileSync(
    new URL(`../../web/components/gamePanels/${moduleName}.tsx`, import.meta.url),
    "utf8"
  );
}

function getImportSpecifiers(source: string): string[] {
  return [...source.matchAll(/\bfrom\s+["']([^"']+)["']/g)].map(
    (match) => match[1]
  );
}

function getResolvedViewModelModuleName(specifier: string): string | null {
  if (!specifier.startsWith(".")) {
    return null;
  }

  const normalizedSpecifier = specifier.replace(/\.(js|jsx|ts|tsx)$/, "");
  const resolvedUrl = new URL(`${normalizedSpecifier}.ts`, viewModelsDirectoryUrl);

  if (!resolvedUrl.href.startsWith(viewModelsDirectoryUrl.href)) {
    return null;
  }

  const relativePath = decodeURIComponent(
    resolvedUrl.href.slice(viewModelsDirectoryUrl.href.length)
  );

  return relativePath.endsWith(".ts")
    ? relativePath.slice(0, -".ts".length)
    : null;
}

function hasFeatureTypeModuleStarExport(source: string): boolean {
  return [...source.matchAll(/\bexport\s+(?:type\s+)?\*\s+from\s+["']([^"']+)["']/g)]
    .some((match) =>
      featureTypeModules.some((moduleName) =>
        match[1].endsWith(`/viewModels/${moduleName}`) ||
        match[1].endsWith(`/viewModels/${moduleName}.js`) ||
        match[1].endsWith(`/viewModels/${moduleName}.ts`)
      )
    );
}

function getFeatureViewTypeModules(): Map<string, string> {
  const typeModules = new Map<string, string>();

  for (const moduleName of featureTypeModules) {
    const source = readFeatureTypeModule(moduleName);
    const exportedTypes = source.matchAll(/\bexport\s+type\s+(\w+)\b/g);

    for (const match of exportedTypes) {
      typeModules.set(match[1], moduleName);
    }
  }

  for (const [typeName, moduleName] of Object.entries(featureTypeOwnershipOverrides)) {
    expect(typeModules.get(typeName), `${typeName} ownership`).toBe(moduleName);
  }

  return typeModules;
}

describe("view-model module boundaries", () => {
  it("keeps feature builders from importing sibling feature builders", () => {
    for (const sourceModule of featureBuilderModules) {
      const source = readViewModelModule(sourceModule);
      const importedViewModelModules = getImportSpecifiers(source)
        .map(getResolvedViewModelModuleName)
        .filter((moduleName): moduleName is string => moduleName !== null);

      for (const targetModule of featureBuilderModules) {
        if (targetModule === sourceModule) {
          continue;
        }

        expect(
          importedViewModelModules,
          `${sourceModule}.ts should not import ${targetModule}.ts`
        ).not.toContain(targetModule);
      }
    }
  });

  it("keeps feature view types out of the public state compatibility barrel", () => {
    const publicStateSources = publicStateBarrelModules.map((moduleName) => ({
      moduleName,
      source: readStateModule(moduleName)
    }));
    const featureViewTypeModules = getFeatureViewTypeModules();

    expect(featureViewTypeModules.size).toBeGreaterThan(0);

    for (const typeName of featureViewTypeModules.keys()) {
      for (const { moduleName, source } of publicStateSources) {
        expect(
          hasFeatureTypeModuleStarExport(source),
          `state/${moduleName}.ts should not star-export feature type modules`
        ).toBe(false);
        expect(
          source,
          `state/${moduleName}.ts should not re-export ${typeName}`
        ).not.toMatch(new RegExp(`\\b${typeName}\\b`));
      }
    }
  });

  it("keeps panel view type imports on feature-owned type modules", () => {
    const featureViewTypeModules = getFeatureViewTypeModules();

    for (const panelModule of panelModules) {
      const source = readPanelModule(panelModule);

      for (const [typeName, typeModule] of featureViewTypeModules) {
        if (!new RegExp(`\\b${typeName}\\b`).test(source)) {
          continue;
        }

        expect(
          source,
          `${panelModule}.tsx should import ${typeName} from a feature type module`
        ).not.toMatch(
          new RegExp(
            `import\\s+type\\s+\\{[^}]*\\b${typeName}\\b[^}]*\\}\\s+from\\s+["'][^"']*state/gameState["']`,
            "s"
          )
        );

        expect(
          source,
          `${panelModule}.tsx should import ${typeName} from ${typeModule}`
        ).toMatch(
          new RegExp(
            `import\\s+type\\s+\\{[^}]*\\b${typeName}\\b[^}]*\\}\\s+from\\s+["'][^"']*state/viewModels/${typeModule}["']`,
            "s"
          )
        );
      }
    }
  });
});
