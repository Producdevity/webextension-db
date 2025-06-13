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
  }

  // Navigator storage API
  interface Navigator {
    storage?: {
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
}

export {}
