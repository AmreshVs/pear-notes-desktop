import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/index.html'),
      external: [
        // Full core module list (Node 22+ superset)
        'assert',
        'async_hooks',
        'buffer',
        'child_process',
        'cluster',
        'console',
        'constants',
        'crypto',
        'dgram',
        'diagnostics_channel',
        'dns',
        'domain',
        'events',
        'fs',
        'fs/promises',
        'http',
        'http2',
        'https',
        'inspector',
        'module',
        'net',
        'os',
        'path',
        'perf_hooks',
        'process',
        'punycode',
        'querystring',
        'readline',
        'repl',
        'stream',
        'stream/consumers',
        'stream/promises',
        'stream/web',
        'string_decoder',
        'sys',
        'timers',
        'timers/promises',
        'tls',
        'tty',
        'url',
        'util',
        'v8',
        'vm',
        'wasi',
        'worker_threads',
        'zlib'
      ]
    }
  },
  define: {
    'process.env': undefined,
    'process.browser': undefined
  },
  resolve: {
    browser: false,
    conditions: ['node'],
    alias: {}
  },
  optimizeDeps: {
    esbuildOptions: {
      platform: 'node'
    }
  },
  server: {
    port: 5173,
    open: false
  },
  base: './'
})
