import { backendApi } from '@pear-notes/core/backend/api.js'

export const LOCK_SCREENSHOT_PROTECTION_KEY = 'lockScreenshotProtection'
export const LOCK_SWITCHER_HIDE_KEY = 'lockSwitcherHide'

export function setContentProtection (enabled) {
  const bridge = typeof window !== 'undefined' ? window.electronBridge : null
  if (!bridge || typeof bridge.setContentProtection !== 'function') return
  try {
    bridge.setContentProtection(enabled === true)
  } catch (e) {
    console.error('setContentProtection failed', e)
  }
}

export async function getLockPrivacyPreference (key) {
  try {
    const value = await backendApi.getPreference({ key })
    return value !== 'false'
  } catch {
    return true
  }
}

export async function setLockPrivacyPreference (key, enabled) {
  try {
    await backendApi.updatePreference({ key, value: enabled ? 'true' : 'false' })
  } catch (e) {
    console.error('setLockPrivacyPreference failed', e)
  }
}
