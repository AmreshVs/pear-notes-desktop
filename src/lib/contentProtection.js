export function setContentProtection(enabled) {
  const bridge = typeof window !== 'undefined' ? window.electronBridge : null
  if (!bridge || typeof bridge.setContentProtection !== 'function') return
  try {
    bridge.setContentProtection(enabled === true)
  } catch (e) {
    console.error('setContentProtection failed', e)
  }
}
