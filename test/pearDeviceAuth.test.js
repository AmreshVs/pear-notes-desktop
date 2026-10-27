import test from 'brittle'

import { loadFresh, moduleMocks } from './helpers/cjsMocks.js'

const load = (bindingsMock) => {
  moduleMocks.bindings = bindingsMock
  const module = loadFresh('../native/pear-device-auth/index.js')
  delete moduleMocks.bindings
  return module
}

test('without the native addon, auth is unsupported and unlock is refused', async (t) => {
  const auth = load(() => {
    throw new Error('addon not built')
  })
  t.is(auth.isSupported(), false)
  await t.exception(() => auth.authenticate('Unlock'), /addon not built/)
  t.is(await auth.startupTaskState('task'), 'unavailable')
  t.is(await auth.startupTaskEnable('task'), 'unavailable')
  t.is(auth.loadError().message, 'addon not built')
})

test('with the addon, support and unlock come from the system', async (t) => {
  const calls = []
  const auth = load(() => ({
    isSupported: () => true,
    authenticate: async (reason, handle) => {
      calls.push([reason, handle])
      return true
    }
  }))
  t.is(auth.isSupported(), true)
  t.is(await auth.authenticate('Unlock notes', 'handle'), true)
  t.is(await auth.authenticate('', undefined), true)
  t.alike(calls, [
    ['Unlock notes', 'handle'],
    ['Authenticate', null]
  ])
})

test('a failing support check counts as unsupported', (t) => {
  const auth = load(() => ({
    isSupported: () => {
      throw new Error('boom')
    }
  }))
  t.is(auth.isSupported(), false)
})

test('startup task failures and missing methods read as unavailable', async (t) => {
  const auth = load(() => ({
    isSupported: () => true,
    startupTaskState: async (id) => `state:${id}`,
    startupTaskEnable: async () => {
      throw new Error('denied')
    }
  }))
  t.is(await auth.startupTaskState(7), 'state:7')
  t.is(await auth.startupTaskEnable('x'), 'unavailable')
  t.is(await auth.startupTaskDisable('x'), 'unavailable')
})
