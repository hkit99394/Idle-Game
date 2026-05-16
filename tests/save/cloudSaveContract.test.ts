import { describe, expect, it } from "vitest";
import {
  createCloudSaveEnvelope,
  createInitialPlayerProgress,
  createSaveData,
  decideCloudSaveConflict,
  loadCloudSaveEnvelopeTransaction,
  parseCloudSaveEnvelope,
  SAVE_DATA_VERSION,
  validateCloudSaveEnvelope
} from "../../core";
import { staticData } from "../helpers/staticData";

describe("cloud save contract", () => {
  it("wraps current saves and routes cloud loads through the core load transaction", () => {
    const progress = createInitialPlayerProgress(staticData);
    progress.districts.greenline_approach.highestClearedRouteIndex = 1;
    const save = createSaveData({
      progress,
      selectedOfflineFarmRouteId: "greenline_approach_1",
      nowMs: 1_000
    });
    const envelope = createCloudSaveEnvelope({
      accountId: "account-1",
      saveSlotId: "primary",
      save,
      checksum: "sha256:current-save"
    });
    const result = loadCloudSaveEnvelopeTransaction({
      data: staticData,
      envelope,
      nowMs: 61_000
    });

    expect(validateCloudSaveEnvelope(envelope)).toEqual([]);
    expect(parseCloudSaveEnvelope(envelope)).toMatchObject({
      ok: true,
      envelope: {
        accountId: "account-1",
        saveSlotId: "primary",
        saveVersion: SAVE_DATA_VERSION,
        checksum: "sha256:current-save",
        createdAtMs: 1_000,
        updatedAtMs: 1_000
      }
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.writeReasons).toEqual(["offlineRewardsApplied"]);
    expect(result.save.updatedAtMs).toBe(61_000);
    expect(result.save.lastOfflineRewardAtMs).toBe(61_000);
    expect(result.offlineRewards?.ok).toBe(true);
    expect(result.offlineRewards?.rewards.clears).toBeGreaterThan(0);
  });

  it("rejects malformed or future-version cloud envelopes before save loading", () => {
    const progress = createInitialPlayerProgress(staticData);
    const save = createSaveData({
      progress,
      selectedOfflineFarmRouteId: null,
      nowMs: 1_000
    });
    const envelope = createCloudSaveEnvelope({
      accountId: "account-1",
      saveSlotId: "primary",
      save,
      checksum: "sha256:current-save"
    });
    const futureEnvelope = {
      ...envelope,
      saveVersion: SAVE_DATA_VERSION + 1,
      rawSave: {
        ...save,
        version: SAVE_DATA_VERSION + 1
      }
    };
    const mismatchedEnvelope = {
      ...envelope,
      updatedAtMs: 2_000
    };

    expect(validateCloudSaveEnvelope({
      ...envelope,
      accountId: "",
      checksum: ""
    })).toEqual(
      expect.arrayContaining([
        "accountId must be a non-empty string",
        "checksum must be a non-empty string"
      ])
    );
    expect(validateCloudSaveEnvelope(futureEnvelope)).toContain(
      `saveVersion must be ${SAVE_DATA_VERSION}`
    );
    expect(loadCloudSaveEnvelopeTransaction({
      data: staticData,
      envelope: futureEnvelope,
      nowMs: 2_000
    })).toMatchObject({
      ok: false,
      reason: "invalid_cloud_save_envelope"
    });
    expect(validateCloudSaveEnvelope(mismatchedEnvelope)).toContain(
      "rawSave.updatedAtMs must match updatedAtMs"
    );
  });

  it("decides representative cloud save conflicts without overwriting divergent saves", () => {
    expect(decideCloudSaveConflict({
      local: { checksum: "local", updatedAtMs: 2_000 },
      cloud: { checksum: "cloud", updatedAtMs: 1_000 }
    })).toEqual({
      action: "upload_local",
      reason: "local_newer"
    });
    expect(decideCloudSaveConflict({
      local: { checksum: "local", updatedAtMs: 1_000 },
      cloud: { checksum: "cloud", updatedAtMs: 2_000 }
    })).toEqual({
      action: "use_cloud",
      reason: "cloud_newer"
    });
    expect(decideCloudSaveConflict({
      local: { checksum: "local", updatedAtMs: 2_000 },
      cloud: { checksum: "cloud", updatedAtMs: 2_000 }
    })).toEqual({
      action: "manual_conflict",
      reason: "equal_timestamp_checksum_mismatch"
    });
    expect(decideCloudSaveConflict({
      local: { checksum: "local", updatedAtMs: 3_000 },
      cloud: { checksum: "cloud", updatedAtMs: 2_000 },
      lastSyncedChecksum: "base"
    })).toEqual({
      action: "manual_conflict",
      reason: "both_changed_since_last_sync"
    });
    expect(decideCloudSaveConflict({
      local: { checksum: "local", updatedAtMs: 3_000 },
      cloud: { checksum: "base", updatedAtMs: 2_000 },
      lastSyncedChecksum: "base"
    })).toEqual({
      action: "upload_local",
      reason: "local_changed_since_last_sync"
    });
    expect(decideCloudSaveConflict({
      local: { checksum: "local", updatedAtMs: 3_000 },
      cloud: { checksum: "cloud", updatedAtMs: 2_000 },
      failedWrite: true
    })).toEqual({
      action: "retry_local_write",
      reason: "failed_write"
    });
  });
});
