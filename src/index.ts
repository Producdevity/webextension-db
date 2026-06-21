export { createDatabase } from "./database";
export type { ExtensionStorageArea, ExtensionStorageKeys } from "./environment";
export {
  detectStorageCapabilities,
  getBestStorageBackend,
  getExtensionStorageArea,
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
  ExtensionStorageAreaName,
  JsonArray,
  JsonObject,
  JsonPrimitive,
  JsonValue,
  QueryFilter,
  QueryOperator,
  QueryOptions,
  SortDirection,
  StorageBackendType,
  StorageCapabilities,
} from "./types";

export const version = "0.2.0";
