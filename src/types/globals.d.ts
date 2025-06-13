/**
 * Global type definitions for web extension environments
 */

// Extension storage types  
interface ExtensionStorageAPI {
  local: {
    get: (keys?: string | string[] | Record<string, unknown>) => Promise<Record<string, unknown>>
    set: (items: Record<string, unknown>) => Promise<void>
    remove: (keys: string | string[]) => Promise<void>
    clear: () => Promise<void>
    getBytesInUse?: (keys?: string | string[]) => Promise<number>
  }
  sync?: {
    get: (keys?: string | string[] | Record<string, unknown>) => Promise<Record<string, unknown>>
    set: (items: Record<string, unknown>) => Promise<void>
    remove: (keys: string | string[]) => Promise<void>
    clear: () => Promise<void>
  }
}

interface ExtensionRuntime {
  id?: string
  getManifest?: () => { manifest_version?: number; [key: string]: unknown }
}

interface ExtensionAPI {
  storage: ExtensionStorageAPI
  runtime: ExtensionRuntime
}

declare global {
  // Extension APIs
  const chrome: ExtensionAPI
  const browser: ExtensionAPI

  // SQLite WASM types
  interface SQLiteWASM {
    Database: new (filename?: string) => SQLiteDatabase
    FS: {
      writeFile: (path: string, data: Uint8Array) => void
      readFile: (path: string) => Uint8Array
      unlink: (path: string) => void
    }
  }

  interface SQLiteDatabase {
    exec: (sql: string) => SQLiteResult[]
    prepare: (sql: string) => SQLiteStatement
    close: () => void
  }

  interface SQLiteStatement {
    step: () => boolean
    get: () => Record<string, unknown>
    finalize: () => void
  }

  interface SQLiteResult {
    columns: string[]
    values: unknown[][]
  }

  // File System Access API
  interface FileSystemFileHandle {
    createSyncAccessHandle(): any
  }

  // Service Worker Global Scope
  interface ServiceWorkerGlobalScope extends WorkerGlobalScope {
    // Service worker specific properties
  }

  // Window interface (already exists in lib.dom.d.ts but ensuring it's available)
  interface Window {
    // Window specific properties
    chrome: typeof chrome
    browser: typeof browser
    safari: any
  }

  // Navigator storage API
  interface Navigator {
    storage: {
      getDirectory(): Promise<FileSystemDirectoryHandle>
      estimate(): Promise<StorageEstimate>
    }
  }

  // Global this extensions (only declare if not already declared)
  var chrome: Chrome | undefined
  var browser: Browser | undefined

  // File System Access API types (for OPFS support)
  interface FileSystemDirectoryHandle {
    getFileHandle(
      name: string,
      options?: { create?: boolean },
    ): Promise<FileSystemFileHandle>
    getDirectoryHandle(
      name: string,
      options?: { create?: boolean },
    ): Promise<FileSystemDirectoryHandle>
  }

  interface StorageEstimate {
    quota?: number
    usage?: number
  }

  // Extended Navigator interface for web extensions
  interface NavigatorUA {
    userAgent: string
    platform: string
  }
}

export {}
