// Popup script for Chrome extension demo

interface ExtensionMessage {
  action: string
  provider?: 'json' | 'sqlite'
  table?: string
  key?: string
  value?: any
  query?: any
  data?: any
}

interface ExtensionResponse {
  success: boolean
  data?: any
  error?: string
}

function log(message: any): void {
  const output = document.getElementById('output') as HTMLPreElement
  if (output) {
    output.textContent = JSON.stringify(message, null, 2)
  }
}

function sendMessage(
  action: string,
  data: Partial<ExtensionMessage> = {},
): Promise<ExtensionResponse> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action, ...data }, resolve)
  })
}

// Get current provider selection
function getCurrentProvider(): 'json' | 'sqlite' {
  const providerSelect = document.getElementById(
    'provider',
  ) as HTMLSelectElement
  return (providerSelect?.value as 'json' | 'sqlite') || 'json'
}

// Store data
document.addEventListener('DOMContentLoaded', () => {
  const storeBtn = document.getElementById('store') as HTMLButtonElement
  const retrieveBtn = document.getElementById('retrieve') as HTMLButtonElement
  const deleteBtn = document.getElementById('delete') as HTMLButtonElement
  const clearBtn = document.getElementById('clear') as HTMLButtonElement
  const statsBtn = document.getElementById('getStats') as HTMLButtonElement
  const optionsBtn = document.getElementById('openOptions') as HTMLButtonElement

  storeBtn?.addEventListener('click', async () => {
    const keyInput = document.getElementById('key') as HTMLInputElement
    const valueInput = document.getElementById('value') as HTMLInputElement
    const key = keyInput?.value
    const value = valueInput?.value

    if (!key || !value) {
      log({ error: 'Please enter both key and value' })
      return
    }

    try {
      const result = await sendMessage('set', {
        provider: getCurrentProvider(),
        table: 'demo',
        key: key,
        value: { data: value, timestamp: Date.now() },
      })

      if (result.success) {
        log({ success: 'Data stored', result: result.data })
        // Clear inputs
        keyInput.value = ''
        valueInput.value = ''
      } else {
        log({ error: result.error })
      }
    } catch (error) {
      log({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  })

  // Retrieve data
  retrieveBtn?.addEventListener('click', async () => {
    const getKeyInput = document.getElementById('getKey') as HTMLInputElement
    const key = getKeyInput?.value

    if (!key) {
      log({ error: 'Please enter a key' })
      return
    }

    try {
      const result = await sendMessage('get', {
        provider: getCurrentProvider(),
        table: 'demo',
        key: key,
      })

      if (result.success) {
        log({ retrieved: result.data })
      } else {
        log({ error: result.error })
      }
    } catch (error) {
      log({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  })

  // Delete data
  deleteBtn?.addEventListener('click', async () => {
    const deleteKeyInput = document.getElementById(
      'deleteKey',
    ) as HTMLInputElement
    const key = deleteKeyInput?.value

    if (!key) {
      log({ error: 'Please enter a key to delete' })
      return
    }

    try {
      const result = await sendMessage('delete', {
        provider: getCurrentProvider(),
        table: 'demo',
        key: key,
      })

      if (result.success) {
        log({ deleted: result.data })
        deleteKeyInput.value = ''
      } else {
        log({ error: result.error })
      }
    } catch (error) {
      log({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  })

  // Clear table
  clearBtn?.addEventListener('click', async () => {
    if (
      !confirm('Are you sure you want to clear all data in the demo table?')
    ) {
      return
    }

    try {
      const result = await sendMessage('clear', {
        provider: getCurrentProvider(),
        table: 'demo',
      })

      if (result.success) {
        log({ cleared: result.data })
      } else {
        log({ error: result.error })
      }
    } catch (error) {
      log({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  })

  // Get stats
  statsBtn?.addEventListener('click', async () => {
    try {
      const result = await sendMessage('getStats', {
        provider: getCurrentProvider(),
      })

      if (result.success) {
        log({ stats: result.data })
      } else {
        log({ error: result.error })
      }
    } catch (error) {
      log({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
  })

  // Open options page
  optionsBtn?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage()
  })

  // Initialize
  log({ status: 'Popup loaded', provider: getCurrentProvider() })
})
