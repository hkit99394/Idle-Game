import type { TacticPresetView } from "../../state/viewModels/tacticsTypes";

type TacticsPanelProps = {
  tactics: TacticPresetView[];
  onSelectTactic: (tacticId: string) => void;
};

export function TacticsPanel({
  tactics,
  onSelectTactic
}: TacticsPanelProps) {
  const selectedTactic = tactics.find((tactic) => tactic.selected);

  return (
    <section className="tactics-panel" aria-label="Tactic presets">
      <div className="tactics-heading">
        <div>
          <span className="label">Tactic</span>
          <h2>{selectedTactic?.name ?? "Balanced Form"}</h2>
        </div>
        <span>{tactics.length} forms</span>
      </div>
      <div className="tactics-grid">
        {tactics.map((tactic) => (
          <button
            key={tactic.tacticId}
            type="button"
            className={`tactic-option ${tactic.selected ? "selected" : ""}`}
            aria-pressed={tactic.selected}
            onClick={() => onSelectTactic(tactic.tacticId)}
          >
            <span className="tactic-option-heading">
              <strong>{tactic.name}</strong>
              {tactic.selected ? <em>Selected</em> : null}
            </span>
            <span className="tactic-description">{tactic.description}</span>
            <span className="tactic-tags">
              {[
                ...tactic.behaviorTags,
                ...tactic.modifierSummary
              ].map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
