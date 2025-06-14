import type {
  BrowserType,
  BrowserCapabilities,
  StorageBackendType,
} from '../types/index'

// Declare browser global for Firefox/Safari
declare const browser: any

/**
 * Detect the current browser type in a web extension context
 */
export function detectBrowser(): BrowserType {
  // Check for extension API namespace
  try {
    // Chrome/Edge/Opera - chrome namespace
    if (
      typeof globalThis.chrome !== 'undefined' &&
      globalThis.chrome.runtime?.id
    ) {
      return 'chrome'
    }

    // Firefox - browser namespace (also has chrome for compatibility)
    if (typeof browser !== 'undefined' && browser.runtime?.id) {
      // Check user agent to distinguish Firefox from Safari
      if (
        typeof navigator !== 'undefined' &&
        navigator.userAgent.includes('Firefox')
      ) {
        return 'firefox'
      }
      // Safari also uses browser namespace
      if (
        typeof navigator !== 'undefined' &&
        navigator.userAgent.includes('Safari')
      ) {
        return 'safari'
      }
      // Default to firefox if browser namespace exists
      return 'firefox'
    }
  } catch (error) {
    console.warn('Error detecting browser:', error)
  }

  return 'unknown'
}

/**
 * Get browser capabilities for storage backends
 */
export function getBrowserCapabilities(
  browserType?: BrowserType,
): BrowserCapabilities {
  const browser = browserType || detectBrowser()

  const capabilities: BrowserCapabilities = {
    browser,
    hasIndexedDB: typeof indexedDB !== 'undefined',
    hasOPFS: false,
    hasWebWorkers: typeof Worker !== 'undefined',
    hasSharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
    hasOffscreenCanvas: typeof OffscreenCanvas !== 'undefined',
    supportsWASM: typeof WebAssembly !== 'undefined',
    extensionAPI: null,
    storageQuota: 0,
    hasChromeStorage: false,
    hasBrowserStorage: false,
    maxStorageSize: 5 * 1024 * 1024, // 5MB default
    supportedBackends: [],
  }

  // Check for OPFS support
  try {
    capabilities.hasOPFS =
      'storage' in navigator && 'getDirectory' in navigator.storage
  } catch (error) {
    capabilities.hasOPFS = false
  }

  // Browser-specific capabilities
  switch (browser) {
    case 'chrome':
      capabilities.hasChromeStorage =
        typeof globalThis.chrome !== 'undefined' && !!globalThis.chrome.storage
      capabilities.maxStorageSize = capabilities.hasChromeStorage
        ? Infinity
        : 5 * 1024 * 1024
      capabilities.supportedBackends = ['indexeddb', 'chrome-storage']
      if (capabilities.hasOPFS) capabilities.supportedBackends.push('opfs')
      break

    case 'firefox':
      capabilities.hasBrowserStorage =
        typeof browser !== 'undefined' && !!(browser as any).storage
      capabilities.maxStorageSize = capabilities.hasBrowserStorage
        ? Infinity
        : 5 * 1024 * 1024
      capabilities.supportedBackends = ['indexeddb', 'browser-storage']
      if (capabilities.hasOPFS) capabilities.supportedBackends.push('opfs')
      break

    case 'safari':
      capabilities.hasBrowserStorage =
        typeof browser !== 'undefined' && !!(browser as any).storage
      // Safari has more restrictive WebAssembly support in extensions
      capabilities.supportsWASM =
        capabilities.supportsWASM && !isInServiceWorker()
      capabilities.hasSharedArrayBuffer = false // Safari doesn't support SharedArrayBuffer in extensions
      // IndexedDB provides much larger storage than browser storage (10MB limit)
      capabilities.maxStorageSize = capabilities.hasIndexedDB
        ? Infinity // IndexedDB has no fixed limit in Safari
        : capabilities.hasBrowserStorage
        ? 10 * 1024 * 1024 // Browser storage is limited to ~10MB
        : 5 * 1024 * 1024
      // Prioritize IndexedDB over browser storage for larger capacity
      capabilities.supportedBackends = ['indexeddb', 'browser-storage']
      // Safari has limited OPFS support
      if (capabilities.hasOPFS && !isInServiceWorker()) {
        capabilities.supportedBackends.push('opfs')
      }
      break

    default:
      capabilities.supportedBackends = ['indexeddb']
      if (typeof localStorage !== 'undefined') {
        capabilities.supportedBackends.push('localstorage')
      }
      break
  }

  return capabilities
}

/**
 * Check if running in a service worker context
 */
function isInServiceWorker(): boolean {
  return (
    typeof importScripts === 'function' &&
    typeof WorkerGlobalScope !== 'undefined'
  )
}

/**
 * Determine the best storage backend for the current environment
 */
export function getBestStorageBackend(
  preferredType: 'sqlite' | 'json' | 'auto' = 'auto',
): StorageBackendType {
  const capabilities = getBrowserCapabilities()

  if (preferredType === 'sqlite') {
    // For SQLite, prefer OPFS > IndexedDB > fallback to JSON storage
    if (capabilities.hasOPFS && capabilities.supportsWASM) {
      return 'opfs'
    }
    if (capabilities.hasIndexedDB) {
      return 'indexeddb'
    }
    // Fallback to JSON storage
    if (capabilities.hasChromeStorage) return 'chrome-storage'
    if (capabilities.hasBrowserStorage) return 'browser-storage'
    return 'localstorage'
  }

  if (preferredType === 'json') {
    // For JSON, prefer IndexedDB for larger capacity, fallback to extension storage
    const browser = detectBrowser()
    
    // For Safari, prefer IndexedDB to avoid 10MB browser storage limit
    if (browser === 'safari') {
      if (capabilities.hasIndexedDB) return 'indexeddb'
      if (capabilities.hasBrowserStorage) return 'browser-storage'
      return 'localstorage'
    }
    
    // For Chrome/Firefox, prefer extension storage for unlimited capacity
    if (capabilities.hasChromeStorage) return 'chrome-storage'
    if (capabilities.hasBrowserStorage) return 'browser-storage'
    if (capabilities.hasIndexedDB) return 'indexeddb'
    return 'localstorage'
  }

  // Auto mode - choose the best available backend
  const browser = detectBrowser()

  // For Chrome, prefer chrome storage for unlimited capacity
  if (browser === 'chrome' && capabilities.hasChromeStorage) {
    return 'chrome-storage'
  }
  
  // For Safari, prefer IndexedDB to avoid browser storage 10MB limit
  if (browser === 'safari') {
    if (capabilities.hasIndexedDB) return 'indexeddb'
    if (capabilities.hasBrowserStorage) return 'browser-storage'
    return 'localstorage'
  }
  
  // For Firefox, prefer browser storage for unlimited capacity
  if (browser === 'firefox' && capabilities.hasBrowserStorage) {
    return 'browser-storage'
  }

  // Fallback to IndexedDB
  if (capabilities.hasIndexedDB) {
    return 'indexeddb'
  }

  return 'localstorage'
}

/**
 * Check if a specific storage backend is available
 */
export function isStorageBackendAvailable(
  backend: StorageBackendType,
): boolean {
  const capabilities = getBrowserCapabilities()
  return capabilities.supportedBackends.includes(backend)
}

/**
 * Get the extension API object (chrome or browser)
 */
export function getExtensionAPI(): Record<string, any> | null {
  if (typeof globalThis !== 'undefined') {
    // Try browser first (Firefox/Safari)
    if (typeof browser !== 'undefined' && browser.runtime) {
      return browser as Record<string, any>
    }
    // Fall back to chrome (Chrome/Edge/Opera)
    if (globalThis.chrome?.runtime) {
      return globalThis.chrome as Record<string, any>
    }
  }
  return null
}

/**
 * Check if we're running in a web extension context
 */
export function isWebExtension(): boolean {
  const api = getExtensionAPI()
  return api?.runtime?.id !== undefined
}

/**
 * Check if OPFS (Origin Private File System) is available
 */
export async function checkOPFSSupport(): Promise<boolean> {
  try {
    if (!globalThis.navigator?.storage?.getDirectory) {
      return false
    }

    // Try to actually access OPFS
    const opfsRoot = await navigator.storage!.getDirectory()
    return !!opfsRoot
  } catch {
    return false
  }
}

/**
 * Check if IndexedDB is available
 */
export function checkIndexedDBSupport(): boolean {
  try {
    return 'indexedDB' in globalThis && globalThis.indexedDB !== null
  } catch {
    return false
  }
}

/**
 * Check if Web Workers are available
 */
export function checkWebWorkerSupport(): boolean {
  try {
    return 'Worker' in globalThis
  } catch {
    return false
  }
}

/**
 * Check if SharedArrayBuffer is available
 */
export function checkSharedArrayBufferSupport(): boolean {
  try {
    return 'SharedArrayBuffer' in globalThis
  } catch {
    return false
  }
}

/**
 * Check if OffscreenCanvas is available (Chrome extension specific)
 */
export function checkOffscreenCanvasSupport(): boolean {
  try {
    return 'OffscreenCanvas' in globalThis
  } catch {
    return false
  }
}

/**
 * Check if WebAssembly is supported
 */
export function checkWASMSupport(): boolean {
  try {
    return (
      'WebAssembly' in globalThis &&
      typeof WebAssembly.instantiate === 'function'
    )
  } catch {
    return false
  }
}

/**
 * Get storage quota information
 */
export async function getStorageQuota(): Promise<number> {
  try {
    if (navigator.storage?.estimate) {
      const estimate = await navigator.storage.estimate()
      return estimate.quota ?? 0
    }
  } catch {
    // Fallback estimates based on browser
    const browser = detectBrowser()
    switch (browser) {
      case 'chrome':
        return 5 * 1024 * 1024 // 5MB default for chrome.storage.local
      case 'firefox':
        return 10 * 1024 * 1024 // 10MB estimate for Firefox
      case 'safari':
        return 5 * 1024 * 1024 // 5MB estimate for Safari
      default:
        return 1 * 1024 * 1024 // 1MB conservative estimate
    }
  }
  return 0
}

/**
 * Check if extension storage API is available
 */
export function checkExtensionStorageSupport(): boolean {
  const api = getExtensionAPI()
  return !!api?.storage?.local
}

/**
 * Get extension API namespace ('chrome' or 'browser')
 */
export function getExtensionAPINamespace(): 'chrome' | 'browser' | null {
  if (typeof globalThis !== 'undefined') {
    if (typeof browser !== 'undefined' && browser.runtime) {
      return 'browser'
    }
    if (globalThis.chrome?.runtime) {
      return 'chrome'
    }
  }
  return null
}

/**
 * Detect all browser capabilities
 */
export async function detectCapabilities(): Promise<BrowserCapabilities> {
  const browser = detectBrowser()
  const hasOPFS = await checkOPFSSupport()
  const hasIndexedDB = checkIndexedDBSupport()
  const hasWebWorkers = checkWebWorkerSupport()
  const hasSharedArrayBuffer = checkSharedArrayBufferSupport()
  const hasOffscreenCanvas = checkOffscreenCanvasSupport()
  const storageQuota = await getStorageQuota()
  const supportsWASM = checkWASMSupport()
  const extensionAPI = getExtensionAPINamespace()
  const hasChromeStorage =
    checkExtensionStorageSupport() && extensionAPI === 'chrome'
  const hasBrowserStorage =
    checkExtensionStorageSupport() && extensionAPI === 'browser'
  const supportedBackends = await getAvailableStorageBackends()

  return {
    browser,
    hasOPFS,
    hasIndexedDB,
    hasWebWorkers,
    hasSharedArrayBuffer,
    hasOffscreenCanvas,
    storageQuota,
    supportsWASM,
    extensionAPI,
    hasChromeStorage,
    hasBrowserStorage,
    maxStorageSize: storageQuota,
    supportedBackends,
  }
}

/**
 * Get available storage backends in order of preference
 */
export async function getAvailableStorageBackends(): Promise<
  StorageBackendType[]
> {
  const capabilities = await detectCapabilities()
  const backends: StorageBackendType[] = []

  // OPFS is preferred for performance
  if (capabilities.hasOPFS) {
    backends.push('opfs')
  }

  // IndexedDB is a good fallback
  if (capabilities.hasIndexedDB) {
    backends.push('indexeddb')
  }

  // Extension storage APIs
  if (checkExtensionStorageSupport()) {
    if (capabilities.extensionAPI === 'chrome') {
      backends.push('chrome-storage')
    } else {
      backends.push('browser-storage')
    }
  }

  // localStorage as last resort (not recommended)
  if ('localStorage' in globalThis) {
    backends.push('localstorage')
  }

  return backends
}

/**
 * Check if we're running in a service worker context
 */
export function isServiceWorker(): boolean {
  try {
    return (
      typeof ServiceWorkerGlobalScope !== 'undefined' &&
      globalThis instanceof ServiceWorkerGlobalScope
    )
  } catch {
    return false
  }
}

/**
 * Check if we're running in a web worker context
 */
export function isWebWorker(): boolean {
  try {
    return (
      typeof WorkerGlobalScope !== 'undefined' &&
      globalThis instanceof WorkerGlobalScope
    )
  } catch {
    return false
  }
}

/**
 * Check if we're running in the main thread
 */
export function isMainThread(): boolean {
  return !isServiceWorker() && !isWebWorker()
}

/**
 * Check if SQLite WASM can be used in current context
 */
export async function canUseSQLiteWASM(): Promise<boolean> {
  const capabilities = await detectCapabilities()

  // Basic requirements
  if (!capabilities.supportsWASM) {
    return false
  }

  // Context-specific checks
  if (isServiceWorker()) {
    // Service workers in Chrome can't access OPFS directly
    if (capabilities.browser === 'chrome' && !capabilities.hasOffscreenCanvas) {
      return false
    }
  }

  // Safari specific issues (improved in Safari 17+)
  if (capabilities.browser === 'safari') {
    // Basic check - if OPFS is available, SQLite WASM probably works
    return capabilities.hasOPFS
  }

  return true
}

/**
 * Check if the current browser supports promises for extension APIs
 */
export function supportsExtensionPromises(): boolean {
  const browser = detectBrowser()
  // Firefox and Safari support promises, Chrome supports them in MV3
  return (
    browser === 'firefox' ||
    browser === 'safari' ||
    (browser === 'chrome' && getManifestVersion() >= 3)
  )
}

/**
 * Get manifest version (MV2 or MV3)
 */
export function getManifestVersion(): number {
  try {
    const api = getExtensionAPI()
    if (api?.runtime?.getManifest) {
      const manifest = api.runtime.getManifest()
      return manifest.manifest_version ?? 2
    }
  } catch {
    // Ignore errors
  }
  return 2 // Default to MV2
}

/**
 * Browser-specific logging function
 */
export function createLogger(prefix: string) {
  return {
    debug: (message: string, ...args: unknown[]) => {
      console.debug(`[${prefix}] ${message}`, ...args)
    },
    info: (message: string, ...args: unknown[]) => {
      console.info(`[${prefix}] ${message}`, ...args)
    },
    warn: (message: string, ...args: unknown[]) => {
      console.warn(`[${prefix}] ${message}`, ...args)
    },
    error: (message: string, ...args: unknown[]) => {
      console.error(`[${prefix}] ${message}`, ...args)
    },
  }
}
