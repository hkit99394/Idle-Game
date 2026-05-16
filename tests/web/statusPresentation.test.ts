import { describe, expect, it } from "vitest";
import {
  buildStatusChipViewModels,
  buildStatusSummaryViewModel,
  getStatusTone,
  statusToneDefinitions
} from "../../web/statusPresentation";
import { createStatusDictionary } from "../../core";
import type { ActiveStatusEffect, StatusEffectDefinition } from "../../core";
import statusEffects from "../../data/statusEffects.json" with { type: "json" };

const statusDefinitions = createStatusDictionary(
  statusEffects as StatusEffectDefinition[]
);

describe("status presentation", () => {
  it("maps every configured status category and cleanse to a fixed tone", () => {
    const configuredCategories = [
      ...new Set(
        (statusEffects as StatusEffectDefinition[]).map(
          (status) => status.category
        )
      )
    ];

    expect(configuredCategories.map((category) => getStatusTone(category))).toEqual([
      statusToneDefinitions.damage,
      statusToneDefinitions.recovery,
      statusToneDefinitions.control,
      statusToneDefinitions.vulnerability,
      statusToneDefinitions.backlash
    ]);
    expect(getStatusTone("cleanse")).toEqual({
      role: "cleanse",
      label: "Purge",
      className: "tone-cleanse"
    });
  });

  it("sorts active statuses by severity and exposes chip display fields", () => {
    const statuses: ActiveStatusEffect[] = [
      {
        statusId: "context_suppression",
        remainingSeconds: 2,
        stacks: 1
      },
      {
        statusId: "corruption",
        remainingSeconds: 8,
        stacks: 3
      },
      {
        statusId: "trauma",
        remainingSeconds: 3,
        stacks: 1
      }
    ];

    expect(buildStatusChipViewModels(statuses, statusDefinitions)).toEqual([
      {
        statusId: "corruption",
        label: "Corruption",
        category: "damage",
        categoryLabel: "Damage",
        severity: "high",
        severityLabel: "High severity",
        toneClassName: "tone-damage",
        remainingLabel: "8s",
        stacksLabel: "x3",
        ariaLabel: "Corruption, Damage, High severity, 8 seconds remaining"
      },
      {
        statusId: "trauma",
        label: "Trauma",
        category: "recovery",
        categoryLabel: "Recovery",
        severity: "medium",
        severityLabel: "Medium severity",
        toneClassName: "tone-recovery",
        remainingLabel: "3s",
        stacksLabel: null,
        ariaLabel: "Trauma, Recovery, Medium severity, 3 seconds remaining"
      },
      {
        statusId: "context_suppression",
        label: "Context Suppression",
        category: "control",
        categoryLabel: "Control",
        severity: "low",
        severityLabel: "Low severity",
        toneClassName: "tone-control",
        remainingLabel: "2s",
        stacksLabel: null,
        ariaLabel: "Context Suppression, Control, Low severity, 2 seconds remaining"
      }
    ]);
  });

  it("ignores unknown active status ids", () => {
    expect(
      buildStatusChipViewModels(
        [
          {
            statusId: "missing_status",
            remainingSeconds: 5,
            stacks: 1
          }
        ],
        statusDefinitions
      )
    ).toEqual([]);
  });

  it("summarizes status damage and cleanses", () => {
    const summary = buildStatusSummaryViewModel({
      statusDefinitions,
      tickEvents: [
        {
          type: "status_tick",
          statusId: "corruption",
          stacks: 2,
          outerDamage: 24,
          targetName: "Iron Fist Initiate"
        },
        {
          type: "status_tick",
          statusId: "corruption",
          stacks: 2,
          outerDamage: 24,
          targetName: "Iron Fist Initiate"
        }
      ],
      cleanses: [
        {
          combatantName: "Mountain Brace Guardian",
          statusId: "corruption"
        },
        {
          combatantName: "Mountain Brace Guardian",
          statusId: "trauma"
        }
      ]
    });

    expect(summary.callouts).toEqual([
      {
        id: "status-damage",
        label: "Iron Fist Initiate took 48 status damage",
        toneClassName: "tone-damage",
        ariaLabel:
          "Damage summary: Iron Fist Initiate took 48 status damage"
      },
      {
        id: "purges",
        label: "Mountain Brace Guardian purged 2 status",
        toneClassName: "tone-cleanse",
        ariaLabel:
          "Purge summary: Mountain Brace Guardian purged 2 status"
      }
    ]);
    expect(summary.rows).toEqual([
      {
        label: "Status Damage",
        value: "48 to Iron Fist Initiate",
        toneClassName: "tone-damage"
      },
      {
        label: "Purges",
        value: "2 by Mountain Brace Guardian",
        toneClassName: "tone-cleanse"
      },
      {
        label: "Debuffs",
        value: "Corruption, Trauma",
        toneClassName: "tone-control"
      }
    ]);
  });
});
