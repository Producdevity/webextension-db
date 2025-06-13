// JSON Provider - Uses storage backends for document-style JSON storage

import {
  DatabaseConfig,
  IDatabase,
  BatchOperation,
  TransactionMode,
  ITransaction,
  DatabaseProviderType,
  StorageBackendType,
  StorageValue,
  QueryFilter,
  QueryOptions,
  TableSchema,
} from '../../types/index'
import { BaseStorage } from '../../storage/base-storage'
import { getBestStorageBackend } from '../../utils/browser-detection'
import { IndexedDBStorage } from '../../storage/indexeddb-storage'
import { ChromeStorage } from '../../storage/chrome-storage'
import { BrowserStorage } from '../../storage/browser-storage'

export class JsonProvider implements IDatabase {
  public readonly name: string
  public readonly provider: DatabaseProviderType = 'json'
  public readonly backend: StorageBackendType
  public isReady: boolean = false

  private storage: BaseStorage

  constructor(config: DatabaseConfig, capabilities: any) {
    this.name = config.name

    // Determine the best storage backend for JSON provider
    const backendChoice = config.backend || getBestStorageBackend('json')
    this.backend = backendChoice as StorageBackendType

    // Create the appropriate storage implementation
    switch (this.backend) {
      case 'chrome-storage':
        this.storage = new ChromeStorage(capabilities, {
          area: config.options?.area || 'local',
          keyPrefix: config.name,
        })
        break

      case 'browser-storage':
        this.storage = new BrowserStorage(capabilities, {
          area: config.options?.area || 'local',
          keyPrefix: config.name,
        })
        break

      case 'indexeddb':
      default:
        this.storage = new IndexedDBStorage(capabilities, {
          dbName: config.name,
          version: config.version || 1,
        })
        break
    }
  }

  async init(): Promise<void> {
    await this.storage.init()
    this.isReady = true
  }

  async close(): Promise<void> {
    await this.storage.close()
    this.isReady = false
  }

  async destroy(): Promise<void> {
    await this.storage.destroy()
    this.isReady = false
  }

  async transaction<T>(
    mode: TransactionMode,
    callback: (tx: ITransaction) => Promise<T>,
  ): Promise<T> {
    // Simple transaction implementation
    const tx = this.createTransactionWrapper(mode)
    return callback(tx)
  }

  async get(table: string, key: string): Promise<StorageValue | undefined> {
    const fullKey = `${table}:${key}`
    return this.storage.get(fullKey)
  }

  async set(table: string, key: string, value: StorageValue): Promise<void> {
    const fullKey = `${table}:${key}`
    await this.storage.set(fullKey, value)
  }

  async delete(table: string, key: string): Promise<void> {
    const fullKey = `${table}:${key}`
    await this.storage.delete(fullKey)
  }

  async exists(table: string, key: string): Promise<boolean> {
    const fullKey = `${table}:${key}`
    return this.storage.exists(fullKey)
  }

  async clear(table: string): Promise<void> {
    const allKeys = await this.storage.keys()
    const tableKeys = allKeys.filter((key) => key.startsWith(`${table}:`))

    if (tableKeys.length > 0) {
      await this.storage.deleteBatch(tableKeys)
    }
  }

  async batch(operations: BatchOperation[]): Promise<void> {
    const setBatch: { [key: string]: any } = {}
    const deleteKeys: string[] = []

    operations.forEach((op) => {
      const fullKey = `${op.table}:${op.key || ''}`

      switch (op.type) {
        case 'set':
          if (op.key && op.value !== undefined) {
            setBatch[fullKey] = op.value
          }
          break
        case 'delete':
          if (op.key) {
            deleteKeys.push(fullKey)
          }
          break
      }
    })

    const promises = []
    if (Object.keys(setBatch).length > 0) {
      promises.push(this.storage.setBatch(setBatch))
    }
    if (deleteKeys.length > 0) {
      promises.push(this.storage.deleteBatch(deleteKeys))
    }

    await Promise.all(promises)
  }

  async createTable(name: string, _schema?: TableSchema): Promise<void> {
    if (!name || typeof name !== 'string') {
      throw new Error('Invalid table name')
    }
  }

  async dropTable(name: string): Promise<void> {
    await this.clear(name)
  }

  async listTables(): Promise<string[]> {
    const allKeys = await this.storage.keys()
    const tableNames = new Set<string>()

    allKeys.forEach((key) => {
      const colonIndex = key.indexOf(':')
      if (colonIndex > 0) {
        tableNames.add(key.substring(0, colonIndex))
      }
    })

    return Array.from(tableNames)
  }

  // JSON Provider specific query methods
  async find(
    table: string,
    filter?: QueryFilter,
    options?: QueryOptions,
  ): Promise<any[]> {
    const allKeys = await this.storage.keys()
    const tableKeys = allKeys.filter((key) => key.startsWith(`${table}:`))
    let results: { key: string; value: any }[] = []

    for (const fullKey of tableKeys) {
      const value = await this.storage.get(fullKey)
      const key = fullKey.substring(table.length + 1)

      if (!filter || this.matchesFilter(value, filter)) {
        results.push({ key, value })
      }
    }

    // Apply options (sorting, limiting, etc.)
    if (options) {
      if (options.sort) {
        results.sort((a, b) => {
          for (const [field, direction] of Object.entries(options.sort!)) {
            const aVal = this.getNestedValue(a.value, field)
            const bVal = this.getNestedValue(b.value, field)

            if (aVal < bVal) return direction === 1 ? -1 : 1
            if (aVal > bVal) return direction === 1 ? 1 : -1
          }
          return 0
        })
      }

      if (options.skip) {
        results = results.slice(options.skip)
      }

      if (options.limit) {
        results = results.slice(0, options.limit)
      }
    }

    return results
  }

  async count(table: string, filter?: QueryFilter): Promise<number> {
    const results = await this.find(table, filter)
    return results.length
  }

  on(_event: string, _callback: (...args: any[]) => void): void {
    // TODO: Implement event handling
  }

  off(_event: string, _callback: (...args: any[]) => void): void {
    // TODO: Implement event handling
  }

  emit(_event: string, ..._args: any[]): void {
    // TODO: Implement event handling
  }

  private createTransactionWrapper(mode: TransactionMode): ITransaction {
    return {
      mode,
      isActive: true,

      get: async (table: string, key: string) => {
        const fullKey = `${table}:${key}`
        return this.storage.get(fullKey)
      },

      set: async (table: string, key: string, value: StorageValue) => {
        const fullKey = `${table}:${key}`
        await this.storage.set(fullKey, value)
      },

      delete: async (table: string, key: string) => {
        const fullKey = `${table}:${key}`
        await this.storage.delete(fullKey)
      },

      exists: async (table: string, key: string) => {
        const fullKey = `${table}:${key}`
        return this.storage.exists(fullKey)
      },

      clear: async (_table: string) => {
        throw new Error('Clear operation not supported in transactions')
      },

      commit: async () => {
        // Auto-committed for most storage backends
      },

      rollback: async () => {
        throw new Error('Rollback not supported')
      },
    }
  }

  private matchesFilter(value: any, filter: QueryFilter): boolean {
    // Simple filter matching - implement proper query logic here
    for (const [field, condition] of Object.entries(filter)) {
      const fieldValue = this.getNestedValue(value, field)

      if (
        typeof condition === 'object' &&
        condition !== null &&
        !Array.isArray(condition)
      ) {
        // Handle query operators
        if ('$eq' in condition && fieldValue !== condition.$eq) return false
        if ('$ne' in condition && fieldValue === condition.$ne) return false
        if (
          '$gt' in condition &&
          condition.$gt !== null &&
          fieldValue <= condition.$gt
        )
          return false
        if (
          '$gte' in condition &&
          condition.$gte !== null &&
          fieldValue < condition.$gte
        )
          return false
        if (
          '$lt' in condition &&
          condition.$lt !== null &&
          fieldValue >= condition.$lt
        )
          return false
        if (
          '$lte' in condition &&
          condition.$lte !== null &&
          fieldValue > condition.$lte
        )
          return false
        if (
          '$in' in condition &&
          Array.isArray(condition.$in) &&
          !condition.$in.includes(fieldValue)
        )
          return false
        if (
          '$nin' in condition &&
          Array.isArray(condition.$nin) &&
          condition.$nin.includes(fieldValue)
        )
          return false
        if ('$exists' in condition) {
          const exists = fieldValue !== undefined
          if (exists !== condition.$exists) return false
        }
      } else {
        // Direct value comparison
        if (fieldValue !== condition) return false
      }
    }

    return true
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current?.[key]
    }, obj)
  }
}
