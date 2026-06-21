import { ValidationError } from "./errors";

const STORAGE_PREFIX = "webextension-db";
const KEY_SEPARATOR = "::";

export interface StorageKeyParts {
  table: string;
  key: string;
}

export function validateName(kind: string, value: string): void {
  if (value.trim().length === 0) {
    throw new ValidationError(`${kind} must not be empty`);
  }

  if (value.includes("\u0000")) {
    throw new ValidationError(`${kind} must not contain null bytes`);
  }
}

export function formatStorageKey(namespace: string, table: string, key: string): string {
  validateName("Database name", namespace);
  validateName("Table name", table);
  validateName("Key", key);

  return [
    STORAGE_PREFIX,
    encodeURIComponent(namespace),
    encodeURIComponent(table),
    encodeURIComponent(key),
  ].join(KEY_SEPARATOR);
}

export function parseStorageKey(
  namespace: string,
  storageKey: string,
): StorageKeyParts | undefined {
  const expectedPrefix = [STORAGE_PREFIX, encodeURIComponent(namespace), ""].join(KEY_SEPARATOR);
  let parsedKey: StorageKeyParts | undefined;

  if (storageKey.startsWith(expectedPrefix)) {
    const parts = storageKey.slice(expectedPrefix.length).split(KEY_SEPARATOR);
    const encodedTable = parts[0];
    const encodedKey = parts[1];

    if (parts.length === 2 && encodedTable !== undefined && encodedKey !== undefined) {
      try {
        parsedKey = {
          table: decodeURIComponent(encodedTable),
          key: decodeURIComponent(encodedKey),
        };
      } catch {}
    }
  }

  return parsedKey;
}
