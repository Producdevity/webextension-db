import { ConfigurationError } from "./errors";
import type {
  ExtensionStorageAreaName,
  ExtensionStorageBackendType,
  StorageAccess,
  StorageBackendType,
  StorageCapabilities,
} from "./types";

export type ExtensionStorageKeys = string | string[] | Record<string, unknown> | null;
export type ExtensionStorageResult<T> = Promise<T> | undefined;

const EXTENSION_STORAGE_AREA_NAMES: ExtensionStorageAreaName[] = [
  "local",
  "sync",
  "session",
  "managed",
];

export interface ReadonlyExtensionStorageArea {
  get(
    keys?: ExtensionStorageKeys,
    callback?: (items: Record<string, unknown>) => unknown,
  ): ExtensionStorageResult<Record<string, unknown>>;
  getKeys?(callback?: (keys: string[]) => unknown): ExtensionStorageResult<string[]>;
  getBytesInUse?(
    keys?: string | string[] | null,
    callback?: (bytesInUse: number) => unknown,
  ): ExtensionStorageResult<number>;
}

export interface ExtensionStorageArea extends ReadonlyExtensionStorageArea {
  set(items: Record<string, unknown>, callback?: () => unknown): ExtensionStorageResult<void>;
  remove(keys: string | string[], callback?: () => unknown): ExtensionStorageResult<void>;
  clear(callback?: () => unknown): ExtensionStorageResult<void>;
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

function isReadonlyExtensionStorageArea(value: unknown): value is ReadonlyExtensionStorageArea {
  return typeof getProperty(value, "get") === "function";
}

function isExtensionStorageArea(value: unknown): value is ExtensionStorageArea {
  return (
    isReadonlyExtensionStorageArea(value) &&
    typeof getProperty(value, "set") === "function" &&
    typeof getProperty(value, "remove") === "function" &&
    typeof getProperty(value, "clear") === "function"
  );
}

export function getExtensionStorageAreaAccess(areaName: ExtensionStorageAreaName): StorageAccess {
  return areaName === "managed" ? "readonly" : "readwrite";
}

export function getReadonlyExtensionStorageArea(
  apiName: "chrome" | "browser",
  areaName: ExtensionStorageAreaName,
): ReadonlyExtensionStorageArea | undefined {
  const api = getProperty(globalThis, apiName);
  const storage = getProperty(api, "storage");
  const area = getProperty(storage, areaName);
  let storageArea: ReadonlyExtensionStorageArea | undefined;

  if (isReadonlyExtensionStorageArea(area)) {
    storageArea = area;
  }

  return storageArea;
}

export function getExtensionStorageArea(
  apiName: "chrome" | "browser",
  areaName: ExtensionStorageAreaName,
): ExtensionStorageArea | undefined {
  if (getExtensionStorageAreaAccess(areaName) === "readonly") {
    return;
  }

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
  const storageAccess = getExtensionStorageAreaAccess(areaName);
  const chromeStorage =
    storageAccess === "readonly"
      ? getReadonlyExtensionStorageArea("chrome", areaName) !== undefined
      : getExtensionStorageArea("chrome", areaName) !== undefined;
  const browserStorage =
    storageAccess === "readonly"
      ? getReadonlyExtensionStorageArea("browser", areaName) !== undefined
      : getExtensionStorageArea("browser", areaName) !== undefined;
  const storageAreas = EXTENSION_STORAGE_AREA_NAMES.map((area) => ({
    area,
    access: getExtensionStorageAreaAccess(area),
    chromeStorage: getReadonlyExtensionStorageArea("chrome", area) !== undefined,
    browserStorage: getReadonlyExtensionStorageArea("browser", area) !== undefined,
  }));

  if (indexedDb && storageAccess === "readwrite") {
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
    storageAreas,
  };
}

export function getBestStorageBackend(
  areaName: ExtensionStorageAreaName = "local",
): StorageBackendType {
  const capabilities = detectStorageCapabilities(areaName);

  if (capabilities.indexedDb && getExtensionStorageAreaAccess(areaName) === "readwrite") {
    return "indexeddb";
  }

  return getBestExtensionStorageBackend(areaName);
}

export function getBestExtensionStorageBackend(
  areaName: ExtensionStorageAreaName,
): ExtensionStorageBackendType {
  const capabilities = detectStorageCapabilities(areaName);

  if (capabilities.chromeStorage) {
    return "chrome-storage";
  }

  if (capabilities.browserStorage) {
    return "browser-storage";
  }

  throw new ConfigurationError(
    'No compatible storage backend is available. Pass backend: "memory" for tests or temporary data.',
  );
}
