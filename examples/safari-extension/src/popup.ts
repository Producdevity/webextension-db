import browser from 'webextension-polyfill'

interface DatabaseResponse {
  success: boolean
  data?: any
  keys?: string[]
  error?: string
}

// DOM elements
const keyInput = document.getElementById('keyInput') as HTMLInputElement
const valueInput = document.getElementById('valueInput') as HTMLTextAreaElement
const setButton = document.getElementById('setButton') as HTMLButtonElement
const getButton = document.getElementById('getButton') as HTMLButtonElement
const deleteButton = document.getElementById(
  'deleteButton',
) as HTMLButtonElement
const listButton = document.getElementById('listButton') as HTMLButtonElement
const clearButton = document.getElementById('clearButton') as HTMLButtonElement
const output = document.getElementById('output') as HTMLDivElement

// Helper function to send messages to background script
async function sendMessage(
  action: string,
  data: any = {},
): Promise<DatabaseResponse> {
  try {
    const response = await browser.runtime.sendMessage({ action, ...data })
    return response as DatabaseResponse
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// Helper function to display output
function displayOutput(text: string, isError: boolean = false) {
  const div = document.createElement('div')
  div.className = isError ? 'error' : 'success'
  div.textContent = text
  output.appendChild(div)
  output.scrollTop = output.scrollHeight
}

// Set data
setButton.addEventListener('click', async () => {
  const key = keyInput.value.trim()
  const valueText = valueInput.value.trim()

  if (!key || !valueText) {
    displayOutput('Please enter both key and value', true)
    return
  }

  let value: any
  try {
    // Try to parse as JSON, fallback to string
    value = JSON.parse(valueText)
  } catch {
    value = valueText
  }

  const response = await sendMessage('setData', { key, value })
  if (response.success) {
    displayOutput(`✓ Set "${key}" successfully`)
    keyInput.value = ''
    valueInput.value = ''
  } else {
    displayOutput(`✗ Error setting data: ${response.error}`, true)
  }
})

// Get data
getButton.addEventListener('click', async () => {
  const key = keyInput.value.trim()

  if (!key) {
    displayOutput('Please enter a key', true)
    return
  }

  const response = await sendMessage('getData', { key })
  if (response.success) {
    displayOutput(`✓ "${key}": ${JSON.stringify(response.data, null, 2)}`)
  } else {
    displayOutput(`✗ Error getting data: ${response.error}`, true)
  }
})

// Delete data
deleteButton.addEventListener('click', async () => {
  const key = keyInput.value.trim()

  if (!key) {
    displayOutput('Please enter a key', true)
    return
  }

  const response = await sendMessage('deleteData', { key })
  if (response.success) {
    displayOutput(`✓ Deleted "${key}" successfully`)
    keyInput.value = ''
  } else {
    displayOutput(`✗ Error deleting data: ${response.error}`, true)
  }
})

// List all keys
listButton.addEventListener('click', async () => {
  const response = await sendMessage('listKeys')
  if (response.success) {
    if (response.keys && response.keys.length > 0) {
      displayOutput(`✓ Keys: ${response.keys.join(', ')}`)
    } else {
      displayOutput('✓ No keys found')
    }
  } else {
    displayOutput(`✗ Error listing keys: ${response.error}`, true)
  }
})

// Clear output
clearButton.addEventListener('click', () => {
  output.innerHTML = ''
})

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
  displayOutput('Safari Extension DB Demo Ready')
})
