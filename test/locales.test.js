import test from 'brittle'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const srcDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src')
const en = JSON.parse(fs.readFileSync(path.join(srcDir, 'locales', 'en.json'), 'utf8'))

const hasKey = (key) => {
  let node = en
  for (const part of key.split('.')) {
    if (node === null || typeof node !== 'object') return false
    node = node[part] ?? node[`${part}_one`] ?? node[`${part}_other`]
    if (node === undefined) return false
  }
  return true
}

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return entry.name === 'locales' ? [] : sourceFiles(full)
    return /\.(jsx?|tsx?)$/.test(entry.name) ? [full] : []
  })
}

test('every translation key used in the code exists in en.json', (t) => {
  const missing = []
  for (const file of sourceFiles(srcDir)) {
    const source = fs.readFileSync(file, 'utf8')
    for (const match of source.matchAll(/\bt\(\s*'([a-zA-Z][\w.]*\.[\w.]+)'/g)) {
      const key = match[1]
      if (key.endsWith('_')) continue
      if (!hasKey(key)) missing.push(`${key} (${path.relative(srcDir, file)})`)
    }
  }
  t.alike(missing, [])
})

test('no translation is empty', (t) => {
  const empty = []
  const walk = (node, trail) => {
    for (const [key, value] of Object.entries(node)) {
      if (typeof value === 'object' && value !== null) walk(value, `${trail}${key}.`)
      else if (typeof value === 'string' && value.trim() === '') empty.push(`${trail}${key}`)
    }
  }
  walk(en, '')
  t.alike(empty, [])
})
