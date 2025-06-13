import { BaseStorage } from './base-storage'
import {
  StorageBackendType,
  StorageValue,
  TransactionMode,
  BrowserCapabilities,
} from '../types/index'

type ChromeStorageArea = 'local' | 'sync' | 'managed'

declare const chrome: any

export class ChromeStorage extends BaseStorage {
  readonly type: StorageBackendType = 'chrome-storage'

  private area: ChromeStorageArea
  private storageAPI: any // Chrome extension storage API uses callbacks, not promises
  private keyPrefix: string

  constructor(
    capabilities: BrowserCapabilities,
    options: {
      area?: ChromeStorageArea
      keyPrefix?: string
    } = {},
  ) {
    super(capabilities)
    this.area = options.area || 'local'
    this.keyPrefix = options.keyPrefix || 'webext-db'

    if (!capabilities.hasChromeStorage) {
      throw new Error('Chrome storage API is not available')
    }

    // Get the appropriate storage area
    switch (this.area) {
      case 'local':
        this.storageAPI = chrome.storage.local
        break
      case 'sync':
        this.storageAPI = chrome.storage.sync
        break
      case 'managed':
        this.storageAPI = chrome.storage.managed
        break
      default:
        throw new Error(`Invalid storage area: ${this.area}`)
    }
  }

  async init(): Promise<void> {
    if (this._isReady) return

    // Test storage access
    try {
      await this.storageAPI.get(null)
      this._isReady = true
    } catch (error) {
      throw new Error(`Failed to initialize Chrome storage: ${error}`)
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
      await new Promise<void>((resolve, reject) => {
        this.storageAPI.remove(fullKeys, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
          } else {
            resolve()
          }
        })
      })
    }

    this._isReady = false
  }

  async get(key: string): Promise<StorageValue | undefined> {
    this.ensureReady()

    const fullKey = this.generateKey(this.keyPrefix, key)

    return new Promise<StorageValue | undefined>((resolve, reject) => {
      this.storageAPI.get([fullKey], (result: any) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          const serializedValue = result[fullKey]
          if (serializedValue === undefined) {
            resolve(undefined)
          } else {
            resolve(this.deserializeValue(serializedValue))
          }
        }
      })
    })
  }

  async set(key: string, value: StorageValue): Promise<void> {
    this.ensureReady()

    const fullKey = this.generateKey(this.keyPrefix, key)
    const serializedValue = this.serializeValue(value)

    return new Promise<void>((resolve, reject) => {
      this.storageAPI.set({ [fullKey]: serializedValue }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          resolve()
        }
      })
    })
  }

  async delete(key: string): Promise<void> {
    this.ensureReady()

    const fullKey = this.generateKey(this.keyPrefix, key)

    return new Promise<void>((resolve, reject) => {
      this.storageAPI.remove([fullKey], () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          resolve()
        }
      })
    })
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
      return new Promise<void>((resolve, reject) => {
        this.storageAPI.remove(fullKeys, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
          } else {
            resolve()
          }
        })
      })
    }
  }

  async size(): Promise<number> {
    const keys = await this.keys()
    return keys.length
  }

  async keys(): Promise<string[]> {
    this.ensureReady()

    return new Promise<string[]>((resolve, reject) => {
      this.storageAPI.get(null, (allItems: any) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          const prefixedKeys = Object.keys(allItems).filter((key) =>
            key.startsWith(`${this.keyPrefix}:`),
          )

          const cleanKeys = prefixedKeys
            .map((key) => this.parseKey(key, this.keyPrefix))
            .filter((key): key is string => key !== null)

          resolve(cleanKeys)
        }
      })
    })
  }

  async getStorageInfo(): Promise<{
    used: number
    available: number
    quota: number
  }> {
    return new Promise<{
      used: number
      available: number
      quota: number
    }>((resolve, reject) => {
      this.storageAPI.getBytesInUse(null, (bytesInUse: any) => {
        if ((globalThis as any).chrome.runtime.lastError) {
          reject(
            new Error((globalThis as any).chrome.runtime.lastError.message),
          )
        } else {
          // Chrome storage quotas
          const quota =
            this.area === 'sync'
              ? 102400 // 100KB for sync storage
              : 5242880 // 5MB for local storage (unlimited with permission)

          const used = bytesInUse
          const available = quota - used

          resolve({ used, available, quota })
        }
      })
    })
  }

  // Enhanced batch operations for Chrome storage
  async getBatch(
    keys: string[],
  ): Promise<{ [key: string]: StorageValue | undefined }> {
    this.ensureReady()

    if (keys.length === 0) {
      return {}
    }

    const fullKeys = keys.map((key) => this.generateKey(this.keyPrefix, key))

    return new Promise<{ [key: string]: StorageValue | undefined }>(
      (resolve, reject) => {
        this.storageAPI.get(fullKeys, (result: any) => {
          if ((globalThis as any).chrome.runtime.lastError) {
            reject(
              new Error((globalThis as any).chrome.runtime.lastError.message),
            )
          } else {
            const output: { [key: string]: StorageValue | undefined } = {}

            keys.forEach((key) => {
              const fullKey = this.generateKey(this.keyPrefix, key)
              const serializedValue = result[fullKey]
              output[key] =
                serializedValue === undefined
                  ? undefined
                  : this.deserializeValue(serializedValue)
            })

            resolve(output)
          }
        })
      },
    )
  }

  async setBatch(items: { [key: string]: StorageValue }): Promise<void> {
    this.ensureReady()

    const entries = Object.entries(items)
    if (entries.length === 0) return

    const chromeItems: { [key: string]: string } = {}
    entries.forEach(([key, value]) => {
      const fullKey = this.generateKey(this.keyPrefix, key)
      chromeItems[fullKey] = this.serializeValue(value)
    })

    return new Promise<void>((resolve, reject) => {
      this.storageAPI.set(chromeItems, () => {
        if ((globalThis as any).chrome.runtime.lastError) {
          reject(
            new Error((globalThis as any).chrome.runtime.lastError.message),
          )
        } else {
          resolve()
        }
      })
    })
  }

  async deleteBatch(keys: string[]): Promise<number> {
    this.ensureReady()

    if (keys.length === 0) return 0

    const fullKeys = keys.map((key) => this.generateKey(this.keyPrefix, key))

    return new Promise<number>((resolve, reject) => {
      this.storageAPI.remove(fullKeys, () => {
        if ((globalThis as any).chrome.runtime.lastError) {
          reject(
            new Error((globalThis as any).chrome.runtime.lastError.message),
          )
        } else {
          resolve(keys.length) // Chrome doesn't provide count of actual deletions
        }
      })
    })
  }

  // Storage change events
  onChanged(callback: (changes: { [key: string]: any }) => void): void {
    const listener = (changes: { [key: string]: any }, areaName: string) => {
      if (areaName === this.area) {
        // Filter changes to only include our prefixed keys
        const filteredChanges: { [key: string]: any } = {}

        Object.entries(changes).forEach(([fullKey, change]) => {
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

    ;(globalThis as any).chrome.storage.onChanged.addListener(listener)
  }

  // Chrome storage doesn't support transactions natively
  // We can implement a simple locking mechanism for critical sections
  private locks = new Map<string, Promise<any>>()

  async transaction<T>(
    _mode: TransactionMode,
    callback: (backend: ChromeStorage) => Promise<T>,
  ): Promise<T> {
    this.ensureReady()

    // Use a simple locking mechanism based on storage area
    const lockKey = `${this.area}-${this.keyPrefix}`

    // Wait for any existing lock to complete
    const existingLock = this.locks.get(lockKey)
    if (existingLock) {
      await existingLock
    }

    // Create new lock
    const lockPromise = this.executeLocked(callback)
    this.locks.set(lockKey, lockPromise)

    try {
      const result = await lockPromise
      return result
    } finally {
      // Remove lock when done
      if (this.locks.get(lockKey) === lockPromise) {
        this.locks.delete(lockKey)
      }
    }
  }

  private async executeLocked<T>(
    callback: (backend: ChromeStorage) => Promise<T>,
  ): Promise<T> {
    return callback(this)
  }
}
