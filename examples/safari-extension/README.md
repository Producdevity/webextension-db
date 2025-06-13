# WebExtension DB Safari Example

This is an example Safari extension that demonstrates how to use `webextension-db` in a Safari web extension environment.

## Features

- **Cross-browser compatibility**: Uses webextension-polyfill for Safari compatibility
- **Automatic provider selection**: Automatically chooses the best storage backend for Safari
- **Modern UI**: Clean, Safari-style interface
- **Real-time testing**: Interactive popup for testing database operations

## Safari-Specific Considerations

Safari has some unique characteristics for web extensions:

1. **WebAssembly limitations**: Safari may have restrictions on WASM in service workers
2. **Storage preferences**: Safari works well with browser.storage API and IndexedDB
3. **Manifest format**: Uses Manifest V2 format
4. **Content Security Policy**: Requires specific CSP for WASM support

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

4. **Load in Safari**:
   - Open Safari
   - Go to Safari > Preferences > Advanced
   - Check "Show Develop menu in menu bar"
   - Go to Develop > Allow Unsigned Extensions
   - Go to Safari > Preferences > Extensions
   - Click the "+" button and select this folder

## Usage

1. Click the extension icon in Safari's toolbar
2. Use the popup interface to:
   - **Set data**: Enter a key and value (JSON or text)
   - **Get data**: Retrieve stored data by key
   - **Delete data**: Remove data by key
   - **List keys**: Show all stored keys
   - **Clear output**: Clear the output log

## File Structure

```
safari-extension/
├── manifest.json          # Safari extension manifest
├── popup.html            # Extension popup interface
├── package.json          # Node.js dependencies
├── rollup.config.js      # Build configuration
├── tsconfig.json         # TypeScript configuration
└── src/
    ├── background.ts     # Background script
    └── popup.ts          # Popup script
```

## Development

- **Development mode**: `npm run dev` (watches for changes)
- **Clean build**: `npm run clean && npm run build`
- **Debug**: Use Safari's Web Inspector for debugging

## Storage Backends

The extension will automatically choose the best storage backend:

1. **browser.storage** (preferred for Safari)
2. **IndexedDB** (fallback)
3. **localStorage** (last resort)

## Troubleshooting

- **Extension not loading**: Check Safari's extension preferences and ensure unsigned extensions are allowed
- **Database errors**: Check the browser console for detailed error messages
- **Build issues**: Ensure the main library is built first (`npm run build` in root directory)

## Browser Support

- Safari 14+ (recommended)
- Safari 17+ for full WASM support (if using SQLite) 