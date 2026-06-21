import { ConfigurationError } from "./errors";
import type { ExtensionStorageAreaName, StorageBackendType, StorageCapabilities } from "./types";

export type ExtensionStorageKeys = string | string[] | Record<string, unknown> | null;

export interface ExtensionStorageArea {
  get(keys?: ExtensionStorageKeys): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
  clear(): Promise<void>;
  getBytesInUse?(keys?: string | string[] | null): Promise<number>;
}

function isRecord(value: unknown): value is Record<PropertyKey, unknown> {
  return (typeof value === "object" || typeof value === "function") && value !== null;
}

function getProperty(source: unknown, property: PropertyKey): unknown {
  if (!isRecord(source)) {
    return;
  }

  return Reflect.get(source, property);
}

function isExtensionStorageArea(value: unknown): value is ExtensionStorageArea {
  return (
    typeof getProperty(value, "get") === "function" &&
    typeof getProperty(value, "set") === "function" &&
    typeof getProperty(value, "remove") === "function" &&
    typeof getProperty(value, "clear") === "function"
  );
}

export function getExtensionStorageArea(
  apiName: "chrome" | "browser",
  areaName: ExtensionStorageAreaName,
): ExtensionStorageArea | undefined {
  const api = getProperty(globalThis, apiName);
  const storage = getProperty(api, "storage");
  const area = getProperty(storage, areaName);
  let storageArea: ExtensionStorageArea | undefined;

  if (isExtensionStorageArea(area)) {
    storageArea = area;
  }

  return storageArea;
}

export function detectStorageCapabilities(
  areaName: ExtensionStorageAreaName = "local",
): StorageCapabilities {
  const availableBackends: StorageBackendType[] = [];
  const indexedDb = typeof indexedDB !== "undefined";
  const chromeStorage = getExtensionStorageArea("chrome", areaName) !== undefined;
  const browserStorage = getExtensionStorageArea("browser", areaName) !== undefined;

  if (indexedDb) {
    availableBackends.push("indexeddb");
  }

  if (chromeStorage) {
    availableBackends.push("chrome-storage");
  }

  if (browserStorage) {
    availableBackends.push("browser-storage");
  }

  return {
    indexedDb,
    chromeStorage,
    browserStorage,
    availableBackends,
  };
}

export function getBestStorageBackend(
  areaName: ExtensionStorageAreaName = "local",
): StorageBackendType {
  const capabilities = detectStorageCapabilities(areaName);

  if (capabilities.indexedDb) {
    return "indexeddb";
  }

  if (capabilities.chromeStorage) {
    return "chrome-storage";
  }

  if (capabilities.browserStorage) {
    return "browser-storage";
  }

  throw new ConfigurationError(
    'No persistent storage backend is available. Pass backend: "memory" for tests or temporary data.',
  );
}
