import { FORMATION_SLOTS } from "../../../core";
import type { FormationSlot } from "../../../core";
import type { SetGameActiveHeroTeamInput } from "../../state/gameState";
import type {
  PlayerFormationHeroView,
  RosterHeroView
} from "../../state/viewModels/rosterTypes";
import { formatCombatRole, formatFormationSlot, formatNumber } from "./shared";

type RosterPanelProps = {
  activeTeamSize: number;
  heroes: RosterHeroView[];
  onSetActiveTeam: (input: SetGameActiveHeroTeamInput) => void;
  status: string;
};

export function RosterPanel({
  activeTeamSize,
  heroes,
  onSetActiveTeam,
  status
}: RosterPanelProps) {
  const activeHeroIds = heroes
    .filter((hero) => hero.active)
    .map((hero) => hero.heroId);

  return (
    <section className="roster-panel" aria-label="Hero roster">
      <div className="roster-panel-heading">
        <div>
          <span className="label">Roster</span>
          <h2>Active Disciples</h2>
        </div>
        <span>
          {activeHeroIds.length}/{activeTeamSize} active
        </span>
      </div>
      <div className="roster-grid">
        {heroes.map((hero) => {
          const nextHeroIds = hero.active
            ? activeHeroIds.filter((heroId) => heroId !== hero.heroId)
            : [...activeHeroIds, hero.heroId];
          const canChange = hero.active ? hero.canDeactivate : hero.canActivate;
          const buttonLabel = !hero.unlocked
            ? hero.lockReason ?? "Locked"
            : hero.active
              ? hero.canDeactivate
                ? "Remove"
                : "Keep"
              : hero.canActivate
                ? "Join"
                : "Full";

          return (
            <article
              key={hero.heroId}
              className={`roster-card ${
                hero.active ? "active" : ""
              } ${hero.unlocked ? "" : "locked"}`}
            >
              <div className="roster-card-heading">
                <div>
                  <strong>{hero.name}</strong>
                  <span>{hero.role}</span>
                </div>
                <span>CP {formatNumber(hero.combatPower)}</span>
              </div>
              <div className="roster-tags">
                <span>{hero.style}</span>
                <span>{formatCombatRole(hero.combatRole)}</span>
                <span>Lv {formatNumber(hero.level)}</span>
                {hero.assignedAssignmentName ? (
                  <span>{hero.assignedAssignmentName}</span>
                ) : null}
              </div>
              <button
                type="button"
                disabled={!canChange}
                onClick={() => onSetActiveTeam({ heroIds: nextHeroIds })}
              >
                {buttonLabel}
              </button>
            </article>
          );
        })}
      </div>
      {status ? <div className="upgrade-status">{status}</div> : null}
    </section>
  );
}

type FormationPanelProps = {
  heroes: PlayerFormationHeroView[];
  onSetFormation: (heroId: string, slot: FormationSlot) => void;
};

export function FormationPanel({ heroes, onSetFormation }: FormationPanelProps) {
  return (
    <section className="formation-panel" aria-label="Player formation">
      <div className="formation-panel-heading">
        <div>
          <span className="label">Formation</span>
          <h2>Disciples</h2>
        </div>
        <span>{heroes.length} heroes</span>
      </div>
      <div className="formation-slots">
        {FORMATION_SLOTS.map((slot) => {
          const heroesInSlot = heroes.filter(
            (hero) => hero.formationSlot === slot
          );

          return (
            <div key={slot} className="formation-slot">
              <strong>{formatFormationSlot(slot)}</strong>
              {heroesInSlot.length > 0 ? (
                heroesInSlot.map((hero) => (
                  <span key={hero.heroId}>{hero.name}</span>
                ))
              ) : (
                <span>Empty</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="formation-controls">
        {heroes.map((hero) => (
          <article key={hero.heroId} className="formation-hero">
            <div>
              <strong>{hero.name}</strong>
              <span>
                {hero.role} · {formatCombatRole(hero.combatRole)}
              </span>
            </div>
            <div className="formation-buttons" role="group" aria-label={`${hero.name} position`}>
              {FORMATION_SLOTS.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  className={hero.formationSlot === slot ? "selected" : ""}
                  aria-pressed={hero.formationSlot === slot}
                  onClick={() => onSetFormation(hero.heroId, slot)}
                >
                  {formatFormationSlot(slot)}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
