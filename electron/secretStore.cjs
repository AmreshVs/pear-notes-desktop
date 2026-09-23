const { app, safeStorage } = require('electron')
const fs = require('fs')
const path = require('path')

// Secrets that must not sit on disk in the clear: the vault encryption key and
// the entropy that seals it inside the corestore. safeStorage encrypts and
// decrypts against the OS keychain (Keychain, DPAPI, libsecret/kwallet) but does
// not persist anything, so the ciphertext is kept here.
//
// What protects the contents is safeStorage, not the location - the file holds
// ciphertext only. It lives under `userData` rather than the vault's own
// storage directory (`PearNotes/`) so that copying or syncing the vault folder
// does not carry even the sealed key along with it.
const SECRETS_FILE = 'secrets.json'

function secretsPath() {
  return path.join(app.getPath('userData'), SECRETS_FILE)
}

function readAll() {
  try {
    return JSON.parse(fs.readFileSync(secretsPath(), 'utf-8')) || {}
  } catch {
    return {}
  }
}

function writeAll(secrets) {
  const target = secretsPath()
  const temp = target + '.tmp'
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(temp, JSON.stringify(secrets), { mode: 0o600 })
  fs.renameSync(temp, target)
  try {
    fs.chmodSync(target, 0o600)
  } catch {}
}

// False on a Linux box with no keyring available. Callers must degrade rather
// than fail: writing the secret in the clear instead would defeat the point,
// and refusing to start would lock the user out of their own notes.
function isAvailable() {
  try {
    return safeStorage.isEncryptionAvailable()
  } catch {
    return false
  }
}

function getSecret(name) {
  if (!isAvailable()) return null
  const stored = readAll()[name]
  if (!stored) return null
  try {
    return safeStorage.decryptString(Buffer.from(stored, 'base64'))
  } catch (e) {
    console.error('[secrets] could not decrypt', name, e)
    return null
  }
}

function setSecret(name, value) {
  if (!isAvailable() || !value) return false
  try {
    const secrets = readAll()
    secrets[name] = safeStorage.encryptString(value).toString('base64')
    writeAll(secrets)
    return true
  } catch (e) {
    console.error('[secrets] could not store', name, e)
    return false
  }
}

function deleteSecret(name) {
  try {
    const secrets = readAll()
    if (!(name in secrets)) return true
    delete secrets[name]
    writeAll(secrets)
    return true
  } catch (e) {
    console.error('[secrets] could not delete', name, e)
    return false
  }
}

module.exports = { isAvailable, getSecret, setSecret, deleteSecret }
