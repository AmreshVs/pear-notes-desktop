const fs = require('fs')
const path = require('path')
const { minify } = require('terser')
const { obfuscate } = require('javascript-obfuscator')

// The desktop backend runs @pear-notes/core as raw ESM files in the Bare
// sidecar (workers/main.js -> node_modules/@pear-notes/core/backend/main.js),
// so unlike the renderer - which Vite minifies into dist/ - core ships
// readable. This transforms the packaged copy in place; the repo copy that a
// dev runs against is never touched.
//
// Constraints match pear-notes-mobile/scripts/minify-core.js: top-level names
// are preserved (ESM modules resolve each other by name at runtime here, since
// desktop does not pre-bundle), and property names / object keys are never
// mangled (core's objects cross the hrpc wire indexed by string key, so an
// obfuscated build must stay wire-compatible with a non-obfuscated peer).

const OBFUSCATE_ENABLED = process.env.PEAR_OBFUSCATE !== '0'
const OBFUSCATE_LEVEL =
  process.env.PEAR_OBFUSCATE_LEVEL === 'aggressive' ? 'aggressive' : 'standard'

const TERSER_OPTIONS = {
  module: true,
  compress: {
    drop_console: ['log', 'info', 'debug', 'trace'],
    drop_debugger: true,
  },
  mangle: {
    toplevel: false,
  },
  format: {
    comments: false,
  },
}

const BASE_OBFUSCATOR_OPTIONS = {
  compact: true,
  target: 'node',
  renameGlobals: false,
  renameProperties: false,
  transformObjectKeys: false,
  selfDefending: false,
  debugProtection: false,
  identifierNamesGenerator: 'mangled-shuffled',
  stringArray: true,
  stringArrayThreshold: 0.75,
  stringArrayEncoding: ['base64'],
  splitStrings: false,
  unicodeEscapeSequence: false,
  controlFlowFlattening: false,
  deadCodeInjection: false,
}

const AGGRESSIVE_OBFUSCATOR_OPTIONS = {
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.5,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.2,
}

function obfuscatorOptions() {
  if (OBFUSCATE_LEVEL === 'aggressive') {
    return { ...BASE_OBFUSCATOR_OPTIONS, ...AGGRESSIVE_OBFUSCATOR_OPTIONS }
  }
  return BASE_OBFUSCATOR_OPTIONS
}

// core's own source only - never its bundled dependencies, and never config or
// declaration files that are not loaded at runtime.
function listCoreSourceFiles(dir) {
  const found = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'types' || entry.name === 'tests') {
      continue
    }
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      found.push(...listCoreSourceFiles(full))
    } else if (entry.isFile() && full.endsWith('.js') && entry.name !== 'eslint.config.js') {
      found.push(full)
    }
  }
  return found
}

function collectExportNames(source) {
  const names = new Set()
  const functionDeclaration = /export\s+(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/g
  const bindingDeclaration = /export\s+(?:class|const|let|var)\s+([A-Za-z_$][\w$]*)/g
  const named = /export\s*\{([^}]*)\}/g

  let match
  while ((match = functionDeclaration.exec(source)) !== null) names.add(match[1])
  while ((match = bindingDeclaration.exec(source)) !== null) names.add(match[1])
  while ((match = named.exec(source)) !== null) {
    for (const part of match[1].split(',')) {
      const alias = part.includes(' as ') ? part.split(' as ')[1] : part
      const clean = alias.trim()
      if (clean) names.add(clean)
    }
  }
  if (/export\s+default\b/.test(source)) names.add('default')
  return names
}

function assertExportsPreserved(relative, before, after) {
  const expected = collectExportNames(before)
  if (expected.size === 0) return

  const actual = collectExportNames(after)
  const lost = [...expected].filter((name) => !actual.has(name))

  if (lost.length > 0) {
    throw new Error(
      `${relative}: hardening dropped or renamed export(s) ${lost.join(', ')} - ` +
        'these are resolved by name across the module graph, so the worker would fail to boot',
    )
  }
}

async function hardenCore(coreDir) {
  if (!fs.existsSync(coreDir)) {
    throw new Error(`core not found at ${coreDir}`)
  }

  // hardenCore rewrites files in place. The dev copy of core is a `file:`
  // symlink to ../pear-notes-core, so refuse to run against the real source -
  // only a packaged copy or a throwaway staging copy is ever a valid target.
  const liveSource = path.resolve(__dirname, '..', '..', 'pear-notes-core')
  const resolved = fs.realpathSync(coreDir)
  if (resolved === liveSource || resolved.startsWith(liveSource + path.sep)) {
    throw new Error(
      `refusing to harden the live core source at ${resolved} - run against a copy, not the file: symlink`,
    )
  }

  // Not loaded at runtime; drop from the packaged app. `.git`/`.github` come from
  // the github: dependency clone and their read-only objects break code signing.
  for (const noise of ['.git', '.github', 'types', 'tests', 'eslint.config.js', 'tsconfig.json', 'README.md', 'package-lock.json']) {
    fs.rmSync(path.join(coreDir, noise), { recursive: true, force: true })
  }

  const files = listCoreSourceFiles(coreDir)
  let before = 0
  let after = 0

  for (const file of files) {
    const relative = path.relative(coreDir, file)
    const original = fs.readFileSync(file, 'utf8')
    before += original.length

    const minified = await minify(original, TERSER_OPTIONS)
    if (typeof minified.code !== 'string') {
      throw new Error(`terser produced no output for ${relative}`)
    }

    let code = minified.code
    if (OBFUSCATE_ENABLED) {
      code = obfuscate(code, obfuscatorOptions()).getObfuscatedCode()
      assertExportsPreserved(relative, original, code)
    }

    fs.writeFileSync(file, code)
    after += code.length
  }

  const delta = before === 0 ? 0 : Math.round((after / before - 1) * 100)
  const mode = OBFUSCATE_ENABLED ? `minify + obfuscate (${OBFUSCATE_LEVEL})` : 'minify only'
  return { files: files.length, before, after, delta, mode }
}

// CLI: `node scripts/harden-core.cjs` (npm run harden-core) stages a
// dereferenced copy of core into .core-hardened/ and hardens it there, so a dev
// can inspect exactly what the packaged app would ship without a full
// electron-forge package. Honors PEAR_OBFUSCATE / PEAR_OBFUSCATE_LEVEL. The
// live core source is never touched.
async function previewFromNodeModules() {
  const liveCore = path.resolve(__dirname, '..', 'node_modules', '@pear-notes', 'core')
  if (!fs.existsSync(liveCore)) {
    throw new Error(`${liveCore} not found - run npm install first`)
  }

  const outRoot = path.resolve(__dirname, '..', '.core-hardened')
  const out = path.join(outRoot, '@pear-notes', 'core')
  fs.rmSync(outRoot, { recursive: true, force: true })
  fs.mkdirSync(path.dirname(out), { recursive: true })

  // Dereference the symlink; skip core's own node_modules (not hardened) and its
  // .git (dereferencing the file: symlink pulls in ../pear-notes-core/.git, whose
  // read-only objects otherwise break code signing if this dir ever leaks into a
  // package).
  const skip = new Set(['node_modules', '.git'])
  fs.cpSync(liveCore, out, {
    recursive: true,
    dereference: true,
    filter: (src) => !skip.has(path.basename(src)),
  })

  const result = await hardenCore(out)
  console.log(
    `[harden-core] ${result.mode}: ${result.files} files, ` +
      `${(result.before / 1024).toFixed(0)} KB -> ${(result.after / 1024).toFixed(0)} KB ` +
      `(${result.delta >= 0 ? '+' : ''}${result.delta}%)`,
  )
  console.log(`  inspect: ${path.relative(path.resolve(__dirname, '..'), out)}/`)
  console.log('  (staging dir, gitignored; PEAR_OBFUSCATE=0 for minify only)')
}

module.exports = { hardenCore }

if (require.main === module) {
  previewFromNodeModules().catch((err) => {
    console.error(err.message ?? err)
    process.exit(1)
  })
}
