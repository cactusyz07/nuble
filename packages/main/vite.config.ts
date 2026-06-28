import { builtinModules } from 'module'
import { join } from 'path'
import { defineConfig } from 'vite'

// In Vite 5 + Electron 32, ESM-only packages are handled natively.
// We no longer need vite-plugin-esmodule.
import pkg from '../../package.json'

const nodeModules = Object.keys(pkg.dependencies || {})

export default defineConfig({
  root: __dirname,
  build: {
    outDir: '../../dist/main',
    emptyOutDir: true,
    minify: process.env.NODE_ENV === 'production',
    sourcemap: true,
    lib: {
      entry: 'index.ts',
      formats: ['cjs'],
      fileName: () => '[name].cjs'
    },
    rollupOptions: {
      external: ['electron', 'original-fs', ...builtinModules, ...nodeModules]
    }
  },
  resolve: {
    alias: {
      '@lindo/shared': join(__dirname, '../../packages/shared'),
      '@lindo/i18n': join(__dirname, '../../packages/i18n')
    }
  }
})
