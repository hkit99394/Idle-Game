import {
  buildEnemyTeamForStage,
  buildPlayerTeamForStage,
  calculateCombatPower,
  deriveStats,
  getBattleEventStatusId,
  getDefaultFormationSlot,
  getStageById,
  scaleStatsForLevel
} from "../../../core";
import type {
  BattleContribution,
  BattleEvent,
  CombatantInstanceDefinition,
  CombatantState,
  CombatRole,
  DerivedStats,
  FormationSlot,
  PlayerProgress,
  ResolveStageBattleResult,
  StaticGameData,
  TeamId
} from "../../../core";
import type {
  BattleCombatantView,
  BattleEventBadgeTone,
  BattleEventView,
  BattleSummaryView,
  PlayerFormationHeroView
} from "../types";

function getPreviewInstanceId(
  team: TeamId,
  instance: CombatantInstanceDefinition,
  nameId: string,
  index: number
): string {
  return instance.instanceId ?? `${team}_${nameId}_${index + 1}`;
}

export function calculateSkillSupportCombatPower(
  data: StaticGameData,
  skillIds: string[],
  stats: DerivedStats
): number {
  const skillsById = new Map(data.skills.map((skill) => [skill.id, skill]));

  return skillIds.reduce((total, skillId) => {
    const skill = skillsById.get(skillId);

    if (!skill) {
      return total;
    }

    const effectPower = skill.effects.reduce((effectTotal, effect) => {
      const durationMultiplier = Math.max(1, effect.durationSeconds ?? 1);

      switch (effect.type) {
        case "outer_heal_percent":
          return effectTotal + stats.maxOuterHp * effect.value * 0.5;
        case "inner_heal_percent":
          return effectTotal + stats.maxInnerQi * effect.value * 0.45;
        case "outer_regeneration_percent":
          return effectTotal +
            stats.maxOuterHp * effect.value * durationMultiplier * 0.35;
        case "inner_regeneration_percent":
          return effectTotal +
            stats.maxInnerQi * effect.value * durationMultiplier * 0.32;
        case "cleanse":
          return effectTotal + 80 * Math.max(1, effect.value);
        case "guard":
        case "protect":
          return effectTotal + stats.maxOuterHp * effect.value * 0.25;
        default:
          return effectTotal;
      }
    }, 0);

    return total + effectPower;
  }, 0);
}

function getContributionTotalDamage(contribution?: BattleContribution): number {
  return contribution
    ? contribution.outerDamageDealt +
        contribution.innerDamageDealt +
        contribution.qiBreakBurstDamageDealt
    : 0;
}

function getContributionRecovery(contribution?: BattleContribution): number {
  return contribution
    ? contribution.outerHealingDone + contribution.innerQiRestored
    : 0;
}

function getContributionProtection(contribution?: BattleContribution): number {
  return contribution
    ? contribution.guardDamagePrevented +
        contribution.protectionDamagePrevented
    : 0;
}

function createCombatantView(
  input: {
    instanceId: string;
    definitionId: string;
    team: TeamId;
    kind: "hero" | "enemy";
    name: string;
    style: string;
    role: string;
    combatRole: CombatRole;
    formationSlot: FormationSlot;
    level: number;
    stats: DerivedStats;
    skillIds: string[];
    combatPowerBonus?: number;
  },
  finalState?: CombatantState,
  contribution?: BattleContribution
): BattleCombatantView {
  const stats = finalState?.stats ?? input.stats;

  return {
    instanceId: input.instanceId,
    definitionId: input.definitionId,
    team: input.team,
    kind: input.kind,
    name: input.name,
    style: input.style,
    role: input.role,
    combatRole: input.combatRole,
    formationSlot: finalState?.formationSlot ?? input.formationSlot,
    level: Math.max(finalState?.level ?? input.level, input.level),
    outerHp: finalState?.outerHp ?? input.stats.maxOuterHp,
    innerQi: finalState?.innerQi ?? input.stats.maxInnerQi,
    maxOuterHp: finalState?.maxOuterHp ?? input.stats.maxOuterHp,
    maxInnerQi: finalState?.maxInnerQi ?? input.stats.maxInnerQi,
    outerAttack: stats.outerAttack,
    innerAttack: stats.innerAttack,
    speed: stats.speed,
    combatPower: Math.round(
      calculateCombatPower(stats) + (input.combatPowerBonus ?? 0)
    ),
    contributionDamage: getContributionTotalDamage(contribution),
    contributionRecovery: getContributionRecovery(contribution),
    contributionProtection: getContributionProtection(contribution),
    contributionRecoveryPrevented: contribution?.recoveryPrevented ?? 0,
    isQiBroken: finalState?.isQiBroken ?? false,
    isDefeated: finalState?.defeatedAt != null
  };
}

function getFinalCombatantById(
  finalCombatants: CombatantState[] | undefined,
  instanceId: string
): CombatantState | undefined {
  return finalCombatants?.find((combatant) => combatant.instanceId === instanceId);
}

function formatBattleNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
  }).format(Math.max(0, value));
}

function formatBattlePercent(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
    style: "percent"
  }).format(value);
}

function formatBattleSeconds(value: number): string {
  const maximumFractionDigits = value < 10 ? 1 : 0;

  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits
  }).format(value)}s`;
}

function buildCombatantNameLookup(
  battle: Extract<ResolveStageBattleResult, { ok: true }>["battle"]
): Map<string, string> {
  return new Map(
    [...battle.finalPlayerTeam, ...battle.finalEnemyTeam].map((combatant) => [
      combatant.instanceId,
      `${combatant.name} (${formatSlotLabel(combatant.formationSlot)})`
    ])
  );
}

function getName(lookup: Map<string, string>, instanceId: string): string {
  return lookup.get(instanceId) ?? instanceId;
}

function getSkillName(data: StaticGameData, skillId: string): string {
  return data.skills.find((skill) => skill.id === skillId)?.name ?? skillId;
}

function getStatusName(data: StaticGameData, statusId: string): string {
  return data.statusEffects.find((status) => status.id === statusId)?.name ?? statusId;
}

function getBattleStatusName(data: StaticGameData, statusId: string): string {
  switch (statusId) {
    case "armor_break":
      return "Armor Break";
    case "speed_down":
      return "Speed Down";
    case "inner_defense_down":
      return "Inner Defense Down";
    case "wound":
      return "Wound";
    default:
      return getStatusName(data, statusId);
  }
}

function formatAttackDetail(
  data: StaticGameData,
  event: Extract<BattleEvent, { type: "attack" }>
): string {
  const detail = [
    getSkillName(data, event.skillId),
    `${formatBattleNumber(event.outerDamage)} Outer damage`,
    `${formatBattleNumber(event.innerDamage)} Inner Qi damage`
  ];

  if (event.intendedTargetId && event.intendedTargetId !== event.targetId) {
    detail.push("redirected by protection");
  }

  return detail.join(" · ");
}

function buildBattleEventDetail(
  data: StaticGameData,
  event: BattleEvent,
  names: Map<string, string>
): Pick<BattleEventView, "category" | "headline" | "detail" | "badges"> {
  switch (event.type) {
    case "attack": {
      const source = getName(names, event.sourceId);
      const target = getName(names, event.targetId);
      const skillName = getSkillName(data, event.skillId);
      const intendedTarget =
        event.intendedTargetId && event.intendedTargetId !== event.targetId
          ? getName(names, event.intendedTargetId)
          : null;

      return {
        category: "attack",
        headline: intendedTarget
          ? `${source} attacks ${intendedTarget}`
          : `${source} attacks ${target}`,
        detail: formatAttackDetail(data, event),
        badges: [
          {
            label: skillName,
            tone: "skill"
          },
          {
            label: `${formatBattleNumber(event.outerDamage)} Outer HP`,
            tone: "outer"
          },
          {
            label: `${formatBattleNumber(event.innerDamage)} Inner Qi`,
            tone: "inner"
          },
          ...(intendedTarget
            ? [
                {
                  label: `${target} intercepts`,
                  tone: "neutral" as const
                }
              ]
            : [])
        ]
      };
    }

    case "guard": {
      const target = getName(names, event.targetId);

      return {
        category: "guard",
        headline: `${target} raises guard`,
        detail:
          `${getSkillName(data, event.skillId)} reduces incoming Outer damage by ` +
          `${formatBattlePercent(event.reduction)} until ${formatBattleSeconds(event.endsAt)}`,
        badges: [
          {
            label: "Guard",
            tone: "neutral"
          },
          {
            label: `${formatBattlePercent(event.reduction)} reduction`,
            tone: "outer"
          }
        ]
      };
    }

    case "guard_absorb": {
      const target = getName(names, event.targetId);

      return {
        category: "guard_absorb",
        headline: `${target}'s guard absorbs the strike`,
        detail:
          `${getSkillName(data, event.skillId)} prevents ` +
          `${formatBattleNumber(event.outerDamagePrevented)} Outer damage`,
        badges: [
          {
            label: `${formatBattleNumber(event.outerDamagePrevented)} blocked`,
            tone: "outer"
          },
          {
            label: "Guard",
            tone: "neutral"
          }
        ]
      };
    }

    case "protect": {
      const protector = getName(names, event.sourceId);
      const protectedTarget = getName(names, event.protectedId);
      const attacker = getName(names, event.attackerId);
      const prevented = event.outerDamagePrevented + event.innerDamagePrevented;

      return {
        category: "protect",
        headline: `${protector} protects ${protectedTarget}`,
        detail:
          `${getSkillName(data, event.skillId)} intercepts ${attacker} and prevents ` +
          `${formatBattleNumber(prevented)} total damage`,
        badges: [
          {
            label: "Protection",
            tone: "neutral"
          },
          {
            label: `${formatBattleNumber(prevented)} prevented`,
            tone: "outer"
          }
        ]
      };
    }

    case "armor_break": {
      const source = getName(names, event.sourceId);
      const target = getName(names, event.targetId);

      return {
        category: "armor_break",
        headline: `${source} breaks ${target}'s armor`,
        detail:
          `${getSkillName(data, event.skillId)} reduces guard and Outer Defense by ` +
          `${formatBattlePercent(event.reduction)} until ${formatBattleSeconds(event.endsAt)}`,
        badges: [
          {
            label: "Armor Break",
            tone: "danger"
          },
          {
            label: `${formatBattlePercent(event.reduction)} defense`,
            tone: "outer"
          }
        ]
      };
    }

    case "qi_break": {
      const source = getName(names, event.sourceId);
      const target = getName(names, event.targetId);

      return {
        category: "qi_break",
        headline: `${target} suffers Qi Break`,
        detail:
          `${source} drops Inner Qi to zero, bursts ` +
          `${formatBattleNumber(event.burstDamage)} Outer damage ` +
          `(${formatBattlePercent(event.burstPercent)}), recovers at ` +
          `${formatBattleSeconds(event.endsAt)}`,
        badges: [
          {
            label: "Qi Break",
            tone: "danger"
          },
          {
            label: `${formatBattleNumber(event.burstDamage)} burst`,
            tone: "outer"
          },
          {
            label: `${formatBattleSeconds(event.endsAt)} recovery`,
            tone: "qi"
          }
        ]
      };
    }

    case "qi_recover": {
      const target = getName(names, event.targetId);

      return {
        category: "qi_recover",
        headline: `${target} restores Inner Qi`,
        detail: `Inner Qi returns to ${formatBattleNumber(event.innerQi)}`,
        badges: [
          {
            label: `${formatBattleNumber(event.innerQi)} Inner Qi`,
            tone: "inner"
          }
        ]
      };
    }

    case "backlash": {
      const source = getName(names, event.sourceId);

      return {
        category: "backlash",
        headline: `${source} suffers backlash`,
        detail: `${formatBattleNumber(event.damage)} Outer damage while Qi Broken`,
        badges: [
          {
            label: `${formatBattleNumber(event.damage)} backlash`,
            tone: "danger"
          },
          {
            label: "Qi Broken",
            tone: "qi"
          }
        ]
      };
    }

    case "heal": {
      const source = getName(names, event.sourceId);
      const target = getName(names, event.targetId);
      const restored = event.outerHealing + event.innerQiRestored;
      const detail = [
        event.outerHealing > 0
          ? `${formatBattleNumber(event.outerHealing)} Outer HP`
          : null,
        event.innerQiRestored > 0
          ? `${formatBattleNumber(event.innerQiRestored)} Inner Qi`
          : null,
        event.overhealing > 0
          ? `${formatBattleNumber(event.overhealing)} overheal`
          : null,
        event.recoveryPrevented > 0
          ? `${formatBattleNumber(event.recoveryPrevented)} prevented by wound`
          : null
      ].filter(Boolean);

      return {
        category: "heal",
        headline:
          source === target
            ? `${target} restores balance`
            : `${source} restores ${target}`,
        detail:
          detail.length > 0
            ? `${getSkillName(data, event.skillId)} restores ${detail.join(" · ")}`
            : `${getSkillName(data, event.skillId)} has no effective recovery`,
        badges: [
          {
            label: `${formatBattleNumber(restored)} restored`,
            tone: "outer"
          },
          ...(event.recoveryPrevented > 0
            ? [
                {
                  label: `${formatBattleNumber(event.recoveryPrevented)} denied`,
                  tone: "danger" as const
                }
              ]
            : [])
        ]
      };
    }

    case "wound": {
      const source = getName(names, event.sourceId);
      const target = getName(names, event.targetId);

      return {
        category: "wound",
        headline: `${source} wounds ${target}`,
        detail:
          `${getSkillName(data, event.skillId)} reduces recovery by ` +
          `${formatBattlePercent(event.reduction)} until ${formatBattleSeconds(event.endsAt)}`,
        badges: [
          {
            label: "Wound",
            tone: "danger"
          },
          {
            label: `${formatBattlePercent(event.reduction)} recovery`,
            tone: "danger"
          }
        ]
      };
    }

    case "speed_down": {
      const source = getName(names, event.sourceId);
      const target = getName(names, event.targetId);

      return {
        category: "speed_down",
        headline: `${source} slows ${target}`,
        detail:
          `${getSkillName(data, event.skillId)} reduces speed by ` +
          `${formatBattlePercent(event.reduction)} until ${formatBattleSeconds(event.endsAt)}`,
        badges: [
          {
            label: "Speed Down",
            tone: "danger"
          },
          {
            label: `${formatBattlePercent(event.reduction)} speed`,
            tone: "danger"
          }
        ]
      };
    }

    case "inner_defense_down": {
      const source = getName(names, event.sourceId);
      const target = getName(names, event.targetId);

      return {
        category: "inner_defense_down",
        headline: `${source} weakens ${target}'s Inner Defense`,
        detail:
          `${getSkillName(data, event.skillId)} reduces Inner Defense by ` +
          `${formatBattlePercent(event.reduction)} until ${formatBattleSeconds(event.endsAt)}`,
        badges: [
          {
            label: "Inner Defense Down",
            tone: "danger"
          },
          {
            label: `${formatBattlePercent(event.reduction)} defense`,
            tone: "inner"
          }
        ]
      };
    }

    case "status_apply": {
      const source = getName(names, event.sourceId);
      const target = getName(names, event.targetId);
      const statusName = getStatusName(data, event.statusId);

      return {
        category: "status_apply",
        headline: `${source} applies ${statusName} to ${target}`,
        detail:
          `${getSkillName(data, event.skillId)} applies ${event.stacks} stack(s) for ` +
          `${formatBattleSeconds(event.durationSeconds)}`,
        badges: [
          {
            label: statusName,
            tone: "danger"
          },
          {
            label: `${formatBattlePercent(event.chance)} chance`,
            tone: "neutral"
          }
        ]
      };
    }

    case "status_tick": {
      const target = getName(names, event.targetId);
      const statusName = getStatusName(data, event.statusId);

      return {
        category: "status_tick",
        headline: `${target} suffers ${statusName}`,
        detail: `${formatBattleNumber(event.outerDamage)} Outer damage from ${statusName}`,
        badges: [
          {
            label: statusName,
            tone: "danger"
          },
          {
            label: `${formatBattleNumber(event.outerDamage)} Outer HP`,
            tone: "outer"
          }
        ]
      };
    }

    case "status_expire": {
      const target = getName(names, event.targetId);
      const statusName = getStatusName(data, event.statusId);

      return {
        category: "status_expire",
        headline: `${statusName} fades from ${target}`,
        detail: `${target} is no longer affected by ${statusName}`,
        badges: [
          {
            label: statusName,
            tone: "neutral"
          }
        ]
      };
    }

    case "regeneration": {
      const source = getName(names, event.sourceId);
      const target = getName(names, event.targetId);
      const barLabel = event.restores === "outer" ? "Outer HP" : "Inner Qi";

      return {
        category: "regeneration",
        headline:
          source === target
            ? `${target} starts regeneration`
            : `${source} grants regeneration to ${target}`,
        detail:
          `${getSkillName(data, event.skillId)} restores ${formatBattlePercent(
            event.percentPerTick
          )} ${barLabel} each second until ${formatBattleSeconds(event.endsAt)}`,
        badges: [
          {
            label: "Regeneration",
            tone: "neutral"
          },
          {
            label: `${formatBattlePercent(event.percentPerTick)} ${barLabel}`,
            tone: event.restores === "outer" ? "outer" : "inner"
          }
        ]
      };
    }

    case "regeneration_tick": {
      const target = getName(names, event.targetId);
      const restored = event.outerHealing + event.innerQiRestored;
      const detail = [
        event.outerHealing > 0
          ? `${formatBattleNumber(event.outerHealing)} Outer HP`
          : null,
        event.innerQiRestored > 0
          ? `${formatBattleNumber(event.innerQiRestored)} Inner Qi`
          : null,
        event.overhealing > 0
          ? `${formatBattleNumber(event.overhealing)} overheal`
          : null,
        event.recoveryPrevented > 0
          ? `${formatBattleNumber(event.recoveryPrevented)} prevented by wound`
          : null
      ].filter(Boolean);

      return {
        category: "regeneration_tick",
        headline: `${target} regenerates`,
        detail:
          detail.length > 0
            ? detail.join(" · ")
            : `${getSkillName(data, event.skillId)} has no effective recovery`,
        badges: [
          {
            label: `${formatBattleNumber(restored)} restored`,
            tone: "outer"
          },
          ...(event.recoveryPrevented > 0
            ? [
                {
                  label: `${formatBattleNumber(event.recoveryPrevented)} denied`,
                  tone: "danger" as const
                }
              ]
            : [])
        ]
      };
    }

    case "cleanse": {
      const source = getName(names, event.sourceId);
      const target = getName(names, event.targetId);
      const statuses = event.statusesRemoved
        .map((status) => getBattleStatusName(data, status))
        .join(", ");

      return {
        category: "cleanse",
        headline:
          source === target
            ? `${target} cleanses pressure`
            : `${source} cleanses ${target}`,
        detail: `${getSkillName(data, event.skillId)} removes ${statuses}`,
        badges: [
          {
            label: "Cleanse",
            tone: "neutral"
          },
          {
            label: statuses,
            tone: "danger"
          }
        ]
      };
    }

    case "defeat": {
      const target = getName(names, event.targetId);
      const defeatedSide = event.team === "player" ? "disciple" : "enemy";

      return {
        category: "defeat",
        headline: `${target} is defeated`,
        detail: `A ${defeatedSide} combatant falls`,
        badges: [
          {
            label: "Defeated",
            tone: "danger"
          },
          {
            label: defeatedSide,
            tone: "neutral"
          }
        ]
      };
    }
  }
}

export function buildBattleEventViews(
  data: StaticGameData,
  lastBattle: ResolveStageBattleResult | null
): BattleEventView[] {
  if (!lastBattle?.ok) {
    return [];
  }

  const names = buildCombatantNameLookup(lastBattle.battle);

  return lastBattle.battle.events.map((event, index) => {
    const detail = buildBattleEventDetail(data, event, names);

    return {
      id: `${index}-${event.type}-${event.time}`,
      statusId: getBattleEventStatusId(event),
      timeSeconds: event.time,
      timeLabel: formatBattleSeconds(event.time),
      ...detail
    };
  });
}

function formatWinner(winner: TeamId | "timeout"): string {
  switch (winner) {
    case "player":
      return "Victory";
    case "enemy":
      return "Defeat";
    case "timeout":
      return "Stalemate";
  }
}

function formatSlotLabel(slot: FormationSlot): string {
  return `${slot.charAt(0).toUpperCase()}${slot.slice(1)}`;
}

function formatRoleLabel(role: string): string {
  return role
    .replace(/[-_]+/g, " ")
    .replace(/^./, (match) => match.toUpperCase());
}

function getContributionDamage(contribution: BattleContribution): number {
  return (
    contribution.outerDamageDealt +
    contribution.innerDamageDealt +
    contribution.qiBreakBurstDamageDealt
  );
}

function getContributionSupport(contribution: BattleContribution): number {
  return (
    contribution.outerHealingDone +
    contribution.innerQiRestored +
    contribution.guardDamagePrevented +
    contribution.protectionDamagePrevented +
    contribution.recoveryPrevented +
    contribution.cleansesApplied * 40 +
    contribution.armorBreaksApplied * 40 +
    contribution.woundsApplied * 40
  );
}

function formatContributionName(contribution: BattleContribution): string {
  return `${contribution.name} (${formatSlotLabel(
    contribution.formationSlot
  )} ${formatRoleLabel(contribution.combatRole)})`;
}

function getTopContribution(
  contributions: BattleContribution[],
  getScore: (contribution: BattleContribution) => number
): BattleContribution | null {
  let topContribution: BattleContribution | null = null;
  let topScore = 0;

  for (const contribution of contributions) {
    const score = getScore(contribution);

    if (score > topScore) {
      topContribution = contribution;
      topScore = score;
    }
  }

  return topContribution;
}

function buildContributionSummaryDetails(
  battle: Extract<ResolveStageBattleResult, { ok: true }>["battle"]
): string[] {
  const topDamageDealer = getTopContribution(
    battle.contributions,
    getContributionDamage
  );
  const topBreaker = getTopContribution(
    battle.contributions,
    (contribution) =>
      contribution.qiBreaksTriggered * 1000 +
      contribution.qiBreakBurstDamageDealt
  );
  const topHealer = getTopContribution(
    battle.contributions,
    (contribution) =>
      contribution.outerHealingDone + contribution.innerQiRestored
  );
  const topProtector = getTopContribution(
    battle.contributions,
    (contribution) =>
      contribution.guardDamagePrevented + contribution.protectionDamagePrevented
  );
  const topRecoveryDenial = getTopContribution(
    battle.contributions,
    (contribution) => contribution.recoveryPrevented
  );
  const carryPool =
    battle.winner === "timeout"
      ? battle.contributions
      : battle.contributions.filter(
          (contribution) => contribution.team === battle.winner
        );
  const carry = getTopContribution(
    carryPool,
    (contribution) =>
      getContributionDamage(contribution) +
      contribution.qiBreaksTriggered * 100 +
      (contribution.survived ? 50 : 0)
  );
  const supportCarry = getTopContribution(carryPool, getContributionSupport);
  const details: string[] = [];

  if (topDamageDealer) {
    details.push(
      `Top damage: ${formatContributionName(topDamageDealer)} dealt ${formatBattleNumber(
        getContributionDamage(topDamageDealer)
      )} total damage.`
    );
  }

  if (topBreaker && topBreaker.qiBreaksTriggered > 0) {
    details.push(
      `Qi breaker: ${formatContributionName(topBreaker)} triggered ${
        topBreaker.qiBreaksTriggered
      } break${topBreaker.qiBreaksTriggered === 1 ? "" : "s"}.`
    );
  } else {
    details.push("Qi breaker: none.");
  }

  if (
    topHealer &&
    topHealer.outerHealingDone + topHealer.innerQiRestored > 0
  ) {
    details.push(
      `Top recovery: ${formatContributionName(topHealer)} restored ${formatBattleNumber(
        topHealer.outerHealingDone + topHealer.innerQiRestored
      )} total recovery.`
    );
  }

  if (
    topProtector &&
    topProtector.guardDamagePrevented + topProtector.protectionDamagePrevented > 0
  ) {
    details.push(
      `Top protection: ${formatContributionName(topProtector)} prevented ${formatBattleNumber(
        topProtector.guardDamagePrevented +
          topProtector.protectionDamagePrevented
      )} damage.`
    );
  }

  if (topRecoveryDenial && topRecoveryDenial.recoveryPrevented > 0) {
    details.push(
      `Recovery denied: ${formatContributionName(
        topRecoveryDenial
      )} prevented ${formatBattleNumber(
        topRecoveryDenial.recoveryPrevented
      )} healing.`
    );
  }

  if (supportCarry && getContributionSupport(supportCarry) > 0) {
    details.push(
      `Support carry: ${formatContributionName(supportCarry)} supplied ${formatBattleNumber(
        getContributionSupport(supportCarry)
      )} support value.`
    );
  }

  if (carry) {
    details.push(
      `Carry: ${formatContributionName(carry)} ${
        carry.survived ? "survived" : "fell"
      } with ${formatBattleNumber(getContributionDamage(carry))} damage.`
    );
  }

  return details;
}

export function buildBattleSummary(
  lastBattle: ResolveStageBattleResult | null,
  stageName: string | null
): BattleSummaryView | null {
  if (!lastBattle) {
    return null;
  }

  if (!lastBattle.ok) {
    return {
      title: "Battle could not start",
      details: [`Reason: ${lastBattle.reason.replaceAll("_", " ")}`]
    };
  }

  const battle = lastBattle.battle;
  const stageLabel = stageName ?? "stage";
  const result = formatWinner(battle.winner);
  const rewardText = lastBattle.rewards
    ? `Rewards: ${formatBattleNumber(lastBattle.rewards.silver)} silver, ` +
      `${formatBattleNumber(lastBattle.rewards.cultivation)} cultivation, ` +
      `${formatBattleNumber(lastBattle.rewards.combatExperience)} Combat XP.`
    : "No rewards earned.";

  return {
    title: `${result} at ${stageLabel} in ${formatBattleSeconds(
      battle.durationSeconds
    )}`,
    details: [
      `Disciples dealt ${formatBattleNumber(
        battle.metrics.playerOuterDamage
      )} Outer, ${formatBattleNumber(
        battle.metrics.playerInnerDamage
      )} Inner Qi, and ${formatBattleNumber(
        battle.metrics.playerQiBreakBurstDamage
      )} Qi Break burst damage.`,
      `Enemy dealt ${formatBattleNumber(
        battle.metrics.enemyOuterDamage
      )} Outer, ${formatBattleNumber(
        battle.metrics.enemyInnerDamage
      )} Inner Qi, and ${formatBattleNumber(
        battle.metrics.enemyQiBreakBurstDamage
      )} Qi Break burst damage.`,
      `Qi Breaks: ${battle.metrics.qiBreaksTriggeredByPlayer} by disciples, ${battle.metrics.qiBreaksTriggeredByEnemy} by enemy.`,
      ...buildContributionSummaryDetails(battle),
      rewardText
    ]
  };
}


export function buildPlayerCombatantViews(
  data: StaticGameData,
  progress: PlayerProgress,
  stageId: string,
  finalCombatants?: CombatantState[],
  contributions?: BattleContribution[]
): BattleCombatantView[] {
  const teamResult = buildPlayerTeamForStage(data, progress, stageId);

  if (!teamResult.ok) {
    return [];
  }

  const contributionByInstanceId = new Map(
    (contributions ?? []).map((contribution) => [
      contribution.instanceId,
      contribution
    ])
  );

  return teamResult.team.combatants.flatMap((instance, index) => {
    const hero = data.heroes.find(
      (candidate) => candidate.id === instance.definitionId
    );

    if (!hero) {
      return [];
    }

    const stats = deriveStats(instance.statsOverride ?? hero.baseStats);
    const level = instance.level ?? progress.heroes[hero.id]?.level ?? 1;
    const formationSlot = instance.formationSlot ?? getDefaultFormationSlot(index);
    const instanceId = getPreviewInstanceId(
      teamResult.team.id,
      instance,
      hero.id,
      index
    );

    return createCombatantView(
      {
        instanceId,
        definitionId: hero.id,
        team: teamResult.team.id,
        kind: "hero",
        name: hero.name,
        style: hero.style,
        role: hero.role,
        combatRole: hero.combatRole,
        formationSlot,
        level,
        stats,
        skillIds: hero.skillIds,
        combatPowerBonus: calculateSkillSupportCombatPower(
          data,
          hero.skillIds,
          stats
        )
      },
      getFinalCombatantById(finalCombatants, instanceId),
      contributionByInstanceId.get(instanceId)
    );
  });
}

export function buildPlayerFormationViews(
  playerCombatants: BattleCombatantView[]
): PlayerFormationHeroView[] {
  return playerCombatants.map((combatant) => ({
    heroId: combatant.definitionId,
    name: combatant.name,
    style: combatant.style,
    role: combatant.role,
    combatRole: combatant.combatRole,
    formationSlot: combatant.formationSlot
  }));
}

export function buildEnemyCombatantViews(
  data: StaticGameData,
  stageId: string,
  finalCombatants?: CombatantState[],
  contributions?: BattleContribution[]
): BattleCombatantView[] {
  const teamResult = buildEnemyTeamForStage(data, stageId);

  if (!teamResult.ok) {
    return [];
  }

  const contributionByInstanceId = new Map(
    (contributions ?? []).map((contribution) => [
      contribution.instanceId,
      contribution
    ])
  );

  return teamResult.team.combatants.flatMap((instance, index) => {
    const enemy = data.enemies.find(
      (candidate) => candidate.id === instance.definitionId
    );

    if (!enemy) {
      return [];
    }

    const level = instance.level ?? enemy.level;
    const formationSlot = instance.formationSlot ?? getDefaultFormationSlot(index);
    const stats = deriveStats(
      instance.statsOverride ?? scaleStatsForLevel(enemy.baseStats, level)
    );
    const instanceId = getPreviewInstanceId(
      teamResult.team.id,
      instance,
      enemy.id,
      index
    );

    return createCombatantView(
      {
        instanceId,
        definitionId: enemy.id,
        team: teamResult.team.id,
        kind: "enemy",
        name: enemy.name,
        style: enemy.style,
        role: enemy.type,
        combatRole: enemy.combatRole,
        formationSlot,
        level,
        stats,
        skillIds: enemy.skillIds,
        combatPowerBonus: calculateSkillSupportCombatPower(
          data,
          enemy.skillIds,
          stats
        )
      },
      getFinalCombatantById(finalCombatants, instanceId),
      contributionByInstanceId.get(instanceId)
    );
  });
}

export function buildEnemyTeamLabel(
  data: StaticGameData,
  stage: ReturnType<typeof getStageById> | null
): string {
  if (!stage || stage.enemyTeam.combatantIds.length === 0) {
    return "Unknown Enemy Team";
  }

  const enemyNames = new Map(
    data.enemies.map((enemy) => [enemy.id, enemy.name])
  );
  const nameCounts = new Map<string, number>();

  for (const enemyId of stage.enemyTeam.combatantIds) {
    const enemyName = enemyNames.get(enemyId) ?? enemyId;
    nameCounts.set(enemyName, (nameCounts.get(enemyName) ?? 0) + 1);
  }

  return [...nameCounts.entries()]
    .map(([enemyName, count]) =>
      count > 1 ? `${enemyName} x${count}` : enemyName
    )
    .join(" / ");
}
