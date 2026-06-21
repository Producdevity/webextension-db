export type JsonPrimitive = string | number | boolean | null;

export interface JsonObject {
  [key: string]: JsonValue;
}

export type JsonArray = JsonValue[];

export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

export type DatabaseProvider = "auto" | "json";

export type StorageBackendType = "indexeddb" | "chrome-storage" | "browser-storage" | "memory";

export type ExtensionStorageAreaName = "local" | "sync";

export interface DatabaseConfig {
  name: string;
  provider?: DatabaseProvider;
  backend?: StorageBackendType;
  version?: number;
  storageArea?: ExtensionStorageAreaName;
}

export interface StorageCapabilities {
  indexedDb: boolean;
  chromeStorage: boolean;
  browserStorage: boolean;
  availableBackends: StorageBackendType[];
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

export interface Database {
  readonly name: string;
  readonly provider: "json";
  readonly backend: StorageBackendType;

  get(table: string, key: string): Promise<JsonValue | undefined>;
  set(table: string, key: string, value: JsonValue): Promise<void>;
  delete(table: string, key: string): Promise<void>;
  has(table: string, key: string): Promise<boolean>;
  exists(table: string, key: string): Promise<boolean>;
  clear(table: string): Promise<void>;
  keys(table: string): Promise<string[]>;
  entries(table: string): Promise<DatabaseEntry[]>;
  find(table: string, filter?: QueryFilter, options?: QueryOptions): Promise<DatabaseEntry[]>;
  count(table: string, filter?: QueryFilter): Promise<number>;
  batch(operations: BatchOperation[]): Promise<void>;
  listTables(): Promise<string[]>;
  close(): Promise<void>;
  destroy(): Promise<void>;
}
