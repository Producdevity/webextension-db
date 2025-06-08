import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import prettierRecommended from 'eslint-plugin-prettier/recommended.js'

export default tseslint.config(
  eslint.configs.recommended, // core JS rules
  tseslint.configs.recommended, // TS rules without type-checking
  prettierRecommended,
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
)
