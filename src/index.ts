// Main exports
export * from './types/index.js'
export * from './utils/browser-detection.js'
export * from './storage/base-storage.js'
export * from './storage/indexeddb-storage.js'
export * from './storage/chrome-storage.js'
export * from './storage/browser-storage.js'
export * from './providers/json/JsonProvider.js'
export * from './providers/sql/SqlProvider.js'

// Core database functionality
import { DatabaseConfig, IDatabase } from './types/index.js'
import {
  detectBrowser,
  getBrowserCapabilities,
  getBestStorageBackend,
} from './utils/browser-detection.js'
import { JsonProvider } from './providers/json/JsonProvider.js'
import { SqlProvider } from './providers/sql/SqlProvider.js'

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
