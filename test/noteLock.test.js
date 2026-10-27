import test from 'brittle'

import { backendApi } from '@pear-notes/core/backend/api.js'
import { store } from '@pear-notes/core/store/store.js'
import { setNotesDataBatch, getNotesData } from '@pear-notes/core/store/slices/notesSlice.js'

import {
  clearUnlockedNotes,
  isNoteSessionUnlocked,
  isNoteUnlocked,
  markNoteUnlocked
} from '../src/lib/noteLock.js'

let closedSessions = 0
backendApi.closeLockSession = async () => {
  closedSessions++
}

test('locked notes open for the whole session after one unlock', (t) => {
  t.is(isNoteSessionUnlocked(), false)
  t.is(isNoteUnlocked('note-1'), false)

  markNoteUnlocked('note-1')
  t.is(isNoteSessionUnlocked(), true)
  t.is(isNoteUnlocked('note-2'), true)
  t.is(isNoteUnlocked(''), false, 'no note, nothing to unlock')

  clearUnlockedNotes()
  t.is(isNoteSessionUnlocked(), false)
  t.is(closedSessions, 1, 'the backend session is closed too')
})

test('locking again hides the text of every locked note', (t) => {
  store.dispatch(
    setNotesDataBatch([
      { key: 'a', data: { sealed: true, note: 'secret text', summary: { title: 'x' } } },
      { key: 'b', data: { note: 'plain note' } }
    ])
  )
  markNoteUnlocked('a')
  clearUnlockedNotes()

  const notes = getNotesData(store.getState())
  t.is(notes.a.note, '')
  t.is(notes.a.bodyOmitted, true)
  t.is(notes.a.summary, null)
  t.is(notes.b.note, 'plain note', 'notes that are not locked stay as they are')
})
