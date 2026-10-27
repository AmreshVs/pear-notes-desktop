import test from 'brittle'

import { authenticate, isDeviceAuthSupported } from '../src/lib/deviceAuth.js'

const withBridge = (bridge, run) => async (t) => {
  globalThis.window = { electronBridge: bridge }
  try {
    await run(t)
  } finally {
    delete globalThis.window
  }
}

test(
  'unlock succeeds only when the system confirms it',
  withBridge({ authenticate: async () => true }, async (t) => {
    t.is(await authenticate('Unlock'), true)
  })
)

test(
  'unlock is refused when the system errors or is missing',
  withBridge(
    {
      authenticate: async () => {
        throw new Error('cancelled')
      }
    },
    async (t) => {
      t.is(await authenticate('Unlock'), false)
      t.is(await isDeviceAuthSupported(), false)
    }
  )
)
