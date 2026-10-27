import test from 'brittle'

import { showContextMenu } from '../src/lib/contextMenu.js'
import { setContentProtection } from '../src/lib/contentProtection.js'

const withWindow = (value, run) => async (t) => {
  globalThis.window = value
  try {
    await run(t)
  } finally {
    delete globalThis.window
  }
}

test(
  'context menu returns the chosen item',
  withWindow({ electronBridge: { showContextMenu: async (items) => items[1].id } }, async (t) => {
    t.is(await showContextMenu([{ id: 'a' }, { id: 'b' }]), 'b')
  })
)

test(
  'context menu returns nothing when the bridge is missing or fails',
  withWindow(
    { electronBridge: { showContextMenu: async () => Promise.reject(new Error('x')) } },
    async (t) => {
      t.is(await showContextMenu([]), null)
      globalThis.window = {}
      t.is(await showContextMenu([]), null)
    }
  )
)

test(
  'screenshot protection is only switched on for true',
  withWindow(
    {
      electronBridge: {
        setContentProtection: (value) => {
          globalThis.protectionValue = value
        }
      }
    },
    async (t) => {
      setContentProtection(1)
      t.is(globalThis.protectionValue, false)
      setContentProtection(true)
      t.is(globalThis.protectionValue, true)
      delete globalThis.protectionValue
    }
  )
)
