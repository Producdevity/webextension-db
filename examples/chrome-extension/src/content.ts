// Content script for Chrome extension demo

interface ExtensionMessage {
  action: string
  provider?: 'json' | 'sqlite'
  table?: string
  key?: string
  value?: any
}

interface ExtensionResponse {
  success: boolean
  data?: any
  error?: string
}

function sendMessage(
  action: string,
  data: Partial<ExtensionMessage> = {},
): Promise<ExtensionResponse> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action, ...data }, resolve)
  })
}

// Example: Store page visit data
async function storePageVisit(): Promise<void> {
  try {
    const pageData = {
      url: window.location.href,
      title: document.title,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
    }

    const result = await sendMessage('set', {
      provider: 'json',
      table: 'page_visits',
      key: `visit_${Date.now()}`,
      value: pageData,
    })

    if (result.success) {
      console.log('WebExtension DB: Page visit stored', result.data)
    } else {
      console.error('WebExtension DB: Failed to store page visit', result.error)
    }
  } catch (error) {
    console.error('WebExtension DB: Content script error', error)
  }
}

// Example: Get stored data count
async function getStoredDataCount(): Promise<void> {
  try {
    const result = await sendMessage('count', {
      provider: 'json',
      table: 'page_visits',
      query: {},
    })

    if (result.success) {
      console.log(
        'WebExtension DB: Total page visits stored:',
        result.data.count,
      )
    } else {
      console.error('WebExtension DB: Failed to get count', result.error)
    }
  } catch (error) {
    console.error('WebExtension DB: Content script error', error)
  }
}

// Initialize content script
console.log('WebExtension DB Content Script Loaded on:', window.location.href)

// Store page visit data (optional - can be enabled/disabled)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Uncomment to enable automatic page visit tracking
    // storePageVisit();
    // getStoredDataCount();
  })
} else {
  // Uncomment to enable automatic page visit tracking
  // storePageVisit();
  // getStoredDataCount();
}

// Add a global function for testing from console
;(window as any).webExtensionDB = {
  storePageVisit,
  getStoredDataCount,
  sendMessage,
}

console.log(
  'WebExtension DB: Use webExtensionDB.storePageVisit() to test from console',
)
