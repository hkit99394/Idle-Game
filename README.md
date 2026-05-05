# Path of Jianghu

An idle martial arts RPG concept built around separate **Outer Art** and **Inner Art** combat.

Start with the main design draft:

- [Martial Idle RPG Design, Roadmap, and Formula Draft](docs/martial-idle-design.md)
- [Planning Questions Before Analysis Stage](docs/planning-questions.md)
- [Analysis Stage](docs/analysis-stage.md)
- [Archived Stage 1.1 Backlog](docs/archive/stage-1.1-backlog.md)
- [Archived MVP Backlog](docs/archive/mvp-backlog.md)
- [Balance Template CSV](docs/balance-template.csv)

## Current Prototype

- Responsive web prototype with continuous stage fighting.
- Clicking a map route card selects where the team fights; cleared non-boss cards also become the offline farm target.
- Bamboo Road and Mist Valley are implemented with team encounters, formation slots, targeting rules, CP, levels, rewards, equipment, and map mastery.
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
- `npm run simulate`: print the Stage 1.1 multi-region balance report.
- `npm run simulate -- --json`: print the full balance report data.
