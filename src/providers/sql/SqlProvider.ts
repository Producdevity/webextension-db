// SQL Provider - SQLite WASM with cross-browser compatibility and fallbacks
import {
  DatabaseConfig,
  IDatabase,
  BatchOperation,
  TransactionMode,
  ITransaction,
  DatabaseProviderType,
  StorageBackendType,
  StorageValue,
  TableSchema,
} from '../../types/index.js'
import { detectBrowser } from '../../utils/browser-detection.js'

// SQLite WASM imports - these will be available when wa-sqlite is installed
let SQLiteESMFactory: any
let SQLite: any
let IDBBatchAtomicVFS: any

// Fallback to JSON provider when SQLite is not available
let JsonProvider: any

interface SQLiteCapabilities {
  hasWASM: boolean
  hasIndexedDB: boolean
  hasOPFS: boolean
  hasSyncAccessHandle: boolean
  hasSharedArrayBuffer: boolean
  hasWorkers: boolean
  isServiceWorker: boolean
  isMainThread: boolean
  browserName: string
  browserVersion: string
  canUseSQLite: boolean
  recommendedBackend: StorageBackendType
  fallbackRequired: boolean
}

// Cross-browser capability detection
async function detectSQLiteCapabilities(): Promise<SQLiteCapabilities> {
  const browserType = detectBrowser()

  const hasWASM = typeof WebAssembly !== 'undefined'
  const hasIndexedDB = 'indexedDB' in globalThis
  const hasOPFS =
    'navigator' in globalThis &&
    'storage' in navigator &&
    'getDirectory' in navigator.storage
  const hasSyncAccessHandle =
    hasOPFS &&
    typeof FileSystemFileHandle !== 'undefined' &&
    'createSyncAccessHandle' in FileSystemFileHandle.prototype
  const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined'
  const hasWorkers = typeof Worker !== 'undefined'
  const isServiceWorker =
    typeof ServiceWorkerGlobalScope !== 'undefined' &&
    globalThis instanceof ServiceWorkerGlobalScope
  const isMainThread =
    typeof Window !== 'undefined' && globalThis instanceof Window

  // Safari-specific limitations
  const isSafari = browserType === 'safari'

  // Chrome extension limitations
  const isExtension =
    (typeof (globalThis as any).chrome !== 'undefined' &&
      (globalThis as any).chrome.runtime?.id) ||
    (typeof (globalThis as any).browser !== 'undefined' &&
      (globalThis as any).browser.runtime?.id)

  // Determine if SQLite can be used reliably
  let canUseSQLite = hasWASM && hasIndexedDB
  let recommendedBackend: StorageBackendType = 'indexeddb'
  let fallbackRequired = false

  // Safari version checks
  if (isSafari) {
    // Safari has known issues with SQLite WASM in extensions
    if (isExtension || isServiceWorker) {
      canUseSQLite = false
      fallbackRequired = true
    } else {
      // Use IndexedDB backend only for Safari
      recommendedBackend = 'indexeddb'
    }
  } else {
    // Chrome/Firefox - generally good support
    if (isExtension && isServiceWorker) {
      // Chrome extension service workers need special handling
      if (hasOPFS && hasSyncAccessHandle) {
        // Use OPFS if available, but may need offscreen documents
        recommendedBackend = 'opfs'
      } else {
        recommendedBackend = 'indexeddb'
      }
    } else if (hasOPFS && hasSyncAccessHandle && hasWorkers) {
      recommendedBackend = 'opfs'
    } else {
      recommendedBackend = 'indexeddb'
    }
  }

  // Final fallback check
  if (!canUseSQLite || (!hasIndexedDB && recommendedBackend === 'indexeddb')) {
    fallbackRequired = true
  }

  return {
    hasWASM,
    hasIndexedDB,
    hasOPFS,
    hasSyncAccessHandle,
    hasSharedArrayBuffer,
    hasWorkers,
    isServiceWorker,
    isMainThread,
    browserName: browserType,
    browserVersion: '16.0', // Conservative version string
    canUseSQLite,
    recommendedBackend,
    fallbackRequired,
  }
}

// Dynamic imports for optional dependencies with comprehensive error handling
async function loadSQLiteDependencies(): Promise<boolean> {
  try {
    // Check capabilities first
    const capabilities = await detectSQLiteCapabilities()

    if (capabilities.fallbackRequired || !capabilities.canUseSQLite) {
      console.info(
        `SQLite not available on ${capabilities.browserName} ${capabilities.browserVersion}, will use fallback`,
      )
      return false
    }

    // Try to load wa-sqlite
    const waModule = await import('wa-sqlite/dist/wa-sqlite-async.mjs')
    SQLiteESMFactory = waModule.default

    const apiModule = await import('wa-sqlite')
    SQLite = apiModule

    // Import VFS based on recommended backend
    if (
      capabilities.recommendedBackend === 'indexeddb' ||
      !capabilities.hasOPFS
    ) {
      const vfsModule = await import(
        'wa-sqlite/src/examples/IDBBatchAtomicVFS.js' as any
      )
      IDBBatchAtomicVFS = vfsModule.IDBBatchAtomicVFS
    }

    console.info(
      `SQLite loaded successfully for ${capabilities.browserName} with ${capabilities.recommendedBackend} backend`,
    )
    return true
  } catch (error) {
    console.warn(
      'wa-sqlite not available, falling back to JSON provider:',
      error,
    )
    return false
  }
}

// Load JSON provider as fallback
async function loadJsonProviderFallback(): Promise<boolean> {
  try {
    const { JsonProvider: JP } = await import('../json/JsonProvider.js')
    JsonProvider = JP
    return true
  } catch (error) {
    console.error('Failed to load JSON provider fallback:', error)
    return false
  }
}

interface SQLiteConnection {
  db: number
  sqlite3: any
  vfs?: any
}

class SqlTransaction implements ITransaction {
  public readonly mode: TransactionMode
  public readonly isActive: boolean = true
  private connection: SQLiteConnection
  private fallbackProvider: IDatabase | undefined

  constructor(
    connection: SQLiteConnection,
    mode: TransactionMode,
    fallbackProvider?: IDatabase,
  ) {
    this.connection = connection
    this.mode = mode
    this.fallbackProvider = fallbackProvider || undefined
  }

  async get(table: string, key: string): Promise<StorageValue | undefined> {
    if (!this.isActive) throw new Error('Transaction is no longer active')

    // Use fallback if SQLite connection is not available
    if (!this.connection && this.fallbackProvider) {
      return this.fallbackProvider.get(table, key)
    }

    const sql = `SELECT value FROM ${this.escapeIdentifier(table)} WHERE key = ?`
    const stmt = await this.connection.sqlite3.prepare_v2(
      this.connection.db,
      sql,
    )

    try {
      await this.connection.sqlite3.bind_text(stmt, 1, key)
      const result = await this.connection.sqlite3.step(stmt)

      if (result === SQLite.SQLITE_ROW) {
        const value = await this.connection.sqlite3.column_text(stmt, 0)
        return JSON.parse(value)
      }
      return undefined
    } finally {
      await this.connection.sqlite3.finalize(stmt)
    }
  }

  async set(table: string, key: string, value: StorageValue): Promise<void> {
    if (!this.isActive) throw new Error('Transaction is no longer active')

    // Use fallback if SQLite connection is not available
    if (!this.connection && this.fallbackProvider) {
      return this.fallbackProvider.set(table, key, value)
    }

    const sql = `INSERT OR REPLACE INTO ${this.escapeIdentifier(table)} (key, value) VALUES (?, ?)`
    const stmt = await this.connection.sqlite3.prepare_v2(
      this.connection.db,
      sql,
    )

    try {
      await this.connection.sqlite3.bind_text(stmt, 1, key)
      await this.connection.sqlite3.bind_text(stmt, 2, JSON.stringify(value))
      await this.connection.sqlite3.step(stmt)
    } finally {
      await this.connection.sqlite3.finalize(stmt)
    }
  }

  async delete(table: string, key: string): Promise<void> {
    if (!this.isActive) throw new Error('Transaction is no longer active')

    // Use fallback if SQLite connection is not available
    if (!this.connection && this.fallbackProvider) {
      return this.fallbackProvider.delete(table, key)
    }

    const sql = `DELETE FROM ${this.escapeIdentifier(table)} WHERE key = ?`
    const stmt = await this.connection.sqlite3.prepare_v2(
      this.connection.db,
      sql,
    )

    try {
      await this.connection.sqlite3.bind_text(stmt, 1, key)
      await this.connection.sqlite3.step(stmt)
    } finally {
      await this.connection.sqlite3.finalize(stmt)
    }
  }

  async exists(table: string, key: string): Promise<boolean> {
    if (!this.isActive) throw new Error('Transaction is no longer active')

    // Use fallback if SQLite connection is not available
    if (!this.connection && this.fallbackProvider) {
      return this.fallbackProvider.exists(table, key)
    }

    const sql = `SELECT 1 FROM ${this.escapeIdentifier(table)} WHERE key = ? LIMIT 1`
    const stmt = await this.connection.sqlite3.prepare_v2(
      this.connection.db,
      sql,
    )

    try {
      await this.connection.sqlite3.bind_text(stmt, 1, key)
      const result = await this.connection.sqlite3.step(stmt)
      return result === SQLite.SQLITE_ROW
    } finally {
      await this.connection.sqlite3.finalize(stmt)
    }
  }

  async clear(table: string): Promise<void> {
    if (!this.isActive) throw new Error('Transaction is no longer active')

    // Use fallback if SQLite connection is not available
    if (!this.connection && this.fallbackProvider) {
      return this.fallbackProvider.clear(table)
    }

    const sql = `DELETE FROM ${this.escapeIdentifier(table)}`
    await this.connection.sqlite3.exec(this.connection.db, sql)
  }

  // Helper method for batch operations (not part of ITransaction interface)
  async processBatch(operations: BatchOperation[]): Promise<void> {
    if (!this.isActive) throw new Error('Transaction is no longer active')

    // Use fallback if SQLite connection is not available
    if (!this.connection && this.fallbackProvider) {
      return this.fallbackProvider.batch(operations)
    }

    for (const op of operations) {
      switch (op.type) {
        case 'set':
          if (op.key && op.value !== undefined) {
            await this.set(op.table, op.key, op.value)
          }
          break
        case 'delete':
          if (op.key) {
            await this.delete(op.table, op.key)
          }
          break
        case 'clear':
          await this.clear(op.table)
          break
      }
    }
  }

  async commit(): Promise<void> {
    if (!this.isActive) throw new Error('Transaction is no longer active')

    // Use fallback if SQLite connection is not available
    if (!this.connection && this.fallbackProvider) {
      // JSON provider doesn't have explicit transactions, so this is a no-op
      ;(this as any).isActive = false
      return
    }

    await this.connection.sqlite3.exec(this.connection.db, 'COMMIT')
    // Note: We can't modify readonly property, so we cast to mutable
    ;(this as any).isActive = false
  }

  async rollback(): Promise<void> {
    if (!this.isActive) throw new Error('Transaction is no longer active')

    // Use fallback if SQLite connection is not available
    if (!this.connection && this.fallbackProvider) {
      // JSON provider doesn't have explicit transactions, so this is a no-op
      ;(this as any).isActive = false
      return
    }

    await this.connection.sqlite3.exec(this.connection.db, 'ROLLBACK')
    // Note: We can't modify readonly property, so we cast to mutable
    ;(this as any).isActive = false
  }

  private escapeIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`
  }
}

export class SqlProvider implements IDatabase {
  public readonly name: string
  public readonly provider: DatabaseProviderType = 'sqlite'
  public readonly backend: StorageBackendType
  public isReady: boolean = false

  private connection: SQLiteConnection | null = null
  private eventListeners: Map<string, Set<(...args: any[]) => void>> = new Map()
  private fallbackProvider: IDatabase | null = null
  private capabilities: SQLiteCapabilities | null = null
  private usingFallback: boolean = false

  constructor(config: DatabaseConfig, _capabilities: any) {
    this.name = config.name
    this.backend = config.backend || 'indexeddb' // Default to IndexedDB for SQLite
  }

  async init(): Promise<void> {
    if (this.isReady) return

    try {
      // Detect capabilities first
      this.capabilities = await detectSQLiteCapabilities()

      // Try to load SQLite dependencies
      const hasWaSqlite = await loadSQLiteDependencies()

      if (!hasWaSqlite || this.capabilities.fallbackRequired) {
        // Fall back to JSON provider
        console.info(
          `Falling back to JSON provider for ${this.capabilities?.browserName} ${this.capabilities?.browserVersion}`,
        )
        await this.initFallback()
        return
      }

      // Use the recommended backend from capability detection
      const actualBackend = this.capabilities.recommendedBackend

      if (actualBackend !== this.backend) {
        console.info(
          `Switching from ${this.backend} to ${actualBackend} backend based on browser capabilities`,
        )
        ;(this as any).backend = actualBackend
      }

      // Initialize SQLite with appropriate backend
      await this.initSQLite()
    } catch (error) {
      console.warn(
        'SQLite initialization failed, falling back to JSON provider:',
        error,
      )
      await this.initFallback()
    }
  }

  private async initFallback(): Promise<void> {
    const fallbackLoaded = await loadJsonProviderFallback()
    if (!fallbackLoaded) {
      throw new Error('Failed to load fallback JSON provider')
    }

    this.fallbackProvider = new JsonProvider(
      {
        name: this.name,
        provider: 'json' as DatabaseProviderType,
        backend: 'indexeddb', // JSON provider will handle its own backend selection
      },
      {},
    )

    await this.fallbackProvider!.init()
    this.usingFallback = true
    this.isReady = true

    this.emit('ready', { provider: 'json', fallback: true })
  }

  private async initSQLite(): Promise<void> {
    if (!SQLiteESMFactory || !SQLite) {
      throw new Error('SQLite dependencies not loaded')
    }

    // Initialize SQLite WASM
    const sqlite3 = await SQLiteESMFactory()
    let vfs: any = null

    try {
      // Configure VFS based on backend
      if (this.backend === 'indexeddb') {
        if (!IDBBatchAtomicVFS) {
          throw new Error('IDBBatchAtomicVFS not available')
        }

        vfs = new IDBBatchAtomicVFS(`${this.name}-sqlite`, {
          durability: 'relaxed', // Better performance for extensions
        })
        sqlite3.vfs_register(vfs, true)
      }
      // Note: OPFS support would go here for browsers that support it

      // Open database
      const db = await sqlite3.open_v2(
        this.name,
        SQLite.SQLITE_OPEN_READWRITE | SQLite.SQLITE_OPEN_CREATE,
        vfs?.name,
      )

      this.connection = { db, sqlite3, vfs }

      // Configure SQLite for better performance in browser extensions
      await sqlite3.exec(
        db,
        `
        PRAGMA journal_mode = MEMORY;
        PRAGMA synchronous = NORMAL;
        PRAGMA cache_size = -2000;
        PRAGMA temp_store = MEMORY;
        PRAGMA locking_mode = EXCLUSIVE;
      `,
      )

      this.isReady = true
      this.emit('ready', {
        provider: 'sqlite',
        backend: this.backend,
        browser: this.capabilities?.browserName,
        fallback: false,
      })
    } catch (error) {
      if (vfs) {
        try {
          sqlite3.vfs_unregister(vfs)
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      throw error
    }
  }

  async close(): Promise<void> {
    if (!this.connection) return

    try {
      await this.connection.sqlite3.close(this.connection.db)
      this.connection = null
      this.isReady = false
      this.emit('close')
    } catch (error) {
      console.warn('Error closing SQLite connection:', error)
    }
  }

  async destroy(): Promise<void> {
    await this.close()

    if (this.connection?.vfs) {
      try {
        // Clear VFS storage
        await this.connection.vfs.clear?.()
      } catch (error) {
        console.warn('Error clearing VFS storage:', error)
      }
    }

    this.emit('destroy')
  }

  async transaction<T>(
    mode: TransactionMode,
    callback: (tx: ITransaction) => Promise<T>,
  ): Promise<T> {
    // Use fallback if SQLite is not available
    if (this.usingFallback && this.fallbackProvider) {
      // JSON provider doesn't have explicit transactions, so just execute the callback
      const tx = new SqlTransaction(
        {} as SQLiteConnection,
        mode,
        this.fallbackProvider,
      )
      return callback(tx)
    }

    if (!this.connection) throw new Error('Database not initialized')

    const txMode = mode === 'readonly' ? 'DEFERRED' : 'IMMEDIATE'
    await this.connection.sqlite3.exec(this.connection.db, `BEGIN ${txMode}`)

    const tx = new SqlTransaction(this.connection, mode)

    try {
      const result = await callback(tx)
      await tx.commit()
      return result
    } catch (error) {
      await tx.rollback()
      throw error
    }
  }

  async get(table: string, key: string): Promise<StorageValue | undefined> {
    // Use fallback if SQLite is not available
    if (this.usingFallback && this.fallbackProvider) {
      return this.fallbackProvider.get(table, key)
    }

    if (!this.connection) throw new Error('Database not initialized')

    await this.ensureTable(table)

    const sql = `SELECT value FROM ${this.escapeIdentifier(table)} WHERE key = ?`
    const stmt = await this.connection.sqlite3.prepare_v2(
      this.connection.db,
      sql,
    )

    try {
      await this.connection.sqlite3.bind_text(stmt, 1, key)
      const result = await this.connection.sqlite3.step(stmt)

      if (result === SQLite.SQLITE_ROW) {
        const value = await this.connection.sqlite3.column_text(stmt, 0)
        return JSON.parse(value)
      }
      return undefined
    } finally {
      await this.connection.sqlite3.finalize(stmt)
    }
  }

  async set(table: string, key: string, value: StorageValue): Promise<void> {
    // Use fallback if SQLite is not available
    if (this.usingFallback && this.fallbackProvider) {
      return this.fallbackProvider.set(table, key, value)
    }

    if (!this.connection) throw new Error('Database not initialized')

    await this.ensureTable(table)

    const sql = `INSERT OR REPLACE INTO ${this.escapeIdentifier(table)} (key, value) VALUES (?, ?)`
    const stmt = await this.connection.sqlite3.prepare_v2(
      this.connection.db,
      sql,
    )

    try {
      await this.connection.sqlite3.bind_text(stmt, 1, key)
      await this.connection.sqlite3.bind_text(stmt, 2, JSON.stringify(value))
      await this.connection.sqlite3.step(stmt)
    } finally {
      await this.connection.sqlite3.finalize(stmt)
    }
  }

  async delete(table: string, key: string): Promise<void> {
    // Use fallback if SQLite is not available
    if (this.usingFallback && this.fallbackProvider) {
      return this.fallbackProvider.delete(table, key)
    }

    if (!this.connection) throw new Error('Database not initialized')

    await this.ensureTable(table)

    const sql = `DELETE FROM ${this.escapeIdentifier(table)} WHERE key = ?`
    const stmt = await this.connection.sqlite3.prepare_v2(
      this.connection.db,
      sql,
    )

    try {
      await this.connection.sqlite3.bind_text(stmt, 1, key)
      await this.connection.sqlite3.step(stmt)
    } finally {
      await this.connection.sqlite3.finalize(stmt)
    }
  }

  async exists(table: string, key: string): Promise<boolean> {
    // Use fallback if SQLite is not available
    if (this.usingFallback && this.fallbackProvider) {
      return this.fallbackProvider.exists(table, key)
    }

    if (!this.connection) throw new Error('Database not initialized')

    await this.ensureTable(table)

    const sql = `SELECT 1 FROM ${this.escapeIdentifier(table)} WHERE key = ? LIMIT 1`
    const stmt = await this.connection.sqlite3.prepare_v2(
      this.connection.db,
      sql,
    )

    try {
      await this.connection.sqlite3.bind_text(stmt, 1, key)
      const result = await this.connection.sqlite3.step(stmt)
      return result === SQLite.SQLITE_ROW
    } finally {
      await this.connection.sqlite3.finalize(stmt)
    }
  }

  async clear(table: string): Promise<void> {
    // Use fallback if SQLite is not available
    if (this.usingFallback && this.fallbackProvider) {
      return this.fallbackProvider.clear(table)
    }

    if (!this.connection) throw new Error('Database not initialized')

    await this.ensureTable(table)
    const sql = `DELETE FROM ${this.escapeIdentifier(table)}`
    await this.connection.sqlite3.exec(this.connection.db, sql)
  }

  async batch(operations: BatchOperation[]): Promise<void> {
    // Use fallback if SQLite is not available
    if (this.usingFallback && this.fallbackProvider) {
      return this.fallbackProvider.batch(operations)
    }

    if (!this.connection) throw new Error('Database not initialized')

    await this.transaction('readwrite', async (tx) => {
      await (tx as SqlTransaction).processBatch(operations)
    })
  }

  async createTable(name: string, schema?: TableSchema): Promise<void> {
    // Use fallback if SQLite is not available
    if (this.usingFallback && this.fallbackProvider) {
      // JSON provider doesn't need explicit table creation
      return
    }

    if (!this.connection) throw new Error('Database not initialized')

    let sql: string

    if (schema) {
      // Create table with custom schema
      const columns = Object.entries(schema.columns)
        .map(
          ([name, def]) =>
            `${this.escapeIdentifier(name)} ${def.type || 'TEXT'}`,
        )
        .join(', ')

      sql = `CREATE TABLE IF NOT EXISTS ${this.escapeIdentifier(name)} (${columns})`

      if (schema.primaryKey) {
        sql += `, PRIMARY KEY (${schema.primaryKey.map((k) => this.escapeIdentifier(k)).join(', ')})`
      }
    } else {
      // Default key-value table
      sql = `CREATE TABLE IF NOT EXISTS ${this.escapeIdentifier(name)} (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`
    }

    await this.connection.sqlite3.exec(this.connection.db, sql)
  }

  async dropTable(name: string): Promise<void> {
    // Use fallback if SQLite is not available
    if (this.usingFallback && this.fallbackProvider) {
      // JSON provider doesn't need explicit table dropping
      return
    }

    if (!this.connection) throw new Error('Database not initialized')

    const sql = `DROP TABLE IF EXISTS ${this.escapeIdentifier(name)}`
    await this.connection.sqlite3.exec(this.connection.db, sql)
  }

  async listTables(): Promise<string[]> {
    // Use fallback if SQLite is not available
    if (this.usingFallback && this.fallbackProvider) {
      // JSON provider doesn't have explicit tables, return empty array
      return []
    }

    if (!this.connection) throw new Error('Database not initialized')

    const sql = `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
    const stmt = await this.connection.sqlite3.prepare_v2(
      this.connection.db,
      sql,
    )

    const tables: string[] = []
    try {
      while ((await this.connection.sqlite3.step(stmt)) === SQLite.SQLITE_ROW) {
        const tableName = await this.connection.sqlite3.column_text(stmt, 0)
        if (tableName) {
          tables.push(tableName)
        }
      }
    } finally {
      await this.connection.sqlite3.finalize(stmt)
    }

    return tables
  }

  // SQL Provider specific methods
  async query(sql: string, params?: any[]): Promise<any[]> {
    // Use fallback if SQLite is not available
    if (this.usingFallback && this.fallbackProvider) {
      throw new Error('Raw SQL queries not supported in fallback mode')
    }

    if (!this.connection) throw new Error('Database not initialized')

    const stmt = await this.connection.sqlite3.prepare_v2(
      this.connection.db,
      sql,
    )
    const results: any[] = []

    try {
      // Bind parameters if provided
      if (params && params.length > 0) {
        for (let i = 0; i < params.length; i++) {
          const param = params[i]
          if (param === null || param === undefined) {
            await this.connection.sqlite3.bind_null(stmt, i + 1)
          } else if (typeof param === 'number') {
            if (Number.isInteger(param)) {
              await this.connection.sqlite3.bind_int(stmt, i + 1, param)
            } else {
              await this.connection.sqlite3.bind_double(stmt, i + 1, param)
            }
          } else if (typeof param === 'string') {
            await this.connection.sqlite3.bind_text(stmt, i + 1, param)
          } else {
            // For objects, arrays, etc., serialize as JSON
            if (param === null || param === undefined) {
              await this.connection.sqlite3.bind_null(stmt, i + 1)
            } else {
              await this.connection.sqlite3.bind_text(
                stmt,
                i + 1,
                JSON.stringify(param),
              )
            }
          }
        }
      }

      // Execute and collect results
      const columnCount = await this.connection.sqlite3.column_count(stmt)
      while ((await this.connection.sqlite3.step(stmt)) === SQLite.SQLITE_ROW) {
        const row: any = {}
        for (let i = 0; i < columnCount; i++) {
          const columnName = await this.connection.sqlite3.column_name(stmt, i)
          const columnType = await this.connection.sqlite3.column_type(stmt, i)

          let value: any
          switch (columnType) {
            case SQLite.SQLITE_INTEGER:
              value = await this.connection.sqlite3.column_int(stmt, i)
              break
            case SQLite.SQLITE_FLOAT:
              value = await this.connection.sqlite3.column_double(stmt, i)
              break
            case SQLite.SQLITE_TEXT:
              value = await this.connection.sqlite3.column_text(stmt, i)
              break
            case SQLite.SQLITE_BLOB:
              value = await this.connection.sqlite3.column_blob(stmt, i)
              break
            case SQLite.SQLITE_NULL:
              value = null
              break
            default:
              value = await this.connection.sqlite3.column_text(stmt, i)
          }

          row[columnName] = value
        }
        results.push(row)
      }
    } finally {
      await this.connection.sqlite3.finalize(stmt)
    }

    return results
  }

  async exec(sql: string, params?: any[]): Promise<void> {
    // Use fallback if SQLite is not available
    if (this.usingFallback && this.fallbackProvider) {
      throw new Error('Raw SQL execution not supported in fallback mode')
    }

    if (!this.connection) throw new Error('Database not initialized')

    if (params && params.length > 0) {
      // Use prepared statement for parameterized queries
      const stmt = await this.connection.sqlite3.prepare_v2(
        this.connection.db,
        sql,
      )

      try {
        // Bind parameters
        for (let i = 0; i < params.length; i++) {
          const param = params[i]
          if (param === null || param === undefined) {
            await this.connection.sqlite3.bind_null(stmt, i + 1)
          } else if (typeof param === 'number') {
            if (Number.isInteger(param)) {
              await this.connection.sqlite3.bind_int(stmt, i + 1, param)
            } else {
              await this.connection.sqlite3.bind_double(stmt, i + 1, param)
            }
          } else if (typeof param === 'string') {
            await this.connection.sqlite3.bind_text(stmt, i + 1, param)
          } else {
            // For objects, arrays, etc., serialize as JSON
            if (param === null || param === undefined) {
              await this.connection.sqlite3.bind_null(stmt, i + 1)
            } else {
              await this.connection.sqlite3.bind_text(
                stmt,
                i + 1,
                JSON.stringify(param),
              )
            }
          }
        }

        await this.connection.sqlite3.step(stmt)
      } finally {
        await this.connection.sqlite3.finalize(stmt)
      }
    } else {
      // Execute simple SQL without parameters
      await this.connection.sqlite3.exec(this.connection.db, sql)
    }
  }

  // Event handling
  on(event: string, callback: (...args: any[]) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event)!.add(callback)
  }

  off(event: string, callback: (...args: any[]) => void): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.delete(callback)
    }
  }

  emit(event: string, ...args: any[]): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(...args)
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error)
        }
      })
    }
  }

  // Helper methods
  private async ensureTable(tableName: string): Promise<void> {
    // Skip table creation for fallback provider
    if (this.usingFallback) return

    await this.createTable(tableName)
  }

  private escapeIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`
  }
}
