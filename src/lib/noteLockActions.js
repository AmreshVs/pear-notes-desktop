import { getNoteData, updateNote } from '@pear-notes/core/store/slices/notesSlice.js'
import { store } from '@pear-notes/core/store/store.js'
import { getNoteSummary } from '@pear-notes/core/utils.js'

import { authenticate, isDeviceAuthSupported } from './deviceAuth'
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

export async function toggleNoteLock({
  key,
  currentlyLocked,
  reason,
  lockReason,
  dispatch,
  lockMethod = 'biometric',
  requestPassword,
  onUnavailable
}) {
  if (!key) return
  const usePassword = lockMethod === 'password'
  if (!usePassword) {
    const supported = await isDeviceAuthSupported()
    if (!supported) {
      onUnavailable?.()
      return
    }
  }
  const authReason = currentlyLocked ? reason : lockReason
  const ok = usePassword
    ? await requestPassword?.(currentlyLocked ? 'unlock' : 'lock')
    : await authenticate(authReason)
  if (!ok) return
  dispatch(updateNote({ key, locked: !currentlyLocked }))
  if (!currentlyLocked) await deleteNoteThumbnails(key)
}
