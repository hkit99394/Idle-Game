import { describe, expect, it } from "vitest";
import { buildCompatibilityAliasIndex } from "../../core/compatibility";
import {
  PRODUCT_RUNTIME_ALIASES,
  PRODUCT_RUNTIME_ALIAS_INDEX
} from "../../web/runtimeIdentityAliases";

describe("runtime identity aliases", () => {
  it("defines the Stage 2.4 product/runtime migration targets", () => {
    expect(PRODUCT_RUNTIME_ALIASES).toEqual([
      expect.objectContaining({
        legacyId: "path-of-jianghu",
        targetId: "path-of-neon",
        phase: "product_keys"
      }),
      expect.objectContaining({
        legacyId: "path-of-jianghu.save.v1",
        targetId: "path-of-neon.save.v1",
        phase: "product_keys"
      }),
      expect.objectContaining({
        legacyId: "path-of-jianghu-shell-v1",
        targetId: "path-of-neon-shell-v1",
        phase: "product_keys"
      }),
      expect.objectContaining({
        legacyId: "path-of-jianghu-shell-",
        targetId: "path-of-neon-shell-",
        phase: "product_keys"
      }),
      expect.objectContaining({
        legacyId: "/icons/path-of-jianghu.svg",
        targetId: "/icons/path-of-neon.svg",
        phase: "product_keys"
      })
    ]);
  });

  it("looks up aliases by legacy id, target id, and phase", () => {
    expect(
      PRODUCT_RUNTIME_ALIAS_INDEX.getByLegacyId("path-of-jianghu.save.v1")
    ).toMatchObject({
      targetId: "path-of-neon.save.v1",
      displayName: "Browser save storage key"
    });
    expect(
      PRODUCT_RUNTIME_ALIAS_INDEX.getByTargetId("path-of-neon-shell-v1")
    ).toMatchObject({
      legacyId: "path-of-jianghu-shell-v1",
      displayName: "Service worker shell cache name"
    });
    expect(PRODUCT_RUNTIME_ALIAS_INDEX.getByPhase("product_keys")).toHaveLength(
      PRODUCT_RUNTIME_ALIASES.length
    );
  });

  it("returns null for missing aliases", () => {
    expect(PRODUCT_RUNTIME_ALIAS_INDEX.getByLegacyId("bamboo_road")).toBeNull();
    expect(
      PRODUCT_RUNTIME_ALIAS_INDEX.getByTargetId("greenline_approach")
    ).toBeNull();
  });

  it("rejects duplicate legacy ids", () => {
    expect(() =>
      buildCompatibilityAliasIndex([
        PRODUCT_RUNTIME_ALIASES[0],
        {
          ...PRODUCT_RUNTIME_ALIASES[0],
          targetId: "path-of-neon-duplicate"
        }
      ])
    ).toThrow("Duplicate legacyId alias: path-of-jianghu");
  });

  it("rejects duplicate target ids", () => {
    expect(() =>
      buildCompatibilityAliasIndex([
        PRODUCT_RUNTIME_ALIASES[0],
        {
          ...PRODUCT_RUNTIME_ALIASES[0],
          legacyId: "path-of-jianghu-duplicate"
        }
      ])
    ).toThrow("Duplicate targetId alias: path-of-neon");
  });
});
