import test from 'brittle'

import {
  canUseLockRootSecret,
  deleteLockRootKey,
  readLockRootKey,
  storeLockRootKey
} from '../src/lib/deviceAuth.js'

const withBridge = (bridge, run) => async (t) => {
  globalThis.window = { electronBridge: bridge }
  try {
    await run(t)
  } finally {
    delete globalThis.window
  }
}

test(
  'biometric unlock is offered only when the desktop app supports it',
  withBridge({ isLockRootSupported: async () => true }, async (t) => {
    t.is(await canUseLockRootSecret(), true)
    globalThis.window.electronBridge = { isLockRootSupported: async () => 'yes' }
    t.is(await canUseLockRootSecret(), false, 'only a real true counts')
    globalThis.window.electronBridge = {}
    t.is(await canUseLockRootSecret(), false)
  })
)

test(
  'reading the saved unlock key returns what the system gives back',
  withBridge(
    {
      readLockRoot: async (vaultId, reason) => ({
        cancelled: false,
        rootKey: `${vaultId}:${reason}`
      })
    },
    async (t) => {
      t.alike(await readLockRootKey('v1', 'Unlock'), { cancelled: false, rootKey: 'v1:Unlock' })
    }
  )
)

test(
  'a cancelled or failing read never produces a key',
  withBridge(
    {
      readLockRoot: async () => {
        throw new Error('cancelled')
      }
    },
    async (t) => {
      t.alike(await readLockRootKey('v1', 'Unlock'), { cancelled: true, rootKey: '' })
      globalThis.window.electronBridge = {}
      t.alike(await readLockRootKey('v1', 'Unlock'), { cancelled: true, rootKey: '' })
    }
  )
)

test(
  'storing the unlock key reports success only on a true answer',
  withBridge({ storeLockRoot: async () => true }, async (t) => {
    t.is(await storeLockRootKey('v1', 'key'), true)
    globalThis.window.electronBridge = { storeLockRoot: async () => 1 }
    t.is(await storeLockRootKey('v1', 'key'), false)
    globalThis.window.electronBridge = {
      storeLockRoot: async () => {
        throw new Error('no keychain')
      }
    }
    t.is(await storeLockRootKey('v1', 'key'), false)
  })
)

test(
  'removing the unlock key never throws',
  withBridge(
    {
      deleteLockRoot: async () => {
        throw new Error('no keychain')
      }
    },
    async (t) => {
      t.is(await deleteLockRootKey('v1'), undefined)
      globalThis.window.electronBridge = {}
      t.is(await deleteLockRootKey('v1'), undefined)
    }
  )
)
