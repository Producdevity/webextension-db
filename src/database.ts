import {
  ExtensionStorageBackend,
  IndexedDbStorageBackend,
  MemoryStorageBackend,
  type StorageBackend,
} from "./backends";
import { getBestStorageBackend } from "./environment";
import { ConfigurationError } from "./errors";
import { assertJsonValue } from "./json";
import { applyQueryOptions, matchesFilter } from "./query";
import type {
  BatchOperation,
  Database,
  DatabaseConfig,
  DatabaseEntry,
  JsonValue,
  QueryFilter,
  QueryOptions,
  StorageBackendType,
} from "./types";

export async function createDatabase(config: DatabaseConfig): Promise<Database> {
  validateConfig(config);
  const storage = await createStorageBackend(config);
  return new JsonDatabase(config.name, storage);
}

class JsonDatabase implements Database {
  readonly provider = "json";

  constructor(
    readonly name: string,
    private readonly storage: StorageBackend,
  ) {}

  get backend(): StorageBackendType {
    return this.storage.type;
  }

  async get(table: string, key: string): Promise<JsonValue | undefined> {
    return this.storage.get(table, key);
  }

  async set(table: string, key: string, value: JsonValue): Promise<void> {
    assertJsonValue(value);
    await this.storage.set(table, key, value);
  }

  async delete(table: string, key: string): Promise<void> {
    await this.storage.delete(table, key);
  }

  async has(table: string, key: string): Promise<boolean> {
    return (await this.storage.get(table, key)) !== undefined;
  }

  async exists(table: string, key: string): Promise<boolean> {
    return this.has(table, key);
  }

  async clear(table: string): Promise<void> {
    await this.storage.clearTable(table);
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

  async listTables(): Promise<string[]> {
    return this.storage.listTables();
  }

  async close(): Promise<void> {
    await this.storage.close();
  }

  async destroy(): Promise<void> {
    await this.storage.destroy();
  }
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
}

async function createStorageBackend(config: DatabaseConfig): Promise<StorageBackend> {
  const areaName = config.storageArea ?? "local";
  const type = config.backend ?? getBestStorageBackend(areaName);

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
