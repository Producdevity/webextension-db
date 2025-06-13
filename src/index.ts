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
 * Create a database instance with automatic provider selection
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
 * Utility functions
 */
export { detectBrowser, getBrowserCapabilities, getBestStorageBackend }

/**
 * Version information
 */
export const version = '0.1.0'
