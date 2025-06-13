// Core database provider types
export type DatabaseProviderType = 'sqlite' | 'json' | 'auto'

// Browser detection types
export type BrowserType = 'chrome' | 'firefox' | 'safari' | 'unknown'

// Storage backend types
export type StorageBackendType =
  | 'opfs'
  | 'indexeddb'
  | 'chrome-storage'
  | 'browser-storage'
  | 'localstorage'

// Generic value types that can be stored
export type StorageValue =
  | string
  | number
  | boolean
  | null
  | Date
  | StorageValue[]
  | { [key: string]: StorageValue }

// Transaction types
export type TransactionMode = 'readonly' | 'readwrite'

// Query types for JSON provider
export interface QueryFilter {
  [key: string]: StorageValue | QueryOperator
}

export interface QueryOperator {
  $eq?: StorageValue
  $ne?: StorageValue
  $gt?: number | string | Date
  $gte?: number | string | Date
  $lt?: number | string | Date
  $lte?: number | string | Date
  $in?: StorageValue[]
  $nin?: StorageValue[]
  $regex?: string
  $exists?: boolean
}

export interface QueryOptions {
  limit?: number
  skip?: number
  sort?: { [key: string]: 1 | -1 }
}

// Browser capabilities interface
export interface BrowserCapabilities {
  browser: BrowserType
  hasIndexedDB: boolean
  hasOPFS: boolean
  hasWebWorkers: boolean
  hasSharedArrayBuffer: boolean
  hasOffscreenCanvas: boolean
  hasChromeStorage: boolean
  hasBrowserStorage: boolean
  supportsWASM: boolean
  extensionAPI: 'chrome' | 'browser' | null
  storageQuota: number
  maxStorageSize: number
  supportedBackends: StorageBackendType[]
}

// Schema definition for JSON provider
export interface SchemaDefinition {
  [fieldName: string]: FieldDefinition
}

export interface FieldDefinition {
  type: 'string' | 'number' | 'boolean' | 'date' | 'object' | 'array'
  required?: boolean
  default?: StorageValue
  validate?: (value: StorageValue) => boolean
  index?: boolean
}

// Database configuration
export interface DatabaseConfig {
  name: string
  version?: number
  provider: DatabaseProviderType
  backend?: StorageBackendType
  options?: {
    // SQLite options
    wasmUrl?: string

    // JSON options
    autoSave?: boolean
    saveInterval?: number

    // IndexedDB options
    objectStoreNames?: string[]

    // Extension storage options
    area?: 'local' | 'sync' | 'managed'
  }
}

// Database instance interface
export interface IDatabase {
  readonly name: string
  readonly provider: DatabaseProviderType
  readonly backend: StorageBackendType
  readonly isReady: boolean

  // Lifecycle
  init(): Promise<void>
  close(): Promise<void>
  destroy(): Promise<void>

  // Transaction management
  transaction<T>(
    mode: TransactionMode,
    callback: (tx: ITransaction) => Promise<T>,
  ): Promise<T>

  // Direct operations (auto-wrapped in transactions)
  get(table: string, key: string): Promise<StorageValue | undefined>
  set(table: string, key: string, value: StorageValue): Promise<void>
  delete(table: string, key: string): Promise<void>
  exists(table: string, key: string): Promise<boolean>
  clear(table: string): Promise<void>

  // Query operations (JSON provider only)
  find?(
    table: string,
    filter?: QueryFilter,
    options?: QueryOptions,
  ): Promise<any[]>
  findOne?(table: string, filter?: QueryFilter): Promise<any | undefined>
  count?(table: string, filter?: QueryFilter): Promise<number>

  // SQL operations (SQLite provider only)
  query?(sql: string, params?: any[]): Promise<any[]>
  exec?(sql: string, params?: any[]): Promise<void>

  // Batch operations
  batch(operations: BatchOperation[]): Promise<void>

  // Table management
  createTable(name: string, schema?: TableSchema): Promise<void>
  dropTable(name: string): Promise<void>
  listTables(): Promise<string[]>

  // Events
  on(event: string, callback: Function): void
  off(event: string, callback: Function): void
  emit(event: string, ...args: any[]): void
}

// Transaction interface
export interface ITransaction {
  readonly mode: TransactionMode
  readonly isActive: boolean

  get(table: string, key: string): Promise<StorageValue | undefined>
  set(table: string, key: string, value: StorageValue): Promise<void>
  delete(table: string, key: string): Promise<void>
  exists(table: string, key: string): Promise<boolean>
  clear(table: string): Promise<void>

  commit(): Promise<void>
  rollback(): Promise<void>
}

// Batch operation types
export type BatchOperationType = 'set' | 'delete' | 'clear'

export interface BatchOperation {
  type: BatchOperationType
  table: string
  key?: string
  value?: StorageValue
}

// Table schema for SQLite
export interface TableSchema {
  columns: { [columnName: string]: ColumnDefinition }
  primaryKey?: string[]
  indexes?: IndexDefinition[]
}

export interface ColumnDefinition {
  type: 'TEXT' | 'INTEGER' | 'REAL' | 'BLOB' | 'JSON'
  nullable?: boolean
  defaultValue?: StorageValue
  unique?: boolean
}

export interface IndexDefinition {
  name: string
  columns: string[]
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
  data?: any
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
