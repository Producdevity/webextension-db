import { BaseStorage } from './base-storage'
import type {
  StorageBackendType,
  StorageValue,
  TransactionMode,
  BrowserCapabilities,
} from '../types/index'

type BrowserStorageArea = 'local' | 'sync' | 'managed'

declare const browser: any

export class BrowserStorage extends BaseStorage {
  readonly type: StorageBackendType = 'browser-storage'

  private area: BrowserStorageArea
  private storageAPI: any
  private keyPrefix: string

  constructor(
    capabilities: BrowserCapabilities,
    options: {
      area?: BrowserStorageArea
      keyPrefix?: string
    } = {},
  ) {
    super(capabilities)
    this.area = options.area || 'local'
    this.keyPrefix = options.keyPrefix || 'webext-db'

    if (!capabilities.hasBrowserStorage) {
      throw new Error('Browser storage API is not available')
    }

    // Get the appropriate storage area
    this.storageAPI = browser.storage[this.area]
    if (!this.storageAPI) {
      throw new Error(`Storage area '${this.area}' is not available`)
    }
  }

  async init(): Promise<void> {
    if (this._isReady) return

    // Test storage access
    try {
      await this.storageAPI.get({})
      this._isReady = true
    } catch (error) {
      throw new Error(`Failed to initialize browser storage: ${error}`)
    }
  }

  async close(): Promise<void> {
    this._isReady = false
  }

  async destroy(): Promise<void> {
    this.ensureReady()

    // Clear all keys with our prefix
    const keys = await this.keys()
    if (keys.length > 0) {
      const fullKeys = keys.map((key) => this.generateKey(this.keyPrefix, key))
      await this.storageAPI.remove(fullKeys)
    }

    this._isReady = false
  }

  async get(key: string): Promise<StorageValue | undefined> {
    this.ensureReady()

    const fullKey = this.generateKey(this.keyPrefix, key)
    const result = await this.storageAPI.get(fullKey)

    const serializedValue = result[fullKey]
    if (serializedValue === undefined) {
      return undefined
    } else {
      return this.deserializeValue(serializedValue)
    }
  }

  async set(key: string, value: StorageValue): Promise<void> {
    this.ensureReady()

    const fullKey = this.generateKey(this.keyPrefix, key)
    const serializedValue = this.serializeValue(value)

    await this.storageAPI.set({ [fullKey]: serializedValue })
  }

  async delete(key: string): Promise<void> {
    this.ensureReady()

    const fullKey = this.generateKey(this.keyPrefix, key)
    await this.storageAPI.remove([fullKey])
  }

  async exists(key: string): Promise<boolean> {
    const value = await this.get(key)
    return value !== undefined
  }

  async clear(): Promise<void> {
    this.ensureReady()

    // Get all keys with our prefix and remove them
    const keys = await this.keys()
    if (keys.length > 0) {
      const fullKeys = keys.map((key) => this.generateKey(this.keyPrefix, key))
      await this.storageAPI.remove(fullKeys)
    }
  }

  async size(): Promise<number> {
    const keys = await this.keys()
    return keys.length
  }

  async keys(): Promise<string[]> {
    this.ensureReady()

    const allItems = await this.storageAPI.get(null)
    const prefixedKeys = Object.keys(allItems).filter((key) =>
      key.startsWith(`${this.keyPrefix}:`),
    )

    const cleanKeys = prefixedKeys
      .map((key) => this.parseKey(key, this.keyPrefix))
      .filter((key): key is string => key !== null)

    return cleanKeys
  }

  async getStorageInfo(): Promise<{
    used: number
    available: number
    quota: number
  }> {
    // Firefox/Safari don't have getBytesInUse, estimate based on data
    try {
      const allItems = await this.storageAPI.get(null)
      const serializedData = JSON.stringify(allItems)
      const used = new Blob([serializedData]).size

      // Estimated quotas (these can vary)
      const quota =
        this.area === 'sync'
          ? 100 * 1024 // 100KB for sync
          : 5 * 1024 * 1024 // 5MB for local

      const available = quota - used

      return { used, available, quota }
    } catch (error) {
      // Fallback values
      return {
        used: 0,
        available: this.capabilities.maxStorageSize,
        quota: this.capabilities.maxStorageSize,
      }
    }
  }

  // Enhanced batch operations using promise-based API
  async getBatch(
    keys: string[],
  ): Promise<{ [key: string]: StorageValue | undefined }> {
    this.ensureReady()

    if (keys.length === 0) {
      return {}
    }

    const fullKeys = keys.map((key) => this.generateKey(this.keyPrefix, key))
    const result = await this.storageAPI.get(fullKeys)

    const output: { [key: string]: StorageValue | undefined } = {}
    keys.forEach((key) => {
      const fullKey = this.generateKey(this.keyPrefix, key)
      const serializedValue = result[fullKey]
      output[key] =
        serializedValue === undefined
          ? undefined
          : this.deserializeValue(serializedValue)
    })

    return output
  }

  async setBatch(items: { [key: string]: StorageValue }): Promise<void> {
    this.ensureReady()

    const entries = Object.entries(items)
    if (entries.length === 0) return

    const browserItems: { [key: string]: string } = {}
    entries.forEach(([key, value]) => {
      const fullKey = this.generateKey(this.keyPrefix, key)
      browserItems[fullKey] = this.serializeValue(value)
    })

    await this.storageAPI.set(browserItems)
  }

  async deleteBatch(keys: string[]): Promise<number> {
    this.ensureReady()

    if (keys.length === 0) return 0

    const fullKeys = keys.map((key) => this.generateKey(this.keyPrefix, key))
    await this.storageAPI.remove(fullKeys)

    return keys.length // Browser API doesn't provide count of actual deletions
  }

  // Storage change events
  onChanged(callback: (changes: { [key: string]: any }) => void): void {
    const listener = (changes: any, areaName: string) => {
      if (areaName === this.area) {
        // Filter changes to only include our prefixed keys
        const filteredChanges: { [key: string]: any } = {}

        Object.entries(changes).forEach(([fullKey, change]: [string, any]) => {
          const key = this.parseKey(fullKey, this.keyPrefix)
          if (key !== null) {
            // Deserialize the values in the change
            const deserializedChange = {
              ...change,
              oldValue: change.oldValue
                ? this.deserializeValue(change.oldValue)
                : undefined,
              newValue: change.newValue
                ? this.deserializeValue(change.newValue)
                : undefined,
            }
            filteredChanges[key] = deserializedChange
          }
        })

        if (Object.keys(filteredChanges).length > 0) {
          callback(filteredChanges)
        }
      }
    }

    browser.storage.onChanged.addListener(listener)
  }

  // Browser storage doesn't support transactions natively
  // We can implement a simple locking mechanism for critical sections
  private locks = new Map<string, Promise<void>>()

  async transaction<T>(
    _mode: TransactionMode,
    callback: (backend: BrowserStorage) => Promise<T>,
  ): Promise<T> {
    this.ensureReady()

    // Use a simple locking mechanism based on storage area
    const lockKey = `${this.area}-${this.keyPrefix}`

    // Wait for any existing lock to complete
    const existingLock = this.locks.get(lockKey)
    if (existingLock) {
      await existingLock
    }

    // Create new lock - convert result promise to void promise
    const resultPromise = this.executeLocked(callback)
    const lockPromise = resultPromise.then(() => void 0)
    this.locks.set(lockKey, lockPromise)

    try {
      const result = await resultPromise
      return result
    } finally {
      // Remove lock when done
      if (this.locks.get(lockKey) === lockPromise) {
        this.locks.delete(lockKey)
      }
    }
  }

  private async executeLocked<T>(
    callback: (backend: BrowserStorage) => Promise<T>,
  ): Promise<T> {
    return callback(this)
  }
}
