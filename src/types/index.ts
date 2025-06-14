/**
 * @fileoverview
 * Type definitions for WebExtension DB.
 *
 * This file contains all the TypeScript interfaces, types, and error classes
 * used throughout the webextension-db library.
 *
 * @author WebExtension DB Contributors
 * @since 1.0.0
 */

/**
 * Database provider types supported by webextension-db.
 *
 * @public
 */
export type DatabaseProviderType = 'sqlite' | 'json' | 'auto'

/**
 * Browser types that can be detected by the library.
 *
 * @public
 */
export type BrowserType = 'chrome' | 'firefox' | 'safari' | 'unknown'

/**
 * Storage backend types available across different browsers.
 *
 * @public
 */
export type StorageBackendType =
  | 'opfs'
  | 'indexeddb'
  | 'chrome-storage'
  | 'browser-storage'
  | 'localstorage'

/**
 * Generic value types that can be stored in the database.
 *
 * Supports all JSON-serializable types plus Date objects.
 *
 * @example
 * ```typescript
 * const user: StorageValue = {
 *   name: "John",
 *   age: 30,
 *   active: true,
 *   lastLogin: new Date(),
 *   preferences: ["dark-mode", "notifications"]
 * };
 * ```
 *
 * @public
 */
export type StorageValue =
  | string
  | number
  | boolean
  | null
  | Date
  | StorageValue[]
  | { [key: string]: StorageValue }

/**
 * Transaction access modes.
 *
 * @public
 */
export type TransactionMode = 'readonly' | 'readwrite'

/**
 * Query filter for finding records in JSON provider.
 *
 * @example
 * ```typescript
 * const filter: QueryFilter = {
 *   age: { $gte: 18, $lt: 65 },
 *   active: true,
 *   name: { $regex: "^John" }
 * };
 * ```
 *
 * @public
 */
export interface QueryFilter {
  [key: string]: StorageValue | QueryOperator
}

/**
 * Query operators for advanced filtering in JSON provider.
 *
 * Supports MongoDB-style query operators for filtering data.
 *
 * @public
 */
export interface QueryOperator {
  /** Equals */
  $eq?: StorageValue
  /** Not equals */
  $ne?: StorageValue
  /** Greater than */
  $gt?: number | string | Date
  /** Greater than or equal */
  $gte?: number | string | Date
  /** Less than */
  $lt?: number | string | Date
  /** Less than or equal */
  $lte?: number | string | Date
  /** In array */
  $in?: StorageValue[]
  /** Not in array */
  $nin?: StorageValue[]
  /** Regular expression match */
  $regex?: string
  /** Field exists */
  $exists?: boolean
}

/**
 * Options for query operations.
 *
 * @public
 */
export interface QueryOptions {
  /** Maximum number of results to return */
  limit?: number
  /** Number of results to skip */
  skip?: number
  /** Sort order (1 for ascending, -1 for descending) */
  sort?: { [key: string]: 1 | -1 }
}

/**
 * Browser capabilities detected by the library.
 *
 * Used to determine which storage providers and features are available
 * in the current browser environment.
 *
 * @example
 * ```typescript
 * const capabilities = getBrowserCapabilities();
 * if (capabilities.supportsWASM && capabilities.browser === 'firefox') {
 *   // Use SQLite WASM in Firefox
 * }
 * ```
 *
 * @public
 */
export interface BrowserCapabilities {
  /** Detected browser type */
  browser: BrowserType
  /** IndexedDB support */
  hasIndexedDB: boolean
  /** Origin Private File System support */
  hasOPFS: boolean
  /** Web Workers support */
  hasWebWorkers: boolean
  /** SharedArrayBuffer support */
  hasSharedArrayBuffer: boolean
  /** OffscreenCanvas support */
  hasOffscreenCanvas: boolean
  /** Chrome extension storage API */
  hasChromeStorage: boolean
  /** Browser extension storage API (Firefox/Safari) */
  hasBrowserStorage: boolean
  /** WebAssembly support */
  supportsWASM: boolean
  /** Extension API namespace ('chrome' or 'browser') */
  extensionAPI: 'chrome' | 'browser' | null
  /** Available storage quota in bytes */
  storageQuota: number
  /** Maximum storage size in bytes */
  maxStorageSize: number
  /** List of supported storage backends */
  supportedBackends: StorageBackendType[]
}

/**
 * Schema definition for JSON provider table structure.
 *
 * @public
 */
export interface SchemaDefinition {
  [fieldName: string]: FieldDefinition
}

/**
 * Field definition for schema validation.
 *
 * @public
 */
export interface FieldDefinition {
  /** Field data type */
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array'
  /** Whether field is required */
  required?: boolean
  /** Default value if not provided */
  default?: StorageValue
  /** Custom validation function */
  validate?: (value: StorageValue) => boolean
  /** Whether to create an index on this field */
  index?: boolean
}

/**
 * Configuration options for creating a database instance.
 *
 * @example
 * ```typescript
 * const config: DatabaseConfig = {
 *   name: 'my-extension-db',
 *   provider: 'auto',
 *   version: 1,
 *   options: {
 *     autoSave: true,
 *     saveInterval: 5000
 *   }
 * };
 * ```
 *
 * @public
 */
export interface DatabaseConfig {
  /**
   * Unique database name per origin.
   * Must be a valid identifier (alphanumeric, hyphens, underscores).
   */
  name: string
  /**
   * Database schema version for handling migrations.
   * Increment when making breaking changes to data structure.
   * @defaultValue 1
   */
  version?: number
  /**
   * Storage provider selection.
   * - 'auto' - Automatically detect best available provider
   * - 'sqlite' - Force SQLite provider (WASM in Firefox, OPFS in Chrome)
   * - 'json' - Force JSON provider with IndexedDB storage
   */
  provider: DatabaseProviderType
  /** Force specific storage backend (overrides auto-detection) */
  backend?: StorageBackendType
  /** Provider-specific configuration options */
  options?: {
    /** SQLite options */
    /** URL to SQLite WASM file */
    wasmUrl?: string

    /** JSON options */
    /** Automatically save changes to storage */
    autoSave?: boolean
    /** Interval between auto-saves (milliseconds) */
    saveInterval?: number

    /** IndexedDB options */
    /** Object store names to create */
    objectStoreNames?: string[]

    /** Extension storage options */
    /** Storage area to use ('local', 'sync', 'managed') */
    area?: 'local' | 'sync' | 'managed'
  }
}

/**
 * Main database interface providing unified access to different storage providers.
 *
 * This is the primary interface for interacting with the database, regardless
 * of the underlying storage provider (SQLite, JSON, browser storage).
 *
 * @example
 * ```typescript
 * const db = await createDatabase({ name: 'mydb', provider: 'auto' });
 *
 * // Basic operations
 * await db.set('users', 'user1', { name: 'John', age: 30 });
 * const user = await db.get('users', 'user1');
 * await db.delete('users', 'user1');
 *
 * // Transactions
 * await db.transaction('readwrite', async (tx) => {
 *   await tx.set('users', 'user1', userData1);
 *   await tx.set('users', 'user2', userData2);
 * });
 * ```
 *
 * @public
 */
export interface IDatabase {
  /** Database name */
  readonly name: string
  /** Active provider type */
  readonly provider: DatabaseProviderType
  /** Active storage backend */
  readonly backend: StorageBackendType
  /** Whether database is ready for operations */
  readonly isReady: boolean

  /**
   * Initialize the database connection.
   * Must be called before any operations.
   */
  init(): Promise<void>

  /**
   * Close the database connection.
   * Flushes any pending operations.
   */
  close(): Promise<void>

  /**
   * Destroy the database and all its data.
   * This operation cannot be undone.
   */
  destroy(): Promise<void>

  /**
   * Execute operations within a transaction.
   *
   * @param mode - Transaction mode ('readonly' or 'readwrite')
   * @param callback - Function to execute within transaction
   * @returns Promise resolving to callback result
   */
  transaction<T>(
    mode: TransactionMode,
    callback: (tx: ITransaction) => Promise<T>,
  ): Promise<T>

  /**
   * Get a value from the database.
   *
   * @param table - Table name
   * @param key - Record key
   * @returns Promise resolving to stored value or undefined
   */
  get(table: string, key: string): Promise<StorageValue | undefined>

  /**
   * Store a value in the database.
   *
   * @param table - Table name
   * @param key - Record key
   * @param value - Value to store
   */
  set(table: string, key: string, value: StorageValue): Promise<void>

  /**
   * Delete a record from the database.
   *
   * @param table - Table name
   * @param key - Record key
   */
  delete(table: string, key: string): Promise<void>

  /**
   * Check if a record exists.
   *
   * @param table - Table name
   * @param key - Record key
   * @returns Promise resolving to true if record exists
   */
  exists(table: string, key: string): Promise<boolean>

  /**
   * Clear all records from a table.
   *
   * @param table - Table name
   */
  clear(table: string): Promise<void>

  /**
   * Find multiple records (JSON provider only).
   *
   * @param table - Table name
   * @param filter - Query filter
   * @param options - Query options
   * @returns Promise resolving to array of matching records
   */
  find?(
    table: string,
    filter?: QueryFilter,
    options?: QueryOptions,
  ): Promise<StorageValue[]>

  /**
   * Find a single record (JSON provider only).
   *
   * @param table - Table name
   * @param filter - Query filter
   * @returns Promise resolving to first matching record or undefined
   */
  findOne?(
    table: string,
    filter?: QueryFilter,
  ): Promise<StorageValue | undefined>

  /**
   * Count records matching filter (JSON provider only).
   *
   * @param table - Table name
   * @param filter - Query filter
   * @returns Promise resolving to record count
   */
  count?(table: string, filter?: QueryFilter): Promise<number>

  /**
   * Execute SQL query (SQLite provider only).
   *
   * @param sql - SQL query string
   * @param params - Query parameters
   * @returns Promise resolving to query results
   */
  query?(sql: string, params?: StorageValue[]): Promise<StorageValue[]>

  /**
   * Execute SQL statement (SQLite provider only).
   *
   * @param sql - SQL statement
   * @param params - Statement parameters
   */
  exec?(sql: string, params?: StorageValue[]): Promise<void>

  /**
   * Execute multiple operations atomically.
   *
   * @param operations - Array of batch operations
   */
  batch(operations: BatchOperation[]): Promise<void>

  /**
   * Create a new table.
   *
   * @param name - Table name
   * @param schema - Table schema (optional for JSON provider)
   */
  createTable(name: string, schema?: TableSchema): Promise<void>

  /**
   * Drop a table and all its data.
   *
   * @param name - Table name
   */
  dropTable(name: string): Promise<void>

  /**
   * List all table names.
   *
   * @returns Promise resolving to array of table names
   */
  listTables(): Promise<string[]>

  /**
   * Register event listener.
   *
   * @param event - Event name
   * @param callback - Event callback function
   */
  on(event: string, callback: DatabaseEventListener): void

  /**
   * Unregister event listener.
   *
   * @param event - Event name
   * @param callback - Event callback function
   */
  off(event: string, callback: DatabaseEventListener): void

  /**
   * Emit an event.
   *
   * @param event - Event name
   * @param args - Event arguments
   */
  emit(event: string, ...args: StorageValue[]): void
}

/**
 * Transaction interface for executing multiple operations atomically.
 *
 * @public
 */
export interface ITransaction {
  /** Transaction mode */
  readonly mode: TransactionMode
  /** Whether transaction is still active */
  readonly isActive: boolean

  /** Get a value within transaction */
  get(table: string, key: string): Promise<StorageValue | undefined>
  /** Set a value within transaction */
  set(table: string, key: string, value: StorageValue): Promise<void>
  /** Delete a record within transaction */
  delete(table: string, key: string): Promise<void>
  /** Check if record exists within transaction */
  exists(table: string, key: string): Promise<boolean>
  /** Clear table within transaction */
  clear(table: string): Promise<void>

  /** Commit the transaction */
  commit(): Promise<void>
  /** Rollback the transaction */
  rollback(): Promise<void>
}

/**
 * Batch operation types.
 *
 * @public
 */
export type BatchOperationType = 'set' | 'delete' | 'clear'

/**
 * Batch operation definition.
 *
 * @public
 */
export interface BatchOperation {
  /** Operation type */
  type: BatchOperationType
  /** Target table */
  table: string
  /** Record key (not used for 'clear' operations) */
  key?: string
  /** Value to set (only for 'set' operations) */
  value?: StorageValue
}

/**
 * Table schema definition for SQLite provider.
 *
 * @public
 */
export interface TableSchema {
  /** Column definitions */
  columns: { [columnName: string]: ColumnDefinition }
  /** Primary key column names */
  primaryKey?: string[]
  /** Index definitions */
  indexes?: IndexDefinition[]
}

/**
 * Column definition for SQLite tables.
 *
 * @public
 */
export interface ColumnDefinition {
  /** Column data type */
  type: 'TEXT' | 'INTEGER' | 'REAL' | 'BLOB' | 'JSON'
  /** Whether column can be null */
  nullable?: boolean
  /** Default value */
  defaultValue?: StorageValue
  /** Whether column values must be unique */
  unique?: boolean
}

/**
 * Index definition for SQLite tables.
 *
 * @public
 */
export interface IndexDefinition {
  /** Index name */
  name: string
  /** Columns to index */
  columns: string[]
  /** Whether index enforces uniqueness */
  unique?: boolean
}

// Provider registration
export interface ProviderRegistry {
  register(name: string, factory: DatabaseProviderFactory): void
  get(name: string): DatabaseProviderFactory | undefined
  list(): string[]
}

// Database provider interface
export interface DatabaseProvider {
  readonly type: DatabaseProviderType
  readonly backend: StorageBackendType
  readonly isConnected: boolean

  connect(config: DatabaseConfig): Promise<void>
  disconnect(): Promise<void>

  // Transaction support
  transaction<T>(
    tables: string[],
    mode: TransactionMode,
    callback: (tx: Transaction) => Promise<T>,
  ): Promise<T>

  // Table operations
  createTable(name: string, schema?: SchemaDefinition): Promise<void>
  dropTable(name: string): Promise<void>
  listTables(): Promise<string[]>

  // Basic operations
  get<T = StorageValue>(table: string, key: string): Promise<T | undefined>
  set<T = StorageValue>(table: string, key: string, value: T): Promise<void>
  delete(table: string, key: string): Promise<boolean>
  clear(table: string): Promise<void>

  // Batch operations
  getBatch<T = StorageValue>(
    table: string,
    keys: string[],
  ): Promise<{ [key: string]: T | undefined }>
  setBatch<T = StorageValue>(
    table: string,
    items: { [key: string]: T },
  ): Promise<void>
  deleteBatch(table: string, keys: string[]): Promise<number>

  // Query operations (mainly for JSON provider)
  find<T = StorageValue>(
    table: string,
    filter?: QueryFilter,
    options?: QueryOptions,
  ): Promise<{ key: string; value: T }[]>

  count(table: string, filter?: QueryFilter): Promise<number>

  // Utility operations
  size(table?: string): Promise<number>
  export(
    tables?: string[],
  ): Promise<{ [table: string]: { [key: string]: StorageValue } }>
  import(data: {
    [table: string]: { [key: string]: StorageValue }
  }): Promise<void>
}

export interface Transaction {
  readonly mode: TransactionMode
  readonly tables: string[]

  get<T = StorageValue>(table: string, key: string): Promise<T | undefined>
  set<T = StorageValue>(table: string, key: string, value: T): Promise<void>
  delete(table: string, key: string): Promise<boolean>

  // SQLite specific - execute raw SQL
  execute?(sql: string, params?: StorageValue[]): Promise<QueryResult>
}

export interface QueryResult {
  rows: StorageValue[][]
  columns: string[]
  rowsAffected: number
  lastInsertId?: number
}

export class WebExtensionDBError extends Error {
  constructor(
    message: string,
    public code: string,
    public provider?: DatabaseProviderType,
    public backend?: StorageBackendType,
  ) {
    super(message)
    this.name = 'WebExtensionDBError'
  }
}

export class ConfigurationError extends WebExtensionDBError {
  constructor(message: string, provider?: DatabaseProviderType) {
    super(message, 'CONFIGURATION_ERROR', provider)
    this.name = 'ConfigurationError'
  }
}

export class ConnectionError extends WebExtensionDBError {
  constructor(
    message: string,
    provider?: DatabaseProviderType,
    backend?: StorageBackendType,
  ) {
    super(message, 'CONNECTION_ERROR', provider, backend)
    this.name = 'ConnectionError'
  }
}

export class StorageQuotaError extends WebExtensionDBError {
  constructor(
    message: string,
    provider?: DatabaseProviderType,
    backend?: StorageBackendType,
  ) {
    super(message, 'STORAGE_QUOTA_ERROR', provider, backend)
    this.name = 'StorageQuotaError'
  }
}

export class TransactionError extends WebExtensionDBError {
  constructor(message: string, provider?: DatabaseProviderType) {
    super(message, 'TRANSACTION_ERROR', provider)
    this.name = 'TransactionError'
  }
}

export class ValidationError extends WebExtensionDBError {
  constructor(message: string, provider?: DatabaseProviderType) {
    super(message, 'VALIDATION_ERROR', provider)
    this.name = 'ValidationError'
  }
}

export interface DatabaseEvent {
  type: 'connected' | 'disconnected' | 'error' | 'storage-quota-warning'
  provider: DatabaseProviderType
  backend?: StorageBackendType
  data?: StorageValue
  error?: Error
}

export type DatabaseEventListener = (event: DatabaseEvent) => void

export interface Database {
  readonly config: DatabaseConfig
  readonly provider: DatabaseProvider
  readonly isConnected: boolean

  connect(): Promise<void>
  disconnect(): Promise<void>

  // Provider access
  useProvider(type: DatabaseProviderType): Promise<void>

  // Event handling
  on(event: string, listener: DatabaseEventListener): void
  off(event: string, listener: DatabaseEventListener): void

  // Delegate to provider
  transaction<T>(
    tables: string[],
    mode: TransactionMode,
    callback: (tx: Transaction) => Promise<T>,
  ): Promise<T>

  createTable(name: string, schema?: SchemaDefinition): Promise<void>
  dropTable(name: string): Promise<void>
  listTables(): Promise<string[]>

  get<T = StorageValue>(table: string, key: string): Promise<T | undefined>
  set<T = StorageValue>(table: string, key: string, value: T): Promise<void>
  delete(table: string, key: string): Promise<boolean>
  clear(table: string): Promise<void>

  getBatch<T = StorageValue>(
    table: string,
    keys: string[],
  ): Promise<{ [key: string]: T | undefined }>
  setBatch<T = StorageValue>(
    table: string,
    items: { [key: string]: T },
  ): Promise<void>
  deleteBatch(table: string, keys: string[]): Promise<number>

  find<T = StorageValue>(
    table: string,
    filter?: QueryFilter,
    options?: QueryOptions,
  ): Promise<{ key: string; value: T }[]>

  count(table: string, filter?: QueryFilter): Promise<number>
  size(table?: string): Promise<number>
  export(
    tables?: string[],
  ): Promise<{ [table: string]: { [key: string]: StorageValue } }>
  import(data: {
    [table: string]: { [key: string]: StorageValue }
  }): Promise<void>
}

// Factory function types
export type DatabaseProviderFactory = (
  config: DatabaseConfig,
) => Promise<IDatabase>

export interface DatabaseFactory {
  create(config: DatabaseConfig): Promise<Database>
  detectCapabilities(): Promise<BrowserCapabilities>
  getBestProvider(capabilities?: BrowserCapabilities): DatabaseProviderType
}
