import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

export function loadEnv() {
  try {
    const appDir = window.electronBridge.getAppDir()
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

const VAULT_KEY_SECRET = 'vaultEncryptionKey'
const VAULT_ENTROPY_SECRET = 'vaultEntropy'

function legacyConfigFile() {
  return path.join(window.electronBridge.getStoragePath(), 'desktop-config.json')
}

// The vault key used to live here in cleartext JSON, right beside the encrypted
// blocks it opens. Read once so an existing install keeps working, then move it
// into the OS keychain and delete the file.
function takeLegacyEncryptionKey() {
  try {
    const configFile = legacyConfigFile()
    if (!fs.existsSync(configFile)) return ''
    const config = JSON.parse(fs.readFileSync(configFile, 'utf-8'))
    return config.encryptionKey || ''
  } catch (e) {
    console.error('Error reading the legacy key file', e)
    return ''
  }
}

function dropLegacyEncryptionKey() {
  try {
    const configFile = legacyConfigFile()
    if (fs.existsSync(configFile)) fs.unlinkSync(configFile)
  } catch (e) {
    console.error('Error removing the legacy key file', e)
  }
}

function readEnvEncryptionKey() {
  try {
    const envPath = path.join(window.electronBridge.getAppDir(), '.env')
    if (!fs.existsSync(envPath)) return ''
    const content = fs.readFileSync(envPath, 'utf-8')
    const line = content.split('\n').find((l) => l.startsWith('PEAR_NOTES_ENCRYPTION_KEY='))
    return line ? line.split('=')[1].trim() : ''
  } catch (e) {
    console.warn('Fallback env check failed', e)
    return ''
  }
}

export function isSecretStoreAvailable() {
  try {
    return window.electronBridge.isSecretStoreAvailable() === true
  } catch {
    return false
  }
}

export function getDbEncryptionKey() {
  try {
    const secure = isSecretStoreAvailable()

    if (secure) {
      const stored = window.electronBridge.getSecret(VAULT_KEY_SECRET)
      if (stored) {
        dropLegacyEncryptionKey()
        return stored
      }
    }

    const key = takeLegacyEncryptionKey() || readEnvEncryptionKey() || crypto.randomBytes(32).toString('hex')

    if (secure && window.electronBridge.setSecret(VAULT_KEY_SECRET, key)) {
      dropLegacyEncryptionKey()
      return key
    }

    // No keychain (a Linux box with no secret service). Keep the old file so
    // the app still opens - writing nothing would lose the vault entirely -
    // and leave `getVaultEntropy` to refuse, so the key on disk stays readable
    // by this build rather than being sealed against a secret we cannot keep.
    console.warn('[secrets] OS keychain unavailable, falling back to the config file')
    const storageDir = window.electronBridge.getStoragePath()
    if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true })
    fs.writeFileSync(legacyConfigFile(), JSON.stringify({ encryptionKey: key }), 'utf-8')
    return key
  } catch (e) {
    // No silent fallback key. A fixed string here would have been a shared,
    // guessable vault key for every device that hit this path.
    console.error('Error in getDbEncryptionKey', e)
    return null
  }
}

export function setDbEncryptionKey(key) {
  try {
    if (!key) return false
    if (isSecretStoreAvailable() && window.electronBridge.setSecret(VAULT_KEY_SECRET, key)) {
      dropLegacyEncryptionKey()
      return true
    }
    const storageDir = window.electronBridge.getStoragePath()
    if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true })
    fs.writeFileSync(legacyConfigFile(), JSON.stringify({ encryptionKey: key }), 'utf-8')
    return true
  } catch (e) {
    console.error('Error in setDbEncryptionKey', e)
    return false
  }
}

// The secret that seals the vault key inside the corestore. It is per device and
// never leaves the keychain, so the storage directory on its own opens nothing.
//
// Returns null when there is no keychain to hold it. The backend then keeps the
// old behaviour rather than sealing the vault against a secret this machine
// cannot store - that would brick it on the next launch.
export function getVaultEntropy() {
  try {
    if (!isSecretStoreAvailable()) return null
    const existing = window.electronBridge.getSecret(VAULT_ENTROPY_SECRET)
    if (existing) return existing
    const entropy = crypto.randomBytes(32).toString('hex')
    return window.electronBridge.setSecret(VAULT_ENTROPY_SECRET, entropy) ? entropy : null
  } catch (e) {
    console.error('Error in getVaultEntropy', e)
    return null
  }
}

export function deleteDbEncryptionKey() {
  try {
    window.electronBridge.deleteSecret(VAULT_KEY_SECRET)
    window.electronBridge.deleteSecret(VAULT_ENTROPY_SECRET)
  } catch (e) {
    console.error('Error clearing the stored secrets', e)
  }
  dropLegacyEncryptionKey()
}
