import test from 'brittle'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { createLockRoot } = require('../electron/lockRoot.cjs')

const LOCK_ROOT_SECRET_PREFIX = 'lockRoot:'

function fakeSecretStore({ available = true } = {}) {
  const secrets = new Map()
  return {
    secrets,
    LOCK_ROOT_SECRET_PREFIX,
    isAvailable: () => available,
    getSecret: (name) => secrets.get(name) ?? null,
    setSecret: (name, value) => {
      if (!available || !value) return false
      secrets.set(name, value)
      return true
    },
    deleteSecret: (name) => secrets.delete(name) || true
  }
}

function fakeDeviceAuth({ supported = true, allow = true, fail = false } = {}) {
  const calls = []
  return {
    calls,
    isSupported: () => supported,
    authenticate: async (reason, handle) => {
      calls.push([reason, handle])
      if (fail) throw new Error('native failure')
      return allow
    }
  }
}

const quiet = async (run) => {
  const log = console.error
  console.error = () => {}
  try {
    return await run()
  } finally {
    console.error = log
  }
}

const build = (options = {}) => {
  const secretStore = options.secretStore ?? fakeSecretStore()
  const deviceAuth = 'deviceAuth' in options ? options.deviceAuth : fakeDeviceAuth()
  const lockRoot = createLockRoot({
    deviceAuth,
    secretStore,
    getWindowHandle: () => 'window-handle',
    platform: options.platform ?? 'darwin'
  })
  return { lockRoot, secretStore, deviceAuth }
}

test('biometric unlock is supported with device auth and a keychain', (t) => {
  t.is(build().lockRoot.isSupported(), true)
})

test('biometric unlock is not offered on Linux, without the addon, or without a keychain', (t) => {
  t.is(build({ platform: 'linux' }).lockRoot.isSupported(), false)
  t.is(build({ deviceAuth: null }).lockRoot.isSupported(), false)
  t.is(build({ deviceAuth: fakeDeviceAuth({ supported: false }) }).lockRoot.isSupported(), false)
  t.is(build({ secretStore: fakeSecretStore({ available: false }) }).lockRoot.isSupported(), false)
})

test('vault ids are cleaned before they become secret names', (t) => {
  const { lockRoot } = build()
  t.is(lockRoot.secretName('vault-1'), 'lockRoot:vault-1')
  t.is(lockRoot.secretName('../../etc/passwd'), 'lockRoot:....etcpasswd')
  t.is(lockRoot.secretName('///'), null)
  t.is(lockRoot.secretName(''), null)
  t.is(lockRoot.secretName(42), null)
})

test('the saved key is only released after the user authenticates', async (t) => {
  const { lockRoot, secretStore, deviceAuth } = build()
  secretStore.secrets.set('lockRoot:v1', 'root-key')
  t.alike(await lockRoot.read('v1', 'Unlock notes'), { cancelled: false, rootKey: 'root-key' })
  t.alike(deviceAuth.calls, [['Unlock notes', 'window-handle']])
})

test('declining or failing authentication never reveals the key', async (t) => {
  const declined = build({ deviceAuth: fakeDeviceAuth({ allow: false }) })
  declined.secretStore.secrets.set('lockRoot:v1', 'root-key')
  t.alike(await declined.lockRoot.read('v1', 'Unlock'), { cancelled: true, rootKey: '' })

  const failing = build({ deviceAuth: fakeDeviceAuth({ fail: true }) })
  failing.secretStore.secrets.set('lockRoot:v1', 'root-key')
  t.alike(await quiet(() => failing.lockRoot.read('v1', 'Unlock')), {
    cancelled: true,
    rootKey: ''
  })
})

test('reading is refused for bad vault ids and unsupported setups, without prompting', async (t) => {
  const { lockRoot, deviceAuth } = build()
  t.alike(await lockRoot.read('///', 'Unlock'), { cancelled: true, rootKey: '' })
  const unsupported = build({ platform: 'linux' })
  t.alike(await unsupported.lockRoot.read('v1', 'Unlock'), { cancelled: true, rootKey: '' })
  t.is(deviceAuth.calls.length, 0)
  t.is(unsupported.deviceAuth.calls.length, 0)
})

test('a missing saved key reads as an empty key after authenticating', async (t) => {
  const { lockRoot } = build()
  t.alike(await lockRoot.read('v1', 'Unlock'), { cancelled: false, rootKey: '' })
})

test('the key is stored for supported setups with a string key', (t) => {
  const { lockRoot, secretStore } = build()
  t.is(lockRoot.store('v1', 'root-key'), true)
  t.is(secretStore.secrets.get('lockRoot:v1'), 'root-key')
})

test('storing is refused for non-string keys, bad ids and unsupported setups', (t) => {
  const { lockRoot, secretStore } = build()
  t.is(lockRoot.store('v1', 123), false)
  t.is(lockRoot.store('///', 'key'), false)
  t.is(build({ platform: 'linux' }).lockRoot.store('v1', 'key'), false)
  t.is(secretStore.secrets.size, 0)
})

test('the stored key can be removed even when biometric unlock is no longer supported', (t) => {
  const secretStore = fakeSecretStore()
  secretStore.secrets.set('lockRoot:v1', 'root-key')
  const { lockRoot } = build({ secretStore, platform: 'linux' })
  t.is(lockRoot.remove('v1'), true)
  t.absent(secretStore.secrets.has('lockRoot:v1'))
  t.is(lockRoot.remove('///'), false)
})

test('plain device unlock reports the system answer and fails closed', async (t) => {
  t.is(await build().lockRoot.authenticate('Unlock'), true)
  t.is(
    await build({ deviceAuth: fakeDeviceAuth({ allow: false }) }).lockRoot.authenticate('x'),
    false
  )
  t.is(await build({ deviceAuth: null }).lockRoot.authenticate('x'), false)
  t.is(
    await quiet(() =>
      build({ deviceAuth: fakeDeviceAuth({ fail: true }) }).lockRoot.authenticate('x')
    ),
    false
  )
})
