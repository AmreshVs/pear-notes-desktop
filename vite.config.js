import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const nodeExternals = [
  'electron',
  'assert', 'async_hooks', 'buffer', 'child_process', 'cluster',
  'console', 'constants', 'crypto', 'node:crypto', 'dgram', 'diagnostics_channel',
  'dns', 'domain', 'events', 'fs', 'fs/promises', 'http', 'http2',
  'https', 'inspector', 'module', 'net', 'os', 'path', 'perf_hooks',
  'process', 'punycode', 'querystring', 'readline', 'repl', 'stream',
  'stream/consumers', 'stream/promises', 'stream/web', 'string_decoder',
  'sys', 'timers', 'timers/promises', 'tls', 'tty', 'url', 'util',
  'v8', 'vm', 'wasi', 'worker_threads', 'zlib'
]

function electronExternalsPlugin () {
  return {
    name: 'electron-externals',
    enforce: 'post',
    generateBundle (options, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk') continue
        for (const ext of nodeExternals) {
          const e = ext.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\//g, '\\/')
          chunk.code = chunk.code
            .replace(
              new RegExp(`import\\s*\\{([^}]+?)\\}\\s*from\\s*["']${e}["']\\s*;?`, 'g'),
              (_, names) => `const {${names.replace(/\bas\b/g, ':')}} = require("${ext}");`
            )
            .replace(
              new RegExp(`import\\s+(\\w+)\\s*from\\s*["']${e}["']\\s*;?`, 'g'),
              (_, name) => `const ${name} = require("${ext}");`
            )
            .replace(
              new RegExp(`import\\s*\\*\\s*as\\s+(\\w+)\\s*from\\s*["']${e}["']\\s*;?`, 'g'),
              (_, name) => `const ${name} = require("${ext}");`
            )
        }
      }
    }
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), electronExternalsPlugin()],
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
      output: { entryFileNames: 'assets/[name].js', chunkFileNames: 'assets/[name].js', assetFileNames: 'assets/[name].[ext]' },
      external: nodeExternals
    }
  },
  resolve: {
    browser: false,
    conditions: ['node'],
    alias: {
      'y-prosemirror': '@tiptap/y-tiptap'
    }
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
