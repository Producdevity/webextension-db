import { type ExtensionStorageArea, getExtensionStorageArea } from "./environment";
import { ConfigurationError, StorageError } from "./errors";
import { assertJsonValue, cloneJsonValue } from "./json";
import { formatStorageKey, parseStorageKey, validateName } from "./keys";
import type {
  DatabaseEntry,
  ExtensionStorageAreaName,
  JsonValue,
  StorageBackendType,
} from "./types";

const DEFAULT_STORE_NAME = "records";

export interface StorageBackend {
  readonly type: StorageBackendType;

  get(table: string, key: string): Promise<JsonValue | undefined>;
  set(table: string, key: string, value: JsonValue): Promise<void>;
  delete(table: string, key: string): Promise<void>;
  clearTable(table: string): Promise<void>;
  keys(table: string): Promise<string[]>;
  entries(table: string): Promise<DatabaseEntry[]>;
  listTables(): Promise<string[]>;
  close(): Promise<void>;
  destroy(): Promise<void>;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onerror = () => {
      reject(new StorageError(request.error?.message ?? "IndexedDB request failed"));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

function openIndexedDb(name: string, version: number, storeName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);

    request.onerror = () => {
      reject(new StorageError(request.error?.message ?? "Failed to open IndexedDB"));
    };

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(storeName)) {
        database.createObjectStore(storeName);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
}

export class IndexedDbStorageBackend implements StorageBackend {
  readonly type = "indexeddb";

  private constructor(
    private readonly namespace: string,
    private readonly database: IDBDatabase,
    private readonly storeName: string,
  ) {}

  static async create(namespace: string, version = 1): Promise<IndexedDbStorageBackend> {
    if (typeof indexedDB === "undefined") {
      throw new ConfigurationError("IndexedDB is not available");
    }

    const database = await openIndexedDb(namespace, version, DEFAULT_STORE_NAME);

    return new IndexedDbStorageBackend(namespace, database, DEFAULT_STORE_NAME);
  }

  async get(table: string, key: string): Promise<JsonValue | undefined> {
    const fullKey = formatStorageKey(this.namespace, table, key);
    const transaction = this.database.transaction(this.storeName, "readonly");
    const store = transaction.objectStore(this.storeName);
    const request: IDBRequest<unknown> = store.get(fullKey);
    const value = await requestToPromise(request);

    if (value === undefined) {
      return;
    }

    assertJsonValue(value);
    return cloneJsonValue(value);
  }

  async set(table: string, key: string, value: JsonValue): Promise<void> {
    const fullKey = formatStorageKey(this.namespace, table, key);
    const transaction = this.database.transaction(this.storeName, "readwrite");
    const store = transaction.objectStore(this.storeName);
    const request: IDBRequest<IDBValidKey> = store.put(cloneJsonValue(value), fullKey);
    await requestToPromise(request);
  }

  async delete(table: string, key: string): Promise<void> {
    const fullKey = formatStorageKey(this.namespace, table, key);
    const transaction = this.database.transaction(this.storeName, "readwrite");
    const store = transaction.objectStore(this.storeName);
    const request: IDBRequest<undefined> = store.delete(fullKey);
    await requestToPromise(request);
  }

  async clearTable(table: string): Promise<void> {
    validateName("Table name", table);
    const keys = await this.keys(table);
    await Promise.all(keys.map((key) => this.delete(table, key)));
  }

  async keys(table: string): Promise<string[]> {
    validateName("Table name", table);
    const rawKeys = await this.getRawKeys();
    const keys: string[] = [];

    for (const rawKey of rawKeys) {
      if (typeof rawKey !== "string") {
        continue;
      }

      const parsed = parseStorageKey(this.namespace, rawKey);
      if (parsed?.table === table) {
        keys.push(parsed.key);
      }
    }

    return keys;
  }

  async entries(table: string): Promise<DatabaseEntry[]> {
    const keys = await this.keys(table);
    const entries = await Promise.all(
      keys.map(async (key) => {
        const value = await this.get(table, key);
        return value === undefined ? undefined : { key, value };
      }),
    );

    return entries.filter((entry): entry is DatabaseEntry => entry !== undefined);
  }

  async listTables(): Promise<string[]> {
    const rawKeys = await this.getRawKeys();
    const tables = new Set<string>();

    for (const rawKey of rawKeys) {
      if (typeof rawKey !== "string") {
        continue;
      }

      const parsed = parseStorageKey(this.namespace, rawKey);
      if (parsed !== undefined) {
        tables.add(parsed.table);
      }
    }

    return [...tables].sort();
  }

  async close(): Promise<void> {
    this.database.close();
  }

  async destroy(): Promise<void> {
    await this.close();

    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this.namespace);

      request.onerror = () => {
        reject(new StorageError(request.error?.message ?? "Failed to delete IndexedDB database"));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  private async getRawKeys(): Promise<IDBValidKey[]> {
    const transaction = this.database.transaction(this.storeName, "readonly");
    const store = transaction.objectStore(this.storeName);
    const request: IDBRequest<IDBValidKey[]> = store.getAllKeys();
    return requestToPromise(request);
  }
}

export class ExtensionStorageBackend implements StorageBackend {
  readonly type: StorageBackendType;

  constructor(
    apiName: "chrome" | "browser",
    private readonly namespace: string,
    private readonly area: ExtensionStorageArea,
  ) {
    this.type = apiName === "chrome" ? "chrome-storage" : "browser-storage";
    validateName("Database name", namespace);
  }

  static create(
    type: "chrome-storage" | "browser-storage",
    namespace: string,
    areaName: ExtensionStorageAreaName,
  ): ExtensionStorageBackend {
    const apiName = type === "chrome-storage" ? "chrome" : "browser";
    const area = getExtensionStorageArea(apiName, areaName);

    if (area === undefined) {
      throw new ConfigurationError(`${type} is not available`);
    }

    return new ExtensionStorageBackend(apiName, namespace, area);
  }

  async get(table: string, key: string): Promise<JsonValue | undefined> {
    const fullKey = formatStorageKey(this.namespace, table, key);
    const result = await this.area.get(fullKey);
    const value = result[fullKey];

    if (value === undefined) {
      return;
    }

    assertJsonValue(value);
    return cloneJsonValue(value);
  }

  async set(table: string, key: string, value: JsonValue): Promise<void> {
    const fullKey = formatStorageKey(this.namespace, table, key);
    await this.area.set({ [fullKey]: cloneJsonValue(value) });
  }

  async delete(table: string, key: string): Promise<void> {
    const fullKey = formatStorageKey(this.namespace, table, key);
    await this.area.remove(fullKey);
  }

  async clearTable(table: string): Promise<void> {
    validateName("Table name", table);
    const keys = await this.keys(table);
    const fullKeys = keys.map((key) => formatStorageKey(this.namespace, table, key));

    if (fullKeys.length > 0) {
      await this.area.remove(fullKeys);
    }
  }

  async keys(table: string): Promise<string[]> {
    validateName("Table name", table);
    const items = await this.area.get(null);
    const keys: string[] = [];

    for (const storageKey of Object.keys(items)) {
      const parsed = parseStorageKey(this.namespace, storageKey);
      if (parsed?.table === table) {
        keys.push(parsed.key);
      }
    }

    return keys;
  }

  async entries(table: string): Promise<DatabaseEntry[]> {
    validateName("Table name", table);
    const items = await this.area.get(null);
    const entries: DatabaseEntry[] = [];

    for (const [storageKey, value] of Object.entries(items)) {
      const parsed = parseStorageKey(this.namespace, storageKey);
      if (parsed?.table !== table) {
        continue;
      }

      assertJsonValue(value);
      entries.push({ key: parsed.key, value: cloneJsonValue(value) });
    }

    return entries;
  }

  async listTables(): Promise<string[]> {
    const items = await this.area.get(null);
    const tables = new Set<string>();

    for (const storageKey of Object.keys(items)) {
      const parsed = parseStorageKey(this.namespace, storageKey);
      if (parsed !== undefined) {
        tables.add(parsed.table);
      }
    }

    return [...tables].sort();
  }

  async close(): Promise<void> {}

  async destroy(): Promise<void> {
    const items = await this.area.get(null);
    const keys = Object.keys(items).filter(
      (key) => parseStorageKey(this.namespace, key) !== undefined,
    );

    if (keys.length > 0) {
      await this.area.remove(keys);
    }
  }
}

export class MemoryStorageBackend implements StorageBackend {
  readonly type = "memory";

  private readonly records = new Map<string, JsonValue>();

  constructor(private readonly namespace: string) {
    validateName("Database name", namespace);
  }

  async get(table: string, key: string): Promise<JsonValue | undefined> {
    const fullKey = formatStorageKey(this.namespace, table, key);
    const value = this.records.get(fullKey);
    return value === undefined ? undefined : cloneJsonValue(value);
  }

  async set(table: string, key: string, value: JsonValue): Promise<void> {
    const fullKey = formatStorageKey(this.namespace, table, key);
    this.records.set(fullKey, cloneJsonValue(value));
  }

  async delete(table: string, key: string): Promise<void> {
    const fullKey = formatStorageKey(this.namespace, table, key);
    this.records.delete(fullKey);
  }

  async clearTable(table: string): Promise<void> {
    validateName("Table name", table);
    const keys = await this.keys(table);
    await Promise.all(keys.map((key) => this.delete(table, key)));
  }

  async keys(table: string): Promise<string[]> {
    validateName("Table name", table);
    const keys: string[] = [];

    for (const storageKey of this.records.keys()) {
      const parsed = parseStorageKey(this.namespace, storageKey);
      if (parsed?.table === table) {
        keys.push(parsed.key);
      }
    }

    return keys;
  }

  async entries(table: string): Promise<DatabaseEntry[]> {
    validateName("Table name", table);
    const entries: DatabaseEntry[] = [];

    for (const [storageKey, value] of this.records.entries()) {
      const parsed = parseStorageKey(this.namespace, storageKey);
      if (parsed?.table === table) {
        entries.push({ key: parsed.key, value: cloneJsonValue(value) });
      }
    }

    return entries;
  }

  async listTables(): Promise<string[]> {
    const tables = new Set<string>();

    for (const storageKey of this.records.keys()) {
      const parsed = parseStorageKey(this.namespace, storageKey);
      if (parsed !== undefined) {
        tables.add(parsed.table);
      }
    }

    return [...tables].sort();
  }

  async close(): Promise<void> {}

  async destroy(): Promise<void> {
    this.records.clear();
  }
}
