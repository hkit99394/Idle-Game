import { describe, expect, it } from "vitest";
import {
  createInitialPlayerProgress,
  createSaveData,
  migrateSaveData,
  MVP_PLAYER_HERO_IDS,
  parseSaveData,
  SAVE_DATA_VERSION,
  validateSaveData
} from "../../core";
import { stage12SaveFixture } from "../fixtures/stage12Save";
import { staticData } from "../helpers/staticData";

describe("save schema validation", () => {
  it("persists and validates pre-battle resistance policy mode", () => {
    const progress = createInitialPlayerProgress(staticData);
    const save = createSaveData({
      progress,
      selectedOfflineFarmStageId: null,
      autoMedicinePreferences: {
        enabled: true,
        battleCleanseEnabled: true,
        postBattleCleanseEnabled: true,
        preBattleResistanceEnabled: true,
        preBattleResistanceMode: "status_heavy",
        disabledMedicineIds: []
      },
      nowMs: 1000
    });
    const invalidSave = {
      ...save,
      autoMedicinePreferences: {
        ...save.autoMedicinePreferences,
        preBattleResistanceMode: "only_boss_when_rich"
      }
    };
    const oldSave = {
      ...save,
      version: 8,
      autoMedicinePreferences: {
        ...save.autoMedicinePreferences,
        preBattleResistanceMode: undefined
      }
    };

    expect(parseSaveData(staticData, save)).toMatchObject({
      ok: true,
      save: {
        autoMedicinePreferences: {
          preBattleResistanceMode: "status_heavy"
        }
      }
    });
    expect(validateSaveData(staticData, invalidSave)).toContain(
      "autoMedicinePreferences.preBattleResistanceMode must be a supported mode"
    );
    expect(parseSaveData(staticData, oldSave)).toMatchObject({
      ok: true,
      save: {
        version: SAVE_DATA_VERSION,
        autoMedicinePreferences: {
          preBattleResistanceMode: "boss_and_elite"
        }
      }
    });
  });

  it("normalizes missing or invalid selected tactics to balanced", () => {
    const progress = createInitialPlayerProgress(staticData);
    const save = createSaveData({
      progress: {
        ...progress,
        selectedTacticId: "kinetic_crush"
      },
      selectedOfflineFarmStageId: null,
      nowMs: 1000
    });
    const missingTacticSave = {
      ...save,
      version: 9,
      progress: {
        ...save.progress,
        selectedTacticId: undefined
      }
    };
    const invalidTacticSave = {
      ...save,
      progress: {
        ...save.progress,
        selectedTacticId: "missing_tactic"
      }
    };

    expect(parseSaveData(staticData, save)).toMatchObject({
      ok: true,
      save: {
        progress: {
          selectedTacticId: "kinetic_crush"
        }
      }
    });
    expect(parseSaveData(staticData, missingTacticSave)).toMatchObject({
      ok: true,
      save: {
        version: SAVE_DATA_VERSION,
        progress: {
          selectedTacticId: "balanced_routine"
        }
      },
      migration: {
        normalized: true,
        normalizations: expect.arrayContaining([
          {
            field: "progress.selectedTacticId",
            reason: "defaulted missing field"
          }
        ])
      }
    });
    expect(parseSaveData(staticData, invalidTacticSave)).toMatchObject({
      ok: true,
      save: {
        progress: {
          selectedTacticId: "balanced_routine"
        }
      },
      migration: {
        normalized: true,
        normalizations: expect.arrayContaining([
          {
            field: "progress.selectedTacticId",
            reason: "defaulted invalid field"
          }
        ])
      }
    });
    expect(validateSaveData(staticData, invalidTacticSave)).toEqual([]);
  });

  it("fails safely for malformed saves", () => {
    const result = parseSaveData(staticData, {
      version: SAVE_DATA_VERSION,
      progress: null,
      selectedOfflineFarmStageId: 5,
      offlineFarmPreset: 5,
      createdAtMs: 2000,
      updatedAtMs: 1000,
      lastOfflineRewardAtMs: -1
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.reason).toBe("invalid_save");
    expect(result.errors).toContain("progress must be an object");
    expect(result.errors).toContain(
      "selectedOfflineFarmStageId must be a string or null"
    );
    expect(result.errors).toContain(
      "offlineFarmPreset must be a supported offline farm preset"
    );
    expect(result.errors).toContain(
      "updatedAtMs must be greater than or equal to createdAtMs"
    );
    expect(result.errors).toContain(
      "lastOfflineRewardAtMs must be a non-negative finite number"
    );
  });

  it("rejects unsupported versions and locked current stages", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.currentStageId = "greenline_approach_5";
    const save = {
      ...createSaveData({
        progress,
        selectedOfflineFarmStageId: null,
        nowMs: 1000
      }),
      version: 999
    };
    const errors = validateSaveData(staticData, save);

    expect(errors).toContain(
      `version must be a supported save version (1-${SAVE_DATA_VERSION})`
    );
    expect(errors).toContain(
      "progress.currentStageId must be unlocked by saved progress"
    );
  });

  it("rejects saved hero levels below one", () => {
    const progress = createInitialPlayerProgress(staticData);
    const save = createSaveData({
      progress,
      selectedOfflineFarmStageId: null,
      nowMs: 1000
    });

    save.progress.heroes.iron_fist_initiate.level = 0;

    expect(validateSaveData(staticData, save)).toContain(
      "progress.heroes.iron_fist_initiate.level must be an integer >= 1"
    );
  });
});
