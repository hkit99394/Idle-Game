import type {
  EquipGameEquipmentInput,
  SetGameAssignmentHeroesInput
} from "../../state/gameState";
import type { AssignmentView } from "../../state/viewModels/assignmentTypes";
import type {
  EquipmentInventoryItemView,
  HeroEquipmentView
} from "../../state/viewModels/equipmentTypes";
import { formatNumber } from "./shared";

type EquipmentPanelProps = {
  heroes: HeroEquipmentView[];
  inventory: EquipmentInventoryItemView[];
  onEquip: (input: EquipGameEquipmentInput) => void;
  status: string;
};

export function EquipmentPanel({
  heroes,
  inventory,
  onEquip,
  status
}: EquipmentPanelProps) {
  const heroNames = new Map(heroes.map((hero) => [hero.heroId, hero.name]));

  return (
    <section className="equipment-panel" aria-label="Equipment">
      <div className="equipment-heading">
        <div>
          <span className="label">Gear</span>
          <h2>Equipment</h2>
        </div>
        <span>{inventory.reduce((total, item) => total + item.count, 0)} owned</span>
      </div>
      <div className="equipment-layout">
        <div className="hero-equipment-list">
          {heroes.map((hero) => (
            <article key={hero.heroId} className="hero-equipment-card">
              <div className="hero-equipment-heading">
                <strong>{hero.name}</strong>
                <span>{hero.style}</span>
              </div>
              <div className="equipment-slot-list">
                {hero.slots.map((slot) => (
                  <div key={slot.slot} className="equipment-slot-row">
                    <span>{slot.label}</span>
                    <strong
                      className={slot.rarity ? `rarity-${slot.rarity}` : ""}
                    >
                      {slot.name ?? "Empty"}
                    </strong>
                    {slot.setName ? (
                      <span className="equipment-slot-set">{slot.setName}</span>
                    ) : null}
                  </div>
                ))}
              </div>
              {hero.activeSetBonuses.length > 0 ? (
                <div className="equipment-set-bonuses">
                  {hero.activeSetBonuses.map((bonus) => (
                    <span key={bonus}>{bonus}</span>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
        <div className="equipment-inventory-list">
          {inventory.length > 0 ? (
            inventory.map((item) => (
              <article
                key={item.equipmentId}
                className={`equipment-item-card rarity-${item.rarity}`}
              >
                <div className="equipment-item-heading">
                  <div>
                    <strong>{item.name}</strong>
                    <span>
                      {item.slot} · {item.rarity}
                    </span>
                  </div>
                  <span>
                    {item.availableCount}/{item.count}
                  </span>
                </div>
                <div className="equipment-effects">
                  {item.effects.map((effect) => (
                    <span key={effect}>{effect}</span>
                  ))}
                </div>
                {item.affixes.length > 0 || item.setName ? (
                  <div className="equipment-affixes">
                    {item.affixes.map((affix) => (
                      <span key={affix}>{affix}</span>
                    ))}
                    {item.setName ? <span>Set: {item.setName}</span> : null}
                  </div>
                ) : null}
                {item.setBonuses.length > 0 ? (
                  <div className="equipment-set-bonuses">
                    {item.setBonuses.map((bonus) => (
                      <span key={bonus}>{bonus}</span>
                    ))}
                  </div>
                ) : null}
                <div className="equipment-styles">
                  {item.allowedStyles.map((style) => (
                    <span key={style}>{style}</span>
                  ))}
                </div>
                <div className="equipment-actions">
                  {item.compatibleHeroIds.length > 0 ? (
                    item.compatibleHeroIds.map((heroId) => (
                      <button
                        key={heroId}
                        type="button"
                        onClick={() =>
                          onEquip({
                            heroId,
                            equipmentId: item.equipmentId
                          })
                        }
                      >
                        Equip {heroNames.get(heroId) ?? heroId}
                      </button>
                    ))
                  ) : (
                    <span>No compatible free copy</span>
                  )}
                </div>
              </article>
            ))
          ) : (
            <p className="empty-panel">No equipment found</p>
          )}
        </div>
      </div>
      {status ? <div className="upgrade-status">{status}</div> : null}
    </section>
  );
}

type AssignmentPanelProps = {
  assignments: AssignmentView[];
  onSetAssignment: (input: SetGameAssignmentHeroesInput) => void;
  status: string;
};

export function AssignmentPanel({
  assignments,
  onSetAssignment,
  status
}: AssignmentPanelProps) {
  return (
    <section className="assignment-panel" aria-label="Patrols and training">
      <div className="assignment-heading">
        <div>
          <span className="label">Idle</span>
          <h2>Patrols And Training</h2>
        </div>
        <span>{assignments.filter((assignment) => assignment.assignedHeroIds.length > 0).length} active</span>
      </div>
      <div className="assignment-grid">
        {assignments.map((assignment) => (
          <article
            key={assignment.assignmentId}
            className={`assignment-card ${assignment.unlocked ? "" : "locked"}`}
          >
            <div className="assignment-card-heading">
              <div>
                <strong>{assignment.name}</strong>
                <span>
                  {assignment.type.replace("_", " ")} · {assignment.durationBucket}
                </span>
              </div>
              <span>{assignment.unlocked ? "Open" : assignment.lockReason}</span>
            </div>
            <div className="assignment-rewards">
              {assignment.rewardSummary.map((reward) => (
                <span key={reward}>{reward}</span>
              ))}
            </div>
            <div className="assignment-heroes">
              {assignment.heroOptions.map((hero) => {
                const disabled =
                  !assignment.unlocked ||
                  !hero.eligible ||
                  (!hero.assignedHere && hero.assignedAssignmentName !== null);
                const nextHeroIds = hero.assignedHere
                  ? assignment.assignedHeroIds.filter(
                      (heroId) => heroId !== hero.heroId
                    )
                  : [...assignment.assignedHeroIds, hero.heroId];

                return (
                  <button
                    key={hero.heroId}
                    className={hero.assignedHere ? "assigned" : ""}
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      onSetAssignment({
                        assignmentId: assignment.assignmentId,
                        heroIds: nextHeroIds
                      })
                    }
                  >
                    <strong>{hero.name}</strong>
                    <span>
                      {hero.assignedHere
                        ? "Assigned"
                        : hero.assignedAssignmentName ?? hero.role}
                    </span>
                  </button>
                );
              })}
            </div>
          </article>
        ))}
      </div>
      {status ? <div className="upgrade-status">{status}</div> : null}
    </section>
  );
}
