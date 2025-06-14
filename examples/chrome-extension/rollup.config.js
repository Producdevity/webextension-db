import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import typescript from '@rollup/plugin-typescript'
import copy from 'rollup-plugin-copy'

const commonPlugins = [
  nodeResolve({
    browser: true,
    preferBuiltins: false,
  }),
  commonjs(),
  json(),
  typescript({
    tsconfig: './tsconfig.json',
  }),
]

export default [
  {
    input: 'src/background.ts',
    output: {
      file: 'dist/background.js',
      format: 'es',
      sourcemap: true,
    },
    plugins: [
      ...commonPlugins,
      copy({
        targets: [
          { src: 'manifest.json', dest: 'dist' },
          { src: 'src/popup.html', dest: 'dist' },
          { src: 'src/options.html', dest: 'dist' },
        ],
      }),
    ],
    external: [],
  },
  {
    input: 'src/popup.ts',
    output: {
      file: 'dist/popup.js',
      format: 'es',
      sourcemap: true,
    },
    plugins: commonPlugins,
    external: [],
  },
  {
    input: 'src/content.ts',
    output: {
      file: 'dist/content.js',
      format: 'es',
      sourcemap: true,
    },
    plugins: commonPlugins,
    external: [],
  },
  {
    input: 'src/options.ts',
    output: {
      file: 'dist/options.js',
      format: 'es',
      sourcemap: true,
    },
    plugins: commonPlugins,
    external: [],
  },
]
