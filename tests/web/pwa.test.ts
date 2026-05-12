import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  registerServiceWorker,
  SERVICE_WORKER_PATH,
  shouldRegisterServiceWorker,
  type PwaRegistrationEnvironment
} from "../../web/pwa";

const manifestPath = new URL("../../public/manifest.webmanifest", import.meta.url);
const serviceWorkerPath = new URL("../../public/service-worker.js", import.meta.url);
const indexHtmlPath = new URL("../../index.html", import.meta.url);

function readManifest(): Record<string, any> {
  return JSON.parse(readFileSync(manifestPath, "utf8"));
}

describe("PWA install and offline shell contracts", () => {
  it("defines install metadata and a maskable app icon", () => {
    const manifest = readManifest();

    expect(manifest).toMatchObject({
      id: "/",
      name: "Path of Jianghu",
      short_name: "Jianghu",
      start_url: "/",
      scope: "/",
      display: "standalone",
      orientation: "any",
      theme_color: "#16231f",
      background_color: "#f4efe2"
    });
    expect(manifest.icons).toEqual([
      {
        src: "/icons/path-of-jianghu.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any maskable"
      }
    ]);

    for (const icon of manifest.icons) {
      expect(
        existsSync(new URL(`../../public${icon.src}`, import.meta.url)),
        `${icon.src} should exist`
      ).toBe(true);
    }
  });

  it("links the manifest and theme color from the app shell", () => {
    const html = readFileSync(indexHtmlPath, "utf8");

    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest" />');
    expect(html).toContain('<meta name="theme-color" content="#16231f" />');
    expect(html).toContain(
      '<link rel="icon" type="image/svg+xml" href="/icons/path-of-jianghu.svg" />'
    );
  });

  it("keeps the service worker shell-only and save-safe", () => {
    const source = readFileSync(serviceWorkerPath, "utf8");

    expect(source).toContain('const CACHE_NAME = "path-of-jianghu-shell-v1"');
    expect(source).toContain('"/index.html"');
    expect(source).toContain('"/manifest.webmanifest"');
    expect(source).toContain('"/icons/path-of-jianghu.svg"');
    expect(source).toContain('request.method !== "GET"');
    expect(source).toContain('!url.pathname.startsWith("/api/")');
    expect(source).not.toMatch(/\b(?:localStorage|sessionStorage|indexedDB)\b/);
    expect(source).not.toContain("exportedSaveText");
    expect(source).not.toContain("importSaveDataToStorage");
  });

  it("registers the service worker only for production secure or local origins", () => {
    const serviceWorker = {
      register: async () => ({})
    };

    expect(shouldRegisterServiceWorker({
      hostname: "example.com",
      isProductionBuild: false,
      protocol: "https:",
      serviceWorker
    })).toBe(false);
    expect(shouldRegisterServiceWorker({
      hostname: "example.com",
      isProductionBuild: true,
      protocol: "http:",
      serviceWorker
    })).toBe(false);
    expect(shouldRegisterServiceWorker({
      hostname: "localhost",
      isProductionBuild: true,
      protocol: "http:",
      serviceWorker
    })).toBe(true);
    expect(shouldRegisterServiceWorker({
      hostname: "example.com",
      isProductionBuild: true,
      protocol: "https:",
      serviceWorker
    })).toBe(true);
  });

  it("defers registration until window load", () => {
    const registeredPaths: string[] = [];
    const loadListeners: Array<() => void> = [];
    const environment: PwaRegistrationEnvironment = {
      addEventListener: (_type, listener) => {
        loadListeners.push(listener);
      },
      hostname: "localhost",
      isProductionBuild: true,
      protocol: "http:",
      serviceWorker: {
        register: async (scriptUrl) => {
          registeredPaths.push(scriptUrl);
        }
      }
    };

    registerServiceWorker(environment);

    expect(registeredPaths).toEqual([]);
    const loadListener = loadListeners[0];
    expect(loadListener).toBeDefined();
    if (!loadListener) {
      throw new Error("Expected service worker registration to attach load listener");
    }

    loadListener();

    expect(registeredPaths).toEqual([SERVICE_WORKER_PATH]);
  });
});
