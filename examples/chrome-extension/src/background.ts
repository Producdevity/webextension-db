// Background script for Chrome extension demo
// @ts-ignore - Module exists but TypeScript can't find declaration
import { createDatabase } from '../../../dist/index.esm.js';

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

class DatabaseManager {
  private jsonDb: any | null = null;
  private sqlDb: any | null = null;

  async initializeDatabases(): Promise<void> {
    try {
      // Initialize JSON Provider
      this.jsonDb = await createDatabase({
        name: 'chrome-extension-json-db',
        provider: 'json',
        version: 1
      });
      console.log('JSON Database initialized');

      // Initialize SQL Provider with fallback handling for Chrome extensions
      try {
        this.sqlDb = await createDatabase({
          name: 'chrome-extension-sql-db',
          provider: 'sqlite',
          version: 1
        });
        console.log('SQL Database initialized');
      } catch (error) {
        console.warn('SQL Database not available in Chrome extension service worker context, using JSON provider as fallback:', error);
        // Use JSON provider as SQL fallback in Chrome extensions
        this.sqlDb = await createDatabase({
          name: 'chrome-extension-sql-fallback-db',
          provider: 'json',
          version: 1
        });
        console.log('SQL Database fallback (JSON provider) initialized');
      }
    } catch (error) {
      console.error('Failed to initialize databases:', error);
    }
  }

  private getDatabase(provider: 'json' | 'sqlite'): any | null {
    return provider === 'json' ? this.jsonDb : this.sqlDb;
  }

  async handleMessage(message: ExtensionMessage): Promise<ExtensionResponse> {
    try {
      const { action, provider = 'json' } = message;
      const db = this.getDatabase(provider);

      if (!db) {
        return {
          success: false,
          error: `${provider} database not available`
        };
      }

      switch (action) {
        case 'set':
          await db.set(message.table || 'default', message.key!, message.value);
          return { success: true, data: 'Data stored successfully' };

        case 'get':
          const value = await db.get(message.table || 'default', message.key!);
          return { success: true, data: value };

        case 'delete':
          await db.delete(message.table || 'default', message.key!);
          return { success: true, data: { deleted: true } };

        case 'exists':
          const exists = await db.exists(message.table || 'default', message.key!);
          return { success: true, data: { exists } };

        case 'clear':
          await db.clear(message.table || 'default');
          return { success: true, data: 'Database cleared' };

        case 'find':
          // Find operation would need to be implemented based on the provider's capabilities
          return { success: false, error: 'Find operation not yet implemented' };

        case 'count':
          // Count operation would need to be implemented based on the provider's capabilities
          if (db.count) {
            const count = await db.count(message.table || 'default');
            return { success: true, data: { count } };
          }
          return { success: false, error: 'Count operation not supported' };

        case 'transaction':
          const result = await db.transaction('readwrite', async (tx: any) => {
            // Example transaction operations
            await tx.set(message.table || 'default', 'tx-key-1', { data: 'Transaction data 1', timestamp: Date.now() });
            await tx.set(message.table || 'default', 'tx-key-2', { data: 'Transaction data 2', timestamp: Date.now() });
            return 'Transaction completed';
          });
          return { success: true, data: result };

        case 'getStats':
          const stats = {
            provider,
            isReady: db.isReady,
            capabilities: {
              json: this.jsonDb !== null,
              sqlite: this.sqlDb !== null
            }
          };
          return { success: true, data: stats };

        case 'listTables':
          // For demonstration, return some mock table names
          const tables = ['demo', 'users', 'settings', 'cache'];
          return { success: true, data: tables };

        case 'bulkInsert':
          if (message.data && Array.isArray(message.data)) {
            await db.transaction('readwrite', async (tx: any) => {
              for (const item of message.data) {
                await tx.set(message.table || 'default', item.key, item.value);
              }
            });
            return { success: true, data: `Inserted ${message.data.length} items` };
          }
          return { success: false, error: 'Invalid bulk data' };

        case 'benchmark':
          return await this.runBenchmark(db, message.table!);

        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
    } catch (error) {
      console.error('Database operation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async runBenchmark(db: any, table: string): Promise<ExtensionResponse> {
    const startTime = Date.now();
    const iterations = 100;

    try {
      // Write benchmark
      const writeStart = Date.now();
      for (let i = 0; i < iterations; i++) {
        await db.set(table, `bench-${i}`, { 
          id: i, 
          data: `Benchmark data ${i}`, 
          timestamp: Date.now() 
        });
      }
      const writeTime = Date.now() - writeStart;

      // Read benchmark
      const readStart = Date.now();
      for (let i = 0; i < iterations; i++) {
        await db.get(table, `bench-${i}`);
      }
      const readTime = Date.now() - readStart;

      // Cleanup
      for (let i = 0; i < iterations; i++) {
        await db.delete(table, `bench-${i}`);
      }

      const totalTime = Date.now() - startTime;

      return {
        success: true,
        data: {
          iterations,
          writeTime,
          readTime,
          totalTime,
          avgWriteTime: writeTime / iterations,
          avgReadTime: readTime / iterations
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Benchmark failed'
      };
    }
  }
}

// Initialize database manager
const dbManager = new DatabaseManager();

// Initialize databases when extension starts
chrome.runtime.onStartup.addListener(() => {
  dbManager.initializeDatabases();
});

chrome.runtime.onInstalled.addListener(() => {
  dbManager.initializeDatabases();
});

// Initialize immediately
dbManager.initializeDatabases();

// Handle messages from popup and options page
chrome.runtime.onMessage.addListener((
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: ExtensionResponse) => void
) => {
  dbManager.handleMessage(message)
    .then(sendResponse)
    .catch(error => {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    });
  
  return true; // Keep message channel open for async response
});

console.log('WebExtension DB Chrome Extension Background Script Loaded'); 