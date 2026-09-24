const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const CORE_SHIPPED_DIRS = ['backend', 'spec', 'store']

function git(command) {
  try {
    return execSync(`git ${command}`, { stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 26 })
      .toString()
      .trim()
  } catch {
    return null
  }
}

function lockedCoreSha(root) {
  const lockPath = path.join(root, 'package-lock.json')
  if (!fs.existsSync(lockPath)) return null
  return fs.readFileSync(lockPath, 'utf8').match(/pear-notes-core(?:\.git)?#([0-9a-f]{40})/)?.[1]
}

function compareInstalledCore(root) {
  const lockedSha = lockedCoreSha(root)
  const coreRoot = path.resolve(root, '..', 'pear-notes-core')
  const installed = path.join(root, 'node_modules', '@pear-notes', 'core')

  if (!lockedSha) return { level: 'warn', detail: 'package-lock.json pins no core commit' }
  if (!fs.existsSync(installed)) {
    return { level: 'fail', detail: 'node_modules/@pear-notes/core is missing - run npm install' }
  }
  if (fs.lstatSync(installed).isSymbolicLink()) {
    return { level: 'warn', detail: 'node_modules/@pear-notes/core is a local link, not the pin' }
  }
  if (!fs.existsSync(path.join(coreRoot, '.git'))) {
    return { level: 'warn', detail: '../pear-notes-core is not checked out, cannot compare' }
  }

  const short = lockedSha.slice(0, 12)
  const tree = git(`-C "${coreRoot}" ls-tree -r ${lockedSha} -- ${CORE_SHIPPED_DIRS.join(' ')}`)
  if (!tree) return { level: 'warn', detail: `could not read core ${short} (git fetch in core?)` }

  const expected = new Map()
  for (const line of tree.split('\n')) {
    const [meta, file] = line.split('\t')
    expected.set(file, meta.split(' ')[2])
  }
  const present = [...expected.keys()].filter((file) => fs.existsSync(path.join(installed, file)))
  const hashes = git(
    `hash-object ${present.map((file) => `"${path.join(installed, file)}"`).join(' ')}`
  )
  const actual = new Map(present.map((file, i) => [file, hashes?.split('\n')[i]]))
  const stale = [...expected]
    .filter(([file, hash]) => actual.get(file) !== hash)
    .map(([file]) => file)

  if (stale.length > 0) {
    return {
      level: 'fail',
      detail:
        `node_modules/@pear-notes/core does not match the pinned ${short} ` +
        `(${stale.length} file(s) differ, e.g. ${stale[0]}) - run npm run setup`
    }
  }
  return { level: 'pass', detail: `node_modules/@pear-notes/core matches ${short}` }
}

module.exports = { compareInstalledCore }
