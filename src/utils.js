/** @typedef {import('pear-interface')} */ /* global Pear */
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

export function loadEnv() {
  try {
    const appDir = window.bridge.getAppDir()
    const envPath = path.join(appDir, '.env')
    if (!fs.existsSync(envPath)) return {}
    const content = fs.readFileSync(envPath, 'utf-8')
    return content.split('\n').reduce((acc, line) => {
      const [key, ...value] = line.split('=')
      if (key && value.length > 0) {
        acc[key.trim()] = value.join('=').trim()
      }
      return acc
    }, {})
  } catch (e) {
    console.error('Error loading .env', e)
    return {}
  }
}

export function getDbEncryptionKey() {
  try {
    const storageDir = Pear.app.storage
    const configFile = path.join(storageDir, 'desktop-config.json')

    if (fs.existsSync(configFile)) {
      const config = JSON.parse(fs.readFileSync(configFile, 'utf-8'))
      if (config.encryptionKey) {
        return config.encryptionKey
      }
    }

    let key = ''
    try {
      const appDir = Pear?.app?.dir || (window.bridge ? window.bridge.getAppDir() : '')
      const envPath = path.join(appDir, '.env')
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8')
        const envKey = content.split('\n').find(line => line.startsWith('PEAR_NOTES_ENCRYPTION_KEY='))
        if (envKey) {
          key = envKey.split('=')[1].trim()
        }
      }
    } catch (e) {
      console.warn('Fallback env check failed', e)
    }

    if (!key) {
      key = crypto.randomBytes(32).toString('hex')
    }

    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true })
    }
    fs.writeFileSync(configFile, JSON.stringify({ encryptionKey: key }), 'utf-8')
    return key
  } catch (e) {
    console.error('Error in getDbEncryptionKey', e)
    return 'amresh'
  }
}

export function deleteDbEncryptionKey() {
  try {
    const storageDir = Pear.app.storage
    const configFile = path.join(storageDir, 'desktop-config.json')
    if (fs.existsSync(configFile)) {
      fs.unlinkSync(configFile)
    }
  } catch (e) {
    console.error('Error in deleteDbEncryptionKey', e)
  }
}

