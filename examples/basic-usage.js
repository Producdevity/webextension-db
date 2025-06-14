// Basic usage example for webextension-db
import { createDatabase } from 'webextension-db'

async function basicExample() {
  try {
    // Create a database with automatic provider selection
    const db = await createDatabase({
      name: 'my-extension-db',
      provider: 'auto', // Will choose the best available storage
      version: 1,
    })

    console.log(
      `Database created with provider: ${db.provider}, backend: ${db.backend}`,
    )

    // Basic operations
    await db.set('users', 'user1', {
      id: 'user1',
      name: 'John Doe',
      email: 'john@example.com',
      preferences: {
        theme: 'dark',
        notifications: true,
      },
    })

    // Retrieve data
    const user = await db.get('users', 'user1')
    console.log('Retrieved user:', user)

    // Check if data exists
    const exists = await db.exists('users', 'user1')
    console.log('User exists:', exists)

    // Store multiple users
    await db.batch([
      {
        type: 'set',
        table: 'users',
        key: 'user2',
        value: { id: 'user2', name: 'Jane Smith', email: 'jane@example.com' },
      },
      {
        type: 'set',
        table: 'users',
        key: 'user3',
        value: { id: 'user3', name: 'Bob Johnson', email: 'bob@example.com' },
      },
    ])

    // List all tables
    const tables = await db.listTables()
    console.log('Available tables:', tables)

    // Clean up
    await db.clear('users')
    console.log('Cleared users table')

    // Close the database
    await db.close()
  } catch (error) {
    console.error('Database error:', error)
  }
}

// Run the example if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  basicExample()
} else if (typeof self !== 'undefined') {
  // Service worker environment
  basicExample()
}
