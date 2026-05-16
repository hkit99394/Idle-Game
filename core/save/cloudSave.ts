import { loadSaveTransaction } from "./loadTransaction";
import type {
  LoadSaveTransactionResult,
  SaveData,
  SaveLoadTransactionData,
  SaveMigrationMetadata
} from "./saveTypes";
import { SAVE_DATA_VERSION } from "./saveTypes";
import { serializeSaveData } from "./saveFieldAliases";
import {
  isRecord,
  validateNumber,
  validateRecord
} from "./validationShared";

export const CLOUD_SAVE_ENVELOPE_VERSION = 1 as const;

export type CloudSaveEnvelope = {
  envelopeVersion: typeof CLOUD_SAVE_ENVELOPE_VERSION;
  accountId: string;
  saveSlotId: string;
  saveVersion: typeof SAVE_DATA_VERSION;
  checksum: string;
  createdAtMs: number;
  updatedAtMs: number;
  rawSave: unknown;
  migration?: SaveMigrationMetadata;
};

export type CreateCloudSaveEnvelopeInput = {
  accountId: string;
  saveSlotId: string;
  save: SaveData;
  checksum: string;
  migration?: SaveMigrationMetadata;
};

export type ParseCloudSaveEnvelopeResult =
  | {
      ok: true;
      envelope: CloudSaveEnvelope;
    }
  | {
      ok: false;
      reason: "invalid_cloud_save_envelope";
      errors: string[];
    };

export type LoadCloudSaveEnvelopeTransactionResult =
  | LoadSaveTransactionResult
  | Extract<ParseCloudSaveEnvelopeResult, { ok: false }>;

export type CloudSaveSnapshot = {
  checksum: string;
  updatedAtMs: number;
};

export type CloudSaveConflictAction =
  | "none"
  | "use_cloud"
  | "upload_local"
  | "manual_conflict"
  | "retry_local_write";

export type CloudSaveConflictReason =
  | "no_saves"
  | "missing_local"
  | "missing_cloud"
  | "matching_checksum"
  | "local_changed_since_last_sync"
  | "cloud_changed_since_last_sync"
  | "both_changed_since_last_sync"
  | "local_newer"
  | "cloud_newer"
  | "equal_timestamp_checksum_mismatch"
  | "failed_write";

export type CloudSaveConflictDecision = {
  action: CloudSaveConflictAction;
  reason: CloudSaveConflictReason;
};

export type DecideCloudSaveConflictInput = {
  local: CloudSaveSnapshot | null;
  cloud: CloudSaveSnapshot | null;
  lastSyncedChecksum?: string | null;
  failedWrite?: boolean;
};

function validateNonEmptyString(
  value: unknown,
  path: string,
  errors: string[]
): value is string {
  if (typeof value !== "string" || value.trim().length === 0) {
    errors.push(`${path} must be a non-empty string`);
    return false;
  }

  return true;
}

export function createCloudSaveEnvelope(
  input: CreateCloudSaveEnvelopeInput
): CloudSaveEnvelope {
  return {
    envelopeVersion: CLOUD_SAVE_ENVELOPE_VERSION,
    accountId: input.accountId,
    saveSlotId: input.saveSlotId,
    saveVersion: input.save.version,
    checksum: input.checksum,
    createdAtMs: input.save.createdAtMs,
    updatedAtMs: input.save.updatedAtMs,
    rawSave: serializeSaveData(input.save),
    ...(input.migration ? { migration: input.migration } : {})
  };
}

export function validateCloudSaveEnvelope(raw: unknown): string[] {
  const errors: string[] = [];

  if (!validateRecord(raw, "cloudSave", errors)) {
    return errors;
  }

  if (raw.envelopeVersion !== CLOUD_SAVE_ENVELOPE_VERSION) {
    errors.push(
      `envelopeVersion must be ${CLOUD_SAVE_ENVELOPE_VERSION}`
    );
  }

  validateNonEmptyString(raw.accountId, "accountId", errors);
  validateNonEmptyString(raw.saveSlotId, "saveSlotId", errors);
  validateNonEmptyString(raw.checksum, "checksum", errors);

  if (raw.saveVersion !== SAVE_DATA_VERSION) {
    errors.push(`saveVersion must be ${SAVE_DATA_VERSION}`);
  }

  const createdAtMs = raw.createdAtMs;
  const updatedAtMs = raw.updatedAtMs;
  const hasCreatedAt = validateNumber(createdAtMs, "createdAtMs", errors);
  const hasUpdatedAt = validateNumber(updatedAtMs, "updatedAtMs", errors);

  if (hasCreatedAt && hasUpdatedAt && updatedAtMs < createdAtMs) {
    errors.push("updatedAtMs must be greater than or equal to createdAtMs");
  }

  if (validateRecord(raw.rawSave, "rawSave", errors)) {
    if (raw.rawSave.version !== raw.saveVersion) {
      errors.push("rawSave.version must match saveVersion");
    }

    if (
      typeof raw.rawSave.createdAtMs === "number" &&
      typeof raw.createdAtMs === "number" &&
      raw.rawSave.createdAtMs !== raw.createdAtMs
    ) {
      errors.push("rawSave.createdAtMs must match createdAtMs");
    }

    if (
      typeof raw.rawSave.updatedAtMs === "number" &&
      typeof raw.updatedAtMs === "number" &&
      raw.rawSave.updatedAtMs !== raw.updatedAtMs
    ) {
      errors.push("rawSave.updatedAtMs must match updatedAtMs");
    }
  }

  if (raw.migration !== undefined && !isRecord(raw.migration)) {
    errors.push("migration must be an object when provided");
  }

  return errors;
}

export function parseCloudSaveEnvelope(
  raw: unknown
): ParseCloudSaveEnvelopeResult {
  const errors = validateCloudSaveEnvelope(raw);

  if (errors.length > 0) {
    return {
      ok: false,
      reason: "invalid_cloud_save_envelope",
      errors
    };
  }

  return {
    ok: true,
    envelope: raw as CloudSaveEnvelope
  };
}

export function loadCloudSaveEnvelopeTransaction(input: {
  data: SaveLoadTransactionData;
  envelope: unknown;
  nowMs: number;
}): LoadCloudSaveEnvelopeTransactionResult {
  const parsed = parseCloudSaveEnvelope(input.envelope);

  if (!parsed.ok) {
    return parsed;
  }

  return loadSaveTransaction({
    data: input.data,
    rawSave: parsed.envelope.rawSave,
    nowMs: input.nowMs
  });
}

export function decideCloudSaveConflict(
  input: DecideCloudSaveConflictInput
): CloudSaveConflictDecision {
  if (input.failedWrite) {
    return {
      action: "retry_local_write",
      reason: "failed_write"
    };
  }

  if (!input.local && !input.cloud) {
    return {
      action: "none",
      reason: "no_saves"
    };
  }

  if (!input.local) {
    return {
      action: "use_cloud",
      reason: "missing_local"
    };
  }

  if (!input.cloud) {
    return {
      action: "upload_local",
      reason: "missing_cloud"
    };
  }

  if (input.local.checksum === input.cloud.checksum) {
    return {
      action: "none",
      reason: "matching_checksum"
    };
  }

  if (input.lastSyncedChecksum) {
    const localChanged = input.local.checksum !== input.lastSyncedChecksum;
    const cloudChanged = input.cloud.checksum !== input.lastSyncedChecksum;

    if (localChanged && cloudChanged) {
      return {
        action: "manual_conflict",
        reason: "both_changed_since_last_sync"
      };
    }

    if (localChanged) {
      return {
        action: "upload_local",
        reason: "local_changed_since_last_sync"
      };
    }

    if (cloudChanged) {
      return {
        action: "use_cloud",
        reason: "cloud_changed_since_last_sync"
      };
    }
  }

  if (input.local.updatedAtMs > input.cloud.updatedAtMs) {
    return {
      action: "upload_local",
      reason: "local_newer"
    };
  }

  if (input.cloud.updatedAtMs > input.local.updatedAtMs) {
    return {
      action: "use_cloud",
      reason: "cloud_newer"
    };
  }

  return {
    action: "manual_conflict",
    reason: "equal_timestamp_checksum_mismatch"
  };
}
