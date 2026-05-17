# Cloud Save Contract

## Purpose

Stage 2.2 defines cloud save as a wrapper around the existing core save API. The goal is to let a future backend store and compare saves without duplicating migration, validation, offline reward, or timestamp logic.

No production account provider, database, or sync transport is required by this contract.

Theme note: Path of Neon display names do not rename cloud-save envelope fields by default. Envelope keys such as `saveVersion`, `checksum`, and `rawSave` remain literal compatibility contracts. The `rawSave` payload should be current `SaveData`; Stage 2.7 current saves use fields such as `credits`, `resonance`, `reagents`, `districts`, `combatData`, `currentRouteId`, `selectedOfflineFarmRouteId`, `selectedRoutineId`, and `technoSect`, while legacy raw saves are accepted only through core load/migration semantics.

## Core Entry Points

| Use Case | API | Notes |
| --- | --- | --- |
| Build a cloud payload | `createCloudSaveEnvelope` | Wraps a current `SaveData` with account, slot, checksum, save version, and timestamps. |
| Validate envelope shape | `validateCloudSaveEnvelope` / `parseCloudSaveEnvelope` | Checks wrapper fields and rejects future save versions before load. |
| Load a cloud payload | `loadCloudSaveEnvelopeTransaction` | Validates the envelope, then routes `rawSave` through `loadSaveTransaction`. |
| Decide sync conflict | `decideCloudSaveConflict` | Compares local/cloud checksums and timestamps without overwriting divergent saves. |

The checksum is supplied by the adapter. Core stores and compares it but does not choose a hash algorithm or import platform crypto.

## Envelope Shape

Cloud storage should use a wrapped envelope rather than raw save JSON alone:

| Field | Owner | Requirement |
| --- | --- | --- |
| `envelopeVersion` | Core contract | Must be `1`. |
| `accountId` | Backend/account adapter | Non-empty account identifier. |
| `saveSlotId` | Backend/account adapter | Non-empty save slot identifier, such as `primary`. |
| `saveVersion` | Core save contract | Must equal current `SAVE_DATA_VERSION`. |
| `checksum` | Persistence adapter | Non-empty checksum/hash for the stored raw save payload. |
| `createdAtMs` | Core save data | Must match `rawSave.createdAtMs`. |
| `updatedAtMs` | Core save data | Must match `rawSave.updatedAtMs` and be greater than or equal to `createdAtMs`. |
| `rawSave` | Core save data | Current `SaveData` payload to pass back through core load semantics; legacy shapes are accepted for import/load compatibility but are not the preferred durable cloud shape. |
| `migration` | Optional adapter metadata | Last parse/load migration metadata, useful for diagnostics. |

Cloud stores should persist current-version saves with the current Stage 2.7 save-field schema. Legacy import still belongs to `parseSaveData` or `loadSaveTransaction`; future save versions must be rejected rather than downgraded.

Stage 3.3 keeps District Heat report-only, Stage 3.4 completes a non-punitive warning contract, and Stage 3.5 ships a warning-only route-card note derived from existing view state. The warning remains cloud-free: cloud envelopes must not add heat, district-attention, warning, acknowledgement, or conflict metadata, and `rawSave` must not persist `districtHeat`, `districtHeatProjection`, `districtHeatPromotionDecision`, `projectedHeat`, `heatBand`, `districtAttention`, warning copy, or derived live heat state. A future persisted District Heat mechanic requires a dedicated save-version and cloud-contract slice before cloud stores accept heat fields.

## Load Flow

Cloud load should follow this sequence:

1. Fetch the envelope by account id and save slot id.
2. Validate the wrapper with `parseCloudSaveEnvelope` or `loadCloudSaveEnvelopeTransaction`.
3. Pass `rawSave` through `loadSaveTransaction` with one caller-provided `nowMs`.
4. Persist the returned candidate save only when `changed` is true or `writeReasons` is non-empty.
5. Rebuild the cloud envelope with a fresh checksum after a successful write.
6. If persistence fails after offline rewards or normalization, keep the uncommitted candidate separate from the durable cloud save and retry or surface the failure.

The backend, worker, or web adapter owns fetch/write failures and account authorization. Core owns save migration, validation, farm-target normalization, offline rewards, and timestamp advancement.

## Conflict Policy

`decideCloudSaveConflict` implements the Stage 2.2 policy:

| Case | Decision |
| --- | --- |
| Neither local nor cloud exists | No action. |
| Local missing, cloud exists | Use cloud. |
| Cloud missing, local exists | Upload local. |
| Checksums match | No conflict. |
| Only local changed since last synced checksum | Upload local. |
| Only cloud changed since last synced checksum | Use cloud. |
| Both local and cloud changed since last synced checksum | Manual conflict; do not overwrite automatically. |
| No last synced checksum and local timestamp is newer | Upload local. |
| No last synced checksum and cloud timestamp is newer | Use cloud. |
| Equal timestamp with different checksums | Manual conflict. |
| Failed write after a candidate save was produced | Retry the local write; do not treat uncommitted rewards as durable. |

This keeps local-newer and cloud-newer cases automatic only when there is no evidence that both sides changed offline.

## Responsibilities

Core responsibilities:

- Validate cloud envelope shape.
- Reject future or malformed save versions.
- Route raw saves through existing load semantics.
- Compare checksums/timestamps for deterministic conflict decisions.

Adapter/backend responsibilities:

- Authenticate accounts and authorize save slots.
- Compute checksums and choose hash algorithms.
- Read and write durable storage.
- Preserve last synced checksum when available.
- Present manual conflict choices to the user.
- Keep uncommitted offline reward writes separate from durable saves when persistence fails.
