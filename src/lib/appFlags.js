const DEFAULT_FLAGS = { isMas: false, buildNumber: '' }

let cachedFlags = null

function readFlags() {
  if (cachedFlags) return cachedFlags
  const bridge = typeof window !== 'undefined' ? window.electronBridge : null
  if (!bridge || typeof bridge.getAppFlags !== 'function') {
    cachedFlags = DEFAULT_FLAGS
    return cachedFlags
  }
  try {
    cachedFlags = bridge.getAppFlags() || DEFAULT_FLAGS
  } catch {
    cachedFlags = DEFAULT_FLAGS
  }
  return cachedFlags
}

export function isMasBuild() {
  return readFlags().isMas === true
}

export function getBuildNumber() {
  const buildNumber = readFlags().buildNumber
  return buildNumber ? String(buildNumber) : ''
}

export function getAppVersionLabel(version) {
  const buildNumber = getBuildNumber()
  return buildNumber ? `v${version} (${Number(buildNumber) % 100})` : `v${version}`
}
