import { join } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from '../../package.json'

/**
 * @see https://vitejs.dev/config/
 *
 * Vite 5 + Electron 32:
 * - Removed vite-plugin-optimizer (unmaintained, incompatible with Vite 5)
 * - Removed vite-plugin-resolve (same issue)
 * - Electron APIs are exposed via the preload bridge (contextBridge / ipcRenderer)
 *   so no need to shimming electron in the renderer.
 * - electron-store is used only in main process.
 */
export default defineConfig({
  mode: process.env.NODE_ENV,
  root: __dirname,
  plugins: [
    react({
      jsxImportSource: '@emotion/react',
      babel: {
        plugins: ['@emotion/babel-plugin']
      }
    })
  ],
  // cf issue: https://github.com/vitejs/vite/issues/8644
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  },
  base: './',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          mobx: ['mobx', 'mobx-react-lite', 'mobx-state-tree']
        }
      }
    }
  },
  resolve: {
    alias: {
      '@lindo/shared': join(__dirname, '../../packages/shared'),
      '@lindo/i18n': join(__dirname, '../../packages/i18n'),
      '@': join(__dirname, 'src')
    }
  },
  server: {
    host: pkg.env.VITE_DEV_SERVER_HOST,
    port: pkg.env.VITE_DEV_SERVER_PORT
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@mui/material', 'mobx', 'mobx-react-lite']
  }
})
