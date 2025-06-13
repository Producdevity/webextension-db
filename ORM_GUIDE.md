# ORM Layer - Cross-Browser SQL-like Operations

## Overview

The ORM (Object-Relational Mapping) layer provides a **SQL-like API that works consistently across all browsers**, automatically using SQLite on Chrome/Firefox and falling back to JSON storage on Safari. This gives developers a familiar database interface without worrying about browser compatibility.

## Key Benefits

✅ **Unified API**: Same code works on Chrome, Firefox, and Safari  
✅ **SQL-like Operations**: Familiar database operations (SELECT, INSERT, UPDATE, DELETE)  
✅ **Automatic Fallback**: SQLite on Chrome/Firefox, JSON on Safari  
✅ **Type Safety**: Full TypeScript support with schema validation  
✅ **No Raw SQL Required**: High-level operations that work everywhere  

## Basic Usage

### 1. Define Table Schemas

```typescript
import { createDatabase, ORM } from 'webextension-db'

// Define your table structure
const userSchema = {
  id: { type: 'INTEGER', primaryKey: true, autoIncrement: true },
  name: { type: 'TEXT', notNull: true },
  email: { type: 'TEXT', unique: true, notNull: true },
  age: { type: 'INTEGER' },
  created_at: { type: 'TEXT', defaultValue: new Date().toISOString() }
}

const postSchema = {
  id: { type: 'INTEGER', primaryKey: true, autoIncrement: true },
  title: { type: 'TEXT', notNull: true },
  content: { type: 'TEXT' },
  user_id: { type: 'INTEGER', notNull: true },
  published: { type: 'BOOLEAN', defaultValue: false }
}
```

### 2. Initialize Database and ORM

```typescript
// Create database - automatically chooses SQLite or JSON based on browser
const db = await createDatabase({
  name: 'my_app',
  provider: 'sqlite' // Auto-fallback to JSON on Safari
})

// Create ORM instance
const orm = new ORM(db)

// Define tables
const Users = orm.defineTable('users', userSchema)
const Posts = orm.defineTable('posts', postSchema)

// Create tables (SQLite only, no-op for JSON)
await orm.createTables()
```

### 3. CRUD Operations

#### INSERT Operations

```typescript
// Insert single record
const user = await Users.insert({
  name: 'John Doe',
  email: 'john@example.com',
  age: 30
})

// Batch insert
const posts = await Posts.insertMany([
  { title: 'First Post', content: 'Hello World!', user_id: user.id },
  { title: 'Second Post', content: 'Learning ORM', user_id: user.id }
])
```

#### SELECT Operations

```typescript
// Find all records
const allUsers = await Users.findAll()

// Find with conditions
const publishedPosts = await Posts.findAll({
  where: [{ column: 'published', operator: '=', value: true }],
  orderBy: [{ column: 'title', direction: 'ASC' }],
  limit: 10
})

// Find one record
const youngUser = await Users.findOne({
  where: [{ column: 'age', operator: '<', value: 25 }]
})

// Find by ID
const user = await Users.findById(1)

// Complex queries with multiple conditions
const userPosts = await Posts.findAll({
  where: [
    { column: 'user_id', operator: '=', value: 1 },
    { column: 'published', operator: '=', value: true }
  ],
  orderBy: [{ column: 'created_at', direction: 'DESC' }],
  limit: 5,
  offset: 0
})
```

#### UPDATE Operations

```typescript
// Update by ID
const updated = await Users.updateById(1, { age: 31 })

// Update with conditions
const count = await Posts.update(
  { published: true },
  { where: [{ column: 'user_id', operator: '=', value: 1 }] }
)
```

#### DELETE Operations

```typescript
// Delete by ID
const deleted = await Posts.deleteById(1)

// Delete with conditions
const deletedCount = await Posts.delete({
  where: [{ column: 'published', operator: '=', value: false }]
})
```

#### COUNT Operations

```typescript
// Count all records
const totalUsers = await Users.count()

// Count with conditions
const publishedCount = await Posts.count({
  where: [{ column: 'published', operator: '=', value: true }]
})
```

## Advanced Features

### Query Operators

The ORM supports various SQL-like operators:

```typescript
// Comparison operators
{ column: 'age', operator: '>', value: 18 }
{ column: 'age', operator: '<=', value: 65 }
{ column: 'name', operator: '!=', value: 'Anonymous' }

// LIKE operator (partial matching)
{ column: 'email', operator: 'LIKE', value: '%@gmail.com' }

// IN operator (multiple values)
{ column: 'status', operator: 'IN', value: ['active', 'pending'] }
{ column: 'id', operator: 'NOT IN', value: [1, 2, 3] }
```

### Sorting and Pagination

```typescript
const results = await Users.findAll({
  where: [{ column: 'age', operator: '>=', value: 18 }],
  orderBy: [
    { column: 'name', direction: 'ASC' },
    { column: 'created_at', direction: 'DESC' }
  ],
  limit: 20,
  offset: 40 // Skip first 40 records (page 3 of 20 per page)
})
```

### Transactions

```typescript
// All operations within a transaction
await db.transaction('readwrite', async (tx) => {
  const user = await Users.insert({ name: 'Alice', email: 'alice@example.com' })
  await Posts.insert({ title: 'Alice Post', user_id: user.id })
  // Both operations succeed or both fail
})
```

## Cross-Browser Implementation

### Chrome/Firefox (SQLite)
- Uses real SQLite database with SQL queries
- Full SQL feature support
- Excellent performance for complex queries
- ACID transactions

### Safari (JSON Fallback)
- Uses JSON storage with in-memory filtering
- Same API, different implementation
- All ORM operations work identically
- Automatic indexing for performance

## Schema Definition

### Column Types

```typescript
const schema = {
  // Text/String data
  name: { type: 'TEXT', notNull: true },
  
  // Integer numbers
  age: { type: 'INTEGER', defaultValue: 0 },
  
  // Floating point numbers
  price: { type: 'REAL' },
  
  // Boolean values
  active: { type: 'BOOLEAN', defaultValue: true },
  
  // JSON objects (stored as text)
  metadata: { type: 'JSON' },
  
  // Binary data
  avatar: { type: 'BLOB' }
}
```

### Column Constraints

```typescript
const schema = {
  id: { 
    type: 'INTEGER', 
    primaryKey: true,      // Primary key
    autoIncrement: true    // Auto-increment ID
  },
  email: { 
    type: 'TEXT', 
    unique: true,          // Unique constraint
    notNull: true          // Required field
  },
  status: { 
    type: 'TEXT', 
    defaultValue: 'active' // Default value
  }
}
```

## Error Handling

```typescript
try {
  const user = await Users.insert({
    name: 'John',
    email: 'invalid-email' // Validation will catch this
  })
} catch (error) {
  if (error.message.includes('unique')) {
    console.log('Email already exists')
  } else if (error.message.includes('notNull')) {
    console.log('Required field missing')
  }
}
```

## Performance Considerations

### SQLite (Chrome/Firefox)
- Excellent for complex queries and large datasets
- Real database indexes and query optimization
- ACID transactions with rollback support

### JSON (Safari)
- Good for simple queries and small-medium datasets
- In-memory filtering may be slower for large datasets
- Consider limiting result sets with `limit` parameter

### Best Practices

```typescript
// ✅ Good: Use specific queries
const activeUsers = await Users.findAll({
  where: [{ column: 'active', operator: '=', value: true }],
  limit: 100
})

// ❌ Avoid: Loading all data then filtering in JavaScript
const allUsers = await Users.findAll()
const activeUsers = allUsers.filter(u => u.active)

// ✅ Good: Use count() for counting
const userCount = await Users.count()

// ❌ Avoid: Loading all records to count
const allUsers = await Users.findAll()
const userCount = allUsers.length
```

## Migration from Raw SQL

If you're currently using raw SQL, the ORM provides an easy migration path:

### Before (Raw SQL - Chrome/Firefox only)
```typescript
// Only works on Chrome/Firefox
const users = await db.query(
  'SELECT * FROM users WHERE age > ? ORDER BY name LIMIT 10',
  [18]
)
```

### After (ORM - All browsers)
```typescript
// Works on Chrome, Firefox, AND Safari
const users = await Users.findAll({
  where: [{ column: 'age', operator: '>', value: 18 }],
  orderBy: [{ column: 'name', direction: 'ASC' }],
  limit: 10
})
```

## Complete Example

```typescript
import { createDatabase, ORM } from 'webextension-db'

// Schema definition
const userSchema = {
  id: { type: 'INTEGER', primaryKey: true, autoIncrement: true },
  name: { type: 'TEXT', notNull: true },
  email: { type: 'TEXT', unique: true, notNull: true },
  age: { type: 'INTEGER' }
}

async function blogApp() {
  // Initialize
  const db = await createDatabase({ name: 'blog', provider: 'sqlite' })
  const orm = new ORM(db)
  const Users = orm.defineTable('users', userSchema)
  await orm.createTables()

  // Create user
  const user = await Users.insert({
    name: 'Alice',
    email: 'alice@example.com',
    age: 28
  })

  // Query users
  const youngUsers = await Users.findAll({
    where: [{ column: 'age', operator: '<', value: 30 }],
    orderBy: [{ column: 'name', direction: 'ASC' }]
  })

  // Update user
  await Users.updateById(user.id, { age: 29 })

  // Count users
  const totalUsers = await Users.count()

  console.log(`Found ${youngUsers.length} young users out of ${totalUsers} total`)
}
```

## Summary

The ORM layer provides the **perfect compromise** for cross-browser web extensions:

- **Developers** get a familiar, SQL-like API that works everywhere
- **Chrome/Firefox** users get full SQLite performance and features  
- **Safari** users get the same functionality through JSON storage
- **No browser detection** or conditional code required in your application

This approach eliminates the complexity of cross-browser database compatibility while providing a powerful, type-safe database interface for web extensions. 