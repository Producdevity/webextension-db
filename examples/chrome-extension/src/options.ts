// Options page script for comprehensive database testing

interface ExtensionMessage {
  action: string;
  provider?: 'json' | 'sqlite';
  table?: string;
  key?: string;
  value?: any;
  query?: any;
  data?: any;
}

interface ExtensionResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Global state
let currentProvider: 'json' | 'sqlite' = 'json';

// Utility functions
function log(message: any, type: 'info' | 'success' | 'error' | 'warning' = 'info'): void {
  const output = document.getElementById('output') as HTMLPreElement;
  if (output) {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `[${timestamp}] [${type.toUpperCase()}]`;
    const content = typeof message === 'string' ? message : JSON.stringify(message, null, 2);
    output.textContent += `${prefix} ${content}\n`;
    output.scrollTop = output.scrollHeight;
  }
}

function sendMessage(action: string, data: Partial<ExtensionMessage> = {}): Promise<ExtensionResponse> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action, provider: currentProvider, ...data }, resolve);
  });
}

function switchProvider(provider: 'json' | 'sqlite'): void {
  currentProvider = provider;
  
  // Update tabs
  document.querySelectorAll('.provider-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelector(`[data-provider="${provider}"]`)?.classList.add('active');
  
  // Update content
  document.querySelectorAll('.provider-content').forEach(content => {
    content.classList.remove('active');
  });
  document.getElementById(`${provider}-content`)?.classList.add('active');
  
  log(`Switched to ${provider.toUpperCase()} provider`);
}

function clearOutput(): void {
  const output = document.getElementById('output') as HTMLPreElement;
  if (output) {
    output.textContent = '';
  }
}

function exportOutput(): void {
  const output = document.getElementById('output') as HTMLPreElement;
  if (output && output.textContent) {
    const blob = new Blob([output.textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `webextension-db-test-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// JSON Provider Operations
const jsonOperations = {
  async set(): Promise<void> {
    const table = (document.getElementById('json-table') as HTMLInputElement).value;
    const key = (document.getElementById('json-key') as HTMLInputElement).value;
    const valueText = (document.getElementById('json-value') as HTMLTextAreaElement).value;
    
    if (!table || !key || !valueText) {
      log('Please fill in table, key, and value fields', 'error');
      return;
    }
    
    try {
      const value = JSON.parse(valueText);
      const result = await sendMessage('set', { table, key, value });
      
      if (result.success) {
        log(`SET operation successful: ${result.data}`, 'success');
      } else {
        log(`SET operation failed: ${result.error}`, 'error');
      }
    } catch (error) {
      log(`Invalid JSON value: ${error}`, 'error');
    }
  },

  async get(): Promise<void> {
    const table = (document.getElementById('json-table') as HTMLInputElement).value;
    const key = (document.getElementById('json-key') as HTMLInputElement).value;
    
    if (!table || !key) {
      log('Please fill in table and key fields', 'error');
      return;
    }
    
    const result = await sendMessage('get', { table, key });
    
    if (result.success) {
      log(`GET operation successful:`, 'success');
      log(result.data);
    } else {
      log(`GET operation failed: ${result.error}`, 'error');
    }
  },

  async generateSampleData(): Promise<void> {
    const table = (document.getElementById('json-table') as HTMLInputElement).value;
    
    if (!table) {
      log('Please fill in table field', 'error');
      return;
    }
    
    const sampleData = [
      { key: 'user1', value: { name: 'Alice Johnson', age: 28, city: 'New York', active: true } },
      { key: 'user2', value: { name: 'Bob Smith', age: 34, city: 'Los Angeles', active: false } },
      { key: 'user3', value: { name: 'Carol Davis', age: 22, city: 'Chicago', active: true } }
    ];
    
    const result = await sendMessage('bulkInsert', { table, data: sampleData });
    
    if (result.success) {
      log(`Sample data generated successfully: ${result.data}`, 'success');
    } else {
      log(`Failed to generate sample data: ${result.error}`, 'error');
    }
  }
};

// SQLite Provider Operations  
const sqliteOperations = {
  async set(): Promise<void> {
    const table = (document.getElementById('sqlite-table') as HTMLInputElement).value;
    const key = (document.getElementById('sqlite-key') as HTMLInputElement).value;
    const valueText = (document.getElementById('sqlite-value') as HTMLTextAreaElement).value;
    
    if (!table || !key || !valueText) {
      log('Please fill in table, key, and value fields', 'error');
      return;
    }
    
    try {
      const value = JSON.parse(valueText);
      const result = await sendMessage('set', { table, key, value });
      
      if (result.success) {
        log(`SET operation successful: ${result.data}`, 'success');
      } else {
        log(`SET operation failed: ${result.error}`, 'error');
      }
    } catch (error) {
      log(`Invalid JSON value: ${error}`, 'error');
    }
  },

  async get(): Promise<void> {
    const table = (document.getElementById('sqlite-table') as HTMLInputElement).value;
    const key = (document.getElementById('sqlite-key') as HTMLInputElement).value;
    
    if (!table || !key) {
      log('Please fill in table and key fields', 'error');
      return;
    }
    
    const result = await sendMessage('get', { table, key });
    
    if (result.success) {
      log(`GET operation successful:`, 'success');
      log(result.data);
    } else {
      log(`GET operation failed: ${result.error}`, 'error');
    }
  }
};

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
  log('WebExtension DB Testing Suite Initialized');
  
  // Set up provider tab switching
  document.querySelectorAll('.provider-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const provider = (e.target as HTMLElement).getAttribute('data-provider') as 'json' | 'sqlite';
      if (provider) {
        switchProvider(provider);
      }
    });
  });
  
  log('Testing suite ready. Select a provider tab to begin testing.');
});

// Make functions available globally for HTML onclick handlers
(window as any).jsonOperations = jsonOperations;
(window as any).sqliteOperations = sqliteOperations;
(window as any).clearOutput = clearOutput;
(window as any).exportOutput = exportOutput; 