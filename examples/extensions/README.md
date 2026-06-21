# Browser Extension Examples

These examples show `webextension-db` in browser-extension background contexts:

- `chrome/`: Manifest V3 service worker using `chrome.storage.local`.
- `firefox/`: Manifest V3 module background script using `browser.storage.local`.
- `safari/`: Manifest V3 module background script using the default IndexedDB backend.

Each folder contains a manifest and a TypeScript background entry point. Bundle the `background.ts` file for the target folder to `background.js`, then load or package that folder with the browser's extension tooling.

The examples use package-name imports:

```ts
import { createDatabase } from "webextension-db";
```

Bundle that import into the extension output. Browsers do not load bare npm package specifiers directly from extension manifests.

References:

- Chrome Manifest V3 background service workers: https://developer.chrome.com/docs/extensions/reference/manifest/background
- Firefox and Safari background manifest behavior: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background
- Safari Web Extensions: https://developer.apple.com/documentation/safariservices/safari-web-extensions
