// JSON Provider Example - Document-style storage with query capabilities
import { createDatabase } from 'webextension-db'

async function runJsonProviderExample() {
  console.log('🚀 Starting JSON Provider Example...\n')

  // Create a JSON provider database
  const db = await createDatabase({
    name: 'json-example-db',
    provider: 'json', // Explicitly use JSON provider
    backend: 'indexeddb', // Use IndexedDB as storage backend
    version: 1,
  })

  console.log(
    `✅ Database created with provider: ${db.provider}, backend: ${db.backend}\n`,
  )

  // Store user documents
  const users = [
    {
      id: 'user1',
      name: 'Alice Johnson',
      age: 28,
      department: 'Engineering',
      salary: 75000,
    },
    {
      id: 'user2',
      name: 'Bob Smith',
      age: 34,
      department: 'Marketing',
      salary: 65000,
    },
    {
      id: 'user3',
      name: 'Carol Davis',
      age: 29,
      department: 'Engineering',
      salary: 80000,
    },
    {
      id: 'user4',
      name: 'David Wilson',
      age: 31,
      department: 'Sales',
      salary: 60000,
    },
    {
      id: 'user5',
      name: 'Eve Brown',
      age: 26,
      department: 'Engineering',
      salary: 72000,
    },
  ]

  console.log('📝 Storing user documents...')
  for (const user of users) {
    await db.set('users', user.id, user)
  }

  // Store some settings
  await db.set('settings', 'theme', { color: 'dark', fontSize: 14 })
  await db.set('settings', 'language', { primary: 'en', fallback: 'es' })

  console.log('✅ Data stored successfully\n')

  // Basic get/set operations
  console.log('🔍 Basic Operations:')
  const alice = await db.get('users', 'user1')
  console.log('Alice:', alice)

  const theme = await db.get('settings', 'theme')
  console.log('Theme settings:', theme)

  // Check if records exist
  const existsUser = await db.exists('users', 'user1')
  const existsNonUser = await db.exists('users', 'user999')
  console.log(`User1 exists: ${existsUser}, User999 exists: ${existsNonUser}\n`)

  // JSON Provider specific queries
  console.log('🔎 JSON Provider Query Examples:')

  // Find all engineers
  const engineers = await db.find('users', { department: 'Engineering' })
  console.log(
    'Engineers:',
    engineers.map((r) => ({ key: r.key, name: r.value.name })),
  )

  // Find users older than 30
  const seniorUsers = await db.find('users', { age: { $gt: 30 } })
  console.log(
    'Senior users (>30):',
    seniorUsers.map((r) => ({
      key: r.key,
      name: r.value.name,
      age: r.value.age,
    })),
  )

  // Find users with salary between 70k and 80k
  const midSalaryUsers = await db.find('users', {
    salary: { $gte: 70000, $lt: 80000 },
  })
  console.log(
    'Mid-salary users (70k-80k):',
    midSalaryUsers.map((r) => ({
      key: r.key,
      name: r.value.name,
      salary: r.value.salary,
    })),
  )

  // Find users in specific departments
  const techAndSales = await db.find('users', {
    department: { $in: ['Engineering', 'Sales'] },
  })
  console.log(
    'Tech & Sales users:',
    techAndSales.map((r) => ({
      key: r.key,
      name: r.value.name,
      department: r.value.department,
    })),
  )

  // Query with options (sorting and limiting)
  const topEarners = await db.find(
    'users',
    {},
    {
      sort: { salary: -1 }, // Sort by salary descending
      limit: 3,
    },
  )
  console.log(
    'Top 3 earners:',
    topEarners.map((r) => ({
      name: r.value.name,
      salary: r.value.salary,
    })),
  )

  // Count operations
  const totalUsers = await db.count('users')
  const engineerCount = await db.count('users', { department: 'Engineering' })
  console.log(`Total users: ${totalUsers}, Engineers: ${engineerCount}\n`)

  // Batch operations
  console.log('📦 Batch Operations:')
  await db.batch([
    {
      type: 'set',
      table: 'users',
      key: 'user6',
      value: {
        id: 'user6',
        name: 'Frank Miller',
        age: 35,
        department: 'HR',
        salary: 55000,
      },
    },
    {
      type: 'set',
      table: 'settings',
      key: 'notifications',
      value: { email: true, push: false },
    },
    { type: 'delete', table: 'users', key: 'user4' }, // Remove David Wilson
  ])

  const updatedCount = await db.count('users')
  console.log(`Users after batch operations: ${updatedCount}\n`)

  // Transaction example
  console.log('💼 Transaction Example:')
  await db.transaction('readwrite', async (tx) => {
    // Promote Alice and give her a raise
    const user = await tx.get('users', 'user1')
    user.salary += 10000
    user.title = 'Senior Engineer'
    await tx.set('users', 'user1', user)

    // Update company stats
    await tx.set('stats', 'lastPromotion', {
      employee: user.name,
      date: new Date().toISOString(),
      newSalary: user.salary,
    })
  })

  const promotedAlice = await db.get('users', 'user1')
  console.log('Promoted Alice:', {
    name: promotedAlice.name,
    salary: promotedAlice.salary,
    title: promotedAlice.title,
  })

  const promotionStats = await db.get('stats', 'lastPromotion')
  console.log('Promotion stats:', promotionStats)

  // List all tables
  const tables = await db.listTables()
  console.log('\n📋 All tables:', tables)

  // Clean up a table
  console.log('\n🧹 Cleanup:')
  await db.clear('stats')
  const tablesAfterCleanup = await db.listTables()
  console.log('Tables after clearing stats:', tablesAfterCleanup)

  // Close the database
  await db.close()
  console.log('\n✅ JSON Provider example completed successfully!')
}

// Run the example
runJsonProviderExample().catch(console.error)
