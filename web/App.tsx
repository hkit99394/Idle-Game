import "./styles/app.css";
import { createStatusDictionary } from "../core";
import type { ActiveStatusEffect, StatusEffectDefinition } from "../core";
import statusEffects from "../data/statusEffects.json" with { type: "json" };
import {
  buildStatusChipViewModels,
  buildStatusSummaryViewModel
} from "./statusPresentation";

const statusDefinitions = createStatusDictionary(
  statusEffects as StatusEffectDefinition[]
);

const discipleStatuses: ActiveStatusEffect[] = [
  {
    statusId: "poison",
    remainingSeconds: 8,
    stacks: 3
  },
  {
    statusId: "wound",
    remainingSeconds: 3,
    stacks: 1
  },
  {
    statusId: "qi_suppression",
    remainingSeconds: 2,
    stacks: 1
  }
];

const enemyStatuses: ActiveStatusEffect[] = [
  {
    statusId: "vulnerable",
    remainingSeconds: 4,
    stacks: 2
  },
  {
    statusId: "burning_blood",
    remainingSeconds: 3,
    stacks: 1
  }
];

const discipleStatusChips = buildStatusChipViewModels(
  discipleStatuses,
  statusDefinitions
);
const enemyStatusChips = buildStatusChipViewModels(
  enemyStatuses,
  statusDefinitions
);
const statusSummary = buildStatusSummaryViewModel({
  statusDefinitions,
  tickEvents: [
    {
      type: "status_tick",
      statusId: "poison",
      stacks: 3,
      outerDamage: 36,
      targetName: "Iron Fist Disciple"
    },
    {
      type: "status_tick",
      statusId: "poison",
      stacks: 3,
      outerDamage: 36,
      targetName: "Iron Fist Disciple"
    }
  ],
  cleanses: [
    {
      combatantName: "Mountain Staff Guardian",
      statusId: "poison"
    },
    {
      combatantName: "Mountain Staff Guardian",
      statusId: "wound"
    }
  ]
});

export function App() {
  return (
    <main className="app-shell">
      <section className="battle-surface">
        <div className="resource-row">
          <span>Silver 0</span>
          <span>Cultivation 0</span>
          <span>Combat Exp 0</span>
        </div>
        <div className="battle-grid">
          <div className="team-panel">
            <h2>Disciples</h2>
            <div className="combatant-card">
              <div className="combatant-header">
                <strong>Iron Fist Disciple</strong>
                <span className="role-tag">Front</span>
              </div>
              <div className="bar outer"><span /></div>
              <div className="bar inner"><span /></div>
              <StatusChips chips={discipleStatusChips} />
            </div>
          </div>
          <div className="enemy-panel">
            <h2>Demon Cult Outpost</h2>
            <div className="combatant-card enemy">
              <div className="combatant-header">
                <strong>Demon Banner Captain</strong>
                <span className="role-tag danger">Boss</span>
              </div>
              <div className="bar outer"><span /></div>
              <div className="bar inner"><span /></div>
              <StatusChips chips={enemyStatusChips} />
            </div>
          </div>
        </div>
        <section className="summary-panel" aria-labelledby="summary-heading">
          <h2 id="summary-heading">Battle Summary</h2>
          <div className="callout-row">
            {statusSummary.callouts.map((callout) => (
              <span className="summary-callout" key={callout}>
                {callout}
              </span>
            ))}
          </div>
          <dl className="summary-list">
            {statusSummary.rows.map((row) => (
              <div className="summary-row" key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </section>
    </main>
  );
}

function StatusChips({
  chips
}: {
  chips: ReturnType<typeof buildStatusChipViewModels>;
}) {
  if (chips.length === 0) {
    return null;
  }

  return (
    <div className="status-chip-row" aria-label="Active statuses">
      {chips.map((chip) => (
        <span
          className={`status-chip ${chip.toneClassName} severity-${chip.severity}`}
          key={chip.statusId}
        >
          <span className="severity-dot" />
          <span>{chip.label}</span>
          {chip.stacksLabel && <span className="stack-label">{chip.stacksLabel}</span>}
          <span className="time-label">{chip.remainingLabel}</span>
        </span>
      ))}
    </div>
  );
}
