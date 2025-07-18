import eslint from '@eslint/js'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import prettier from 'eslint-plugin-prettier'
import prettierConfig from 'eslint-config-prettier'

export default [
  eslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.js'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
      globals: {
        console: 'readonly',
        globalThis: 'readonly',
        navigator: 'readonly',
        chrome: 'readonly',
        browser: 'readonly',
        indexedDB: 'readonly',
        IDBDatabase: 'readonly',
        WebAssembly: 'readonly',
        ServiceWorkerGlobalScope: 'readonly',
        WorkerGlobalScope: 'readonly',
        Worker: 'readonly',
        OffscreenCanvas: 'readonly',
        SharedArrayBuffer: 'readonly',
        Blob: 'readonly',
        localStorage: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: prettier,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...prettierConfig.rules,
      'prettier/prettier': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-types': 'error',
      'no-useless-escape': 'off',
    },
  },
  {
    // Storage layers - allow any for extension APIs and browser compatibility
    files: [
      'src/storage/*.ts',
      'src/utils/browser-detection.ts',
      'src/types/globals.d.ts'
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // Extension APIs require dynamic typing
      'no-undef': 'off', // Global declarations may reference browser types
    },
  },
  {
    // SQLite provider - allow any for WASM interop
    files: ['src/providers/sql/SqlProvider.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // WASM interop requires dynamic typing
    },
  },
  {
    // ORM and JSON provider - allow any for dynamic SQL generation and cross-provider compatibility
    files: [
      'src/orm/index.ts',
      'src/providers/json/JsonProvider.ts'
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // Dynamic SQL and mixed data types require flexibility
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
]
