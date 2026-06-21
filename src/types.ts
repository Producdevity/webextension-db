export type JsonPrimitive = string | number | boolean | null;

export interface JsonObject {
  [key: string]: JsonValue;
}

export type JsonArray = JsonValue[];

export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

export type DatabaseProvider = "auto" | "json";

export type StorageBackendType = "indexeddb" | "chrome-storage" | "browser-storage" | "memory";
export type ExtensionStorageBackendType = "chrome-storage" | "browser-storage";
export type StorageAccess = "readwrite" | "readonly";

export type ReadWriteExtensionStorageAreaName = "local" | "sync" | "session";
export type ReadOnlyExtensionStorageAreaName = "managed";
export type ExtensionStorageAreaName =
  | ReadWriteExtensionStorageAreaName
  | ReadOnlyExtensionStorageAreaName;

export interface BaseDatabaseConfig {
  name: string;
  provider?: DatabaseProvider;
  version?: number;
}

export interface ReadWriteDatabaseConfig extends BaseDatabaseConfig {
  backend?: StorageBackendType;
  storageArea?: ReadWriteExtensionStorageAreaName;
}

export interface ReadonlyDatabaseConfig extends BaseDatabaseConfig {
  backend?: ExtensionStorageBackendType;
  storageArea: ReadOnlyExtensionStorageAreaName;
}

export type DatabaseConfig = ReadWriteDatabaseConfig | ReadonlyDatabaseConfig;

export interface StorageAreaCapabilities {
  area: ExtensionStorageAreaName;
  access: StorageAccess;
  chromeStorage: boolean;
  browserStorage: boolean;
}

export interface StorageCapabilities {
  indexedDb: boolean;
  chromeStorage: boolean;
  browserStorage: boolean;
  availableBackends: StorageBackendType[];
  storageAreas: StorageAreaCapabilities[];
}

export interface DatabaseEntry {
  key: string;
  value: JsonValue;
}

export interface QueryOperator {
  $eq?: JsonValue;
  $ne?: JsonValue;
  $gt?: JsonPrimitive;
  $gte?: JsonPrimitive;
  $lt?: JsonPrimitive;
  $lte?: JsonPrimitive;
  $in?: JsonValue[];
  $nin?: JsonValue[];
  $regex?: string;
  $exists?: boolean;
}

export interface QueryFilter {
  [path: string]: JsonValue | QueryOperator;
}

export type SortDirection = "asc" | "desc" | 1 | -1;

export interface QueryOptions {
  sort?: Record<string, SortDirection>;
  limit?: number;
  offset?: number;
  skip?: number;
}

export type BatchOperation =
  | {
      type: "set";
      table: string;
      key: string;
      value: JsonValue;
    }
  | {
      type: "delete";
      table: string;
      key: string;
    }
  | {
      type: "clear";
      table: string;
    };

export interface DatabaseReader {
  readonly name: string;
  readonly provider: "json";
  readonly access: StorageAccess;
  readonly backend: StorageBackendType;

  get(table: string, key: string): Promise<JsonValue | undefined>;
  has(table: string, key: string): Promise<boolean>;
  exists(table: string, key: string): Promise<boolean>;
  keys(table: string): Promise<string[]>;
  entries(table: string): Promise<DatabaseEntry[]>;
  find(table: string, filter?: QueryFilter, options?: QueryOptions): Promise<DatabaseEntry[]>;
  count(table: string, filter?: QueryFilter): Promise<number>;
  listTables(): Promise<string[]>;
  close(): Promise<void>;
}

export interface Database extends DatabaseReader {
  readonly access: "readwrite";

  set(table: string, key: string, value: JsonValue): Promise<void>;
  delete(table: string, key: string): Promise<void>;
  clear(table: string): Promise<void>;
  batch(operations: BatchOperation[]): Promise<void>;
  destroy(): Promise<void>;
}

export interface ReadonlyDatabase extends DatabaseReader {
  readonly access: "readonly";
}
