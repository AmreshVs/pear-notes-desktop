import { updateNote } from '@pear-notes/core/store/slices/notesSlice.js'
import { authenticate, isDeviceAuthSupported } from './deviceAuth'
import { relockNote } from './noteLock'

const UNLOCK_REASON = 'Unlock this note'
const AUTH_UNAVAILABLE_MESSAGE = 'Set up device authentication (Touch ID or a login password) to lock notes.'

export async function toggleNoteLock ({ key, currentlyLocked, dispatch }) {
  if (!key) return
  if (currentlyLocked) {
    const ok = await authenticate(UNLOCK_REASON)
    if (!ok) return
    dispatch(updateNote({ key, locked: false }))
    relockNote(key)
    return
  }
  const supported = await isDeviceAuthSupported()
  if (!supported) {
    window.alert(AUTH_UNAVAILABLE_MESSAGE)
    return
  }
  dispatch(updateNote({ key, locked: true }))
  relockNote(key)
}
