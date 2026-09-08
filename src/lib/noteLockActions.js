import { updateNote } from '@pear-notes/core/store/slices/notesSlice.js'

import { authenticate, isDeviceAuthSupported } from './deviceAuth'

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
}
