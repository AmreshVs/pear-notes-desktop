import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const CORE_REPO = 'AmreshVs/pear-notes-core'
const CORE_DEPENDENCY = '@pear-notes/core'
const RELEASE_TAG = /^v\d+\.\d+\.\d+$/
const SEMVER = /^\d+\.\d+\.\d+$/

const NOISE = [
  /^bump\b/i,
  /^release\b/i,
  /^set version\b/i,
  /^merge\b/i,
  /^start (core )?release\b/i,
  /^pear notes core \d/i,
  /\breadme\b/i,
  /\bci\b/i,
  /\bworkflows?\b/i,
  /\blint\b/i,
  /\btests?\b/i,
  /\bdependabot\b/i,
  /^update (the )?dependencies\b/i,
  /^trim comments\b/i,
  /^(move|update) docs\b/i,
  /^(fetch|take) core\b/i,
  /\bout of the repo\b/i,
  /\bpublish\b/i
]

const FIX =
  /^(fix|fixes|fixed|don't|do not|stop|prevent|avoid|guard|repair|restore|recover|handle)\b/i

function git(args, { allowFail = false } = {}) {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  } catch (error) {
    if (allowFail) return null
    throw new Error(`git ${args.join(' ')} failed: ${String(error.stderr || error.message).trim()}`)
  }
}

function gh(args, { allowFail = false } = {}) {
  try {
    return execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  } catch (error) {
    if (allowFail) return null
    throw new Error(`gh ${args.join(' ')} failed: ${String(error.stderr || error.message).trim()}`)
  }
}

export function resolveCommit(ref) {
  for (const candidate of [`refs/tags/${ref}`, ref]) {
    const sha = git(['rev-parse', '--verify', '--quiet', `${candidate}^{commit}`], {
      allowFail: true
    })
    if (sha) return sha
  }
  return null
}

export function previousReleaseTag(to, exclude) {
  const toSha = resolveCommit(to)
  const tags = (
    git(['tag', '--merged', toSha, '--list', 'v*', '--sort=-v:refname'], { allowFail: true }) || ''
  )
    .split('\n')
    .filter((tag) => RELEASE_TAG.test(tag))
  return tags.find((tag) => tag !== exclude && resolveCommit(tag) !== toSha) || null
}

function dedupe(commits) {
  const seen = new Set()
  return commits.filter(({ subject }) => {
    const id = subject.toLowerCase().replace(/[.\s]+$/, '')
    if (!subject || seen.has(id)) return false
    seen.add(id)
    return true
  })
}

function localCommits(fromSha, toSha) {
  const out = git(['log', '--no-merges', '--reverse', '--format=%h%x09%s', `${fromSha}..${toSha}`])
  if (!out) return []
  return dedupe(
    out.split('\n').map((line) => {
      const [sha, ...rest] = line.split('\t')
      return { sha, subject: rest.join('\t').trim() }
    })
  )
}

function classify(commits, all) {
  const changes = []
  const fixes = []
  for (const commit of commits) {
    if (!all && NOISE.some((pattern) => pattern.test(commit.subject))) continue
    ;(FIX.test(commit.subject) ? fixes : changes).push(commit)
  }
  return { changes, fixes }
}

function coreVersionAt(sha) {
  const raw = git(['show', `${sha}:package.json`], { allowFail: true })
  if (!raw) return null
  try {
    const spec = JSON.parse(raw).dependencies?.[CORE_DEPENDENCY]
    if (!spec) return null
    const version = spec.replace(/^[\^~=]/, '')
    if (SEMVER.test(version)) return version
    return spec.match(/#([0-9a-f]{7,40})$/)?.[1] ?? null
  } catch {
    return null
  }
}

function coreCommits(from, to) {
  const out = gh(
    [
      'api',
      `repos/${CORE_REPO}/compare/${from}...${to}`,
      '--jq',
      '.commits[] | [.sha[0:7], (.commit.message | split("\n")[0])] | @tsv'
    ],
    { allowFail: true }
  )
  if (out === null) return null
  if (!out) return []
  return dedupe(
    out
      .split('\n')
      .filter((line) => !/^\S+\tMerge /.test(line))
      .map((line) => {
        const [sha, ...rest] = line.split('\t')
        return { sha, subject: rest.join('\t').trim() }
      })
  )
}

export function buildChangelog({ repo, from, to = 'HEAD', exclude, all = false }) {
  const fromRef = from || previousReleaseTag(to, exclude)
  if (!fromRef) throw new Error(`No earlier v* release tag before ${to}; pass a starting point`)
  const fromSha = resolveCommit(fromRef)
  const toSha = resolveCommit(to)
  if (!fromSha) throw new Error(`Cannot find ${fromRef}`)
  if (!toSha) throw new Error(`Cannot find ${to}`)

  const log = {
    repo,
    from: fromRef,
    to,
    fromSha,
    toSha,
    ...classify(localCommits(fromSha, toSha), all),
    core: null
  }
  const coreFrom = coreVersionAt(fromSha)
  const coreTo = coreVersionAt(toSha)
  if (coreFrom && coreTo && coreFrom !== coreTo) {
    const commits = coreCommits(coreFrom, coreTo)
    log.core = {
      from: coreFrom,
      to: coreTo,
      missing: commits === null,
      ...classify(commits || [], all)
    }
  }
  return log
}

function item(repo, { sha, subject }) {
  return `- ${subject} ([${sha}](https://github.com/${repo}/commit/${sha}))`
}

export function renderChangelog(log, { heading = '###' } = {}) {
  const lines = []
  const section = (title, repo, commits) => {
    if (commits.length)
      lines.push(`${heading} ${title}`, '', ...commits.map((c) => item(repo, c)), '')
  }
  section('Changes', log.repo, log.changes)
  section('Fixes', log.repo, log.fixes)
  if (!log.changes.length && !log.fixes.length) lines.push('No user-facing changes.', '')
  if (log.core) {
    lines.push(`${heading} Core ${log.core.from} → ${log.core.to}`, '')
    const commits = [...log.core.changes, ...log.core.fixes]
    if (log.core.missing) lines.push('Could not read the core commits for this range.', '')
    else if (!commits.length) lines.push('No user-facing changes.', '')
    else lines.push(...commits.map((c) => item(CORE_REPO, c)), '')
  }
  lines.push(
    `**Full diff:** https://github.com/${log.repo}/compare/${log.fromSha.slice(0, 12)}...${log.toSha.slice(0, 12)}`
  )
  return lines.join('\n')
}

function parseArgs(argv) {
  const args = { to: 'HEAD', all: false }
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]
    const value = () => {
      const next = argv[++i]
      if (next === undefined) throw new Error(`${flag} needs a value`)
      return next
    }
    if (flag === '--from') args.from = value() || undefined
    else if (flag === '--to') args.to = value() || 'HEAD'
    else if (flag === '--repo') args.repo = value()
    else if (flag === '--title') args.title = value()
    else if (flag === '--exclude') args.exclude = value() || undefined
    else if (flag === '--bare') args.bare = true
    else if (flag === '--out') args.out = value()
    else if (flag === '--all') args.all = true
    else throw new Error(`Unknown option ${flag}`)
  }
  return args
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = parseArgs(process.argv.slice(2))
    const repo = args.repo || process.env.GITHUB_REPOSITORY
    if (!repo) throw new Error('Pass --repo owner/name or set GITHUB_REPOSITORY')
    const log = buildChangelog({ ...args, repo })
    const title = args.title || `Changes from ${log.from} to ${log.to}`
    const markdown = args.bare
      ? `${renderChangelog(log, { heading: '####' })}\n`
      : `## ${title}\n\n${renderChangelog(log)}\n`
    if (args.out) fs.writeFileSync(args.out, markdown)
    else process.stdout.write(markdown)
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}
