# Path of Jianghu

An idle martial arts RPG concept built around separate **Outer Art** and **Inner Art** combat.

Start with the main design draft:

- [Martial Idle RPG Design, Roadmap, and Formula Draft](docs/martial-idle-design.md)
- [Planning Questions Before Analysis Stage](docs/planning-questions.md)
- [Analysis Stage](docs/analysis-stage.md)
- [Stage 1.1 Backlog](docs/stage-1.1-backlog.md)
- [Archived MVP Backlog](docs/archive/mvp-backlog.md)
- [Balance Template CSV](docs/balance-template.csv)

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
- `npm run simulate`: print the Bamboo Road balance report.
- `npm run simulate -- --json`: print the full balance report data.
