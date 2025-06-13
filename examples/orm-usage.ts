// ORM Usage Example - SQL-like operations that work across all browsers
import { createDatabase, ORM } from '../src/index.js'

// Define table schemas
const userSchema = {
  id: { type: 'INTEGER' as const, primaryKey: true, autoIncrement: true },
  name: { type: 'TEXT' as const, notNull: true },
  email: { type: 'TEXT' as const, unique: true, notNull: true },
  age: { type: 'INTEGER' as const },
  created_at: { type: 'TEXT' as const, defaultValue: new Date().toISOString() }
}

const postSchema = {
  id: { type: 'INTEGER' as const, primaryKey: true, autoIncrement: true },
  title: { type: 'TEXT' as const, notNull: true },
  content: { type: 'TEXT' as const },
  user_id: { type: 'INTEGER' as const, notNull: true },
  published: { type: 'BOOLEAN' as const, defaultValue: false }
}

async function ormExample() {
  console.log('🚀 Starting ORM Example...')

  // Create database - will use SQLite on Chrome/Firefox, JSON on Safari
  const db = await createDatabase({
    name: 'blog_app',
    provider: 'sqlite' // Auto-fallback to JSON on Safari
  })

  console.log(`📊 Using provider: ${db.provider}`)

  // Create ORM instance
  const orm = new ORM(db)

  // Define tables
  const Users = orm.defineTable('users', userSchema)
  const Posts = orm.defineTable('posts', postSchema)

  // Create tables (only needed for SQLite, no-op for JSON)
  await orm.createTables()

  console.log('✅ Tables created')

  // INSERT operations
  console.log('\n📝 Inserting users...')
  
  const user1 = await Users.insert({
    name: 'John Doe',
    email: 'john@example.com',
    age: 30
  })
  console.log('Created user:', user1)

  const user2 = await Users.insert({
    name: 'Jane Smith',
    email: 'jane@example.com',
    age: 25
  })
  console.log('Created user:', user2)

  // Batch insert
  const morePosts = await Posts.insertMany([
    { title: 'First Post', content: 'Hello World!', user_id: user1.id, published: true },
    { title: 'Second Post', content: 'Learning ORM', user_id: user1.id },
    { title: 'Jane\'s Post', content: 'My thoughts', user_id: user2.id, published: true }
  ])
  console.log('Created posts:', morePosts)

  // SELECT operations
  console.log('\n🔍 Querying data...')

  // Find all users
  const allUsers = await Users.findAll()
  console.log('All users:', allUsers)

  // Find with conditions
  const publishedPosts = await Posts.findAll({
    where: [{ column: 'published', operator: '=', value: true }],
    orderBy: [{ column: 'title', direction: 'ASC' }]
  })
  console.log('Published posts:', publishedPosts)

  // Find one user
  const youngUser = await Users.findOne({
    where: [{ column: 'age', operator: '<', value: 28 }]
  })
  console.log('Young user:', youngUser)

  // Find by ID
  const userById = await Users.findById(1)
  console.log('User by ID:', userById)

  // Complex queries
  const userPosts = await Posts.findAll({
    where: [
      { column: 'user_id', operator: '=', value: user1.id },
      { column: 'published', operator: '=', value: false }
    ],
    limit: 5
  })
  console.log('User 1 unpublished posts:', userPosts)

  // UPDATE operations
  console.log('\n✏️ Updating data...')

  // Update by ID
  const updated = await Users.updateById(user2.id, { age: 26 })
  console.log('Updated user:', updated)

  // Update with conditions
  const publishedCount = await Posts.update(
    { published: true },
    { where: [{ column: 'user_id', operator: '=', value: user1.id }] }
  )
  console.log('Published posts count:', publishedCount)

  // COUNT operations
  console.log('\n🔢 Counting data...')

  const totalUsers = await Users.count()
  console.log('Total users:', totalUsers)

  const publishedPostsCount = await Posts.count({
    where: [{ column: 'published', operator: '=', value: true }]
  })
  console.log('Published posts count:', publishedPostsCount)

  // DELETE operations
  console.log('\n🗑️ Deleting data...')

  // Delete by ID
  const deleted = await Posts.deleteById(1)
  console.log('Deleted post:', deleted)

  // Delete with conditions
  const deletedCount = await Posts.delete({
    where: [{ column: 'published', operator: '=', value: false }]
  })
  console.log('Deleted unpublished posts:', deletedCount)

  // Final state
  console.log('\n📊 Final state:')
  console.log('Remaining users:', await Users.count())
  console.log('Remaining posts:', await Posts.count())

  // Advanced: Direct database access for complex operations
  console.log('\n🔧 Advanced operations...')
  
  if (db.provider === 'sqlite') {
    // Raw SQL only works on SQLite (Chrome/Firefox)
    try {
      const rawResults = await db.query(
        'SELECT u.name, COUNT(p.id) as post_count FROM users u LEFT JOIN posts p ON u.id = p.user_id GROUP BY u.id, u.name'
      )
      console.log('User post counts (SQL):', rawResults)
    } catch (error) {
      console.log('Raw SQL not available:', error.message)
    }
  } else {
    console.log('Raw SQL not available in JSON mode (Safari fallback)')
    
    // Simulate the same query using ORM
    const users = await Users.findAll()
    const userPostCounts = []
    
    for (const user of users) {
      const postCount = await Posts.count({
        where: [{ column: 'user_id', operator: '=', value: user.id }]
      })
      userPostCounts.push({ name: user.name, post_count: postCount })
    }
    
    console.log('User post counts (ORM):', userPostCounts)
  }

  console.log('\n🎉 ORM Example completed!')
}

// Run the example
ormExample().catch(console.error)

export { ormExample } 