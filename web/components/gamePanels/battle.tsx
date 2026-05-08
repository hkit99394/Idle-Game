import type {
  BattleCombatantView,
  BattleEventBadgeView,
  BattleEventView,
  BattleSummaryView
} from "../../state/gameState";
import {
  formatCombatRole,
  formatFormationSlot,
  formatNumber,
  StatBar
} from "./shared";

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
        combatant.isQiBroken ? "qi-broken" : ""
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
        label="Outer HP"
        current={combatant.outerHp}
        max={combatant.maxOuterHp}
      />
      <StatBar
        className="inner"
        label="Inner Qi"
        current={combatant.innerQi}
        max={combatant.maxInnerQi}
      />
      <div className="combatant-stats">
        <span>Outer Attack {formatNumber(combatant.outerAttack)}</span>
        <span>Inner Attack {formatNumber(combatant.innerAttack)}</span>
        <span>Speed {formatNumber(combatant.speed)}</span>
      </div>
      {contributionStats.length > 0 ? (
        <div className="combatant-contributions">
          {contributionStats.map((stat) => (
            <span key={stat}>{stat}</span>
          ))}
        </div>
      ) : null}
      {combatant.isQiBroken || combatant.isDefeated ? (
        <div
          className={`combatant-status ${
            combatant.isDefeated ? "defeated-status" : "qi-broken-status"
          }`}
        >
          {combatant.isDefeated ? "Defeated" : "Qi Broken"}
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
        <p className="empty-panel">No combatants available</p>
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
    <section className="battle-log" aria-label="Battle event playback">
      <div className="battle-log-heading">
        <h2>Battle Record</h2>
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
