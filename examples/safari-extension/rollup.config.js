import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'

export default [
  // Background script
  {
    input: 'src/background.ts',
    output: {
      file: 'dist/background.js',
      format: 'iife',
      name: 'Background'
    },
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json'
      })
    ]
  },
  // Popup script
  {
    input: 'src/popup.ts',
    output: {
      file: 'dist/popup.js',
      format: 'iife',
      name: 'Popup'
    },
    plugins: [
      resolve({
        browser: true,
        preferBuiltins: false
      }),
      commonjs(),
      typescript({
        tsconfig: './tsconfig.json'
      })
    ]
  }
] 