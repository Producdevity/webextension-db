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
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/ban-types': 'warn',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
]
