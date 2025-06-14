# WebExtension DB Safari Example

This is an example Safari extension that demonstrates how to use `webextension-db` in a Safari web extension environment.

## ⚠️ Safari-Specific Requirements

**Safari extensions require Xcode and a native app wrapper!** Unlike Chrome and Firefox, Safari extensions must be packaged as part of a macOS/iOS app.

### Prerequisites

- **macOS**: Required for Safari extension development
- **Xcode 12+**: Free from the Mac App Store
- **Safari 14+**: For web extension support
- **Apple Developer Account**: For distribution (free account works for development)

## 🚀 Quick Setup (Xcode Method)

### Option 1: Using Xcode's Built-in Template (Recommended)

1. **Create Xcode Project**:

   ```bash
   # Open Xcode and create new project
   # Choose: macOS > App > Safari Extension App
   # Name: WebExtensionDBSafariExample
   # Bundle ID: com.yourname.webextension-db-example
   ```

2. **Replace Extension Files**:

   - Copy built files from `dist/` to Xcode project's extension folder
   - Copy `manifest.json` and `popup.html` to extension folder
   - Update Info.plist with proper permissions

3. **Build and Run**:
   - Press ⌘+R in Xcode
   - Safari will launch with extension loaded

### Option 2: Manual Xcode Setup

1. **Build the web extension first**:

   ```bash
   cd ../../
   npm run build
   cd examples/safari-extension
   npm install && npm run build
   ```

2. **Create Xcode project structure**:

   ```bash
   # We'll create this structure for you
   mkdir -p Safari-App/Safari-Extension
   ```

3. **Generate Xcode project** (see Xcode Setup section below)

## 📱 Xcode Project Setup

### Creating the App Wrapper

1. **New Xcode Project**:

   - Open Xcode
   - File > New > Project
   - macOS > App
   - Language: Swift, Interface: SwiftUI
   - Product Name: `WebExtensionDB Safari Example`
   - Bundle Identifier: `com.webextensiondb.safari.example`

2. **Add Safari Extension Target**:

   - Select project in navigator
   - Click "+" to add target
   - Choose "Safari Extension" (not "Safari Extension App")
   - Name: `WebExtensionDB Extension`

3. **Configure Extension**:
   - Copy `manifest.json`, `popup.html`, and `dist/` files to extension target
   - Add files to Xcode project
   - Update extension's Info.plist

### Required Info.plist Keys

```xml
<!-- Extension Info.plist additions -->
<key>NSExtension</key>
<dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.Safari.web-extension</string>
    <key>NSExtensionPrincipalClass</key>
    <string>$(PRODUCT_MODULE_NAME).SafariWebExtensionHandler</string>
</dict>
```

### App Entitlements

```xml
<!-- App.entitlements -->
<key>com.apple.security.app-sandbox</key>
<true/>
<key>com.apple.security.files.user-selected.read-only</key>
<true/>
```

## 🛠️ Development Workflow

### Building & Testing

1. **Build web extension**:

   ```bash
   npm run build
   ```

2. **Update Xcode project**:

   - Copy new `dist/` files to Xcode extension folder
   - Refresh Xcode project

3. **Run in Xcode**:

   ```bash
   # Or press ⌘+R in Xcode
   xcodebuild -scheme "WebExtensionDB Safari Example" -configuration Debug
   ```

4. **Enable in Safari**:
   - Safari will launch automatically
   - Go to Safari > Preferences > Extensions
   - Enable your extension

### Debugging

1. **Web Inspector**: Right-click extension popup > Inspect Element
2. **Xcode Console**: View native app logs
3. **Safari Console**: Console.log output from extension scripts

## 📦 Distribution

### Development Distribution

1. **Archive in Xcode**:

   - Product > Archive
   - Distribute App > Copy App

2. **Share with testers**:
   - Recipients must enable "Allow Unsigned Extensions" in Safari

### App Store Distribution

1. **Apple Developer Program**: Required ($99/year)
2. **Code Signing**: Configure in Xcode
3. **App Store Connect**: Upload and submit for review

## 🔧 Advanced Configuration

### Native App Communication

Safari extensions can communicate with their host app:

```swift
// SafariWebExtensionHandler.swift
import SafariServices

class SafariWebExtensionHandler: NSObject, NSExtensionRequestHandling {
    func beginRequest(with context: NSExtensionContext) {
        // Handle extension requests
    }
}
```

### Permissions & Entitlements

```xml
<!-- Additional entitlements for storage access -->
<key>com.apple.security.temporary-exception.files.absolute-path.read-write</key>
<array>
    <string>/path/to/extension/storage</string>
</array>
```

## Features

- **Cross-browser compatibility**: Uses webextension-polyfill for Safari compatibility
- **Automatic provider selection**: Automatically chooses the best storage backend for Safari
- **Modern UI**: Clean, Safari-style interface
- **Real-time testing**: Interactive popup for testing database operations
- **Native app integration**: Proper Safari extension app wrapper

## Safari-Specific Considerations

Safari has some unique characteristics for web extensions:

1. **WebAssembly limitations**: Safari may have restrictions on WASM in service workers
2. **Storage preferences**: Safari prioritizes IndexedDB for large storage capacity (browser.storage has 10MB limit)
3. **Manifest format**: Uses Manifest V2 format
4. **Content Security Policy**: Requires specific CSP for WASM support
5. **App wrapper required**: Must be packaged as macOS/iOS app
6. **Code signing**: Required for distribution

## Installation

### For Development (Manual Setup)

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

4. **Set up Xcode project** (see Xcode Setup section above)

### For Testing (Xcode Required)

1. **Open generated Xcode project**
2. **Build and run** (⌘+R)
3. **Enable extension** in Safari preferences

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
├── Safari-App/           # Xcode app wrapper (generated)
│   ├── App.swift         # Main app file
│   ├── ContentView.swift # SwiftUI interface
│   └── Extension/        # Extension files
│       ├── manifest.json
│       ├── popup.html
│       └── dist/         # Built JS files
└── src/
    ├── background.ts     # Background script
    └── popup.ts          # Popup script
```

## Development

- **Development mode**: `npm run dev` (watches for changes)
- **Clean build**: `npm run clean && npm run build`
- **Xcode build**: Use Xcode for final app compilation
- **Debug**: Use Safari's Web Inspector + Xcode console

## Storage Backends

The extension will automatically choose the best storage backend:

1. **browser.storage** (preferred for Safari)
2. **IndexedDB** (fallback)
3. **localStorage** (last resort)

## Troubleshooting

### Common Issues

- **Extension not loading**:

  - Check Safari's extension preferences
  - Ensure unsigned extensions are allowed (Development menu)
  - Verify Xcode project builds successfully

- **Database errors**:

  - Check browser console for detailed error messages
  - Verify webextension-db main library is built

- **Build issues**:

  - Ensure main library is built first: `npm run build` in root directory
  - Check Xcode project file references are correct
  - Verify all dist files are copied to Xcode extension folder

- **Xcode issues**:
  - Clean build folder (⌘+Shift+K)
  - Check bundle identifier is unique
  - Verify Safari extension target is configured correctly

### Development Tips

1. **Faster iteration**: Use `npm run dev` to watch for changes, then copy to Xcode
2. **Console logging**: Use Safari's Develop menu to inspect extension
3. **Hot reload**: Some changes require rebuilding the Xcode project

## Browser Support

- **Safari 14+** (recommended)
- **Safari 17+** for full WASM support (if using SQLite)
- **macOS 11+** for Safari Extension development
- **iOS 14+** for Safari extensions on iOS (requires additional setup)
