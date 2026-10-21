import { getNoteData, updateNote } from '@pear-notes/core/store/slices/notesSlice.js'
import { store } from '@pear-notes/core/store/store.js'
import { getNoteSummary } from '@pear-notes/core/utils.js'

import { unlockLockedNotes } from './noteLockSession'
import { deletePdfThumb } from './pdfThumbCache'

export function isStoredNoteLocked(key) {
  if (!key) return false
  return getNoteData(key)(store.getState())?.locked === true
}

async function deleteNoteThumbnails(key) {
  const note = getNoteData(key)(store.getState())
  if (!note) return
  for (const pdf of getNoteSummary(note).pdfs || []) await deletePdfThumb(pdf.url).catch(() => {})
}

export async function toggleNoteLock({ key, currentlyLocked, reason, lockReason, dispatch }) {
  if (!key) return
  const ok = await unlockLockedNotes(
    currentlyLocked ? reason : lockReason,
    currentlyLocked ? 'unlock' : 'lock'
  )
  if (!ok) return
  dispatch(updateNote({ key, locked: !currentlyLocked }))
  if (!currentlyLocked) await deleteNoteThumbnails(key)
}
