import browser from 'webextension-polyfill'
import { WebExtensionDB, createDatabase } from 'webextension-db'

// Initialize database for Safari extension
let db: WebExtensionDB

async function initDatabase() {
  try {
    // Safari typically works better with JSON provider due to WebAssembly restrictions
    db = await createDatabase('safari-example', {
      provider: 'auto', // Will auto-detect and prefer browser storage for Safari
      version: 1,
    })

    console.log('Database initialized successfully')
    
    // Example: Set up some test data
    await setupTestData()
  } catch (error) {
    console.error('Failed to initialize database:', error)
  }
}

async function setupTestData() {
  // Create some example data
  const testData = {
    id: 'safari-test-1',
    name: 'Safari Test Item',
    timestamp: Date.now(),
    data: { browser: 'Safari', version: '17+' }
  }
  
  try {
    await db.set('test-key', testData)
    console.log('Test data inserted:', testData)
    
    // Retrieve and log the data
    const retrieved = await db.get('test-key')
    console.log('Retrieved data:', retrieved)
  } catch (error) {
    console.error('Error with test data:', error)
  }
}

// Handle extension messages
browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  console.log('Background received message:', message)
  
  switch (message.action) {
    case 'getData':
      try {
        const data = await db.get(message.key)
        return { success: true, data }
      } catch (error) {
        return { success: false, error: error.message }
      }
      
    case 'setData':
      try {
        await db.set(message.key, message.value)
        return { success: true }
      } catch (error) {
        return { success: false, error: error.message }
      }
      
    case 'deleteData':
      try {
        await db.delete(message.key)
        return { success: true }
      } catch (error) {
        return { success: false, error: error.message }
      }
      
    case 'listKeys':
      try {
        const keys = await db.keys()
        return { success: true, keys }
      } catch (error) {
        return { success: false, error: error.message }
      }
      
    default:
      return { success: false, error: 'Unknown action' }
  }
})

// Initialize when extension starts
initDatabase().catch(console.error)

export { db } 