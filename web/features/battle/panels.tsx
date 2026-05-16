import type {
  BattleCombatantView,
  BattleEventBadgeView,
  BattleEventView,
  BattleSummaryView
} from "../../state/viewModels/battleTypes";
import {
  formatCombatRole,
  formatFormationSlot,
  formatNumber,
  StatBar
} from "../shared/ui";
import { displayTerms } from "../../displayTerms";

type CombatantCardProps = {
  combatant: BattleCombatantView;
};

export function CombatantCard({ combatant }: CombatantCardProps) {
  const contributionStats = [
    combatant.contributionDamage > 0
      ? `Damage ${formatNumber(combatant.contributionDamage)}`
      : null,
    combatant.contributionRecovery > 0
      ? `Recovery ${formatNumber(combatant.contributionRecovery)}`
      : null,
    combatant.contributionProtection > 0
      ? `Protection ${formatNumber(combatant.contributionProtection)}`
      : null,
    combatant.contributionRecoveryPrevented > 0
      ? `Denied ${formatNumber(combatant.contributionRecoveryPrevented)}`
      : null
  ].filter((stat): stat is string => stat !== null);

  return (
    <article
      className={`combatant-card ${combatant.kind} ${
        combatant.isDefeated ? "defeated" : ""
      } ${
        combatant.isOverloaded ? "overloaded" : ""
      }`}
    >
      <div className="combatant-heading">
        <div>
          <strong>{combatant.name}</strong>
          <span>{combatant.role}</span>
        </div>
        <div className="combatant-tags">
          <span className="slot-tag">{formatFormationSlot(combatant.formationSlot)}</span>
          <span className="role-tag">{formatCombatRole(combatant.combatRole)}</span>
          <span className="level-tag">Lv {formatNumber(combatant.level)}</span>
          <span className="cp-tag">CP {formatNumber(combatant.combatPower)}</span>
          <span className="style-tag">{combatant.style}</span>
        </div>
      </div>
      <StatBar
        className="outer"
        label={displayTerms.combat.bodyIntegrity}
        current={combatant.bodyIntegrity}
        max={combatant.maxBodyIntegrity}
      />
      <StatBar
        className="inner"
        label={displayTerms.combat.contextStability}
        current={combatant.contextStability}
        max={combatant.maxContextStability}
      />
      <div className="combatant-stats">
        <span>
          {displayTerms.combat.kineticAttack} {formatNumber(combatant.kineticAttack)}
        </span>
        <span>
          {displayTerms.combat.cognitiveAttack} {formatNumber(combatant.cognitiveAttack)}
        </span>
        <span>Speed {formatNumber(combatant.speed)}</span>
      </div>
      {contributionStats.length > 0 ? (
        <div className="combatant-contributions">
          {contributionStats.map((stat) => (
            <span key={stat}>{stat}</span>
          ))}
        </div>
      ) : null}
      {combatant.isOverloaded || combatant.isDefeated ? (
        <div
          className={`combatant-status ${
            combatant.isDefeated ? "defeated-status" : "overloaded-status"
          }`}
        >
          {combatant.isDefeated ? "Defeated" : "Overloaded"}
        </div>
      ) : null}
    </article>
  );
}

type TeamPanelProps = {
  title: string;
  combatants: BattleCombatantView[];
};

export function TeamPanel({ combatants, title }: TeamPanelProps) {
  const totalCombatPower = combatants.reduce(
    (total, combatant) => total + combatant.combatPower,
    0
  );

  return (
    <section className="team-panel" aria-label={title}>
      <div className="team-heading">
        <h2>{title}</h2>
        <span>CP {formatNumber(totalCombatPower)}</span>
      </div>
      {combatants.length > 0 ? (
        <div className="combatant-list">
          {combatants.map((combatant) => (
            <CombatantCard key={combatant.instanceId} combatant={combatant} />
          ))}
        </div>
      ) : (
        <p className="empty-panel">No units available</p>
      )}
    </section>
  );
}

type BattleLogProps = {
  events: BattleEventView[];
  summary: BattleSummaryView | null;
};

export function BattleLog({ events, summary }: BattleLogProps) {
  return (
    <section className="battle-log" aria-label="Combat event playback">
      <div className="battle-log-heading">
        <h2>Run Record</h2>
        {events.length > 0 ? <span>{events.length} events</span> : null}
      </div>
      {summary ? (
        <div className="battle-summary">
          <strong>{summary.title}</strong>
          {summary.details.map((detail) => (
            <span key={detail}>{detail}</span>
          ))}
        </div>
      ) : (
        <p className="empty-log">No battle yet</p>
      )}
      {events.length > 0 ? (
        <ol className="event-list">
          {events.map((event) => (
            <li key={event.id} className={`event-row ${event.category}`}>
              <span className="event-time">{event.timeLabel}</span>
              <div>
                <strong>{event.headline}</strong>
                <span>{event.detail}</span>
                <EventBadges badges={event.badges} />
              </div>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

type EventBadgesProps = {
  badges: BattleEventBadgeView[];
};

export function EventBadges({ badges }: EventBadgesProps) {
  if (badges.length === 0) {
    return null;
  }

  return (
    <div className="event-badges">
      {badges.map((badge, index) => (
        <span key={`${badge.label}-${index}`} className={badge.tone}>
          {badge.label}
        </span>
      ))}
    </div>
  );
}
