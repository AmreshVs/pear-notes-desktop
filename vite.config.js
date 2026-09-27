import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DEV_BUILD_STAMP = '.dev-build'

const nodeExternals = [
  'electron',
  'assert',
  'async_hooks',
  'buffer',
  'child_process',
  'cluster',
  'console',
  'constants',
  'crypto',
  'node:crypto',
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

const IMPORT_BINDING = '[\\w$]+'

function escapeExternal(ext) {
  return ext.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\//g, '\\/')
}

function rewriteExternalImports(code, ext) {
  const e = escapeExternal(ext)
  return code
    .replace(
      new RegExp(
        `import\\s+(${IMPORT_BINDING})\\s*,\\s*\\{([^}]*?)\\}\\s*from\\s*["']${e}["']\\s*;?`,
        'g'
      ),
      (_, name, names) =>
        `const ${name} = require("${ext}");const {${names.replace(/\bas\b/g, ':')}} = ${name};`
    )
    .replace(
      new RegExp(
        `import\\s+(${IMPORT_BINDING})\\s*,\\s*\\*\\s*as\\s+(${IMPORT_BINDING})\\s*from\\s*["']${e}["']\\s*;?`,
        'g'
      ),
      (_, name, ns) => `const ${name} = require("${ext}");const ${ns} = ${name};`
    )
    .replace(
      new RegExp(`import\\s*\\{([^}]*?)\\}\\s*from\\s*["']${e}["']\\s*;?`, 'g'),
      (_, names) => `const {${names.replace(/\bas\b/g, ':')}} = require("${ext}");`
    )
    .replace(
      new RegExp(`import\\s*\\*\\s*as\\s+(${IMPORT_BINDING})\\s*from\\s*["']${e}["']\\s*;?`, 'g'),
      (_, name) => `const ${name} = require("${ext}");`
    )
    .replace(
      new RegExp(`import\\s+(${IMPORT_BINDING})\\s*from\\s*["']${e}["']\\s*;?`, 'g'),
      (_, name) => `const ${name} = require("${ext}");`
    )
    .replace(new RegExp(`import\\s*["']${e}["']\\s*;?`, 'g'), `require("${ext}");`)
}

function findSurvivingExternalImport(code, ext) {
  const e = escapeExternal(ext)
  const statement = new RegExp(
    `(?:^|[;}\\n])import\\s*(?:[^"';]{0,200}?from\\s*)?["']${e}["']`,
    'g'
  )
  const match = statement.exec(code)
  return match ? match[0].trim() : null
}

function electronExternalsPlugin() {
  return {
    name: 'electron-externals',
    enforce: 'post',
    generateBundle(options, bundle) {
      const survivors = []

      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk') continue
        for (const ext of nodeExternals) {
          chunk.code = rewriteExternalImports(chunk.code, ext)
        }
        for (const ext of nodeExternals) {
          const surviving = findSurvivingExternalImport(chunk.code, ext)
          if (surviving) survivors.push(`${chunk.fileName}: ${surviving}`)
        }
      }

      if (survivors.length > 0) {
        this.error(
          `electron-externals left ${survivors.length} unrewritten node import(s); the renderer would fail to load:\n` +
            survivors.join('\n')
        )
      }
    }
  }
}

function devBuildStampPlugin(mode) {
  return {
    name: 'dev-build-stamp',
    writeBundle(options) {
      if (mode !== 'development') return
      writeFileSync(resolve(options.dir, DEV_BUILD_STAMP), String(Date.now()))
    }
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), electronExternalsPlugin(), devBuildStampPlugin(mode)],
  build: {
    outDir: 'dist',
    // Must stay true: `npm run make` does not clean, so a stale bundle from
    // `dev:vite` (which builds with --sourcemap inline) would otherwise be
    // packaged into the signed app.
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      },
      external: nodeExternals
    }
  },
  resolve: {
    browser: false,
    conditions: ['node']
  },
  // Strip diagnostic logging from production builds. console.error survives so
  // genuine failures are still reportable; core's log.js already gates
  // info/debug behind __PEAR_DEV__, this removes the call sites entirely.
  //
  // Gated on mode because `dev:vite` runs `vite build --watch`, which minifies
  // too - without this, development would lose its logging as well.
  esbuild:
    mode === 'production'
      ? {
          pure: ['console.log', 'console.debug', 'console.info', 'console.trace'],
          drop: ['debugger']
        }
      : {},
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
}))
