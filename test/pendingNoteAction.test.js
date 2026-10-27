import test from 'brittle'

import {
  requestNoteAction,
  clearPendingNoteAction,
  getPendingNoteAction,
  subscribePendingNoteAction
} from '../src/lib/pendingNoteAction.js'

test('a requested note action is held until cleared and listeners hear about it', (t) => {
  let calls = 0
  const unsubscribe = subscribePendingNoteAction(() => calls++)

  requestNoteAction('note-1', 'rename')
  t.alike(getPendingNoteAction(), { key: 'note-1', action: 'rename' })

  clearPendingNoteAction()
  t.is(getPendingNoteAction(), null)
  t.is(calls, 2)

  clearPendingNoteAction()
  t.is(calls, 2, 'clearing nothing is silent')

  unsubscribe()
  requestNoteAction('note-2', 'move')
  t.is(calls, 2, 'unsubscribed listeners stay quiet')
  clearPendingNoteAction()
})
