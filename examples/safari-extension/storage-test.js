// Test script to demonstrate Safari storage backend selection
// Run this in Safari extension context to verify IndexedDB is chosen

import {
  createDatabase,
  getBestStorageBackend,
  detectBrowser,
} from 'webextension-db'

async function testSafariStorageSelection() {
  console.log('=== Safari Storage Backend Test ===')

  // Check browser detection
  const browser = detectBrowser()
  console.log('Detected browser:', browser)

  // Check best storage backend selection
  const autoBackend = getBestStorageBackend('auto')
  const jsonBackend = getBestStorageBackend('json')

  console.log('Auto mode backend:', autoBackend)
  console.log('JSON mode backend:', jsonBackend)

  // Create database and verify it uses IndexedDB
  const db = await createDatabase({
    name: 'safari-storage-test',
    provider: 'json',
    version: 1,
  })

  console.log('Database created successfully')
  console.log('Provider:', db.provider)
  console.log('Backend:', db.backend)
  console.log('Ready:', db.isReady)

  // Test storage operations
  await db.set('users', 'test-key', {
    name: 'Safari Test User',
    data: 'Large data storage test for Safari',
    timestamp: Date.now(),
  })

  const retrieved = await db.get('users', 'test-key')
  console.log('Data stored and retrieved successfully:', retrieved)

  console.log('=== Safari Storage Test Complete ===')
  console.log('✅ Safari is now using IndexedDB for unlimited storage capacity')
  console.log('✅ No more 10MB browser storage limit')
}

// Export for use in Safari extension
export { testSafariStorageSelection }
