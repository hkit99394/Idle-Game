import { describe, expect, it } from "vitest";
import {
  createInitialPlayerProgress,
  setAssignmentHeroes
} from "../../core";
import { staticData } from "../helpers/staticData";

describe("assignment progression", () => {
  it("assigns and unassigns eligible heroes", () => {
    const progress = createInitialPlayerProgress(staticData);
    const assigned = setAssignmentHeroes(staticData, {
      progress,
      assignmentId: "greenline_sweep",
      heroIds: ["iron_fist_initiate"]
    });

    expect(assigned.ok).toBe(true);
    if (!assigned.ok) {
      return;
    }

    expect(
      assigned.progress.assignments?.greenline_sweep?.heroIds
    ).toEqual(["iron_fist_initiate"]);

    const unassigned = setAssignmentHeroes(staticData, {
      progress: assigned.progress,
      assignmentId: "greenline_sweep",
      heroIds: []
    });

    expect(unassigned.ok).toBe(true);
    if (!unassigned.ok) {
      return;
    }
    expect(unassigned.progress.assignments?.greenline_sweep).toBeUndefined();
  });

  it("rejects locked, duplicate, ineligible, and already assigned heroes", () => {
    const progress = createInitialPlayerProgress(staticData);

    expect(
      setAssignmentHeroes(staticData, {
        progress,
        assignmentId: "veil_district_calibration",
        heroIds: ["azure_pulse_monk"]
      })
    ).toMatchObject({
      ok: false,
      reason: "locked_assignment"
    });

    expect(
      setAssignmentHeroes(staticData, {
        progress,
        assignmentId: "greenline_sweep",
        heroIds: ["iron_fist_initiate", "iron_fist_initiate"]
      })
    ).toMatchObject({
      ok: false,
      reason: "duplicate_hero"
    });

    const unlockedProgress = createInitialPlayerProgress(staticData);
    unlockedProgress.maps.greenline_approach.highestClearedStageIndex = 10;

    expect(
      setAssignmentHeroes(staticData, {
        progress: unlockedProgress,
        assignmentId: "veil_district_calibration",
        heroIds: ["iron_fist_initiate"]
      })
    ).toMatchObject({
      ok: false,
      reason: "ineligible_hero"
    });

    const firstAssignment = setAssignmentHeroes(staticData, {
      progress: unlockedProgress,
      assignmentId: "greenline_sweep",
      heroIds: ["azure_pulse_monk"]
    });

    expect(firstAssignment.ok).toBe(true);
    if (!firstAssignment.ok) {
      return;
    }

    expect(
      setAssignmentHeroes(staticData, {
        progress: firstAssignment.progress,
        assignmentId: "veil_district_calibration",
        heroIds: ["azure_pulse_monk"]
      })
    ).toMatchObject({
      ok: false,
      reason: "hero_already_assigned"
    });
  });
});
