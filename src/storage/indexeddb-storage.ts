import { BaseStorage } from './base-storage'
import type {
  StorageBackendType,
  StorageValue,
  TransactionMode,
  BrowserCapabilities,
} from '../types/index'

export class IndexedDBStorage extends BaseStorage {
  readonly type: StorageBackendType = 'indexeddb'

  private db: IDBDatabase | null = null
  private dbName: string
  private storeName: string
  private version: number

  constructor(
    capabilities: BrowserCapabilities,
    options: {
      dbName: string
      storeName?: string
      version?: number
    },
  ) {
    super(capabilities)
    this.dbName = options.dbName
    this.storeName = options.storeName || 'keyvalue'
    this.version = options.version || 1
  }

  async init(): Promise<void> {
    if (this._isReady) return

    if (!this.capabilities.hasIndexedDB) {
      throw new Error('IndexedDB is not available in this environment')
    }

    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`))
      }

      request.onsuccess = () => {
        this.db = request.result
        this._isReady = true
        resolve()
      }

      request.onupgradeneeded = (_event) => {
        const db = request.result

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName)
        }
      }
    })
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close()
      this.db = null
    }
    this._isReady = false
  }

  async destroy(): Promise<void> {
    await this.close()

    return new Promise<void>((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(this.dbName)

      deleteRequest.onerror = () => {
        reject(
          new Error(
            `Failed to delete IndexedDB: ${deleteRequest.error?.message}`,
          ),
        )
      }

      deleteRequest.onsuccess = () => {
        resolve()
      }
    })
  }

  async get(key: string): Promise<StorageValue | undefined> {
    this.ensureReady()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise<StorageValue | undefined>((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.get(key)

      request.onerror = () => {
        reject(
          new Error(`Failed to get key "${key}": ${request.error?.message}`),
        )
      }

      request.onsuccess = () => {
        const value = request.result
        resolve(value === undefined ? undefined : this.deserializeValue(value))
      }
    })
  }

  async set(key: string, value: StorageValue): Promise<void> {
    this.ensureReady()
    if (!this.db) throw new Error('Database not initialized')

    const serializedValue = this.serializeValue(value)

    return new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.put(serializedValue, key)

      request.onerror = () => {
        reject(
          new Error(`Failed to set key "${key}": ${request.error?.message}`),
        )
      }

      request.onsuccess = () => {
        resolve()
      }
    })
  }

  async delete(key: string): Promise<void> {
    this.ensureReady()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.delete(key)

      request.onerror = () => {
        reject(
          new Error(`Failed to delete key "${key}": ${request.error?.message}`),
        )
      }

      request.onsuccess = () => {
        resolve()
      }
    })
  }

  async exists(key: string): Promise<boolean> {
    this.ensureReady()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise<boolean>((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.count(key)

      request.onerror = () => {
        reject(
          new Error(
            `Failed to check existence of key "${key}": ${request.error?.message}`,
          ),
        )
      }

      request.onsuccess = () => {
        resolve(request.result > 0)
      }
    })
  }

  async clear(): Promise<void> {
    this.ensureReady()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.clear()

      request.onerror = () => {
        reject(new Error(`Failed to clear store: ${request.error?.message}`))
      }

      request.onsuccess = () => {
        resolve()
      }
    })
  }

  async size(): Promise<number> {
    this.ensureReady()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise<number>((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.count()

      request.onerror = () => {
        reject(new Error(`Failed to get size: ${request.error?.message}`))
      }

      request.onsuccess = () => {
        resolve(request.result)
      }
    })
  }

  async keys(): Promise<string[]> {
    this.ensureReady()
    if (!this.db) throw new Error('Database not initialized')

    return new Promise<string[]>((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.getAllKeys()

      request.onerror = () => {
        reject(new Error(`Failed to get keys: ${request.error?.message}`))
      }

      request.onsuccess = () => {
        resolve(request.result.map((key) => String(key)))
      }
    })
  }

  async getStorageInfo(): Promise<{
    used: number
    available: number
    quota: number
  }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate()
        const used = estimate.usage || 0
        const quota = estimate.quota || 0
        const available = quota - used

        return { used, available, quota }
      } catch (error) {
        // Fallback if storage estimate fails
      }
    }

    // Fallback values
    return {
      used: 0,
      available: this.capabilities.maxStorageSize,
      quota: this.capabilities.maxStorageSize,
    }
  }

  // Enhanced batch operations for IndexedDB
  async getBatch(
    keys: string[],
  ): Promise<{ [key: string]: StorageValue | undefined }> {
    this.ensureReady()
    if (!this.db) throw new Error('Database not initialized')

    const result: { [key: string]: StorageValue | undefined } = {}

    return new Promise<{ [key: string]: StorageValue | undefined }>(
      (resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readonly')
        const store = transaction.objectStore(this.storeName)

        let completed = 0
        let hasError = false

        keys.forEach((key) => {
          const request = store.get(key)

          request.onerror = () => {
            if (!hasError) {
              hasError = true
              reject(
                new Error(
                  `Failed to get key "${key}": ${request.error?.message}`,
                ),
              )
            }
          }

          request.onsuccess = () => {
            if (!hasError) {
              const value = request.result
              result[key] =
                value === undefined ? undefined : this.deserializeValue(value)
              completed++

              if (completed === keys.length) {
                resolve(result)
              }
            }
          }
        })

        // Handle empty keys array
        if (keys.length === 0) {
          resolve(result)
        }
      },
    )
  }

  async setBatch(items: { [key: string]: StorageValue }): Promise<void> {
    this.ensureReady()
    if (!this.db) throw new Error('Database not initialized')

    const entries = Object.entries(items)
    if (entries.length === 0) return

    return new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)

      let completed = 0
      let hasError = false

      entries.forEach(([key, value]) => {
        const serializedValue = this.serializeValue(value)
        const request = store.put(serializedValue, key)

        request.onerror = () => {
          if (!hasError) {
            hasError = true
            reject(
              new Error(
                `Failed to set key "${key}": ${request.error?.message}`,
              ),
            )
          }
        }

        request.onsuccess = () => {
          if (!hasError) {
            completed++
            if (completed === entries.length) {
              resolve()
            }
          }
        }
      })
    })
  }

  async deleteBatch(keys: string[]): Promise<number> {
    this.ensureReady()
    if (!this.db) throw new Error('Database not initialized')

    if (keys.length === 0) return 0

    return new Promise<number>((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)

      let completed = 0
      let deletedCount = 0
      let hasError = false

      keys.forEach((key) => {
        const request = store.delete(key)

        request.onerror = () => {
          if (!hasError) {
            hasError = true
            reject(
              new Error(
                `Failed to delete key "${key}": ${request.error?.message}`,
              ),
            )
          }
        }

        request.onsuccess = () => {
          if (!hasError) {
            deletedCount++
            completed++
            if (completed === keys.length) {
              resolve(deletedCount)
            }
          }
        }
      })
    })
  }

  // Native IndexedDB transaction support
  async transaction<T>(
    mode: TransactionMode,
    callback: (backend: IndexedDBStorage) => Promise<T>,
  ): Promise<T> {
    this.ensureReady()
    if (!this.db) throw new Error('Database not initialized')

    const idbMode = mode === 'readwrite' ? 'readwrite' : 'readonly'
    const transaction = this.db.transaction([this.storeName], idbMode)

    return new Promise<T>((resolve, reject) => {
      transaction.onerror = () => {
        reject(new Error(`Transaction failed: ${transaction.error?.message}`))
      }

      transaction.oncomplete = () => {
        // Transaction completed successfully
      }

      // Execute the callback with this storage instance
      callback(this).then(resolve).catch(reject)
    })
  }
}
