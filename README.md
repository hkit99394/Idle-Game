# Path of Jianghu

An idle martial arts RPG concept built around separate **Outer Art** and **Inner Art** combat.

Start with the current contributor docs:

- [Current Implemented Systems](docs/current-implemented-systems.md)
- [Core Engine Boundary](docs/core-engine-boundary.md)
- [Combat Engine V2](docs/combat-engine-v2.md)
- [Web UI Architecture](docs/web-ui-architecture.md)
- [Martial Idle RPG Design, Roadmap, and Formula Draft](docs/martial-idle-design.md)
- [Recommended Roadmap: Stage 1.7 To 2.2](docs/roadmap-stage-1.7-to-2.2.md)
- [Save API](docs/save-api.md)
- [Static Data](docs/static-data.md)
- [Balance Budget Gates](docs/balance-budget-gates.md)
- [Balance Template CSV](docs/balance-template.csv)
- [Release Readiness Checklist](docs/release-readiness-checklist.md)

Historical planning and archived backlogs:

- [Planning Questions Before Analysis Stage](docs/planning-questions.md)
- [Analysis Stage](docs/analysis-stage.md)
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
- `npm run simulate`: print the current multi-region balance report.
- `npm run simulate -- --json`: print the full balance report data.
