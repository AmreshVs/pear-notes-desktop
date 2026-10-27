import test from 'brittle'

import {
  requestNoteLockPassword,
  requestNoteLockPasswordCreate,
  resolveNoteLockPassword
} from '../src/lib/noteLockPasswordFlow.js'

test('the lock password prompt resolves with the user answer', async (t) => {
  const entered = requestNoteLockPassword('unlock', 'Unlock this note')
  resolveNoteLockPassword(true)
  t.is(await entered, true)

  const cancelled = requestNoteLockPasswordCreate('set')
  resolveNoteLockPassword(false)
  t.is(await cancelled, false)
})

test('opening a second prompt cancels the first', async (t) => {
  const first = requestNoteLockPassword()
  const second = requestNoteLockPassword()
  t.is(await first, false)
  resolveNoteLockPassword(true)
  t.is(await second, true)
})
