const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const secretStore = require('./secretStore.cjs')

const VAULT_KEY_SECRET = 'vaultEncryptionKey'
const VAULT_ENTROPY_SECRET = 'vaultEntropy'
const LEGACY_CONFIG_FILE = 'desktop-config.json'
const ENV_KEY_NAME = 'PEAR_NOTES_ENCRYPTION_KEY='

function createVaultKeys({ getStoragePath, getAppDir, isDev }) {
  const legacyConfigFile = () => path.join(getStoragePath(), LEGACY_CONFIG_FILE)

  function takeLegacyEncryptionKey() {
    try {
      const configFile = legacyConfigFile()
      if (!fs.existsSync(configFile)) return ''
      return JSON.parse(fs.readFileSync(configFile, 'utf-8')).encryptionKey || ''
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
    if (!isDev) return ''
    try {
      const envPath = path.join(getAppDir(), '.env')
      if (!fs.existsSync(envPath)) return ''
      const line = fs
        .readFileSync(envPath, 'utf-8')
        .split('\n')
        .find((l) => l.startsWith(ENV_KEY_NAME))
      return line ? line.split('=')[1].trim() : ''
    } catch (e) {
      console.warn('Fallback env check failed', e)
      return ''
    }
  }

  function writeLegacyKey(key) {
    const storageDir = getStoragePath()
    if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true, mode: 0o700 })
    fs.writeFileSync(legacyConfigFile(), JSON.stringify({ encryptionKey: key }), {
      encoding: 'utf-8',
      mode: 0o600
    })
  }

  function getDbEncryptionKey() {
    try {
      const secure = secretStore.isAvailable()
      if (secure) {
        const stored = secretStore.getSecret(VAULT_KEY_SECRET)
        if (stored) {
          dropLegacyEncryptionKey()
          return stored
        }
      }

      const key =
        takeLegacyEncryptionKey() ||
        readEnvEncryptionKey() ||
        crypto.randomBytes(32).toString('hex')

      if (secure && secretStore.setSecret(VAULT_KEY_SECRET, key)) {
        dropLegacyEncryptionKey()
        return key
      }

      console.warn('[secrets] OS keychain unavailable, falling back to the config file')
      writeLegacyKey(key)
      return key
    } catch (e) {
      console.error('Error in getDbEncryptionKey', e)
      return null
    }
  }

  function setDbEncryptionKey(key) {
    try {
      if (!key || typeof key !== 'string') return false
      if (secretStore.isAvailable() && secretStore.setSecret(VAULT_KEY_SECRET, key)) {
        dropLegacyEncryptionKey()
        return true
      }
      writeLegacyKey(key)
      return true
    } catch (e) {
      console.error('Error in setDbEncryptionKey', e)
      return false
    }
  }

  function getVaultEntropy() {
    try {
      if (!secretStore.isAvailable()) return null
      const existing = secretStore.getSecret(VAULT_ENTROPY_SECRET)
      if (existing) return existing
      const entropy = crypto.randomBytes(32).toString('hex')
      return secretStore.setSecret(VAULT_ENTROPY_SECRET, entropy) ? entropy : null
    } catch (e) {
      console.error('Error in getVaultEntropy', e)
      return null
    }
  }

  function deleteDbEncryptionKey() {
    secretStore.deleteSecret(VAULT_KEY_SECRET)
    secretStore.deleteSecret(VAULT_ENTROPY_SECRET)
    dropLegacyEncryptionKey()
  }

  return { getDbEncryptionKey, setDbEncryptionKey, getVaultEntropy, deleteDbEncryptionKey }
}

module.exports = { createVaultKeys }
