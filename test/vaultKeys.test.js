import test from 'brittle'
import fs from 'node:fs'
import path from 'node:path'

import { loadFresh } from './helpers/cjsMocks.js'
import { installFakeElectron } from './helpers/fakeElectron.js'

function setup({ isDev = false } = {}) {
  const env = installFakeElectron()
  const secretStore = loadFresh('../electron/secretStore.cjs')
  const { createVaultKeys } = loadFresh('../electron/vaultKeys.cjs')
  const storage = path.join(env.userData, 'storage')
  const appDir = path.join(env.userData, 'app')
  fs.mkdirSync(appDir, { recursive: true })
  const keys = createVaultKeys({ getStoragePath: () => storage, getAppDir: () => appDir, isDev })
  const legacyFile = path.join(storage, 'desktop-config.json')
  return { env, secretStore, keys, storage, appDir, legacyFile }
}

const quiet = (run) => {
  const warn = console.warn
  console.warn = () => {}
  try {
    return run()
  } finally {
    console.warn = warn
  }
}

test('first launch makes a key, keeps it in the keychain and returns the same one next time', (t) => {
  const { env, secretStore, keys, legacyFile } = setup()
  const key = keys.getDbEncryptionKey()
  t.ok(/^[0-9a-f]{64}$/.test(key))
  t.is(secretStore.getSecret('vaultEncryptionKey'), key)
  t.absent(fs.existsSync(legacyFile), 'nothing left in a plain file')
  t.is(keys.getDbEncryptionKey(), key)
  env.cleanup()
})

test('an older plain-file key moves into the keychain and the file is removed', (t) => {
  const { env, secretStore, keys, storage, legacyFile } = setup()
  fs.mkdirSync(storage, { recursive: true })
  fs.writeFileSync(legacyFile, JSON.stringify({ encryptionKey: 'old-key' }))
  t.is(keys.getDbEncryptionKey(), 'old-key')
  t.is(secretStore.getSecret('vaultEncryptionKey'), 'old-key')
  t.absent(fs.existsSync(legacyFile))
  env.cleanup()
})

test('without a keychain the key falls back to a private file and stays stable', (t) => {
  const { env, keys, legacyFile } = setup()
  env.safe.available = false
  const key = quiet(() => keys.getDbEncryptionKey())
  t.ok(fs.existsSync(legacyFile))
  t.is(JSON.parse(fs.readFileSync(legacyFile, 'utf-8')).encryptionKey, key)
  if (process.platform !== 'win32') t.is(fs.statSync(legacyFile).mode & 0o777, 0o600)
  t.is(
    quiet(() => keys.getDbEncryptionKey()),
    key
  )
  env.cleanup()
})

test('a key set by the user replaces the stored one, bad keys are refused', (t) => {
  const { env, secretStore, keys } = setup()
  t.is(keys.setDbEncryptionKey('new-key'), true)
  t.is(secretStore.getSecret('vaultEncryptionKey'), 'new-key')
  t.is(keys.setDbEncryptionKey(''), false)
  t.is(keys.setDbEncryptionKey(42), false)
  t.is(keys.getDbEncryptionKey(), 'new-key')
  env.cleanup()
})

test('the development .env key is only used in development builds', (t) => {
  const dev = setup({ isDev: true })
  fs.writeFileSync(path.join(dev.appDir, '.env'), 'OTHER=1\nPEAR_NOTES_ENCRYPTION_KEY=from-env\n')
  t.is(dev.keys.getDbEncryptionKey(), 'from-env')
  dev.env.cleanup()

  const prod = setup({ isDev: false })
  fs.writeFileSync(path.join(prod.appDir, '.env'), 'PEAR_NOTES_ENCRYPTION_KEY=from-env\n')
  t.not(prod.keys.getDbEncryptionKey(), 'from-env')
  prod.env.cleanup()
})

test('vault entropy is stable and absent without a keychain', (t) => {
  const { env, keys } = setup()
  const entropy = keys.getVaultEntropy()
  t.ok(/^[0-9a-f]{64}$/.test(entropy))
  t.is(keys.getVaultEntropy(), entropy)
  env.safe.available = false
  t.is(keys.getVaultEntropy(), null)
  env.cleanup()
})

test('removing the vault key also removes entropy, biometric keys and the plain file', (t) => {
  const { env, secretStore, keys, storage, legacyFile } = setup()
  keys.getDbEncryptionKey()
  keys.getVaultEntropy()
  secretStore.setSecret('lockRoot:vault1', 'root')
  fs.mkdirSync(storage, { recursive: true })
  fs.writeFileSync(legacyFile, '{}')

  keys.deleteDbEncryptionKey()

  t.is(secretStore.getSecret('vaultEncryptionKey'), null)
  t.is(secretStore.getSecret('vaultEntropy'), null)
  t.is(secretStore.getSecret('lockRoot:vault1'), null)
  t.absent(fs.existsSync(legacyFile))
  env.cleanup()
})
