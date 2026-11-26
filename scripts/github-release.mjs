import fs from 'node:fs'
import path from 'node:path'

const SEMVER = /\d+\.\d+\.\d+/
const FILE_PREFIX = 'pear-notes'

const LINKS = {
  macAppStore: 'https://apps.apple.com/app/id6803519182',
  microsoftStore: 'https://apps.microsoft.com/detail/9plcvqthftqj',
  googlePlay: 'https://play.google.com/store/apps/details?id=com.amreshvs.pearnotes',
  iosAppStore: 'https://apps.apple.com/app/id6803172019'
}

const APPS = {
  desktop: {
    assets: [
      { id: 'dmg', artifact: /-macos-arm64$/, ext: '.dmg', suffix: 'macos-arm64' },
      { id: 'deb', artifact: /-linux-x64$/, ext: '.deb', suffix: 'linux-x64' },
      { id: 'rpm', artifact: /-linux-x64$/, ext: '.rpm', suffix: 'linux-x64' }
    ],
    versionFromArtifact: /^PearNotes-(\d+\.\d+\.\d+)-/,
    downloads(files) {
      const rows = [
        `| macOS (Apple silicon) | [App Store](${LINKS.macAppStore}) |`,
        `| Windows | [Microsoft Store](${LINKS.microsoftStore}) |`
      ]
      if (files.dmg) rows.push(`| macOS (Apple silicon) | \`${files.dmg}\` below |`)
      const linux = [
        files.deb && `\`${files.deb}\` (Debian, Ubuntu)`,
        files.rpm && `\`${files.rpm}\` (Fedora, RHEL)`
      ]
      if (linux.some(Boolean)) rows.push(`| Linux | ${linux.filter(Boolean).join(' or ')} below |`)
      const lines = ['### Downloads', '', '| Platform | Get it |', '| --- | --- |', ...rows]
      if (files.dmg) {
        lines.push(
          '',
          '### Installing on Mac',
          `1. Open \`${files.dmg}\` and drag Pear Notes into Applications.`,
          '2. Open it from Applications. The app is signed and notarized by Apple.',
          '',
          'Already using Pear Notes from the Mac App Store? This build uses the same vault, so your notes are already there.'
        )
      }
      return lines
    }
  },
  mobile: {
    assets: [
      { id: 'apk', artifact: /^pear-notes-android-apk$/, ext: '.apk', suffix: 'android-arm64' }
    ],
    versionFromArtifact: null,
    downloads(files) {
      const rows = [`| Android | [Google Play](${LINKS.googlePlay}) |`]
      if (files.apk) rows.push(`| Android (arm64 APK) | \`${files.apk}\` below |`)
      rows.push(`| iOS | [App Store](${LINKS.iosAppStore}) |`)
      return ['### Downloads', '', '| Platform | Get it |', '| --- | --- |', ...rows]
    }
  }
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? listFiles(full) : [full]
  })
}

function artifactName(artifactsDir, file) {
  return path.relative(artifactsDir, file).split(path.sep)[0]
}

export function detectVersion(app, artifactsDir) {
  const names = new Set()
  for (const file of listFiles(artifactsDir)) {
    names.add(artifactName(artifactsDir, file))
    names.add(path.basename(file))
  }
  for (const name of names) {
    const match = app.versionFromArtifact ? name.match(app.versionFromArtifact) : null
    if (match) return match[1]
  }
  for (const name of names) {
    const match = name.match(SEMVER)
    if (match && /^pear[ ._-]?notes/i.test(name)) return match[0]
  }
  return null
}

export function collectAssets(app, artifactsDir, version) {
  const files = listFiles(artifactsDir)
  const picked = []
  for (const asset of app.assets) {
    const matches = files.filter(
      (file) =>
        file.toLowerCase().endsWith(asset.ext) &&
        asset.artifact.test(artifactName(artifactsDir, file))
    )
    if (matches.length > 1) {
      throw new Error(
        `More than one ${asset.ext} file in the artifacts: ${matches.map((f) => path.basename(f)).join(', ')}`
      )
    }
    if (matches.length) {
      picked.push({
        ...asset,
        source: matches[0],
        name: `${FILE_PREFIX}-${version}-${asset.suffix}${asset.ext}`
      })
    }
  }
  return picked
}

export function renderBody(app, { whatsNew, changelog, files }) {
  const byId = Object.fromEntries(files.map((file) => [file.id, file.name]))
  const lines = [
    '## Pear Notes',
    '',
    "### What's new",
    '',
    (whatsNew || changelog || '').trim(),
    '',
    '---',
    '',
    ...app.downloads(byId)
  ]
  if (whatsNew && changelog) {
    lines.push(
      '',
      '<details>',
      '<summary>All changes</summary>',
      '',
      changelog.trim(),
      '',
      '</details>'
    )
  }
  return `${lines.join('\n')}\n`
}

function readOptional(file) {
  return file && fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''
}

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]
    if (flag === '--print-version') {
      args.printVersion = true
      continue
    }
    const next = argv[++i]
    if (next === undefined) throw new Error(`${flag} needs a value`)
    const key = flag.replace(/^--/, '').replace(/-(\w)/g, (_, c) => c.toUpperCase())
    if (
      ![
        'app',
        'artifacts',
        'out',
        'body',
        'version',
        'fallbackVersion',
        'notes',
        'changelog'
      ].includes(key)
    ) {
      throw new Error(`Unknown option ${flag}`)
    }
    args[key] = next
  }
  return args
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const app = APPS[args.app]
  if (!app) throw new Error('Pass --app desktop or --app mobile')
  if (!args.artifacts) throw new Error('Pass --artifacts <dir>')

  const version = args.version || detectVersion(app, args.artifacts) || args.fallbackVersion
  if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error('Could not tell the version from the artifacts; set the version input')
  }
  if (args.printVersion) {
    console.log(version)
    return
  }
  if (!args.out || !args.body) throw new Error('Pass --out <dir> and --body <file>')

  const files = collectAssets(app, args.artifacts, version)
  fs.mkdirSync(args.out, { recursive: true })
  for (const file of files) fs.copyFileSync(file.source, path.join(args.out, file.name))

  const body = renderBody(app, {
    whatsNew: readOptional(args.notes),
    changelog: readOptional(args.changelog),
    files
  })
  fs.writeFileSync(args.body, body)
  console.log(JSON.stringify({ version, files: files.map((file) => file.name) }))
}

try {
  main()
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
