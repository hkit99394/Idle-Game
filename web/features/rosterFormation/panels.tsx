import { displayTerms } from "../../displayTerms";
import { PLAYER_FORMATION_SLOT_OPTIONS } from "../../state/viewModels/rosterTypes";
import type {
  PlayerFormationHeroView,
  PlayerFormationSlotView,
  RosterHeroView
} from "../../state/viewModels/rosterTypes";
import { formatCombatRole, formatFormationSlot, formatNumber } from "../shared/ui";

type SetRosterActiveTeamInput = {
  heroIds: string[];
};

type RosterPanelProps = {
  activeTeamSize: number;
  heroes: RosterHeroView[];
  onSetActiveTeam: (input: SetRosterActiveTeamInput) => void;
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
    <section
      className="roster-panel"
      aria-label={displayTerms.teams.initiateRoster}
    >
      <div className="roster-panel-heading">
        <div>
          <span className="label">Roster</span>
          <h2>{displayTerms.teams.activeInitiates}</h2>
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
                ? "Stand Down"
                : "Keep"
              : hero.canActivate
                ? "Deploy"
                : "Crew Full";

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
  onSetFormation: (heroId: string, slot: PlayerFormationSlotView) => void;
};

export function FormationPanel({ heroes, onSetFormation }: FormationPanelProps) {
  return (
    <section
      className="formation-panel"
      aria-label={`${displayTerms.teams.crew} ${displayTerms.teams.formation}`}
    >
      <div className="formation-panel-heading">
        <div>
          <span className="label">{displayTerms.teams.formation}</span>
          <h2>{displayTerms.progression.initiates}</h2>
        </div>
        <span>
          {heroes.length} {displayTerms.progression.initiates.toLowerCase()}
        </span>
      </div>
      <div className="formation-slots">
        {PLAYER_FORMATION_SLOT_OPTIONS.map((slot) => {
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
            <div
              className="formation-buttons"
              role="group"
              aria-label={`${hero.name} position`}
            >
              {PLAYER_FORMATION_SLOT_OPTIONS.map((slot) => (
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
