import test from 'brittle'

import { applyCloseToTray, applyStartAtLogin, readStartAtLogin } from '../src/lib/appBehavior.js'

const withBridge = (bridge, run) => async (t) => {
  globalThis.window = bridge === undefined ? undefined : { electronBridge: bridge }
  try {
    await run(t)
  } finally {
    delete globalThis.window
  }
}

test(
  'start at login reports what the system says',
  withBridge({ setStartAtLogin: async () => ({ enabled: true }) }, async (t) => {
    t.alike(await applyStartAtLogin(true), { enabled: true, blockedBy: null })
  })
)

test(
  'start at login can be blocked by the system',
  withBridge(
    { setStartAtLogin: async () => ({ enabled: false, blockedBy: 'policy' }) },
    async (t) => {
      t.alike(await applyStartAtLogin(true), { enabled: false, blockedBy: 'policy' })
    }
  )
)

test(
  'start at login fails safe when the system errors',
  withBridge(
    {
      setStartAtLogin: async () => {
        throw new Error('denied')
      },
      getStartAtLogin: async () => {
        throw new Error('denied')
      }
    },
    async (t) => {
      const log = console.error
      console.error = () => {}
      t.alike(await applyStartAtLogin(true), { enabled: false, blockedBy: null })
      console.error = log
      t.alike(await readStartAtLogin(true), { enabled: true, blockedBy: null })
    }
  )
)

test(
  'without the desktop bridge the requested value is kept',
  withBridge({}, async (t) => {
    t.alike(await applyStartAtLogin(true), { enabled: true, blockedBy: null })
    t.alike(await readStartAtLogin(false), { enabled: false, blockedBy: null })
  })
)

test(
  'close to tray is passed to the desktop app as a boolean',
  withBridge(
    {
      setCloseToTray: (value) => {
        globalThis.sentToTray = value
      }
    },
    async (t) => {
      applyCloseToTray('yes')
      t.is(globalThis.sentToTray, false, 'only true enables it')
      applyCloseToTray(true)
      t.is(globalThis.sentToTray, true)
      delete globalThis.sentToTray
    }
  )
)
