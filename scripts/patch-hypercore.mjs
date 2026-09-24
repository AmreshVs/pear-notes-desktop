import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export const UNGUARDED = '    while (this.atomized.flushing) await this.atomized.flushed()'
export const GUARDED =
  '    while (this.atomized && this.atomized.flushing) await this.atomized.flushed()'
const UNGUARDED_SHAPE = /while \(this\.atomized\.flushing\)/

function packageDirs(nodeModules) {
  if (!fs.existsSync(nodeModules)) return []
  const dirs = []
  for (const name of fs.readdirSync(nodeModules)) {
    if (name.startsWith('.')) continue
    const full = path.join(nodeModules, name)
    if (name.startsWith('@')) {
      if (!fs.statSync(full).isDirectory()) continue
      for (const scoped of fs.readdirSync(full)) dirs.push(path.join(full, scoped))
    } else {
      dirs.push(full)
    }
  }
  return dirs
}

export function findHypercoreFiles(root) {
  const seen = new Set()
  const found = []
  const visit = (dir) => {
    for (const pkg of packageDirs(path.join(dir, 'node_modules'))) {
      let real
      try {
        real = fs.realpathSync(pkg)
      } catch {
        continue
      }
      if (seen.has(real) || !fs.statSync(real).isDirectory()) continue
      seen.add(real)
      const target = path.join(real, 'lib', 'session-state.js')
      if (path.basename(pkg) === 'hypercore' && fs.existsSync(target)) found.push(target)
      visit(real)
    }
  }
  visit(root)
  return found
}

export function hypercoreFileState(source) {
  if (source.includes(GUARDED)) return 'patched'
  if (source.includes(UNGUARDED)) return 'unpatched'
  if (UNGUARDED_SHAPE.test(source)) return 'unknown'
  return 'unaffected'
}

export function patchHypercore(root) {
  const files = findHypercoreFiles(root)
  if (files.length === 0) throw new Error(`No hypercore found under ${root}/node_modules`)
  return files.map((file) => {
    const source = fs.readFileSync(file, 'utf8')
    const state = hypercoreFileState(source)
    if (state === 'unknown') {
      throw new Error(
        `hypercore changed shape in ${file}. Update scripts/patch-hypercore.mjs, or drop it if upstream fixed the null atom.`
      )
    }
    if (state === 'unpatched') fs.writeFileSync(file, source.replace(UNGUARDED, GUARDED))
    return { file, state: state === 'unpatched' ? 'fixed' : state }
  })
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const results = patchHypercore(path.resolve(process.argv[2] || projectRoot))
    for (const { file, state } of results) console.log(`[patch-hypercore] ${state}: ${file}`)
  } catch (err) {
    console.error(`[patch-hypercore] ${err.message}`)
    process.exit(1)
  }
}
