const DEFAULT_REASON = 'Unlock this note'

export async function authenticate(reason = DEFAULT_REASON) {
  const bridge = typeof window !== 'undefined' ? window.electronBridge : null
  if (!bridge || typeof bridge.authenticate !== 'function') return false
  try {
    return await bridge.authenticate(reason)
  } catch {
    return false
  }
}

export async function isDeviceAuthSupported() {
  const bridge = typeof window !== 'undefined' ? window.electronBridge : null
  if (!bridge || typeof bridge.isDeviceAuthSupported !== 'function') return false
  try {
    return await bridge.isDeviceAuthSupported()
  } catch {
    return false
  }
}

const BIOMETRIC_METHOD_KEYS = {
  mac: 'settings.privacy.methods.touchId',
  win: 'settings.privacy.methods.windowsHello'
}

export function getBiometricMethodKey() {
  const platform = (typeof navigator !== 'undefined' ? navigator.platform : '').toLowerCase()
  if (platform.includes('mac')) return BIOMETRIC_METHOD_KEYS.mac
  if (platform.includes('win')) return BIOMETRIC_METHOD_KEYS.win
  return null
}

function lockRootBridge(method) {
  const bridge = typeof window !== 'undefined' ? window.electronBridge : null
  return bridge && typeof bridge[method] === 'function' ? bridge[method] : null
}

export async function canUseLockRootSecret() {
  const call = lockRootBridge('isLockRootSupported')
  if (!call) return false
  try {
    return (await call()) === true
  } catch {
    return false
  }
}

export async function readLockRootKey(vaultId, reason) {
  const call = lockRootBridge('readLockRoot')
  if (!call) return { cancelled: true, rootKey: '' }
  try {
    return await call(vaultId, reason)
  } catch {
    return { cancelled: true, rootKey: '' }
  }
}

export async function storeLockRootKey(vaultId, rootKey) {
  const call = lockRootBridge('storeLockRoot')
  if (!call) return false
  try {
    return (await call(vaultId, rootKey)) === true
  } catch {
    return false
  }
}

export async function deleteLockRootKey(vaultId) {
  const call = lockRootBridge('deleteLockRoot')
  if (!call) return
  await Promise.resolve(call(vaultId)).catch(() => {})
}
