import type {
  StorageBackendType,
  StorageValue,
  TransactionMode,
  BrowserCapabilities,
} from '../types/index.js'

export interface StorageBackend {
  readonly type: StorageBackendType
  readonly isReady: boolean
  readonly capabilities: BrowserCapabilities

  // Lifecycle
  init(): Promise<void>
  close(): Promise<void>
  destroy(): Promise<void>

  // Basic operations
  get(key: string): Promise<StorageValue | undefined>
  set(key: string, value: StorageValue): Promise<void>
  delete(key: string): Promise<void>
  exists(key: string): Promise<boolean>
  clear(): Promise<void>

  // Batch operations
  getBatch(keys: string[]): Promise<{ [key: string]: StorageValue | undefined }>
  setBatch(items: { [key: string]: StorageValue }): Promise<void>
  deleteBatch(keys: string[]): Promise<number>

  // Metadata
  size(): Promise<number>
  keys(): Promise<string[]>

  // Transactions (if supported)
  transaction?<T>(
    mode: TransactionMode,
    callback: (backend: StorageBackend) => Promise<T>,
  ): Promise<T>

  // Storage-specific operations
  getStorageInfo(): Promise<{
    used: number
    available: number
    quota: number
  }>
}

export abstract class BaseStorage implements StorageBackend {
  abstract readonly type: StorageBackendType
  protected _isReady: boolean = false
  protected _capabilities: BrowserCapabilities

  constructor(capabilities: BrowserCapabilities) {
    this._capabilities = capabilities
  }

  get isReady(): boolean {
    return this._isReady
  }

  get capabilities(): BrowserCapabilities {
    return this._capabilities
  }

  // Abstract methods that must be implemented
  abstract init(): Promise<void>
  abstract close(): Promise<void>
  abstract destroy(): Promise<void>

  abstract get(key: string): Promise<StorageValue | undefined>
  abstract set(key: string, value: StorageValue): Promise<void>
  abstract delete(key: string): Promise<void>
  abstract exists(key: string): Promise<boolean>
  abstract clear(): Promise<void>

  abstract size(): Promise<number>
  abstract keys(): Promise<string[]>
  abstract getStorageInfo(): Promise<{
    used: number
    available: number
    quota: number
  }>

  // Default implementations for batch operations
  async getBatch(
    keys: string[],
  ): Promise<{ [key: string]: StorageValue | undefined }> {
    const result: { [key: string]: StorageValue | undefined } = {}

    // Use Promise.allSettled to handle partial failures
    const results = await Promise.allSettled(
      keys.map((key) => this.get(key).then((value) => ({ key, value }))),
    )

    results.forEach((promiseResult, index) => {
      const key = keys[index]
      if (key && promiseResult.status === 'fulfilled') {
        result[key] = promiseResult.value.value
      } else if (key) {
        result[key] = undefined
      }
    })

    return result
  }

  async setBatch(items: { [key: string]: StorageValue }): Promise<void> {
    const operations = Object.entries(items).map(([key, value]) =>
      this.set(key, value),
    )

    await Promise.all(operations)
  }

  async deleteBatch(keys: string[]): Promise<number> {
    const results = await Promise.allSettled(
      keys.map((key) => this.delete(key)),
    )

    return results.filter((result) => result.status === 'fulfilled').length
  }

  // Utility methods
  protected ensureReady(): void {
    if (!this._isReady) {
      throw new Error(
        `Storage backend ${this.type} is not ready. Call init() first.`,
      )
    }
  }

  protected serializeValue(value: StorageValue): string {
    if (value === null || value === undefined) {
      return JSON.stringify(value)
    }

    if (value instanceof Date) {
      return JSON.stringify({ __type: 'Date', value: value.toISOString() })
    }

    return JSON.stringify(value)
  }

  protected deserializeValue(serialized: string): StorageValue {
    try {
      const parsed = JSON.parse(serialized)

      // Handle special types
      if (parsed && typeof parsed === 'object' && parsed.__type === 'Date') {
        return new Date(parsed.value)
      }

      return parsed
    } catch (error) {
      // If parsing fails, return as string
      return serialized
    }
  }

  protected generateKey(prefix: string, key: string): string {
    return `${prefix}:${key}`
  }

  protected parseKey(fullKey: string, prefix: string): string | null {
    const expectedPrefix = `${prefix}:`
    if (fullKey.startsWith(expectedPrefix)) {
      return fullKey.slice(expectedPrefix.length)
    }
    return null
  }
}
