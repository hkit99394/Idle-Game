# Stage 2.2 Backlog

## Current Status

Stage 2.2 is complete and archived. Stage 2.1 completed tactic presets and strategy visibility and is archived at [Stage 2.1 Backlog](stage-2.1-backlog.md).

Closure verification passed: `npm run typecheck`, `npm test`, `npm run build`, `npm run simulate`, `npm run support-decision`, `git diff --check`, markdown path checks, stale active-backlog checks, and PWA static smoke against the built app. The simulator still reports the known Black Iron Fort and Demon Cult budget misses documented as tuning debt; Stage 2.2 did not retune content.

## Theme

The recommended theme is **Backend And PWA Readiness**. The goal is to make the current local web game ready for backend reuse, cloud-save design, mobile install, and optional online boss features without committing to a production backend before the contracts are clear.

Stage 2.2 should focus on boundaries and readiness rather than provider-specific infrastructure. The game already has a browser-safe core, save migrations, offline rewards, data validation, and simulator tooling; this stage should turn those into explicit headless contracts that a server, worker, or PWA shell can call safely.

## Decisions Carried Forward

- Keep `core/` free of browser, React, Vite-only, storage, and server-provider dependencies.
- Treat local save import/export and `loadSaveTransaction` semantics as the source of truth for future cloud-save behavior.
- Preserve local play and local save safety while adding PWA readiness.
- Prefer documented API contracts, fixtures, and adapter tests before introducing production auth, database, or hosting code.
- Keep WebSocket and live online systems optional until online boss requirements prove they need real-time state.
- Keep known Black Iron Fort and Demon Cult budget debt visible through active balance docs and simulator output, but do not retune content as part of backend/PWA readiness.
- Keep new content, new regions, new combat systems, and formation bonuses out of scope unless needed to prove a backend/PWA boundary.

## Stage Goals

- Define headless engine contracts for battle simulation, stage resolution, save validation, save loading, offline rewards, static-data validation, and progression actions.
- Confirm `core/` can be imported by future backend or worker callers without pulling in browser or web UI modules.
- Expand save migration fixture coverage and document the cloud-save model: account id, save slot, save version, checksum, updated timestamp, and conflict policy.
- Add PWA install basics: manifest, icon plan/assets, offline shell behavior, and local-save safety notes.
- Decide the online boss transport shape: polling, turn/result submission, or WebSocket.
- Update contributor docs so backend/PWA work starts from stable boundaries instead of web implementation details.

## Non-Goals

- No production backend deployment is required for this stage.
- No real account provider, payment, social login, or user-profile system.
- No production database schema or migration runner unless a local contract fixture requires one.
- No real-time WebSocket implementation unless the online boss decision proves it is required for the MVP.
- No native mobile application; PWA readiness targets the existing web app.
- No broad combat, economy, or content retune.
- No cloud sync that can overwrite local saves without an explicit conflict policy.

## Exit Criteria

- Headless engine APIs and adapter expectations are documented and covered by focused tests.
- Future backend callers can import approved core entry points without web dependencies.
- Save migration fixtures cover every supported legacy save version and the cloud-save contract is documented.
- PWA install/offline shell behavior is implemented or explicitly scoped with acceptance criteria for the next implementation stage.
- Online boss transport requirements are decided before any WebSocket or polling implementation begins.
- Active docs explain where backend, PWA, cloud-save, and online boss work should begin.
- `npm run typecheck`, `npm test`, `npm run build`, `npm run simulate`, `npm run support-decision`, relevant PWA/browser smoke, `git diff --check`, and docs/link checks pass before archival.

## Epic Summary

| Epic | Title | Status | Purpose |
| --- | --- | --- | --- |
| 73 | Headless Engine Boundary Audit | Complete | Inventory current core entry points and define backend-safe caller contracts |
| 74 | Server-Safe Core Import Contract | Complete | Make backend/worker import expectations explicit and covered by tests |
| 75 | Save Migration And Cloud-Save Contract | Complete | Harden save compatibility and design cloud-save payload/conflict rules |
| 76 | PWA Install And Offline Shell | Complete | Add install/offline readiness while protecting local save behavior |
| 77 | Online Boss Transport Decision | Complete | Decide whether online boss play needs polling, turn/result submission, or WebSocket |
| 78 | Backend/PWA Docs And Stage 2.2 Readiness | Complete | Close the stage with updated docs, verification, and archive cleanup |

---

## Epic 73: Headless Engine Boundary Audit

### Goal

Define the headless engine surface a backend, worker, or future API layer can call without knowing about React, browser storage, or UI state.

### Tasks

- Audit current public entry points in [Core Engine Boundary](../core-engine-boundary.md), `core/index.ts`, and focused `core/*/index.ts` modules.
- Identify the smallest backend-safe workflows: validate static data, parse/import save, load save with offline rewards, resolve stage battle, simulate battle, apply progression commands, and generate balance report data.
- Record which workflows are pure core calls and which require adapters for clock, storage, account identity, or persistence.
- Define request/result shape expectations for headless workflows without adding HTTP concerns to `core/`.
- Identify any current deep imports used by web or tools that should become public entry points before backend work.
- Document risks around deterministic time, offline reward timestamps, and idempotent persistence.

### Acceptance Criteria

- Contributors can see which core APIs are approved for backend/worker callers.
- Web, tools, and future backend responsibilities are separated clearly.
- Any missing public entry points are named before implementation work begins.
- Clock, storage, account, and persistence adapter boundaries are documented.

### Test Coverage

- No behavior change is required.
- Markdown path/link check if docs change.
- Existing boundary tests should be reviewed for backend-readiness gaps.

### Progress Notes

- Completed the headless engine audit in [Stage 2.2 Headless Engine Boundary Audit](../stage-2.2-headless-engine-audit.md).
- Approved `core/index.ts`, focused `core/*/index.ts` modules, and `core/core-balance.ts` as the current backend/worker starting surfaces.
- Recorded backend-safe workflows for static-data validation, save parsing/loading, offline rewards, battle simulation, stage battle resolution, progression commands, balance reports, and counterplay previews.
- Confirmed by source scan that `core/` has no browser, React, Vite-only, wall-clock, or random runtime dependency.
- Identified follow-up work for Epic 74: import-boundary tests, Node-like import smoke, and public export guidance for any future promoted helpers.

---

## Epic 74: Server-Safe Core Import Contract

### Goal

Prove that approved core entry points can be imported outside the web app without pulling browser-only or React dependencies into a backend context.

### Tasks

- Add or update import-boundary tests for `core/index.ts`, focused `core/*/index.ts` modules, and `core/core-balance.ts`.
- Add a backend/worker import smoke test that imports approved core surfaces in a Node-like test environment.
- Check that core exports do not depend on `web/`, `tools/`, `window`, `document`, `localStorage`, React, or Vite-only globals.
- Decide whether `package.json` needs internal export guidance or whether docs are enough while the package remains private.
- Document approved imports and discouraged deep imports for future service code.
- Keep tool-only formatting and web-only state adapters outside the server-safe surface.

### Acceptance Criteria

- Approved core imports are mechanically guarded by tests.
- Import-boundary failures point at actionable dependency violations.
- Backend or worker callers have a documented import path for combat, progression, save, offline, data, and balance workflows.
- No web UI behavior changes are introduced.

### Test Coverage

- Focused boundary/import tests.
- `npm run typecheck`.
- `npm test`.

### Progress Notes

- Extended [tests/core/engineBoundary.test.ts](../../tests/core/engineBoundary.test.ts) with a Node-like runtime import smoke for `core/index.ts`, focused `core/*/index.ts` modules, and `core/core-balance.ts`.
- Expanded the boundary scan so `core/` fails if it imports web/tool code, React, Vite/test runtime code, browser APIs, wall-clock time, or ambient randomness.
- Added a web/data/tool import guard that allows only approved core entry points from production callers; test-only deep imports remain available for focused module assertions.
- Kept `package.json` unchanged while the project remains private. Docs plus boundary tests are the current import guidance; package export maps can be revisited if core becomes a published/shared package.

---

## Epic 75: Save Migration And Cloud-Save Contract

### Goal

Make save compatibility and cloud-save semantics explicit enough that a later backend can store, compare, and resolve saves without reinterpreting web behavior.

### Tasks

- Verify migration fixtures cover every value in `SUPPORTED_SAVE_DATA_VERSIONS`.
- Add or update fixture tests for migration metadata, normalization, timestamps, selected tactic, offline rewards, assignments, farm presets, auto-medicine preferences, and equipment state.
- Define a cloud-save payload shape with account id, save slot id, save version, checksum/hash, updated timestamp, created timestamp, and raw save data.
- Define conflict policy for local-newer, cloud-newer, equal timestamp, checksum mismatch, unsupported future version, and failed write cases.
- Document how cloud-load should route through `loadSaveTransaction` or `parseSaveData` without duplicating migration/offline reward logic.
- Decide which parts of cloud save are backend responsibility versus web adapter responsibility.

### Acceptance Criteria

- Every supported save version has fixture coverage.
- Cloud-save contracts preserve current local import/export and load semantics.
- Conflict cases have clear user-facing and adapter-facing outcomes.
- Future-version saves remain rejected rather than downgraded.

### Test Coverage

- Save migration fixture tests.
- Save load transaction tests.
- Validation tests for representative cloud-save payload/conflict helpers if implemented.
- `npm test -- tests/save`.

### Progress Notes

- Added pure core cloud-save helpers in `core/save/cloudSave.ts`: `createCloudSaveEnvelope`, `validateCloudSaveEnvelope`, `parseCloudSaveEnvelope`, `loadCloudSaveEnvelopeTransaction`, and `decideCloudSaveConflict`.
- Documented the wrapped cloud payload, load flow, conflict policy, and adapter/backend responsibilities in [Cloud Save Contract](../cloud-save-contract.md).
- Added cloud-save contract tests covering envelope validation, future-version rejection, cloud load routing through `loadSaveTransaction`, local-newer, cloud-newer, equal-timestamp checksum mismatch, both-changed offline, and failed-write retry decisions.
- Added a migration fixture coverage test proving every legacy value in `SUPPORTED_SAVE_DATA_VERSIONS` has one fixture.
- Added load transaction coverage for offline assignment rewards and timestamp advancement/idempotency.

---

## Epic 76: PWA Install And Offline Shell

### Goal

Make the web app installable and safer to use offline while preserving current local-save behavior.

### Tasks

- Add or define the web app manifest with app name, short name, start URL, display mode, theme/background colors, and icon requirements.
- Add app icons or document the required icon asset plan if generated assets are deferred.
- Add an offline shell/service worker strategy that caches the app shell without corrupting local save state.
- Ensure local storage remains the canonical local save store and is not silently cleared by PWA updates.
- Add user-facing update/offline behavior only if needed for save safety.
- Add source-level and browser smoke checks for install metadata, offline shell load, and save persistence after reload/update.

### Acceptance Criteria

- The app has a valid PWA manifest or an explicit implementation-ready manifest plan.
- Offline shell behavior is documented and safe for local saves.
- PWA caching does not cache dynamic save exports or user import text as app assets.
- Browser smoke covers install/offline basics when visible or runtime behavior changes land.

### Test Coverage

- Build/typecheck.
- Source-level tests for manifest/service-worker helpers if introduced.
- Browser smoke for app load, reload persistence, and offline shell behavior when implemented.

### Progress Notes

- Added install metadata in `index.html` and `public/manifest.webmanifest`, plus the maskable app icon at `public/icons/path-of-jianghu.svg`.
- Added `public/service-worker.js` with a same-origin `GET`-only app-shell cache, network-first navigations, cache-first static assets, and explicit `/api/` exclusion for future backend/cloud-save calls.
- Added production secure/local service-worker registration in `web/pwa.ts` and wired it from `web/main.tsx` after the first render.
- Added source-level PWA coverage in [tests/web/pwa.test.ts](../../tests/web/pwa.test.ts) for manifest fields, icon existence, HTML links, service-worker save safety, secure/local gating, and load-event registration.
- Documented the PWA cache strategy and local-save safety rules in [PWA Readiness](../pwa-readiness.md).
- Verified the production build copies the manifest, service worker, and icon into `dist/`; local HTTP smoke served the app shell, manifest, service worker, and icon from the Vite dev server.

---

## Epic 77: Online Boss Transport Decision

### Goal

Decide the minimum transport model for optional online boss play before implementation creates unnecessary real-time complexity.

### Tasks

- Define the online boss MVP question: shared boss progress, asynchronous attempts, event leaderboard, seeded challenge, or live co-op combat.
- Compare polling, turn/result submission, WebSocket, and server-authoritative simulation against current deterministic combat and save boundaries.
- Identify what data would be submitted: account id, save slot/version/checksum, team snapshot, tactic id, boss id, seed, result, and contribution summary.
- Decide whether server-side simulation is required or whether client result submission is acceptable for the first prototype.
- Document anti-cheat and trust assumptions separately from transport mechanics.
- Record what remains out of scope for Stage 2.2 and what would become Stage 2.3+ work.

### Acceptance Criteria

- The backlog records the recommended online boss transport path or explains why online boss remains deferred.
- WebSocket is used only if live shared state is required.
- The decision maps cleanly to save/cloud contracts and deterministic combat boundaries.
- Future implementation epics can start without reopening the transport debate.

### Test Coverage

- No production behavior change is required.
- Markdown path/link check if docs change.
- Optional focused tests only if prototype helper contracts are added.

### Progress Notes

- Completed the online boss transport decision in [Online Boss Transport Decision](../online-boss-transport-decision.md).
- Chose HTTP attempt submission plus lightweight polling for the first asynchronous event boss, with server-side deterministic simulation as the authoritative result source.
- Deferred WebSocket until live shared combat, chat, real-time boss HP animation, or another low-latency shared-state requirement exists.
- Defined the future request/result envelope: account/session identity, save slot/version/checksum/timestamp, event/boss ids, idempotent attempt id, challenge seed, team snapshot, authoritative battle summary, reward grant, leaderboard contribution, and event revision.
- Recorded trust assumptions separately from transport mechanics: client preview results are diagnostics only; shared progress, ranked placement, and rewards must come from persisted server-simulated attempts.

---

## Epic 78: Backend/PWA Docs And Stage 2.2 Readiness

### Goal

Close Stage 2.2 with accurate backend/PWA docs, release verification, browser smoke notes, and next-stage readiness.

### Tasks

- Update [Current Implemented Systems](../current-implemented-systems.md) with final backend/PWA readiness status.
- Update [Core Engine Boundary](../core-engine-boundary.md), [Save API](../save-api.md), and [Web UI Architecture](../web-ui-architecture.md) with any new boundaries or PWA responsibilities.
- Update README and roadmap notes so active and archived backlog links remain accurate.
- Record PWA/browser smoke outcomes or explicit deferred rerun items.
- Run release-readiness commands and docs/link checks.
- Archive this backlog only after all epics are complete and verification passes.

### Acceptance Criteria

- Active docs explain backend-safe core entry points, cloud-save semantics, PWA behavior, and online boss transport decisions.
- No active docs point to missing or stale backlog paths.
- Stage closure records required commands, browser/PWA smoke outcome, save/cloud outcome, online boss decision, and any deferred P3s.
- The next stage can start from accurate current-state docs.

### Test Coverage

- Release-readiness command set.
- PWA/browser smoke for visible/runtime web changes, or an explicit deferred P3 rerun note if the browser runner is unavailable.
- Manual markdown path checks or link-check script.

### Progress Notes

- Updated active onboarding, engine boundary, save, web architecture, README, and roadmap docs with the final Stage 2.2 backend/PWA readiness state.
- Archived the completed backlog at `docs/archive/stage-2.2-backlog.md`; no active `docs/stage-2.2-backlog.md` copy remains.
- Release verification passed: `npm run typecheck`, `npm test` (62 files, 375 tests), `npm run build`, `npm run simulate`, `npm run support-decision`, `git diff --check`, markdown path checks, and stale active-backlog scans.
- PWA/static smoke passed against Vite preview at `http://127.0.0.1:4175/`: the built shell, manifest, service worker, and maskable SVG icon served successfully; the service worker source still excludes `/api/` requests.
- Browser interaction smoke is not required for Epic 78 because this epic changed closure docs only. Source-level PWA tests and the production preview smoke cover the Stage 2.2 PWA artifacts.
- Known budget misses remain deferred tuning debt: Black Iron Fort clear-time miss and Demon Cult clear-time/status-pressure misses still appear in simulator output and remain outside the backend/PWA readiness scope.

---

## Open Questions

- Epic 73: Answered in [Stage 2.2 Headless Engine Boundary Audit](../stage-2.2-headless-engine-audit.md). Use `core/index.ts`, focused `core/*/index.ts` modules, and `core/core-balance.ts`; promote any lower-level helper before backend use.
- Epic 74: Answered. Documentation plus boundary tests are enough while the package is private; add `package.json` export maps only if core becomes a published or separately consumed package.
- Epic 75: Answered in [Cloud Save Contract](../cloud-save-contract.md). Cloud save should store a wrapped envelope containing current raw save data, account id, slot id, checksum, timestamps, and optional migration metadata.
- Epic 75: Answered in [Cloud Save Contract](../cloud-save-contract.md). Matching checksums are no-op, one-sided changes sync automatically, timestamp fallback handles local-newer/cloud-newer, and both-changed or equal-timestamp checksum mismatches require manual conflict handling.
- Epic 76: Answered in [PWA Readiness](../pwa-readiness.md). Service-worker caching ships in this stage as a conservative app-shell/static-asset cache that ignores `/api/` and never touches local save storage.
- Epic 77: Answered in [Online Boss Transport Decision](../online-boss-transport-decision.md). The first online boss model is asynchronous HTTP attempt submission plus polling, with server-side deterministic simulation; WebSocket is deferred until live shared state is required.
- Epic 78: Answered. Stage 2.2 is complete and archived; the next recommended action is to prepare a Stage 2.3 backlog for backend adapter prototypes.

## Suggested Implementation Order

1. Epic 73: Headless Engine Boundary Audit
2. Epic 74: Server-Safe Core Import Contract
3. Epic 75: Save Migration And Cloud-Save Contract
4. Epic 76: PWA Install And Offline Shell
5. Epic 77: Online Boss Transport Decision
6. Epic 78: Backend/PWA Docs And Stage 2.2 Readiness

This order makes the reusable engine boundary explicit first, guards it mechanically, then defines save/cloud behavior, adds PWA readiness, resolves online boss transport scope, and closes the stage with accurate docs.
