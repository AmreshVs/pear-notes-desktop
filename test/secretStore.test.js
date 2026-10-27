import test from 'brittle'
import fs from 'node:fs'

import { loadFresh } from './helpers/cjsMocks.js'
import { installFakeElectron, withPlatform } from './helpers/fakeElectron.js'

function setup() {
  const env = installFakeElectron()
  const store = loadFresh('../electron/secretStore.cjs')
  return { env, store }
}

test('secrets are stored sealed and read back', (t) => {
  const { env, store } = setup()
  t.is(store.setSecret('vaultKey', 'super-secret'), true)
  t.is(store.getSecret('vaultKey'), 'super-secret')
  t.absent(
    fs.readFileSync(env.secretsFile, 'utf-8').includes('super-secret'),
    'never plain on disk'
  )
  env.cleanup()
})

test('secrets file is private to the user', (t) => {
  if (process.platform === 'win32') return t.pass('no file modes on Windows')
  const { env, store } = setup()
  store.setSecret('a', 'b')
  t.is(fs.statSync(env.secretsFile).mode & 0o777, 0o600)
  env.cleanup()
})

test('nothing is stored or returned when the OS keychain is unavailable', (t) => {
  const { env, store } = setup()
  store.setSecret('a', 'b')
  env.safe.available = false
  t.is(store.isAvailable(), false)
  t.is(store.getSecret('a'), null)
  t.is(store.setSecret('c', 'd'), false)
  env.cleanup()
})

test('Linux without a real keyring counts as unavailable', (t) => {
  const { env, store } = setup()
  withPlatform('linux', () => {
    env.safe.backend = 'basic_text'
    t.is(store.isAvailable(), false)
    env.safe.backend = 'unknown'
    t.is(store.isAvailable(), false)
    env.safe.backend = 'kwallet6'
    t.is(store.isAvailable(), true)
  })
  env.cleanup()
})

test('empty values and unreadable secrets are refused', (t) => {
  const { env, store } = setup()
  t.is(store.setSecret('a', ''), false)
  t.is(store.getSecret('missing'), null)
  fs.writeFileSync(
    env.secretsFile,
    JSON.stringify({ broken: Buffer.from('garbage').toString('base64') })
  )
  const log = console.error
  console.error = () => {}
  t.is(store.getSecret('broken'), null)
  console.error = log
  env.cleanup()
})

test('a damaged secrets file starts empty instead of crashing', (t) => {
  const { env, store } = setup()
  fs.writeFileSync(env.secretsFile, '{not json')
  t.is(store.getSecret('a'), null)
  t.is(store.setSecret('a', 'b'), true)
  t.is(store.getSecret('a'), 'b')
  env.cleanup()
})

test('deleting one secret or all with a prefix leaves the rest', (t) => {
  const { env, store } = setup()
  store.setSecret('lockRoot:one', '1')
  store.setSecret('lockRoot:two', '2')
  store.setSecret('vaultKey', 'k')

  t.is(store.deleteSecret('lockRoot:one'), true)
  t.is(store.getSecret('lockRoot:one'), null)
  t.is(store.getSecret('lockRoot:two'), '2')

  t.is(store.deleteSecretsWithPrefix(store.LOCK_ROOT_SECRET_PREFIX), true)
  t.is(store.getSecret('lockRoot:two'), null)
  t.is(store.getSecret('vaultKey'), 'k')
  t.is(store.deleteSecret('never-existed'), true)
  env.cleanup()
})
