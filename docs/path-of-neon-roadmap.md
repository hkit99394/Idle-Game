# Path Of Neon Roadmap

This document is the short, middle, and long-term milestone map for Path of Neon after Stage 3.4 release hardening. It summarizes direction across the active docs; detailed contracts and verification requirements still live in the linked source documents.

Use this as the first planning reference when deciding what stage to prepare next. Use [Current Implemented Systems](current-implemented-systems.md) for current state, [District Heat Contract](district-heat-contract.md) for District Heat rules, [Progression Pacing Roadmap](progression-pacing-roadmap.md) for timeline and balance pacing, and [Path Of Neon Retheme Migration Plan](retheme-migration-plan.md) for broader product direction.

## Current Position

Path of Neon has completed the display-safe retheme, the first neon-native mechanic prototype, and the District Heat contract path:

- Stage 3.0 shipped the first Cognitive Intrusion slice as the implemented `cognitive_intrusion` status.
- Stage 3.1 added District Heat as report-only simulator evidence.
- Stage 3.2 and Stage 3.3 resolved the current pacing, offline parity, Redline, and Black Iron blockers needed before a player-facing heat step.
- Stage 3.4 completed the non-punitive District Heat warning contract, selected stronger report-only guard rails instead of live UI, and is archived at [Archived Stage 3.4 Backlog](archive/stage-3.4-backlog.md).

The current runtime still has no live District Heat UI, save field, cloud field, compact export field, tactic export field, reward modifier, route-risk modifier, or enemy-pressure modifier.

## Short Term

### Stage 3.5: District Attention Route-Card Prototype

[Stage 3.5 Backlog](stage-3.5-backlog.md) is active for the smallest player-facing warning surface for District Heat without changing gameplay.

Goal:

- Show neutral `district attention` copy on a route card only, using the Stage 3.4 contract language.
- Keep the warning informational, reversible, and non-punitive.

Allowed surface:

- Primary owner: `web/features/mapIdle/panels.tsx`.
- View-model owners only if needed: `web/state/viewModels/map.ts` and `web/state/viewModels/mapTypes.ts`.
- Approved future label: `Attention rising`.
- Approved future body: `Repeated runs are drawing district attention. Rewards, enemy pressure, and offline gains are unchanged.`
- Approved future support text: `Informational only.`

Required guard rails:

- Amend [District Heat Contract](district-heat-contract.md) before adding live copy.
- Amend `tests/web/displayTerms.test.ts` with an explicit allowlist for the named owner files.
- Prove rewards, enemy pressure, offline gains, saves, cloud payloads, compact exports, tactic exports, and route risk remain unchanged.
- Do not add a global meter, top-bar badge, modal, onboarding panel, district header, offline summary total, warning acknowledgement, save diagnostic, severity band, timer, number, or heat meter.

Suggested verification:

```sh
npm run typecheck
npm test -- tests/web/displayTerms.test.ts tests/docs/markdownLinks.test.ts
npm test -- tests/tools/balanceReport.test.ts tests/offline/offlineRewards.test.ts tests/save/saveSchema.factory.test.ts tests/save/cloudSaveContract.test.ts
npm run build
npm run simulate
git diff --check
```

Browser smoke is required for Stage 3.5 because it changes visible route-card UI.

## Middle Term

### Stage 3.6: District Heat Live Decision

After the route-card warning is visible and tested, decide whether District Heat remains informational or becomes a real mechanic.

Decision options:

| Option | Meaning | Default risk |
| --- | --- | --- |
| Warning-only | Keep the route-card note and no gameplay changes. | Lowest. |
| Report-only tooling | Remove or defer live copy and improve simulator evidence instead. | Low. |
| Offline recommendation scoring | Let heat influence author-facing or future route recommendation logic without changing rewards. | Medium. |
| Tiny live effect | Add one bounded effect after a dedicated save/export/UI contract. | High. |
| Persisted heat | Store district heat in saves and cloud payloads. | Highest; requires save-version and cloud-contract slices. |

Recommended posture:

- Prefer **warning-only** until the warning is proven readable and useful.
- Do not add reward modifiers, enemy-pressure modifiers, route-risk modifiers, or persisted heat in the same stage as the route-card prototype.
- Any live effect must open a separate slice with focused simulator evidence, save posture, export posture, UI tests, browser smoke, and rollback language.

### Stage 4.0: Next Neon System Selection

Once District Heat has either stabilized as warning-only or received an explicit live decision, choose the next neon-native system.

Candidate order:

| Candidate | Why it matters | Safe first milestone |
| --- | --- | --- |
| Augment Loadouts | Turns equipment into a stronger cyber-sect build layer. | One augment set with a clear tradeoff and no save churn unless already contracted. |
| Network Operations | Makes assignments feel like planned underworld work. | One operation reward profile and report visibility before a larger system. |
| Countermeasure Economy | Makes medicine/support tools feel cyber-native. | One anti-overload countermeasure or countermeasure UI polish slice. |
| AI Raid Event | Strong long-term online identity. | API/mock contract first; no production backend dependency in the first slice. |
| Hostile Cognitive Intrusion | Extends the first implemented neon mechanic to enemies or bosses. | One boss/status rule with clear counterplay and simulator evidence. |

Recommended next candidate after District Heat: **Augment Loadouts** if the goal is build depth, or **Network Operations** if the goal is idle/assignment depth.

## Long Term

Long-term Path of Neon should grow through explicit milestones rather than unbounded feature mixing.

### Product Pillars

- Deeper combat identity through Cognitive Intrusion, AI Overload, Context Stability, status pressure, and readable counterplay.
- Route and district identity through District Heat or district attention, but only after warning and save/export boundaries are clear.
- Build identity through augment loadouts, equipment sets, style branches, and role-defining upgrades.
- Idle identity through offline farming, assignments, network operations, and timeline-aware pacing.
- Online identity through account-safe cloud saves and later AI raid or boss transport contracts.

### Pacing Milestones

Use [Progression Pacing Roadmap](progression-pacing-roadmap.md) as the timing authority:

| Timeframe | Desired player outcome |
| --- | --- |
| 5 minutes | First 3 to 5 routes cleared and first upgrade bought. |
| 15 minutes | First boss discovered and either blocked or barely beaten. |
| 60 minutes | Region 2 opened and the offline farm loop understood. |
| Day 1 | Region 3 or first major counterplay wall reached. |
| Day 3 | Midgame systems such as tactics, equipment, assignments, and mastery rank 2 matter. |
| Day 7 | Late prototype content requires status, healing, defense, and countermeasure choices. |
| Long term | New district packs ship with milestone targets, timeline simulations, and budget checks. |

### Long-Term Milestone Themes

1. Stabilize warning-only District Heat or make an explicit live-heat decision.
2. Add one build-depth system, preferably Augment Loadouts, with strict save/export boundaries.
3. Add one idle-depth system, preferably Network Operations, with report visibility and assignment compatibility.
4. Expand countermeasure economy after status/counterplay pressure has enough content to justify it.
5. Prepare online boss or AI raid work only after account, cloud, transport, and deterministic simulation contracts are ready.
6. Build future district packs through the content pipeline: target pacing, budget gates, timeline simulation, exports, browser smoke, and archive-ready release notes.

## Deferred Until Contracted

These are not short-term work unless a new stage explicitly opens a contract:

- Persisted District Heat.
- Heat reward bonuses or penalties.
- Route-risk or enemy-pressure modifiers from heat.
- Stable compact export or tactic export heat fields.
- Save-version or cloud-envelope changes for heat.
- Global heat meters, severity bands, timers, onboarding copy, or warning acknowledgements.
- Production backend work for AI raids.
- Broad economy retunes mixed with a feature prototype.

## Milestone Hygiene

Every new stage should:

- name its contract and owner docs before code;
- keep save, cloud, export, simulator, and UI boundaries explicit;
- prefer one small feature or decision over several partially coupled systems;
- update this roadmap when it changes short, middle, or long-term direction;
- archive the completed backlog only after release-readiness verification passes.
