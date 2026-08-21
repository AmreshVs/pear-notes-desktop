let cachedFlags = null

function readFlags() {
  if (cachedFlags) return cachedFlags
  const bridge = typeof window !== 'undefined' ? window.electronBridge : null
  if (!bridge || typeof bridge.getAppFlags !== 'function') {
    cachedFlags = { isMas: false }
    return cachedFlags
  }
  try {
    cachedFlags = bridge.getAppFlags() || { isMas: false }
  } catch {
    cachedFlags = { isMas: false }
  }
  return cachedFlags
}

export function isMasBuild() {
  return readFlags().isMas === true
}
