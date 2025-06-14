/**
 * @fileoverview
 * WebExtension DB - Main entry point for unified database API for web extensions.
 *
 * This library provides a unified database interface that works across Chrome, Firefox,
 * and Safari web extensions, automatically selecting the best available storage provider
 * based on browser capabilities.
 *
 * @example
 * ```typescript
 * import { createDatabase } from 'webextension-db';
 *
 * const db = await createDatabase({
 *   name: 'my-extension-db',
 *   provider: 'auto',
 *   version: 1
 * });
 *
 * await db.set('users', 'user123', { name: 'John', email: 'john@example.com' });
 * const user = await db.get('users', 'user123');
 * ```
 *
 * @author WebExtension DB Contributors
 * @version 0.1.0
 * @since 1.0.0
 */

// Main exports
export * from './types/index'
export * from './utils/browser-detection'
export * from './storage/base-storage'
export * from './storage/indexeddb-storage'
export * from './storage/chrome-storage'
export * from './storage/browser-storage'
export * from './providers/json/JsonProvider'
export * from './providers/sql/SqlProvider'
// ORM exports (with renamed types to avoid conflicts)
export { ORM, Table, QueryBuilder } from './orm/index'
export type {
  ColumnDefinition as ORMColumnDefinition,
  TableSchema as ORMTableSchema,
  WhereCondition,
  OrderBy,
  QueryOptions as ORMQueryOptions,
  InsertData,
  UpdateData,
} from './orm/index'

// Core database functionality
import { DatabaseConfig, IDatabase } from './types/index'
import {
  detectBrowser,
  getBrowserCapabilities,
  getBestStorageBackend,
} from './utils/browser-detection'
import { JsonProvider } from './providers/json/JsonProvider'
import { SqlProvider } from './providers/sql/SqlProvider'

/**
 * Creates a new database instance with automatic provider detection.
 *
 * This is the main entry point for creating database connections. The function
 * automatically detects browser capabilities and selects the best available
 * storage provider unless explicitly specified.
 *
 * @param config - Database configuration options
 * @param config.name - Unique database name (must be valid identifier)
 * @param config.provider - Storage provider selection ('auto', 'sqlite', 'json', 'browser-storage')
 * @param config.version - Database schema version for migrations
 * @param config.options - Provider-specific configuration options
 *
 * @returns Promise that resolves to an IDatabase instance
 *
 * @throws {Error} When provider initialization fails
 * @throws {Error} When database name is invalid
 * @throws {Error} When unsupported provider is specified
 *
 * @example
 * ```typescript
 * // Auto-detect best provider
 * const db = await createDatabase({
 *   name: 'my-extension-db',
 *   provider: 'auto',
 *   version: 1
 * });
 *
 * // Force specific provider
 * const sqliteDb = await createDatabase({
 *   name: 'advanced-db',
 *   provider: 'sqlite',
 *   version: 2,
 *   options: { enableWAL: true }
 * });
 *
 * // JSON provider with custom options
 * const jsonDb = await createDatabase({
 *   name: 'simple-db',
 *   provider: 'json',
 *   options: { maxStorageSize: 100 * 1024 * 1024 } // 100MB
 * });
 * ```
 *
 * @see {@link IDatabase} for available database operations
 * @see {@link DatabaseConfig} for configuration options
 * @see {@link detectBrowser} for browser detection
 *
 * @since 1.0.0
 * @public
 */
export async function createDatabase(
  config: DatabaseConfig,
): Promise<IDatabase> {
  const capabilities = getBrowserCapabilities()

  // Determine the best provider if auto is specified
  let provider = config.provider
  if (provider === 'auto') {
    // Choose the best provider based on capabilities
    if (capabilities.hasIndexedDB) {
      provider = 'json' // Start with JSON provider for broader compatibility
    } else {
      provider = 'json' // Fallback to JSON with extension storage
    }
  }

  // Create the appropriate provider
  let database: IDatabase

  switch (provider) {
    case 'json':
      database = new JsonProvider(config, capabilities)
      break

    case 'sqlite':
      database = new SqlProvider(config, capabilities)
      break

    default:
      throw new Error(`Unsupported provider: ${provider}`)
  }

  // Initialize the provider
  await database.init()

  return database
}

// Legacy wrapper functions removed - providers implement IDatabase directly

/**
 * Browser detection and capability utilities.
 *
 * These functions help determine the current browser environment and available
 * storage capabilities, useful for conditional feature detection.
 *
 * @namespace BrowserUtils
 * @since 1.0.0
 * @public
 */
export { detectBrowser, getBrowserCapabilities, getBestStorageBackend }

/**
 * Current library version.
 *
 * @example
 * ```typescript
 * import { version } from 'webextension-db';
 * console.log(`Using WebExtension DB v${version}`);
 * ```
 *
 * @since 1.0.0
 * @public
 */
export const version = '0.1.0'
