const DEFAULT_REASON = 'Unlock this note'

export async function authenticate (reason = DEFAULT_REASON) {
  const bridge = typeof window !== 'undefined' ? window.electronBridge : null
  if (!bridge || typeof bridge.authenticate !== 'function') return false
  try {
    return await bridge.authenticate(reason)
  } catch {
    return false
  }
}

export async function isDeviceAuthSupported () {
  const bridge = typeof window !== 'undefined' ? window.electronBridge : null
  if (!bridge || typeof bridge.isDeviceAuthSupported !== 'function') return false
  try {
    return await bridge.isDeviceAuthSupported()
  } catch {
    return false
  }
}
