import {
  buildCompatibilityAliasIndex,
  type CompatibilityAliasEntry
} from "../core";

export type RuntimeIdentityAliasPhase = "product_keys";

export const PRODUCT_RUNTIME_ALIASES = [
  {
    legacyId: "path-of-jianghu",
    targetId: "path-of-neon",
    displayName: "Package name",
    referenceFields: ["package.json:name", "package-lock.json:name"],
    phase: "product_keys"
  },
  {
    legacyId: "path-of-jianghu.save.v1",
    targetId: "path-of-neon.save.v1",
    displayName: "Browser save storage key",
    referenceFields: [
      "web/state/saveStorage.ts:WEB_SAVE_STORAGE_KEY",
      "web/state/viewModels/saveDiagnostics.ts:storageKey"
    ],
    phase: "product_keys"
  },
  {
    legacyId: "path-of-jianghu-shell-v1",
    targetId: "path-of-neon-shell-v1",
    displayName: "Service worker shell cache name",
    referenceFields: ["public/service-worker.js:CACHE_NAME"],
    phase: "product_keys"
  },
  {
    legacyId: "path-of-jianghu-shell-",
    targetId: "path-of-neon-shell-",
    displayName: "Service worker shell cache cleanup prefix",
    referenceFields: ["public/service-worker.js:activate"],
    phase: "product_keys"
  },
  {
    legacyId: "/icons/path-of-jianghu.svg",
    targetId: "/icons/path-of-neon.svg",
    displayName: "PWA app icon path",
    referenceFields: [
      "index.html:favicon",
      "public/manifest.webmanifest:icons",
      "public/service-worker.js:APP_SHELL_URLS"
    ],
    phase: "product_keys"
  }
] as const satisfies readonly CompatibilityAliasEntry<RuntimeIdentityAliasPhase>[];

export const PRODUCT_RUNTIME_ALIAS_INDEX = buildCompatibilityAliasIndex(
  PRODUCT_RUNTIME_ALIASES
);
