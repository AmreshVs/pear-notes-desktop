const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Mirrors pear-notes-mobile/scripts/pin-core.js: rewrite the @pear-notes/core
// dependency from the local `file:../pear-notes-core` symlink (or an older
// pinned sha) to `github:<slug>#<current core HEAD>`, so a release build ships
// exactly the committed-and-pushed core rather than whatever happens to be in
// the sibling working tree. Refuses to pin when core is dirty or its HEAD is
// unpushed, and commits the resulting pin itself so a release is never built
// from an uncommitted lockfile - pass --no-commit to skip that.

const ROOT = path.resolve(__dirname, '..')
const CORE_ROOT = path.resolve(ROOT, '..', 'pear-notes-core')
const DEPENDENCY = '@pear-notes/core'
const COMMIT_PATHS = ['package.json', 'package-lock.json']
const NO_COMMIT = process.argv.slice(2).includes('--no-commit')

function installPinnedCore() {
  fs.rmSync(path.join(ROOT, 'node_modules', DEPENDENCY), { recursive: true, force: true })
  execSync('npm install --no-audit --no-fund', { cwd: ROOT, stdio: 'inherit' })
}

function abort(message) {
  console.error(`\n  pin-core: ${message}\n`)
  process.exit(1)
}

function coreGit(command) {
  try {
    return execSync(`git -C "${CORE_ROOT}" ${command}`, {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim()
  } catch {
    return null
  }
}

function repoGit(command, { inherit = false } = {}) {
  try {
    const out = execSync(`git -C "${ROOT}" ${command}`, {
      stdio: inherit ? 'inherit' : ['ignore', 'pipe', 'ignore'],
    })
    return inherit ? '' : out.toString().trim()
  } catch {
    return null
  }
}

function commitBlocker() {
  if (NO_COMMIT) return 'skipped (--no-commit)'
  if (!fs.existsSync(path.join(ROOT, '.git'))) return 'this package is not a git checkout'
  const dirty = repoGit(`status --porcelain -- ${COMMIT_PATHS.join(' ')}`)
  if (dirty === null) return 'could not read git status'
  if (dirty) return `${COMMIT_PATHS.join(' / ')} already had uncommitted changes`
  return null
}

function commitPin(sha) {
  const message = `Bump core to ${sha.slice(0, 12)}`
  const committed = repoGit(`commit -m "${message}" -- ${COMMIT_PATHS.join(' ')}`, { inherit: true })
  if (committed === null) {
    console.log(`\n  pin-core: commit failed - commit ${COMMIT_PATHS.join(' and ')} by hand\n`)
    return false
  }
  console.log(`\n  pin-core: committed "${message}"`)
  return true
}

function readPackageJson() {
  const file = path.join(ROOT, 'package.json')
  return { file, json: JSON.parse(fs.readFileSync(file, 'utf8')) }
}

function slugFromString(value) {
  // Accepts `github:owner/repo`, a bare `owner/repo`, or a git URL like
  // `git+https://github.com/owner/repo.git`.
  const match = String(value).match(/(?:github\.com[/:]|github:)?([\w.-]+\/[\w.-]+?)(?:\.git)?(?:#.*)?$/)
  const slug = match && match[1]
  if (!slug || !/^[\w.-]+\/[\w.-]+$/.test(slug)) return null
  // Reject path-traversal segments (e.g. a `file:../pear-notes-core` spec) -
  // a GitHub owner/repo is never `.` or `..`.
  if (slug.split('/').some((segment) => segment === '.' || segment === '..')) return null
  return slug
}

function resolveSlug(currentSpec) {
  // Prefer the slug already in the dependency spec (a re-pin); otherwise fall
  // back to core's own repository url (the first pin, from `file:`).
  if (currentSpec && currentSpec.startsWith('github:')) {
    const slug = slugFromString(currentSpec)
    if (slug) return slug
  }

  const corePkg = path.join(CORE_ROOT, 'package.json')
  if (fs.existsSync(corePkg)) {
    const url = JSON.parse(fs.readFileSync(corePkg, 'utf8')).repository?.url
    const slug = url && slugFromString(url)
    if (slug) return slug
  }

  abort(`cannot derive a GitHub slug for ${DEPENDENCY} - set core's repository.url or pin by hand`)
}

function main() {
  if (!fs.existsSync(path.join(CORE_ROOT, '.git'))) {
    abort(`${CORE_ROOT} is not a git checkout - clone pear-notes-core next to this repo`)
  }

  const dirty = coreGit('status --porcelain')
  if (dirty) {
    abort(
      `pear-notes-core has ${dirty.split('\n').length} uncommitted file(s) - a pinned build ` +
        'installs core from a commit, so commit and push them before pinning',
    )
  }

  const sha = coreGit('rev-parse HEAD')
  if (!sha) abort('could not read pear-notes-core HEAD')

  if (!coreGit(`branch -r --contains ${sha}`)) {
    abort(`core ${sha.slice(0, 12)} is not on any remote branch - push pear-notes-core first`)
  }

  const blocker = commitBlocker()

  const { file, json } = readPackageJson()
  const previous = json.dependencies?.[DEPENDENCY]
  if (!previous) abort(`${DEPENDENCY} is not a dependency of this package`)

  const pinned = `github:${resolveSlug(previous)}#${sha}`
  if (previous === pinned) {
    console.log(`\n  pin-core: already pinned to ${sha.slice(0, 12)}, refreshing the installed copy\n`)
    installPinnedCore()
    return
  }

  json.dependencies[DEPENDENCY] = pinned
  fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`)

  installPinnedCore()

  console.log(`\n  pin-core: ${DEPENDENCY} pinned to ${sha.slice(0, 12)} (was ${previous})`)

  if (blocker) {
    console.log(`  not committing - ${blocker}`)
    console.log(`  commit ${COMMIT_PATHS.join(' and ')} together`)
  } else if (commitPin(sha)) {
    console.log('  push it before starting the build')
  }

  console.log(`  to return to local development: set ${DEPENDENCY} back to "file:../pear-notes-core" and npm install\n`)
}

main()
