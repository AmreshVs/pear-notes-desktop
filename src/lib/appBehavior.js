import { backendApi } from '@pear-notes/core/backend/api.js'

export const CLOSE_TO_TRAY_KEY = 'closeToTray'
export const START_AT_LOGIN_KEY = 'startAtLogin'

export async function getAppBehaviorPreference(key, defaultValue = true) {
  try {
    const value = await backendApi.getPreference({ key })
    if (value === undefined || value === null) return defaultValue
    return value !== 'false'
  } catch {
    return defaultValue
  }
}

export async function setAppBehaviorPreference(key, enabled) {
  try {
    await backendApi.updatePreference({ key, value: enabled ? 'true' : 'false' })
  } catch (e) {
    console.error('setAppBehaviorPreference failed', e)
  }
}

export function applyCloseToTray(enabled) {
  const bridge = typeof window !== 'undefined' ? window.electronBridge : null
  if (!bridge || typeof bridge.setCloseToTray !== 'function') return
  try {
    bridge.setCloseToTray(enabled === true)
  } catch (e) {
    console.error('applyCloseToTray failed', e)
  }
}

export async function applyStartAtLogin(enabled) {
  const bridge = typeof window !== 'undefined' ? window.electronBridge : null
  if (!bridge || typeof bridge.setStartAtLogin !== 'function') return enabled === true
  try {
    return (await bridge.setStartAtLogin(enabled === true)) === true
  } catch (e) {
    console.error('applyStartAtLogin failed', e)
    return false
  }
}

export async function readStartAtLogin(defaultValue = false) {
  const bridge = typeof window !== 'undefined' ? window.electronBridge : null
  if (!bridge || typeof bridge.getStartAtLogin !== 'function') return defaultValue
  try {
    return (await bridge.getStartAtLogin()) === true
  } catch {
    return defaultValue
  }
}
