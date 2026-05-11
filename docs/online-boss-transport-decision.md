# Online Boss Transport Decision

## Purpose

Epic 77 decides the first transport shape for optional online boss play. This document is a decision record only: it does not add backend routes, account providers, databases, WebSocket handlers, or new boss content.

The decision must fit the existing Stage 2.2 boundaries:

- `core/` stays transport-free and browser-free.
- Cloud save wraps current `SaveData` in an account/slot/checksum envelope.
- PWA shell caching ignores future `/api/` calls.
- Combat and stage resolution remain deterministic core workflows that can run in a future backend or worker.

## Decision

The online boss MVP should use **HTTP attempt submission plus lightweight polling**, with the backend or worker running the deterministic battle simulation server-side.

Do not use WebSocket for the first online boss prototype. WebSocket becomes appropriate only if the product requirement changes to live shared combat, chat, real-time boss HP animation, or other low-latency shared state.

Do not treat client-submitted battle results as authoritative for competitive rewards, shared boss progress, or leaderboards. A client may include its preview result for diagnostics, but the accepted result should come from server-side simulation using approved core entry points.

## MVP Shape

The first online boss should be an asynchronous event boss:

- The client fetches the active event and boss state.
- The player starts an attempt against a server-issued or event-defined seed.
- The client submits an attempt envelope with account/save metadata and a minimal team snapshot.
- The backend validates the save metadata, simulates the attempt with deterministic core combat/progression APIs, persists the attempt idempotently, and updates shared contribution or leaderboard state.
- The client polls for attempt result, event progress, and leaderboard refresh.

This is not live co-op combat. Multiple players may contribute to shared progress, but their fights do not need synchronized turns or real-time shared simulation in the MVP.

## Transport Comparison

| Option | Fit | Decision |
| --- | --- | --- |
| Client result submission only | Simple to prototype, but weak for competitive rewards because battle output, damage, medicine use, and contribution can be forged. | Use only for local diagnostics or noncompetitive mock events. |
| HTTP attempt submission with server-side simulation | Matches deterministic core, cloud-save metadata, idempotent persistence, and PWA `/api/` exclusion. | Recommended MVP. |
| Polling shared event state | Good enough for boss HP/progress, personal result status, and leaderboard refresh on a 15-60 second cadence. | Use with HTTP attempt submission. |
| WebSocket shared state | Useful for live co-op, chat, turn coordination, or real-time combat presentation. Adds connection, ordering, reconnect, and state sync complexity. | Defer until live shared state is required. |
| Turn-by-turn submission | Only useful if future online boss design requires manual player actions during a fight. | Out of scope for the first async boss. |

## Attempt Request Shape

Future API adapters should keep HTTP concerns outside `core/`, but an implementation-ready request envelope should include:

| Field | Purpose |
| --- | --- |
| `accountId` | Authenticated account identity. Prefer deriving from session/auth rather than trusting only the request body. |
| `saveSlotId` | Slot being used for the attempt, such as `primary`. |
| `saveVersion` | Current save schema version expected by core. |
| `saveChecksum` | Checksum for the save payload the team snapshot came from. |
| `saveUpdatedAtMs` | Save timestamp used for cloud conflict and stale-attempt checks. |
| `eventId` | Online boss event identifier. |
| `bossId` | Boss definition within the event. |
| `attemptId` | Client-generated idempotency key scoped to account, slot, event, and boss. |
| `challengeSeed` | Server-issued or event-defined seed/nonce for reproducible simulation. |
| `teamSnapshot` | Minimal battle-relevant player state derived from `SaveData`: active heroes, formation, levels, equipment, style branches, skill upgrades, tactic id, medicine inventory/preferences, mastery, and other combat-affecting progress. |
| `clientCreatedAtMs` | Diagnostic timestamp only; not authoritative for ordering or rewards. |
| `clientPreviewResult` | Optional diagnostics. Must not be trusted for rewards, boss progress, or leaderboard placement. |

If cloud save is active, the backend should compare the submitted save metadata with the cloud-save envelope described in [Cloud Save Contract](cloud-save-contract.md). A stale or mismatched save should reject the attempt with a typed reason such as `save_conflict`, `cloud_save_required`, or `unsupported_save`.

## Attempt Result Shape

The server response or polled result should include:

| Field | Purpose |
| --- | --- |
| `attemptId` | Echoes the idempotency key. |
| `eventId` / `bossId` | Identifies the simulated challenge. |
| `status` | `accepted`, `rejected`, `running`, or `complete`. |
| `rejectionReason` | Typed rejection reason for stale saves, unsupported versions, invalid snapshots, rate limits, or expired events. |
| `challengeSeed` | Seed used by the authoritative simulation. |
| `battleSummary` | Server-simulated result summary, including winner, duration, damage, contribution, medicine use, and key metrics. |
| `rewardGrant` | Reward candidate or grant receipt, applied only after idempotent persistence succeeds. |
| `leaderboardContribution` | Score, damage, clear time, or contribution value accepted for shared state. |
| `eventRevision` | Monotonic event state revision useful for polling and cache invalidation. |
| `serverSimulatedAtMs` | Server timestamp for diagnostics and ordering. |

Rewards should not be presented as durable until the backend has persisted both the attempt and any contribution/reward side effects. Replaying the same `attemptId` should return the same accepted result rather than granting duplicate rewards.

## Trust And Anti-Cheat Assumptions

Server-side simulation is required for any online boss mode that affects shared progress, ranked placement, or rewards. The client is allowed to choose an eligible team and tactic, but the backend must validate the submitted snapshot against current save/cloud metadata before simulation.

Trust rules:

- Account/session identity is authoritative, not a body-only `accountId`.
- Save version, checksum, and timestamp must match an accepted local/cloud state before competitive attempts are accepted.
- Team snapshots are untrusted input and should be reduced to battle-relevant fields, validated, and bounded before core simulation.
- Client preview results are diagnostics only.
- Event seeds should be server-issued or signed so clients cannot reroll favorable attempts.
- Attempt submission must be idempotent and rate-limited.
- Leaderboard and shared progress should be derived from persisted server results only.

If a prototype intentionally skips cloud-save validation, label the event as untrusted/noncompetitive and do not use it for permanent rewards or ranked leaderboards.

## PWA And Save Interaction

Online boss attempts require network access. The PWA service worker already ignores `/api/`, so boss attempts, result polling, cloud save, and future auth calls should not be cached by the app shell.

The offline shell may show cached event UI or a read-only last-known state, but it should not queue competitive boss attempts while offline unless a later design adds a signed offline queue, replay protection, and explicit conflict handling.

## Future Endpoint Sketch

These routes are illustrative adapter contracts, not Stage 2.2 implementation requirements:

- `GET /api/online-boss/events/current`
- `POST /api/online-boss/events/:eventId/attempts`
- `GET /api/online-boss/events/:eventId/attempts/:attemptId`
- `GET /api/online-boss/events/:eventId/leaderboard`

Each route should translate request data into core-safe workflows, call approved core entry points, then serialize results. No HTTP route shape should leak into `core/`.

## Out Of Scope

Stage 2.2 does not implement:

- Production backend, auth, database, or hosting.
- WebSocket transport.
- Live co-op combat, chat, PvP, or real-time shared turns.
- Permanent online rewards.
- New boss content or event balancing.
- Full anti-cheat, fraud review, or moderation tooling.

Stage 2.3+ can start with endpoint contract tests, a local mock service, snapshot validation helpers, attempt persistence, leaderboard/state polling, and a browser smoke path once a backend adapter exists.
