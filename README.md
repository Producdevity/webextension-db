# WebExtension DB

A unified database API for web extensions that works seamlessly across Chrome, Firefox, and Safari. This package provides a consistent interface for persistent data storage in browser extensions, automatically handling browser differences and selecting the best available storage backend.

## Features

- 🌐 **Cross-browser compatibility** - Works on Chrome, Firefox, and Safari
- 🔄 **Automatic provider selection** - Chooses the best storage backend for each browser
- 💾 **Multiple storage options** - IndexedDB, Chrome Storage, Browser Storage APIs
- 📊 **JSON and SQLite support** - Flexible data storage options
- 🛡️ **Type-safe** - Full TypeScript support with comprehensive type definitions
- ⚡ **High performance** - Optimized for extension environments
- 🔧 **Easy to use** - Simple, consistent API across all browsers

## Installation

```bash
npm install webextension-db
```

## Quick Start

```javascript
import { createDatabase } from 'webextension-db';

// Create a database with automatic provider selection
const db = await createDatabase({
  name: 'my-extension-db',
  provider: 'auto',  // Automatically choose the best provider
  version: 1
});

// Store data
await db.set('users', 'user1', {
  name: 'John Doe',
  email: 'john@example.com',
  preferences: { theme: 'dark' }
});

// Retrieve data
const user = await db.get('users', 'user1');
console.log(user); // { name: 'John Doe', email: 'john@example.com', ... }

// Check if data exists
const exists = await db.exists('users', 'user1');

// Delete data
await db.delete('users', 'user1');

// Clear entire table
await db.clear('users');
```

## Browser Support

| Browser | Storage Backend | Status |
|---------|----------------|---------|
| Chrome | Chrome Storage API, IndexedDB | ✅ Supported |
| Firefox | Browser Storage API, IndexedDB | ✅ Supported |
| Safari | IndexedDB (preferred), Browser Storage API | ✅ Supported |
| Edge | Chrome Storage API, IndexedDB | ✅ Supported |

## API Reference

### createDatabase(config)

Creates a new database instance.

```javascript
const db = await createDatabase({
  name: 'my-db',           // Database name
  provider: 'auto',        // 'auto', 'json', 'sqlite'
  version: 1,              // Schema version
  backend: 'indexeddb',    // Optional: force specific backend
  options: {
    area: 'local',         // 'local', 'sync', 'managed'
    autoSave: true,        // Auto-save for JSON provider
    saveInterval: 5000     // Save interval in ms
  }
});
```

### Database Methods

#### Basic Operations

```javascript
// Store data
await db.set(table, key, value);

// Retrieve data
const value = await db.get(table, key);

// Check existence
const exists = await db.exists(table, key);

// Delete data
await db.delete(table, key);

// Clear table
await db.clear(table);
```

#### Batch Operations

```javascript
// Batch multiple operations
await db.batch([
  { type: 'set', table: 'users', key: 'user1', value: userData1 },
  { type: 'set', table: 'users', key: 'user2', value: userData2 },
  { type: 'delete', table: 'temp', key: 'old-data' }
]);
```

#### Table Management

```javascript
// List all tables
const tables = await db.listTables();

// Create table (for SQLite provider)
await db.createTable('users', schema);

// Drop table
await db.dropTable('users');
```

#### Transactions

```javascript
// Execute operations in a transaction
await db.transaction('readwrite', async (tx) => {
  const user = await tx.get('users', 'user1');
  user.lastActive = Date.now();
  await tx.set('users', 'user1', user);
  await tx.set('activity', Date.now(), { userId: 'user1', action: 'login' });
});
```

## Extension Manifest Setup

### Chrome (Manifest V3)

```json
{
  "manifest_version": 3,
  "permissions": [
    "storage",
    "unlimitedStorage"
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  }
}
```

### Firefox (Manifest V2)

```json
{
  "manifest_version": 2,
  "permissions": [
    "storage",
    "unlimitedStorage"
  ],
  "background": {
    "scripts": ["background.js"],
    "persistent": false
  }
}
```

## Usage in Extensions

### Background Script

```javascript
import { createDatabase } from 'webextension-db';

let db;

// Initialize database
async function initDB() {
  db = await createDatabase({
    name: 'extension-data',
    provider: 'auto'
  });
}

// Handle messages from popup/content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message).then(sendResponse);
  return true; // Async response
});

async function handleMessage(message) {
  const { action, table, key, value } = message;
  
  switch (action) {
    case 'get':
      return await db.get(table, key);
    case 'set':
      await db.set(table, key, value);
      return { success: true };
    // ... other operations
  }
}
```

### Popup Script

```javascript
// Send message to background script
async function getData(table, key) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { action: 'get', table, key },
      resolve
    );
  });
}

async function setData(table, key, value) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { action: 'set', table, key, value },
      resolve
    );
  });
}

// Usage
const user = await getData('users', 'current');
await setData('settings', 'theme', 'dark');
```

## Storage Backends

### Automatic Selection

By default, the package automatically selects the best storage backend:

1. **Chrome**: Chrome Storage API (with unlimitedStorage) → IndexedDB
2. **Firefox**: Browser Storage API → IndexedDB  
3. **Safari**: IndexedDB (preferred for large storage) → Browser Storage API (10MB limit)

### Manual Selection

You can force a specific backend:

```javascript
const db = await createDatabase({
  name: 'my-db',
  provider: 'json',
  backend: 'chrome-storage' // or 'browser-storage', 'indexeddb'
});
```

## Error Handling

```javascript
try {
  await db.set('users', 'user1', userData);
} catch (error) {
  if (error.code === 'STORAGE_QUOTA_ERROR') {
    // Handle storage quota exceeded
    console.log('Storage quota exceeded');
  } else if (error.code === 'CONNECTION_ERROR') {
    // Handle connection issues
    console.log('Database connection failed');
  }
}
```

## Development

```bash
# Install dependencies
npm install

# Build the package
npm run build

# Build examples
npm run build:examples

# Build everything (package + examples)
npm run build:all

# Run tests
npm test

# Build and watch for changes
npm run dev
```

## Examples

Check out the [examples](./examples) directory for complete working examples:

- [Basic Usage](./examples/basic-usage.js)
- [Chrome Extension](./examples/chrome-extension/)
- [Firefox Extension](./examples/firefox-extension/)

## Contributing

Contributions are welcome!

## License

MIT ©
