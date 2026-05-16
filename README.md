# Path of Neon

An idle cyber-sect RPG concept built around separate **Kinetic Art** and **Cognitive Art** combat.

Path of Neon is the new product direction for the project formerly called Path of Jianghu. Some internal ids and save fields still contain legacy Path of Jianghu names until the dedicated internal-id migration finishes.

Start with the current contributor docs:

- [Current Implemented Systems](docs/current-implemented-systems.md)
- [Core Engine Boundary](docs/core-engine-boundary.md)
- [Combat Engine V2](docs/combat-engine-v2.md)
- [Web UI Architecture](docs/web-ui-architecture.md)
- [Stage 2.2 Headless Engine Boundary Audit](docs/stage-2.2-headless-engine-audit.md)
- [Path Of Neon Theme Bible](docs/path-of-neon-theme-bible.md)
- [Path Of Neon Terminology Map](docs/path-of-neon-terminology-map.md)
- [Path Of Neon Retheme Migration Plan](docs/retheme-migration-plan.md)
- [Path Of Neon Internal Id Migration](docs/path-of-neon-internal-id-migration.md)
- [Stage 3.1 Backlog: District Heat Contract And Pacing Hardening](docs/stage-3.1-backlog.md)
- [Archived Stage 3.0 Backlog: Cognitive Intrusion Prototype](docs/archive/stage-3.0-backlog.md)
- [Cognitive Intrusion Prototype Contract](docs/cognitive-intrusion-prototype-contract.md)
- [Martial Idle RPG Design, Roadmap, and Formula Draft](docs/martial-idle-design.md)
- [Archived Roadmap: Stage 1.7 To 2.2](docs/archive/roadmap-stage-1.7-to-2.2.md)
- [Save API](docs/save-api.md)
- [Cloud Save Contract](docs/cloud-save-contract.md)
- [PWA Readiness](docs/pwa-readiness.md)
- [Online Boss Transport Decision](docs/online-boss-transport-decision.md)
- [Static Data](docs/static-data.md)
- [Content Pipeline Inventory](docs/content-pipeline-inventory.md)
- [Balance Budget Gates](docs/balance-budget-gates.md)
- [Balance Template CSV](docs/balance-template.csv)
- [Release Readiness Checklist](docs/release-readiness-checklist.md)

Historical planning and archived backlogs:

- [Planning Questions Before Analysis Stage](docs/archive/planning-questions.md)
- [Analysis Stage](docs/archive/analysis-stage.md)
- [Archived Stage 2.9 Backlog](docs/archive/stage-2.9-backlog.md)
- [Archived Stage 2.8 Backlog](docs/archive/stage-2.8-backlog.md)
- [Archived Stage 2.8 Combat Save And Symbol Preflight](docs/archive/stage-2.8-combat-save-symbol-preflight.md)
- [Archived Stage 2.7 Backlog](docs/archive/stage-2.7-backlog.md)
- [Archived Stage 2.7 Save Field Preflight](docs/archive/stage-2.7-save-field-preflight.md)
- [Archived Stage 2.6 Backlog](docs/archive/stage-2.6-backlog.md)
- [Archived Stage 2.6 Content Id Preflight](docs/archive/stage-2.6-content-id-preflight.md)
- [Archived Stage 2.5 Backlog](docs/archive/stage-2.5-backlog.md)
- [Archived Stage 2.4 Backlog](docs/archive/stage-2.4-backlog.md)
- [Archived Stage 2.3 Backlog](docs/archive/stage-2.3-backlog.md)
- [Archived Stage 2.2 Backlog](docs/archive/stage-2.2-backlog.md)
- [Archived Stage 2.1 Backlog](docs/archive/stage-2.1-backlog.md)
- [Archived Stage 2.1 Tactics Audit](docs/archive/stage-2.1-tactics-audit.md)
- [Archived Stage 2.0 Backlog](docs/archive/stage-2.0-backlog.md)
- [Archived Stage 1.9 Backlog](docs/archive/stage-1.9-backlog.md)
- [Archived Stage 1.8 Backlog](docs/archive/stage-1.8-backlog.md)
- [Archived Stage 1.7 Backlog](docs/archive/stage-1.7-backlog.md)
- [Archived Stage 1.6 Backlog](docs/archive/stage-1.6-backlog.md)
- [Archived Stage 1.5 Backlog](docs/archive/stage-1.5-backlog.md)
- [Archived Stage 1.4 Backlog](docs/archive/stage-1.4-backlog.md)
- [Archived Stage 1.3 Backlog](docs/archive/stage-1.3-backlog.md)
- [Archived Stage 1.2 Backlog](docs/archive/stage-1.2-backlog.md)
- [Archived Stage 1.1 Backlog](docs/archive/stage-1.1-backlog.md)
- [Archived MVP Backlog](docs/archive/mvp-backlog.md)

## Current Prototype

- Responsive web prototype with continuous stage fighting.
- Product direction is now Path of Neon: techno-sects, neon districts, AI Overload combat, implemented Intrusion, and future neon-native systems such as District Heat, augment loadouts, network operations, and AI raid events.
- Clicking a map route card selects where the team fights; cleared non-boss cards also become the offline farm target.
- Bamboo Road, Mist Valley, Black Iron Fort, Lotus Monastery, and Demon Cult Outpost are implemented with team encounters, formation slots, targeting rules, CP, levels, rewards, equipment, medicine, status counterplay, and map mastery.
- Save export/import, reset, diagnostics, offline reward preview, time travel testing, and farm presets are available in the web UI.
- `core/` is kept backend-safe so battle, progression, offline rewards, saves, and validation can later move behind accounts or cloud save.

## Development

Recommended setup:

```bash
npm install
npm test
```

Useful scripts:

- `npm run dev`: start the Vite web prototype.
- `npm test`: run formula and data validation tests.
- `npm run typecheck`: run TypeScript checks.
- `npm run build`: compile the production web build.
- `npm run simulate`: print the current multi-region balance report.
- `npm run simulate -- --json`: print the full balance report data.
- `npm run simulate -- --export-json`: print compact authoring export JSON.
- `npm run simulate -- --csv`: print spreadsheet-friendly stage rows.
- `npm run simulate -- --tactics-json`: print tactic comparison export JSON.
- `npm run simulate -- --tactics-csv`: print tactic comparison CSV.
- `npm run support-decision`: print the current support/counterplay recommendation.
- `npm run verify`: run the release-readiness command chain.
