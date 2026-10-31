const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const DEPENDENCY = '@pear-notes/core'
const REGISTRY = 'https://registry.npmjs.org/'
const EXACT_VERSION = /^\d+\.\d+\.\d+$/
const LOCAL_CORE_MARKER = '.local-core'

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

function lockedCore(root) {
  return (
    readJson(path.join(root, 'package-lock.json'))?.packages?.[`node_modules/${DEPENDENCY}`] ?? null
  )
}

function checkCorePinRef(root) {
  const spec = readJson(path.join(root, 'package.json'))?.dependencies?.[DEPENDENCY] ?? ''
  if (!EXACT_VERSION.test(spec)) {
    return {
      level: 'fail',
      detail: `package.json asks for core "${spec}", not an exact npm version - run npm run core:bump`
    }
  }
  const locked = lockedCore(root)
  if (!locked)
    return { level: 'fail', detail: 'package-lock.json has no core entry - run npm install' }
  if (locked.version !== spec) {
    return {
      level: 'fail',
      detail: `package.json asks for core ${spec} but the lock has ${locked.version} - run npm run core:bump ${spec}`
    }
  }
  if (!locked.resolved?.startsWith(REGISTRY) || !locked.integrity) {
    return {
      level: 'fail',
      detail: `the lock resolves core ${spec} from ${locked.resolved ?? 'nowhere'}, not the npm registry with an integrity hash`
    }
  }
  return { level: 'pass', detail: `core ${spec} from npm` }
}

function compareInstalledCore(root) {
  const locked = lockedCore(root)
  const installed = path.join(root, 'node_modules', DEPENDENCY)

  if (!locked?.integrity) return { level: 'warn', detail: 'package-lock.json pins no core release' }
  if (!fs.existsSync(installed)) {
    return { level: 'fail', detail: 'node_modules/@pear-notes/core is missing - run npm run setup' }
  }
  if (fs.lstatSync(installed).isSymbolicLink()) {
    return {
      level: 'warn',
      detail: 'node_modules/@pear-notes/core is a local link, not the npm release'
    }
  }
  if (fs.existsSync(path.join(installed, LOCAL_CORE_MARKER))) {
    return {
      level: 'fail',
      detail: `node_modules/@pear-notes/core is a copy of ../pear-notes-core (copy-core) - run npm run setup to get core ${locked.version} back`
    }
  }
  const version = readJson(path.join(installed, 'package.json'))?.version
  if (version !== locked.version) {
    return {
      level: 'fail',
      detail: `node_modules has core ${version} but the lock has ${locked.version} - run npm run setup`
    }
  }
  const integrity = readJson(path.join(root, 'node_modules', '.package-lock.json'))?.packages?.[
    `node_modules/${DEPENDENCY}`
  ]?.integrity
  if (integrity !== locked.integrity) {
    return {
      level: 'fail',
      detail: `node_modules/@pear-notes/core was not installed from the locked ${locked.version} tarball - run npm run setup`
    }
  }
  return { level: 'pass', detail: `node_modules/@pear-notes/core is the locked ${version}` }
}

function checkCorePublished(root) {
  const locked = lockedCore(root)
  if (!locked?.version) return { level: 'fail', detail: 'package-lock.json pins no core release' }
  const view = spawnSync('npm', ['view', `${DEPENDENCY}@${locked.version}`, 'dist.integrity'], {
    cwd: root,
    encoding: 'utf8',
    shell: process.platform === 'win32'
  })
  if (view.status !== 0) {
    return /E404/.test(view.stderr)
      ? { level: 'fail', detail: `core ${locked.version} is not on npm` }
      : { level: 'warn', detail: `could not reach npm to check core ${locked.version}` }
  }
  const published = view.stdout.trim()
  if (!published) return { level: 'fail', detail: `core ${locked.version} is not on npm` }
  if (published !== locked.integrity) {
    return {
      level: 'fail',
      detail: `the lock's integrity for core ${locked.version} does not match npm's - run npm run core:bump ${locked.version}`
    }
  }
  return { level: 'pass', detail: `core ${locked.version} matches npm` }
}

module.exports = { LOCAL_CORE_MARKER, checkCorePinRef, checkCorePublished, compareInstalledCore }
