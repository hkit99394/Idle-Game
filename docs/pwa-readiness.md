# PWA Readiness

## Purpose

Stage 2.2 makes the existing web app installable and gives it a safe offline shell without changing save ownership. Local saves remain browser `localStorage` data managed by `web/state/saveStorage.ts`; the service worker only caches app shell assets.

## Install Metadata

The app shell declares:

- Manifest: `public/manifest.webmanifest`
- Canonical icon: `public/icons/path-of-neon.svg`
- Legacy icon compatibility path: `public/icons/path-of-jianghu.svg`
- Theme color: `#101418`
- Display mode: `standalone`
- Start URL and scope: `/`

Stage 2.3 updated the app title, manifest display name, short name, description, Apple web app title, and SVG icon metadata/artwork to Path of Neon. Stage 2.4 moved the canonical manifest and favicon path to `public/icons/path-of-neon.svg` while keeping `public/icons/path-of-jianghu.svg` available and cached for installed-PWA compatibility.

The current icon is an SVG with `purpose: "any maskable"`. If app stores or platform-specific launchers require PNG sizes later, add generated `192x192` and `512x512` PNGs without changing save behavior.

## Service Worker Strategy

`public/service-worker.js` uses a small shell cache:

- It precaches `/`, `/index.html`, `/manifest.webmanifest`, and the app icon.
- It handles only same-origin `GET` requests.
- It ignores `/api/` requests so future backend/cloud-save calls do not get cached by the shell worker.
- Navigations use network-first with a cached shell fallback.
- Static assets such as scripts, styles, fonts, images, Vite `/assets/`, icons, and the manifest use cache-first after they have been seen.

The service worker does not read or write `localStorage`, `sessionStorage`, IndexedDB, save export text, import text, or cloud-save payloads.

The canonical shell cache is `path-of-neon-shell-v1`. Activation deletes stale `path-of-jianghu-shell-*` and stale `path-of-neon-shell-*` caches except the current cache, and this behavior is covered in `tests/web/pwa.test.ts`.

## Registration

`web/pwa.ts` registers `/service-worker.js` only for production builds on HTTPS or localhost. Registration waits for the window `load` event so the first render and save startup path run normally.

Development runs stay unregistered by default because `import.meta.env.PROD` is false under Vite dev.

## Save Safety

Save safety rules:

- Browser storage remains canonical for local saves.
- Save import/export/reset/offline time-travel flows stay in `web/state/saveToolCommands.ts` and `web/state/saveStorage.ts`.
- Core save load, migration, validation, normalization, offline reward, and timestamp semantics stay in `core/save`.
- The service worker must never cache dynamic save exports, user import text, future `/api/` cloud-save calls, or failed write responses as app shell assets.
- PWA updates may refresh cached shell files, but they must not clear or rewrite local save storage.

## Verification

Source-level coverage lives in `tests/web/pwa.test.ts` and checks manifest fields, icon existence, shell HTML links, service-worker save-safety constraints, secure/local registration gating, and load-event registration.

Runtime smoke for a release should load the built app once, confirm the manifest and service worker are visible in browser dev tools, reload to verify local save persistence, then verify that a second no-time-elapsed reload does not duplicate offline rewards.

## Stage 2.2 Closure Smoke

Stage 2.2 closure served the production build with Vite preview at `http://127.0.0.1:4175/` and confirmed the built shell, manifest, service worker, and maskable SVG icon were reachable. The service-worker source still excludes `/api/` requests from shell caching.

Interactive browser smoke was not required for Epic 78 because the closure epic changed docs only. Source-level PWA tests and the production preview smoke covered the installed app artifacts.
