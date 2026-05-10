import type {
  MasteryPanelView,
  SkillUpgradeView,
  StyleMasteryView,
  UpgradeView
} from "../../state/viewModels/progressionTypes";
import { formatNumber, formatSignedPercent } from "../shared/ui";

type PurchaseUpgradePanelInput = {
  heroId?: string;
  upgradeId: string;
};

type PurchaseSkillUpgradePanelInput = {
  skillUpgradeId: string;
};

type SelectStyleBranchPanelInput = {
  branchId: string;
  styleId: string;
};

type MasteryPanelProps = {
  mastery: MasteryPanelView | null;
};

export function MasteryPanel({ mastery }: MasteryPanelProps) {
  if (!mastery) {
    return null;
  }

  const progressWidth = `${Math.round(mastery.progressPercent * 100)}%`;
  const nextThresholdLabel = mastery.nextThreshold
    ? `${formatNumber(mastery.nextThreshold.experience)} XP for ${mastery.nextThreshold.rank}`
    : "All thresholds reached";

  return (
    <section className="mastery-panel" aria-label="Map mastery">
      <div className="mastery-panel-heading">
        <div>
          <span className="label">Mastery</span>
          <h2>{mastery.regionName}</h2>
        </div>
        <div className="mastery-xp">
          {formatNumber(mastery.combatExperience)} Combat XP
        </div>
      </div>
      <div className="mastery-progress">
        <div className="bar-label">
          <span>Next Threshold</span>
          <strong>{nextThresholdLabel}</strong>
        </div>
        <div
          className="mastery-meter"
          role="meter"
          aria-label={`${mastery.regionName} mastery progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(mastery.progressPercent * 100)}
        >
          <span style={{ width: progressWidth }} />
        </div>
        {mastery.nextThreshold ? (
          <span className="mastery-next">
            {formatNumber(mastery.nextThreshold.remainingExperience)} XP remaining
          </span>
        ) : null}
      </div>
      <div className="mastery-columns">
        <div>
          <span className="label">Reached Ranks</span>
          <div className="mastery-chips">
            {mastery.reachedRanks.length > 0
              ? mastery.reachedRanks.map((rank) => (
                  <span key={rank.rank} className={`rank-chip ${rank.tone}`}>
                    {rank.label}
                  </span>
                ))
              : <span className="rank-chip unfamiliar">Unfamiliar</span>}
          </div>
        </div>
        <div>
          <span className="label">Active Bonuses</span>
          <div className="mastery-chips">
            {mastery.activeBonuses.length > 0
              ? mastery.activeBonuses.map((bonus) => (
                  <span key={bonus.key}>{bonus.label}</span>
                ))
              : <span>{formatSignedPercent(0)} active bonuses</span>}
          </div>
        </div>
      </div>
    </section>
  );
}

type UpgradePanelProps = {
  onPurchase: (input: PurchaseUpgradePanelInput) => void;
  silver: number;
  status: string;
  upgrades: UpgradeView[];
};

export function UpgradePanel({ onPurchase, silver, status, upgrades }: UpgradePanelProps) {
  return (
    <section className="upgrade-panel" aria-label="Outer and Inner Art">
      <div className="upgrade-panel-heading">
        <div>
          <span className="label">Arts</span>
          <h2>Outer And Inner Art</h2>
        </div>
        <div className="upgrade-silver">Silver {formatNumber(silver)}</div>
      </div>
      <div className="upgrade-grid">
        {upgrades.length > 0 ? (
          upgrades.map((upgrade) => (
            <article
              key={upgrade.key}
              className={`upgrade-card ${upgrade.affordable ? "" : "unaffordable"}`}
            >
              <div className="upgrade-heading">
                <div>
                  <strong>{upgrade.name}</strong>
                  <span>{upgrade.targetName}</span>
                </div>
                <span>{upgrade.art} art</span>
              </div>
              <div className="upgrade-stats">
                <span>Level {upgrade.level}</span>
                <span>Cost {formatNumber(upgrade.cost)}</span>
                {upgrade.effects.map((effect) => (
                  <span key={effect}>{effect}</span>
                ))}
                {!upgrade.affordable ? (
                  <span className="upgrade-shortfall">
                    Need {formatNumber(upgrade.missingSilver)} more silver
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                disabled={!upgrade.affordable}
                onClick={() =>
                  onPurchase({
                    upgradeId: upgrade.upgradeId,
                    heroId: upgrade.heroId
                  })
                }
              >
                {upgrade.affordable
                  ? "Train Art"
                  : `Need ${formatNumber(upgrade.missingSilver)} silver`}
              </button>
            </article>
          ))
        ) : (
          <p className="empty-panel">No upgrades available</p>
        )}
      </div>
      {status ? <div className="upgrade-status">{status}</div> : null}
    </section>
  );
}

type StyleMasteryPanelProps = {
  onSelectBranch: (input: SelectStyleBranchPanelInput) => void;
  styles: StyleMasteryView[];
  status: string;
};

export function StyleMasteryPanel({
  onSelectBranch,
  status,
  styles
}: StyleMasteryPanelProps) {
  return (
    <section className="style-mastery-panel" aria-label="Style mastery">
      <div className="style-mastery-heading">
        <div>
          <span className="label">Mastery</span>
          <h2>Martial Styles</h2>
        </div>
        <span>{styles.length} styles</span>
      </div>
      <div className="style-mastery-grid">
        {styles.map((style) => {
          const width = `${Math.round(style.progressPercent * 100)}%`;

          return (
            <article key={style.styleId} className="style-mastery-card">
              <div className="style-mastery-card-heading">
                <div>
                  <strong>{style.name}</strong>
                  <span>Level {formatNumber(style.level)}</span>
                </div>
                <span>{formatNumber(style.experience)} XP</span>
              </div>
              <div className="mastery-meter">
                <span style={{ width }} />
              </div>
              <div className="style-bonus-list">
                {style.bonuses.map((bonus) => (
                  <span key={bonus}>{bonus}</span>
                ))}
              </div>
              <div className="style-branch-list">
                {style.branches.map((branch) => (
                  <button
                    type="button"
                    key={branch.id}
                    className={
                      branch.isSelected
                        ? "selected"
                        : branch.isUnlocked
                          ? "unlocked"
                          : "locked"
                    }
                    disabled={!branch.canSelect}
                    onClick={() =>
                      onSelectBranch({
                        styleId: style.styleId,
                        branchId: branch.id
                      })
                    }
                    title={branch.effects.join(", ")}
                  >
                    <strong>{branch.name}</strong>
                    <span>
                      {branch.isSelected
                        ? "Selected"
                        : branch.isUnlocked
                          ? "Unlocked"
                          : branch.requirement}
                    </span>
                  </button>
                ))}
              </div>
            </article>
          );
        })}
      </div>
      {status ? <div className="upgrade-status">{status}</div> : null}
    </section>
  );
}

type SkillUpgradePanelProps = {
  cultivation: number;
  onPurchase: (input: PurchaseSkillUpgradePanelInput) => void;
  skillUpgrades: SkillUpgradeView[];
  status: string;
};

export function SkillUpgradePanel({
  cultivation,
  onPurchase,
  skillUpgrades,
  status
}: SkillUpgradePanelProps) {
  return (
    <section className="skill-upgrade-panel" aria-label="Skill upgrades">
      <div className="skill-upgrade-heading">
        <div>
          <span className="label">Techniques</span>
          <h2>Skill Refinement</h2>
        </div>
        <div className="upgrade-silver">
          Cultivation {formatNumber(cultivation)}
        </div>
      </div>
      <div className="upgrade-grid">
        {skillUpgrades.map((upgrade) => (
          <article
            key={upgrade.key}
            className={`upgrade-card ${upgrade.affordable ? "" : "unaffordable"}`}
          >
            <div className="upgrade-heading">
              <div>
                <strong>{upgrade.name}</strong>
                <span>{upgrade.skillName}</span>
              </div>
              <span>
                {upgrade.level}/{upgrade.maxLevel}
              </span>
            </div>
            <div className="upgrade-stats">
              <span>Cost {formatNumber(upgrade.cost)}</span>
              {upgrade.effects.map((effect) => (
                <span key={effect}>{effect}</span>
              ))}
              {!upgrade.affordable ? (
                <span className="upgrade-shortfall">
                  {upgrade.level >= upgrade.maxLevel
                    ? "Maximum refinement"
                    : `Need ${formatNumber(upgrade.missingCultivation)} more cultivation`}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              disabled={!upgrade.affordable}
              onClick={() =>
                onPurchase({
                  skillUpgradeId: upgrade.skillUpgradeId
                })
              }
            >
              {upgrade.affordable
                ? "Refine"
                : upgrade.level >= upgrade.maxLevel
                  ? "Maxed"
                  : `Need ${formatNumber(upgrade.missingCultivation)} cultivation`}
            </button>
          </article>
        ))}
      </div>
      {status ? <div className="upgrade-status">{status}</div> : null}
    </section>
  );
}
