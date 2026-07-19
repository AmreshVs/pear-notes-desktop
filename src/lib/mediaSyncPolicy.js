import { backendApi } from '@pear-notes/core/backend/api.js'
import { MEDIA_SYNC_PAUSED_KEY, METERED_CONNECTION_KEY } from '@pear-notes/core/constant.js'

export { MEDIA_SYNC_PAUSED_KEY, METERED_CONNECTION_KEY }

export async function getMediaSyncFlag (key) {
  try {
    const value = await backendApi.getPreference({ key })
    return value === 'true'
  } catch {
    return false
  }
}

export async function setMediaSyncFlag (key, enabled) {
  try {
    await backendApi.updatePreference({ key, value: enabled ? 'true' : 'false' })
  } catch (e) {
    console.error('setMediaSyncFlag failed', e)
  }
}
