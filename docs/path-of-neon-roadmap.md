# Path Of Neon Roadmap

This document is the short, middle, and long-term milestone map for Path of Neon after Stage 3.5 release hardening. It summarizes direction across the active docs; detailed contracts and verification requirements still live in the linked source documents.

Use this as the first planning reference when deciding what stage to prepare next. Use [Current Implemented Systems](current-implemented-systems.md) for current state, [District Heat Contract](district-heat-contract.md) for District Heat rules, [Progression Pacing Roadmap](progression-pacing-roadmap.md) for timeline and balance pacing, and [Path Of Neon Retheme Migration Plan](retheme-migration-plan.md) for broader product direction.

## Current Position

Path of Neon has completed the display-safe retheme, the first neon-native mechanic prototype, and the District Heat warning-only route-card prototype:

- Stage 3.0 shipped the first Cognitive Intrusion slice as the implemented `cognitive_intrusion` status.
- Stage 3.1 added District Heat as report-only simulator evidence.
- Stage 3.2 and Stage 3.3 resolved the current pacing, offline parity, Redline, and Black Iron blockers needed before a player-facing heat step.
- Stage 3.4 completed the non-punitive District Heat warning contract, selected stronger report-only guard rails instead of live UI, and is archived at [Archived Stage 3.4 Backlog](archive/stage-3.4-backlog.md).
- Stage 3.5 shipped the smallest District Attention route-card warning surface and is archived at [Archived Stage 3.5 Backlog](archive/stage-3.5-backlog.md).

The current runtime has one warning-only District Attention route-card note for the selected offline farm target while it remains farmable. It still has no District Heat save field, cloud field, compact export field, tactic export field, reward modifier, route-risk modifier, enemy-pressure modifier, global heat meter, acknowledgement state, timer, or number.

## Short Term

### Stage 3.6: District Heat Live Decision

After the route-card warning is visible and tested, decide whether District Heat remains warning-only or becomes a real mechanic.

Goal:

- Keep the shipped route-card warning informational unless a dedicated slice explicitly approves more.
- Choose one posture for District Heat before any reward, risk, pressure, save, cloud, or export behavior changes.

Current shipped warning-only surface:

- Primary owner: `web/features/mapIdle/panels.tsx`.
- View-model owners: `web/state/viewModels/map.ts` and `web/state/viewModels/mapTypes.ts`.
- Display condition: selected offline farm route card while it remains farmable.
- Shipped label: `Attention rising`.
- Shipped body: `Repeated runs are drawing district attention. Rewards, enemy pressure, and offline gains are unchanged.`
- Shipped support text: `Informational only.`

Required guard rails:

- Keep [District Heat Contract](district-heat-contract.md) as the authority before changing warning scope.
- Keep `tests/web/displayTerms.test.ts` allowlisted only for the named owner files.
- Continue proving rewards, enemy pressure, offline gains, saves, cloud payloads, compact exports, tactic exports, and route risk remain unchanged unless the next stage deliberately changes them.
- Do not add a global meter, top-bar badge, modal, onboarding panel, district header, offline summary total, warning acknowledgement, save diagnostic, severity band, timer, number, heat meter, or durable heat field inside Stage 3.6 without a dedicated slice.

Suggested verification:

```sh
npm run typecheck
npm test -- tests/web/displayTerms.test.ts tests/docs/markdownLinks.test.ts
npm test -- tests/tools/balanceReport.test.ts tests/offline/offlineRewards.test.ts tests/save/saveSchema.factory.test.ts tests/save/cloudSaveContract.test.ts
npm run build
npm run simulate
git diff --check
```

Browser smoke is required if Stage 3.6 changes the visible route-card warning or adds any new player-facing District Heat surface.

Decision options:

| Option | Meaning | Default risk |
| --- | --- | --- |
| Warning-only | Keep the route-card note and no gameplay changes. | Lowest. |
| Report-only tooling | Remove or defer live copy and improve simulator evidence instead. | Low. |
| Offline recommendation scoring | Let heat influence author-facing or future route recommendation logic without changing rewards. | Medium. |
| Tiny live effect | Add one bounded effect after a dedicated save/export/UI contract. | High. |
| Persisted heat | Store district heat in saves and cloud payloads. | Highest; requires save-version and cloud-contract slices. |

Recommended posture:

- Prefer **warning-only** unless player feedback or simulator evidence justifies a bounded next step.
- Do not add reward modifiers, enemy-pressure modifiers, route-risk modifiers, or persisted heat without a dedicated save/export/UI contract.
- Any live effect must open a separate slice with focused simulator evidence, save posture, export posture, UI tests, browser smoke, and rollback language.

## Middle Term

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
