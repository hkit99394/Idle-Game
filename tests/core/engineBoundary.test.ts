import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const CORE_ROOT = join(process.cwd(), "core");
const CORE_BALANCE_ROOT = join(CORE_ROOT, "balance");
const WEB_ROOT = join(process.cwd(), "web");
const TOOLS_ROOT = join(process.cwd(), "tools");
const APP_TOOL_DATA_ROOTS = [
  join(process.cwd(), "web"),
  join(process.cwd(), "tools"),
  join(process.cwd(), "data")
];
const APPROVED_CORE_ENTRY_FILES = new Set([
  join(CORE_ROOT, "index.ts"),
  join(CORE_ROOT, "core-balance.ts"),
  join(CORE_ROOT, "balance", "index.ts"),
  join(CORE_ROOT, "combat", "index.ts"),
  join(CORE_ROOT, "counterplay", "index.ts"),
  join(CORE_ROOT, "data", "index.ts"),
  join(CORE_ROOT, "offline", "index.ts"),
  join(CORE_ROOT, "progression", "index.ts"),
  join(CORE_ROOT, "save", "index.ts")
]);
const EXTERNAL_SCAN_EXCLUDED_DIRECTORIES = new Set([
  ".git",
  "coverage",
  "dist",
  "node_modules"
]);
const IMPORT_SPECIFIER_PATTERN =
  /\b(?:import|export)\s+(?:type\s+)?(?:[^"']*?\s+from\s+)?["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;

function listTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      if (EXTERNAL_SCAN_EXCLUDED_DIRECTORIES.has(entry)) {
        return [];
      }

      return listTypeScriptFiles(path);
    }

    return path.endsWith(".ts") || path.endsWith(".tsx") ? [path] : [];
  });
}

function listTypeScriptFilesInDirectories(directories: string[]): string[] {
  return directories.flatMap((directory) =>
    existsSync(directory) ? listTypeScriptFiles(directory) : []
  );
}

function getImportSpecifiers(source: string): string[] {
  return [...source.matchAll(IMPORT_SPECIFIER_PATTERN)].map(
    (match) => match[1] ?? match[2] ?? ""
  );
}

function isSamePathOrChild(path: string, parent: string): boolean {
  const relativePath = relative(parent, path);
  return (
    relativePath === "" ||
    (!relativePath.startsWith("..") && !isAbsolute(relativePath))
  );
}

function resolvesToDirectory(
  importerPath: string,
  specifier: string,
  directory: string
): boolean {
  if (!specifier.startsWith(".")) {
    return false;
  }

  return isSamePathOrChild(resolve(dirname(importerPath), specifier), directory);
}

function resolvesToCoreBalance(importerPath: string, specifier: string): boolean {
  if (specifier === "core" || specifier === "core/core-balance") {
    return false;
  }

  if (specifier === "core/balance" || specifier.startsWith("core/balance/")) {
    return true;
  }

  if (!specifier.startsWith(".")) {
    return false;
  }

  const resolvedSpecifier = resolve(dirname(importerPath), specifier);
  return isSamePathOrChild(resolvedSpecifier, CORE_BALANCE_ROOT);
}

function normalizeResolvedTypeScriptModulePath(resolvedPath: string): string {
  if (existsSync(resolvedPath)) {
    const stat = statSync(resolvedPath);

    if (stat.isFile()) {
      return resolvedPath;
    }

    if (stat.isDirectory()) {
      const indexCandidates = [
        join(resolvedPath, "index.ts"),
        join(resolvedPath, "index.tsx")
      ];

      return indexCandidates.find((candidate) => existsSync(candidate)) ??
        resolvedPath;
    }
  }

  const candidates = [
    `${resolvedPath}.ts`,
    `${resolvedPath}.tsx`,
    join(resolvedPath, "index.ts"),
    join(resolvedPath, "index.tsx")
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? resolvedPath;
}

function resolveCoreModulePath(
  importerPath: string,
  specifier: string
): string | null {
  if (specifier === "core") {
    return join(CORE_ROOT, "index.ts");
  }

  if (specifier === "core/core-balance") {
    return join(CORE_ROOT, "core-balance.ts");
  }

  if (specifier.startsWith("core/")) {
    return normalizeResolvedTypeScriptModulePath(
      resolve(CORE_ROOT, specifier.slice("core/".length))
    );
  }

  if (!specifier.startsWith(".")) {
    return null;
  }

  const resolvedSpecifier = resolve(dirname(importerPath), specifier);

  if (!isSamePathOrChild(resolvedSpecifier, CORE_ROOT)) {
    return null;
  }

  return normalizeResolvedTypeScriptModulePath(resolvedSpecifier);
}

describe("core engine boundary", () => {
  it("keeps core modules independent of web, tools, React, browser APIs, and ambient runtime state", () => {
    const forbiddenRuntimePatterns = [
      {
        pattern: /\b(?:window|document|localStorage|sessionStorage|navigator)\b/,
        reason: "references browser runtime APIs"
      },
      {
        pattern: /\bimport\.meta\b/,
        reason: "references Vite-style import metadata"
      },
      {
        pattern: /\bDate\.now\s*\(|\bnew\s+Date\s*\(/,
        reason: "reads wall-clock time"
      },
      {
        pattern: /\bMath\.random\s*\(/,
        reason: "uses ambient randomness"
      }
    ];
    const violations = listTypeScriptFiles(CORE_ROOT).flatMap((path) => {
      const source = readFileSync(path, "utf8");
      const relativePath = relative(process.cwd(), path);
      const fileViolations: string[] = [];
      const importSpecifiers = getImportSpecifiers(source);

      for (const specifier of importSpecifiers) {
        if (
          resolvesToDirectory(path, specifier, WEB_ROOT) ||
          resolvesToDirectory(path, specifier, TOOLS_ROOT)
        ) {
          fileViolations.push(`${relativePath} imports app/tool code`);
        }

        if (specifier === "react" || specifier.startsWith("react/")) {
          fileViolations.push(`${relativePath} imports React`);
        }

        if (
          specifier === "vite" ||
          specifier.startsWith("vite/") ||
          specifier === "vite-node" ||
          specifier.startsWith("vite-node/") ||
          specifier === "vitest" ||
          specifier.startsWith("vitest/")
        ) {
          fileViolations.push(`${relativePath} imports Vite or test runtime code`);
        }
      }

      for (const { pattern, reason } of forbiddenRuntimePatterns) {
        if (pattern.test(source)) {
          fileViolations.push(`${relativePath} ${reason}`);
        }
      }

      return fileViolations;
    });

    expect(violations).toEqual([]);
  });

  it("imports approved core entry points in a Node-like test runtime", async () => {
    const approvedImports: Array<{
      label: string;
      load: () => Promise<unknown>;
      expectedExports: string[];
    }> = [
      {
        label: "core",
        load: () => import("../../core"),
        expectedExports: [
          "buildGameBalanceReport",
          "loadSaveTransaction",
          "resolveStageBattle",
          "simulateBattle",
          "validateStaticGameData"
        ]
      },
      {
        label: "core/balance",
        load: () => import("../../core/balance"),
        expectedExports: [
          "buildGameBalanceReport",
          "buildRegionBudgetGateChecks",
          "buildTacticComparisonReport"
        ]
      },
      {
        label: "core/combat",
        load: () => import("../../core/combat"),
        expectedExports: [
          "createBattleEventRecord",
          "selectTarget",
          "simulateBattle"
        ]
      },
      {
        label: "core/counterplay",
        load: () => import("../../core/counterplay"),
        expectedExports: [
          "buildMedicineCounterplayViewModels",
          "buildStageCounterplayPreview"
        ]
      },
      {
        label: "core/data",
        load: () => import("../../core/data"),
        expectedExports: ["buildStaticGameData", "validateStaticGameData"]
      },
      {
        label: "core/offline",
        load: () => import("../../core/offline"),
        expectedExports: [
          "applyOfflineAssignmentRewards",
          "applyOfflineRewards",
          "previewOfflineRewards"
        ]
      },
      {
        label: "core/progression",
        load: () => import("../../core/progression"),
        expectedExports: [
          "equipHeroEquipment",
          "purchaseSkillUpgrade",
          "purchaseUpgrade",
          "resolveStageBattle",
          "selectPlayerTactic",
          "setActiveHeroTeam",
          "setAssignmentHeroes"
        ]
      },
      {
        label: "core/save",
        load: () => import("../../core/save"),
        expectedExports: [
          "applySaveLoadTransaction",
          "createSaveData",
          "loadSaveTransaction",
          "parseSaveData"
        ]
      },
      {
        label: "core/core-balance",
        load: () => import("../../core/core-balance"),
        expectedExports: [
          "buildBalanceReport",
          "buildGameBalanceReport",
          "buildTacticComparisonReport"
        ]
      }
    ];

    const violations = (
      await Promise.all(
        approvedImports.map(async ({ label, load, expectedExports }) => {
          const module = await load() as Record<string, unknown>;

          return expectedExports
            .filter((exportName) => !(exportName in module))
            .map((exportName) => `${label} is missing ${exportName}`);
        })
      )
    ).flat();

    expect(violations).toEqual([]);
  });

  it("exposes stable package-style entry points for app and tool callers", () => {
    const missingEntryPoints = [...APPROVED_CORE_ENTRY_FILES]
      .filter((path) => !existsSync(path))
      .map((path) => relative(process.cwd(), path));

    expect(missingEntryPoints).toEqual([]);
  });

  it("keeps refactored entry points as thin orchestration layers", () => {
    const lineCount = (path: string) =>
      readFileSync(path, "utf8").trimEnd().split("\n").length;

    expect(lineCount(join(CORE_ROOT, "balance", "balanceReport.ts"))).toBeLessThanOrEqual(10);
    expect(lineCount(join(CORE_ROOT, "combat", "autoMedicine.ts"))).toBeLessThanOrEqual(10);
    expect(lineCount(join(CORE_ROOT, "save", "saveSchema.ts"))).toBeLessThanOrEqual(10);
    expect(lineCount(join(process.cwd(), "web", "state", "gameState.ts"))).toBeLessThanOrEqual(10);
    expect(lineCount(join(process.cwd(), "web", "state", "viewModel.ts"))).toBeLessThanOrEqual(180);
    expect(lineCount(join(process.cwd(), "web", "components", "GamePanels.tsx"))).toBeLessThanOrEqual(30);
    expect(lineCount(join(process.cwd(), "tools", "balanceReport.ts"))).toBeLessThanOrEqual(10);
    expect(existsSync(join(process.cwd(), "tools", "supportDecision", "decision.ts"))).toBe(true);
    expect(existsSync(join(CORE_ROOT, "balance", "supportIdentityDecision.ts"))).toBe(false);
    expect(existsSync(join(CORE_ROOT, "data", "validation", "combat.ts"))).toBe(true);
    expect(existsSync(join(CORE_ROOT, "combat", "autoMedicine", "selection.ts"))).toBe(true);
    expect(existsSync(join(CORE_ROOT, "save", "migrations.ts"))).toBe(true);
  });

  it("keeps tool callers on public balance entry points", () => {
    const scannedFiles = listTypeScriptFilesInDirectories([TOOLS_ROOT]);
    const scannedRelativePaths = scannedFiles.map((path) => relative(process.cwd(), path));
    const violations = scannedFiles.flatMap((path) => {
      const source = readFileSync(path, "utf8");
      return getImportSpecifiers(source)
        .filter((specifier) => resolvesToCoreBalance(path, specifier))
        .map(
          (specifier) =>
            `${relative(process.cwd(), path)} deep-imports ${specifier}; use core/core-balance or root core`
        );
    });

    expect(scannedRelativePaths).toContain("tools/simulateBattle.ts");
    expect(violations).toEqual([]);
  });

  it("keeps web, data, and tool callers on approved core entry points", () => {
    const scannedFiles = listTypeScriptFilesInDirectories(APP_TOOL_DATA_ROOTS);
    const violations = scannedFiles.flatMap((path) => {
      const source = readFileSync(path, "utf8");
      return getImportSpecifiers(source).flatMap((specifier) => {
        const resolvedCoreModulePath = resolveCoreModulePath(path, specifier);

        if (
          resolvedCoreModulePath === null ||
          APPROVED_CORE_ENTRY_FILES.has(resolvedCoreModulePath)
        ) {
          return [];
        }

        return [
          `${relative(process.cwd(), path)} deep-imports ${specifier}; use core, a focused core/* entry point, or core/core-balance`
        ];
      });
    });

    expect(violations).toEqual([]);
  });
});
