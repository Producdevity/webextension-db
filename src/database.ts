import {
  ExtensionStorageBackend,
  IndexedDbStorageBackend,
  MemoryStorageBackend,
  ReadonlyExtensionStorageBackend,
  type ReadonlyStorageBackend,
  type StorageBackend,
} from "./backends";
import { getBestExtensionStorageBackend, getBestStorageBackend } from "./environment";
import { ConfigurationError } from "./errors";
import { assertJsonValue } from "./json";
import { applyQueryOptions, matchesFilter } from "./query";
import type {
  BatchOperation,
  Database,
  DatabaseConfig,
  DatabaseEntry,
  DatabaseReader,
  ExtensionStorageBackendType,
  JsonValue,
  QueryFilter,
  QueryOptions,
  ReadonlyDatabase,
  ReadonlyDatabaseConfig,
  ReadWriteDatabaseConfig,
  StorageBackendType,
} from "./types";

export function createDatabase(config: ReadonlyDatabaseConfig): Promise<ReadonlyDatabase>;
export function createDatabase(config: ReadWriteDatabaseConfig): Promise<Database>;
export function createDatabase(config: DatabaseConfig): Promise<Database | ReadonlyDatabase>;
export async function createDatabase(config: DatabaseConfig): Promise<Database | ReadonlyDatabase> {
  validateConfig(config);

  if (isReadonlyDatabaseConfig(config)) {
    const storage = createReadonlyStorageBackend(config);
    return new JsonReadonlyDatabase(config.name, storage);
  }

  const storage = await createStorageBackend(config);
  return new JsonDatabase(config.name, storage);
}

abstract class JsonDatabaseReader implements DatabaseReader {
  readonly provider = "json";
  abstract readonly access: DatabaseReader["access"];

  constructor(
    readonly name: string,
    protected readonly storage: ReadonlyStorageBackend,
  ) {}

  get backend(): StorageBackendType {
    return this.storage.type;
  }

  async get(table: string, key: string): Promise<JsonValue | undefined> {
    return this.storage.get(table, key);
  }

  async has(table: string, key: string): Promise<boolean> {
    return (await this.storage.get(table, key)) !== undefined;
  }

  async exists(table: string, key: string): Promise<boolean> {
    return this.has(table, key);
  }

  async keys(table: string): Promise<string[]> {
    return this.storage.keys(table);
  }

  async entries(table: string): Promise<DatabaseEntry[]> {
    return this.storage.entries(table);
  }

  async find(
    table: string,
    filter: QueryFilter = {},
    options: QueryOptions = {},
  ): Promise<DatabaseEntry[]> {
    const entries = await this.storage.entries(table);
    const filtered = entries.filter((entry) => matchesFilter(entry.value, filter));
    return applyQueryOptions(filtered, options);
  }

  async count(table: string, filter: QueryFilter = {}): Promise<number> {
    return (await this.find(table, filter)).length;
  }

  async listTables(): Promise<string[]> {
    return this.storage.listTables();
  }

  async close(): Promise<void> {
    await this.storage.close();
  }
}

class JsonReadonlyDatabase extends JsonDatabaseReader implements ReadonlyDatabase {
  readonly access = "readonly";
}

class JsonDatabase extends JsonDatabaseReader implements Database {
  readonly access = "readwrite";

  constructor(
    name: string,
    private readonly writableStorage: StorageBackend,
  ) {
    super(name, writableStorage);
  }

  async set(table: string, key: string, value: JsonValue): Promise<void> {
    assertJsonValue(value);
    await this.writableStorage.set(table, key, value);
  }

  async delete(table: string, key: string): Promise<void> {
    await this.writableStorage.delete(table, key);
  }

  async clear(table: string): Promise<void> {
    await this.writableStorage.clearTable(table);
  }

  async batch(operations: BatchOperation[]): Promise<void> {
    let sequence = Promise.resolve();

    for (const operation of operations) {
      sequence = sequence.then(() => this.runBatchOperation(operation));
    }

    await sequence;
  }

  private async runBatchOperation(operation: BatchOperation): Promise<void> {
    switch (operation.type) {
      case "set":
        await this.set(operation.table, operation.key, operation.value);
        break;
      case "delete":
        await this.delete(operation.table, operation.key);
        break;
      case "clear":
        await this.clear(operation.table);
        break;
    }
  }

  async destroy(): Promise<void> {
    await this.writableStorage.destroy();
  }
}

function isReadonlyDatabaseConfig(config: DatabaseConfig): config is ReadonlyDatabaseConfig {
  return config.storageArea === "managed";
}

function validateConfig(config: DatabaseConfig): void {
  if (config.name.trim().length === 0) {
    throw new ConfigurationError("Database name must not be empty");
  }

  if (config.provider !== undefined && config.provider !== "auto" && config.provider !== "json") {
    throw new ConfigurationError(
      `Unsupported provider "${config.provider}". The supported provider is "json".`,
    );
  }

  if (config.version !== undefined && config.version < 1) {
    throw new ConfigurationError("Database version must be greater than 0");
  }

  if (config.storageArea === "managed") {
    const backend = config.backend;
    if (backend !== undefined && backend !== "chrome-storage" && backend !== "browser-storage") {
      throw new ConfigurationError(
        'storageArea: "managed" requires backend: "chrome-storage" or backend: "browser-storage".',
      );
    }
  }
}

function getExtensionBackendType(
  areaName: ReadonlyDatabaseConfig["storageArea"],
  backend: ExtensionStorageBackendType | undefined,
): ExtensionStorageBackendType {
  const type = backend ?? getBestExtensionStorageBackend(areaName);

  if (type === "chrome-storage" || type === "browser-storage") {
    return type;
  }

  throw new ConfigurationError(
    'storageArea: "managed" requires backend: "chrome-storage" or backend: "browser-storage".',
  );
}

function createReadonlyStorageBackend(config: ReadonlyDatabaseConfig): ReadonlyStorageBackend {
  const type = getExtensionBackendType(config.storageArea, config.backend);

  return ReadonlyExtensionStorageBackend.create(type, config.name, config.storageArea);
}

async function createStorageBackend(config: ReadWriteDatabaseConfig): Promise<StorageBackend> {
  const areaName = config.storageArea ?? "local";
  const type =
    config.backend ??
    (config.storageArea === undefined
      ? getBestStorageBackend(areaName)
      : getBestExtensionStorageBackend(areaName));

  switch (type) {
    case "indexeddb":
      return IndexedDbStorageBackend.create(config.name, config.version ?? 1);
    case "chrome-storage":
    case "browser-storage":
      return ExtensionStorageBackend.create(type, config.name, areaName);
    case "memory":
      return new MemoryStorageBackend(config.name);
  }
}
