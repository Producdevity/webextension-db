# Safari Extension Xcode Setup Instructions

This guide will help you create a complete Xcode project for the WebExtensionDB Safari extension.

## Prerequisites

- **macOS**: Required for Safari extension development
- **Xcode 12+**: Free from the Mac App Store
- **Safari 14+**: For web extension support

## Step-by-Step Setup

### 1. Create New Xcode Project

1. Open Xcode
2. Select "Create a new Xcode project"
3. Choose **macOS** > **App**
4. Fill in project details:
   - **Product Name**: `WebExtensionDB Safari Example`
   - **Bundle Identifier**: `com.webextensiondb.safari.example`
   - **Language**: Swift
   - **Interface**: SwiftUI
   - **Core Data**: Unchecked
   - **CloudKit**: Unchecked

### 2. Add Safari Extension Target

1. In project navigator, select the project (top item)
2. Click the **"+"** button at the bottom of the targets list
3. Choose **macOS** > **Safari Extension**
4. Fill in extension details:
   - **Product Name**: `WebExtensionDB Extension`
   - **Bundle Identifier**: `com.webextensiondb.safari.example.Extension`
   - **Language**: Swift

### 3. Copy Template Files

#### Main App Files
Copy these files to your main app target:

```
App.swift → YourProject/
ContentView.swift → YourProject/
```

#### Extension Files
Copy these files to your Safari extension target:

```
SafariWebExtensionHandler.swift → YourProject Extension/
Info.plist → YourProject Extension/ (replace existing)
App.entitlements → YourProject/
```

#### Web Extension Files
Copy the built web extension files:

```
manifest.json → YourProject Extension/Resources/
popup.html → YourProject Extension/Resources/
dist/ → YourProject Extension/Resources/dist/
```

### 4. Configure Project Settings

#### Main App Target Settings

1. Select main app target
2. **General** tab:
   - Deployment Target: macOS 11.0 or later
   - Bundle Identifier: `com.webextensiondb.safari.example`

3. **Signing & Capabilities** tab:
   - Add **App Sandbox** capability
   - Add **Outgoing Connections (Client)** under App Sandbox

#### Extension Target Settings

1. Select Safari extension target
2. **General** tab:
   - Deployment Target: macOS 11.0 or later
   - Bundle Identifier: `com.webextensiondb.safari.example.Extension`

3. **Build Settings** tab:
   - Set **Code Signing Identity** to "Apple Development"

### 5. Add Resource Files to Extension

1. Select the Safari extension target
2. Right-click on the extension folder in navigator
3. Choose **Add Files to "YourProject Extension"**
4. Add these files to the extension bundle:
   - `manifest.json`
   - `popup.html`
   - `dist/` folder (entire folder)

### 6. Configure Bundle IDs and Signing

#### Update Bundle Identifiers

Make sure your bundle identifiers follow this pattern:
- Main App: `com.yourname.webextensiondb.safari.example`
- Extension: `com.yourname.webextensiondb.safari.example.Extension`

#### Update Code References

In `ContentView.swift`, update the extension identifier:

```swift
private func openSafariExtensionPreferences() {
    SFSafariApplication.showPreferencesForExtension(withIdentifier: "com.yourname.webextensiondb.safari.example.Extension") { error in
        // ...
    }
}

private func checkExtensionStatus() {
    SFSafariExtensionManager.getStateOfSafariExtension(withIdentifier: "com.yourname.webextensiondb.safari.example.Extension") { state, error in
        // ...
    }
}
```

### 7. Build and Test

1. Select the main app scheme in Xcode
2. Press **⌘+R** to build and run
3. Safari should launch automatically
4. The main app window will provide instructions for enabling the extension

### 8. Enable Extension in Safari

1. Open Safari Preferences (⌘+,)
2. Go to **Extensions** tab
3. Find and enable **WebExtensionDB Extension**
4. Click the extension icon in Safari's toolbar to test

## Project Structure

After setup, your project should look like this:

```
WebExtensionDB Safari Example/
├── WebExtensionDB Safari Example/
│   ├── App.swift
│   ├── ContentView.swift
│   └── App.entitlements
└── WebExtensionDB Extension/
    ├── SafariWebExtensionHandler.swift
    ├── Info.plist
    └── Resources/
        ├── manifest.json
        ├── popup.html
        └── dist/
            ├── background.js
            └── popup.js
```

## Common Issues & Solutions

### Extension Not Loading
- Check bundle identifiers match between app and extension
- Verify all web extension files are in the Resources folder
- Ensure deployment target is macOS 11.0+

### Build Errors
- Clean build folder (⌘+Shift+K)
- Check all file references in Xcode
- Verify Swift files are added to correct targets

### Safari Extension Not Appearing
- Check Safari preferences > Extensions
- Enable "Allow Unsigned Extensions" in Safari Development menu
- Restart Safari after building

## Distribution

### Development Testing
- Archive the app (Product > Archive)
- Distribute locally for testing

### App Store Release
- Requires Apple Developer Program ($99/year)
- Follow App Store Review Guidelines
- Submit through App Store Connect

## Next Steps

1. **Customize the extension**: Modify the TypeScript code in `src/`
2. **Rebuild**: Run `npm run build` in the web extension directory
3. **Update Xcode**: Copy new `dist/` files to Xcode project
4. **Test**: Build and run in Xcode

For more information, see the main README.md file. 