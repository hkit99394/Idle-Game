import {
  areStageIdsEquivalent,
  buildEnemyTeamForStage,
  buildPlayerTeamForStage,
  calculateCombatPower,
  calculateSkillSupportCombatPower,
  createBattleEventRecord,
  deriveStats,
  getStatusDisplayName,
  getDefaultFormationSlot,
  getStageById,
  scaleStatsForLevel
} from "../../../core";
import { displayTerms, formatResourceLabel } from "../../displayTerms";
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
  BattleEventView,
  BattleSummaryView
} from "./battleTypes";

export { calculateSkillSupportCombatPower };

type StageView = ReturnType<typeof getStageById>;

type BattleFeatureViewInput = {
  progress: PlayerProgress;
  selectedStage: StageView;
  selectedStageId: string;
  lastBattle: ResolveStageBattleResult | null;
  lastBattleStage: StageView;
  lastBattleStageId: string | null;
};

function getVisibleBattleResult(input: BattleFeatureViewInput) {
  const successfulLastBattle = input.lastBattle?.ok ? input.lastBattle : null;
  const showFinalCombatants =
    successfulLastBattle !== null &&
    input.lastBattleStageId !== null &&
    areStageIdsEquivalent(input.lastBattleStageId, input.selectedStageId);

  return {
    finalPlayerTeam: showFinalCombatants
      ? successfulLastBattle.battle.finalPlayerTeam
      : undefined,
    finalEnemyTeam: showFinalCombatants
      ? successfulLastBattle.battle.finalEnemyTeam
      : undefined,
    battleContributions: showFinalCombatants
      ? successfulLastBattle.battle.contributions
      : undefined
  };
}

export function buildBattleFeatureView(
  data: StaticGameData,
  input: BattleFeatureViewInput
) {
  const { finalPlayerTeam, finalEnemyTeam, battleContributions } =
    getVisibleBattleResult(input);
  const playerCombatants = input.selectedStage
    ? buildPlayerCombatantViews(
        data,
        input.progress,
        input.selectedStage.id,
        finalPlayerTeam,
        battleContributions
      )
    : [];
  const enemyCombatants = input.selectedStage
    ? buildEnemyCombatantViews(
        data,
        input.selectedStage.id,
        finalEnemyTeam,
        battleContributions
      )
    : [];

  return {
    playerCombatants,
    enemyCombatants,
    enemyTeamLabel: buildEnemyTeamLabel(data, input.selectedStage),
    lastBattle: input.lastBattle,
    lastBattleStage: input.lastBattleStage,
    battleEvents: buildBattleEventViews(data, input.lastBattle),
    battleSummary: buildBattleSummary(
      input.lastBattle,
      input.lastBattleStage?.name ?? null
    )
  };
}

function getPreviewInstanceId(
  team: TeamId,
  instance: CombatantInstanceDefinition,
  nameId: string,
  index: number
): string {
  return instance.instanceId ?? `${team}_${nameId}_${index + 1}`;
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

function getMedicineName(data: StaticGameData, medicineId: string): string {
  return data.medicines.find((medicine) => medicine.id === medicineId)?.name ?? medicineId;
}

function getStatusName(data: StaticGameData, statusId: string): string {
  return getStatusDisplayName(
    statusId,
    Object.fromEntries(data.statusEffects.map((status) => [status.id, status]))
  );
}

function formatAutoMedicineTrigger(
  trigger: Extract<BattleEvent, { type: "auto_medicine" }>["trigger"]
): string {
  switch (trigger) {
    case "battle_cleanse":
      return displayTerms.counterplay.battlePurge;
    case "post_battle_cleanse":
      return displayTerms.counterplay.postBattlePurge;
    case "pre_battle_resistance":
      return displayTerms.counterplay.preBattleResistance;
  }
}

function formatAttackDetail(
  data: StaticGameData,
  event: Extract<BattleEvent, { type: "attack" }>
): string {
  const detail = [
    getSkillName(data, event.skillId),
    `${formatBattleNumber(event.outerDamage)} ${displayTerms.combat.kineticDamage}`,
    `${formatBattleNumber(event.innerDamage)} ${displayTerms.combat.cognitiveDamage}`
  ];

  if (event.intendedTargetId && event.intendedTargetId !== event.targetId) {
    detail.push("redirected by protection");
  }

  return detail.join(" · ");
}

type BattleEventDetail = Pick<
  BattleEventView,
  "headline" | "detail" | "badges"
>;

type BattleEventPresentationContext = {
  data: StaticGameData;
  names: Map<string, string>;
};

type BattleEventPresenter<Type extends BattleEvent["type"]> = (
  context: BattleEventPresentationContext,
  event: Extract<BattleEvent, { type: Type }>
) => BattleEventDetail;

function buildStatusApplyEventDetail(
  context: BattleEventPresentationContext,
  event: Extract<BattleEvent, { type: "status_apply" }>
): BattleEventDetail {
  const source = getName(context.names, event.sourceId);
  const target = getName(context.names, event.targetId);
  const statusName = getStatusName(context.data, event.statusId);

  return {
    headline: `${source} applies ${statusName} to ${target}`,
    detail:
      `${getSkillName(context.data, event.skillId)} applies ${event.stacks} stack(s) for ` +
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

function buildStatusTickEventDetail(
  context: BattleEventPresentationContext,
  event: Extract<BattleEvent, { type: "status_tick" }>
): BattleEventDetail {
  const target = getName(context.names, event.targetId);
  const statusName = getStatusName(context.data, event.statusId);

  return {
    headline: `${target} suffers ${statusName}`,
    detail: `${formatBattleNumber(event.outerDamage)} ${displayTerms.combat.kineticDamage} from ${statusName}`,
    badges: [
      {
        label: statusName,
        tone: "danger"
      },
      {
        label: `${formatBattleNumber(event.outerDamage)} ${displayTerms.combat.bodyIntegrity}`,
        tone: "outer"
      }
    ]
  };
}

function buildStatusExpireEventDetail(
  context: BattleEventPresentationContext,
  event: Extract<BattleEvent, { type: "status_expire" }>
): BattleEventDetail {
  const target = getName(context.names, event.targetId);
  const statusName = getStatusName(context.data, event.statusId);

  return {
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

function buildCleanseEventDetail(
  context: BattleEventPresentationContext,
  event: Extract<BattleEvent, { type: "cleanse" }>
): BattleEventDetail {
  const source = getName(context.names, event.sourceId);
  const target = getName(context.names, event.targetId);
  const statuses = event.statusesRemoved
    .map((status) => getStatusName(context.data, status))
    .join(", ");

  return {
    headline:
      source === target
        ? `${target} purges pressure`
        : `${source} purges ${target}`,
    detail: `${getSkillName(context.data, event.skillId)} removes ${statuses}`,
    badges: [
      {
        label: displayTerms.counterplay.purge,
        tone: "neutral"
      },
      {
        label: statuses,
        tone: "danger"
      }
    ]
  };
}

function buildAutoMedicineEventDetail(
  context: BattleEventPresentationContext,
  event: Extract<BattleEvent, { type: "auto_medicine" }>
): BattleEventDetail {
  const target = event.targetId
    ? getName(context.names, event.targetId)
    : "the party";
  const medicineName = getMedicineName(context.data, event.medicineId);
  const statuses = event.cleansedStatusIds.map((status) =>
    getStatusName(context.data, status)
  );
  const details = [
    statuses.length > 0 ? `removes ${statuses.join(", ")}` : null,
    event.statusResistanceBonus > 0
      ? `adds ${formatBattlePercent(
          event.statusResistanceBonus
        )} Status Resistance for ${formatBattleSeconds(
          event.statusResistanceDurationSeconds
        )}`
      : null
  ].filter(Boolean);

  return {
    headline: `${target} uses ${medicineName}`,
    detail: `${formatAutoMedicineTrigger(event.trigger)} · ${
      details.length > 0 ? details.join(" · ") : "no immediate effect"
    }`,
    badges: [
      {
        label: displayTerms.counterplay.autoCountermeasure,
        tone: "neutral"
      },
      ...(statuses.length > 0
        ? [
            {
              label: statuses.join(", "),
              tone: "danger" as const
            }
          ]
        : []),
      ...(event.statusResistanceBonus > 0
        ? [
            {
              label: `${formatBattlePercent(
                event.statusResistanceBonus
              )} resistance`,
              tone: "qi" as const
            }
          ]
        : [])
    ]
  };
}

const battleEventPresentationHandlers = {
  status_apply: buildStatusApplyEventDetail,
  status_tick: buildStatusTickEventDetail,
  status_expire: buildStatusExpireEventDetail,
  cleanse: buildCleanseEventDetail,
  auto_medicine: buildAutoMedicineEventDetail
} satisfies {
  status_apply: BattleEventPresenter<"status_apply">;
  status_tick: BattleEventPresenter<"status_tick">;
  status_expire: BattleEventPresenter<"status_expire">;
  cleanse: BattleEventPresenter<"cleanse">;
  auto_medicine: BattleEventPresenter<"auto_medicine">;
};

function getMappedBattleEventDetail(
  context: BattleEventPresentationContext,
  event: BattleEvent
): BattleEventDetail | null {
  switch (event.type) {
    case "status_apply":
      return battleEventPresentationHandlers.status_apply(context, event);
    case "status_tick":
      return battleEventPresentationHandlers.status_tick(context, event);
    case "status_expire":
      return battleEventPresentationHandlers.status_expire(context, event);
    case "cleanse":
      return battleEventPresentationHandlers.cleanse(context, event);
    case "auto_medicine":
      return battleEventPresentationHandlers.auto_medicine(context, event);
    default:
      return null;
  }
}

function buildBattleEventDetail(
  data: StaticGameData,
  event: BattleEvent,
  names: Map<string, string>
): BattleEventDetail {
  const context: BattleEventPresentationContext = { data, names };
  const mappedDetail = getMappedBattleEventDetail(context, event);

  if (mappedDetail !== null) {
    return mappedDetail;
  }

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
            label: `${formatBattleNumber(event.outerDamage)} ${displayTerms.combat.bodyIntegrity}`,
            tone: "outer"
          },
          {
            label: `${formatBattleNumber(event.innerDamage)} ${displayTerms.combat.contextStability}`,
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
        headline: `${target} raises guard`,
        detail:
          `${getSkillName(data, event.skillId)} reduces incoming ${displayTerms.combat.kineticDamage} by ` +
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
        headline: `${target}'s guard absorbs the strike`,
        detail:
          `${getSkillName(data, event.skillId)} prevents ` +
          `${formatBattleNumber(event.outerDamagePrevented)} ${displayTerms.combat.kineticDamage}`,
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
        headline: `${source} breaks ${target}'s plating`,
        detail:
          `${getSkillName(data, event.skillId)} reduces guard and Kinetic Defense by ` +
          `${formatBattlePercent(event.reduction)} until ${formatBattleSeconds(event.endsAt)}`,
        badges: [
          {
            label: "Plating Break",
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
        headline: `${target} suffers ${displayTerms.combat.aiOverload}`,
        detail:
          `${source} drops ${displayTerms.combat.contextStability} to zero, bursts ` +
          `${formatBattleNumber(event.burstDamage)} ${displayTerms.combat.kineticDamage} ` +
          `(${formatBattlePercent(event.burstPercent)}), recovers at ` +
          `${formatBattleSeconds(event.endsAt)}`,
        badges: [
          {
            label: displayTerms.combat.aiOverload,
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
        headline: `${target} restores ${displayTerms.combat.contextStability}`,
        detail: `${displayTerms.combat.contextStability} returns to ${formatBattleNumber(event.innerQi)}`,
        badges: [
          {
            label: `${formatBattleNumber(event.innerQi)} ${displayTerms.combat.contextStability}`,
            tone: "inner"
          }
        ]
      };
    }

    case "backlash": {
      const source = getName(names, event.sourceId);

      return {
        headline: `${source} suffers backlash`,
        detail: `${formatBattleNumber(event.damage)} ${displayTerms.combat.kineticDamage} while Overloaded`,
        badges: [
          {
            label: `${formatBattleNumber(event.damage)} backlash`,
            tone: "danger"
          },
          {
            label: "Overloaded",
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
          ? `${formatBattleNumber(event.outerHealing)} ${displayTerms.combat.bodyIntegrity}`
          : null,
        event.innerQiRestored > 0
          ? `${formatBattleNumber(event.innerQiRestored)} ${displayTerms.combat.contextStability}`
          : null,
        event.overhealing > 0
          ? `${formatBattleNumber(event.overhealing)} overheal`
          : null,
        event.recoveryPrevented > 0
          ? `${formatBattleNumber(event.recoveryPrevented)} prevented by wound`
          : null
      ].filter(Boolean);

      return {
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
        headline: `${source} traumatizes ${target}`,
        detail:
          `${getSkillName(data, event.skillId)} reduces recovery by ` +
          `${formatBattlePercent(event.reduction)} until ${formatBattleSeconds(event.endsAt)}`,
        badges: [
          {
            label: "Trauma",
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
        headline: `${source} weakens ${target}'s Cognitive Defense`,
        detail:
          `${getSkillName(data, event.skillId)} reduces Cognitive Defense by ` +
          `${formatBattlePercent(event.reduction)} until ${formatBattleSeconds(event.endsAt)}`,
        badges: [
          {
            label: "Cognitive Defense Down",
            tone: "danger"
          },
          {
            label: `${formatBattlePercent(event.reduction)} defense`,
            tone: "inner"
          }
        ]
      };
    }

    case "regeneration": {
      const source = getName(names, event.sourceId);
      const target = getName(names, event.targetId);
      const barLabel =
        event.restores === "outer"
          ? displayTerms.combat.bodyIntegrity
          : displayTerms.combat.contextStability;

      return {
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
          ? `${formatBattleNumber(event.outerHealing)} ${displayTerms.combat.bodyIntegrity}`
          : null,
        event.innerQiRestored > 0
          ? `${formatBattleNumber(event.innerQiRestored)} ${displayTerms.combat.contextStability}`
          : null,
        event.overhealing > 0
          ? `${formatBattleNumber(event.overhealing)} overheal`
          : null,
        event.recoveryPrevented > 0
          ? `${formatBattleNumber(event.recoveryPrevented)} prevented by wound`
          : null
      ].filter(Boolean);

      return {
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

    case "defeat": {
      const target = getName(names, event.targetId);
      const defeatedSide =
        event.team === "player"
          ? displayTerms.progression.initiate.toLowerCase()
          : "hostile";

      return {
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

  throw new Error(`Unhandled battle event type: ${event.type}`);
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
    const record = createBattleEventRecord(event, index);
    const detail = buildBattleEventDetail(data, event, names);

    return {
      ...detail,
      id: record.id,
      category: record.category,
      statusId: record.statusId,
      timeSeconds: record.timeSeconds,
      timeLabel: formatBattleSeconds(record.timeSeconds)
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
    ? `Rewards: ${formatBattleNumber(lastBattle.rewards.silver)} ${formatResourceLabel(
        "silver"
      )}, ` +
      `${formatBattleNumber(lastBattle.rewards.cultivation)} ${formatResourceLabel(
        "cultivation"
      )}, ` +
      `${formatBattleNumber(lastBattle.rewards.combatExperience)} ${formatResourceLabel(
        "combatExperience"
      )}.`
    : "No rewards earned.";

  return {
    title: `${result} at ${stageLabel} in ${formatBattleSeconds(
      battle.durationSeconds
    )}`,
    details: [
      `Tactic: ${battle.playerTactic.name}.`,
      `${displayTerms.progression.initiates} dealt ${formatBattleNumber(
        battle.metrics.playerOuterDamage
      )} ${displayTerms.combat.kineticDamage}, ${formatBattleNumber(
        battle.metrics.playerInnerDamage
      )} ${displayTerms.combat.cognitiveDamage}, and ${formatBattleNumber(
        battle.metrics.playerQiBreakBurstDamage
      )} ${displayTerms.combat.aiOverload} burst damage.`,
      `Hostiles dealt ${formatBattleNumber(
        battle.metrics.enemyOuterDamage
      )} ${displayTerms.combat.kineticDamage}, ${formatBattleNumber(
        battle.metrics.enemyInnerDamage
      )} ${displayTerms.combat.cognitiveDamage}, and ${formatBattleNumber(
        battle.metrics.enemyQiBreakBurstDamage
      )} ${displayTerms.combat.aiOverload} burst damage.`,
      `${displayTerms.combat.aiOverloads}: ${battle.metrics.qiBreaksTriggeredByPlayer} by initiates, ${battle.metrics.qiBreaksTriggeredByEnemy} by hostiles.`,
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
    return "Unknown hostile team";
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
