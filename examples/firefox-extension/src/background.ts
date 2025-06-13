import browser from 'webextension-polyfill'
import { WebExtensionDB, createDatabase } from 'webextension-db'

// Initialize database for Firefox extension
let db: WebExtensionDB

async function initDatabase() {
  try {
    // Firefox has excellent SQLite support via WASM since v111
    db = await createDatabase('firefox-example', {
      provider: 'auto', // Will auto-detect and prefer SQLite for Firefox
      version: 1,
      // Firefox-specific optimizations
      options: {
        enableWAL: true, // Write-Ahead Logging for better performance
        cacheSize: 2000, // Larger cache for Firefox
        busyTimeout: 30000, // 30 second timeout
      }
    })

    console.log('Database initialized successfully')
    console.log('Provider:', db.provider)
    console.log('Backend:', db.backend)
    
    // Example: Set up some test data with complex queries
    await setupTestData()
  } catch (error) {
    console.error('Failed to initialize database:', error)
  }
}

async function setupTestData() {
  try {
    // Create a more complex example for Firefox's SQLite capabilities
    const testData = [
      {
        id: 'firefox-test-1',
        name: 'Firefox Test Item 1',
        category: 'browser',
        timestamp: Date.now(),
        metadata: { 
          browser: 'Firefox', 
          version: '111+',
          features: ['SQLite', 'WASM', 'IndexedDB']
        }
      },
      {
        id: 'firefox-test-2',
        name: 'Firefox Test Item 2',
        category: 'extension',
        timestamp: Date.now() + 1000,
        metadata: { 
          type: 'webextension',
          api: 'browser.*',
          storage: 'unlimited'
        }
      }
    ]
    
    // Store test data
    for (const item of testData) {
      await db.set(item.id, item)
      console.log('Test data inserted:', item.name)
    }
    
    // Demonstrate advanced querying if SQLite is available
    if (db.provider === 'sqlite') {
      console.log('SQLite provider detected - demonstrating advanced features')
      
      // Example of raw SQL query (if supported)
      try {
        const keys = await db.keys()
        console.log('All keys:', keys)
        
        // Get all items by category
        const allItems = await Promise.all(keys.map(key => db.get(key)))
        const browserItems = allItems.filter(item => item?.category === 'browser')
        console.log('Browser category items:', browserItems)
      } catch (error) {
        console.log('Advanced querying not available:', error.message)
      }
    }
    
  } catch (error) {
    console.error('Error with test data:', error)
  }
}

// Handle extension messages with enhanced Firefox features
browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  console.log('Background received message:', message)
  
  switch (message.action) {
    case 'getData':
      try {
        const data = await db.get(message.key)
        return { success: true, data, provider: db.provider }
      } catch (error) {
        return { success: false, error: error.message }
      }
      
    case 'setData':
      try {
        await db.set(message.key, message.value)
        return { success: true, provider: db.provider }
      } catch (error) {
        return { success: false, error: error.message }
      }
      
    case 'deleteData':
      try {
        await db.delete(message.key)
        return { success: true, provider: db.provider }
      } catch (error) {
        return { success: false, error: error.message }
      }
      
    case 'listKeys':
      try {
        const keys = await db.keys()
        return { success: true, keys, provider: db.provider }
      } catch (error) {
        return { success: false, error: error.message }
      }
      
    case 'searchData':
      try {
        // Advanced search functionality for Firefox
        const keys = await db.keys()
        const allData = await Promise.all(
          keys.map(async key => ({ key, data: await db.get(key) }))
        )
        
        const searchTerm = message.term.toLowerCase()
        const results = allData.filter(item => 
          item.key.toLowerCase().includes(searchTerm) ||
          JSON.stringify(item.data).toLowerCase().includes(searchTerm)
        )
        
        return { success: true, results, provider: db.provider }
      } catch (error) {
        return { success: false, error: error.message }
      }
      
    case 'getStats':
      try {
        const keys = await db.keys()
        const totalKeys = keys.length
        
        // Calculate storage usage estimate
        let totalSize = 0
        for (const key of keys) {
          const data = await db.get(key)
          totalSize += JSON.stringify(data).length
        }
        
        return { 
          success: true, 
          stats: { 
            totalKeys, 
            estimatedSize: totalSize,
            provider: db.provider,
            backend: db.backend
          }
        }
      } catch (error) {
        return { success: false, error: error.message }
      }
      
    default:
      return { success: false, error: 'Unknown action' }
  }
})

// Firefox-specific initialization
browser.runtime.onInstalled.addListener(async (details) => {
  console.log('Extension installed/updated:', details)
  if (details.reason === 'install') {
    console.log('First install - setting up database')
    await initDatabase()
  }
})

// Initialize when extension starts
initDatabase().catch(console.error)

export { db } 