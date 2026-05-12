import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const docsRoot = join(repoRoot, "docs");

function collectMarkdownFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return entry.name === "archive" ? [] : collectMarkdownFiles(entryPath);
    }

    return extname(entry.name) === ".md" ? [entryPath] : [];
  });
}

function stripFencedCode(source: string): string {
  return source.replace(/```[\s\S]*?```/g, "");
}

function normalizeLocalDestination(destination: string): string | null {
  const trimmed = destination.trim();

  if (
    trimmed === "" ||
    trimmed.startsWith("#") ||
    /^(?:https?:|mailto:)/i.test(trimmed)
  ) {
    return null;
  }

  const withoutTitle = trimmed.startsWith("<")
    ? trimmed.slice(1, trimmed.indexOf(">"))
    : trimmed.split(/\s+/)[0];

  const [withoutAnchor] = withoutTitle.split("#");
  return withoutAnchor === "" ? null : decodeURIComponent(withoutAnchor);
}

describe("active markdown links", () => {
  it("resolves local links from active docs without rewriting archive history", () => {
    const brokenLinks = collectMarkdownFiles(docsRoot).flatMap((filePath) => {
      const source = stripFencedCode(readFileSync(filePath, "utf8"));
      const links = [...source.matchAll(/!?\[[^\]]*]\(([^)]+)\)/g)];

      return links.flatMap((match) => {
        const localDestination = normalizeLocalDestination(match[1]);

        if (!localDestination) {
          return [];
        }

        const resolvedPath = resolve(dirname(filePath), localDestination);
        const exists =
          existsSync(resolvedPath) ||
          existsSync(`${resolvedPath}.md`) ||
          (existsSync(dirname(resolvedPath)) &&
            statSync(dirname(resolvedPath)).isDirectory() &&
            existsSync(resolve(dirname(resolvedPath), "index.md")));

        return exists
          ? []
          : [`${filePath.replace(`${repoRoot}/`, "")} -> ${match[1]}`];
      });
    });

    expect(brokenLinks).toEqual([]);
  });
});
