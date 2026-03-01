/** @typedef {import('pear-interface')} */ /* global Pear */
import fs from 'fs'
import path from 'path'

export function loadEnv() {
  try {
    const envPath = path.join(Pear.app.dir, '.env')
    if (!fs.existsSync(envPath)) return {}
    const content = fs.readFileSync(envPath, 'utf-8')
    return content.split('\n').reduce((acc, line) => {
      const [key, ...value] = line.split('=')
      if (key && (value.length > 0)) {
        acc[key.trim()] = value.join('=').trim()
      }
      return acc
    }, {})
  } catch (e) {
    console.error('Error loading .env', e)
    return {}
  }
}
