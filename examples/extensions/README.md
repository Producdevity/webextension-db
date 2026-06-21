# Browser Extension Examples

These examples show `webextension-db` in browser-extension popup and background contexts:

- `chrome/`: Manifest V3 service worker using `chrome.storage.local`.
- `firefox/`: Manifest V3 module background script using `browser.storage.local`.
- `safari/`: Manifest V3 module background script using the default IndexedDB backend.

Each browser folder contains its manifest and background entry point. The popup source is shared in `shared/`.

Build all test extensions from the repository root:

```bash
pnpm build:extensions
```

The built extension folders are written to:

- `examples/extensions/dist/chrome`
- `examples/extensions/dist/firefox`
- `examples/extensions/dist/safari`

Load the Chrome folder as an unpacked extension. Load the Firefox folder as a temporary add-on through `about:debugging`. Use the Safari folder as the web extension source for Safari's extension tooling.

The examples use package-name imports:

```ts
import { createDatabase } from "webextension-db";
```

The build script bundles that import into the extension output. Browsers do not load bare npm package specifiers directly from extension manifests.

References:

- Chrome Manifest V3 background service workers: https://developer.chrome.com/docs/extensions/reference/manifest/background
- Firefox and Safari background manifest behavior: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background
- Safari Web Extensions: https://developer.apple.com/documentation/safariservices/safari-web-extensions
