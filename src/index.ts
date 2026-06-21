export { createDatabase } from "./database";
export type {
  ExtensionStorageArea,
  ExtensionStorageKeys,
  ExtensionStorageResult,
  ReadonlyExtensionStorageArea,
} from "./environment";
export {
  detectStorageCapabilities,
  getBestExtensionStorageBackend,
  getBestStorageBackend,
  getExtensionStorageArea,
  getExtensionStorageAreaAccess,
  getReadonlyExtensionStorageArea,
} from "./environment";
export {
  ConfigurationError,
  StorageError,
  ValidationError,
  WebExtensionDBError,
} from "./errors";
export {
  assertJsonValue,
  cloneJsonValue,
  isJsonObject,
  isJsonValue,
} from "./json";
export type {
  BatchOperation,
  Database,
  DatabaseConfig,
  DatabaseEntry,
  DatabaseProvider,
  DatabaseReader,
  ExtensionStorageAreaName,
  ExtensionStorageBackendType,
  JsonArray,
  JsonObject,
  JsonPrimitive,
  JsonValue,
  QueryFilter,
  QueryOperator,
  QueryOptions,
  ReadOnlyExtensionStorageAreaName,
  ReadonlyDatabase,
  ReadonlyDatabaseConfig,
  ReadWriteDatabaseConfig,
  ReadWriteExtensionStorageAreaName,
  SortDirection,
  StorageAccess,
  StorageAreaCapabilities,
  StorageBackendType,
  StorageCapabilities,
} from "./types";

export const version = "0.2.0";
