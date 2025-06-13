// Global type declarations for browser APIs and extension environments

declare global {
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

  // Extension runtime APIs
  interface Chrome {
    runtime?: {
      id?: string
    }
  }

  interface Browser {
    runtime?: {
      id?: string
    }
  }

  // Global this extensions (only declare if not already declared)
  var chrome: Chrome | undefined
  var browser: Browser | undefined

  // File System Access API types (for OPFS support)
  interface FileSystemDirectoryHandle {
    getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>
    getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>
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
