import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const CORE_ROOT = join(process.cwd(), "core");

function listTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const stat = statSync(path);

    if (stat.isDirectory()) {
      return listTypeScriptFiles(path);
    }

    return path.endsWith(".ts") ? [path] : [];
  });
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
});
