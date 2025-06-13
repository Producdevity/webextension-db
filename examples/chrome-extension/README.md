# WebExtension DB - Chrome Extension Example

A comprehensive Chrome extension example demonstrating the usage of the WebExtension DB package with both JSON and SQLite providers.

## Features

- **TypeScript Implementation**: Full TypeScript support with proper type definitions
- **Dual Provider Support**: Test both JSON and SQLite database providers
- **Comprehensive Testing Interface**: 
  - Simple popup for basic operations
  - Full options page for advanced testing
- **Modern UI**: Clean, responsive interface with proper styling
- **Real-world Examples**: Demonstrates practical usage patterns

## Architecture

### Files Structure

```
src/
├── background.ts     # Service worker with database management
├── popup.ts         # Simple popup interface
├── popup.html       # Popup UI
├── options.ts       # Comprehensive testing suite
├── options.html     # Full testing interface
├── content.ts       # Content script example
└── manifest.json    # Extension manifest
```

### Components

1. **Background Script** (`background.ts`)
   - Initializes both JSON and SQLite providers
   - Handles all database operations
   - Provides comprehensive API for testing
   - Includes benchmarking and transaction support

2. **Popup Interface** (`popup.ts` + `popup.html`)
   - Simple interface for basic operations
   - Provider selection (JSON/SQLite)
   - Basic CRUD operations
   - Quick access to full testing suite

3. **Options Page** (`options.ts` + `options.html`)
   - Comprehensive testing interface
   - Advanced query operations (JSON provider)
   - SQL query execution (SQLite provider)
   - Bulk operations and benchmarking
   - Export functionality

4. **Content Script** (`content.ts`)
   - Example of database usage in content script context
   - Page visit tracking demonstration
   - Console testing utilities

## Installation & Usage

### 1. Build the Extension

From the main project directory:
```bash
npm run build:example:chrome
```

Or from this directory:
```bash
npm install
npm run build
```

### 2. Load in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `dist` folder in this directory
5. The extension should now be loaded and visible

### 3. Testing the Extension

#### Basic Testing (Popup)
1. Click the extension icon in the toolbar
2. Select a provider (JSON or SQLite)
3. Test basic operations:
   - Store data with key/value pairs
   - Retrieve stored data
   - Delete specific keys
   - Clear entire tables
   - View provider statistics

#### Advanced Testing (Options Page)
1. Click "Open Full Testing Suite" in the popup
2. Or right-click the extension icon → "Options"
3. Switch between provider tabs
4. Test comprehensive features:
   - **JSON Provider**: Advanced queries, bulk operations, transactions
   - **SQLite Provider**: SQL queries, table creation, benchmarks
   - Export test results

#### Content Script Testing
1. Open any webpage
2. Open browser console (F12)
3. Use the global `webExtensionDB` object:
   ```javascript
   // Store page visit data
   webExtensionDB.storePageVisit()
   
   // Get stored data count
   webExtensionDB.getStoredDataCount()
   ```

## Provider Capabilities

### JSON Provider ✅ (Fully Implemented)
- **Basic Operations**: get, set, delete, exists, clear
- **Advanced Queries**: MongoDB-style query operators
- **Bulk Operations**: Batch insert/update operations
- **Transactions**: ACID transaction support
- **Storage Backends**: Chrome Storage API, IndexedDB fallback

### SQLite Provider ⚠️ (Skeleton Implementation)
- **Basic Operations**: get, set, delete, exists, clear (via IDatabase interface)
- **SQL Queries**: Raw SQL execution (not yet implemented)
- **Transactions**: Transaction support (not yet implemented)
- **Storage Backends**: WASM SQLite (planned), IndexedDB fallback

## Example Operations

### JSON Provider Examples

```typescript
// Basic operations
await db.set('users', 'user1', { name: 'John', age: 30 });
const user = await db.get('users', 'user1');
await db.delete('users', 'user1');

// Advanced queries
const adults = await db.find('users', { age: { $gte: 18 } });
const count = await db.count('users', { active: true });

// Transactions
await db.transaction('readwrite', async (tx) => {
  await tx.set('users', 'user1', userData1);
  await tx.set('users', 'user2', userData2);
});
```

### SQLite Provider Examples (Planned)

```typescript
// Basic operations (available now via IDatabase interface)
await db.set('users', 'user1', { name: 'John', age: 30 });
const user = await db.get('users', 'user1');

// SQL operations (planned)
await db.query('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, age INTEGER)');
const results = await db.query('SELECT * FROM users WHERE age > ?', [18]);
```

## Development

### Building
```bash
npm run build
```

### Development Mode
```bash
npm run build -- --watch
```

### TypeScript Configuration
The extension uses TypeScript with:
- ES2020 target
- ESNext modules
- Chrome extension types
- Strict type checking

## Troubleshooting

### Common Issues

1. **Extension won't load**
   - Ensure you're loading the `dist` folder, not the `src` folder
   - Check that all files are present in `dist` after building

2. **Database operations fail**
   - Check the browser console for errors
   - Verify the background script is running
   - Ensure proper permissions in manifest.json

3. **TypeScript errors during build**
   - Run `npm install` to ensure all dependencies are installed
   - Check that TypeScript version is compatible

### Debugging

1. **Background Script**: 
   - Go to `chrome://extensions/`
   - Click "Inspect views: service worker" under the extension

2. **Popup/Options**:
   - Right-click on popup/options page
   - Select "Inspect"

3. **Content Script**:
   - Open any webpage
   - Use browser DevTools console
   - Check for WebExtension DB logs

## Next Steps

1. **SQLite Implementation**: Complete the SQLite provider with WASM support
2. **Firefox Example**: Create Firefox-compatible version (Manifest V2)
3. **Safari Example**: Create Safari extension version
4. **Performance Testing**: Add comprehensive benchmarking suite
5. **Error Handling**: Improve error reporting and recovery

## Related Files

- Main package: `../../src/`
- JSON Provider: `../../src/providers/json/JsonProvider.ts`
- SQLite Provider: `../../src/providers/sql/SqlProvider.ts`
- Browser Detection: `../../src/utils/browser-detection.ts` 