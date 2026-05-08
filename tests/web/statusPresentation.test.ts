import { describe, expect, it } from "vitest";
import {
  buildStatusChipViewModels,
  buildStatusSummaryViewModel
} from "../../web/statusPresentation";
import { createStatusDictionary } from "../../core";
import type { ActiveStatusEffect, StatusEffectDefinition } from "../../core";
import statusEffects from "../../data/statusEffects.json" with { type: "json" };

const statusDefinitions = createStatusDictionary(
  statusEffects as StatusEffectDefinition[]
);

describe("status presentation", () => {
  it("sorts active statuses by severity and exposes chip display fields", () => {
    const statuses: ActiveStatusEffect[] = [
      {
        statusId: "qi_suppression",
        remainingSeconds: 2,
        stacks: 1
      },
      {
        statusId: "poison",
        remainingSeconds: 8,
        stacks: 3
      },
      {
        statusId: "wound",
        remainingSeconds: 3,
        stacks: 1
      }
    ];

    expect(buildStatusChipViewModels(statuses, statusDefinitions)).toEqual([
      {
        statusId: "poison",
        label: "Poison",
        category: "damage",
        severity: "high",
        toneClassName: "tone-damage",
        remainingLabel: "8s",
        stacksLabel: "x3"
      },
      {
        statusId: "wound",
        label: "Wound",
        category: "recovery",
        severity: "medium",
        toneClassName: "tone-recovery",
        remainingLabel: "3s",
        stacksLabel: null
      },
      {
        statusId: "qi_suppression",
        label: "Qi Suppression",
        category: "control",
        severity: "low",
        toneClassName: "tone-control",
        remainingLabel: "2s",
        stacksLabel: null
      }
    ]);
  });

  it("summarizes status damage and cleanses", () => {
    const summary = buildStatusSummaryViewModel({
      statusDefinitions,
      tickEvents: [
        {
          type: "status_tick",
          statusId: "poison",
          stacks: 2,
          outerDamage: 24,
          targetName: "Iron Fist Disciple"
        },
        {
          type: "status_tick",
          statusId: "poison",
          stacks: 2,
          outerDamage: 24,
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

    expect(summary.callouts).toEqual([
      "Iron Fist Disciple took 48 status damage",
      "Mountain Staff Guardian cleansed 2 status"
    ]);
    expect(summary.rows).toEqual([
      {
        label: "Status Damage",
        value: "48 to Iron Fist Disciple"
      },
      {
        label: "Cleanses",
        value: "2 by Mountain Staff Guardian"
      },
      {
        label: "Debuffs",
        value: "Poison, Wound"
      }
    ]);
  });
});
