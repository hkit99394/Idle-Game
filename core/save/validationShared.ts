import { SUPPORTED_SAVE_DATA_VERSIONS, type SupportedSaveDataVersion, type UnknownRecord } from "./saveTypes";

export function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isSupportedSaveDataVersion(
  value: unknown
): value is SupportedSaveDataVersion {
  return SUPPORTED_SAVE_DATA_VERSIONS.includes(
    value as SupportedSaveDataVersion
  );
}

export function isFiniteNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export function validateNumber(
  value: unknown,
  path: string,
  errors: string[]
): value is number {
  if (!isFiniteNonNegativeNumber(value)) {
    errors.push(`${path} must be a non-negative finite number`);
    return false;
  }

  return true;
}

export function validateIntegerRange(
  value: unknown,
  path: string,
  min: number,
  max: number,
  errors: string[]
): value is number {
  if (!validateNumber(value, path, errors)) {
    return false;
  }

  if (!Number.isInteger(value) || value < min || value > max) {
    errors.push(`${path} must be an integer between ${min} and ${max}`);
    return false;
  }

  return true;
}

export function validateRecord(
  value: unknown,
  path: string,
  errors: string[]
): value is UnknownRecord {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return false;
  }

  return true;
}

export function validateNumberMap(
  value: unknown,
  path: string,
  errors: string[]
): value is Record<string, number> {
  if (!validateRecord(value, path, errors)) {
    return false;
  }

  for (const [key, entry] of Object.entries(value)) {
    validateNumber(entry, `${path}.${key}`, errors);
  }

  return true;
}
