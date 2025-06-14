# WebExtension DB Firefox Example

This is an example Firefox extension that demonstrates how to use `webextension-db` in a Firefox WebExtension environment.

## Features

- **SQLite Support**: Firefox has excellent WebAssembly SQLite support since v111
- **Advanced Querying**: Demonstrates complex database operations and querying
- **Search Functionality**: Built-in search across stored data
- **Statistics Tracking**: Real-time database usage statistics
- **Auto-detection**: Automatically selects the best storage backend for Firefox

## Firefox-Specific Advantages

Firefox provides superior WebExtension database capabilities:

1. **Excellent WASM Support**: Firefox v111+ has full SQLite WASM support in extensions
2. **Unlimited Storage**: No quota limits with `unlimitedStorage` permission
3. **IndexedDB Performance**: High-performance IndexedDB implementation
4. **Advanced APIs**: Full `browser.*` API support

## Installation

1. **Build the main library first**:

   ```bash
   cd ../../
   npm run build
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Build the extension**:

   ```bash
   npm run build
   ```

4. **Load in Firefox**:
   - Open Firefox
   - Go to `about:debugging`
   - Click "This Firefox"
   - Click "Load Temporary Add-on"
   - Select the `manifest.json` file

## Development

- **Development mode**: `npm run dev` (watches for changes)
- **Package for distribution**: `npm run package`
- **Clean build**: `npm run clean && npm run build`
- **Debug**: Use Firefox Developer Tools for debugging

## Usage

This example demonstrates:

1. **Basic Operations**: Set, get, delete data
2. **Advanced Search**: Search across all stored data
3. **Statistics**: View database usage statistics
4. **Performance**: Database operation benchmarks
5. **SQLite Features**: Advanced SQL queries when available

## File Structure

```
firefox-extension/
├── manifest.json          # Firefox extension manifest
├── package.json          # Node.js dependencies
├── rollup.config.js      # Build configuration
├── tsconfig.json         # TypeScript configuration
└── src/
    └── background.ts     # Background script with advanced features
```

## Storage Backends

The extension will automatically choose the best storage backend:

1. **SQLite with WASM** (preferred for Firefox v111+)
2. **IndexedDB** (high performance fallback)
3. **browser.storage** (unlimited storage)

## Advanced Features

### Search Functionality

The extension includes search capabilities across all stored data:

```javascript
browser.runtime.sendMessage({
  action: 'searchData',
  term: 'search query',
})
```

### Database Statistics

Get real-time database usage information:

```javascript
browser.runtime.sendMessage({
  action: 'getStats',
})
```

### Performance Benchmarks

Built-in performance testing:

```javascript
browser.runtime.sendMessage({
  action: 'benchmark',
  table: 'test',
})
```

## Browser Support

- Firefox 111+ (recommended for full SQLite support)
- Firefox 91+ (basic functionality)
- Works with Firefox ESR

## Troubleshooting

- **Extension not loading**: Check `about:debugging` for error messages
- **Database errors**: Check browser console for detailed error messages
- **Performance issues**: Try different storage backends via the options
- **Build issues**: Ensure the main library is built first

## WebExtensions Polyfill

This extension uses webextension-polyfill for cross-browser compatibility while maintaining Firefox-specific optimizations.
