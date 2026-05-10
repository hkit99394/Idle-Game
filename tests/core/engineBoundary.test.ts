import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const CORE_ROOT = join(process.cwd(), "core");
const CORE_BALANCE_ROOT = join(CORE_ROOT, "balance");
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

function listExternalTypeScriptFiles(): string[] {
  return listTypeScriptFiles(process.cwd()).filter(
    (path) => !isSamePathOrChild(path, CORE_ROOT)
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

describe("core engine boundary", () => {
  it("keeps core modules independent of web, tools, and browser runtime APIs", () => {
    const forbiddenImportPattern =
      /from\s+["'][^"']*(?:web|tools)\b|import\s*\([^)]*["'][^"']*(?:web|tools)\b/;
    const browserRuntimePattern =
      /\b(?:window|document|localStorage|sessionStorage|navigator)\b/;
    const violations = listTypeScriptFiles(CORE_ROOT).flatMap((path) => {
      const source = readFileSync(path, "utf8");
      const relativePath = relative(process.cwd(), path);
      const fileViolations: string[] = [];

      if (forbiddenImportPattern.test(source)) {
        fileViolations.push(`${relativePath} imports app/tool code`);
      }

      if (browserRuntimePattern.test(source)) {
        fileViolations.push(`${relativePath} references browser runtime APIs`);
      }

      return fileViolations;
    });

    expect(violations).toEqual([]);
  });

  it("exposes stable package-style entry points for app and tool callers", () => {
    expect(existsSync(join(CORE_ROOT, "index.ts"))).toBe(true);
    expect(existsSync(join(CORE_ROOT, "core-balance.ts"))).toBe(true);
    expect(existsSync(join(CORE_ROOT, "combat", "index.ts"))).toBe(true);
    expect(existsSync(join(CORE_ROOT, "data", "index.ts"))).toBe(true);
    expect(existsSync(join(CORE_ROOT, "offline", "index.ts"))).toBe(true);
    expect(existsSync(join(CORE_ROOT, "progression", "index.ts"))).toBe(true);
    expect(existsSync(join(CORE_ROOT, "save", "index.ts"))).toBe(true);
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
    const scannedFiles = listExternalTypeScriptFiles();
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

    expect(scannedRelativePaths).toContain("data/staticGameData.ts");
    expect(violations).toEqual([]);
  });
});
