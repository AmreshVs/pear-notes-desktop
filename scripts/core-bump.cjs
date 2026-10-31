const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const { checkCorePinRef, compareInstalledCore } = require('./coreInstall.cjs')

const ROOT = path.resolve(__dirname, '..')
const DEPENDENCY = '@pear-notes/core'
const COMMIT_PATHS = ['package.json', 'package-lock.json']
const SOCKET_FIREWALL = '/usr/local/bin/sfw'
const EXACT_VERSION = /^\d+\.\d+\.\d+$/
const args = process.argv.slice(2)
const NO_COMMIT = args.includes('--no-commit')
const LOCK_ONLY = args.includes('--lock-only')
const REQUESTED = args.find((arg) => !arg.startsWith('--')) ?? 'latest'

function abort(message) {
  console.error(`\n  core:bump: ${message}\n`)
  process.exit(1)
}

function run(command, commandArgs, { capture = false } = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit',
    shell: process.platform === 'win32'
  })
  if (result.error) abort(`${command} could not start: ${result.error.message}`)
  return {
    ok: result.status === 0,
    out: (result.stdout || '').trim(),
    err: (result.stderr || '').trim()
  }
}

function install(spec) {
  const npmArgs = ['install', '--save-exact', '--ignore-scripts', '--no-audit', '--no-fund', spec]
  if (LOCK_ONLY) npmArgs.push('--package-lock-only')
  const result = fs.existsSync(SOCKET_FIREWALL)
    ? run(SOCKET_FIREWALL, ['npm', ...npmArgs])
    : run('npm', npmArgs)
  if (!result.ok) abort(`npm install ${spec} failed`)
}

function resolveVersion() {
  if (REQUESTED !== 'latest' && !EXACT_VERSION.test(REQUESTED)) {
    abort(`"${REQUESTED}" is not X.Y.Z or latest`)
  }
  const view = run('npm', ['view', `${DEPENDENCY}@${REQUESTED}`, 'version'], { capture: true })
  const version = view.out.split('\n').pop()
  if (!view.ok || !EXACT_VERSION.test(version ?? '')) {
    abort(`${DEPENDENCY}@${REQUESTED} is not on npm${view.err ? `:\n${view.err}` : ''}`)
  }
  return version
}

function repoGit(gitArgs) {
  return run('git', ['-C', ROOT, ...gitArgs], { capture: true })
}

function commitBlocker() {
  if (NO_COMMIT) return 'skipped (--no-commit)'
  if (!fs.existsSync(path.join(ROOT, '.git'))) return 'this package is not a git checkout'
  const status = repoGit(['status', '--porcelain', '--', ...COMMIT_PATHS])
  if (!status.ok) return 'could not read git status'
  if (status.out) return `${COMMIT_PATHS.join(' / ')} already had uncommitted changes`
  return null
}

function coreDependencies() {
  const file = path.join(ROOT, 'node_modules', DEPENDENCY, 'package.json')
  if (!fs.existsSync(file)) return null
  return JSON.stringify(JSON.parse(fs.readFileSync(file, 'utf8')).dependencies ?? {})
}

function main() {
  const version = resolveVersion()
  const blocker = commitBlocker()
  const previous = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
    .dependencies?.[DEPENDENCY]
  if (!previous) abort(`${DEPENDENCY} is not a dependency of this package`)
  const previousDeps = coreDependencies()

  console.log(`\n  core:bump: ${previous} -> ${version}\n`)
  if (!LOCK_ONLY)
    fs.rmSync(path.join(ROOT, 'node_modules', DEPENDENCY), { recursive: true, force: true })
  install(`${DEPENDENCY}@${version}`)

  for (const check of LOCK_ONLY ? [checkCorePinRef] : [checkCorePinRef, compareInstalledCore]) {
    const { level, detail } = check(ROOT)
    if (level !== 'pass') abort(detail)
  }

  if (!LOCK_ONLY && previousDeps !== coreDependencies()) {
    console.log(
      `\n  core ${version} changed its dependencies - run npm run setup to rebuild native modules before building`
    )
  }

  if (repoGit(['diff', '--quiet', '--', ...COMMIT_PATHS]).ok) {
    console.log(`\n  core:bump: already on ${version}, nothing to commit\n`)
    return
  }
  if (blocker) {
    console.log(`\n  core:bump: not committing - ${blocker}`)
    console.log(`  commit ${COMMIT_PATHS.join(' and ')} together\n`)
    return
  }
  const message = `Bump core to ${version}`
  if (!run('git', ['-C', ROOT, 'commit', '--quiet', '-m', message, '--', ...COMMIT_PATHS]).ok) {
    abort(`commit failed - commit ${COMMIT_PATHS.join(' and ')} by hand`)
  }
  console.log(`\n  core:bump: committed "${message}" - push it before starting the build\n`)
}

main()
