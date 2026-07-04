import { updateNote } from '@pear-notes/core/store/slices/notesSlice.js'
import { authenticate, isDeviceAuthSupported } from './deviceAuth'
import { relockNote } from './noteLock'

const UNLOCK_REASON = 'Unlock this note'

export async function toggleNoteLock ({ key, currentlyLocked, dispatch, lockMethod = 'biometric', requestPassword, onUnavailable }) {
  if (!key) return
  const usePassword = lockMethod === 'password'
  if (currentlyLocked) {
    const ok = usePassword
      ? await requestPassword?.()
      : await authenticate(UNLOCK_REASON)
    if (!ok) return
    dispatch(updateNote({ key, locked: false }))
    relockNote(key)
    return
  }
  if (!usePassword) {
    const supported = await isDeviceAuthSupported()
    if (!supported) {
      onUnavailable?.()
      return
    }
  }
  dispatch(updateNote({ key, locked: true }))
  relockNote(key)
}
